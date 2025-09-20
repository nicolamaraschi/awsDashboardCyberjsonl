

// ====================================================================
// FILE DI CONFIGURAZIONE DEL FRONTEND
// Modifica i valori in questo file prima del deploy.
// ====================================================================

const config = {
  /**
   * (DOPO IL DEPLOY) URL dell'API Gateway del backend.
   * Lascia il valore di default per lo sviluppo locale.
   * Dopo il deploy del backend, sostituisci l'URL qui sotto con quello
   * fornito dall'output del comando `npx serverless deploy`.
   * Esempio: 'https://xxxxxxxxx.execute-api.eu-west-1.amazonaws.com/dev'
   */
  API_BASE_URL: 'http://localhost:3001/dev',
};

// Logica per usare l'URL corretto in base all'ambiente (sviluppo vs produzione)
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // In produzione, usa l'URL che hai incollato sopra.
    // Assicurati che non sia l'URL di localhost!
    if (config.API_BASE_URL === 'http://localhost:3001/dev') {
      console.warn('ATTENZIONE: Stai usando l\'URL di localhost in produzione. Ricordati di aggiornare frontend/src/config.js!');
    }
    return config.API_BASE_URL;
  }
  // In sviluppo, usa sempre localhost.
  return 'http://localhost:3001/dev';
};

export const API_URL = getApiUrl();

