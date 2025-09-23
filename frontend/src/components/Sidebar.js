
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
          <NavLink to="/search/by-ip" className={({ isActive }) => isActive ? "active" : ""}>
            Ricerca per IP
          </NavLink>
        </li>
        <li>
          <NavLink to="/search/by-user" className={({ isActive }) => isActive ? "active" : ""}>
            Ricerca per Utente
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Sidebar;
