
# AWS CloudConnexa Dashboard

Questo progetto implementa una dashboard web per visualizzare e analizzare i dati di log provenienti dal servizio CloudConnexa, archiviati su Amazon S3 e interrogabili tramite Amazon Athena. L'applicazione è stata sviluppata con un frontend React e un backend serverless Node.js su AWS Lambda.

## Caratteristiche Principali

-   **Autenticazione Sicura**: Accesso protetto tramite AWS Cognito, con gestione utenti centralizzata dall'amministratore.
-   **Dashboard Interattiva**: Visualizzazione immediata dei KPI e dei grafici più importanti all'avvio.
-   **Report Dettagliati**: Accesso a 11 report predefiniti tramite una sidebar di navigazione.
-   **Ricerca Parametrica**: Funzionalità di ricerca per utente o indirizzo IP specifico.
-   **Backend Serverless**: Implementato con Node.js su AWS Lambda e API Gateway, gestito tramite Serverless Framework.
-   **Frontend Moderno**: Realizzato con React, Chart.js per i grafici e React Router per la navigazione.
-   **Indicatore di Stato**: Feedback visivo in tempo reale sulla connessione al backend.
-   **Configurazione Semplificata**: Parametri di deploy centralizzati in file `config.js` dedicati.

## Architettura del Sistema

L'applicazione segue un'architettura serverless che include un sistema di autenticazione e si integra con la pipeline dati esistente:

```
+-------------------+      +-------------------+      +-------------------+
| CloudConnexa Logs | ---->| Amazon S3 (JSONL) | ---->| AWS Glue (Schema) |
+-------------------+      +-------------------+      +-------------------+
                                    |
                                    | (Query Engine)
                                    V
+-------------------+      +-------------------+      +-------------------+
| React Frontend    | <--->| AWS Cognito       |      | Amazon Athena     |
| (Browser / S3)    |      | (Authentication)  |      +-------------------+
+-------------------+      +-------------------+             ^
       |                             |                       |
       | (Authenticated API Calls)   | (User Login)          | (AWS SDK)
       V                             V                       |
+-------------------+      +-------------------+             |
| AWS API Gateway   | <--->| AWS Lambda        |-------------+
| (Authorizer)      |      | (Node.js Backend) |
+-------------------+      +-------------------+ 
```

## Struttura dei Dati (Amazon Athena)

I dati di log sono archiviati su S3 in formato JSONL e interrogabili tramite la tabella `extracted_logs` nel database Glue `cloudconnexa_logs_db`.

### Tabella `extracted_logs`

La tabella è composta da campi di primo livello e da una struttura (STRUCT) annidata chiamata `log`.

#### Campi di Primo Livello

| Nome Campo             | Tipo di Dato | Descrizione                                                              |
| :--------------------- | :----------- | :----------------------------------------------------------------------- |
| `cloudconnexalogversion` | INT          | Versione del formato del log di CloudConnexa.                            |
| `timestamp`            | STRING       | Data e ora dell'evento in formato UTC (es. `2025-09-10T14:23:00.000000Z`). |
| `cloudid`              | STRING       | Identificativo univoco del cloud.                                        |
| `service`              | STRING       | Nome del servizio che ha generato il log (sempre `CloudConnexa`).        |
| `traceid`              | STRING       | ID univoco per tracciare una specifica transazione o flusso.             |
| `publicip`             | STRING       | Indirizzo IP pubblico dal quale l'utente si è connesso.                  |
| `initiator`            | STRING       | L'utente che ha iniziato la connessione (es. `danilo.rocchi@horsa.it`).  |
| `initiatortype`        | STRING       | Il tipo di iniziatore (es. `User`).                                      |
| `parententity`         | STRING       | ID dell'entità genitore (es. un gruppo).                                 |
| `parententitytype`     | STRING       | Tipo dell'entità genitore (es. `Group`).                                 |
| `category`             | STRING       | Categoria dell'evento (es. `Activity.AV`).                               |
| `eventname`            | STRING       | Nome dell'evento (es. `flow-established`).                               |
| `log`                  | STRUCT       | Oggetto annidato contenente i dettagli del log (vedi tabella sotto).     |

#### Dettaglio della Struttura `log`

Per accedere a questi campi in una query, si usa la notazione con il punto: `"log"."nome_campo"`.

