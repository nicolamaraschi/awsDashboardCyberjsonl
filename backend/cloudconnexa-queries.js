// ====================================================================
// CLOUDCONNEXA QUERIES - Query per Dashboard CloudConnexa
// NOTA: log è un STRUCT in extracted_logs_v2, quindi usiamo log.campo
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
      conditions.push(`timestamp BETWEEN '${sanitize(filters.startDate)}' AND '${sanitize(filters.endDate)}'`);
    }
    
    if (filters.users && filters.users.length > 0) {
      const userList = filters.users.map(u => `'${sanitize(u)}'`).join(',');
      conditions.push(`parententityname IN (${userList})`);
    }
    
    if (filters.gateways && filters.gateways.length > 0) {
      const gwList = filters.gateways.map(g => `'${sanitize(g)}'`).join(',');
      conditions.push(`log.gatewayRegionName IN (${gwList})`);
    }
    
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  };
  
  // Query 1: Statistiche Sessioni
  const getSessionStatsQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT parententityname) as unique_users,
        ROUND(AVG(CAST(log.sessionDurationSeconds AS DOUBLE)), 2) as avg_duration_seconds,
        ROUND(SUM(CAST(log.sessionBytesIn AS BIGINT)) / 1073741824.0, 2) as total_bytes_in_gb,
        ROUND(SUM(CAST(log.sessionBytesOut AS BIGINT)) / 1073741824.0, 2) as total_bytes_out_gb
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'session-ended'
    `;
  };
  
  // Query 2: Domini Bloccati (Minacce)
  const getBlockedDomainsQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        COUNT(*) as total_blocked,
        COUNT(DISTINCT log.domain) as unique_domains,
        COUNT(DISTINCT parententityname) as affected_users
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'domain-blocked'
    `;
  };
  
  // Query 3: Timeline Sessioni (per grafico)
  const getSessionsTimelineQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        DATE(CAST(timestamp AS TIMESTAMP)) as date,
        COUNT(*) as session_count,
        COUNT(DISTINCT parententityname) as unique_users,
        ROUND(SUM(CAST(log.sessionBytesIn AS BIGINT)) / 1073741824.0, 2) as bytes_in_gb,
        ROUND(SUM(CAST(log.sessionBytesOut AS BIGINT)) / 1073741824.0, 2) as bytes_out_gb
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'session-ended'
      GROUP BY DATE(CAST(timestamp AS TIMESTAMP))
      ORDER BY date ASC
    `;
  };
  
  // Query 4: Top Utenti per Traffico
  const getTopUsersByTrafficQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        parententityname as username,
        COUNT(*) as session_count,
        ROUND(SUM(CAST(log.sessionBytesIn AS BIGINT)) / 1073741824.0, 2) as total_in_gb,
        ROUND(SUM(CAST(log.sessionBytesOut AS BIGINT)) / 1073741824.0, 2) as total_out_gb,
        ROUND((SUM(CAST(log.sessionBytesIn AS BIGINT)) + 
               SUM(CAST(log.sessionBytesOut AS BIGINT))) / 1073741824.0, 2) as total_traffic_gb
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'session-ended'
        AND parententityname IS NOT NULL
      GROUP BY parententityname
      ORDER BY total_traffic_gb DESC
      LIMIT 10
    `;
  };
  
  // Query 5: Domini Bloccati per Categoria
  const getBlockedDomainsByCategoryQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        log.category as category,
        COUNT(*) as count,
        COUNT(DISTINCT log.domain) as unique_domains
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'domain-blocked'
        AND log.category IS NOT NULL
      GROUP BY log.category
      ORDER BY count DESC
    `;
  };
  
  // Query 6: Distribuzione Gateway
  const getGatewayDistributionQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        log.gatewayRegionName as gateway_region,
        COUNT(*) as session_count,
        COUNT(DISTINCT parententityname) as unique_users
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'session-ended'
        AND log.gatewayRegionName IS NOT NULL
      GROUP BY log.gatewayRegionName
      ORDER BY session_count DESC
    `;
  };
  
  // Query 7: Motivi di Disconnessione
  const getDisconnectReasonsQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        log.sessionDisconnectReasonDescription as reason,
        COUNT(*) as count
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'session-ended'
        AND log.sessionDisconnectReasonDescription IS NOT NULL
      GROUP BY log.sessionDisconnectReasonDescription
      ORDER BY count DESC
      LIMIT 10
    `;
  };
  
  // Query 8: Protocolli Utilizzati
  const getProtocolDistributionQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        log.sessionTunnelProtocol as protocol,
        COUNT(*) as count,
        ROUND(SUM(CAST(log.sessionBytesIn AS BIGINT) + 
                  CAST(log.sessionBytesOut AS BIGINT)) / 1073741824.0, 2) as total_traffic_gb
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'session-ended'
        AND log.sessionTunnelProtocol IS NOT NULL
      GROUP BY log.sessionTunnelProtocol
      ORDER BY count DESC
    `;
  };
  
  // Query 9: Timeline Eventi di Sicurezza
  const getSecurityEventsTimelineQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        DATE(CAST(timestamp AS TIMESTAMP)) as date,
        COUNT(*) as blocked_count,
        COUNT(DISTINCT log.domain) as unique_domains,
        COUNT(DISTINCT parententityname) as affected_users
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'domain-blocked'
      GROUP BY DATE(CAST(timestamp AS TIMESTAMP))
      ORDER BY date ASC
    `;
  };
  
  // Query 10: Lista Utenti Disponibili
  const getAvailableUsersQuery = () => {
    return `
      SELECT DISTINCT parententityname
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      WHERE parententityname IS NOT NULL
        AND eventname IN ('session-ended', 'domain-blocked')
      ORDER BY parententityname
      LIMIT 1000
    `;
  };
  
  // Query 11: Lista Gateway Disponibili
  const getAvailableGatewaysQuery = () => {
    return `
      SELECT DISTINCT log.gatewayRegionName as gateway
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      WHERE log.gatewayRegionName IS NOT NULL
      ORDER BY gateway
    `;
  };
  
  // Query 12: Periodo Precedente (per trend)
  const getPreviousPeriodStats = (filters, metricType) => {
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
    
    switch(metricType) {
      case 'sessions':
        return getSessionStatsQuery(prevFilters);
      case 'blocked':
        return getBlockedDomainsQuery(prevFilters);
      default:
        return null;
    }
  };
  
  // Query 13: Flussi Stabiliti per Destinazione (Top risorse accedute)
  const getTopDestinationsQuery = (filters) => {
    const whereClause = buildBaseWhere(filters);
    
    return `
      SELECT 
        log.destinationEntityIp as destination_ip,
        CAST(log.destinationPort AS VARCHAR) as destination_port,
        log.protocolName as protocol,
        COUNT(*) as connection_count,
        COUNT(DISTINCT parententityname) as unique_users
      FROM "cloudconnexa_logs_db"."extracted_logs_v2"
      ${whereClause}
        AND eventname = 'flow-established'
        AND log.destinationEntityIp IS NOT NULL
      GROUP BY 
        log.destinationEntityIp,
        log.destinationPort,
        log.protocolName
      ORDER BY connection_count DESC
      LIMIT 15
    `;
  };
  
  module.exports = {
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
    getTopDestinationsQuery
  };