import React, { useState, useEffect } from 'react';
import apiService from '../../apiService';

// ============================================================
// Helpers
// ============================================================
const RISK_CONFIG = {
  NORMAL:   { label: 'Normal',   color: '#22c55e', bg: '#dcfce7', icon: '✅' },
  RISK:     { label: 'En Riesgo', color: '#f97316', bg: '#fff7ed', icon: '⚠️' },
  INACTIVE: { label: 'Inactivo',  color: '#ef4444', bg: '#fee2e2', icon: '⛔' },
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
  const color = value >= 2.2 ? '#22c55e' : value >= 1.6 ? '#f97316' : '#ef4444';
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280', marginBottom: '2px' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value.toFixed(2)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .4s ease', borderRadius: 3 }} />
      </div>
    </div>
  );
}

function ProfileCard({ profile, onViewDetail }) {
  const risk = RISK_CONFIG[profile.riskStatus] || RISK_CONFIG.NORMAL;
  return (
    <div
      style={{
        border: `2px solid ${risk.color}`,
        borderRadius: 14,
        padding: '1rem 1.25rem',
        background: risk.bg,
        transition: 'transform .2s, box-shadow .2s',
        cursor: 'pointer',
      }}
      onClick={() => onViewDetail?.(profile)}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${risk.color}33`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{profile.memberName}</div>
          <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{profile.ministryName}</div>
        </div>
        <span
          style={{
            background: risk.color,
            color: '#fff',
            borderRadius: 999,
            padding: '0.2rem 0.65rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          {risk.icon} {risk.label}
        </span>
      </div>

      {/* Barras de promedio */}
      <ScoreBar label="Puntualidad"  value={profile.avgPunctuality}  />
      <ScoreBar label="Presentación" value={profile.avgPresentation} />
      <ScoreBar label="Actitud"      value={profile.avgAttitude}     />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: `1px solid ${risk.color}44` }}>
        <div style={{ fontSize: '0.8rem', color: '#374151' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: risk.color }}>
            {profile.overallAverage.toFixed(2)}
          </span>
          <span style={{ color: '#9ca3af' }}> / 3.0 promedio</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {CRITERIA_ICONS[profile.weakestCriteria]} Más débil:{' '}
          <b>{CRITERIA_LABELS[profile.weakestCriteria]}</b>
        </div>
      </div>

      <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: '0.4rem' }}>
        Basado en {profile.evaluationsCount} evaluación{profile.evaluationsCount !== 1 ? 'es' : ''}
      </div>
    </div>
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="excellence-dashboard"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 860, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,.18)', width: '100%' }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>⭐ Panel de Excelencia</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: '#6b7280' }}>
              {ministryName} — Últimas 3 evaluaciones por servidor
            </p>
          </div>
          <button style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }} onClick={onClose}>✕</button>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.75rem', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL',      label: 'Todos',        color: '#6b7280' },
            { key: 'NORMAL',   label: '✅ Normal',    color: '#22c55e' },
            { key: 'RISK',     label: '⚠️ En Riesgo', color: '#f97316' },
            { key: 'INACTIVE', label: '⛔ Inactivos', color: '#ef4444' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: 999,
                border: `2px solid ${filter === key ? color : '#e5e7eb'}`,
                background: filter === key ? color : 'transparent',
                color: filter === key ? '#fff' : '#374151',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {label} <span style={{ opacity: 0.75 }}>({counts[key]})</span>
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ padding: '1.25rem 1.75rem' }}>
          {loading && <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>Cargando perfiles...</p>}
          {!loading && error && <p style={{ color: '#ef4444', textAlign: 'center' }}>⚠️ {error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No hay servidores con evaluaciones en esta categoría.
            </p>
          )}
          {!loading && !error && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {filtered.map((p) => (
                <ProfileCard key={p.teamId} profile={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
