
const AWS = require('aws-sdk');
const config = require('./config');

// Usa le variabili d'ambiente fornite da serverless.yml, con un fallback a config.js
const ATHENA_DB = process.env.ATHENA_DB || config.ATHENA_DB;
const ATHENA_OUTPUT_LOCATION = process.env.ATHENA_OUTPUT_LOCATION || `s3://${config.ATHENA_RESULTS_BUCKET}/results/`;

const athena = new AWS.Athena();

// Funzione di utility per attendere un certo tempo
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Esegue una query su Athena e attende il completamento.
 * @param {string} query La stringa SQL da eseguire.
 * @returns {Promise<Array>} Una promessa che si risolve con i risultati della query.
 */
async function runQuery(query) {
  const params = {
    QueryString: query,
    QueryExecutionContext: {
      Database: ATHENA_DB,
    },
    ResultConfiguration: {
      OutputLocation: `s3://${config.ATHENA_RESULTS_BUCKET}/athena-results/`,
    },
    WorkGroup: config.ATHENA_WORKGROUP, // Specifica il workgroup corretto
  };

  // 1. Avvia la query
  const { QueryExecutionId } = await athena.startQueryExecution(params).promise();

  // 2. Controlla lo stato fino al completamento
  while (true) {
    const { QueryExecution } = await athena.getQueryExecution({ QueryExecutionId }).promise();
    const state = QueryExecution.Status.State;

    if (state === 'SUCCEEDED') {
      break; // Esce dal loop se la query ha successo
    } else if (state === 'FAILED' || state === 'CANCELLED') {
      const reason = QueryExecution.Status.StateChangeReason;
      console.error('La query Athena è fallita. Motivo:', reason);
      throw new Error(`Query fallita o cancellata. Motivo: ${reason}`);
    }

    // Attende 2 secondi prima di controllare di nuovo
    await sleep(2000);
  }

  // 3. Ottiene i risultati
  const results = await athena.getQueryResults({ QueryExecutionId }).promise();
  return formatResults(results);
}

/**
 * Formatta i risultati grezzi di Athena in un formato JSON più pulito.
 * @param {Object} results I risultati da GetQueryResults.
 * @returns {Array<Object>} Un array di oggetti, dove ogni oggetto rappresenta una riga.
 */
function formatResults(results) {
    const rows = results.ResultSet.Rows;
    if (rows.length === 0) return [];

    // La prima riga contiene le intestazioni
    const headers = rows.shift().Data.map(col => col.VarCharValue);

    // Mappa le righe rimanenti in oggetti JSON
    return rows.map(row => {
        const rowObject = {};
        row.Data.forEach((col, index) => {
            rowObject[headers[index]] = col.VarCharValue;
        });
        return rowObject;
    });
}

module.exports = { runQuery };
