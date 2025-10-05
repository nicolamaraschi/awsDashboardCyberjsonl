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

// Import SAP queries
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

// Import CloudConnexa queries (TUTTE, incluse le 3 nuove security queries)
const {
  getSessionStatsQuery,
  getBlockedDomainsQuery,
  getSessionsTimelineQuery,
  getTopUsersByTrafficQuery,
  getBlockedDomainsByCategoryQuery,
  getGatewayDistributionQuery,
  getDisconnectReasonsQuery,
  getProtocolDistributionQuery,
  getSecurityEventsTimelineQuery,
  getAvailableUsersQuery,
  getAvailableGatewaysQuery,
  getPreviousPeriodStats,
  getTopDestinationsQuery,
  getBlockedAccessAttemptsQuery,
  getNonStandardPortsQuery,
  getAsymmetricTrafficQuery
} = require('./cloudconnexa-queries');

const app = express();
app.use(cors());
app.use(express.json());

// Funzione helper per creare un gestore di endpoint di ricerca
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
    console.error(`Errore nell'endpoint per ${baseWhere}:`, error);
    res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
  }
};

// ========== ENDPOINT BASE ==========

// Endpoint di base per un controllo di salute
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========== ENDPOINT CLOUDCONNEXA RICERCHE ==========

// Endpoint per la ricerca "Flow Established"
app.post(
  '/api/flow-established',
  createSearchEndpoint(FLOW_ESTABLISHED_FIELDS, FLOW_ESTABLISHED_DEFAULTS, "eventname = 'flow-established'")
);

// Endpoint per la ricerca "Domain Blocked"
app.post(
  '/api/domain-blocked',
  createSearchEndpoint(DOMAIN_BLOCKED_FIELDS, DOMAIN_BLOCKED_DEFAULTS, "eventname = 'domain-blocked'")
);

// ========== ENDPOINT CLOUDCONNEXA DASHBOARD ==========

// Endpoint per ottenere gli utenti disponibili
app.get('/api/cloudconnexa/users', async (req, res) => {
  try {
    const query = getAvailableUsersQuery();
    const results = await runQuery(query);
    res.json(results);
  } catch (error) {
    console.error('Errore nel recupero degli utenti:', error);
    res.status(500).json({ error: 'Errore durante il recupero degli utenti.' });
  }
});

// Endpoint per ottenere i gateway disponibili
app.get('/api/cloudconnexa/gateways', async (req, res) => {
  try {
    const query = getAvailableGatewaysQuery();
    const results = await runQuery(query);
    res.json(results);
  } catch (error) {
    console.error('Errore nel recupero dei gateway:', error);
    res.status(500).json({ error: 'Errore durante il recupero dei gateway.' });
  }
});

