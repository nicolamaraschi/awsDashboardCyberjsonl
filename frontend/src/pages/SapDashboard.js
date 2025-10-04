import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { API_URL } from '../config';
import './SapDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const SAPDashboard = () => {
  // Stati per i filtri
  const [availableClients, setAvailableClients] = useState([]);
  const [availableSIDs, setAvailableSIDs] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedSIDs, setSelectedSIDs] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Stati per i dati
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carica i clienti disponibili all'avvio
  useEffect(() => {
    loadAvailableClients();
  }, []);

  // Carica i SID quando cambiano i clienti selezionati
  useEffect(() => {
    if (selectedClients.length > 0) {
      loadAvailableSIDs(selectedClients);
      // Reset dei SID selezionati quando cambiano i clienti
      setSelectedSIDs([]);
    } else {
      // Se non ci sono clienti selezionati, svuota i SID disponibili
      setAvailableSIDs([]);
      setSelectedSIDs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClients]);

  // Carica i dati iniziali
  useEffect(() => {
    if (availableClients.length > 0) {
      // Seleziona tutti i clienti per default
      const allClients = availableClients.map(c => c.nomecliente);
      setSelectedClients(allClients);
    }
  }, [availableClients]);

  // Ricarica i dati quando cambiano i filtri principali
  useEffect(() => {
    if (selectedClients.length > 0) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClients, selectedSIDs, dateRange]);

  const loadAvailableClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sap/clients`);
      setAvailableClients(response.data);
    } catch (err) {
      console.error('Errore nel caricamento dei clienti:', err);
    }
  };

  const loadAvailableSIDs = async (clients) => {
    try {
      console.log('Frontend: Carico SID per clienti:', clients);
      const response = await axios.post(`${API_URL}/api/sap/sids`, { clients });
      console.log('Frontend: SID ricevuti:', response.data);
      setAvailableSIDs(response.data);
    } catch (err) {
      console.error('Errore nel caricamento dei SID:', err);
      setAvailableSIDs([]);
    }
  };

  const loadDashboardData = async () => {
    if (selectedClients.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        clients: selectedClients,
        sids: selectedSIDs.length > 0 ? selectedSIDs : undefined
      };

      const response = await axios.post(`${API_URL}/api/sap/dashboard`, filters);
      setDashboardData(response.data);
    } catch (err) {
      setError('Errore nel caricamento dei dati. Verifica la connessione al backend.');
      console.error('Errore dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientToggle = (client) => {
    setSelectedClients(prev => 
      prev.includes(client) 
        ? prev.filter(c => c !== client)
        : [...prev, client]
    );
  };

  const handleSIDToggle = (sid) => {
    setSelectedSIDs(prev => 
      prev.includes(sid) 
        ? prev.filter(s => s !== sid)
        : [...prev, sid]
    );
  };

  const handleSelectAllClients = () => {
    if (selectedClients.length === availableClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(availableClients.map(c => c.nomecliente));
    }
  };

  const handleSelectAllSIDs = () => {
    if (selectedSIDs.length === availableSIDs.length) {
      setSelectedSIDs([]);
    } else {
      setSelectedSIDs(availableSIDs.map(s => s.sid));
    }
  };

  // Prepara i dati per il grafico "Issues by Client"
  const getIssuesByClientChartData = () => {
    if (!dashboardData?.charts?.issuesByClient) return null;

    const data = dashboardData.charts.issuesByClient;
    const labels = data.map(item => item.nomecliente);
    const dumps = data.map(item => parseInt(item.dumps || 0));
    const backups = data.map(item => parseInt(item.failed_backups || 0));
    const jobs = data.map(item => parseInt(item.cancelled_jobs || 0));

    return {
      labels,
      datasets: [
        {
          label: 'Dumps',
          data: dumps,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
        },
        {
          label: 'Backup Falliti',
          data: backups,
          backgroundColor: 'rgba(255, 159, 64, 0.7)',
        },
        {
          label: 'Job Cancellati',
          data: jobs,
          backgroundColor: 'rgba(255, 205, 86, 0.7)',
        }
      ]
    };
  };

  // Prepara i dati per il grafico "Dump Types"
  const getDumpTypesChartData = () => {
    if (!dashboardData?.charts?.dumpTypes) return null;

    const data = dashboardData.charts.dumpTypes;
    
    // Aggreghiamo i dati per tipo di dump (sommando tutti i clienti)
    const typeMap = {};
    data.forEach(item => {
      const type = item.dump_type || 'Unknown';
      typeMap[type] = (typeMap[type] || 0) + parseInt(item.count || 0);
    });

    const labels = Object.keys(typeMap);
    const counts = Object.values(typeMap);

    // Colori per il grafico a torta
    const backgroundColors = [
      'rgba(255, 99, 132, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(199, 199, 199, 0.7)',
      'rgba(83, 102, 255, 0.7)',
      'rgba(255, 102, 178, 0.7)',
      'rgba(102, 255, 178, 0.7)'
    ];

    return {
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: backgroundColors.slice(0, labels.length),
        }
      ]
    };
  };

  // Componente KPI Card
  const KPICard = ({ title, value, trend, trendLabel, status }) => {
    const getTrendIcon = () => {
      if (trend > 0) return '↑';
      if (trend < 0) return '↓';
      return '→';
    };

    const getTrendColor = () => {
      // Per dumps, backups e jobs, un aumento è negativo (rosso)
      if (title.includes('Dumps') || title.includes('Backup') || title.includes('Job')) {
        if (trend > 0) return '#dc3545';
        if (trend < 0) return '#28a745';
      }
      return '#666';
    };

    return (
      <div className="kpi-card">
        <h3>{title}</h3>
        <div className="kpi-value">{value}</div>
        {trend !== 0 && (
          <div className="kpi-trend" style={{ color: getTrendColor() }}>
            <span className="trend-icon">{getTrendIcon()}</span>
            <span className="trend-label">{trendLabel}</span>
            <span className="trend-period"> dal periodo precedente</span>
          </div>
        )}
        {status && <div className="kpi-status">{status}</div>}
      </div>
    );
  };

  return (
    <div className="sap-dashboard">
      <h1>Dashboard SAP - Report Giornalieri</h1>

      {/* Filtri */}
      <div className="filters-container">
        <div className="filter-section">
          <label>Date Range</label>
          <div className="date-inputs">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
            <span>→</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="filter-section">
          <label>
            Clients ({selectedClients.length})
            <button onClick={handleSelectAllClients} className="select-all-btn">
              {selectedClients.length === availableClients.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
            </button>
          </label>
          <div className="filter-options">
            {availableClients.map(client => (
              <label key={client.nomecliente} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedClients.includes(client.nomecliente)}
                  onChange={() => handleClientToggle(client.nomecliente)}
                />
                {client.nomecliente}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <label>
            SIDs ({selectedSIDs.length > 0 ? selectedSIDs.length : 'Tutti'})
            {availableSIDs.length > 0 && (
              <button onClick={handleSelectAllSIDs} className="select-all-btn">
                {selectedSIDs.length === availableSIDs.length ? 'Deseleziona Tutti' : 'Seleziona Tutti'}
              </button>
            )}
          </label>
          <div className="filter-options">
            {availableSIDs.length === 0 ? (
              <p className="no-data">Seleziona un cliente</p>
            ) : (
              availableSIDs.map(sid => (
                <label key={sid.sid} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedSIDs.includes(sid.sid)}
                    onChange={() => handleSIDToggle(sid.sid)}
                  />
                  {sid.sid} ({sid.nomecliente})
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && <div className="loader">Caricamento dati...</div>}

      {/* Error State */}
      {error && <div className="error-message">{error}</div>}

      {/* KPI Cards */}
      {dashboardData && (
        <>
          <div className="kpi-grid">
            <KPICard
              title="Total Dumps"
              value={dashboardData.kpis.totalDumps.value}
              trend={dashboardData.kpis.totalDumps.trend}
              trendLabel={dashboardData.kpis.totalDumps.trendLabel}
            />
            <KPICard
              title="Failed Backups"
              value={dashboardData.kpis.failedBackups.value}
              trend={dashboardData.kpis.failedBackups.trend}
              trendLabel={dashboardData.kpis.failedBackups.trendLabel}
              status={dashboardData.kpis.failedBackups.value > 0 ? 'Richiede attenzione' : null}
            />
            <KPICard
              title="Cancelled Jobs"
              value={dashboardData.kpis.cancelledJobs.value}
              trend={dashboardData.kpis.cancelledJobs.trend}
              trendLabel={dashboardData.kpis.cancelledJobs.trendLabel}
            />
            <KPICard
              title="Services KO"
              value={dashboardData.kpis.servicesKO.value}
              trend={0}
              trendLabel="N/A"
              status={dashboardData.kpis.servicesKO.value > 0 ? 'Problemi rilevati' : 'Tutti OK'}
            />
          </div>

          {/* Charts */}
          <div className="charts-grid">
            <div className="chart-card">
              <h2>Issues by Client & Type</h2>
              <p className="chart-subtitle">Dump, backup falliti e job cancellati per cliente</p>
              {getIssuesByClientChartData() ? (
                <div className="chart-container">
                  <Bar
                    data={getIssuesByClientChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'top' },
                        title: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>

            <div className="chart-card">
              <h2>Dump Type Distribution</h2>
              <p className="chart-subtitle">Distribuzione dei tipi di dump nel periodo selezionato</p>
              {getDumpTypesChartData() ? (
                <div className="chart-container">
                  <Doughnut
                    data={getDumpTypesChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right' }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
          </div>

          {/* Tabella dettagli dumps per cliente */}
          {dashboardData.charts.issuesByClient && dashboardData.charts.issuesByClient.length > 0 && (
            <div className="details-table">
              <h2>Riepilogo Dettagliato per Cliente</h2>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Dumps</th>
                    <th>Backup Falliti</th>
                    <th>Job Cancellati</th>
                    <th>Totale Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.charts.issuesByClient.map((item, index) => {
                    const total = parseInt(item.dumps || 0) + parseInt(item.failed_backups || 0) + parseInt(item.cancelled_jobs || 0);
                    return (
                      <tr key={index}>
                        <td><strong>{item.nomecliente}</strong></td>
                        <td className={item.dumps > 0 ? 'warning' : ''}>{item.dumps || 0}</td>
                        <td className={item.failed_backups > 0 ? 'error' : ''}>{item.failed_backups || 0}</td>
                        <td className={item.cancelled_jobs > 0 ? 'warning' : ''}>{item.cancelled_jobs || 0}</td>
                        <td><strong>{total}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SAPDashboard;