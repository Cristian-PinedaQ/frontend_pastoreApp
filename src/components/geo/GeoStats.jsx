import React from 'react';
import { useGeoStats } from '../../hooks/useGeoStats';

/**
 * Widget superior que muestra estadísticas del proceso de geocodificación.
 */
export const GeoStats = React.memo(() => {
  const { data: stats, isLoading, error } = useGeoStats();

  if (isLoading) {
    return (
      <div className="flex space-x-2 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/80 backdrop-blur-md rounded-xl p-3 shadow-sm border border-gray-100 w-28 h-12" />
        ))}
      </div>
    );
  }

  if (error) return null;

  const totalMembers = stats?.totalMembers || 0;
  const totalCells = stats?.totalCells || 0;

  return (
    <div className="flex flex-wrap gap-3 z-[1000] pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-md border border-gray-100 flex items-center space-x-3">
        <span className="text-xl">👥</span>
        <div>
          <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Miembros Totales</p>
          <h3 className="text-lg font-extrabold text-gray-800 leading-tight">{totalMembers}</h3>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-md border border-gray-100 flex items-center space-x-3">
        <span className="text-xl">🏠</span>
        <div>
          <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Células Totales</p>
          <h3 className="text-lg font-extrabold text-gray-800 leading-tight">{totalCells}</h3>
        </div>
      </div>
    </div>
  );
});

GeoStats.displayName = 'GeoStats';
