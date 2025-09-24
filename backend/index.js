const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { runQuery } = require('./athena-service');
const {
  buildDynamicQuery,
  FLOW_ESTABLISHED_FIELDS,
  FLOW_ESTABLISHED_DEFAULTS,
  DOMAIN_BLOCKED_FIELDS,
  DOMAIN_BLOCKED_DEFAULTS,
} = require('./queries');

const app = express();
app.use(cors());
app.use(express.json());

// Funzione helper per creare un gestore di endpoint di ricerca
const createSearchEndpoint = (fieldMap, defaultSelectKeys, baseWhere) => async (req, res) => {
  const criteria = req.body;

  if (!criteria) {
    return res.status(400).json({ error: 'Corpo della richiesta mancante.' });
  }

  try {
    const query = buildDynamicQuery(criteria, fieldMap, defaultSelectKeys, baseWhere);
    const results = await runQuery(query);
    res.json(results);
  } catch (error) {
    console.error(`Errore nell\'endpoint per ${baseWhere}:`, error);
    res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
  }
};

// Endpoint di base per un controllo di salute
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint per la ricerca "Flow Established"
app.post(
  '/api/flow-established',
  createSearchEndpoint(FLOW_ESTABLISHED_FIELDS, FLOW_ESTABLISHED_DEFAULTS, "eventname = 'flow-established'")
);

// Endpoint per la ricerca "Domain Blocked"
app.post(
  '/api/domain-blocked',
  createSearchEndpoint(DOMAIN_BLOCKED_FIELDS, DOMAIN_BLOCKED_DEFAULTS, "eventname = 'domain-blocked'")
);

// Gestione errori 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

module.exports.handler = serverless(app);