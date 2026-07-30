import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Check, X } from 'lucide-react';

export const LocationEditor = ({ entity, type, onSave, onCancel }) => {
  const map = useMap();
  const markerRef = useRef(null);

  const initialPosition = useMemo(() => {
    if (entity.latitude && entity.longitude) {
      return [entity.latitude, entity.longitude];
    }
    const center = map.getCenter();
    return [center.lat, center.lng];
  }, [entity, map]);

  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
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
      confidence: 100,
    });
  };

  const dragIcon = L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl shadow-2xl bg-rose-600 border-2 border-white ring-4 ring-rose-400/50 animate-bounce">
        <span class="text-white text-base">📍</span>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
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

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[2000] w-[90%] max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/50 p-4 font-sans text-slate-800 dark:text-slate-100 pointer-events-auto">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Edición Manual de Ubicación</h4>
              <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">{entity.name}</h3>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
          Arrastra el marcador rojo sobre el punto exacto en el mapa y presiona guardar.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-rose-500 outline-none"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Coordenadas</span>
          </button>
          <button
            onClick={onCancel}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 px-3 rounded-xl transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
};
