// ====================================================================
// FILE DI CONFIGURAZIONE DEL BACKEND
// Modifica i valori in questo file prima del deploy.
// ====================================================================

module.exports = {
  AWS_REGION: 'eu-west-1',
  ATHENA_DB: 'cloudconnexa_logs_db',
  ATHENA_RESULTS_BUCKET: 'horsaruncloudconnexalog', // Bucket S3 per i risultati di Athena
  ATHENA_WORKGROUP: 'hrun-cloudconnexa-wg',
};