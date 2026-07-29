import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';

/**
 * Escucha cambios en el mapa (paneo, zoom) y los reporta para el cargado progresivo.
 */
function MapEventHandler({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        onBoundsChange({
          northEastLat: bounds.getNorthEast().lat,
          northEastLng: bounds.getNorthEast().lng,
          southWestLat: bounds.getSouthWest().lat,
          southWestLng: bounds.getSouthWest().lng,
          zoom: map.getZoom(),
        });
      }
    },
  });

  // Reportar limites iniciales una vez montado
  useEffect(() => {
    if (onBoundsChange && map) {
      const bounds = map.getBounds();
      onBoundsChange({
        northEastLat: bounds.getNorthEast().lat,
        northEastLng: bounds.getNorthEast().lng,
        southWestLat: bounds.getSouthWest().lat,
        southWestLng: bounds.getSouthWest().lng,
        zoom: map.getZoom(),
      });
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/**
 * Componente de Mapa Base.
 * Cali, Colombia como centro por defecto ([3.4516, -76.5320])
 */
export const InteractiveMap = React.memo(({ children, onBoundsChange, center = [3.4516, -76.5320], zoom = 13 }) => {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner border border-gray-100">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {onBoundsChange && <MapEventHandler onBoundsChange={onBoundsChange} />}

        {children}
      </MapContainer>
    </div>
  );
});

InteractiveMap.displayName = 'InteractiveMap';
