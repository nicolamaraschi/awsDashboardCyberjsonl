# Contesto Tecnico per Log Explorer su AWS

## 1. Obiettivo Finale
L'obiettivo è creare un'applicazione web (frontend + backend) ospitata su AWS che permetta di esplorare, filtrare e analizzare i dati di log provenienti dal servizio CloudConnexa. L'applicazione fornisce un'interfaccia di ricerca dinamica per costruire query complesse in modo interattivo.

## 2. Architettura e Schema dei Dati

L'applicazione non gestisce l'ingestione o la memorizzazione dei log, ma solo la loro interrogazione e visualizzazione.

**Flusso dei dati:**
`CloudConnexa (Logs JSONL) -> Amazon S3 -> AWS Glue (Catalogo) -> Amazon Athena (Query)`

- **Storage (Amazon S3):**
  - **Formato:** JSONL (un oggetto JSON per riga).

- **Catalogo Dati (AWS Glue Data Catalog):**
  - **Database:** `cloudconnexa_logs_db`
  - **Tabella:** `extracted_logs`

- **Motore di Query (Amazon Athena):**
  - È il servizio con cui il backend deve interagire per eseguire query SQL sui dati in S3.

### Struttura Dettagliata della Tabella `extracted_logs`

*La struttura completa della tabella, con tutti i campi disponibili, è documentata nel file `README.md`.*

---

## 3. Gestione della Configurazione

I parametri di configurazione sono centralizzati in file dedicati.

### Configurazione Backend
- **File:** `backend/config.js`
- **Scopo:** Contiene i parametri di connessione ad Athena (regione, database, workgroup, bucket per i risultati).
- **Azione richiesta:** I valori devono essere corretti per l'ambiente AWS target.

### Configurazione Frontend
- **File:** `frontend/src/config.js`
- **Scopo:** Contiene l'URL dell'API del backend (`API_BASE_URL`).
- **Azione richiesta:** Dopo il deploy del backend, questo URL va aggiornato con l'endpoint di API Gateway.

---

## 4. Ruolo del Backend (Node.js su AWS Lambda)
Il backend funge da intermediario sicuro tra il frontend e Athena.

- **Endpoint Unico:** Espone un solo endpoint principale, `POST /api/search`.
- **Logica Dinamica:** Riceve un payload JSON dal frontend contenente due array:
  - `filters`: per costruire la clausola `WHERE`.
  - `selectFields`: per costruire la clausola `SELECT`.
- **Sicurezza:** Utilizza una funzione `buildDynamicQuery` in `queries.js` che valida e sanifica tutti gli input basandosi su una whitelist di colonne per prevenire SQL injection.
- **Interazione Athena:** Esegue la query SQL generata dinamicamente tramite l'AWS SDK.

## 5. Ruolo del Frontend (React)
- **Scopo:** Applicazione single-page che fornisce un'interfaccia utente per costruire query dinamiche.
- **Funzionamento:**
  1.  Permette all'utente di aggiungere/rimuovere filtri e di selezionare le colonne per l'output.
  2.  Costruisce il payload JSON e lo invia all'endpoint `POST /api/search`.
  3.  Visualizza i risultati in una tabella.
  4.  Gestisce l'esportazione dei dati in formato `.xlsx` tramite la libreria `xlsx` (SheetJS).

---

## 6. Istruzioni per Eseguire il Progetto in Locale

**Prerequisito:** Aver configurato le credenziali AWS (`aws configure`) con un utente IAM che abbia i permessi necessari per Athena, Glue e S3.

### Terminale 1: Avvio del Backend

```bash
cd aws-serverless-app/backend
npm install
npx serverless offline
```

### Terminale 2: Avvio del Frontend

```bash
cd aws-serverless-app/frontend
npm install
npm start
```

---

## 7. Logica di Query Dinamica

Tutta l'architettura dei report statici è stata sostituita da un sistema di interrogazione dinamica.

- **Endpoint:** `POST /api/search`
- **Corpo della Richiesta (Payload):**
  ```json
  {
    "filters": [
      { "field": "initiator", "value": "nome.utente@example.com" },
      { "field": "log.destinationport", "value": 443 }
    ],
    "selectFields": ["timestamp", "initiator", "ip_destinazione"]
  }
  ```
- **Logica `queries.js`:**
  - Il file contiene la funzione `buildDynamicQuery`.
  - **SELECT Builder:** Costruisce la clausola `SELECT` partendo dall'array `selectFields`, validando ogni campo contro una whitelist di sicurezza (`ALL_SELECTABLE_FIELDS`).
  - **WHERE Builder:** Costruisce la clausola `WHERE` partendo dall'array `filters`, validando i campi (`ALLOWED_FILTER_COLUMNS`) e sanificando i valori per prevenire SQL injection.
  - La funzione assembla e restituisce la query SQL completa e sicura da eseguire.
