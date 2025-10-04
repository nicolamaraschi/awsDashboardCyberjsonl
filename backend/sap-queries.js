// Configurazione dei campi disponibili per il filtro
const SAP_FILTER_FIELDS = {
  'nomecliente': { sql: 'nomecliente', type: 'string' },
  'sid': { sql: 'sid', type: 'string' },
  'datacontrollo': { sql: 'datacontrollo', type: 'date' },
};

// Costruisce la clausola WHERE basata sui filtri
const buildWhereClause = (filters) => {
  const conditions = [];
  
  if (filters.clients && filters.clients.length > 0) {
    const clientList = filters.clients.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
    conditions.push(`nomecliente IN (${clientList})`);
  }
  
  if (filters.sids && filters.sids.length > 0) {
    const sidList = filters.sids.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
    conditions.push(`sid IN (${sidList})`);
  }
  
  if (filters.dateFrom) {
    conditions.push(`datacontrollo >= '${filters.dateFrom}'`);
  }
  
  if (filters.dateTo) {
    conditions.push(`datacontrollo <= '${filters.dateTo}'`);
  }
  
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
};

// Query per ottenere i KPI principali
const getKPIQuery = (filters) => {
  const whereClause = buildWhereClause(filters);
  
  return `
    SELECT 
      COUNT(DISTINCT nomecliente) as total_clients,
      COUNT(DISTINCT sid) as total_sids,
      SUM(cardinality(abap_short_dumps)) as total_dumps,
      SUM(cardinality(filter(situazione_backup, b -> b.status LIKE '%fail%'))) as failed_backups,
      SUM(cardinality(filter(abap_batch_jobs, j -> j.status = 'CANCELLED'))) as cancelled_jobs,
      SUM(CASE WHEN stato_servizi.dump = 'ko' THEN 1 ELSE 0 END) as days_with_dump_issues,
      SUM(CASE WHEN stato_servizi.job_in_errore = 'ko' THEN 1 ELSE 0 END) as days_with_job_issues
    FROM sap_reports_db.reportparquet
    ${whereClause}
  `;
};

// Query per dump types distribution
const getDumpTypesQuery = (filters) => {
  const whereClause = buildWhereClause(filters);
  
  return `
    SELECT 
      dump.short_dump_type,
      COUNT(*) as count
    FROM sap_reports_db.reportparquet
    CROSS JOIN UNNEST(abap_short_dumps) AS t(dump)
    ${whereClause}
    GROUP BY dump.short_dump_type
    ORDER BY count DESC
    LIMIT 10
  `;
};

// Query per dumps by client
const getDumpsByClientQuery = (filters) => {
  const whereClause = buildWhereClause(filters);
  
  return `
    SELECT 
      nomecliente,
      COUNT(*) as dump_count,
      COUNT(DISTINCT dump.short_dump_type) as unique_types
    FROM sap_reports_db.reportparquet
    CROSS JOIN UNNEST(abap_short_dumps) AS t(dump)
    ${whereClause}
    GROUP BY nomecliente
    ORDER BY dump_count DESC
  `;
};

// Query per issues by client and type
const getIssuesByClientQuery = (filters) => {
  const whereClause = buildWhereClause(filters);
  
  return `
    SELECT 
      nomecliente,
      sid,
      SUM(CASE WHEN stato_servizi.dump = 'ko' THEN 1 ELSE 0 END) as dump_issues,
      SUM(CASE WHEN stato_servizi.job_in_errore = 'ko' THEN 1 ELSE 0 END) as job_issues,
      SUM(cardinality(filter(situazione_backup, b -> b.status LIKE '%fail%'))) as backup_failures,
      SUM(cardinality(filter(abap_batch_jobs, j -> j.status = 'CANCELLED'))) as cancelled_jobs
    FROM sap_reports_db.reportparquet
    ${whereClause}
    GROUP BY nomecliente, sid
    ORDER BY nomecliente, sid
  `;
};

// Query per ottenere lista di clienti disponibili
const getClientsListQuery = () => {
  return `
    SELECT DISTINCT nomecliente 
    FROM sap_reports_db.reportparquet 
    ORDER BY nomecliente
  `;
};

// Query per ottenere lista di SIDs disponibili per i clienti selezionati
const getSIDsListQuery = (clients) => {
  if (!clients || clients.length === 0) {
    return `SELECT DISTINCT sid FROM sap_reports_db.reportparquet ORDER BY sid`;
  }
  
  const clientList = clients.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
  return `
    SELECT DISTINCT sid 
    FROM sap_reports_db.reportparquet 
    WHERE nomecliente IN (${clientList})
    ORDER BY sid
  `;
};

module.exports = {
  getKPIQuery,
  getDumpTypesQuery,
  getDumpsByClientQuery,
  getIssuesByClientQuery,
  getClientsListQuery,
  getSIDsListQuery,
};