// Endpoint principale per la dashboard CloudConnexa (CON SECURITY QUERIES)
app.post('/api/cloudconnexa/dashboard', async (req, res) => {
  try {
    const filters = req.body;
    
    console.log('Filtri CloudConnexa ricevuti:', filters);

    // Esegui tutte le query in parallelo (incluse le 3 nuove security queries)
    const [
      sessionStats,
      blockedDomains,
      sessionsTimeline,
      topUsers,
      blockedByCategory,
      gatewayDistribution,
      disconnectReasons,
      protocolDistribution,
      securityTimeline,
      topDestinations,
      prevSessionStats,
      prevBlockedDomains,
      blockedAccessAttempts,
      nonStandardPorts,
      asymmetricTraffic
    ] = await Promise.all([
      runQuery(getSessionStatsQuery(filters)),
      runQuery(getBlockedDomainsQuery(filters)),
      runQuery(getSessionsTimelineQuery(filters)),
      runQuery(getTopUsersByTrafficQuery(filters)),
      runQuery(getBlockedDomainsByCategoryQuery(filters)),
      runQuery(getGatewayDistributionQuery(filters)),
      runQuery(getDisconnectReasonsQuery(filters)),
      runQuery(getProtocolDistributionQuery(filters)),
      runQuery(getSecurityEventsTimelineQuery(filters)),
      runQuery(getTopDestinationsQuery(filters)),
      runQuery(getPreviousPeriodStats(filters, 'sessions')),
      runQuery(getPreviousPeriodStats(filters, 'blocked')),
      runQuery(getBlockedAccessAttemptsQuery(filters)),
      runQuery(getNonStandardPortsQuery(filters)),
      runQuery(getAsymmetricTrafficQuery(filters))
    ]);

    // Calcola i KPI dal primo risultato
    const currentStats = sessionStats[0] || {};
    const currentBlocked = blockedDomains[0] || {};
    const prevStats = prevSessionStats[0] || {};
    const prevBlocked = prevBlockedDomains[0] || {};

    // Calcola trend
    const calculateTrend = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    const totalSessions = parseInt(currentStats.total_sessions || 0);
    const uniqueUsers = parseInt(currentStats.unique_users || 0);
    const totalBlocked = parseInt(currentBlocked.total_blocked || 0);
    const totalTrafficGB = parseFloat(currentStats.total_bytes_in_gb || 0) + parseFloat(currentStats.total_bytes_out_gb || 0);
    const avgDuration = parseFloat(currentStats.avg_duration_seconds || 0);

    const prevTotalSessions = parseInt(prevStats.total_sessions || 0);
    const prevUniqueUsers = parseInt(prevStats.unique_users || 0);
    const prevTotalBlocked = parseInt(prevBlocked.total_blocked || 0);
    const prevTotalTrafficGB = parseFloat(prevStats.total_bytes_in_gb || 0) + parseFloat(prevStats.total_bytes_out_gb || 0);

    const sessionsTrend = calculateTrend(totalSessions, prevTotalSessions);
    const usersTrend = calculateTrend(uniqueUsers, prevUniqueUsers);
    const blockedTrend = calculateTrend(totalBlocked, prevTotalBlocked);
    const trafficTrend = calculateTrend(totalTrafficGB, prevTotalTrafficGB);

    // Calcola disconnessioni anomale (tutte tranne "User disconnected")
    const totalDisconnects = disconnectReasons.reduce((sum, row) => sum + parseInt(row.count || 0), 0);
    const normalDisconnects = disconnectReasons
      .filter(row => row.reason && row.reason.toLowerCase().includes('user'))
      .reduce((sum, row) => sum + parseInt(row.count || 0), 0);
    const anomalousDisconnects = totalDisconnects - normalDisconnects;
    const disconnectRate = totalSessions > 0 ? ((anomalousDisconnects / totalSessions) * 100).toFixed(1) : 0;

    res.json({
      kpis: {
        totalSessions: {
          value: totalSessions,
          trend: parseFloat(sessionsTrend),
          trendLabel: sessionsTrend > 0 ? `+${sessionsTrend}%` : `${sessionsTrend}%`
        },
        uniqueUsers: {
          value: uniqueUsers,
          trend: parseFloat(usersTrend),
          trendLabel: usersTrend > 0 ? `+${usersTrend}%` : `${usersTrend}%`
        },
        blockedDomains: {
          value: totalBlocked,
          uniqueDomains: parseInt(currentBlocked.unique_domains || 0),
          affectedUsers: parseInt(currentBlocked.affected_users || 0),
          trend: parseFloat(blockedTrend),
          trendLabel: blockedTrend > 0 ? `+${blockedTrend}%` : `${blockedTrend}%`
        },
        totalTraffic: {
          value: totalTrafficGB.toFixed(2),
          bytesIn: parseFloat(currentStats.total_bytes_in_gb || 0).toFixed(2),
          bytesOut: parseFloat(currentStats.total_bytes_out_gb || 0).toFixed(2),
          trend: parseFloat(trafficTrend),
          trendLabel: trafficTrend > 0 ? `+${trafficTrend}%` : `${trafficTrend}%`
        },
        avgSessionDuration: {
          value: Math.round(avgDuration / 60), // Converti in minuti
          seconds: Math.round(avgDuration)
        },
        disconnectRate: {
          value: parseFloat(disconnectRate),
          anomalousCount: anomalousDisconnects,
          totalCount: totalSessions
        }
      },
      charts: {
        sessionsTimeline: sessionsTimeline,
        topUsers: topUsers,
        blockedByCategory: blockedByCategory,
        gatewayDistribution: gatewayDistribution,
        disconnectReasons: disconnectReasons,
        protocolDistribution: protocolDistribution,
        securityTimeline: securityTimeline,
        topDestinations: topDestinations,
        blockedAccessAttempts: blockedAccessAttempts,
        nonStandardPorts: nonStandardPorts,
        asymmetricTraffic: asymmetricTraffic
      }
    });

  } catch (error) {
    console.error('Errore nella dashboard CloudConnexa:', error);
    res.status(500).json({ 
      error: 'Errore durante il recupero dei dati della dashboard.',
      details: error.message 
    });
  }
});

