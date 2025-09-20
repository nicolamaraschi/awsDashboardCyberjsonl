const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const { runQuery } = require('./athena-service');
const queries = require('./queries');

const app = express();
app.use(cors());
app.use(express.json());

// Funzione helper per creare un gestore di endpoint
const createReportEndpoint = (query) => async (req, res) => {
  console.log(`Esecuzione query per: ${req.path}`);
  try {
    const results = await runQuery(query);
    res.json(results);
  } catch (error) {
    console.error(`Errore per ${req.path}:`, error);
    res.status(500).json({ message: 'Errore interno del server', error: error.message });
  }
};

// === ENDPOINT STATICI ===
app.get('/', (req, res) => res.json({ message: 'Backend Athena Dashboard Attivo' }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' })); // Health check
app.get('/api/reports/detailed-blocked-traffic', createReportEndpoint(queries.DETAILED_BLOCKED_TRAFFIC));
app.get('/api/reports/top-users-blocked', createReportEndpoint(queries.TOP_USERS_BLOCKED));
app.get('/api/reports/top-services-blocked', createReportEndpoint(queries.TOP_SERVICES_BLOCKED));
app.get('/api/reports/unusual-ports-blocked', createReportEndpoint(queries.UNUSUAL_PORTS_BLOCKED));
app.get('/api/reports/allowed-vs-blocked-summary', createReportEndpoint(queries.ALLOWED_VS_BLOCKED_SUMMARY));
app.get('/api/reports/top-active-users', createReportEndpoint(queries.TOP_ACTIVE_USERS));
app.get('/api/reports/top-used-services', createReportEndpoint(queries.TOP_USED_SERVICES));
app.get('/api/reports/user-geomap', createReportEndpoint(queries.USER_GEOMAP));
app.get('/api/reports/hourly-blocked-analysis', createReportEndpoint(queries.HOURLY_BLOCKED_ANALYSIS));
app.get('/api/reports/dashboard-kpis', createReportEndpoint(queries.DASHBOARD_KPIS));
app.get('/api/reports/latest-blocked', createReportEndpoint(queries.LATEST_BLOCKED));

// === ENDPOINT PARAMETRIZZATI ===

// 8 - Traccia Attività Completa per Utente Singolo
app.get('/api/reports/user/:username', async (req, res) => {
  const { username } = req.params;
  console.log(`Esecuzione query attività per utente: ${username}`);
  try {
    // Sostituisce il placeholder nella query con l'username reale
    const parameterizedQuery = queries.USER_ACTIVITY_TRACE.replace('%USER_PLACEHOLDER%', username);
    const results = await runQuery(parameterizedQuery);
    res.json(results);
  } catch (error) {
    console.error(`Errore query per utente ${username}:`, error);
    res.status(500).json({ message: 'Errore interno del server', error: error.message });
  }
});

// 9 - Analisi Traffico verso IP di Destinazione
app.get('/api/reports/ip/:ip', async (req, res) => {
  const { ip } = req.params;
  console.log(`Esecuzione query attività per IP: ${ip}`);
  try {
    // Sostituisce il placeholder nella query con l'IP reale
    const parameterizedQuery = queries.DESTINATION_IP_ACTIVITY.replace('%IP_PLACEHOLDER%', ip);
    const results = await runQuery(parameterizedQuery);
    res.json(results);
  } catch (error) {
    console.error(`Errore query per IP ${ip}:`, error);
    res.status(500).json({ message: 'Errore interno del server', error: error.message });
  }
});

// Gestione errori 404 per tutte le altre rotte
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint non trovato' });
});

module.exports.handler = serverless(app);