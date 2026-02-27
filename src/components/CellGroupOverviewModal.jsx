// ============================================
// CellGroupOverviewModal.jsx
// Vista general de todas las células accesibles
// Mes actual + comparativa entre células
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateOverviewPDF } from '../services/Cellgroupoverviewpdfgenerator';
import '../css/CellGroupOverviewModal.css';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CellGroupOverviewModal = ({
  isOpen,
  onClose,
  userCells = [],
  apiService,
  isDarkMode = false,
  isMobile = false,
  logUserAction,
  onSelectCell, // callback: (cellId) => void para abrir el modal de stats de esa célula
}) => {
  const [loading, setLoading] = useState(false);
  const [cellStats, setCellStats] = useState([]); // [{ cellId, cellName, stats, error }]
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState('percentage'); // 'percentage' | 'present' | 'name'
  const [sortDir, setSortDir] = useState('desc');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const T = {
    bg:          isDarkMode ? '#1e293b' : '#ffffff',
    bgSecondary: isDarkMode ? '#0f172a' : '#f8fafc',
    bgTertiary:  isDarkMode ? '#273548' : '#f1f5f9',
    text:        isDarkMode ? '#f3f4f6' : '#1f2937',
    textSub:     isDarkMode ? '#9ca3af' : '#6b7280',
    border:      isDarkMode ? '#334155' : '#e5e7eb',
    cardBg:      isDarkMode ? '#1e293b' : '#ffffff',
    handleBg:    isDarkMode ? '#475569' : '#cbd5e1',
    trackBg:     isDarkMode ? '#334155' : '#e2e8f0',
    badgeGreenBg:   isDarkMode ? 'rgba(16,185,129,0.15)'  : 'rgba(16,185,129,0.1)',
    badgeGreenTxt:  isDarkMode ? '#34d399' : '#059669',
    badgeRedBg:     isDarkMode ? 'rgba(239,68,68,0.15)'   : 'rgba(239,68,68,0.1)',
    badgeRedTxt:    isDarkMode ? '#f87171' : '#dc2626',
    badgeYellowBg:  isDarkMode ? 'rgba(245,158,11,0.15)'  : 'rgba(245,158,11,0.1)',
    badgeYellowTxt: isDarkMode ? '#fbbf24' : '#d97706',
    badgeBlueBg:    isDarkMode ? 'rgba(59,130,246,0.15)'  : 'rgba(59,130,246,0.1)',
    badgeBlueTxt:   isDarkMode ? '#60a5fa' : '#1e40af',
    badgeTealBg:    isDarkMode ? 'rgba(20,184,166,0.15)'  : 'rgba(20,184,166,0.1)',
    badgeTealTxt:   isDarkMode ? '#2dd4bf' : '#0d9488',
  };

  // ── Load stats for all cells ───────────────────────────────────────────────
  const loadAllStats = useCallback(async () => {
    if (!userCells.length) return;
    setLoading(true);
    setCellStats([]);

    try {
      const promises = userCells.map(cell =>
        apiService.getCellAttendanceMonthlyStats(cell.id, selectedYear, selectedMonth)
          .then(data => ({ cellId: cell.id, cellName: cell.name || `Célula #${cell.id}`, stats: data, error: null }))
          .catch(err => ({ cellId: cell.id, cellName: cell.name || `Célula #${cell.id}`, stats: null, error: err.message }))
      );

      const results = await Promise.all(promises);
      setCellStats(results);
      logUserAction?.('view_overview_stats', {
        cells: userCells.length,
        month: selectedMonth,
        year: selectedYear,
      });
    } catch (err) {
      console.error('[CellGroupOverviewModal] Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userCells, selectedMonth, selectedYear, apiService, logUserAction]);

  useEffect(() => {
    if (isOpen) loadAllStats();
  }, [isOpen, loadAllStats]);

  // ── Reset on close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) setCellStats([]);
  }, [isOpen]);

  // ── Aggregated totals ──────────────────────────────────────────────────────
  const aggregated = useMemo(() => {
    const withData = cellStats.filter(c => c.stats && c.stats.totalRegistered > 0);
    if (!withData.length) return null;

    const totalPresent    = withData.reduce((s, c) => s + (c.stats.totalPresent    || 0), 0);
    const totalRegistered = withData.reduce((s, c) => s + (c.stats.totalRegistered || 0), 0);
    const totalMeetings   = withData.reduce((s, c) => s + (c.stats.totalMeetings   || 0), 0);
    const totalJustified  = withData.reduce((s, c) => s + (c.stats.totalJustified  || 0), 0);
    const totalNew        = withData.reduce((s, c) => s + (c.stats.totalNewParticipants || 0), 0);
    const overallPct      = totalRegistered > 0 ? Math.round((totalPresent / totalRegistered) * 100) : 0;
    const avgPct          = withData.length > 0
      ? Math.round(withData.reduce((s, c) => {
          const pct = c.stats.totalRegistered > 0 ? (c.stats.totalPresent / c.stats.totalRegistered) * 100 : 0;
          return s + pct;
        }, 0) / withData.length)
      : 0;

    return { totalPresent, totalRegistered, totalMeetings, totalJustified, totalNew, overallPct, avgPct, cellsWithData: withData.length };
  }, [cellStats]);

  // ── Sorted cells ──────────────────────────────────────────────────────────
  const sortedCells = useMemo(() => {
    const arr = [...cellStats];
    arr.sort((a, b) => {
      let va, vb;
      if (sortBy === 'percentage') {
        va = a.stats?.totalRegistered > 0 ? (a.stats.totalPresent / a.stats.totalRegistered) * 100 : -1;
        vb = b.stats?.totalRegistered > 0 ? (b.stats.totalPresent / b.stats.totalRegistered) * 100 : -1;
      } else if (sortBy === 'present') {
        va = a.stats?.totalPresent || -1;
        vb = b.stats?.totalPresent || -1;
      } else {
        va = a.cellName.toLowerCase();
        vb = b.cellName.toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [cellStats, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  // ── PDF handler ────────────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    if (!cellStats.length) return;
    setGeneratingPDF(true);
    try {
      await generateOverviewPDF(cellStats, selectedMonth, selectedYear, aggregated);
      logUserAction?.('generate_overview_pdf', { month: selectedMonth, year: selectedYear });
    } catch (err) {
      console.error('[CellGroupOverviewModal] Error generating PDF:', err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // ── Year options ──────────────────────────────────────────────────────────
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
  }, []);

  const pctColor = (pct) => {
    if (pct >= 75) return '#10b981';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const pctBadge = (pct) => {
    if (pct >= 75) return { bg: T.badgeGreenBg, txt: T.badgeGreenTxt };
    if (pct >= 50) return { bg: T.badgeYellowBg, txt: T.badgeYellowTxt };
    return { bg: T.badgeRedBg, txt: T.badgeRedTxt };
  };

  if (!isOpen) return null;

  const selectStyle = {
    backgroundColor: T.bgSecondary,
    color: T.text,
    border: `1.5px solid ${T.border}`,
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '0.82rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    outline: 'none',
    minHeight: '38px',
  };

  const sortBtn = (field, label) => (
    <button
      onClick={() => handleSort(field)}
      style={{
        background: sortBy === field ? T.badgeBlueBg : 'transparent',
        color: sortBy === field ? T.badgeBlueTxt : T.textSub,
        border: `1px solid ${sortBy === field ? T.badgeBlueTxt + '40' : T.border}`,
        borderRadius: '20px',
        padding: '4px 12px',
        fontSize: '0.72rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      {label} {sortBy === field ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </button>
  );

  return (
    <>
      {/* Overlay */}
      <div className="cgo-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="cgo-modal">
        <div className="cgo-modal__container" style={{ backgroundColor: T.bg, color: T.text }}>

          {isMobile && <div className="cgo-handle" style={{ background: T.handleBg }} />}

          {/* HEADER */}
          <div className="cgo-header" style={{ borderBottomColor: T.border }}>
            <div>
              <h2 className="cgo-title" style={{ color: T.text }}>
                🏘️ Vista General — Altares de Vida
              </h2>
              <p className="cgo-subtitle" style={{ color: T.textSub }}>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear} · {userCells.length} altar{userCells.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Botón recargar */}
              <button
                onClick={loadAllStats}
                disabled={loading}
                style={{
                  background: T.bgSecondary,
                  border: `1px solid ${T.border}`,
                  borderRadius: '8px',
                  padding: '7px 10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  color: T.text,
                  opacity: loading ? 0.5 : 1,
                }}
                title="Recargar"
              >
                <span className={loading ? 'cgo-spin' : ''}>🔄</span>
              </button>

              {/* Botón PDF */}
              <button
                onClick={handleGeneratePDF}
                disabled={!cellStats.length || generatingPDF || loading}
                style={{
                  background: T.bgSecondary,
                  border: `1px solid ${T.border}`,
                  borderRadius: '8px',
                  padding: '7px 10px',
                  cursor: (!cellStats.length || generatingPDF || loading) ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  color: T.text,
                  opacity: (!cellStats.length || generatingPDF || loading) ? 0.5 : 1,
                }}
                title="Descargar PDF"
              >
                📄
              </button>

              {/* Botón cerrar */}
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: T.textSub,
                  padding: '7px',
                  borderRadius: '8px',
                }}
              >✕</button>
            </div>
          </div>

          {/* FILTERS */}
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 20px',
            borderBottom: `1px solid ${T.border}`,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '0.65rem', color: T.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Mes</label>
              <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={selectStyle}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{MONTH_NAMES[i]}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '0.65rem', color: T.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Año</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={selectStyle}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.65rem', color: T.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px', display: 'block', width: '100%' }}>Ordenar por</span>
              {sortBtn('percentage', '% Asistencia')}
              {sortBtn('present', 'Presentes')}
              {sortBtn('name', 'Nombre')}
            </div>
          </div>

          {/* CONTENT */}
          <div className="cgo-content">

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSub }}>
                <div className="cgo-spinner" style={{ borderColor: T.border, borderTopColor: '#3b82f6' }} />
                <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>
                  Cargando {userCells.length} altar{userCells.length !== 1 ? 'es' : ''}…
                </p>
              </div>
            )}

            {!loading && cellStats.length > 0 && (
              <>
                {/* AGGREGATED KPI STRIP */}
                {aggregated && (
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    padding: '16px 20px',
                    borderBottom: `1px solid ${T.border}`,
                    flexWrap: 'wrap',
                    backgroundColor: T.bgSecondary,
                  }}>
                    {[
                      { icon: '🏘️', label: 'Altares con datos', value: aggregated.cellsWithData, color: T.badgeBlueTxt },
                      { icon: '✅', label: 'Total presentes', value: aggregated.totalPresent, color: T.badgeGreenTxt },
                      { icon: '👥', label: 'Registros totales', value: aggregated.totalRegistered, color: T.text },
                      { icon: '📊', label: '% Global', value: `${aggregated.overallPct}%`, color: pctColor(aggregated.overallPct) },
                      { icon: '📈', label: '% Promedio', value: `${aggregated.avgPct}%`, color: pctColor(aggregated.avgPct) },
                      ...(aggregated.totalNew > 0 ? [{ icon: '🌟', label: 'Nuevas visitas', value: aggregated.totalNew, color: T.badgeTealTxt }] : []),
                    ].map((kpi, i) => (
                      <div key={i} style={{
                        flex: '1 1 90px',
                        backgroundColor: T.cardBg,
                        borderRadius: '10px',
                        padding: '10px 12px',
                        border: `1px solid ${T.border}`,
                        textAlign: 'center',
                        minWidth: '80px',
                      }}>
                        <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{kpi.icon}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: kpi.color, lineHeight: 1.1 }}>{kpi.value}</div>
                        <div style={{ fontSize: '0.62rem', color: T.textSub, marginTop: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CELL CARDS */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sortedCells.map(({ cellId, cellName, stats, error }) => {
                    const hasData = stats && stats.totalRegistered > 0;
                    const pct = hasData ? Math.round((stats.totalPresent / stats.totalRegistered) * 100) : 0;
                    const badge = pctBadge(pct);
                    const newVisits = stats?.totalNewParticipants || 0;

                    return (
                      <div
                        key={cellId}
                        onClick={() => hasData && onSelectCell?.(String(cellId))}
                        style={{
                          backgroundColor: T.cardBg,
                          border: `1.5px solid ${T.border}`,
                          borderRadius: '12px',
                          padding: '14px 16px',
                          cursor: hasData && onSelectCell ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        className="cgo-cell-card"
                      >
                        {/* Left accent bar */}
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, bottom: 0,
                          width: '4px',
                          backgroundColor: hasData ? pctColor(pct) : T.border,
                          borderRadius: '12px 0 0 12px',
                        }} />

                        <div style={{ paddingLeft: '8px' }}>
                          {/* Row 1: name + pct pill */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: T.text, flex: 1, minWidth: 0 }}>
                              🏡 {cellName}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                              {hasData && (
                                <span style={{
                                  backgroundColor: badge.bg,
                                  color: badge.txt,
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                }}>
                                  {pct}%
                                </span>
                              )}
                              {onSelectCell && hasData && (
                                <span style={{ color: T.textSub, fontSize: '0.75rem' }}>→</span>
                              )}
                            </div>
                          </div>

                          {error && (
                            <div style={{ fontSize: '0.75rem', color: T.badgeRedTxt, marginBottom: '4px' }}>
                              ⚠️ Error al cargar datos
                            </div>
                          )}

                          {!hasData && !error && !loading && (
                            <div style={{ fontSize: '0.75rem', color: T.textSub }}>
                              📭 Sin datos para este periodo
                            </div>
                          )}

                          {hasData && (
                            <>
                              {/* Progress bar */}
                              <div style={{
                                height: '6px',
                                backgroundColor: T.trackBg,
                                borderRadius: '3px',
                                overflow: 'hidden',
                                marginBottom: '10px',
                              }}>
                                <div style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  backgroundColor: pctColor(pct),
                                  borderRadius: '3px',
                                  transition: 'width 0.5s ease',
                                }} />
                              </div>

                              {/* Stats row */}
                              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.74rem', color: T.textSub }}>
                                  <span style={{ color: T.badgeGreenTxt, fontWeight: 700 }}>{stats.totalPresent}</span>
                                  {' '}/ {stats.totalRegistered} presentes
                                </span>
                                <span style={{ fontSize: '0.74rem', color: T.textSub }}>
                                  📅 {stats.totalMeetings} sesión{stats.totalMeetings !== 1 ? 'es' : ''}
                                </span>
                                {stats.totalJustified > 0 && (
                                  <span style={{ fontSize: '0.74rem', color: T.badgeYellowTxt }}>
                                    📝 {stats.totalJustified} justificados
                                  </span>
                                )}
                                {newVisits > 0 && (
                                  <span style={{ fontSize: '0.74rem', color: T.badgeTealTxt, fontWeight: 600 }}>
                                    🌟 {newVisits} visitas
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty state */}
                {sortedCells.every(c => !c.stats || c.stats.totalRegistered === 0) && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSub }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📭</div>
                    <p style={{ fontWeight: 600, color: T.text }}>Sin datos</p>
                    <p style={{ fontSize: '0.82rem' }}>
                      No hay registros de asistencia para {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                    </p>
                  </div>
                )}
              </>
            )}

            {!loading && cellStats.length === 0 && userCells.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: T.textSub }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏘️</div>
                <p>No tienes altares de vida asignados.</p>
              </div>
            )}
          </div>

          {/* FOOTER */}
          {!isMobile && (
            <div style={{
              padding: '14px 20px',
              borderTop: `1px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              {/* Botón PDF en footer también */}
              <button
                onClick={handleGeneratePDF}
                disabled={!cellStats.length || generatingPDF || loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  backgroundColor: T.badgeBlueBg,
                  color: T.badgeBlueTxt,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: (!cellStats.length || generatingPDF || loading) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: (!cellStats.length || generatingPDF || loading) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                📄 {generatingPDF ? 'Generando…' : 'Descargar PDF'}
              </button>

              <button
                onClick={onClose}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  backgroundColor: T.bgSecondary,
                  color: T.text,
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Footer móvil con botón PDF */}
          {isMobile && cellStats.length > 0 && (
            <div style={{
              padding: '12px 16px',
              borderTop: `1px solid ${T.border}`,
            }}>
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPDF || loading}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  backgroundColor: T.badgeBlueBg,
                  color: T.badgeBlueTxt,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: (generatingPDF || loading) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: (generatingPDF || loading) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                📄 {generatingPDF ? 'Generando PDF…' : 'Descargar PDF'}
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CellGroupOverviewModal;