import React from 'react';
import { NavLink } from 'react-router-dom';
import StatusIndicator from './StatusIndicator'; // <-- Importo l'indicatore

// Definiamo qui tutti i report per generare il menu
export const reports = {
  '/': { name: 'Dashboard Principale' },
  '/reports/detailed-blocked-traffic': { name: '1. Report Dettagliato Bloccati' },
  '/reports/top-users-blocked': { name: '2. Top Utenti Bloccati' },
  '/reports/top-services-blocked': { name: '3. Top Servizi Bloccati' },
  '/reports/unusual-ports-blocked': { name: '4. Porte Insolite Bloccate' },
  '/reports/allowed-vs-blocked-summary': { name: '5. Riepilogo Consentite/Bloccate' },
  '/reports/top-active-users': { name: '6. Top Utenti Attivi' },
  '/reports/top-used-services': { name: '7. Top Servizi Utilizzati' },
  '/search/user': { name: '8. Cerca Attività per Utente' },
  '/search/ip': { name: '9. Cerca Attività per IP' },
  '/reports/hourly-blocked-analysis': { name: '11. Analisi Oraria Bloccati' },
};

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h3>Report List</h3>
      </div>
      <ul className="report-list">
        {Object.entries(reports).map(([path, { name }]) => (
          <li key={path}>
            <NavLink to={path} className={({ isActive }) => isActive ? "active" : ""}>
              {name}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <StatusIndicator />
      </div>
    </nav>
  );
}

export default Sidebar;