import React, { useEffect, useMemo } from 'react';
import { MapPin, User, Home, ArrowUpRight, Edit, Eye, X, Shield, Award, Navigation } from 'lucide-react';

// Función Haversine para calcular distancia aproximada entre dos puntos en km
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const GeoEntityDetailCard = React.memo(({ entity, type, onClose, onOpenFullDetail, onEditLocation, cells = [], mapRef }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isMember = type === 'MEMBER' || type === 'LEADER';
  const lat = entity?.latitude;
  const lng = entity?.longitude;

  // Calcular altar más cercano para miembros usando useMemo
  const nearestCell = useMemo(() => {
    if (!isMember || !lat || !lng || !cells.length) return null;
    let closest = null;
    let minDistance = Infinity;

    cells.forEach((cell) => {
      if (cell.latitude && cell.longitude) {
        const dist = calculateHaversineDistance(
          lat,
          lng,
          cell.latitude,
          cell.longitude
        );
        if (dist !== null && dist < minDistance) {
          minDistance = dist;
          closest = { cell, distance: dist };
        }
      }
    });

    return closest;
  }, [isMember, lat, lng, cells]);

  if (!entity) return null;

  const name = entity.name || 'Sin Nombre';
  const address = isMember ? entity.address : entity.meetingAddress;
  const district = entity.district || 'Sin Distrito';
  const isLeader = entity.isLeader || type === 'LEADER';

  // Enlace para Google Maps "Cómo llegar"
  const googleMapsUrl = lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : null;
  const handleCenterOnCell = () => {
    if (mapRef?.current && nearestCell?.cell) {
      mapRef.current.flyTo(
        [nearestCell.cell.latitude, nearestCell.cell.longitude],
        16,
        { duration: 1.2 }
      );
    }
  };

  return (
    <div
      className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800/80 w-full max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 font-sans text-slate-800 dark:text-slate-100 relative z-[2000]"
      role="dialog"
      aria-label={`Detalles de ${name}`}
    >
      {/* Botón Cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
        aria-label="Cerrar detalles"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Cabecera con Insignias */}
      <div className="flex items-start gap-3 pr-8 mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-md shrink-0 ${
          !isMember
            ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
            : isLeader
            ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-900'
            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50'
        }`}>
          {!isMember ? <Home className="w-6 h-6" /> : isLeader ? <Award className="w-6 h-6" /> : <User className="w-6 h-6" />}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
              !isMember
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                : isLeader
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40'
                : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40'
            }`}>
              {!isMember ? 'Altar / Célula' : isLeader ? '👑 Líder' : 'Miembro'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {district}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight line-clamp-1">
            {name}
          </h3>
        </div>
      </div>

      {/* Detalles del Registro */}
      <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-150/50 dark:border-slate-800/60 mb-4">
        {address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 leading-relaxed">{address} {entity.city ? `• ${entity.city}` : ''}</span>
          </div>
        )}

        {isMember ? (
          <>
            {entity.leaderName && (
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Líder directo: <strong className="text-slate-800 dark:text-slate-200">{entity.leaderName}</strong></span>
              </div>
            )}
            {entity.networkLeaderName && (
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Líder de Red: <strong className="text-slate-800 dark:text-slate-200">{entity.networkLeaderName}</strong></span>
              </div>
            )}
          </>
        ) : (
          <>
            {entity.mainLeaderName && (
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Líder Principal: <strong className="text-slate-800 dark:text-slate-200">{entity.mainLeaderName}</strong></span>
              </div>
            )}
            {entity.meetingDay && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Día de Reunión:</span>
                <span className="font-semibold">{entity.meetingDay}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Altar Más Cercano (Exclusivo para Miembros) */}
      {isMember && nearestCell && (
        <div className="text-xs bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-3.5 rounded-2xl mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">⛪ Altar más cercano</span>
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">{nearestCell.distance.toFixed(2)} km</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200">{nearestCell.cell.name}</span>
            <button
              onClick={handleCenterOnCell}
              className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 bg-white dark:bg-slate-800/80 px-2 py-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/60"
            >
              <Navigation className="w-2.5 h-2.5" />
              <span>Centrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          {onOpenFullDetail && (
            <button
              onClick={() => onOpenFullDetail(entity, type)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ficha Completa</span>
            </button>
          )}

          {onEditLocation && (
            <button
              onClick={() => onEditLocation(entity, type)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Ubicación</span>
            </button>
          )}
        </div>

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/40 transition-colors focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Cómo llegar (Google Maps)</span>
          </a>
        )}
      </div>
    </div>
  );
});

GeoEntityDetailCard.displayName = 'GeoEntityDetailCard';
