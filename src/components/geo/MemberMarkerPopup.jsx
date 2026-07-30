import React from 'react';
import { Popup } from 'react-leaflet';
import { Eye, Edit, MapPin } from 'lucide-react';

export const MemberMarkerPopup = React.memo(({ member, onSelectEntity, onEditLocation }) => {
  return (
    <Popup className="custom-popup">
      <div className="p-3 min-w-[200px] text-slate-800 dark:text-slate-100 font-sans">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
          <span className="text-lg">{member.gender === 'FEMENINO' ? '👩' : '👨'}</span>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white leading-tight">{member.name}</h4>
            <span className="text-[9px] uppercase font-bold text-slate-400">
              {member.district || 'Sin Distrito'}
            </span>
          </div>
        </div>

        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 mb-3">
          <p className="line-clamp-2"><strong>Dirección:</strong> {member.address}</p>
          <p><strong>Líder Directo:</strong> {member.leaderName || 'Sin asignar'}</p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {onSelectEntity && (
            <button
              onClick={() => onSelectEntity(member, 'MEMBER')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1"
            >
              <Eye className="w-3 h-3" />
              <span>Ficha</span>
            </button>
          )}

          {onEditLocation && (
            <button
              onClick={() => onEditLocation(member, 'MEMBER')}
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

MemberMarkerPopup.displayName = 'MemberMarkerPopup';
