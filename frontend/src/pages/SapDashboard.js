import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API_BASE_URL = 'http://localhost:3001/api';

const CLIENT_SIDS_MAP = {
  "Acciaierie": ["D0B", "P0B", "P0E", "S0E", "T0B", "T0E"],
  "Attiva": ["A4D", "A4P", "A4Q"],
  "Augusta-ratio": ["ARP"],
  "Casoni": ["C4D", "C4P", "C4Q"],
  "Cobo": ["DEV", "PRD", "TST"],
  "Coprob": ["C4D", "C4P", "C4Q", "CBD", "CBP"],
  "Dorigo": ["DD1", "DP1", "DT1"],
  "Fope": ["F4P", "F4Q"],
  "Fusina": ["FSP"],
  "Hipac": ["H4D", "H4P", "H4Q", "HBD", "HBP"],
  "Ilinox-tecninox": ["P01", "P02", "P03", "T01", "T02", "T03"],
  "Italmobiliare": ["IMD", "IMP", "IMT"],
  "Life": ["L4D", "L4P"],
  "Maurelli": ["ECP", "M4D", "M4Q"],
  "Mila": ["MED", "MEP", "MEQ"],
  "MSA": ["M4D", "M4Q", "MSP"],
  "Nital": ["NEP", "NET"],
  "Nobili": ["N4D", "N4P", "N4Q"],
  "Prontopack": ["R4P"],
  "Secondomona": ["M4D", "M4P", "M4Q"],
  "Sesa": ["DEV", "PRD", "TST"],
  "Sisma": ["S4D", "S4P", "S4Q"],
  "Stulz": ["DEV", "PRD", "QAS"],
  "Telwin": ["DR1", "DW1", "PR1", "PW1", "QR1"],
  "UCSC": ["U4D", "U4P", "U4Q"],
  "Vega": ["P02", "S02", "T02"],
  "Vulcangas": ["V4D", "V4P", "V4Q"]
};

const ALL_CLIENT_NAMES = Object.keys(CLIENT_SIDS_MAP);

