import React, { useState, useEffect } from 'react';
import { RefreshCw, Star, AlertTriangle, ShieldAlert } from 'lucide-react';
import apiService from '../../apiService';
import ModalHeader from '../ModalHeader';
import MemberEvaluationHistoryModal from './MemberEvaluationHistoryModal';

// ============================================================
// Helpers
// ============================================================
const RISK_CONFIG = {
  NORMAL: { 
    label: 'Normal',   
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50', 
    bgClass: 'bg-emerald-50/30 dark:bg-emerald-950/5 border-emerald-200 dark:border-emerald-900/30 hover:border-emerald-400 dark:hover:border-emerald-700',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    icon: '✅' 
  },
  RISK: { 
    label: 'En Riesgo', 
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50', 
    bgClass: 'bg-amber-50/30 dark:bg-amber-950/5 border-amber-200 dark:border-amber-900/30 hover:border-amber-400 dark:hover:border-amber-700',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
    icon: '⚠️' 
  },
  INACTIVE: { 
    label: 'Inactivo',  
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50', 
    bgClass: 'bg-rose-50/30 dark:bg-rose-950/5 border-rose-200 dark:border-rose-900/30 hover:border-rose-400 dark:hover:border-rose-700',
    dotColor: 'bg-rose-500',
    textColor: 'text-rose-600 dark:text-rose-400',
    icon: '⛔' 
  },
};

const CRITERIA_ICONS = {
  punctuality:  '⏰',
  presentation: '👔',
  attitude:     '🤝',
  none:         '—',
};

const CRITERIA_LABELS = {
  punctuality:  'Puntualidad',
  presentation: 'Presentación',
  attitude:     'Actitud',
  none:         'Sin datos',
};

function ScoreBar({ label, value, max = 3 }) {
  const pct = Math.round((value / max) * 100);
  const colorClass = value >= 2.2 ? 'bg-emerald-500' : value >= 1.6 ? 'bg-amber-500' : 'bg-rose-500';
  const textClass = value >= 2.2 ? 'text-emerald-600 dark:text-emerald-400' : value >= 1.6 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-bold">
        <span>{label}</span>
        <span className={`font-black ${textClass}`}>{value.toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${colorClass} transition-all duration-300 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProfileCard({ profile, onViewDetail }) {
  const risk = RISK_CONFIG[profile.riskStatus] || RISK_CONFIG.NORMAL;
  return (
    <button
      type="button"
      className={`w-full text-left flex flex-col p-5 rounded-[2rem] border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-black/35 ${risk.bgClass}`}
      onClick={() => onViewDetail?.(profile)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4 w-full gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-black text-slate-900 dark:text-white text-base truncate leading-tight">{profile.memberName}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate tracking-wider uppercase mt-1">{profile.ministryName}</div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black shrink-0 tracking-wider uppercase flex items-center gap-1 border ${risk.badgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${risk.dotColor}`} />
          {risk.label}
        </span>
      </div>

      {/* Barras de promedio */}
      <div className="w-full space-y-3">
        <ScoreBar label="Puntualidad"  value={profile.avgPunctuality}  />
        <ScoreBar label="Presentación" value={profile.avgPresentation} />
        <ScoreBar label="Actitud"      value={profile.avgAttitude}     />
      </div>

      {/* Footer */}
      <div className="flex flex-wrap justify-between items-center w-full mt-5 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 gap-2">
        <div className="text-xs text-slate-550 dark:text-slate-400 font-bold">
          <span className={`text-base font-black mr-1 ${risk.textColor}`}>
            {profile.overallAverage.toFixed(2)}
          </span>
          <span className="opacity-60">/ 3.00</span>
        </div>
        <div className="text-[10px] text-slate-550 dark:text-slate-400 font-black uppercase tracking-wider">
          {CRITERIA_ICONS[profile.weakestCriteria]} Débil:{' '}
          <span className="text-rose-600 dark:text-rose-400">{CRITERIA_LABELS[profile.weakestCriteria]}</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-3 font-semibold">
        Basado en {profile.evaluationsCount} evaluación{profile.evaluationsCount !== 1 ? 'es' : ''}
      </div>
    </button>
  );
}

// ============================================================
// Dashboard principal
// ============================================================
export default function ExcellenceDashboard({ ministryId, ministryName, onClose }) {
  const [profiles, setProfiles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState('ALL'); // ALL | NORMAL | RISK | INACTIVE
  
  // Estado para modal secundario de historial
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (!ministryId) return;
    setLoading(true);
    apiService.getMinistryExcellenceDashboard(ministryId)
      .then(setProfiles)
      .catch((err) => setError('Error al cargar dashboard: ' + err.message))
      .finally(() => setLoading(false));
  }, [ministryId]);

  const filtered = filter === 'ALL'
    ? profiles
    : profiles.filter((p) => p.riskStatus === filter);

  const counts = {
    ALL:      profiles.length,
    NORMAL:   profiles.filter((p) => p.riskStatus === 'NORMAL').length,
    RISK:     profiles.filter((p) => p.riskStatus === 'RISK').length,
    INACTIVE: profiles.filter((p) => p.riskStatus === 'INACTIVE').length,
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
          <ModalHeader
            title="Panel de Excelencia"
            subtitle={ministryName}
            icon={Star}
            onClose={onClose}
          />

          {/* Filtros */}
          <div className="flex gap-2 p-6 md:px-8 border-b border-slate-100 dark:border-slate-800 flex-wrap shrink-0">
            {[
              { key: 'ALL',      label: 'Todos',        activeClass: 'bg-slate-800 text-white dark:bg-slate-700 border-slate-800 dark:border-slate-700', inactiveClass: 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40' },
              { key: 'NORMAL',   label: '✅ Normal',    activeClass: 'bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-600', inactiveClass: 'border-slate-200 dark:border-slate-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' },
              { key: 'RISK',     label: '⚠️ En Riesgo', activeClass: 'bg-amber-600 text-white border-amber-600 dark:bg-amber-600 dark:border-amber-600', inactiveClass: 'border-slate-200 dark:border-slate-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20' },
              { key: 'INACTIVE', label: '⛔ Inactivos', activeClass: 'bg-rose-600 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-600', inactiveClass: 'border-slate-200 dark:border-slate-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20' },
            ].map(({ key, label, activeClass, inactiveClass }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-xl border-2 font-black text-xs transition-all duration-150 flex items-center gap-2
                  ${filter === key ? activeClass : inactiveClass}
                  focus:outline-none`}
              >
                <span>{label}</span>
                <span className="opacity-70">({counts[key]})</span>
              </button>
            ))}
          </div>

          {/* Contenido principal */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {loading ? (
              <div className="py-24 text-center space-y-4">
                <RefreshCw className="mx-auto text-blue-500 animate-spin opacity-50" size={40} />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cargando perfiles...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-3 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-800/40">
                <ShieldAlert className="mx-auto text-rose-500" size={40} />
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">⚠️ {error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-slate-50 dark:bg-slate-800/30 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                <AlertTriangle className="mx-auto text-slate-300 dark:text-slate-650" size={48} />
                <p className="font-bold text-slate-500 dark:text-slate-400">No hay servidores con evaluaciones en esta categoría.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p) => (
                  <ProfileCard 
                    key={p.teamId} 
                    profile={p} 
                    onViewDetail={(p) => setSelectedProfile(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal secundario de historial individual */}
      {selectedProfile && (
        <MemberEvaluationHistoryModal
          teamId={selectedProfile.teamId}
          memberName={selectedProfile.memberName}
          ministryName={selectedProfile.ministryName}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </>
  );
}
