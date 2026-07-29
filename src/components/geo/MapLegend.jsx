import React from 'react';

/**
 * Leyenda flotante explicativa de colores e iconos en el mapa.
 */
export const MapLegend = React.memo(() => {
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-md border border-gray-100 min-w-[180px] pointer-events-auto font-sans">
      <h4 className="text-xs font-bold text-gray-800 border-b border-gray-100 pb-1.5 mb-2">Leyenda del Mapa</h4>
      
      <div className="space-y-2">
        {/* Distritos de miembros */}
        <div className="space-y-1">
          <p className="text-[9px] uppercase font-bold text-gray-400">Miembros por Distrito</p>
          <div className="flex items-center text-xs text-gray-600 space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>Pastores</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
            <span>Distrito 1</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Distrito 2</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
            <span>Distrito 3</span>
          </div>
        </div>

        {/* Tipos */}
        <div className="space-y-1 pt-1 border-t border-gray-50">
          <p className="text-[9px] uppercase font-bold text-gray-400">Iconografía</p>
          <div className="flex items-center text-xs text-gray-600 space-x-2">
            <span>👨 / 👩</span>
            <span>Miembro (Hombre / Mujer)</span>
          </div>
          <div className="flex items-center text-xs text-gray-600 space-x-2">
            <span>🏠</span>
            <span>Grupo Celular</span>
          </div>
        </div>
      </div>
    </div>
  );
});

MapLegend.displayName = 'MapLegend';
