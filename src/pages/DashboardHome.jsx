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
    totalLessons: 0,      // Células activas
    totalAttendance: 0,    // Líderes activos
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
        
        const debug = {
          leaders: null,
          cells: null,
          error: null
        };

        // ===== 1. MIEMBROS =====
        const membersRes = await apiService.getAllMembers();
        const activeMembers = membersRes?.filter(m => m.isActive === true) || [];
        const activeMembersCount = activeMembers.length;
        const genderMembersCount = activeMembers.filter(m => m.gender === "FEMENINO").length || 0;
        const genderMaleMembersCount = activeMembers.filter(m => m.gender === "MASCULINO").length || 0;

        // ===== 2. INSCRIPCIONES ACTIVAS =====
        const enrollmentsRes = await apiService.getEnrollments();
        const activeEnrollmentsCount = enrollmentsRes?.filter(e => 
          e.status === 'PENDING' || e.status === 'ACTIVE'
        ).length || 0;

        // ===== 3. LÍDERES ACTIVOS =====
        let activeLeadersCount = 0;
        let leadersData = null;
        
        try {
          // Intentar con getActiveLeaders primero (método específico)
          leadersData = await apiService.getActiveLeaders();
          console.log('🔍 getActiveLeaders response:', leadersData);
          
          if (Array.isArray(leadersData)) {
            activeLeadersCount = leadersData.length;
            console.log(`✅ Líderes activos (getActiveLeaders): ${activeLeadersCount}`);
          } else if (leadersData && typeof leadersData === 'object') {
            // Si es un objeto, intentar encontrar el array
            if (leadersData.data && Array.isArray(leadersData.data)) {
              activeLeadersCount = leadersData.data.length;
            } else if (leadersData.leaders && Array.isArray(leadersData.leaders)) {
              activeLeadersCount = leadersData.leaders.length;
            } else if (leadersData.content && Array.isArray(leadersData.content)) {
              activeLeadersCount = leadersData.content.length;
            } else {
              // Intentar contar propiedades
              activeLeadersCount = Object.keys(leadersData).length;
            }
            console.log(`✅ Líderes activos (objeto): ${activeLeadersCount}`);
          }
          
          debug.leaders = {
            method: 'getActiveLeaders',
            data: leadersData,
            count: activeLeadersCount
          };
          
        } catch (leaderError) {
          console.warn('⚠️ Error con getActiveLeaders:', leaderError);
          
          // Fallback: obtener todos los líderes y filtrar
          try {
            const allLeaders = await apiService.getLeaders();
            console.log('🔍 getLeaders response:', allLeaders);
            
            if (Array.isArray(allLeaders)) {
              // Intentar diferentes formas de filtrar activos
              activeLeadersCount = allLeaders.filter(l => {
                // Probar diferentes campos posibles
                return (
                  l.status === 'ACTIVE' || 
                  l.status === 'active' || 
                  l.isActive === true || 
                  l.active === true ||
                  l.estado === 'ACTIVE' ||
                  l.estado === 'activo'
                );
              }).length;
              
              console.log(`✅ Líderes activos después de filtrar: ${activeLeadersCount}`);
              
              // Si no hay filtrados, usar todos
              if (activeLeadersCount === 0 && allLeaders.length > 0) {
                console.warn('⚠️ No se pudo filtrar por estado, usando todos los líderes');
                activeLeadersCount = allLeaders.length;
              }
            }
            
            debug.leaders = {
              method: 'getLeaders (fallback)',
              data: allLeaders,
              count: activeLeadersCount
            };
            
          } catch (altError) {
            console.error('❌ Error también en fallback:', altError);
            debug.error = { leaders: altError.message };
          }
        }

        // ===== 4. CÉLULAS ACTIVAS =====
        let activeCellsCount = 0;
        let cellsData = null;
        
        try {
          // Intentar con getCells primero
          cellsData = await apiService.getCells();
          console.log('🔍 getCells response:', cellsData);
          
          if (Array.isArray(cellsData)) {
            // Mostrar estructura de la primera célula para depuración
            if (cellsData.length > 0) {
              console.log('📋 Estructura de célula ejemplo:', cellsData[0]);
            }
            
            // Filtrar células activas
            activeCellsCount = cellsData.filter(cell => {
              // Probar diferentes campos de estado
              const isActive = (
                cell.status === 'ACTIVE' || 
                cell.status === 'active' || 
                cell.isActive === true || 
                cell.active === true ||
                cell.estado === 'ACTIVE' ||
                cell.estado === 'activo' ||
                cell.cellStatus === 'ACTIVE' ||
                cell.cellStatus === 'active'
              );
              
              if (isActive) {
                console.log('✅ Célula activa encontrada:', cell.name || cell.id);
              }
              
              return isActive;
            }).length;
            
            console.log(`✅ Células activas después de filtrar: ${activeCellsCount}`);
            
            // Si no hay células activas pero hay células, mostrar advertencia
            if (activeCellsCount === 0 && cellsData.length > 0) {
              console.warn('⚠️ Hay células pero ninguna marcada como activa. Estados encontrados:', 
                cellsData.map(c => c.status || c.estado || 'sin estado'));
            }
          }
          
          debug.cells = {
            method: 'getCells',
            total: cellsData?.length || 0,
            active: activeCellsCount,
            sample: cellsData?.[0]
          };
          
        } catch (cellsError) {
          console.warn('⚠️ Error con getCells:', cellsError);
          
          // Fallback: intentar con getCellsByStatus
          try {
            cellsData = await apiService.getCellsByStatus('ACTIVE');
            console.log('🔍 getCellsByStatus response:', cellsData);
            
            if (Array.isArray(cellsData)) {
              activeCellsCount = cellsData.length;
            } else if (cellsData && typeof cellsData === 'object') {
              if (cellsData.data && Array.isArray(cellsData.data)) {
                activeCellsCount = cellsData.data.length;
              } else if (cellsData.cells && Array.isArray(cellsData.cells)) {
                activeCellsCount = cellsData.cells.length;
              }
            }
            
            debug.cells = {
              method: 'getCellsByStatus',
              data: cellsData,
              count: activeCellsCount
            };
            
          } catch (altError) {
            console.error('❌ Error también en fallback:', altError);
            debug.error = { ...debug.error, cells: altError.message };
          }
        }

        // Actualizar estadísticas
        setStats({
          totalMembers: activeMembersCount,
          totalMembersFemale: genderMembersCount,
          totalMembersMale: genderMaleMembersCount,
          totalEnrollments: activeEnrollmentsCount,
          totalLessons: activeCellsCount,      // Células activas
          totalAttendance: activeLeadersCount,  // Líderes activos
        });

        // Resumen en consola
        console.log('📊 ESTADÍSTICAS FINALES:', {
          miembrosActivos: activeMembersCount,
          rocios: genderMembersCount,
          radicales: genderMaleMembersCount,
          procesosActivos: activeEnrollmentsCount,
          celulasActivas: activeCellsCount,
          lideresActivos: activeLeadersCount
        });

      } catch (err) {
        setError("No se pudieron cargar las estadísticas");
        console.error("❌ Error al cargar estadísticas:", err);
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