
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Search from './pages/Search';
import SapDashboard from './pages/SapDashboard';
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
            {/* La pagina principale reindirizza alla prima ricerca di default */}
            <Route path="/" element={<Navigate to="/sap-dashboard" />} />
            
            {/* La rotta dinamica gestisce entrambe le pagine di ricerca */}
            <Route path="/search/:type" element={<Search />} />
            <Route path="/sap-dashboard" element={<SapDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
