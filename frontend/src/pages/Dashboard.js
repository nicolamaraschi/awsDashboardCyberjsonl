import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { API_URL } from '../config';

// Card per i singoli numeri KPI
const KpiCard = ({ title, value, isLoading }) => (
  <div className="kpi-card">
    <h4>{title}</h4>
    <div className="kpi-value">{isLoading ? '...' : value}</div>
  </div>
);

// Card generica per i contenuti della dashboard
const DashboardCard = ({ title, children, isLoading, error }) => (
  <div className="dashboard-card">
    <h2>{title}</h2>
    <div className="card-content">
      {isLoading && <div className="loader"></div>}
      {error && <p className="error">{error}</p>}
      {!isLoading && !error && children}
      {!isLoading && !error && !children && (
        <div className="no-data-message">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h-1.5a3.375 3.375 0 01-3.375-3.375V9.75m3.75 9.75h-3.75V9.75m3.75 9.75a1.125 1.125 0 01-1.125 1.125H3.375a3.375 3.375 0 01-3.375-3.375V11.25m18.75-4.5v2.25m18.75-4.5v2.25m-18.75 0h.008v.008h-.008V7.125zm0 0h.008v.008h-.008V7.125zm0 0h.008v.008h-.008V7.125zM12 6v.008H12.008V6H12z" />
          </svg>
          <p>Nessun dato disponibile.</p>
        </div>
      )}
    </div>
  </div>
);

// Tabella per le ultime connessioni bloccate
const LatestBlockedTable = ({ data }) => (
  <table className="latest-blocked-table">
    <tbody>
      {data.map((row, i) => (
        <tr key={i}>
          <td>{new Date(row.timestamp).toLocaleTimeString()}</td>
          <td>{row.initiator}</td>
          <td>{row.servizio_destinazione}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

function Dashboard() {
  const [kpiData, setKpiData] = useState(null);
  const [topServicesData, setTopServicesData] = useState(null);
  const [topUsersBlockedData, setTopUsersBlockedData] = useState(null);
  const [latestBlocked, setLatestBlocked] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); // Resetta l'errore precedente
      try {
        const [kpiRes, topServicesRes, topUsersRes, latestBlockedRes] = await Promise.all([
          axios.get(`${API_URL}/api/reports/dashboard-kpis`),
          axios.get(`${API_URL}/api/reports/top-used-services`),
          axios.get(`${API_URL}/api/reports/top-users-blocked`),
          axios.get(`${API_URL}/api/reports/latest-blocked`),
        ]);

        // Log dei dati ricevuti per debugging
        console.log('Dati KPI:', kpiRes.data);
        console.log('Dati Top Servizi:', topServicesRes.data);
        console.log('Dati Top Utenti Bloccati:', topUsersRes.data);
        console.log('Dati Ultime Connessioni:', latestBlockedRes.data);

        // Controlli di sicurezza sui dati
        if (kpiRes.data && kpiRes.data.length > 0) {
          setKpiData(kpiRes.data[0]);
        }

        if (latestBlockedRes.data && Array.isArray(latestBlockedRes.data)) {
          setLatestBlocked(latestBlockedRes.data);
        }

        if (topServicesRes.data && Array.isArray(topServicesRes.data)) {
          setTopServicesData({
            labels: topServicesRes.data.map(d => d.servizio_destinazione),
            datasets: [{
              label: 'Connessioni Riuscite',
              data: topServicesRes.data.map(d => d.comannessioni_riuscite),
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
            }],
          });
        }

        if (topUsersRes.data && Array.isArray(topUsersRes.data)) {
          setTopUsersBlockedData({
            labels: topUsersRes.data.map(d => d.initiator),
            datasets: [{
              label: 'Connessioni Bloccate',
              data: topUsersRes.data.map(d => d.numero_connessioni_bloccate),
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
            }],
          });
        }

      } catch (err) {
        setError('Impossibile caricare i dati della dashboard.');
        console.error('Errore durante il fetch dei dati:', err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div>
      <div className="kpi-grid">
        <KpiCard title="Connessioni totali (24h)" value={kpiData?.total_connections} isLoading={loading} />
        <KpiCard title="Utenti unici (24h)" value={kpiData?.unique_users} isLoading={loading} />
        <KpiCard title="Traffico Bloccato (24h)" value={`${parseFloat(kpiData?.blocked_percentage || 0).toFixed(2)}%`} isLoading={loading} />
      </div>
      <div className="dashboard-grid">
        <DashboardCard title="Top Servizi più Utilizzati" isLoading={loading} error={error}>
          {topServicesData && <Bar data={topServicesData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
        </DashboardCard>

        <DashboardCard title="Top Utenti con Connessioni Bloccate" isLoading={loading} error={error}>
          {topUsersBlockedData && <Bar data={topUsersBlockedData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
        </DashboardCard>

        <DashboardCard title="Ultime 5 Connessioni Bloccate" isLoading={loading} error={error}>
          {latestBlocked && <LatestBlockedTable data={latestBlocked} />}
        </DashboardCard>
      </div>
    </div>
  );
}

export default Dashboard;