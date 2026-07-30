import React from 'react';
import { Popup } from 'react-leaflet';
import { Eye, MapPin } from 'lucide-react';

export const CellMarkerPopup = React.memo(({ cell, onSelectEntity, onEditLocation }) => {
  return (
    <Popup className="custom-popup">
      <div className="p-3 min-w-[200px] text-slate-800 dark:text-slate-100 font-sans">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🏠</span>
            <h4 className="font-extrabold text-slate-900 dark:text-white leading-tight">{cell.name}</h4>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            {cell.district || 'Altar'}
          </span>
        </div>

        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 mb-3">
          <p className="line-clamp-2"><strong>Dirección:</strong> {cell.meetingAddress}</p>
          <p><strong>Líder:</strong> {cell.mainLeaderName || 'Sin asignar'}</p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {onSelectEntity && (
            <button
              onClick={() => onSelectEntity(cell, 'CELL_GROUP')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1"
            >
              <Eye className="w-3 h-3" />
              <span>Ficha</span>
            </button>
          )}

          {onEditLocation && (
            <button
              onClick={() => onEditLocation(cell, 'CELL_GROUP')}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold py-1.5 px-2 rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>
    </Popup>
  );
});

CellMarkerPopup.displayName = 'CellMarkerPopup';
