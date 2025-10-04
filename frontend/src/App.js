import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Search from './pages/Search';
import SAPDashboard from './pages/SapDashboard';
import './App.css';

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
            {/* La pagina principale reindirizza alla dashboard SAP */}
            <Route path="/" element={<Navigate to="/sap/dashboard" />} />
            
            {/* Route per la dashboard SAP */}
            <Route path="/sap/dashboard" element={<SAPDashboard />} />
            
            {/* Route per le ricerche CloudConnexa */}
            <Route path="/search/:type" element={<Search />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;