// Lista bianca delle colonne consentite per il filtraggio per prevenire SQL injection
const ALLOWED_COLUMNS = [
  'timestamp',
  'initiator',
  'log.destinationentityip',
  'log.destinationport',
  'log.destinationparentname',
  'log.allowed',
  'log.sourceip',
  'log.protocolname'
];

// Funzione base di sanitizzazione per escapare gli apici singoli
const sanitize = (value) => {
  if (typeof value === 'string') {
    // Sostituisce un apice singolo con due apici singoli per l'SQL
    return value.replace(/'/g, "''");
  }
  if (typeof value === 'number') {
    return value;
  }
  // Per sicurezza, se non è una stringa o un numero, non lo includiamo nella query
  return null;
};

const buildDynamicQuery = (criteria) => {
  // Query di base
  const baseSelect = `
    SELECT
      timestamp,
      initiator,
      "log"."destinationentityip" AS DestinationIP,
      "log"."destinationport" AS DestinationPort,
      "log"."destinationparentname" AS Customer,
      "log"."allowed" AS Allowed
    FROM "cloudconnexa_logs_db"."extracted_logs"
  `;

  const whereClauses = [];

  // Elabora i filtri aggiuntivi
  if (criteria.filters && Array.isArray(criteria.filters)) {
    criteria.filters.forEach(filter => {
      // SICUREZZA: Controlla se la colonna è nella whitelist
      if (filter.field && ALLOWED_COLUMNS.includes(filter.field) && filter.value !== undefined && filter.value !== '') {
        const sanitizedValue = sanitize(filter.value);
        
        if (sanitizedValue !== null) {
          // Per semplicità, per ora supportiamo solo l'operatore '='.
          // Potremo estenderlo in futuro con LIKE, >, <, etc.
          const operator = '='; 
          const fieldName = filter.field.includes('.') ? `"${filter.field.split('.')[0]}"."${filter.field.split('.')[1]}"` : `"${filter.field}"`;
          
          // Gestisce i valori numerici senza apici
          const valueWrapper = typeof sanitizedValue === 'number' ? sanitizedValue : `'${sanitizedValue}'`;

          whereClauses.push(`${fieldName} ${operator} ${valueWrapper}`);
        }
      }
    });
  }

  let finalQuery = baseSelect;
  if (whereClauses.length > 0) {
    finalQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  finalQuery += ' ORDER BY timestamp DESC LIMIT 500;'; // Aggiungo un limite per sicurezza e performance

  console.log('Query Dinamica Costruita:', finalQuery);
  return finalQuery;
};

module.exports = { buildDynamicQuery };

