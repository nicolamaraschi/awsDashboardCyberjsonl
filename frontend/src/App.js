
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Search from './pages/Search';
import './App.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { fetchAuthSession } from 'aws-amplify/auth';
import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // Stili di default di Amplify UI
import axios from 'axios';

// Registra i componenti di Chart.js
ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend
);

// Axios Interceptor per aggiungere il token JWT
axios.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens.idToken.toString();
    config.headers.Authorization = `Bearer ${token}`;
  } catch (error) {
    // Utente non autenticato o sessione scaduta
    console.warn('Nessun token di autenticazione trovato o sessione scaduta.', error);
  }
  return config;
});

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Router>
      <div className={`App-container ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
        <Sidebar />
        <main className="main-content">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            ☰
          </button>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports/:reportId" element={<Report />} />
            <Route path="/search/:type" element={<Search />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default withAuthenticator(App, { hideSignUp: true }); // <-- Avvolgo l'app con l'autenticatore
