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
const sapService = require('./sap-service');

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



app.post('/api/sap/dashboard', async (req, res) => {
  try {
    console.log('=== SAP Dashboard Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { startDate, endDate, selectedClients, selectedSids } = req.body;
    
    if (!startDate || !endDate) {
      console.log('Missing startDate or endDate');
      return res.status(400).json({ error: 'startDate and endDate are required.' });
    }
    
    console.log('Calling sapService.getDashboardData with:', {
      startDate,
      endDate,
      selectedClients,
      selectedSids
    });
    
    const data = await sapService.getDashboardData(req.body);
    
    console.log('Dashboard data received:', JSON.stringify(data, null, 2));
    
    res.json(data);
  } catch (error) {
    console.error('=== Error in /api/sap/dashboard ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Error fetching SAP dashboard data.',
      details: error.message 
    });
  }
});




app.get('/api/sap/dump-types', async (req, res) => {
  try {
    const dumpTypes = await sapService.getDistinctDumpTypes();
    res.json(dumpTypes);
  } catch (error) {
    console.error('Error fetching distinct dump types:', error);
    res.status(500).json({ error: 'Error fetching distinct dump types.' });
  }
});

// Gestione errori 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

module.exports.handler = serverless(app);
module.exports.app = app; // Esporta l'app per server.js
