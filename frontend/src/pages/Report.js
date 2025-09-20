
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

  if (loading) return <p>Caricamento report...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!data || data.length === 0) return <p>Nessun dato disponibile per questo report.</p>;

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
