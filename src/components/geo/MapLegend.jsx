import React from 'react';

/**
 * Leyenda flotante explicativa de marcadores y distritos con soporte para modo oscuro.
 */
export const MapLegend = React.memo(() => {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-slate-200/80 dark:border-slate-800 min-w-[200px] pointer-events-auto font-sans text-slate-800 dark:text-slate-100 transition-colors">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
        Leyenda del Mapa
      </h4>

      <div className="space-y-3">
        {/* Entidades Especiales */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Entidades Principales</p>
          <div className="flex items-center text-xs text-slate-700 dark:text-slate-200 gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-[8px] text-slate-900 font-bold shadow-sm">👑</span>
            <span className="font-semibold">Líder Registrado</span>
          </div>
          <div className="flex items-center text-xs text-slate-700 dark:text-slate-200 gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-indigo-700 to-purple-600 flex items-center justify-center text-[8px] text-white font-bold shadow-sm">⛪</span>
            <span className="font-semibold">Altar / Célula</span>
          </div>
        </div>

        {/* Miembros por Distrito */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Miembros por Distrito</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"></span>
              <span>Pastores</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0"></span>
              <span>Distrito 1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
              <span>Distrito 2</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0"></span>
              <span>Distrito 3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

MapLegend.displayName = 'MapLegend';
