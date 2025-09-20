// Questo file contiene le query SQL predefinite da eseguire su Athena.

const queries = {
  // 1 - Report Dettagliato Traffico Bloccato
  DETAILED_BLOCKED_TRAFFIC: `...`,

  // ... (le altre query esistenti)

  // 11 - Analisi Oraria Connessioni Bloccate
  HOURLY_BLOCKED_ANALYSIS: `...`,

  // === NUOVE QUERY PER LA DASHBOARD ===

  // 12 - KPI Dashboard
  DASHBOARD_KPIS: `
    WITH last_24h AS (
        SELECT *
        FROM "cloudconnexa_logs_db"."extracted_logs"
        WHERE from_iso8601_timestamp(timestamp) > now() - interval '24' hour
    )
    SELECT 
        COUNT(*) AS total_connections,
        APPROX_DISTINCT(initiator) AS unique_users,
        CAST(COUNT_IF(log.allowed = false) AS DOUBLE) * 100 / COUNT(*) AS blocked_percentage
    FROM last_24h;
  `,

  // 13 - Ultime Connessioni Bloccate
  LATEST_BLOCKED: `
    SELECT 
        timestamp, 
        initiator,
        "log"."destinationentityname" AS servizio_destinazione
    FROM 
        "cloudconnexa_logs_db"."extracted_logs"
    WHERE 
        "log"."allowed" = false
    ORDER BY 
        timestamp DESC
    LIMIT 5;
  `
};

// Esporto il contenuto completo, sostituendo i placeholder
const fullQueries = JSON.parse(JSON.stringify(queries)
  .replace('"DETAILED_BLOCKED_TRAFFIC": `...`', `"DETAILED_BLOCKED_TRAFFIC": \
    SELECT\
      timestamp,\n      initiator,\n      publicip AS ip_pubblico_sorgente,\n      "log"."sourceip" AS ip_vpn_sorgente,\n      "log"."destinationentityname" AS servizio_destinazione,\n      "log"."destinationentityip" AS ip_destinazione,\n      "log"."destinationport" AS porta,\n      "log"."protocolname" AS protocollo\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE "log"."allowed" = false\
    ORDER BY timestamp DESC;\
  `)
  .replace('"HOURLY_BLOCKED_ANALYSIS": `...`', `"HOURLY_BLOCKED_ANALYSIS": \
    SELECT\
      substr("timestamp", 12, 2) AS ora_del_giorno,\n      count(*) AS totale_connessioni_bloccate\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE "log"."allowed" = false\
    GROUP BY substr("timestamp", 12, 2)\
    ORDER BY ora_del_giorno ASC;\
  `)
  .replace('"... (le altre query esistenti)"', `"TOP_USERS_BLOCKED": \
    SELECT\
      initiator,\n      count(*) AS numero_connessioni_bloccate\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE "log"."allowed" = false\
    GROUP BY initiator\
    ORDER BY numero_connessioni_bloccate DESC\
    LIMIT 20;\
  `,\
  "TOP_SERVICES_BLOCKED": \
    SELECT\
      "log"."destinationentityname" AS servizio_destinazione,\n      "log"."destinationentityip" AS ip_destinazione,\n      count(*) AS tentativi_bloccati\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE "log"."allowed" = false\
    GROUP BY "log"."destinationentityname", "log"."destinationentityip"\
    ORDER BY tentativi_bloccati DESC\
    LIMIT 20;\
  `,\
  "UNUSUAL_PORTS_BLOCKED": \
    SELECT\
      timestamp,\n      initiator,\n      "log"."sourceip" AS ip_sorgente,\n      "log"."destinationentityip" AS ip_destinazione,\n      "log"."destinationport" AS porta\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE\
      "log"."allowed" = false AND\
      "log"."destinationport" NOT IN (80, 443, 3389, 22, 53)\
    ORDER BY "log"."destinationport" ASC;\
  `,\
  "ALLOWED_VS_BLOCKED_SUMMARY": \
    SELECT\
      CASE\
        WHEN "log"."allowed" = true THEN 'Consentite'\
        ELSE 'Bloccate'\
      END AS stato_connessione,\n      count(*) AS totale\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    GROUP BY "log"."allowed";\
  `,\
  "TOP_ACTIVE_USERS": \
    SELECT\
      initiator,\n      count(*) as numero_totale_connessioni\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    GROUP BY initiator\
    ORDER BY numero_totale_connessioni DESC\
    LIMIT 20;\
  `,\
  "TOP_USED_SERVICES": \
    SELECT\
      "log"."destinationentityname" AS servizio_destinazione,\n      count(*) AS connessioni_riuscite\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE "log"."allowed" = true\
    GROUP BY "log"."destinationentityname"\
    ORDER BY connessioni_riuscite DESC\
    LIMIT 20;\
  `,\
  "USER_ACTIVITY_TRACE": \
    SELECT\
      timestamp,\n      "log"."allowed" AS consentita,\n      "log"."sourceip" AS ip_sorgente,\n      "log"."destinationentityname" AS servizio_destinazione,\n      "log"."destinationentityip" AS ip_destinazione,\n      "log"."destinationport" AS porta\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE initiator = '%USER_PLACEHOLDER%' -- NOME UTENTE DA MODIFICARE\
    ORDER BY timestamp DESC;\
  `,\
  "DESTINATION_IP_ACTIVITY": \
    SELECT\
      timestamp,\n      initiator,\n      "log"."sourceip" AS ip_sorgente,\n      "log"."allowed" AS consentita\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    WHERE "log"."destinationentityip" = '%IP_PLACEHOLDER%' -- IP SERVER DA MODIFICARE\
    ORDER BY timestamp DESC;\
  `,\
  "USER_GEOMAP": \
    SELECT\
      publicip,\n      count(*) as numero_connessioni\
    FROM "cloudconnexa_logs_db"."extracted_logs"\
    GROUP BY publicip\
    ORDER BY numero_connessioni DESC;\
  `));

module.exports = fullQueries;
