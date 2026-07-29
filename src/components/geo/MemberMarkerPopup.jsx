import React from 'react';
import { Popup } from 'react-leaflet';

/**
 * Popup estilizado para detalles del Miembro en el mapa.
 */
export const MemberMarkerPopup = React.memo(({ member, onEditLocation }) => {
  return (
    <Popup className="custom-popup">
      <div className="p-3 min-w-[200px] text-gray-800 font-sans">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-2 mb-2">
          <span className="text-lg">{member.gender === 'FEMENINO' ? '👩' : '👨'}</span>
          <div>
            <h4 className="font-semibold text-gray-900 leading-tight">{member.name}</h4>
            <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
              ID: {member.id}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-gray-600">
          <p><strong>Dirección:</strong> {member.address}</p>
          <p><strong>Distrito:</strong> <span className="px-1 py-0.5 rounded bg-gray-100 text-[10px] font-semibold">{member.district}</span></p>
          <p><strong>Líder Directo:</strong> {member.leaderName || 'Sin asignar'}</p>
          <p><strong>Líder de Red (12):</strong> {member.networkLeaderName || 'Sin asignar'}</p>
          <p><strong>Pastor:</strong> {member.pastorName || 'Sin asignar'}</p>
        </div>

        {onEditLocation && (
          <button
            onClick={() => onEditLocation(member)}
            className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1"
          >
            <span>📍 Corregir Ubicación</span>
          </button>
        )}
      </div>
    </Popup>
  );
});

MemberMarkerPopup.displayName = 'MemberMarkerPopup';
