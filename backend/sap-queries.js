// ====================================================================
// SAP QUERIES - Query per Dashboard SAP
// ====================================================================

const sanitize = (value) => {
  if (typeof value === 'string') return value.replace(/'/g, "''");
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
};

// Costruisce la clausola WHERE base per i filtri comuni
const buildBaseWhere = (filters) => {
  const conditions = [];
  
  if (filters.startDate && filters.endDate) {
    conditions.push(`datacontrollo BETWEEN '${sanitize(filters.startDate)}' AND '${sanitize(filters.endDate)}'`);
  }
  
  if (filters.clients && filters.clients.length > 0) {
    const clientList = filters.clients.map(c => `'${sanitize(c)}'`).join(',');
    conditions.push(`nomecliente IN (${clientList})`);
  }
  
  if (filters.sids && filters.sids.length > 0) {
    const sidList = filters.sids.map(s => `'${sanitize(s)}'`).join(',');
    conditions.push(`sid IN (${sidList})`);
  }
  
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
};

// Query 1: Total Dumps con trend
const getTotalDumpsQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    SELECT 
      nomecliente,
      datacontrollo,
      COUNT(*) as total_dumps
    FROM "sap_reports_db"."reportparquet"
    CROSS JOIN UNNEST(abap_short_dumps) AS t(dump)
    ${whereClause}
    GROUP BY nomecliente, datacontrollo
  `;
};

// Query 2: Failed Backups
const getFailedBackupsQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    SELECT 
      nomecliente,
      COUNT(*) as failed_backups,
      datacontrollo
    FROM "sap_reports_db"."reportparquet"
    CROSS JOIN UNNEST(situazione_backup) AS t(backup)
    ${whereClause ? whereClause + ' AND' : 'WHERE'} (backup.status LIKE '%failed%' OR backup.status LIKE '%FAILED%')
    GROUP BY nomecliente, datacontrollo
  `;
};

// Query 3: Cancelled Jobs
const getCancelledJobsQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    SELECT 
      nomecliente,
      COUNT(*) as cancelled_jobs,
      datacontrollo
    FROM "sap_reports_db"."reportparquet"
    CROSS JOIN UNNEST(abap_batch_jobs) AS t(job)
    ${whereClause ? whereClause + ' AND' : 'WHERE'} job.status = 'CANCELLED'
    GROUP BY nomecliente, datacontrollo
  `;
};

// Query 4: Servizi in KO per cliente
const getServicesKOQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    SELECT 
      nomecliente,
      datacontrollo,
      stato_servizi.dump as dump_status,
      stato_servizi.job_in_errore as job_error_status,
      stato_servizi.processi_attivi as active_processes_status,
      stato_servizi.spazio_database as db_space_status,
      stato_servizi.spazio_log as log_space_status
    FROM "sap_reports_db"."reportparquet"
    ${whereClause}
  `;
};

// Query 5: Dump Types Distribution
const getDumpTypesQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    SELECT 
      dump.short_dump_type as dump_type,
      COUNT(*) as count,
      nomecliente
    FROM "sap_reports_db"."reportparquet"
    CROSS JOIN UNNEST(abap_short_dumps) AS t(dump)
    ${whereClause}
    GROUP BY dump.short_dump_type, nomecliente
    ORDER BY count DESC
  `;
};

// Query 6: Issues by Client & Type (aggregato)
const getIssuesByClientQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    WITH dumps AS (
      SELECT nomecliente, COUNT(*) as dump_count
      FROM "sap_reports_db"."reportparquet"
      CROSS JOIN UNNEST(abap_short_dumps) AS t(dump)
      ${whereClause}
      GROUP BY nomecliente
    ),
    failed_backups AS (
      SELECT nomecliente, COUNT(*) as backup_count
      FROM "sap_reports_db"."reportparquet"
      CROSS JOIN UNNEST(situazione_backup) AS t(backup)
      ${whereClause ? whereClause + ' AND' : 'WHERE'} (backup.status LIKE '%failed%' OR backup.status LIKE '%FAILED%')
      GROUP BY nomecliente
    ),
    cancelled_jobs AS (
      SELECT nomecliente, COUNT(*) as job_count
      FROM "sap_reports_db"."reportparquet"
      CROSS JOIN UNNEST(abap_batch_jobs) AS t(job)
      ${whereClause ? whereClause + ' AND' : 'WHERE'} job.status = 'CANCELLED'
      GROUP BY nomecliente
    )
    SELECT 
      COALESCE(d.nomecliente, fb.nomecliente, cj.nomecliente) as nomecliente,
      COALESCE(d.dump_count, 0) as dumps,
      COALESCE(fb.backup_count, 0) as failed_backups,
      COALESCE(cj.job_count, 0) as cancelled_jobs
    FROM dumps d
    FULL OUTER JOIN failed_backups fb ON d.nomecliente = fb.nomecliente
    FULL OUTER JOIN cancelled_jobs cj ON COALESCE(d.nomecliente, fb.nomecliente) = cj.nomecliente
  `;
};

// Query 7: Lista clienti disponibili
const getAvailableClientsQuery = () => {
  return `
    SELECT DISTINCT nomecliente
    FROM "sap_reports_db"."reportparquet"
    ORDER BY nomecliente
  `;
};

// Query 8: Lista SID disponibili per i clienti selezionati
const getAvailableSIDsQuery = (clients) => {
  let query = `
    SELECT DISTINCT sid, nomecliente
    FROM "sap_reports_db"."reportparquet"
  `;
  
  if (clients && clients.length > 0) {
    const clientList = clients.map(c => `'${sanitize(c)}'`).join(',');
    query += ` WHERE nomecliente IN (${clientList})`;
  }
  
  query += ` ORDER BY sid`;
  return query;
};

