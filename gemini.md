# Contesto Tecnico per lo Sviluppo di Dashboard su AWS

## 1. Obiettivo Finale
L'obiettivo è creare un'applicazione web (frontend + backend) ospitata su AWS che visualizzi i dati di log provenienti dal servizio CloudConnexa. L'applicazione dovrà presentare i dati attraverso una serie di dashboard interattive per l'analisi di sicurezza e operativa, con accesso protetto da autenticazione.

## 2. Architettura e Schema dei Dati

L'applicazione non gestisce l'ingestione o la memorizzazione dei log, ma solo la loro interrogazione e visualizzazione.

**Flusso dei dati:**
`CloudConnexa (Logs JSONL) -> Amazon S3 -> AWS Glue (Catalogo) -> Amazon Athena (Query)`

- **Storage (Amazon S3):**
  - **Formato:** JSONL (un oggetto JSON per riga).
  - **Posizione:** `s3://horsaruncloudconnexalog/CloudConnexa/horsarun/extracted/`

- **Catalogo Dati (AWS Glue Data Catalog):**
  - **Database:** `cloudconnexa_logs_db`
  - **Tabella:** `extracted_logs`

- **Motore di Query (Amazon Athena):**
  - È il servizio con cui il backend deve interagire per eseguire query SQL sui dati in S3.

- **Autenticazione (AWS Cognito):**
  - Gestisce il login degli utenti. Il frontend è protetto e solo gli utenti autenticati possono accedere alla dashboard e interrogare il backend.

### Struttura Dettagliata della Tabella `extracted_logs`

La tabella è composta da campi di primo livello e da una struttura (STRUCT) annidata chiamata `log`.

#### Campi di Primo Livello

| Nome Campo | Tipo di Dato | Descrizione |
|---|---|---|
| `cloudconnexalogversion` | INT | Versione del formato del log di CloudConnexa. |
| `timestamp` | STRING | Data e ora dell'evento in formato UTC (es. `2025-09-10T14:23:00.000000Z`). |
| `cloudid` | STRING | Identificativo univoco del cloud. |
| `service` | STRING | Nome del servizio che ha generato il log (sempre `CloudConnexa`). |
| `traceid` | STRING | ID univoco per tracciare una specifica transazione o flusso. |
| `publicip` | STRING | Indirizzo IP pubblico dal quale l'utente si è connesso. |
| `initiator` | STRING | L'utente che ha iniziato la connessione (es. `danilo.rocchi@horsa.it`). |
| `initiatortype` | STRING | Il tipo di iniziatore (es. `User`). |
| `parententity` | STRING | ID dell'entità genitore (es. un gruppo). |
| `parententitytype` | STRING | Tipo dell'entità genitore (es. `Group`). |
| `category` | STRING | Categoria dell'evento (es. `Activity.AV`). |
| `eventname` | STRING | Nome dell'evento (es. `flow-established`). |
| `log` | STRUCT | Oggetto annidato contenente i dettagli del log (vedi tabella sotto). |

<br>

#### Dettaglio della Struttura `log`

Per accedere a questi campi in una query, si usa la notazione con il punto: `"log"."nome_campo"`.

