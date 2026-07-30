import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Camera, Compass, RefreshCw } from 'lucide-react';

export const GeoMapToolbar = React.memo(({
  isFullscreen,
  onToggleFullscreen,
  onZoomIn,
  onZoomOut,
  onResetView,
  onCaptureMap,
  isCapturing
}) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto font-sans">
      {/* Botón de Pantalla Completa */}
      <button
        onClick={onToggleFullscreen}
        className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 text-xs font-bold transition-all hover:scale-105 active:scale-95 focus:ring-2 focus:ring-indigo-500 outline-none"
        aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
        title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ver mapa en pantalla completa'}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4 text-indigo-500" /> : <Maximize2 className="w-4 h-4 text-indigo-500" />}
        <span className="hidden sm:inline">{isFullscreen ? 'Salir' : 'Pantalla Completa'}</span>
      </button>

      {/* Botón Capturar Mapa */}
      <button
        onClick={onCaptureMap}
        disabled={isCapturing}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 py-2 rounded-2xl shadow-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 focus:ring-2 focus:ring-indigo-500 outline-none"
        aria-label="Capturar imagen del mapa"
        title="Descargar imagen PNG de la vista actual"
      >
        {isCapturing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        <span className="hidden sm:inline">{isCapturing ? 'Capturando...' : 'Capturar Mapa'}</span>
      </button>

      {/* Controles de Zoom y Ajuste */}
      <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
        <button
          onClick={onZoomIn}
          className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
          aria-label="Acercar zoom"
          title="Acercar zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
          aria-label="Alejar zoom"
          title="Alejar zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={onResetView}
          className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
          aria-label="Ajustar vista a los marcadores"
          title="Encuadrar todos los marcadores"
        >
          <Compass className="w-4 h-4 text-indigo-500" />
        </button>
      </div>
    </div>
  );
});

GeoMapToolbar.displayName = 'GeoMapToolbar';
