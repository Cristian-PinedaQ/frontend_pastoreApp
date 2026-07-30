import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useTheme } from '../../hooks/useTheme';

/**
 * Componente interno que expone la instancia de Leaflet Map hacia las funciones controladoras.
 */
function MapController({ mapRef, isFullscreen }) {
  const map = useMap();

  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  // Re-calcular dimensiones de Leaflet cuando cambia el tamaño o el modo pantalla completa
  useEffect(() => {
    if (map) {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [map, isFullscreen]);

  return null;
}

/**
 * Componente de Mapa Interactivo con soporte para tema Claro/Oscuro y captura confiable.
 */
export const InteractiveMap = React.memo(({
  children,
  mapRef,
  isFullscreen,
  center = [3.4516, -76.5320], // Cali, Colombia por defecto
  zoom = 13
}) => {
  const { isDark } = useTheme();

  // URLs de baldosas según el tema activo
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-inner border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full z-0 font-sans"
        zoomControl={false} // Desactivado para usar nuestra botonera estilizada propia
        doubleClickZoom={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
          crossOrigin="anonymous"
          maxZoom={19}
        />

        <MapController mapRef={mapRef} isFullscreen={isFullscreen} />

        {children}
      </MapContainer>
    </div>
  );
});

InteractiveMap.displayName = 'InteractiveMap';
