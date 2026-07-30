import React from 'react';
import { Popup } from 'react-leaflet';

/**
 * Popup estilizado para detalles del Grupo Celular en el mapa.
 */
export const CellMarkerPopup = React.memo(({ cell, onEditLocation }) => {
  const isComplete = cell.status === 'ACTIVE';

  return (
    <Popup className="custom-popup">
      <div className="p-3 min-w-[220px] text-gray-800 font-sans">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🏠</span>
            <h4 className="font-semibold text-gray-900 leading-tight">{cell.name}</h4>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            isComplete ? 'bg-emerald-500 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {cell.status}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-gray-600">
          <p><strong>Dirección:</strong> {cell.meetingAddress}</p>
          {cell.city && <p><strong>Ciudad:</strong> {cell.city}</p>}
          <p><strong>Día:</strong> {cell.meetingDay || 'Sin asignar'}</p>
          <p><strong>Líder de Red:</strong> {cell.mainLeaderName}</p>
          <p><strong>Líder de Grupo:</strong> {cell.groupLeaderName}</p>
          <p><strong>Anfitrión:</strong> {cell.hostName}</p>
          <p><strong>Timoteo:</strong> {cell.timoteoName}</p>
        </div>

        {onEditLocation && (
          <button
            onClick={() => onEditLocation(cell)}
            className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1"
          >
            <span>📍 Corregir Ubicación</span>
          </button>
        )}
      </div>
    </Popup>
  );
});

CellMarkerPopup.displayName = 'CellMarkerPopup';
