
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import { API_URL } from '../config';
import { reports } from '../components/Sidebar';

const getChartConfig = (reportId, data) => {
  if (!data || data.length === 0) return null;

  let chartType = 'bar';
  let labels, values, label;

  switch (reportId) {
    case 'allowed-vs-blocked-summary':
      chartType = 'pie';
      labels = data.map(d => d.stato_connessione);
      values = data.map(d => d.totale);
      break;
    case 'top-users-blocked':
      labels = data.map(d => d.initiator);
      values = data.map(d => d.numero_connessioni_bloccate);
      label = 'Connessioni Bloccate';
      break;
    case 'hourly-blocked-analysis':
      labels = data.map(d => `${d.ora_del_giorno}:00`);
      values = data.map(d => d.totale_connessioni_bloccate);
      label = 'Connessioni Bloccate per Ora';
      break;
    default:
      const keys = Object.keys(data[0]);
      labels = data.map(d => d[keys[0]]);
      values = data.map(d => d[keys[1]]);
      label = keys[1];
      break;
  }

  return {
    chartType,
    chartData: {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: chartType === 'pie'
          ? ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)']
          : 'rgba(54, 162, 235, 0.6)',
      }]
    }
  };
};

const ReportTable = ({ data }) => (
  <div className="table-container">
    <table>
      <thead>
        <tr>{Object.keys(data[0]).map(key => <th key={key}>{key}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row, i) => <tr key={i}>{Object.values(row).map((val, j) => <td key={j}>{val}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

function Report() {
  const { reportId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reportName = reports[`/reports/${reportId}`]?.name || 'Report Dettagliato';

  useEffect(() => {
    const fetchData = async () => {
      setData(null);
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/api/reports/${reportId}`);
        setData(response.data);
      } catch (err) {
        setError('Impossibile caricare il report.');
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [reportId]);

  if (loading) return <div className="loader"></div>;
  if (error) return <p className="error">{error}</p>;
  if (!data || data.length === 0) return (
    <div className="no-data-message">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h-1.5a3.375 3.375 0 01-3.375-3.375V9.75m3.75 9.75h-3.75V9.75m3.75 9.75a1.125 1.125 0 01-1.125 1.125H3.375a3.375 3.375 0 01-3.375-3.375V11.25m18.75-4.5v2.25m18.75-4.5v2.25m-18.75 0h.008v.008h-.008V7.125zm0 0h.008v.008h-.008V7.125zm0 0h.008v.008h-.008V7.125zM12 6v.008H12.008V6H12z" />
      </svg>
      <p>Nessun dato disponibile per questo report.</p>
    </div>
  );

  const chartConfig = getChartConfig(reportId, data);

  return (
    <div className="report-view">
      <h1>{reportName}</h1>
      {chartConfig && (
        <div className="chart-container">
          {chartConfig.chartType === 'pie' 
            ? <Pie data={chartConfig.chartData} options={{ responsive: true, maintainAspectRatio: false }} />
            : <Bar data={chartConfig.chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          }
        </div>
      )}
      <ReportTable data={data} />
    </div>
  );
}

export default Report;
