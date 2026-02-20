// ============================================
// ModalCellStatistics.jsx
// Dashboard completo de estadísticas de células
// Props: isOpen, onClose, data, isDarkMode
// ============================================
// API response: { total, activas, incompletas }
// data.cells = allCells array from CellGroupsPage
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import '../css/ModalCellStatistics.css';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const ModalCellStatistics = ({ isOpen, onClose, data, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const T = {
    bg:      isDarkMode ? '#1e293b' : '#ffffff',
    bgAlt:   isDarkMode ? '#0f172a' : '#f8fafc',
    text:    isDarkMode ? '#f1f5f9' : '#1f2937',
    textSub: isDarkMode ? '#94a3b8' : '#6b7280',
    border:  isDarkMode ? '#334155' : '#e5e7eb',
    barBg:   isDarkMode ? '#334155' : '#e5e7eb',
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab('overview');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Stats from API (exact field names: total, activas, incompletas) ──
  const stats = useMemo(() => {
    if (!data) return null;
    return {
      total:         data.total         ?? data.totalCells       ?? 0,
      activas:       data.activas       ?? data.activeCells      ?? 0,
      incompletas:   data.incompletas   ?? data.incompleteCells  ?? 0,
      suspendidas:   data.suspendidas   ?? data.suspendedCells   ?? 0,
      inactivas:     data.inactivas     ?? data.inactiveCells    ?? 0,
      multiplicando: data.multiplicando ?? data.multiplyingCells ?? 0,
    };
  }, [data]);

  // ── Analytics from cells array ──
  const analytics = useMemo(() => {
    const cells = data?.cells || [];
    if (!cells.length) return null;

    let totalMembers = 0, totalCapacity = 0;
    const cellsWithMembers = [];

    cells.forEach(c => {
      const count = c.currentMemberCount ?? c.memberCount ?? 0;
      const cap   = c.maxCapacity ?? 0;
      totalMembers  += count;
      totalCapacity += cap;
      if (count > 0) cellsWithMembers.push({ name: c.name || c.cellName, count, cap });
    });

    const avgMembers = cells.length > 0 ? (totalMembers / cells.length).toFixed(1) : 0;
    const occupancy  = totalCapacity > 0 ? Math.round((totalMembers / totalCapacity) * 100) : 0;

    const parseDateSafe = (raw) => {
      if (!raw) return null;
      try {
        let d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1900) return d;
        if (typeof raw === 'string' && raw.includes('/')) {
          const p = raw.split('/');
          d = new Date(+p[2], +p[1] - 1, +p[0]);
          if (!isNaN(d.getTime())) return d;
        }
      } catch (_) {}
      return null;
    };

    const byYear = {};
    const byMonthKey = {};
    cells.forEach(c => {
      const d = parseDateSafe(c.creationDate || c.createdAt || c.creationDateFormatted);
      if (!d) return;
      const y = d.getFullYear();
      const mk = `${y}-${String(d.getMonth()).padStart(2,'0')}`;
      byYear[y] = (byYear[y] || 0) + 1;
      byMonthKey[mk] = (byMonthKey[mk] || 0) + 1;
    });

    const now = new Date();
    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${dt.getFullYear()}-${String(dt.getMonth()).padStart(2,'0')}`;
      monthlyTrend.push({ label: MONTH_NAMES[dt.getMonth()], year: dt.getFullYear(), count: byMonthKey[mk] || 0 });
    }
    const maxMonthly = Math.max(...monthlyTrend.map(m => m.count), 1);

    const districts = {};
    cells.forEach(c => {
      const dist = c.districtLabel || c.district || 'Sin distrito';
      if (!districts[dist]) districts[dist] = { cells: 0, members: 0 };
      districts[dist].cells   += 1;
      districts[dist].members += (c.currentMemberCount ?? c.memberCount ?? 0);
    });

    const yearlyEntries = Object.entries(byYear).sort((a, b) => b[0] - a[0]);
    const topCells = [...cellsWithMembers].sort((a,b) => b.count - a.count).slice(0, 5);

    return {
      totalMembers, totalCapacity, avgMembers: parseFloat(avgMembers),
      occupancy, yearlyEntries, monthlyTrend, maxMonthly,
      districts, topCells, hasDates: Object.keys(byYear).length > 0,
    };
  }, [data]);

  if (!isOpen || !data || !stats) return null;

  const pct = (v) => stats.total > 0 ? Math.round((v / stats.total) * 100) : 0;

  const buildDonut = () => {
    if (stats.total === 0) return `conic-gradient(${T.barBg} 0deg 360deg)`;
    const segs = [
      { v: stats.activas, c:'#10b981' }, { v: stats.incompletas, c:'#f59e0b' },
      { v: stats.suspendidas, c:'#ef4444' }, { v: stats.inactivas, c:'#6b7280' },
    ].filter(s => s.v > 0);
    let a = 0;
    return `conic-gradient(${segs.map(s => { const st=a; a+=(s.v/stats.total)*360; return `${s.c} ${st}deg ${a}deg`; }).join(', ')})`;
  };

  const statusCards = [
    { key:'activas',     label:'Activas',        val:stats.activas,     icon:'✅', color:'#10b981', bg:isDarkMode?'#064e3b':'#d1fae5', accent:isDarkMode?'#34d399':'#059669' },
    { key:'incompletas', label:'Lid. Incompleto', val:stats.incompletas, icon:'⚠️', color:'#f59e0b', bg:isDarkMode?'#78350f':'#fef3c7', accent:isDarkMode?'#fbbf24':'#d97706' },
    { key:'suspendidas', label:'Suspendidas',     val:stats.suspendidas, icon:'⏸️', color:'#ef4444', bg:isDarkMode?'#7f1d1d':'#fee2e2', accent:isDarkMode?'#f87171':'#dc2626' },
    { key:'inactivas',   label:'Inactivas',       val:stats.inactivas,   icon:'⏹️', color:'#6b7280', bg:isDarkMode?'#1f2937':'#f3f4f6', accent:isDarkMode?'#9ca3af':'#4b5563' },
  ];

  const TABS = [
    { id:'overview', label:'📊 Resumen',     show: true },
    { id:'members',  label:'👥 Miembros',    show: !!analytics },
    { id:'growth',   label:'📈 Crecimiento', show: analytics?.hasDates },
  ];

  const totalMembers = analytics?.totalMembers ?? data.totalMembers ?? 0;

  return (
    <div className="mcs-overlay" onClick={onClose}>
      <div className="mcs-container" style={{ backgroundColor: T.bg, color: T.text }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mcs-header">
          <div className="mcs-header-left">
            <span className="mcs-header-icon">📊</span>
            <div>
              <h2 className="mcs-title">Estadísticas de Células</h2>
              <p className="mcs-subtitle">Dashboard completo de las CBI</p>
            </div>
          </div>
          <button className="mcs-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="mcs-tabs" style={{ borderBottomColor: T.border }}>
          {TABS.filter(t => t.show).map(t => (
            <button
              key={t.id}
              className={`mcs-tab ${activeTab === t.id ? 'mcs-tab--active' : ''}`}
              onClick={() => setActiveTab(t.id)}
              style={activeTab === t.id ? {} : { color: T.textSub }}
            >{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div className="mcs-body">

          {/* ══════ OVERVIEW ══════ */}
          {activeTab === 'overview' && (
            <div className="mcs-section">
              <div className="mcs-hero">
                <div className="mcs-donut-area">
                  <div className="mcs-donut" style={{ background: buildDonut() }}>
                    <div className="mcs-donut-center" style={{ backgroundColor: T.bg }}>
                      <span className="mcs-donut-num" style={{ color: T.text }}>{stats.total}</span>
                      <span className="mcs-donut-lbl" style={{ color: T.textSub }}>Total</span>
                    </div>
                  </div>
                  <div className="mcs-donut-legend">
                    {statusCards.filter(s => s.val > 0).map(s => (
                      <div key={s.key} className="mcs-legend-row">
                        <span className="mcs-legend-dot" style={{ backgroundColor: s.color }} />
                        <span style={{ color: T.textSub, fontSize:'11px' }}>{s.label}</span>
                        <span style={{ color: T.text, fontSize:'11px', fontWeight:700, marginLeft:'auto' }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mcs-kpi-strip">
                  <div className="mcs-kpi" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                    <span className="mcs-kpi-icon">🏠</span>
                    <div><div className="mcs-kpi-val" style={{ color: T.text }}>{stats.total}</div><div className="mcs-kpi-lbl" style={{ color: T.textSub }}>Células</div></div>
                  </div>
                  <div className="mcs-kpi" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                    <span className="mcs-kpi-icon">👥</span>
                    <div><div className="mcs-kpi-val" style={{ color: T.text }}>{totalMembers}</div><div className="mcs-kpi-lbl" style={{ color: T.textSub }}>Miembros</div></div>
                  </div>
                  <div className="mcs-kpi" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                    <span className="mcs-kpi-icon">📊</span>
                    <div><div className="mcs-kpi-val" style={{ color: T.text }}>{analytics?.avgMembers ?? '—'}</div><div className="mcs-kpi-lbl" style={{ color: T.textSub }}>Prom/Cél</div></div>
                  </div>
                  {stats.multiplicando > 0 && (
                    <div className="mcs-kpi" style={{ backgroundColor: isDarkMode?'#064e3b':'#ecfdf5', borderColor: isDarkMode?'#10b981':'#a7f3d0' }}>
                      <span className="mcs-kpi-icon">🌱</span>
                      <div><div className="mcs-kpi-val" style={{ color: isDarkMode?'#34d399':'#059669' }}>{stats.multiplicando}</div><div className="mcs-kpi-lbl" style={{ color: T.textSub }}>Multiplicando</div></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mcs-cards">
                {statusCards.map((c, i) => (
                  <div key={c.key} className="mcs-card" style={{ backgroundColor: c.bg, borderColor: `${c.color}30`, animationDelay:`${i*0.06}s` }}>
                    <div className="mcs-card-top">
                      <span className="mcs-card-icon">{c.icon}</span>
                      <span className="mcs-card-pct" style={{ color: c.accent }}>{pct(c.val)}%</span>
                    </div>
                    <div className="mcs-card-val" style={{ color: c.accent }}>{c.val}</div>
                    <div className="mcs-card-label" style={{ color: c.accent }}>{c.label}</div>
                    <div className="mcs-card-bar" style={{ backgroundColor: `${c.color}20` }}>
                      <div className="mcs-card-bar-fill" style={{ width: `${pct(c.val)}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {stats.total > 0 && (
                <div className="mcs-insights" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                  <h4 style={{ color: T.text }}>💡 Resumen Rápido</h4>
                  <div className="mcs-insights-list">
                    {stats.activas > 0 && (
                      <div className="mcs-insight"><span className="mcs-insight-dot" style={{ backgroundColor:'#10b981' }} /><span style={{ color: T.textSub, fontSize:'12px' }}><strong style={{ color: T.text }}>{pct(stats.activas)}%</strong> de las células están activas</span></div>
                    )}
                    {stats.incompletas > 0 && (
                      <div className="mcs-insight"><span className="mcs-insight-dot" style={{ backgroundColor:'#f59e0b' }} /><span style={{ color: T.textSub, fontSize:'12px' }}><strong style={{ color: T.text }}>{stats.incompletas}</strong> con liderazgo incompleto</span></div>
                    )}
                    {totalMembers > 0 && (
                      <div className="mcs-insight"><span className="mcs-insight-dot" style={{ backgroundColor:'#3b82f6' }} /><span style={{ color: T.textSub, fontSize:'12px' }}><strong style={{ color: T.text }}>{totalMembers}</strong> miembros en total en CBI</span></div>
                    )}
                    {stats.activas === stats.total && stats.total > 0 && (
                      <div className="mcs-insight mcs-insight--ok"><span>🎉</span><span style={{ color:'#059669', fontSize:'12px', fontWeight:600 }}>¡Todas las células están activas!</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════ MEMBERS ══════ */}
          {activeTab === 'members' && analytics && (
            <div className="mcs-section">
              <div className="mcs-members-hero" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                <div className="mcs-members-num">
                  <span style={{ fontSize:'36px', fontWeight:800, color: T.text }}>{analytics.totalMembers}</span>
                  <span style={{ fontSize:'12px', color: T.textSub, textTransform:'uppercase', fontWeight:700, letterSpacing:'0.5px' }}>Miembros en CBI</span>
                </div>
                <div className="mcs-members-meta">
                  <div className="mcs-meta-item" style={{ borderColor: T.border }}>
                    <span style={{ fontSize:'11px', color: T.textSub }}>Capacidad</span>
                    <span style={{ fontSize:'16px', fontWeight:700, color: T.text }}>{analytics.totalCapacity || '—'}</span>
                  </div>
                  <div className="mcs-meta-item" style={{ borderColor: T.border }}>
                    <span style={{ fontSize:'11px', color: T.textSub }}>Ocupación</span>
                    <span style={{ fontSize:'16px', fontWeight:700, color: analytics.occupancy>80?'#ef4444':analytics.occupancy>60?'#f59e0b':'#10b981' }}>{analytics.occupancy}%</span>
                  </div>
                  <div className="mcs-meta-item" style={{ borderColor: T.border }}>
                    <span style={{ fontSize:'11px', color: T.textSub }}>Promedio</span>
                    <span style={{ fontSize:'16px', fontWeight:700, color: T.text }}>{analytics.avgMembers}</span>
                  </div>
                </div>
              </div>

              {analytics.totalCapacity > 0 && (
                <div style={{ padding:'0 2px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                    <span style={{ fontSize:'11px', fontWeight:700, color: T.textSub }}>Ocupación general</span>
                    <span style={{ fontSize:'11px', fontWeight:700, color: T.text }}>{analytics.totalMembers}/{analytics.totalCapacity}</span>
                  </div>
                  <div style={{ height:'10px', borderRadius:'5px', backgroundColor: T.barBg, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:'5px', width:`${analytics.occupancy}%`, backgroundColor: analytics.occupancy>80?'#ef4444':analytics.occupancy>60?'#f59e0b':'#10b981', transition:'width 0.5s ease' }} />
                  </div>
                </div>
              )}

              {Object.keys(analytics.districts).length > 0 && (
                <div className="mcs-panel" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                  <h4 style={{ color: T.text, margin:'0 0 12px', fontSize:'13px', fontWeight:800 }}>📍 Por Distrito</h4>
                  {Object.entries(analytics.districts).map(([dist, info]) => (
                    <div key={dist} className="mcs-panel-row" style={{ borderColor: T.border }}>
                      <span style={{ fontWeight:650, fontSize:'12px', color: T.text }}>{dist}</span>
                      <div style={{ display:'flex', gap:'12px' }}>
                        <span style={{ fontSize:'11px', color: T.textSub }}>🏠 <strong style={{ color: T.text }}>{info.cells}</strong></span>
                        <span style={{ fontSize:'11px', color: T.textSub }}>👥 <strong style={{ color: T.text }}>{info.members}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {analytics.topCells.length > 0 && (
                <div className="mcs-panel" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                  <h4 style={{ color: T.text, margin:'0 0 12px', fontSize:'13px', fontWeight:800 }}>🏆 Top Células por Miembros</h4>
                  {analytics.topCells.map((c, i) => (
                    <div key={i} className="mcs-panel-row" style={{ borderColor: T.border }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'12px', fontWeight:800, color: i===0?'#f59e0b':T.textSub, width:'18px' }}>{i+1}</span>
                        <span style={{ fontSize:'12px', fontWeight:600, color: T.text }}>{c.name}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ width:'60px', height:'5px', borderRadius:'3px', backgroundColor: T.barBg, overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:'3px', width: `${(c.count/(analytics.topCells[0]?.count||1))*100}%`, backgroundColor:'#3b82f6' }} />
                        </div>
                        <span style={{ fontSize:'11px', fontWeight:700, color: T.text, minWidth:'24px', textAlign:'right' }}>{c.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════ GROWTH ══════ */}
          {activeTab === 'growth' && analytics?.hasDates && (
            <div className="mcs-section">
              <div className="mcs-panel" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                <h4 style={{ color: T.text, margin:'0 0 14px', fontSize:'13px', fontWeight:800 }}>📅 Células Creadas por Año</h4>
                <div className="mcs-year-cards">
                  {analytics.yearlyEntries.map(([year, count]) => (
                    <div key={year} className="mcs-year-card" style={{ backgroundColor: T.bg, borderColor: T.border }}>
                      <span style={{ fontSize:'22px', fontWeight:800, color:'#3b82f6' }}>{count}</span>
                      <span style={{ fontSize:'11px', fontWeight:700, color: T.textSub }}>{year}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mcs-panel" style={{ backgroundColor: T.bgAlt, borderColor: T.border }}>
                <h4 style={{ color: T.text, margin:'0 0 4px', fontSize:'13px', fontWeight:800 }}>📈 Células Nuevas por Mes</h4>
                <p style={{ color: T.textSub, fontSize:'11px', margin:'0 0 16px' }}>Últimos 12 meses</p>
                <div className="mcs-chart">
                  {analytics.monthlyTrend.map((m, i) => {
                    const barH = m.count > 0 ? Math.max((m.count / analytics.maxMonthly) * 100, 8) : 0;
                    const isCur = i === analytics.monthlyTrend.length - 1;
                    return (
                      <div key={i} className="mcs-chart-col">
                        <span className="mcs-chart-val" style={{ color: m.count > 0 ? T.text : 'transparent' }}>{m.count}</span>
                        <div className="mcs-chart-track" style={{ backgroundColor: T.barBg }}>
                          <div className="mcs-chart-fill" style={{ height:`${barH}%`, backgroundColor: isCur?'#10b981':'#3b82f6', opacity: m.count>0?1:0.15 }} />
                        </div>
                        <span className="mcs-chart-lbl" style={{ color: isCur?T.text:T.textSub }}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const yr = new Date().getFullYear();
                  const tot = analytics.monthlyTrend.filter(m => m.year === yr).reduce((s,m) => s+m.count, 0);
                  return tot > 0 ? (
                    <div style={{ marginTop:'14px', paddingTop:'12px', borderTop:`1px solid ${T.border}`, textAlign:'center' }}>
                      <span style={{ fontSize:'12px', color: T.textSub }}>Total {yr}: <strong style={{ color:'#3b82f6', fontSize:'14px' }}>{tot}</strong> célula{tot!==1?'s':''}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mcs-footer" style={{ borderTopColor: T.border }}>
          <span style={{ color: T.textSub, fontSize:'11px' }}>📅 {new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}</span>
          <button className="mcs-footer-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalCellStatistics;