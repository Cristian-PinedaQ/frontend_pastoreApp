import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { useAuth } from '../context/AuthContext';

/**
 * 📊 DashboardHome - Panel Principal
 * 
 * ℹ️ VERSIÓN OPTIMIZADA PARA PRODUCCIÓN:
 * - Todos los console.log están comentados para mejor rendimiento
 * - Si necesitas debuggear, busca las líneas con "// 🔧 DEBUG" y descomenta
 * - Los filtros funcionan correctamente:
 *   • Miembros: isActive === true
 *   • Cohortes: status === 'PENDING' || status === 'ACTIVE'
 * - Dark mode completamente soportado
 */

export const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
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

        // ✅ OBTENER MIEMBROS ACTIVOS
        const membersRes = await apiService.getAllMembers();
        // 🔧 DEBUG (descomentar solo en desarrollo):
        // console.log("📊 Todos los miembros:", membersRes);
        
        // ✅ Filtrar solo miembros ACTIVOS (isActive = true)
        const activeMembersCount = Array.isArray(membersRes)
          ? membersRes.filter(member => member.isActive === true).length
          : 0;
        
        // 🔧 DEBUG (descomentar solo en desarrollo):
        // console.log("✅ Miembros activos (isActive=true):", activeMembersCount);

        // ✅ OBTENER COHORTES PENDIENTES/EN CURSO O ACTIVAS
        const enrollmentsRes = await apiService.getEnrollments();
        // 🔧 DEBUG (descomentar solo en desarrollo):
        // console.log("📊 Todas las cohortes:", enrollmentsRes);
        // console.log("🔴 Valores de status en todas las cohortes:");
        // enrollmentsRes?.forEach((e, i) => console.log(`   Cohorte ${i}: ${e.cohortName} = status: ${e.status}`));
        
        // ✅ Filtrar cohortes PENDIENTES o ACTIVAS (en curso)
        // Status posibles: PENDING, ACTIVE, COMPLETED, CANCELLED, etc.
        const activeEnrollmentsCount = Array.isArray(enrollmentsRes)
          ? enrollmentsRes.filter(enrollment => 
              enrollment.status === 'PENDING' || enrollment.status === 'ACTIVE'
            ).length
          : 0;
        
        // 🔧 DEBUG (descomentar solo en desarrollo):
        // console.log("✅ Cohortes pendientes/activas (status=PENDING o ACTIVE):", activeEnrollmentsCount);

        setStats({
          totalMembers: activeMembersCount,
          totalEnrollments: activeEnrollmentsCount,
          totalLessons: 0,
          totalAttendance: 0,
        });
      } catch (err) {
        // 🔧 DEBUG (descomentar solo en desarrollo):
        // console.error('❌ Error al cargar estadísticas:', err);
        setError('No se pudieron cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ✅ Tarjeta de estadísticas con gradientes
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

  // ========== THEME COLORS ==========
  const theme = {
    bg: isDarkMode ? '#0f172a' : '#f9fafb',
    bgSecondary: isDarkMode ? '#1e293b' : '#ffffff',
    text: isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border: isDarkMode ? '#334155' : '#e5e7eb',
    errorBg: isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorBorder: '#ef4444',
    errorText: isDarkMode ? '#fecaca' : '#991b1b',
    infoBg: isDarkMode ? '#0c4a6e' : '#f0f9ff',
    infoBorder: '#0284c7',
    infoText: isDarkMode ? '#86efac' : '#065f46',
  };

  return (
    <div className="dashboard-page" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <div className="page-container">
        {/* ========== HEADER ========== */}
        <div className="page-header">
          <h1>📊 Panel Principal</h1>
          <p>Bienvenido, {user?.username?.split(' ')[0]}! 👋</p>
        </div>

        {error && (
          <div
            className="alert alert-danger"
            role="alert"
            style={{
              backgroundColor: theme.errorBg,
              borderColor: theme.errorBorder,
              color: theme.errorText,
            }}
          >
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* ========== STAT CARDS ========== */}
        <div className="stats-grid">
          <StatCard 
            title="Miembros Activos" 
            value={stats.totalMembers} 
            icon="👥" 
            gradient="stat-card-primary"
          />
          <StatCard 
            title="Cohortes Activas" 
            value={stats.totalEnrollments} 
            icon="🗂️" 
            gradient="stat-card-export"
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
        </div>

        {/* ========== ACCESOS RÁPIDOS ========== */}
        <div className="quick-access-section" style={{ backgroundColor: theme.bgSecondary }}>
          <h2 style={{ color: theme.text }}>🚀 Accesos Rápidos</h2>
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

        {/* ========== RESUMEN GENERAL ========== */}
        <div className="summary-section" style={{ backgroundColor: theme.bgSecondary }}>
          <h2 style={{ color: theme.text }}>📝 Resumen General</h2>
          <p className="summary-text">
            Sistema de gestión pastoral para coordinar actividades, miembros, asistencias y más.
          </p>
          <div
            className="role-info"
            style={{
              backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
              color: theme.text,
            }}
          >
            <strong>Tu Rol:</strong> {user?.roles?.map(r => r.username || r).join(', ')}
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-page {
          width: 100%;
          min-height: 100vh;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 32px;
          font-weight: bold;
          margin: 0 0 8px 0;
          transition: color 0.3s ease;
        }

        .page-header p {
          font-size: 16px;
          margin: 0;
          transition: color 0.3s ease;
          color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        }

        .alert {
          padding: 12px 16px;
          margin-bottom: 24px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .alert-danger {
          background-color: ${theme.errorBg};
          border-color: ${theme.errorBorder};
          color: ${theme.errorText};
        }

        .alert strong {
          font-weight: 600;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          border-radius: 12px;
          padding: 24px;
          box-shadow: ${isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
          transition: all 0.3s ease;
          cursor: default;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: ${isDarkMode ? '0 8px 16px rgba(0, 0, 0, 0.4)' : '0 8px 16px rgba(0, 0, 0, 0.15)'};
        }

        .stat-card.stat-card-primary {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          color: white;
        }

        .stat-card.stat-card-export {
          background: linear-gradient(135deg, #06b6d4 0%, #0369a1 100%);
          color: white;
        }

        .stat-card.stat-card-secondary {
          background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
          color: white;
        }

        .stat-card.stat-card-danger {
          background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%);
          color: white;
        }

        .stat-card-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .stat-card-info {
          flex: 1;
        }

        .stat-card-title {
          font-size: 14px;
          opacity: 0.9;
          margin: 0;
          font-weight: 500;
        }

        .stat-card-value {
          font-size: 36px;
          font-weight: bold;
          margin: 12px 0 0 0;
          line-height: 1;
        }

        .stat-card-icon {
          font-size: 48px;
          opacity: 0.2;
          text-align: right;
        }

        .quick-access-section {
          border-radius: 12px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow: ${isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
          transition: all 0.3s ease;
        }

        .quick-access-section h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 20px 0;
        }

        .quick-access-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .quick-access-card {
          padding: 20px 16px;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
        }

        .quick-access-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .quick-access-card.quick-access-primary {
          background-color: ${isDarkMode ? '#0c2d54' : '#eff6ff'};
          border-color: ${isDarkMode ? '#3b82f6' : '#93c5fd'};
        }

        .quick-access-card.quick-access-primary:hover {
          background-color: ${isDarkMode ? '#1e3a8a' : '#dbeafe'};
          border-color: ${isDarkMode ? '#60a5fa' : '#2563eb'};
        }

        .quick-access-card.quick-access-export {
          background-color: ${isDarkMode ? '#0c3d4d' : '#ecf8ff'};
          border-color: ${isDarkMode ? '#22d3ee' : '#7dd3fc'};
        }

        .quick-access-card.quick-access-export:hover {
          background-color: ${isDarkMode ? '#0f5f78' : '#cff9ff'};
          border-color: ${isDarkMode ? '#06b6d4' : '#06b6d4'};
        }

        .quick-access-card.quick-access-secondary {
          background-color: ${isDarkMode ? '#500724' : '#fdf2f8'};
          border-color: ${isDarkMode ? '#ec4899' : '#fbcfe8'};
        }

        .quick-access-card.quick-access-secondary:hover {
          background-color: ${isDarkMode ? '#711c4e' : '#fce7f3'};
          border-color: ${isDarkMode ? '#f472b6' : '#ec4899'};
        }

        .qa-icon {
          font-size: 32px;
        }

        .qa-title {
          font-weight: 600;
          margin: 4px 0 0 0;
          font-size: 15px;
          transition: color 0.3s ease;
          color: ${isDarkMode ? '#f3f4f6' : '#1f2937'};
        }

        .qa-description {
          font-size: 13px;
          margin: 0;
          transition: color 0.3s ease;
          color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        }

        .summary-section {
          border-radius: 12px;
          padding: 28px;
          box-shadow: ${isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
          transition: all 0.3s ease;
        }

        .summary-section h2 {
          font-size: 20px;
          font-weight: bold;
          margin: 0 0 16px 0;
          transition: color 0.3s ease;
        }

        .summary-text {
          font-size: 15px;
          line-height: 1.6;
          margin: 0 0 16px 0;
          transition: color 0.3s ease;
          color: ${isDarkMode ? '#d1d5db' : '#6b7280'};
        }

        .role-info {
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 14px;
          border-left: 4px solid #2563eb;
          transition: all 0.3s ease;
        }

        .role-info strong {
          font-weight: 600;
          color: ${isDarkMode ? '#f3f4f6' : '#1f2937'};
        }

        @media (max-width: 768px) {
          .page-container {
            padding: 16px;
          }

          .page-header h1 {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .quick-access-grid {
            grid-template-columns: 1fr;
          }

          .stat-card-value {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};