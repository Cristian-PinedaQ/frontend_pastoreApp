// ============================================
// DashboardTopbar.jsx
// Topbar del dashboard con logos responsive
// ============================================

import React from 'react';
import logoDora from '../assets/Pastoreapp_blanco.png';
import '../css/Dashboardtopbar.css';

const DashboardTopbar = ({ user }) => {
  return (
    <div className="dashboard-topbar">
      {/* Logo - Solo visible en resoluciones mayores a 768px */}
      <div className="dashboard-topbar__logo-wrapper">
        {/* Logo Dorado - Light Mode */}
        <img
          src={logoDora}
          alt="Raiz de David Logo"
          className="dashboard-topbar__logo dashboard-topbar__logo--dorado"
        />
        
        {/* Logo Negro - Dark Mode */}
        <img
          src={logoDora}
          alt="Raiz de David Logo"
          className="dashboard-topbar__logo dashboard-topbar__logo--negro"
        />
      </div>

      {/* Título - Siempre visible */}
      <h2 className="dashboard-layout__topbar-title">
        {user?.name || 'Iglesia Raiz de David'}
      </h2>
    </div>
  );
};

export default DashboardTopbar;