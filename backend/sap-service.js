const athenaService = require('./athena-service');
const config = require('./config');

const getDashboardData = async (params) => {
  try {
    const results = await athenaService.getSapDashboardData(params, config.SAP_ATHENA_DB, config.SAP_ATHENA_WORKGROUP);

    // Process results to create KPIs and chart data
    const kpis = {
      totalDumps: 0,
      failedBackups: 0,
      cancelledJobs: 0,
    };

    const clientIssuesMap = new Map();
    const dumpTypesMap = new Map();

    results.forEach(row => {
      // Safely parse JSON fields
      try {
        const abapShortDumps = JSON.parse(row.abap_short_dumps || '[]');
        const abapBatchJobs = JSON.parse(row.abap_batch_jobs || '[]');
        const situazioneBackup = JSON.parse(row.situazione_backup || '[]');

        if (abapShortDumps.length > 0) {
          kpis.totalDumps++;
          abapShortDumps.forEach(dump => {
            const type = dump.short_dump_type || 'Unknown';
            dumpTypesMap.set(type, (dumpTypesMap.get(type) || 0) + 1);
          });
        }

        if (abapBatchJobs.some(job => job.status === 'CANCELLED')) {
          kpis.cancelledJobs++;
        }

        if (situazioneBackup.some(backup => backup.status === 'failed')) {
          kpis.failedBackups++;
        }

        // Aggregate issues by client
        const client = row.nomecliente;
        let issueCount = clientIssuesMap.get(client) || 0;
        if (abapShortDumps.length > 0 || abapBatchJobs.some(job => job.status === 'CANCELLED') || situazioneBackup.some(backup => backup.status === 'failed')) {
          clientIssuesMap.set(client, issueCount + 1);
        }

      } catch (e) {
        console.error('Error parsing JSON data from Athena', e);
      }
    });

    const clientIssues = {
      labels: [...clientIssuesMap.keys()],
      datasets: [{
        label: 'Issues by Client',
        data: [...clientIssuesMap.values()],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      }],
    };

    const dumpTypes = {
      labels: [...dumpTypesMap.keys()],
      datasets: [{
        data: [...dumpTypesMap.values()],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      }],
    };

    return { kpis, clientIssues, dumpTypes };

  } catch (error) {
    console.error('Error in getDashboardData:', error);
    throw error;
  }
};

const getDistinctDumpTypes = async () => {
  const query = `
    SELECT DISTINCT dump.short_dump_type
    FROM sap_reports_db.reportparquet
    CROSS JOIN UNNEST(abap_short_dumps) AS t (dump)
    WHERE dump.short_dump_type IS NOT NULL AND dump.short_dump_type != ''
    ORDER BY short_dump_type;
  `;
  try {
    const results = await athenaService.runQuery(query, config.SAP_ATHENA_DB, config.SAP_ATHENA_WORKGROUP);
    return results.map(row => row.short_dump_type);
  } catch (error) {
    console.error('Error fetching distinct dump types:', error);
    throw error;
  }
};

module.exports = {
  getDashboardData,
  getDistinctDumpTypes,
};
