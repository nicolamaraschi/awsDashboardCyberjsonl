// ====================================================================
// FILE DI CONFIGURAZIONE DEL FRONTEND
// Modifica i valori in questo file prima del deploy.
// ====================================================================

const appConfig = {
  /**
   * (DOPO IL DEPLOY) URL dell'API Gateway del backend.
   * Lascia il valore di default per lo sviluppo locale.
   * Dopo il deploy del backend, sostituisci l'URL qui sotto con quello
   * fornito dall'output del comando `npx serverless deploy`.
   * Esempio: 'https://xxxxxxxxx.execute-api.eu-west-1.amazonaws.com/dev'
   */
  API_BASE_URL: 'http://localhost:3001/dev',

  /**
   * (OBBLIGATORIO PER AUTENTICAZIONE) Configurazione Amazon Cognito.
   * Sostituisci i placeholder con i valori del tuo User Pool.
   */
  cognito: {
    REGION: 'eu-west-1', // La regione del tuo User Pool (es. eu-west-1)
    USER_POOL_ID: 'YOUR_COGNITO_USER_POOL_ID', // L'ID del tuo User Pool
    APP_CLIENT_ID: 'YOUR_COGNITO_APP_CLIENT_ID', // L'ID del tuo App Client
  },
};

// Configurazione per Amplify v6
const amplifyV6Config = {
  Auth: {
    Cognito: {
      region: appConfig.cognito.REGION,
      userPoolId: appConfig.cognito.USER_POOL_ID,
      userPoolClientId: appConfig.cognito.APP_CLIENT_ID,
    }
  }
};

export default amplifyV6Config;


// Logica per usare l'URL corretto in base all'ambiente (sviluppo vs produzione)
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    if (appConfig.API_BASE_URL === 'http://localhost:3001/dev') {
      console.warn('ATTENZIONE: Stai usando l\'URL di localhost in produzione. Ricordati di aggiornare frontend/src/config.js!');
    }
    return appConfig.API_BASE_URL;
  }
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();
export const COGNITO_CONFIG = appConfig.cognito;
