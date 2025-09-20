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
      {isLoading && <p>Caricamento...</p>}
      {error && <p className="error">{error}</p>}
      {!isLoading && !error && children}
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
      try {
        const [kpiRes, topServicesRes, topUsersRes, latestBlockedRes] = await Promise.all([
          axios.get(`${API_URL}/api/reports/dashboard-kpis`),
          axios.get(`${API_URL}/api/reports/top-used-services`),
          axios.get(`${API_URL}/api/reports/top-users-blocked`),
          axios.get(`${API_URL}/api/reports/latest-blocked`),
        ]);

        setKpiData(kpiRes.data[0]);
        setLatestBlocked(latestBlockedRes.data);

        setTopServicesData({
          labels: topServicesRes.data.map(d => d.servizio_destinazione),
          datasets: [{
            label: 'Connessioni Riuscite',
            data: topServicesRes.data.map(d => d.connessioni_riuscite),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
          }],
        });

        setTopUsersBlockedData({
          labels: topUsersRes.data.map(d => d.initiator),
          datasets: [{
            label: 'Connessioni Bloccate',
            data: topUsersRes.data.map(d => d.numero_connessioni_bloccate),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
          }],
        });

      } catch (err) {
        setError('Impossibile caricare i dati della dashboard.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <>
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
    </>
  );
}

export default Dashboard;