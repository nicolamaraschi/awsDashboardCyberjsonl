
import React from 'react';
import { NavLink } from 'react-router-dom';


function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h3>Ricerca</h3>
      </div>
      <ul className="report-list">
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
