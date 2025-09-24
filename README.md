
# AWS CloudConnexa Log Explorer

Questo progetto implementa un'applicazione web per esplorare, filtrare e analizzare i dati di log provenienti dal servizio CloudConnexa, archiviati su Amazon S3 e interrogabili tramite Amazon Athena. L'applicazione è stata sviluppata con un frontend React e un backend serverless Node.js su AWS Lambda.

## Caratteristiche Principali

-   **Ricerca Dinamica e Flessibile**: Interfaccia unificata per costruire query complesse aggiungendo filtri multipli in modo interattivo.
-   **Selezione Colonne ed Esportazione**: Possibilità di scegliere quali colonne visualizzare nei risultati e di esportare i dati in formato Excel (.xlsx) nativo.
-   **Backend Serverless e Sicuro**: Implementato con Node.js su AWS Lambda, API Gateway e un costruttore di query dinamiche con whitelist per prevenire SQL injection.
-   **Frontend Moderno**: Realizzato con React e React Router per la navigazione e la gestione dello stato.
-   **Configurazione Semplificata**: Parametri di deploy centralizzati in file `config.js` dedicati.

## Architettura del Sistema

L'applicazione segue un'architettura serverless e si integra con la pipeline dati esistente:

```
+-------------------+      +-------------------+      +-------------------+
| CloudConnexa Logs | ---->| Amazon S3 (JSONL) | ---->| AWS Glue (Schema) |
+-------------------+      +-------------------+      +-------------------+
                                    |
                                    | (Query Engine)
                                    V
+-------------------+      +-------------------+      +-------------------+
| React Frontend    | <--->| AWS API Gateway   | <--->| AWS Lambda        | ----> | Amazon Athena     |
| (Query Builder)   |      | (REST API)        |      | (Node.js Backend) |      +-------------------+
+-------------------+      +-------------------+      +-------------------+
```

## Struttura dei Dati (Amazon Athena)

I dati di log sono archiviati su S3 in formato JSONL e interrogabili tramite la tabella `extracted_logs` nel database Glue `cloudconnexa_logs_db`.

*La struttura dettagliata dei campi è disponibile nel file `gemini.md`.*

## Getting Started (Sviluppo Locale)

Per avviare l'applicazione in locale, segui questi passaggi.

### Prerequisiti

Assicurati di avere installato:

-   **Node.js e npm**: Necessari per eseguire il frontend React e il backend Node.js.
-   **AWS CLI**: Necessario per configurare le credenziali AWS con i permessi corretti per Athena, Glue e S3.

### 1. Configura le Credenziali AWS

Apri un terminale ed esegui `aws configure`, inserendo le tue credenziali IAM. L'utente associato deve avere i permessi per eseguire query su Athena, leggere il catalogo Glue e leggere/scrivere sul bucket S3 dei risultati di Athena.

### 2. Configura il Progetto

-   **Backend**: Apri `backend/config.js` e assicurati che i valori di `ATHENA_DB`, `ATHENA_RESULTS_BUCKET` e `ATHENA_WORKGROUP` siano corretti per il tuo ambiente.

### 3. Avvia il Backend

Apri un **primo terminale** e avvia il server locale:

```bash
cd aws-serverless-app/backend
npm install         # Solo la prima volta
npx serverless offline
```

### 4. Avvia il Frontend

Apri una **seconda finestra del terminale** e avvia l'applicazione React:

```bash
cd aws-serverless-app/frontend
npm install         # Solo la prima volta
npm start
```

Il browser si aprirà automaticamente su `http://localhost:3000`.

## Funzionalità di Ricerca

L'applicazione è stata trasformata da una dashboard con report statici a un potente strumento di esplorazione dei log. L'interfaccia di ricerca unica permette di:

-   **Costruire Query Complesse**: Aggiungere uno o più filtri in modo dinamico per interrogare i dati in base a qualsiasi campo disponibile (utente, IP, porta, ecc.).
-   **Personalizzare l'Output**: Selezionare da un menu a tendina le colonne specifiche che si desidera visualizzare nella tabella dei risultati.
-   **Esportare i Dati**: Scaricare con un click i risultati filtrati e personalizzati in un file `.xlsx`, pronto per essere analizzato in Excel o altri software.

## Deploy su AWS

1.  **Configura il Backend**: Assicurati che `backend/config.js` contenga i valori corretti per l'ambiente di produzione.
2.  **Esegui il Deploy del Backend**: Dalla cartella `backend`, esegui `npx serverless deploy`.
3.  **Configura il Frontend**: Apri `frontend/src/config.js` e imposta `API_BASE_URL` con l'URL dell'API Gateway ottenuto dal deploy.
4.  **Crea la Build di Produzione**: Dalla cartella `frontend`, esegui `npm run build`.
5.  **Carica su S3**: Carica il contenuto della cartella `frontend/build` in un bucket S3 configurato per l'hosting di siti web statici.