const SapDashboard = () => {
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2025-10-01');
  const [selectedClients, setSelectedClients] = useState([]);
  const [availableSids, setAvailableSids] = useState([]);
  const [selectedSids, setSelectedSids] = useState([]);
  const [kpis, setKpis] = useState({ totalDumps: 0, failedBackups: 0, cancelledJobs: 0 });
  const [clientIssues, setClientIssues] = useState({ labels: [], datasets: [] });
  const [dumpTypes, setDumpTypes] = useState({ labels: [], datasets: [] });
  const [dumpsByClient, setDumpsByClient] = useState({ labels: [], datasets: [] });
  const [allDumpTypes, setAllDumpTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showSidDropdown, setShowSidDropdown] = useState(false);

  useEffect(() => {
    const sidsForSelectedClients = selectedClients.flatMap(client => CLIENT_SIDS_MAP[client] || []);
    setAvailableSids([...new Set(sidsForSelectedClients)]);
    setSelectedSids([]);
  }, [selectedClients]);

  useEffect(() => {
    // Fetch initial data for everything
    handleApplyFilters(true);
  }, [allDumpTypes]); // Re-run once allDumpTypes are loaded

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setShowClientDropdown(false);
        setShowSidDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAllDumpTypes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/sap/dump-types`);
        setAllDumpTypes(response.data);
      } catch (err) {
        console.error("Error fetching distinct dump types", err);
        setError('Failed to load filter options.');
      }
    };
    fetchAllDumpTypes();
  }, []);

  const handleApplyFilters = async (isInitialLoad = false) => {
    if (isInitialLoad && allDumpTypes.length === 0) {
      // Don't run initial load until dump types are fetched
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/sap/dashboard`, {
        startDate,
        endDate,
        selectedClients,
        selectedSids,
      });
      const { data } = response;

      setKpis(data.kpis);
      setClientIssues(data.clientIssues);
      setDumpTypes(data.dumpTypes);

      // --- New Data Transformation for Dumps by Client ---
      const clientsToDisplay = selectedClients.length > 0 ? selectedClients : [...new Set(data.dumpsByClient.map(d => d.nomecliente))];
      const clientColors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(139, 92, 246, 0.8)',
      ];

      // Create a map for quick lookups, using lowercase client names as keys
      const dataMap = {};
      for (const item of data.dumpsByClient) {
        const clientKey = item.nomecliente.toLowerCase(); // Use lowercase key
        if (!dataMap[clientKey]) {
          dataMap[clientKey] = {};
        }
        dataMap[clientKey][item.short_dump_type] = parseInt(item.dump_count, 10);
      }

      const datasets = clientsToDisplay.map((client, index) => {
        // Use lowercase for lookup, but keep original case for label
        const clientData = dataMap[client.toLowerCase()] || {};
        return {
          label: client, // Keep original case for display
          data: allDumpTypes.map(dumpType => clientData[dumpType] || 0),
          backgroundColor: clientColors[index % clientColors.length],
          borderRadius: 6,
          barThickness: 'flex',
          maxBarThickness: 25
        };
      });

      const dumpsByClientData = {
        labels: allDumpTypes,
        datasets: datasets
      };
      setDumpsByClient(dumpsByClientData);
      // --- End of New Logic ---

    } catch (err) {
      console.error("Error fetching dashboard data", err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (client) => {
    setSelectedClients(prev => 
      prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client]
    );
  };

  const toggleSid = (sid) => {
    setSelectedSids(prev => 
      prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]
    );
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top',
        labels: {
          padding: 15,
          font: { size: 13, weight: '600' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        titleFont: { size: 14, weight: '600' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} issues`;
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { size: 12 } }
      },
      x: { 
        grid: { display: false },
        ticks: { font: { size: 12 } }
      }
    }
  };

  const dumpsByClientChartOptions = {
    ...barChartOptions,
    plugins: {
      ...barChartOptions.plugins,
      tooltip: {
        ...barChartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} dumps`;
          }
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'right',
        labels: {
          padding: 15,
          font: { size: 13, weight: '500' },
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        titleFont: { size: 14, weight: '600' },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} dumps (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoArea}>
            <div style={styles.logo}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#gradient)" />
                <path d="M12 8h8v2h-8V8zm-2 4h12v2H10v-2zm0 4h12v2H10v-2zm2 4h8v2h-8v-2z" fill="white" />
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 style={styles.title}>SAP Monitor</h1>
              <p style={styles.subtitle}>Real-time System Analytics</p>
            </div>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{...styles.filterButton, ...(showFilters ? styles.filterButtonActive : {})}}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 3h14M6 7h8M8 11h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={styles.filtersPanel}>
          <div style={styles.filterGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Date Range</label>
              <div style={styles.dateInputs}>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  style={styles.dateInput}
                />
                <span style={styles.dateSeparator}>→</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </div>

            <div style={styles.filterGroup} className="dropdown-container">
              <label style={styles.label}>Clients ({selectedClients.length})</label>
              <div 
                style={styles.customSelect} 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClientDropdown(!showClientDropdown);
                  setShowSidDropdown(false);
                }}
              >
                <span style={styles.selectText}>
                  {selectedClients.length === 0 ? 'All clients' : `${selectedClients.length} selected`}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={styles.chevron}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              {showClientDropdown && (
                <div style={styles.dropdown}>
                  {ALL_CLIENT_NAMES.map(client => (
                    <div 
                      key={client}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleClient(client);
                      }}
                      style={{...styles.dropdownItem, ...(selectedClients.includes(client) ? styles.dropdownItemSelected : {})}}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedClients.includes(client)}
                        readOnly
                        style={styles.checkbox}
                      />
                      <span>{client}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.filterGroup} className="dropdown-container">
              <label style={styles.label}>SIDs ({selectedSids.length})</label>
              <div 
                style={{...styles.customSelect, ...(availableSids.length === 0 ? styles.customSelectDisabled : {})}}
                onClick={(e) => {
                  if (availableSids.length > 0) {
                    e.stopPropagation();
                    setShowSidDropdown(!showSidDropdown);
                    setShowClientDropdown(false);
                  }
                }}
              >
                <span style={styles.selectText}>
                  {selectedSids.length === 0 ? (availableSids.length === 0 ? 'Select clients first' : 'All SIDs') : `${selectedSids.length} selected`}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={styles.chevron}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              {showSidDropdown && availableSids.length > 0 && (
                <div style={styles.dropdown}>
                  {availableSids.map(sid => (
                    <div 
                      key={sid}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSid(sid);
                      }}
                      style={{...styles.dropdownItem, ...(selectedSids.includes(sid) ? styles.dropdownItemSelected : {})}}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedSids.includes(sid)}
                        readOnly
                        style={styles.checkbox}
                      />
                      <span>{sid}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div style={styles.filterActions}>
            <button 
              onClick={() => {
                setSelectedClients([]);
                setSelectedSids([]);
                setStartDate('2025-09-01');
                setEndDate('2025-10-01');
              }}
              style={styles.clearButton}
            >
              Clear All
            </button>
            <button 
              onClick={() => handleApplyFilters(false)}
              disabled={loading}
              style={{...styles.applyButton, ...(loading ? styles.applyButtonDisabled : {})}}
            >
              {loading ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorBanner}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          {error}
        </div>
      )}

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading analytics...</p>
        </div>
      )}

      {!loading && (
        <>
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                </svg>
              </div>
              <div style={styles.kpiContent}>
                <p style={styles.kpiLabel}>Total Dumps</p>
                <p style={styles.kpiValue}>{kpis.totalDumps.toLocaleString()}</p>
                <div style={styles.kpiBadge}>
                  <span style={styles.kpiBadgeText}>+12% from last month</span>
                </div>
              </div>
            </div>

            <div style={{...styles.kpiCard, ...styles.kpiCardWarning}}>
              <div style={{...styles.kpiIcon, ...styles.kpiIconWarning}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" />
                </svg>
              </div>
              <div style={styles.kpiContent}>
                <p style={styles.kpiLabel}>Failed Backups</p>
                <p style={styles.kpiValue}>{kpis.failedBackups}</p>
                <div style={{...styles.kpiBadge, ...styles.kpiBadgeWarning}}>
                  <span style={styles.kpiBadgeText}>Requires attention</span>
                </div>
              </div>
            </div>

            <div style={{...styles.kpiCard, ...styles.kpiCardDanger}}>
              <div style={{...styles.kpiIcon, ...styles.kpiIconDanger}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </div>
              <div style={styles.kpiContent}>
                <p style={styles.kpiLabel}>Cancelled Jobs</p>
                <p style={styles.kpiValue}>{kpis.cancelledJobs}</p>
                <div style={{...styles.kpiBadge, ...styles.kpiBadgeDanger}}>
                  <span style={styles.kpiBadgeText}>-25% improvement</span>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Issues by Client & Type</h3>
              <p style={styles.chartSubtitle}>Failed backups, cancelled jobs, and timeout errors per client</p>
              <div style={styles.chartWrapper}>
                {clientIssues.labels.length > 0 ? (
                  <Bar data={clientIssues} options={barChartOptions} />
                ) : (
                  <div style={styles.noData}>No data available</div>
                )}
              </div>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Dump Type Distribution</h3>
              <p style={styles.chartSubtitle}>Breakdown of different backup types executed</p>
              <div style={styles.chartWrapper}>
                {dumpTypes.labels.length > 0 ? (
                  <Bar data={dumpTypes} options={barChartOptions} />
                ) : (
                  <div style={styles.noData}>No data available</div>
                )}
              </div>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Dumps by Client</h3>
              <p style={styles.chartSubtitle}>Comparison of dump types across selected clients</p>
              <div style={styles.chartWrapper}>
                {dumpsByClient.labels.length > 0 ? (
                  <Bar data={dumpsByClient} options={dumpsByClientChartOptions} />
                ) : (
                  <div style={styles.noData}>Select clients to see dump data</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logo: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500'
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  filterButtonActive: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    borderColor: 'transparent'
  },
  filtersPanel: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  filterGroup: {
    position: 'relative',
    zIndex: 10
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155'
  },
  dateInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  dateInput: {
    flex: 1,
    minWidth: '120px',
    padding: '12px 14px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#1e293b',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  dateSeparator: {
    color: '#94a3b8',
    fontSize: '16px',
    fontWeight: '600'
  },
  customSelect: {
    padding: '12px 14px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: 'white',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    position: 'relative'
  },
  customSelectDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  selectText: {
    fontSize: '14px',
    color: '#475569',
    fontWeight: '500'
  },
  chevron: {
    color: '#94a3b8',
    transition: 'transform 0.2s ease',
    flexShrink: 0
  },
  dropdown: {
   
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    maxHeight: '250px',
    overflowY: 'auto',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    zIndex: 1000
  },
  dropdownItem: {
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    fontSize: '14px',
    color: '#475569'
  },
  dropdownItemSelected: {
    background: '#f1f5f9',
    color: '#6366f1',
    fontWeight: '600'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#6366f1',
    flexShrink: 0
  },
  filterActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  clearButton: {
    padding: '12px 20px',
    background: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  applyButton: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
  },
  applyButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '2px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '16px',
    padding: '14px 18px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: '500'
  },
  loadingOverlay: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '60px 20px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
  },
  spinner: {
    width: '48px',
    height: '48px',
    margin: '0 auto 20px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#64748b',
    margin: 0
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  kpiCard: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    gap: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    borderLeft: '4px solid #6366f1'
  },
  kpiCardWarning: {
    borderLeft: '4px solid #f59e0b'
  },
  kpiCardDanger: {
    borderLeft: '4px solid #ef4444'
  },
  kpiIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0
  },
  kpiIconWarning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
  },
  kpiIconDanger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  },
  kpiContent: {
    flex: 1,
    minWidth: 0
  },
  kpiLabel: {
    margin: '0 0 6px 0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  kpiValue: {
    margin: '0 0 10px 0',
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 1
  },
  kpiBadge: {
    display: 'inline-flex',
    padding: '5px 10px',
    borderRadius: '8px',
    background: '#dcfce7',
    border: '1px solid #bbf7d0'
  },
  kpiBadgeWarning: {
    background: '#fef3c7',
    border: '1px solid #fde68a'
  },
  kpiBadgeDanger: {
    background: '#fee2e2',
    border: '1px solid #fecaca'
  },
  kpiBadgeText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#166534'
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px'
  },
  chartCard: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
  },
  chartTitle: {
    margin: '0 0 6px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b'
  },
  chartSubtitle: {
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500'
  },
  chartWrapper: {
    height: '320px',
    position: 'relative'
  },
  noData: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
    fontSize: '15px',
    fontWeight: '500'
  },
  '@media (max-width: 768px)': {
    container: {
      padding: '12px'
    },
    header: {
      padding: '16px'
    },
    title: {
      fontSize: '20px'
    },
    kpiGrid: {
      gridTemplateColumns: '1fr'
    },
    chartsGrid: {
      gridTemplateColumns: '1fr'
    },
    chartWrapper: {
      height: '280px'
    }
  }
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    .sap-dashboard-container {
      padding: 12px !important;
    }
    .sap-dashboard-header {
      padding: 16px !important;
    }
    .sap-dashboard-title {
      font-size: 20px !important;
    }
    .sap-dashboard-kpi-grid {
      grid-template-columns: 1fr !important;
    }
    .sap-dashboard-charts-grid {
      grid-template-columns: 1fr !important;
    }
    .sap-dashboard-chart-wrapper {
      height: 280px !important;
    }
  } dei
`;
document.head.appendChild(styleSheet);

export default SapDashboard;