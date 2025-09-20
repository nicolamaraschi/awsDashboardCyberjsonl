import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Search from './pages/Search'; // <-- Importo la nuova pagina
import './App.css';

// Registra i componenti di Chart.js
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
ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend
);

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
            <Route path="/search/:type" element={<Search />} /> {/* <-- Aggiungo la nuova rotta */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;