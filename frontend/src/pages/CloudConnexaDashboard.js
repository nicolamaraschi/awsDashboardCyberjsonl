import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  const dashboardRef = useRef(null);

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
      
      const response = await axios.post(`${API_URL}/api/cloudconnexa/dashboard`, filters);
      setDashboardData(response.data);
      
      console.log('Dati ricevuti dal backend:', response.data);
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

  const getSessionsTimelineData = () => {
    if (!dashboardData?.charts?.sessionsTimeline) return null;
    
    const allDates = generateDateRange(dateRange.startDate, dateRange.endDate);
    const data = dashboardData.charts.sessionsTimeline;
    const dataMap = {};
    
    data.forEach(item => {
      dataMap[item.date] = {
        session_count: parseInt(item.session_count || 0),
        unique_users: parseInt(item.unique_users || 0)
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
          fill: true
        },
        { 
          label: 'Utenti Unici', 
          data: users, 
          borderColor: 'rgba(75, 192, 192, 1)', 
          backgroundColor: 'rgba(75, 192, 192, 0.1)', 
          tension: 0.3, 
          fill: true
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
        blocked_count: parseInt(item.blocked_count || 0)
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

  const getBlockedAccessAttemptsData = () => {
    if (!dashboardData?.charts?.blockedAccessAttempts) return null;
    const data = dashboardData.charts.blockedAccessAttempts;
    
    return {
      labels: data.map(item => `${item.blocked_destination}:${item.destination_port}`),
      datasets: [{
        label: 'Tentativi Bloccati',
        data: data.map(item => parseInt(item.blocked_attempts || 0)),
        backgroundColor: 'rgba(220, 53, 69, 0.7)'
      }, {
        label: 'Utenti Coinvolti',
        data: data.map(item => parseInt(item.affected_users || 0)),
        backgroundColor: 'rgba(255, 193, 7, 0.7)'
      }]
    };
  };

  const getNonStandardPortsData = () => {
    if (!dashboardData?.charts?.nonStandardPorts) return null;
    const data = dashboardData.charts.nonStandardPorts.slice(0, 10);
    
    const colors = [
      'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)', 'rgba(83, 102, 255, 0.8)', 'rgba(255, 102, 178, 0.8)',
      'rgba(102, 255, 178, 0.8)'
    ];
    
    return {
      labels: data.map(item => `Porta ${item.port} (${item.protocol})`),
      datasets: [{
        data: data.map(item => parseInt(item.connection_count || 0)),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)'
      }]
    };
  };

  // NUOVA FUNZIONE: Grafico connessioni attive per cliente
  const getActiveConnectionsByCustomerData = () => {
    if (!dashboardData?.charts?.activeConnectionsByCustomer) return null;
    const data = dashboardData.charts.activeConnectionsByCustomer;
    
    return {
      labels: data.map(item => item.customer || 'Unknown'),
      datasets: [{
        label: 'Connessioni Attive',
        data: data.map(item => parseInt(item.active_connections || 0)),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2
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

  const handleExport = async (exportType) => {
    const dashboard = dashboardRef.current;
    if (!dashboard) return;

    // Temporarily remove the export buttons from the capture
    const exportButtons = dashboard.querySelector('.export-buttons');
    if (exportButtons) {
      exportButtons.style.display = 'none';
    }

    const canvas = await html2canvas(dashboard, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // To handle images from other origins
      logging: true,
      width: dashboard.scrollWidth,
      height: dashboard.scrollHeight,
      windowWidth: dashboard.scrollWidth,
      windowHeight: dashboard.scrollHeight,
    });

    // Restore the export buttons
    if (exportButtons) {
      exportButtons.style.display = 'block';
    }

    const generatePdf = () => {
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'px',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = imgWidth / pdfWidth;
      const scaledImgHeight = imgHeight / ratio;

      let position = 0;
      let page = 1;

      while (position < scaledImgHeight) {
        if (page > 1) {
          pdf.addPage();
        }

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = pdfHeight * ratio;

        const pageContext = pageCanvas.getContext('2d');
        pageContext.drawImage(
          canvas,
          0,
          position * ratio,
          imgWidth,
          pdfHeight * ratio,
          0,
          0,
          imgWidth,
          pdfHeight * ratio
        );

        const pageImgData = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        position += pdfHeight;
        page++;
      }
      return pdf;
    };

    if (exportType === 'pdf') {
      const pdf = generatePdf();
      pdf.save(`cloudconnexa-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (exportType === 'email') {
      const pdf = generatePdf();
      pdf.save(`cloudconnexa-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);

      const subject = `CloudConnexa Dashboard Report - ${new Date().toISOString().split('T')[0]}`;
      const body = `The CloudConnexa Dashboard PDF report has been downloaded to your computer (usually in the 'Downloads' folder).\n\nPlease attach the file to this email before sending.\n\nGenerated on: ${new Date().toLocaleString()}`;
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
    }
  };

  return (
    <div className="cloudconnexa-dashboard" ref={dashboardRef}>
      <div className="dashboard-header">
        <h1>Dashboard CloudConnexa - Network Security & Performance</h1>
        <div className="export-buttons">
          <button onClick={() => handleExport('pdf')} className="export-btn">
            Download PDF
          </button>
          <button onClick={() => handleExport('email')} className="export-btn">
            Send Email
          </button>
        </div>
      </div>
      
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
            {availableUsers.map(user => (
              <label key={user.parententityname} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={selectedUsers.includes(user.parententityname)} 
                  onChange={() => handleUserToggle(user.parententityname)} 
                />
                {user.parententityname}
              </label>
            ))}
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
      
      {loading ? (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>Caricamento dati...</p>
        </div>
      ) : null}
      {error && <div className="error-message">{error}</div>}
      
      {!dashboardData ? (
        <div className="no-data">Nessun dato disponibile per i filtri selezionati.</div>
      ) : (
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
              <h2>Andamento Sessioni e Utenti</h2>
              <p className="chart-subtitle">Trend di connessioni e utenti attivi nel periodo</p>
              {getSessionsTimelineData() ? (
                <div className="chart-container-timeline">
                  <Line data={getSessionsTimelineData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card full-width">
              <h2>Timeline Eventi di Sicurezza</h2>
              <p className="chart-subtitle">Domini bloccati nel tempo</p>
              {getSecurityTimelineData() ? (
                <div className="chart-container-timeline">
                  <Line data={getSecurityTimelineData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>Top 10 Utenti per Traffico</h2>
              <p className="chart-subtitle">Maggiori consumatori di banda</p>
              {getTopUsersData() ? (
                <div className="chart-container">
                  <Bar data={getTopUsersData()} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true, beginAtZero: true }, y: { stacked: true } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>Categorie Domini Bloccati</h2>
              <p className="chart-subtitle">Tipologie di minacce rilevate</p>
              {getBlockedByCategoryData() ? (
                <div className="chart-container">
                  <Doughnut data={getBlockedByCategoryData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>Distribuzione Gateway</h2>
              <p className="chart-subtitle">Regioni di connessione</p>
              {getGatewayDistributionData() ? (
                <div className="chart-container">
                  <Bar data={getGatewayDistributionData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>Protocolli Utilizzati</h2>
              <p className="chart-subtitle">Mix di traffico per protocollo</p>
              {getProtocolDistributionData() ? (
                <div className="chart-container">
                  <Doughnut data={getProtocolDistributionData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card full-width">
              <h2>Motivi di Disconnessione</h2>
              <p className="chart-subtitle">Analisi problemi di rete</p>
              {getDisconnectReasonsData() ? (
                <div className="chart-container">
                  <Bar data={getDisconnectReasonsData()} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>Tentativi di Accesso Bloccati</h2>
              <p className="chart-subtitle">Destinazioni con accessi negati</p>
              {getBlockedAccessAttemptsData() ? (
                <div className="chart-container">
                  <Bar data={getBlockedAccessAttemptsData()} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { position: 'top' } }, scales: { x: { beginAtZero: true } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun accesso bloccato</div>
              )}
            </div>
            
            <div className="chart-card">
              <h2>Porte Non Standard</h2>
              <p className="chart-subtitle">Connessioni a porte sospette (Top 10)</p>
              {getNonStandardPortsData() ? (
                <div className="chart-container">
                  <Doughnut data={getNonStandardPortsData()} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                </div>
              ) : (
                <div className="no-data">Nessun dato disponibile</div>
              )}
            </div>

            {/* NUOVO GRAFICO: Connessioni Attive per Cliente */}
            <div className="chart-card">
              <h2>🏢 Connessioni Attive per Cliente</h2>
              <p className="chart-subtitle">Utenti unici connessi per cliente (ultime 24 ore)</p>
              {getActiveConnectionsByCustomerData() ? (
                <div className="chart-container">
                  <Bar 
                    data={getActiveConnectionsByCustomerData()} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      plugins: { 
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.parsed.x} connessioni attive`;
                            }
                          }
                        }
                      }, 
                      scales: { 
                        x: { 
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Numero di Connessioni Attive'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Cliente'
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
          </div>
          
          {dashboardData.charts.topDestinations && dashboardData.charts.topDestinations.length > 0 && (
            <div className="details-table">
              <h2>Top 15 Destinazioni Accedute</h2>
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
          
          {dashboardData && dashboardData.charts && dashboardData.charts.asymmetricTraffic && Array.isArray(dashboardData.charts.asymmetricTraffic) && dashboardData.charts.asymmetricTraffic.length > 0 ? (
            <div className="details-table">
              <h2>Traffico Asimmetrico Anomalo</h2>
              <p className="chart-subtitle" style={{ marginBottom: '1rem' }}>
                Utenti con upload maggiore del download (possibile esfiltrazione dati)
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Utente</th>
                    <th>Sessioni</th>
                    <th>Download (GB)</th>
                    <th>Upload (GB)</th>
                    <th>Ratio Upload/Download</th>
                    <th>Rischio</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.charts.asymmetricTraffic.map((item, index) => {
                    const ratio = parseFloat(item.upload_download_ratio || 0);
                    const riskLevel = ratio > 10 ? 'ALTO' : ratio > 5 ? 'MEDIO' : 'BASSO';
                    const riskColor = ratio > 10 ? '#dc3545' : ratio > 5 ? '#ffc107' : '#28a745';
                    
                    return (
                      <tr key={`asymmetric-${index}`}>
                        <td style={{ minWidth: '250px' }}>
                          <strong style={{ color: '#333', fontSize: '14px' }}>
                            {item.username}
                          </strong>
                        </td>
                        <td style={{ color: '#333' }}>{item.sessions}</td>
                        <td style={{ color: '#333' }}>{item.download_gb}</td>
                        <td style={{ color: '#dc3545', fontWeight: 'bold' }}>
                          {item.upload_gb}
                        </td>
                        <td style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>
                          {ratio.toFixed(1)}:1
                        </td>
                        <td>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '0.3rem 0.8rem',
                              backgroundColor: riskColor,
                              color: 'white',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '0.85rem'
                            }}
                          >
                            {riskLevel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* NUOVA TABELLA: Dettaglio Connessioni Attive per Cliente */}
          {dashboardData?.charts?.activeConnectionsByCustomer && 
           dashboardData.charts.activeConnectionsByCustomer.length > 0 && (
            <div className="details-table">
              <h2>📊 Dettaglio Connessioni Attive per Cliente</h2>
              <p className="chart-subtitle" style={{ marginBottom: '1rem' }}>
                Snapshot delle connessioni attive nelle ultime 24 ore
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Connessioni Attive</th>
                    <th>Ultimo Aggiornamento</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.charts.activeConnectionsByCustomer.map((item, index) => {
                    const connections = parseInt(item.active_connections || 0);
                    const lastUpdate = new Date(item.last_update);
                    const minutesSinceUpdate = Math.floor((new Date() - lastUpdate) / 60000);
                    
                    // Determina lo stato basato sul numero di connessioni
                    let statusColor, statusText;
                    if (connections === 0) {
                      statusColor = '#dc3545';
                      statusText = 'Nessuna connessione';
                    } else if (connections <= 2) {
                      statusColor = '#ffc107';
                      statusText = 'Basse connessioni';
                    } else if (connections <= 5) {
                      statusColor = '#28a745';
                      statusText = 'Normale';
                    } else {
                      statusColor = '#17a2b8';
                      statusText = 'Alto traffico';
                    }
                    
                    return (
                      <tr key={`active-conn-${index}`}>
                        <td>
                          <strong style={{ color: '#333', fontSize: '14px' }}>
                            {item.customer === 'Cliente Sconosciuto' ? (
                              <span style={{ color: '#999', fontStyle: 'italic' }}>
                                {item.customer}
                              </span>
                            ) : (
                              item.customer
                            )}
                          </strong>
                        </td>
                        <td style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold', 
                          color: statusColor 
                        }}>
                          {connections}
                        </td>
                        <td style={{ color: '#666' }}>
                          {lastUpdate.toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                          <br/>
                          <small style={{ color: '#999' }}>
                            ({minutesSinceUpdate} minuti fa)
                          </small>
                        </td>
                        <td>
                          <span 
                            style={{ 
                              display: 'inline-block',
                              padding: '0.3rem 0.8rem',
                              backgroundColor: statusColor,
                              color: 'white',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '0.85rem'
                            }}
                          >
                            {statusText}
                          </span>
                        </td>
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

export default CloudConnexaDashboard;