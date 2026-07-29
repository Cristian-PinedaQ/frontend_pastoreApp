import React, { useState, useRef, useMemo } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Componente que muestra un marcador arrastrable (Draggable Marker) en el mapa
 * para definir de manera exacta las coordenadas de una dirección.
 */
export const LocationEditor = ({ entity, type, onSave, onCancel }) => {
  const map = useMap();
  const markerRef = useRef(null);

  // Inicializar la posición en las coordenadas actuales de la entidad o en el centro del mapa
  const initialPosition = useMemo(() => {
    if (entity.latitude && entity.longitude) {
      return [entity.latitude, entity.longitude];
    }
    const center = map.getCenter();
    return [center.lat, center.lng];
  }, [entity, map]);

  const [position, setPosition] = useState(initialPosition);

  // Centrar el mapa al montar el editor de ubicación
  React.useEffect(() => {
    map.setView(initialPosition, 16);
  }, [initialPosition, map]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setPosition([newPos.lat, newPos.lng]);
        }
      },
    }),
    []
  );

  const handleSave = () => {
    onSave(entity.id, {
      latitude: position[0],
      longitude: position[1],
      confidence: 100, // Score máximo para corrección manual humana
    });
  };

  // Marcador estilizado en rojo para indicar modo edición arrastrable
  const dragIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 rounded-full shadow-xl bg-red-600 border-2 border-white ring-4 ring-red-200 animate-bounce">
        <span class="text-white text-xs">📍</span>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  return (
    <>
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={position}
        icon={dragIcon}
        ref={markerRef}
      />
      
      {/* Contenedor flotante superior con controles */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[2000] w-[90%] max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-red-100 p-4 font-sans pointer-events-auto">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">Modo Edición Manual</h4>
            <h3 className="text-sm font-extrabold text-gray-950 mt-0.5">{entity.name}</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
        </div>
        <p className="text-xs text-gray-600 mb-3 leading-relaxed">
          Arrastra el marcador rojo en el mapa para ubicar la dirección exacta. Una vez posicionado, presiona Guardar.
        </p>
        <div className="flex space-x-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            Guardar Coordenadas
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-250 text-gray-700 text-xs font-semibold py-2 px-4 rounded-xl transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
};