| Nome Campo | Tipo di Dato | Descrizione |
|---|---|---|
| `clientsessionid` | STRING | ID univoco della sessione del client. |
| `sourceparentid` | STRING | ID del genitore della sorgente (spesso l'utente stesso). |
| `sourceparenttype` | STRING | Tipo del genitore della sorgente (es. `User`). |
| `sourceentityid` | STRING | ID univoco dell'entità sorgente (es. un dispositivo). |
| `sourceentitytype` | STRING | Tipo di entità sorgente (es. `Device`). |
| `sourceip` | STRING | Indirizzo IP privato/VPN dell'entità sorgente. |
| `sourcegatewayregion` | STRING | Regione del gateway a cui la sorgente è connessa. |
| `destinationparentid` | STRING | ID del genitore della destinazione (es. una rete). |
| `destinationparenttype` | STRING | Tipo del genitore della destinazione (es. `Network`). |
| `destinationentityid` | STRING | ID univoco dell'entità di destinazione (es. un servizio). |
| `destinationentitytype` | STRING | Tipo di entità di destinazione (es. `Service`). |
| `destinationentityip` | STRING | Indirizzo IP dell'entità di destinazione. |
| `destinationport` | INT | Porta TCP/UDP di destinazione. |
| `destinationgatewayregion` | STRING | Regione del gateway della destinazione. |
| `allowed` | BOOLEAN | Indica se la connessione è stata permessa (`true`) o bloccata (`false`). |
| `protocolname` | STRING | Nome del protocollo (es. `tcp`, `udp`). |
| `protocol` | STRING | Numero del protocollo (es. `6` per TCP). |
| `sourcegatewayregionname` | STRING | Nome per esteso della regione sorgente (es. `Milan`). |
| `destinationgatewayregionname` | STRING | Nome per esteso della regione di destinazione (es. `Dublin`). |
| `sourceparentname` | STRING | Nome del gruppo/progetto dell'utente sorgente (es. `Prj_SAP`). |
| `sourceentityname` | STRING | Nome del dispositivo sorgente. |
| `destinationentityname` | STRING | Nome del servizio di destinazione (es. `FOPE AWS VPC Ireland`). |
| `destinationparentname` | STRING | Nome della rete di destinazione. |

---

## 3. Gestione della Configurazione

Per rendere il progetto facile da configurare, tutti i parametri che richiedono un intervento manuale sono stati centralizzati in due file dedicati, uno per il backend e uno per il frontend.

### Configurazione Backend
- **File:** `backend/config.js`
- **Scopo:** Contiene i parametri necessari al backend per connettersi ai servizi AWS.
- **Azione richiesta:** Prima del deploy, è **obbligatorio** modificare il valore di `ATHENA_RESULTS_BUCKET` con il nome del proprio bucket S3.

### Configurazione Frontend
- **File:** `frontend/src/config.js`
- **Scopo:** Contiene la configurazione per AWS Amplify (Cognito) e l'URL dell'API del backend.
- **Azione richiesta:** 
  - È **obbligatorio** compilare la sezione `cognito` con i dati del proprio User Pool (REGION, USER_POOL_ID, APP_CLIENT_ID).
  - Dopo il deploy del backend, è **obbligatorio** modificare il valore di `API_BASE_URL` con l'URL dell'API Gateway fornito da AWS.

---

## 4. Ruolo del Backend (Node.js su AWS Lambda)
Il backend funge da intermediario tra il frontend e Athena.

- **Interazione:** Utilizza l'**AWS SDK for JavaScript** per interagire con Athena.
- **Ciclo di vita della richiesta:**
  1.  **StartQueryExecution:** Invia una query SQL ad Athena e ottiene un `QueryExecutionId`.
  2.  **GetQueryExecution:** Controlla periodicamente lo stato della query usando l'ID.
  3.  **GetQueryResults:** A query completata (`SUCCEEDED`), recupera i risultati.
- **Endpoint:** Espone endpoint REST (es. `/api/report/blocked-traffic`) che mappano a query SQL specifiche.
- **Permessi IAM:** La funzione Lambda necessita di un ruolo IAM con permessi per `athena`, `glue` e `s3`.

## 5. Ruolo del Frontend (React)
- **Scopo:** Applicazione single-page che fornisce l'interfaccia utente.
- **Funzionamento:**
  1.  Gestisce il flusso di autenticazione (login/logout) tramite i componenti UI di AWS Amplify.
  2.  Chiama gli endpoint del backend per recuperare i dati dei report, includendo un token JWT per l'autorizzazione.
  3.  Utilizza una libreria di grafici (es. Chart.js) per visualizzare i dati ricevuti in formato JSON.

---

## 6. Istruzioni per Eseguire il Progetto in Locale

Per avviare l'ambiente di sviluppo locale, sono necessarie due finestre del terminale.

**Prerequisito:** Assicurati di aver configurato le credenziali AWS sul tuo computer (es. tramite il comando `aws configure`).

### Terminale 1: Avvio del Backend

```bash
cd aws-serverless-app/backend
npm install
npx serverless offline
```

### Terminale 2: Avvio del Frontend

**Azione richiesta:** Prima di avviare, assicurati di aver compilato la sezione `cognito` nel file `frontend/src/config.js`.

```bash
cd aws-serverless-app/frontend
npm install
npm start
```

---

## 7. Deploy su AWS

Quando il progetto è pronto per essere pubblicato su AWS, segui questi passaggi:

1.  **Prerequisito: Crea un AWS Cognito User Pool**
    - Vai alla console di AWS Cognito e crea un nuovo User Pool.
    - All'interno del User Pool, crea un **App client**.
    - Prendi nota di: **Region**, **User Pool ID**, e **App Client ID**.

2.  **Configura il Backend:** Apri il file `backend/config.js` e inserisci il nome del tuo bucket S3 per i risultati di Athena nel campo `ATHENA_RESULTS_BUCKET`.
3.  **Esegui il Deploy del Backend:** Dalla cartella `backend`, esegui il comando:
    ```bash
    npx serverless deploy
    ```
    Al termine, copia l'URL dell'endpoint API che ti viene mostrato.
4.  **Configura il Frontend:** Apri il file `frontend/src/config.js` e:
    - Incolla l'URL dell'API nel campo `API_BASE_URL`.
    - Assicurati che la sezione `cognito` sia compilata con i dati corretti del tuo User Pool.
5.  **Crea la Build di Produzione del Frontend:** Dalla cartella `frontend`, esegui:
    ```bash
    npm run build
    ```
6.  **Carica il Frontend su S3:** Carica il contenuto della cartella `frontend/build` in un bucket S3 configurato per l'hosting di siti web statici.

---

## 8. Query SQL Implementate

Di seguito l'elenco delle query integrate nel backend.

### 1 - Report Dettagliato Traffico Bloccato
**Endpoint:** `/api/reports/detailed-blocked-traffic`
```sql
SELECT
  timestamp, initiator, publicip AS ip_pubblico_sorgente, "log"."sourceip" AS ip_vpn_sorgente,
  "log"."destinationentityname" AS servizio_destinazione, "log"."destinationentityip" AS ip_destinazione,
  "log"."destinationport" AS porta, "log"."protocolname" AS protocollo
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE "log"."allowed" = false ORDER BY timestamp DESC;
```

### 2 - Top Utenti con Connessioni Bloccate
**Endpoint:** `/api/reports/top-users-blocked`
```sql
SELECT initiator, count(*) AS numero_connessioni_bloccate
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE "log"."allowed" = false
GROUP BY initiator ORDER BY numero_connessioni_bloccate DESC LIMIT 20;
```

### 3 - Top Servizi Target di Traffico Bloccato
**Endpoint:** `/api/reports/top-services-blocked`
```sql
SELECT
  "log"."destinationentityname" AS servizio_destinazione, "log"."destinationentityip" AS ip_destinazione,
  count(*) AS tentativi_bloccati
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE "log"."allowed" = false
GROUP BY "log"."destinationentityname", "log"."destinationentityip" ORDER BY tentativi_bloccati DESC LIMIT 20;
```

### 4 - Traffico Bloccato su Porte Insolite
**Endpoint:** `/api/reports/unusual-ports-blocked`
```sql
SELECT
  timestamp, initiator, "log"."sourceip" AS ip_sorgente, "log"."destinationentityip" AS ip_destinazione,
  "log"."destinationport" AS porta
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE "log"."allowed" = false AND "log"."destinationport" NOT IN (80, 443, 3389, 22, 53)
ORDER BY "log"."destinationport" ASC;
```

### 5 - Riepilogo Connessioni Consentite vs Bloccate
**Endpoint:** `/api/reports/allowed-vs-blocked-summary`
```sql
SELECT
  CASE WHEN "log"."allowed" = true THEN 'Consentite' ELSE 'Bloccate' END AS stato_connessione,
  count(*) AS totale
FROM "cloudconnexa_logs_db"."extracted_logs" GROUP BY "log"."allowed";
```

### 6 - Classifica Utenti più Attivi (Totale Connessioni)
**Endpoint:** `/api/reports/top-active-users`
```sql
SELECT initiator, count(*) as numero_totale_connessioni
FROM "cloudconnexa_logs_db"."extracted_logs"
GROUP BY initiator ORDER BY numero_totale_connessioni DESC LIMIT 20;
```

### 7 - Classifica Servizi più Utilizzati (Connessioni Riuscite)
**Endpoint:** `/api/reports/top-used-services`
```sql
SELECT "log"."destinationentityname" AS servizio_destinazione, count(*) AS connessioni_riuscite
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE "log"."allowed" = true
GROUP BY "log"."destinationentityname" ORDER BY connessioni_riuscite DESC LIMIT 20;
```

### 8 - Traccia Attività Completa per Utente Singolo
**Endpoint:** `/api/activity/user/:username`
```sql
SELECT
  timestamp, "log"."allowed" AS consentita, "log"."sourceip" AS ip_sorgente,
  "log"."destinationentityname" AS servizio_destinazione, "log"."destinationentityip" AS ip_destinazione,
  "log"."destinationport" AS porta
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE initiator = ':username' ORDER BY timestamp DESC;
```

### 9 - Analisi Traffico verso IP di Destinazione
**Endpoint:** `/api/activity/ip/:ip`
```sql
SELECT timestamp, initiator, "log"."sourceip" AS ip_sorgente, "log"."allowed" AS consentita
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE "log"."destinationentityip" = ':ip' ORDER BY timestamp DESC;
```

### 10 - Mappa Geografica Origine Utenti
**Endpoint:** `/api/reports/user-geomap`
```sql
SELECT publicip, count(*) as numero_connessioni
FROM "cloudconnexa_logs_db"."extracted_logs"
GROUP BY publicip ORDER BY numero_connessioni DESC;
```

### 11 - Analisi Oraria Connessioni Bloccate
**Endpoint:** `/api/reports/hourly-blocked-analysis`
```sql
SELECT substr("timestamp", 12, 2) AS ora_del_giorno, count(*) AS totale_connessioni_bloccate
FROM "cloudconnexa_logs_db"."extracted_logs"
WHERE "log"."allowed" = false
GROUP BY substr("timestamp", 12, 2) ORDER BY ora_del_giorno ASC;
```
