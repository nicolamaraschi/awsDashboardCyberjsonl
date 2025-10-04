import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h3>Menu</h3>
      </div>
      <ul className="report-list">
        <li>
          <div style={{ 
            padding: '10px 15px', 
            color: '#999', 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: '10px'
          }}>
            SAP Dashboard
          </div>
        </li>
        <li>
          <NavLink to="/sap/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
            Dashboard Principale
          </NavLink>
        </li>
        <li>
          <div style={{ 
            padding: '10px 15px', 
            color: '#999', 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginTop: '20px'
          }}>
            CloudConnexa
          </div>
        </li>
        <li>
          <NavLink to="/search/flow-established" className={({ isActive }) => isActive ? "active" : ""}>
            Estrazione Flussi
          </NavLink>
        </li>
        <li>
          <NavLink to="/search/domain-blocked" className={({ isActive }) => isActive ? "active" : ""}>
            Analisi Domini Bloccati
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Sidebar;