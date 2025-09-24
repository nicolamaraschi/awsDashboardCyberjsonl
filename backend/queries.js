// Questo file ora definisce le configurazioni per query multiple e un costruttore generico.

// --- Configurazione per Query 1: "Flow Established" ---
const FLOW_ESTABLISHED_FIELDS = {
  'timestamp': { sql: 'timestamp', type: 'string', label: 'Timestamp' },
  'UserName': { sql: "json_extract_scalar(log,'$.sourceparentid')", type: 'string', label: 'User Name' },
  'UserNameGroup': { sql: "json_extract_scalar(log,'$.sourceparentname')", type: 'string', label: 'User Name Group' },
  'DestinationIP': { sql: "json_extract_scalar(log,'$.destinationentityip')", type: 'string', label: 'Destination IP' },
  'DestinationPort': { sql: "json_extract_scalar(log,'$.destinationport')", type: 'number', label: 'Destination Port' },
  'Customer': { sql: "json_extract_scalar(log,'$.destinationparentname')", type: 'string', label: 'Customer' },
};
const FLOW_ESTABLISHED_DEFAULTS = ['timestamp', 'UserName', 'DestinationIP', 'DestinationPort', 'Customer'];

// --- Configurazione per Query 2: "Domain Blocked" ---
const DOMAIN_BLOCKED_FIELDS = {
  'timestamp': { sql: 'timestamp', type: 'string', label: 'Timestamp' },
  'parententityname': { sql: 'parententityname', type: 'string', label: 'User Name' },
  'dominio_bloccato': { sql: "json_extract_scalar(log, '$.domain')", type: 'string', label: 'Dominio Bloccato' },
  'categoria_dominio': { sql: "json_extract_scalar(log, '$.category')", type: 'string', label: 'Categoria Dominio' },
};
const DOMAIN_BLOCKED_DEFAULTS = ['timestamp', 'parententityname', 'dominio_bloccato', 'categoria_dominio'];

// --- Costruttore di Query Generico ---

const sanitize = (value) => {
  if (typeof value === 'string') return value.replace(/'/g, "''");
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
};

const buildDynamicQuery = (criteria, fieldMap, defaultSelectKeys, baseWhere) => {
  const allowedFilterKeys = Object.keys(fieldMap);

  // 1. Costruisce la clausola SELECT
  const selectedKeys = criteria.selectFields && criteria.selectFields.length > 0 ? criteria.selectFields : defaultSelectKeys;
  const selectFields = selectedKeys
    .map(key => fieldMap[key] ? `${fieldMap[key].sql} AS "${key}"` : null)
    .filter(Boolean);
  if (selectFields.length === 0) {
    selectFields.push(...defaultSelectKeys.map(key => `${fieldMap[key].sql} AS "${key}"`));
  }
  const selectClause = `SELECT ${selectFields.join(', ')}`;
  const fromClause = `FROM "cloudconnexa_logs_db"."extracted_logs"`;

  // 2. Costruisce la clausola WHERE
  const whereClauses = [baseWhere]; // Inizia con il filtro di base
  if (criteria.filters && Array.isArray(criteria.filters)) {
    criteria.filters.forEach(filter => {
      if (filter.field && allowedFilterKeys.includes(filter.field) && filter.value !== undefined && filter.value !== '') {
        const fieldInfo = fieldMap[filter.field];
        const sanitizedValue = sanitize(filter.value);
        
        if (sanitizedValue !== null && fieldInfo) {
          // Whitelist degli operatori consentiti
          const allowedOperators = ['=', 'LIKE'];
          const operator = filter.operator && allowedOperators.includes(filter.operator.toUpperCase()) ? filter.operator.toUpperCase() : '=';
          
          const valueWrapper = (fieldInfo.type === 'number' || fieldInfo.type === 'boolean') ? sanitizedValue : `'${sanitizedValue}'`;
          whereClauses.push(`${fieldInfo.sql} ${operator} ${valueWrapper}`);
        }
      }
    });
  }

  // 3. Assembla la query finale
  let finalQuery = `${selectClause} ${fromClause}`;
  if (whereClauses.length > 0) {
    finalQuery += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  finalQuery += ' ORDER BY timestamp DESC ;';

  console.log('Query Dinamica Costruita:', finalQuery);
  return finalQuery;
};

module.exports = {
  buildDynamicQuery,
  FLOW_ESTABLISHED_FIELDS,
  FLOW_ESTABLISHED_DEFAULTS,
  DOMAIN_BLOCKED_FIELDS,
  DOMAIN_BLOCKED_DEFAULTS,
};
