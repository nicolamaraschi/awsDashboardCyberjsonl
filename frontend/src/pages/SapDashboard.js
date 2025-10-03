import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Using axios for API calls
import './SapDashboard.css';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// API base URL - it's better to have this in a config file
const API_BASE_URL = 'http://localhost:3001/api'; // Assuming local dev port

const SapDashboard = () => {
  // Filters state
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2025-10-01');
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);

  // Data state
  const [kpis, setKpis] = useState({ totalDumps: 0, failedBackups: 0, cancelledJobs: 0 });
  const [clientIssues, setClientIssues] = useState({ labels: [], datasets: [] });
  const [dumpTypes, setDumpTypes] = useState({ labels: [], datasets: [] });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial data: clients and default dashboard data
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/sap/clients`);
        setClients(response.data);
      } catch (err) {
        console.error("Error fetching clients", err);
        setError('Failed to load client list.');
      }
    };

    fetchClients();
    handleApplyFilters(true); // Initial data load
  }, []); // Empty dependency array means this runs once on mount

  const handleApplyFilters = async (isInitialLoad = false) => {
    if (!isInitialLoad) {
        setLoading(true);
    }
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/sap/dashboard`, {
        startDate,
        endDate,
        selectedClients,
      });
      const { data } = response;
      setKpis(data.kpis);
      setClientIssues(data.clientIssues);
      setDumpTypes(data.dumpTypes);
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sap-dashboard">
      <header className="dashboard-header">
        <h1>SAP Monitoring Dashboard</h1>
      </header>

      <section className="filters-section">
        <div className="filter-item">
          <label>From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={loading} />
        </div>
        <div className="filter-item">
          <label>To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={loading} />
        </div>
        <div className="filter-item">
          <label>Clients:</label>
          <select multiple value={selectedClients} onChange={e => setSelectedClients(Array.from(e.target.selectedOptions, option => option.value))} disabled={loading || clients.length === 0}>
            {clients.map(client => <option key={client} value={client}>{client}</option>)}
          </select>
        </div>
        <button onClick={() => handleApplyFilters(false)} disabled={loading}>
          {loading ? 'Loading...' : 'Apply'}
        </button>
      </section>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Loading data...</div>
      ) : (
        <>
          <section className="kpi-section">
            <div className="kpi-card">
              <h2>Total Dumps</h2>
              <p>{kpis.totalDumps}</p>
            </div>
            <div className="kpi-card">
              <h2>Failed Backups</h2>
              <p>{kpis.failedBackups}</p>
            </div>
            <div className="kpi-card">
              <h2>Cancelled Jobs</h2>
              <p>{kpis.cancelledJobs}</p>
            </div>
          </section>

          <section className="charts-section">
            <div className="chart-container">
              <h3>Issues by Client</h3>
              {clientIssues.labels.length > 0 ? <Bar data={clientIssues} /> : <p>No data</p>}
            </div>
            <div className="chart-container">
              <h3>Most Common Dump Types</h3>
              {dumpTypes.labels.length > 0 ? <Pie data={dumpTypes} /> : <p>No data</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default SapDashboard;