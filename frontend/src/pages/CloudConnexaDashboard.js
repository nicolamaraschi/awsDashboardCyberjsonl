import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { API_URL } from '../config';
import './CloudConnexaDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

const CloudConnexaDashboard = () => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableGateways, setAvailableGateways] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedGateways, setSelectedGateways] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateDateRange = (rangeType) => {
    const today = new Date();
    let startDate;

    switch(rangeType) {
      case '1d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        break;
      case '7d':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case '1m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6m':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 6);
        break;
      case 'custom':
        return null;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const handleTimeRangeChange = (e) => {
    const rangeType = e.target.value;
    setSelectedTimeRange(rangeType);
    
    if (rangeType !== 'custom') {
      const newRange = calculateDateRange(rangeType);
      if (newRange) {
        setDateRange(newRange);
      }
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    loadAvailableFilters();
  }, []);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsers, selectedGateways, dateRange]);

  const loadAvailableFilters = async () => {
    try {
      const [usersRes, gatewaysRes] = await Promise.all([
        axios.get(`${API_URL}/api/cloudconnexa/users`),
        axios.get(`${API_URL}/api/cloudconnexa/gateways`)
      ]);
      setAvailableUsers(usersRes.data);
      setAvailableGateways(gatewaysRes.data);
    } catch (err) {
      console.error('Errore nel caricamento dei filtri:', err);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        users: selectedUsers,
        gateways: selectedGateways
      };
      
      console.log('📊 Invio filtri CloudConnexa:', filters);
      
      const response = await axios.post(`${API_URL}/api/cloudconnexa/dashboard`, filters);
      setDashboardData(response.data);
    } catch (err) {
      setError('Errore nel caricamento dei dati. Verifica la connessione al backend.');
      console.error('Errore dashboard CloudConnexa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (user) => {
    setSelectedUsers(prev => 
      prev.includes(user) ? prev.filter(u => u !== user) : [...prev, user]
    );
  };

  const handleGatewayToggle = (gateway) => {
    setSelectedGateways(prev => 
      prev.includes(gateway) ? prev.filter(g => g !== gateway) : [...prev, gateway]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === availableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(availableUsers.map(u => u.parententityname));
    }
  };

  const handleSelectAllGateways = () => {
    if (selectedGateways.length === availableGateways.length) {
      setSelectedGateways([]);
    } else {
      setSelectedGateways(availableGateways.map(g => g.gateway));
    }
  };

  // ========== CHART DATA FUNCTIONS ==========

  const getSessionsTimelineData = () => {
    if (!dashboardData?.charts?.sessionsTimeline) return null;
    
    const allDates = generateDateRange(dateRange.startDate, dateRange.endDate);
    const data = dashboardData.charts.sessionsTimeline;
    const dataMap = {};
    
    data.forEach(item => {
      dataMap[item.date] = {
        session_count: parseInt(item.session_count || 0),
        unique_users: parseInt(item.unique_users || 0),
        bytes_in_gb: parseFloat(item.bytes_in_gb || 0),
        bytes_out_gb: parseFloat(item.bytes_out_gb || 0)
      };
    });
    
    const labels = allDates.map(date => {
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    
    const sessions = allDates.map(date => dataMap[date]?.session_count || 0);
    const users = allDates.map(date => dataMap[date]?.unique_users || 0);
    
    return {
      labels,
      datasets: [
        { 
          label: 'Sessioni Totali', 
          data: sessions, 
          borderColor: 'rgba(54, 162, 235, 1)', 
          backgroundColor: 'rgba(54, 162, 235, 0.1)', 
          tension: 0.3, 
          fill: true,
          yAxisID: 'y'
        },
        { 
          label: 'Utenti Unici', 
          data: users, 
          borderColor: 'rgba(75, 192, 192, 1)', 
          backgroundColor: 'rgba(75, 192, 192, 0.1)', 
          tension: 0.3, 
          fill: true,
          yAxisID: 'y'
        }
      ]
    };
  };

  const getTopUsersData = () => {
    if (!dashboardData?.charts?.topUsers) return null;
    const data = dashboardData.charts.topUsers;
    
    return {
      labels: data.map(u => u.username),
      datasets: [
        { 
          label: 'Download (GB)', 
          data: data.map(u => parseFloat(u.total_in_gb || 0)), 
          backgroundColor: 'rgba(54, 162, 235, 0.7)' 
        },
        { 
          label: 'Upload (GB)', 
          data: data.map(u => parseFloat(u.total_out_gb || 0)), 
          backgroundColor: 'rgba(255, 99, 132, 0.7)' 
        }
      ]
    };
  };

  const getBlockedByCategoryData = () => {
    if (!dashboardData?.charts?.blockedByCategory) return null;
    const data = dashboardData.charts.blockedByCategory.slice(0, 10);
    
    const colors = [
      'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)', 'rgba(83, 102, 255, 0.8)', 'rgba(255, 102, 178, 0.8)',
      'rgba(102, 255, 178, 0.8)'
    ];
    
    return {
      labels: data.map(c => c.category || 'Unknown'),
      datasets: [{
        data: data.map(c => parseInt(c.count || 0)),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)'
      }]
    };
  };

  const getGatewayDistributionData = () => {
    if (!dashboardData?.charts?.gatewayDistribution) return null;
    const data = dashboardData.charts.gatewayDistribution;
    
    return {
      labels: data.map(g => g.gateway_region || 'Unknown'),
      datasets: [
        { 
          label: 'Sessioni', 
          data: data.map(g => parseInt(g.session_count || 0)), 
          backgroundColor: 'rgba(153, 102, 255, 0.7)' 
        },
        { 
          label: 'Utenti Unici', 
          data: data.map(g => parseInt(g.unique_users || 0)), 
          backgroundColor: 'rgba(75, 192, 192, 0.7)' 
        }
      ]
    };
  };

  const getDisconnectReasonsData = () => {
    if (!dashboardData?.charts?.disconnectReasons) return null;
    const data = dashboardData.charts.disconnectReasons.slice(0, 8);
    
    const colors = [
      'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)', 'rgba(83, 102, 255, 0.8)'
    ];
    
    return {
      labels: data.map(r => {
        const reason = r.reason || 'Unknown';
        return reason.length > 40 ? reason.substring(0, 37) + '...' : reason;
      }),
      datasets: [{
        data: data.map(r => parseInt(r.count || 0)),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)'
      }]
    };
  };

  const getProtocolDistributionData = () => {
    if (!dashboardData?.charts?.protocolDistribution) return null;
    const data = dashboardData.charts.protocolDistribution;
    
    const colors = [
      'rgba(54, 162, 235, 0.8)', 'rgba(255, 99, 132, 0.8)', 'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)'
    ];
    
    return {
      labels: data.map(p => p.protocol || 'Unknown'),
      datasets: [{
        data: data.map(p => parseInt(p.count || 0)),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)'
      }]
    };
  };

  const getSecurityTimelineData = () => {
    if (!dashboardData?.charts?.securityTimeline) return null;
    
    const allDates = generateDateRange(dateRange.startDate, dateRange.endDate);
    const data = dashboardData.charts.securityTimeline;
    const dataMap = {};
    
    data.forEach(item => {
      dataMap[item.date] = {
        blocked_count: parseInt(item.blocked_count || 0),
        unique_domains: parseInt(item.unique_domains || 0)
      };
    });
    
    const labels = allDates.map(date => {
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    
    const blocked = allDates.map(date => dataMap[date]?.blocked_count || 0);
    
    return {
      labels,
      datasets: [{
        label: 'Domini Bloccati',
        data: blocked,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.3,
        fill: true
      }]
    };
  };

  const KPICard = ({ title, value, subtitle, trend, trendLabel, status, icon }) => {
    const getTrendIcon = () => {
      if (trend > 0) return '↑';
      if (trend < 0) return '↓';
      return '→';
    };
    const getTrendColor = () => {
      if (title.includes('Bloccati')) {
        if (trend < 0) return '#28a745';
        if (trend > 0) return '#dc3545';
      } else {
        if (trend > 0) return '#28a745';
        if (trend < 0) return '#dc3545';
      }
      return '#666';
    };
    return (
      <div className="kpi-card">
        <div className="kpi-header">
          <h3>{title}</h3>
          {icon && <span className="kpi-icon">{icon}</span>}
        </div>
        <div className="kpi-value">{value}</div>
        {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
        {trend !== undefined && trend !== 0 && (
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
    <div className="cloudconnexa-dashboard">
      <h1>🛡️ Dashboard CloudConnexa - Network Security & Performance</h1>
      
      <div className="filters-container">
        <div className="filter-section">
          <label>Periodo Temporale</label>
          <select value={selectedTimeRange} onChange={handleTimeRangeChange} className="time-range-select">
            <option value="1d">Ultimo Giorno</option>
            <option value="7d">Ultimi 7 Giorni</option>
            <option value="1m">Ultimo Mese</option>
            <option value="3m">Ultimi 3 Mesi</option>
            <option value="6m">Ultimi 6 Mesi</option>
            <option value="custom">Personalizzato</option>
          </select>
        </div>
        
        {selectedTimeRange === 'custom' && (
          <div className="filter-section">
            <label>Date Personalizzate</label>
            <div className="date-inputs">
              <input 
                type="date" 
                value={dateRange.startDate} 
                onChange={(e) => handleDateChange('startDate', e.target.value)} 
              />
              <span>→</span>
              <input 
                type="date" 
                value={dateRange.endDate} 
                onChange={(e) => handleDateChange('endDate', e.target.value)} 
              />
            </div>
          </div>
        )}
        
        <div className="filter-section">
          <label>
            Utenti ({selectedUsers.length > 0 ? selectedUsers.length : 'Tutti'})
            {availableUsers.length > 0 && (
              <button onClick={handleSelectAllUsers} className="select-all-btn">
                {selectedUsers.length === availableUsers.length ? 'Deseleziona' : 'Seleziona Tutti'}
              </button>
            )}
          </label>
          <div className="filter-options">
            {availableUsers.slice(0, 50).map(user => (
              <label key={user.parententityname} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={selectedUsers.includes(user.parententityname)} 
                  onChange={() => handleUserToggle(user.parententityname)} 
                />
                {user.parententityname}
              </label>
            ))}
            {availableUsers.length > 50 && (
              <p className="filter-note">Mostrando 50 di {availableUsers.length} utenti</p>
            )}
          </div>
        </div>
        
        <div className="filter-section">
          <label>
            Gateway ({selectedGateways.length > 0 ? selectedGateways.length : 'Tutti'})
            {availableGateways.length > 0 && (
              <button onClick={handleSelectAllGateways} className="select-all-btn">
                {selectedGateways.length === availableGateways.length ? 'Deseleziona' : 'Seleziona Tutti'}
              </button>
            )}
          </label>
          <div className="filter-options">
            {availableGateways.map(gw => (
              <label key={gw.gateway} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={selectedGateways.includes(gw.gateway)} 
                  onChange={() => handleGatewayToggle(gw.gateway)} 
                />
                {gw.gateway}
              </label>
            ))}
          </div>
        </div>
      </div>
      
      {loading && <div className="loader">Caricamento dati...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {dashboardData && (
        <>
          <div className="kpi-grid">
            <KPICard 
              title="Sessioni Totali" 
              value={dashboardData.kpis.totalSessions.value.toLocaleString()}
              icon="🔌"
              trend={dashboardData.kpis.totalSessions.trend} 
              trendLabel={dashboardData.kpis.totalSessions.trendLabel}
            />
            <KPICard 
              title="Utenti Attivi" 
              value={dashboardData.kpis.uniqueUsers.value.toLocaleString()}
              icon="👥"
              trend={dashboardData.kpis.uniqueUsers.trend} 
              trendLabel={dashboardData.kpis.uniqueUsers.trendLabel}
            />
            <KPICard 
              title="Domini Bloccati" 
              value={dashboardData.kpis.blockedDomains.value.toLocaleString()}
              subtitle={`${dashboardData.kpis.blockedDomains.uniqueDomains} domini unici • ${dashboardData.kpis.blockedDomains.affectedUsers} utenti coinvolti`}
              icon="🛡️"
              trend={dashboardData.kpis.blockedDomains.trend} 
              trendLabel={dashboardData.kpis.blockedDomains.trendLabel}
              status={dashboardData.kpis.blockedDomains.value > 0 ? 'Minacce rilevate' : 'Sistema sicuro'}
            />
            <KPICard 
              title="Traffico Totale" 
              value={`${dashboardData.kpis.totalTraffic.value} GB`}
              subtitle={`↓ ${dashboardData.kpis.totalTraffic.bytesIn} GB • ↑ ${dashboardData.kpis.totalTraffic.bytesOut} GB`}
              icon="📊"
              trend={dashboardData.kpis.totalTraffic.trend} 
              trendLabel={dashboardData.kpis.totalTraffic.trendLabel}
            />
            <KPICard 
              title="Durata Media Sessione" 
              value={`${dashboardData.kpis.avgSessionDuration.value} min`}
              subtitle={`${dashboardData.kpis.avgSessionDuration.seconds} secondi`}
              icon="⏱️"
            />
            <KPICard 
              title="Disconnessioni Anomale" 
              value={`${dashboardData.kpis.disconnectRate.value}%`}
              subtitle={`${dashboardData.kpis.disconnectRate.anomalousCount} su ${dashboardData.kpis.disconnectRate.totalCount} sessioni`}
              icon="⚠️"
              status={dashboardData.kpis.disconnectRate.value > 5 ? 'Attenzione richiesta' : 'Nella norma'}
            />
          </div>
          
          <div className="charts-grid">
            <div className="chart-card full-width">
              <h2>📈 Andamento Sessioni e Utenti</h2>
              <p className="chart-subtitle">Trend di connessioni e utenti attivi nel periodo</p>
              {getSessionsTimelineData() ? (
                <div className="chart-container-timeline">
                  <Line 
                    data={getSessionsTimelineData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      interaction: { mode: 'index', intersect: false },
                      plugins: { 
                        legend: { position: 'top' },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          beginAtZero: true,
                          title: { display: true, text: 'Count' }
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card full-width">
              <h2>🚨 Timeline Eventi di Sicurezza</h2>
              <p className="chart-subtitle">Domini bloccati nel tempo</p>
              {getSecurityTimelineData() ? (
                <div className="chart-container-timeline">
                  <Line 
                    data={getSecurityTimelineData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top' } },
                      scales: { 
                        y: { beginAtZero: true, title: { display: true, text: 'Domini Bloccati' } }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>🏆 Top 10 Utenti per Traffico</h2>
              <p className="chart-subtitle">Maggiori consumatori di banda</p>
              {getTopUsersData() ? (
                <div className="chart-container">
                  <Bar 
                    data={getTopUsersData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { 
                        legend: { position: 'top' },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.x.toFixed(2)} GB`;
                            }
                          }
                        }
                      },
                      scales: { 
                        x: { 
                          stacked: true, 
                          beginAtZero: true,
                          title: { display: true, text: 'Traffico (GB)' }
                        },
                        y: { stacked: true }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>🛡️ Categorie Domini Bloccati</h2>
              <p className="chart-subtitle">Tipologie di minacce rilevate</p>
              {getBlockedByCategoryData() ? (
                <div className="chart-container">
                  <Doughnut 
                    data={getBlockedByCategoryData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { 
                        legend: { 
                          position: 'right',
                          labels: { boxWidth: 15, padding: 8, font: { size: 11 } }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>🌍 Distribuzione Gateway</h2>
              <p className="chart-subtitle">Regioni di connessione</p>
              {getGatewayDistributionData() ? (
                <div className="chart-container">
                  <Bar 
                    data={getGatewayDistributionData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top' } },
                      scales: { y: { beginAtZero: true } }
                    }} 
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>🔌 Protocolli Utilizzati</h2>
              <p className="chart-subtitle">Mix di traffico per protocollo</p>
              {getProtocolDistributionData() ? (
                <div className="chart-container">
                  <Doughnut 
                    data={getProtocolDistributionData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { 
                        legend: { position: 'bottom' },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card full-width">
              <h2>❌ Motivi di Disconnessione</h2>
              <p className="chart-subtitle">Analisi problemi di rete</p>
              {getDisconnectReasonsData() ? (
                <div className="chart-container">
                  <Bar 
                    data={getDisconnectReasonsData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { 
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            title: function(context) {
                              const fullReason = dashboardData.charts.disconnectReasons[context[0].dataIndex]?.reason || '';
                              return fullReason;
                            }
                          }
                        }
                      },
                      scales: { 
                        x: { beginAtZero: true, title: { display: true, text: 'Numero di Occorrenze' } }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
          </div>
          
          {dashboardData.charts.topDestinations && dashboardData.charts.topDestinations.length > 0 && (
            <div className="details-table">
              <h2>🎯 Top 15 Destinazioni Accedute</h2>
              <table>
                <thead>
                  <tr>
                    <th>IP Destinazione</th>
                    <th>Porta</th>
                    <th>Protocollo</th>
                    <th>Connessioni</th>
                    <th>Utenti Unici</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.charts.topDestinations.map((item, index) => (
                    <tr key={index}>
                      <td><code>{item.destination_ip}</code></td>
                      <td>{item.destination_port}</td>
                      <td><span className="protocol-badge">{item.protocol || 'N/A'}</span></td>
                      <td><strong>{parseInt(item.connection_count).toLocaleString()}</strong></td>
                      <td>{parseInt(item.unique_users).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CloudConnexaDashboard;