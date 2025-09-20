
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

function StatusIndicator() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await axios.get(`${API_URL}/api/health`);
        setIsOnline(true);
      } catch (error) {
        setIsOnline(false);
      }
    };

    // Controlla subito all'avvio
    checkStatus();

    // E poi controlla ogni 15 secondi
    const intervalId = setInterval(checkStatus, 15000);

    // Pulisce l'intervallo quando il componente viene smontato
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="status-indicator">
      <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
      <span className="status-text">{isOnline ? 'Backend Connesso' : 'Backend Offline'}</span>
    </div>
  );
}

export default StatusIndicator;
