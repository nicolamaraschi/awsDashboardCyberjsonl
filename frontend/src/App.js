import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Search from './pages/Search';
import SAPDashboard from './pages/SapDashboard';
import CloudConnexaDashboard from './pages/CloudConnexaDashboard';
import './App.css';

import { withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // default Amplify UI styling

function App({ signOut, user }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Router>
      <div className={`App-container ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
        <Sidebar signOut={signOut} />
        <main className="main-content">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            ☰
          </button>
          <Routes>
            {/* La pagina principale reindirizza alla dashboard SAP */}
            <Route path="/" element={<Navigate to="/sap/dashboard" />} />
            
            {/* Route per la dashboard SAP */}
            <Route path="/sap/dashboard" element={<SAPDashboard />} />
            
            {/* Route per la dashboard CloudConnexa */}
            <Route path="/cloudconnexa/dashboard" element={<CloudConnexaDashboard />} />
            
            {/* Route per le ricerche CloudConnexa */}
            <Route path="/search/:type" element={<Search />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default withAuthenticator(App);