// ========== ENDPOINT SAP ==========

// Endpoint per ottenere i clienti disponibili
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

// Endpoint per ottenere i SID disponibili (opzionalmente filtrati per cliente)
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

// Endpoint principale per la dashboard SAP
app.post('/api/sap/dashboard', async (req, res) => {
  try {
    const filters = req.body;
    
    console.log('Filtri ricevuti:', filters);

    // Esegui tutte le query in parallelo per ottimizzare le performance
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

    // Calcola i totali
    const totalDumps = dumpsData.reduce((sum, row) => sum + parseInt(row.total_dumps || 0), 0);
    const totalFailedBackups = backupsData.reduce((sum, row) => sum + parseInt(row.failed_backups || 0), 0);
    const totalCancelledJobs = jobsData.reduce((sum, row) => sum + parseInt(row.cancelled_jobs || 0), 0);

    // Calcola i trend (confronto con periodo precedente)
    const prevTotalDumps = prevDumpsData.reduce((sum, row) => sum + parseInt(row.total_dumps || 0), 0);
    const prevTotalBackups = prevBackupsData.reduce((sum, row) => sum + parseInt(row.failed_backups || 0), 0);
    const prevTotalJobs = prevJobsData.reduce((sum, row) => sum + parseInt(row.cancelled_jobs || 0), 0);

    const dumpsTrend = prevTotalDumps > 0 ? ((totalDumps - prevTotalDumps) / prevTotalDumps * 100).toFixed(1) : 0;
    const backupsTrend = prevTotalBackups > 0 ? ((totalFailedBackups - prevTotalBackups) / prevTotalBackups * 100).toFixed(1) : 0;
    const jobsTrend = prevTotalJobs > 0 ? ((totalCancelledJobs - prevTotalJobs) / prevTotalJobs * 100).toFixed(1) : 0;

    // Conta servizi in KO
    let servicesKO = 0;
    servicesData.forEach(row => {
      if (row.dump_status === 'ko') servicesKO++;
      if (row.job_error_status === 'ko') servicesKO++;
      if (row.db_space_status === 'ko') servicesKO++;
      if (row.log_space_status === 'ko') servicesKO++;
    });

    res.json({
      kpis: {
        totalDumps: {
          value: totalDumps,
          trend: parseFloat(dumpsTrend),
          trendLabel: dumpsTrend > 0 ? `+${dumpsTrend}%` : `${dumpsTrend}%`
        },
        failedBackups: {
          value: totalFailedBackups,
          trend: parseFloat(backupsTrend),
          trendLabel: backupsTrend > 0 ? `+${backupsTrend}%` : `${backupsTrend}%`
        },
        cancelledJobs: {
          value: totalCancelledJobs,
          trend: parseFloat(jobsTrend),
          trendLabel: jobsTrend > 0 ? `+${jobsTrend}%` : `${jobsTrend}%`
        },
        servicesKO: {
          value: servicesKO,
          trend: 0,
          trendLabel: 'N/A'
        }
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
    res.status(500).json({ 
      error: 'Errore durante il recupero dei dati della dashboard.',
      details: error.message 
    });
  }
});

// Gestione errori 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

module.exports.handler = serverless(app);