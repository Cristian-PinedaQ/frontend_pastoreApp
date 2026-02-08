import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { useAuth } from '../context/AuthContext';
import "../css/DashboardHome.css";
import logoDora from '../assets/LOGO_PNG_DORADO.avif';

export const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMembersFemale: 0,
    totalMembersMale: 0,
    totalEnrollments: 0,
    totalLessons: 0,
    totalAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ========== DARK MODE DETECTION ==========
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode') || 
                             document.documentElement.classList.contains('dark');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    const observer = new MutationObserver(() => {
      setIsDarkMode(
        document.documentElement.classList.contains('dark-mode') ||
        document.documentElement.classList.contains('dark')
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const membersRes = await apiService.getAllMembers();
        const activeMembersCount = membersRes?.filter(m => m.isActive === true).length || 0;
        const genderMembersCount = membersRes?.filter(m => m.gender === "FEMENINO" && m.isActive).length || 0;
        const genderMaleMembersCount = membersRes?.filter(m => m.gender === "MASCULINO" && m.isActive).length || 0;

        const enrollmentsRes = await apiService.getEnrollments();
        const activeEnrollmentsCount = enrollmentsRes?.filter(e => 
          e.status === 'PENDING' || e.status === 'ACTIVE'
        ).length || 0;

        setStats({
          totalMembers: activeMembersCount,
          totalMembersFemale: genderMembersCount,
          totalMembersMale: genderMaleMembersCount,
          totalEnrollments: activeEnrollmentsCount,
          totalLessons: 0,
          totalAttendance: 0,
        });
      } catch (err) {
        setError("No se pudieron cargar las estadísticas");
        console.error("Error al cargar estadísticas:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, gradient }) => (
    <div className={`stat-card ${gradient}`}>
      <div className="stat-card-content">
        <div className="stat-card-info">
          <p className="stat-card-title">{title}</p>
          <p className="stat-card-value">{loading ? '-' : value}</p>
        </div>
        <div className="stat-card-icon">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="page-container">
        <div className="page-header">
          <div className="logo-container">
            <img
              src={logoDora}
              alt="PastoreApp Logo"
              className={`dashboard-logo ${isDarkMode ? 'dark' : 'light'}`}
            />
          </div>
          <div className="header-content">
            <h1 className="dashboard-title">Panel Principal</h1>
            <p className="dashboard-welcome">
              Bienvenido, {user?.username?.split(" ")[0] || 'Usuario'}! 👋
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        <div className="stats-grid">
          <StatCard 
            title="Membresia Activa" 
            value={stats.totalMembers} 
            icon="👥" 
            gradient="stat-card-primary" 
          />
          <StatCard 
            title="ROCIOS DE VIDA" 
            value={stats.totalMembersFemale} 
            icon="💝" 
            gradient="stat-card-rocios" 
          />
          <StatCard 
            title="RADICALES" 
            value={stats.totalMembersMale} 
            icon="⚔️" 
            gradient="stat-card-radicales" 
          />
          <StatCard 
            title="CBI" 
            value={stats.totalLessons} 
            icon="🏘️" 
            gradient="stat-card-secondary" 
          />
          <StatCard 
            title="LIDERAZGO" 
            value={stats.totalAttendance} 
            icon="🦺" 
            gradient="stat-card-danger" 
          />
          <StatCard 
            title="PROCESOS ACTIVOS" 
            value={stats.totalEnrollments} 
            icon="🗂️" 
            gradient="stat-card-export" 
          />
        </div>

        <div className="quick-access-section">
          <h2>🚀 Accesos Rápidos</h2>

          <div className="quick-access-grid">
            <a href="/dashboard/members" className="quick-access-card quick-access-primary">
              <div className="qa-icon">📋</div>
              <p className="qa-title">Ver Miembros</p>
              <p className="qa-description">Gestiona todos los miembros</p>
            </a>

            <a href="/dashboard/attendance" className="quick-access-card quick-access-export">
              <div className="qa-icon">✅</div>
              <p className="qa-title">Registrar Asistencia</p>
              <p className="qa-description">Marca asistencia del día</p>
            </a>

            <a href="/dashboard/lessons" className="quick-access-card quick-access-secondary">
              <div className="qa-icon">📖</div>
              <p className="qa-title">Crear Lección</p>
              <p className="qa-description">Nueva lección para el grupo</p>
            </a>
          </div>
        </div>

        <div className="summary-section">
          <h2>📝 Resumen General</h2>
          <p className="summary-text">
            Sistema de gestión pastoral para coordinar actividades, miembros, asistencias y más.
          </p>

          <div className="role-info">
            <strong>Tu Rol:</strong> {user?.roles?.map(r => r.username || r).join(', ') || 'Usuario'}
          </div>
        </div>
      </div>
    </div>
  );
};