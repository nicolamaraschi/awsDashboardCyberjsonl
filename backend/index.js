const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { runQuery } = require('./athena-service');
const { buildDynamicQuery } = require('./queries');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint di base per un controllo di salute
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Nuovo endpoint unico per tutte le ricerche dinamiche
app.post('/api/search', async (req, res) => {
  const criteria = req.body;

  // Validazione di base del corpo della richiesta
  if (!criteria || !criteria.filters || !Array.isArray(criteria.filters)) {
    return res.status(400).json({ error: 'Il corpo della richiesta deve contenere un array di filtri.' });
  }

  try {
    const query = buildDynamicQuery(criteria);
    const results = await runQuery(query);
    res.json(results);
  } catch (error) {
    console.error('Errore nell\'endpoint di ricerca dinamica:', error);
    res.status(500).json({ error: 'Errore durante l\'esecuzione della query.' });
  }
});

// Gestione errori 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports.handler = serverless(app);
