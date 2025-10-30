import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { useAuth } from '../AuthContext';

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const membersRes = await apiService.getMembers(0, 1);
        const enrollmentsRes = await apiService.getEnrollments(0, 1);

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

  const StatCard = ({ title, value, icon, color }) => (
    <div className={`${color} rounded-lg shadow-lg p-6 text-white`}>
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-8 text-white">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Miembros" value={stats.totalMembers} icon="👥" color="bg-blue-500" />
        <StatCard title="Cohortes" value={stats.totalEnrollments} icon="🗂️" color="bg-green-400" />
        <StatCard title="CBI" value={stats.totalLessons} icon="🏘️" color="bg-purple-500" />
        <StatCard title="Asistencias" value={stats.totalAttendance} icon="✅" color="bg-orange-500" />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/dashboard/members" className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border-l-4 border-blue-500 transition">
            <p className="text-blue-900 font-semibold">📋 Ver Miembros</p>
            <p className="text-blue-700 text-sm">Gestiona todos los miembros</p>
          </a>
          <a href="/dashboard/attendance" className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg border-l-4 border-green-500 transition">
            <p className="text-green-900 font-semibold">✅ Registrar Asistencia</p>
            <p className="text-green-700 text-sm">Marca asistencia del día</p>
          </a>
          <a href="/dashboard/lessons" className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border-l-4 border-purple-500 transition">
            <p className="text-purple-900 font-semibold">📖 Crear Lección</p>
            <p className="text-purple-700 text-sm">Nueva lección para el grupo</p>
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Resumen General</h2>
        <p className="text-gray-600">
          Sistema de gestión pastoral para coordinar actividades, miembros, asistencias y más.
        </p>
      </div>
    </div>
  );
};