| Nome Campo                | Tipo di Dato | Descrizione                                                              |
| :------------------------ | :----------- | :----------------------------------------------------------------------- |
| `clientsessionid`         | STRING       | ID univoco della sessione del client.                                    |
| `sourceparentid`          | STRING       | ID del genitore della sorgente (spesso l'utente stesso).                 |
| `sourceparenttype`        | STRING       | Tipo del genitore della sorgente (es. `User`).                           |
| `sourceentityid`          | STRING       | ID univoco dell'entità sorgente (es. un dispositivo).                    |
| `sourceentitytype`        | STRING       | Tipo di entità sorgente (es. `Device`).                                  |
| `sourceip`                | STRING       | Indirizzo IP privato/VPN dell'entità sorgente.                           |
| `sourcegatewayregion`     | STRING       | Regione del gateway a cui la sorgente è connessa.                        |
| `destinationparentid`     | STRING       | ID del genitore della destinazione (es. una rete).                       |
| `destinationparenttype`   | STRING       | Tipo del genitore della destinazione (es. `Network`).                    |
| `destinationentityid`     | STRING       | ID univoco dell'entità di destinazione (es. un servizio).                |
| `destinationentitytype`   | STRING       | Tipo di entità di destinazione (es. `Service`).                          |
| `destinationentityip`     | STRING       | Indirizzo IP dell'entità di destinazione.                                |
| `destinationport`         | INT          | Porta TCP/UDP di destinazione.                                           |
| `destinationgatewayregion`| STRING       | Regione del gateway della destinazione.                                  |
| `allowed`                 | BOOLEAN      | Indica se la connessione è stata permessa (`true`) o bloccata (`false`). |
| `protocolname`            | STRING       | Nome del protocollo (es. `tcp`, `udp`).                                  |
| `protocol`                | STRING       | Numero del protocollo (es. `6` per TCP).                                 |
| `sourcegatewayregionname` | STRING       | Nome per esteso della regione sorgente (es. `Milan`).                    |
| `destinationgatewayregionname` | STRING       | Nome per esteso della regione di destinazione (es. `Dublin`).            |
| `sourceparentname`        | STRING       | Nome del gruppo/progetto dell'utente sorgente (es. `Prj_SAP`).           |
| `sourceentityname`        | STRING       | Nome del dispositivo sorgente.                                           |
| `destinationentityname`   | STRING       | Nome del servizio di destinazione (es. `FOPE AWS VPC Ireland`).          |
| `destinationparentname`   | STRING       | Nome della rete di destinazione.                                         |

## Getting Started (Sviluppo Locale)

Per avviare l'applicazione in locale, segui questi passaggi.

### Prerequisiti

Assicurati di avere installato:

-   **Node.js e npm**: Necessari per eseguire il frontend React e il backend Node.js.
-   **AWS CLI**: Necessario per configurare le credenziali AWS e per il deploy.
    -   Se non hai l'AWS CLI, installala seguendo le istruzioni ufficiali per il tuo sistema operativo (es. `curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"` e `sudo installer -pkg AWSCLIV2.pkg -target /` su macOS).

### 1. Configura le Credenziali AWS

Il backend, anche in locale, necessita di accedere ad Athena. Le credenziali non vanno mai inserite nel codice.

Apri un terminale ed esegui:

```bash
aws configure
```

Inserisci la tua `AWS Access Key ID`, `AWS Secret Access Key`, e imposta `eu-west-1` come `Default region name`.

### 2. Configura il Progetto

Modifica i file di configurazione per adattarli al tuo ambiente:

-   **Backend**: Apri `backend/config.js`
    -   Sostituisci `NOME_DEL_TUO_BUCKET_PER_RISULTATI_ATHENA` con il nome di un bucket S3 reale (che creerai nella regione `eu-west-1`) dove Athena salverà i risultati delle query.

-   **Frontend**: Apri `frontend/src/config.js`
    -   Nella sezione `cognito`, inserisci i dati del tuo User Pool: `REGION`, `USER_POOL_ID`, e `APP_CLIENT_ID`.
    -   Per lo sviluppo locale, `API_BASE_URL` è già impostato correttamente su `http://localhost:3001/dev`. Non modificarlo ora.

### 3. Avvia il Backend

Apri un **primo terminale**, naviga nella cartella `backend` e avvia il server locale:

```bash
cd backend
npm install         # Solo la prima volta
npx serverless offline
```

Il backend sarà in ascolto su `http://localhost:3001`.

### 4. Avvia il Frontend

Apri una **seconda finestra del terminale**, naviga nella cartella `frontend` e avvia l'applicazione React:

```bash
cd frontend
npm install         # Solo la prima volta
npm start
```

Il browser si aprirà automaticamente all'indirizzo `http://localhost:3000` e mostrerà la pagina di login.

## Deploy su AWS

Una volta che l'applicazione funziona correttamente in locale, puoi pubblicarla su AWS.

### 1. Prerequisiti di Deploy: Crea un AWS Cognito User Pool

Prima di deployare, devi creare un **Amazon Cognito User Pool** per gestire gli utenti.

1.  Vai alla console di AWS Cognito nella regione che preferisci (es. `eu-west-1`).
2.  Crea un nuovo User Pool.
3.  All'interno del User Pool, crea un **App client**.
4.  Prendi nota dei seguenti valori, perché ti serviranno per configurare il frontend:
    -   **Region** (es. `eu-west-1`)
    -   **User Pool ID**
    -   **App Client ID**

### 2. Deploy del Backend (Lambda & API Gateway)

1.  **Assicurati di aver configurato `backend/config.js`** con il nome del tuo bucket S3 reale.
2.  Dalla cartella `backend`, esegui il comando di deploy:
    ```bash
    cd backend
    npx serverless deploy
    ```
3.  Al termine del deploy (potrebbero volerci alcuni minuti), copia l'**URL dell'endpoint API** che verrà mostrato nell'output del terminale.

### 3. Deploy del Frontend (Sito Statico su S3)

1.  **Configura il Frontend**: 
    *   Apri `frontend/src/config.js`.
    *   Sostituisci il valore di `API_BASE_URL` con l'URL dell'endpoint API che hai copiato al passo precedente.
    *   Assicurati che la sezione `cognito` sia compilata con i valori corretti del tuo User Pool (Region, User Pool ID, App Client ID).
2.  **Crea la Build di Produzione**:
    *   Dalla cartella `frontend`, esegui:
        ```bash
        cd frontend
        npm run build
        ```
    *   Questo creerà una cartella `build` con i file ottimizzati per la produzione.
3.  **Carica su S3**:
    *   Carica **tutto il contenuto** della cartella `build` in un bucket S3 configurato per l'hosting di siti web statici.

## Report Disponibili

L'applicazione offre i seguenti report, accessibili tramite la sidebar:

-   **Dashboard Principale**: Panoramica con KPI e grafici chiave.
-   **1. Report Dettagliato Traffico Bloccato**: Lista completa delle connessioni negate.
-   **2. Top Utenti con Connessioni Bloccate**: Identifica gli utenti con più tentativi falliti.
-   **3. Top Servizi Target di Traffico Bloccato**: Mostra i servizi più colpiti da accessi non autorizzati.
-   **4. Traffico Bloccato su Porte Insolite**: Rileva attività potenzialmente malevole su porte non standard.
-   **5. Riepilogo Connessioni Consentite vs Bloccate**: KPI immediato sul rapporto traffico legittimo/bloccato.
-   **6. Classifica Utenti più Attivi**: Visione operativa sull'utilizzo della VPN.
-   **7. Classifica Servizi più Utilizzati**: Identifica le applicazioni/server critici.
-   **8. Cerca Attività per Utente**: Ricerca dettagliata di tutte le attività di un utente specifico.
-   **9. Cerca Attività per IP**: Ricerca dettagliata di tutto il traffico verso un IP specifico.
-   **11. Analisi Oraria Connessioni Bloccate**: Identifica pattern temporali di tentativi falliti.

## Contribuzione e Miglioramenti Futuri

-   **Protezione SQL Injection**: Per un'applicazione di produzione, si raccomanda di implementare le query parametrizzate native di Athena per prevenire attacchi di SQL Injection.
-   **Filtri Temporali**: Implementare filtri per intervalli di tempo personalizzati per i report.
-   **Altre Query**: Integrare le query rimanenti (10, 12-16) e altre visualizzazioni.
