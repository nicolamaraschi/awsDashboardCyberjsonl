const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { runQuery, runSAPQuery } = require('./athena-service');
const {
  buildDynamicQuery,
  FLOW_ESTABLISHED_FIELDS,
  FLOW_ESTABLISHED_DEFAULTS,
  DOMAIN_BLOCKED_FIELDS,
  DOMAIN_BLOCKED_DEFAULTS,
} = require('./queries');

const {
  getTotalDumpsQuery,
  getFailedBackupsQuery,
  getCancelledJobsQuery,
  getServicesKOQuery,
  getDumpTypesQuery,
  getIssuesByClientQuery,
  getAvailableClientsQuery,
  getAvailableSIDsQuery,
  getPreviousPeriodData,
  getServicesTimelineQuery,
  getProblemsTimelineQuery
} = require('./sap-queries');

const app = express();
app.use(cors());
app.use(express.json());

const createSearchEndpoint = (fieldMap, defaultSelectKeys, baseWhere) => async (req, res) => {
  const criteria = req.body;
  if (!criteria) {
    return res.status(400).json({ error: 'Corpo della richiesta mancante.' });
  }
  try {
    const query = buildDynamicQuery(criteria, fieldMap, defaultSelectKeys, baseWhere);
    const results = await runQuery(query);
    res.json(results);
  } catch (error) {
    console.error(`Errore nell\'endpoint per ${baseWhere}:`, error);
    res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/flow-established', createSearchEndpoint(FLOW_ESTABLISHED_FIELDS, FLOW_ESTABLISHED_DEFAULTS, "eventname = 'flow-established'"));
app.post('/api/domain-blocked', createSearchEndpoint(DOMAIN_BLOCKED_FIELDS, DOMAIN_BLOCKED_DEFAULTS, "eventname = 'domain-blocked'"));

app.get('/api/sap/clients', async (req, res) => {
  try {
    const query = getAvailableClientsQuery();
    const results = await runSAPQuery(query);
    res.json(results);
  } catch (error) {
    console.error('Errore nel recupero dei clienti:', error);
    res.status(500).json({ error: 'Errore durante il recupero dei clienti.' });
  }
});

app.post('/api/sap/sids', async (req, res) => {
  try {
    const { clients } = req.body;
    const query = getAvailableSIDsQuery(clients);
    const results = await runSAPQuery(query);
    res.json(results);
  } catch (error) {
    console.error('Errore nel recupero dei SID:', error);
    res.status(500).json({ error: 'Errore durante il recupero dei SID.' });
  }
});

app.post('/api/sap/dashboard', async (req, res) => {
  try {
    const filters = req.body;
    console.log('Filtri ricevuti:', filters);

    const [
      dumpsData,
      backupsData,
      jobsData,
      servicesData,
      dumpTypesData,
      issuesByClientData,
      prevDumpsData,
      prevBackupsData,
      prevJobsData,
      servicesTimelineData,
      problemsTimelineData
    ] = await Promise.all([
      runSAPQuery(getTotalDumpsQuery(filters)),
      runSAPQuery(getFailedBackupsQuery(filters)),
      runSAPQuery(getCancelledJobsQuery(filters)),
      runSAPQuery(getServicesKOQuery(filters)),
      runSAPQuery(getDumpTypesQuery(filters)),
      runSAPQuery(getIssuesByClientQuery(filters)),
      runSAPQuery(getPreviousPeriodData(filters, 'dumps')),
      runSAPQuery(getPreviousPeriodData(filters, 'backups')),
      runSAPQuery(getPreviousPeriodData(filters, 'jobs')),
      runSAPQuery(getServicesTimelineQuery(filters)),
      runSAPQuery(getProblemsTimelineQuery(filters))
    ]);

    console.log('Services Timeline rows:', servicesTimelineData.length);
    console.log('Problems Timeline rows:', problemsTimelineData.length);

    const totalDumps = dumpsData.reduce((sum, row) => sum + parseInt(row.total_dumps || 0), 0);
    const totalFailedBackups = backupsData.reduce((sum, row) => sum + parseInt(row.failed_backups || 0), 0);
    const totalCancelledJobs = jobsData.reduce((sum, row) => sum + parseInt(row.cancelled_jobs || 0), 0);

    const prevTotalDumps = prevDumpsData.reduce((sum, row) => sum + parseInt(row.total_dumps || 0), 0);
    const prevTotalBackups = prevBackupsData.reduce((sum, row) => sum + parseInt(row.failed_backups || 0), 0);
    const prevTotalJobs = prevJobsData.reduce((sum, row) => sum + parseInt(row.cancelled_jobs || 0), 0);

    const dumpsTrend = prevTotalDumps > 0 ? ((totalDumps - prevTotalDumps) / prevTotalDumps * 100).toFixed(1) : 0;
    const backupsTrend = prevTotalBackups > 0 ? ((totalFailedBackups - prevTotalBackups) / prevTotalBackups * 100).toFixed(1) : 0;
    const jobsTrend = prevTotalJobs > 0 ? ((totalCancelledJobs - prevTotalJobs) / prevTotalJobs * 100).toFixed(1) : 0;

    let servicesKO = 0;
    servicesData.forEach(row => {
      if (row.dump_status === 'ko') servicesKO++;
      if (row.job_error_status === 'ko') servicesKO++;
      if (row.db_space_status === 'ko') servicesKO++;
      if (row.log_space_status === 'ko') servicesKO++;
    });

    res.json({
      kpis: {
        totalDumps: { value: totalDumps, trend: parseFloat(dumpsTrend), trendLabel: dumpsTrend > 0 ? `+${dumpsTrend}%` : `${dumpsTrend}%` },
        failedBackups: { value: totalFailedBackups, trend: parseFloat(backupsTrend), trendLabel: backupsTrend > 0 ? `+${backupsTrend}%` : `${backupsTrend}%` },
        cancelledJobs: { value: totalCancelledJobs, trend: parseFloat(jobsTrend), trendLabel: jobsTrend > 0 ? `+${jobsTrend}%` : `${jobsTrend}%` },
        servicesKO: { value: servicesKO, trend: 0, trendLabel: 'N/A' }
      },
      charts: {
        issuesByClient: issuesByClientData,
        dumpTypes: dumpTypesData,
        servicesTimeline: servicesTimelineData,
        problemsTimeline: problemsTimelineData
      },
      rawData: {
        dumps: dumpsData,
        backups: backupsData,
        jobs: jobsData,
        services: servicesData
      }
    });

  } catch (error) {
    console.error('Errore nella dashboard SAP:', error);
    res.status(500).json({ error: 'Errore durante il recupero dei dati della dashboard.', details: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

module.exports.handler = serverless(app);