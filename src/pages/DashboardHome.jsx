import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { useAuth } from '../context/AuthContext';

export const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalEnrollments: 0,
    totalLeaders: 0,
    totalCbi: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const membersRes = await apiService.getMembers(0, 1);
        const enrollmentsRes = await apiService.getEnrollmentsCard(0, 1);

        const totalMembers = membersRes?.totalElements || 0;
        const totalEnrollments = enrollmentsRes?.totalElements || 0;

        setStats({
          totalMembers,
          totalEnrollments,
          totalLessons: 0,
          totalAttendance: 0,
        });
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ✅ Tarjeta de estadísticas con gradientes StudentsPage
  const StatCard = ({ title, value, icon, gradient }) => (
    <div className={`${gradient} rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-all duration-300 hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{loading ? '-' : value}</p>
        </div>
        <div className="text-5xl opacity-30">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ========== HEADER CON GRADIENTE PRIMARY (StudentsPage) ========== */}
      <div className="dashboard-header rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold">Bienvenido, {user?.username?.split(' ')[0]}! 👋</h1>
        <p className="text-blue-100 mt-2">
          Rol: {user?.roles?.map(r => r.username || r).join(', ')}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* ========== STAT CARDS CON GRADIENTES STUDIENTSPAGE ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Miembros" 
          value={stats.totalMembers} 
          icon="👥" 
          gradient="stat-card-primary"
        />
        <StatCard 
          title="Cohortes" 
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

      {/* ========== ACCESOS RÁPIDOS CON COLORES COORDINADOS ========== */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Acceso 1 - Primary Blue */}
          <a href="/dashboard/members" className="quick-access-primary group">
            <p className="text-blue-900 font-semibold group-hover:text-blue-700">📋 Ver Miembros</p>
            <p className="text-blue-700 text-sm group-hover:text-blue-600">Gestiona todos los miembros</p>
          </a>

          {/* Acceso 2 - Export Cyan */}
          <a href="/dashboard/attendance" className="quick-access-export group">
            <p className="text-cyan-900 font-semibold group-hover:text-cyan-700">✅ Registrar Asistencia</p>
            <p className="text-cyan-700 text-sm group-hover:text-cyan-600">Marca asistencia del día</p>
          </a>

          {/* Acceso 3 - Secondary Rosa */}
          <a href="/dashboard/lessons" className="quick-access-secondary group">
            <p className="text-pink-900 font-semibold group-hover:text-pink-700">📖 Crear Lección</p>
            <p className="text-pink-700 text-sm group-hover:text-pink-600">Nueva lección para el grupo</p>
          </a>
        </div>
      </div>

      {/* ========== RESUMEN GENERAL ========== */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Resumen General</h2>
        <p className="text-gray-600">
          Sistema de gestión pastoral para coordinar actividades, miembros, asistencias y más.
        </p>
      </div>
    </div>
  );
};