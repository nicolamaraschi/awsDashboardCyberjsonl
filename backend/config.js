// ====================================================================
// FILE DI CONFIGURAZIONE DEL BACKEND
// Modifica i valori in questo file prima del deploy.
// ====================================================================

module.exports = {
  /**
   * (OBBLIGATORIO) Percorso S3 completo dove Athena salverà i risultati delle query.
   * IMPORTANTE: Il bucket deve esistere e trovarsi nella stessa regione del deploy (es. eu-west-1).
   * Esempio: 's3://my-athena-query-results-bucket/results/'
   */
  ATHENA_RESULTS_BUCKET: 's3://horsaruncloudconnexalog/athena-results/',

  /**
   * (FACOLTATIVO) Nome del database in AWS Glue. 
   * Non dovrebbe essere necessario modificarlo se corrisponde a quello già configurato.
   */
  ATHENA_DB: 'cloudconnexa_logs_db',

  /**
   * (FACOLTATIVO) Regione AWS per il deploy.
   * Assicurati che corrisponda alla regione dove si trovano i tuoi dati e il bucket S3.
   */
  AWS_REGION: 'eu-west-1',
};