// Query 9: Andamento servizi nel tempo (per grafico lineare)
const getServicesTimelineQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    SELECT 
      datacontrollo,
      nomecliente,
      SUM(CASE WHEN stato_servizi.dump = 'ko' THEN 1 ELSE 0 END) as dump_ko,
      SUM(CASE WHEN stato_servizi.job_in_errore = 'ko' THEN 1 ELSE 0 END) as job_ko,
      SUM(CASE WHEN stato_servizi.processi_attivi = 'ko' THEN 1 ELSE 0 END) as processi_ko,
      SUM(CASE WHEN stato_servizi.spazio_database = 'ko' THEN 1 ELSE 0 END) as db_ko,
      SUM(CASE WHEN stato_servizi.spazio_log = 'ko' THEN 1 ELSE 0 END) as log_ko,
      SUM(CASE WHEN stato_servizi.scadenza_certificati = 'ko' THEN 1 ELSE 0 END) as cert_ko,
      SUM(CASE WHEN stato_servizi.update_in_errore = 'ko' THEN 1 ELSE 0 END) as update_ko,
      SUM(CASE WHEN stato_servizi.spool = 'ko' THEN 1 ELSE 0 END) as spool_ko
    FROM "sap_reports_db"."reportparquet"
    ${whereClause}
    GROUP BY datacontrollo, nomecliente
    ORDER BY datacontrollo ASC
  `;
};

// Query 10: Andamento problemi aggregati nel tempo (dumps, backups, jobs)
const getProblemsTimelineQuery = (filters) => {
  const whereClause = buildBaseWhere(filters);
  
  return `
    WITH daily_dumps AS (
      SELECT 
        datacontrollo,
        COUNT(*) as dump_count
      FROM "sap_reports_db"."reportparquet"
      CROSS JOIN UNNEST(abap_short_dumps) AS t(dump)
      ${whereClause}
      GROUP BY datacontrollo
    ),
    daily_backups AS (
      SELECT 
        datacontrollo,
        COUNT(*) as backup_count
      FROM "sap_reports_db"."reportparquet"
      CROSS JOIN UNNEST(situazione_backup) AS t(backup)
      ${whereClause ? whereClause + ' AND' : 'WHERE'} (backup.status LIKE '%failed%' OR backup.status LIKE '%FAILED%')
      GROUP BY datacontrollo
    ),
    daily_jobs AS (
      SELECT 
        datacontrollo,
        COUNT(*) as job_count
      FROM "sap_reports_db"."reportparquet"
      CROSS JOIN UNNEST(abap_batch_jobs) AS t(job)
      ${whereClause ? whereClause + ' AND' : 'WHERE'} job.status = 'CANCELLED'
      GROUP BY datacontrollo
    )
    SELECT 
      COALESCE(dd.datacontrollo, db.datacontrollo, dj.datacontrollo) as datacontrollo,
      COALESCE(dd.dump_count, 0) as dumps,
      COALESCE(db.backup_count, 0) as failed_backups,
      COALESCE(dj.job_count, 0) as cancelled_jobs
    FROM daily_dumps dd
    FULL OUTER JOIN daily_backups db ON dd.datacontrollo = db.datacontrollo
    FULL OUTER JOIN daily_jobs dj ON COALESCE(dd.datacontrollo, db.datacontrollo) = dj.datacontrollo
    ORDER BY datacontrollo ASC
  `;
};

// Query per calcolare i trend (periodo precedente)
const getPreviousPeriodData = (filters, type) => {
  // Calcola il periodo precedente basandosi sul range di date
  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);
  const diff = end - start;
  
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);
  
  const prevFilters = {
    ...filters,
    startDate: prevStart.toISOString().split('T')[0],
    endDate: prevEnd.toISOString().split('T')[0]
  };
  
  const whereClause = buildBaseWhere(prevFilters);
  
  switch(type) {
    case 'dumps':
      return `
        SELECT 
          nomecliente,
          datacontrollo,
          COUNT(*) as total_dumps
        FROM "sap_reports_db"."reportparquet"
        CROSS JOIN UNNEST(abap_short_dumps) AS t(dump)
        ${whereClause}
        GROUP BY nomecliente, datacontrollo
      `;
    case 'backups':
      return `
        SELECT 
          nomecliente,
          datacontrollo,
          COUNT(*) as failed_backups
        FROM "sap_reports_db"."reportparquet"
        CROSS JOIN UNNEST(situazione_backup) AS t(backup)
        ${whereClause ? whereClause + ' AND' : 'WHERE'} (backup.status LIKE '%failed%' OR backup.status LIKE '%FAILED%')
        GROUP BY nomecliente, datacontrollo
      `;
    case 'jobs':
      return `
        SELECT 
          nomecliente,
          datacontrollo,
          COUNT(*) as cancelled_jobs
        FROM "sap_reports_db"."reportparquet"
        CROSS JOIN UNNEST(abap_batch_jobs) AS t(job)
        ${whereClause ? whereClause + ' AND' : 'WHERE'} job.status = 'CANCELLED'
        GROUP BY nomecliente, datacontrollo
      `;
    default:
      return null;
  }
};

module.exports = {
  getTotalDumpsQuery,
  getFailedBackupsQuery,
  getCancelledJobsQuery,
  getServicesKOQuery,
  getDumpTypesQuery,
  getIssuesByClientQuery,
  getAvailableClientsQuery,
  getAvailableSIDsQuery,
  getPreviousPeriodData
};