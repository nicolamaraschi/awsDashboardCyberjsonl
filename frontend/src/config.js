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
    USER_POOL_ID: 'eu-west-1_7WLST1Mlg', // L'ID del tuo User Pool
    APP_CLIENT_ID: 'vpscdsoro31v6hioq7e52ktkv', // L'ID del tuo App Client
    IDENTITY_POOL_ID: 'eu-west-1:36d062f2-d4f0-4b1d-ba60-5ce34cf991cc', // L'ID del tuo Identity Pool
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


// Logica per usare l'URL corretto in base all'ambiente
const getApiUrl = () => {
  // Se la variabile d'ambiente REACT_APP_API_BASE_URL è impostata (es. da Docker), usa quella.
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Altrimenti, usa l'URL per lo sviluppo locale standard.
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();
export const COGNITO_CONFIG = appConfig.cognito;
