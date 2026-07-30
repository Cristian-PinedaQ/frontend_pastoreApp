import React from 'react';
import { useGeoStats } from '../../hooks/useGeoStats';

/**
 * Widget de estadísticas generales de geocodificación adaptado a tema Claro/Oscuro.
 */
export const GeoStats = React.memo(() => {
  const { data: stats, isLoading, error } = useGeoStats();

  if (isLoading) {
    return (
      <div className="flex space-x-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-2.5 shadow-sm border border-slate-100 dark:border-slate-800 w-28 h-10" />
        ))}
      </div>
    );
  }

  if (error) return null;

  const totalMembers = stats?.totalMembers || 0;
  const geocodedMembers = stats?.geocodedMembers || 0;
  const totalCells = stats?.totalCells || 0;
  const geocodedCells = stats?.geocodedCells || 0;

  return (
    <div className="hidden lg:flex items-center gap-2 z-[1000] font-sans">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl px-3.5 py-1.5 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center space-x-2.5">
        <span className="text-base">👥</span>
        <div>
          <p className="text-[9px] uppercase font-black tracking-wider text-slate-400 leading-none">Miembros Geo</p>
          <h3 className="text-xs font-black text-indigo-600 dark:text-indigo-400 leading-tight">
            {geocodedMembers} / {totalMembers}
          </h3>
        </div>
      </div>

      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl px-3.5 py-1.5 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center space-x-2.5">
        <span className="text-base">⛪</span>
        <div>
          <p className="text-[9px] uppercase font-black tracking-wider text-slate-400 leading-none">Altares Geo</p>
          <h3 className="text-xs font-black text-purple-600 dark:text-purple-400 leading-tight">
            {geocodedCells} / {totalCells}
          </h3>
        </div>
      </div>
    </div>
  );
});

GeoStats.displayName = 'GeoStats';
