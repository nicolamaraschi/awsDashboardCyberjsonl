
const athenaService = require('./athena-service');
const config = require('./config');

const DB_NAME = 'sap_reports_db'; // As per the user prompt

// Helper to build the WHERE clause for clients
const buildClientFilter = (clients) => {
  if (!clients || clients.length === 0) {
    return '';
  }
  const clientList = clients.map(c => `'${c}'`).join(', ');
  return `AND nomecliente IN (${clientList})`;
};

// 1. Query for KPIs
const getKpiQuery = (startDate, endDate, clients) => {
  const clientFilter = buildClientFilter(clients);
  return `
    SELECT
      COUNT(DISTINCT CASE WHEN cardinality(abap_short_dumps) > 0 THEN nomecliente || datacontrollo END) AS totalDumps,
      COUNT(DISTINCT CASE WHEN cardinality(filter(situazione_backup, b -> b.status LIKE '%failed%')) > 0 THEN nomecliente || datacontrollo END) AS failedBackups,
      COUNT(DISTINCT CASE WHEN cardinality(filter(abap_batch_jobs, j -> j.status = 'CANCELLED')) > 0 THEN nomecliente || datacontrollo END) AS cancelledJobs
    FROM reportparquet
    WHERE datacontrollo BETWEEN '${startDate}' AND '${endDate}'
    ${clientFilter}
  `;
};

// 2. Query for Issues by Client
const getClientIssuesQuery = (startDate, endDate, clients) => {
  const clientFilter = buildClientFilter(clients);
  return `
    SELECT
      nomecliente,
      COUNT(*) AS issue_count
    FROM reportparquet
    WHERE (cardinality(abap_short_dumps) > 0 OR cardinality(filter(situazione_backup, b -> b.status LIKE '%failed%')) > 0 OR cardinality(filter(abap_batch_jobs, j -> j.status = 'CANCELLED')) > 0)
    AND datacontrollo BETWEEN '${startDate}' AND '${endDate}'
    ${clientFilter}
    GROUP BY nomecliente
    ORDER BY issue_count DESC
  `;
};

// 3. Query for Dump Types
const getDumpTypesQuery = (startDate, endDate, clients) => {
  const clientFilter = buildClientFilter(clients);
  return `
    SELECT
      dump.short_dump_type,
      COUNT(*) AS dump_count
    FROM reportparquet
    CROSS JOIN UNNEST(abap_short_dumps) AS t (dump)
    WHERE datacontrollo BETWEEN '${startDate}' AND '${endDate}'
    ${clientFilter}
    GROUP BY dump.short_dump_type
    ORDER BY dump_count DESC
    LIMIT 10
  `;
};


const getDashboardData = async (startDate, endDate, clients) => {
  const kpiQuery = getKpiQuery(startDate, endDate, clients);
  const clientIssuesQuery = getClientIssuesQuery(startDate, endDate, clients);
  const dumpTypesQuery = getDumpTypesQuery(startDate, endDate, clients);

  // Run queries in parallel
  const [kpiResult, clientIssuesResult, dumpTypesResult] = await Promise.all([
    athenaService.runQuery(kpiQuery, DB_NAME),
    athenaService.runQuery(clientIssuesQuery, DB_NAME),
    athenaService.runQuery(dumpTypesQuery, DB_NAME),
  ]);

  // Format the results
  const kpis = kpiResult.length > 0 ? {
    totalDumps: kpiResult[0].totalDumps,
    failedBackups: kpiResult[0].failedBackups,
    cancelledJobs: kpiResult[0].cancelledJobs,
  } : { totalDumps: 0, failedBackups: 0, cancelledJobs: 0 };

  const clientIssues = {
    labels: clientIssuesResult.map(r => r.nomecliente),
    datasets: [{
      label: 'Numero di Problemi',
      data: clientIssuesResult.map(r => r.issue_count),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
    }]
  };

  const dumpTypes = {
    labels: dumpTypesResult.map(r => r.short_dump_type),
    datasets: [{
      data: dumpTypesResult.map(r => r.dump_count),
      backgroundColor: [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
      ],
    }]
  };

  return {
    kpis,
    clientIssues,
    dumpTypes,
  };
};

// Also, a function to get all clients to populate the filter dropdown
const getAllClients = async () => {
    const query = 'SELECT DISTINCT nomecliente FROM reportparquet ORDER BY nomecliente';
    const results = await athenaService.runQuery(query, DB_NAME);
    return results.map(r => r.nomecliente);
}


module.exports = {
  getDashboardData,
  getAllClients,
};
