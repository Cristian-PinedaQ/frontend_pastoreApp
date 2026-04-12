// ============================================
// ModalCellStatistics.jsx  –  Elite Modern v3
// Props: isOpen, onClose, data, isDarkMode
// ============================================
// data debe tener:
//   • campos de /api/v1/cells/statistics
//   • data.cells = array de CellGroupDTO (desde /api/v1/cells)
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  X, BarChart2, Users, Home, Sprout, Settings,
  TrendingUp, Activity, AlertTriangle, PauseCircle,
  StopCircle, CheckCircle2, Calendar, MapPin, Trophy,
  Info, Zap,
} from 'lucide-react';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Extrae conteo base de miembros probando todos los nombres de campo posibles
const extractBaseCount = (c) =>
  c.currentMemberCount ?? c.memberCount ?? c.members ??
  c.totalMiembros ?? c.miembros ?? c.count ?? 0;

const ModalCellStatistics = ({ isOpen, onClose, data, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setActiveTab('overview');
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── 1. Stats desde /api/v1/cells/statistics ─────────────────────
  // Nombres exactos devueltos por el backend Java
  const stats = useMemo(() => {
    if (!data) return null;
    return {
      total:         data.totalCells       ?? data.total         ?? 0,
      activas:       data.activeCells      ?? data.activas       ?? 0,
      incompletas:   data.incompleteCells  ?? data.incompletas   ?? 0,
      suspendidas:   data.suspendedCells   ?? data.suspendidas   ?? 0,
      inactivas:     data.inactiveCells    ?? data.inactivas     ?? 0,
      multiplicando: data.multiplyingCells ?? data.multiplicando ?? 0,
    };
  }, [data]);

  // ── 2. Analytics calculados desde data.cells ────────────────────
  // analytics DEBE declararse antes de totalMembers
  const analytics = useMemo(() => {
    const cells = data?.cells || [];
    if (!cells.length) return null;

    let totalMembers = 0, totalCapacity = 0;
    const cellsWithMembers = [];

    cells.forEach(c => {
      const base        = extractBaseCount(c);
      const leaderCount = ((c.groupLeaderId || c.groupLeaderName || c.mainLeaderId || c.mainLeaderName) ? 1 : 0)
                        + ((c.hostId    || c.hostName)    ? 1 : 0)
                        + ((c.timoteoId || c.timoteoName) ? 1 : 0);
      const census = base + leaderCount;
      const cap    = c.maxCapacity ?? 0;

      totalMembers  += census;
      totalCapacity += cap;

      if (census > 0) {
        cellsWithMembers.push({ name: c.name || c.cellName || 'Sin nombre', count: census, cap });
      }
    });

    const avgMembers = cells.length > 0 ? (totalMembers / cells.length).toFixed(1) : 0;
    const occupancy  = totalCapacity > 0 ? Math.round((totalMembers / totalCapacity) * 100) : 0;

    const parseDateSafe = (raw) => {
      if (!raw) return null;
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1900) return d;
        if (typeof raw === 'string' && raw.includes('/')) {
          const p = raw.split('/');
          const d2 = new Date(+p[2], +p[1] - 1, +p[0]);
          if (!isNaN(d2.getTime())) return d2;
        }
      } catch (_) {}
      return null;
    };

    const byYear = {}, byMonthKey = {};
    cells.forEach(c => {
      const d = parseDateSafe(c.creationDate || c.createdAt || c.creationDateFormatted);
      if (!d) return;
      const y  = d.getFullYear();
      const mk = `${y}-${String(d.getMonth()).padStart(2,'0')}`;
      byYear[y]      = (byYear[y]      || 0) + 1;
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
      const dist   = c.districtLabel || c.district || 'Sin distrito';
      const base   = extractBaseCount(c);
      const lCount = ((c.groupLeaderId || c.groupLeaderName || c.mainLeaderId || c.mainLeaderName) ? 1 : 0)
                   + ((c.hostId    || c.hostName)    ? 1 : 0)
                   + ((c.timoteoId || c.timoteoName) ? 1 : 0);
      if (!districts[dist]) districts[dist] = { cells: 0, members: 0 };
      districts[dist].cells   += 1;
      districts[dist].members += base + lCount;
    });

    return {
      totalMembers, totalCapacity,
      avgMembers: parseFloat(avgMembers),
      occupancy,
      yearlyEntries: Object.entries(byYear).sort((a, b) => b[0] - a[0]),
      monthlyTrend, maxMonthly, districts,
      topCells: [...cellsWithMembers].sort((a, b) => b.count - a.count).slice(0, 5),
      hasDates: Object.keys(byYear).length > 0,
    };
  }, [data]);

  // ── Guard (después de ambos useMemo) ─────────────────────────────
  if (!isOpen || !data || !stats) return null;

  // ── 3. Censo: cascada de fuentes ────────────────────────────────
  // analytics.totalMembers → calculado (incluye liderazgo)
  // data.totalMembers      → campo directo del backend (si fue agregado)
  // data.cells reduce      → suma cruda como último recurso
  const totalMembers =
    analytics?.totalMembers
    ?? data.totalMembers
    ?? data.census
    ?? data.totalCenso
    ?? (data.cells?.reduce((acc, c) => acc + extractBaseCount(c), 0) ?? 0);

  const pct = (v) => stats.total > 0 ? Math.round((v / stats.total) * 100) : 0;

  const buildDonut = () => {
    if (stats.total === 0) return 'conic-gradient(#e2e8f0 0deg 360deg)';
    const segs = [
      { v: stats.activas,     c: '#6366f1' },
      { v: stats.incompletas, c: '#f59e0b' },
      { v: stats.suspendidas, c: '#f43f5e' },
      { v: stats.inactivas,   c: '#94a3b8' },
    ].filter(s => s.v > 0);
    let a = 0;
    return `conic-gradient(${segs.map(s => {
      const st = a; a += (s.v / stats.total) * 360;
      return `${s.c} ${st}deg ${a}deg`;
    }).join(', ')})`;
  };

  const statusCards = [
    { key:'activas',     label:'Activas',              val:stats.activas,     icon:<CheckCircle2 size={17}/>, color:'#6366f1', light:'text-indigo-600 bg-indigo-50 border-indigo-100', dark:'dark:text-indigo-300 dark:bg-indigo-500/10 dark:border-indigo-500/20', bar:'bg-indigo-500' },
    { key:'incompletas', label:'Liderazgo incompleto', val:stats.incompletas, icon:<AlertTriangle size={17}/>, color:'#f59e0b', light:'text-amber-600 bg-amber-50 border-amber-100',   dark:'dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',   bar:'bg-amber-400' },
    { key:'suspendidas', label:'Suspendidas',          val:stats.suspendidas, icon:<PauseCircle  size={17}/>, color:'#f43f5e', light:'text-rose-600 bg-rose-50 border-rose-100',       dark:'dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/20',     bar:'bg-rose-500'  },
    { key:'inactivas',   label:'Inactivas',            val:stats.inactivas,   icon:<StopCircle   size={17}/>, color:'#94a3b8', light:'text-slate-500 bg-slate-100 border-slate-200',   dark:'dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20', bar:'bg-slate-400' },
  ];

  const TABS = [
    { id:'overview', label:'Resumen',     icon:<Activity   size={14}/>, show:true },
    { id:'members',  label:'Censo',       icon:<Users      size={14}/>, show:true },
    { id:'growth',   label:'Crecimiento', icon:<TrendingUp size={14}/>, show:analytics?.hasDates },
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-md"
      style={{ animation: 'fadeIn 0.2s ease' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl flex flex-col bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] h-[95dvh] sm:h-auto sm:max-h-[92vh] border border-slate-200/80 dark:border-white/8 shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative shrink-0 flex items-center justify-between px-5 sm:px-8 py-5 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/6">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/6 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">Visiometría de Células</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-indigo-400">Dashboard CBI</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="relative z-10 p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100 dark:hover:border-red-500/20 transition-all active:scale-90">
            <X size={18} />
          </button>
        </div>

        {/* TABS */}
        <div className="shrink-0 bg-slate-50 dark:bg-black/20 border-b border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar">
          <div className="flex px-4 sm:px-8 min-w-max">
            {TABS.filter(t => t.show).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] border-b-2 transition-all whitespace-nowrap ${activeTab===t.id?'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400':'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-900 custom-scrollbar">

          {/* ══ OVERVIEW ══ */}
          {activeTab === 'overview' && (
            <div className="space-y-5 sm:space-y-7">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

                {/* Donut */}
                <div className="bg-white dark:bg-slate-800/60 rounded-[1.8rem] p-5 sm:p-7 border border-slate-100 dark:border-white/6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex-shrink-0 shadow-xl" style={{ background: buildDonut() }}>
                    <div className="absolute inset-0 m-5 sm:m-6 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{stats.total}</span>
                      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mt-0.5">células</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    {statusCards.filter(s => s.val > 0).map(s => (
                      <div key={s.key} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{s.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{s.val}</span>
                          <span className="text-[9px] font-semibold text-slate-400">{pct(s.val)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPIs 2x2 */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white dark:bg-slate-800/60 rounded-[1.5rem] p-4 sm:p-6 border border-slate-100 dark:border-white/6 shadow-sm flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-transform">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/12 flex items-center justify-center text-indigo-600 dark:text-indigo-400"><Home size={22}/></div>
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{stats.total}</div>
                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Células</div>
                  </div>

                  {/* ✅ Censo fixed */}
                  <div className="bg-white dark:bg-slate-800/60 rounded-[1.5rem] p-4 sm:p-6 border border-indigo-100 dark:border-indigo-500/15 shadow-sm flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-transform">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"><Users size={22}/></div>
                    <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">
                      {totalMembers > 0 ? totalMembers : <span className="text-slate-300 dark:text-slate-600 text-2xl">—</span>}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 dark:text-indigo-500">Censo</div>
                  </div>

                  <div className="bg-white dark:bg-slate-800/60 rounded-[1.5rem] p-4 sm:p-6 border border-slate-100 dark:border-white/6 shadow-sm flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-transform">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400"><Settings size={22}/></div>
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{analytics?.avgMembers ?? '—'}</div>
                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Promedio</div>
                  </div>

                  <div className={`bg-white dark:bg-slate-800/60 rounded-[1.5rem] p-4 sm:p-6 border shadow-sm flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-transform ${stats.multiplicando>0?'border-emerald-100 dark:border-emerald-500/20':'border-slate-100 dark:border-white/6 opacity-40 grayscale'}`}>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${stats.multiplicando>0?'bg-emerald-500 shadow-emerald-500/30 animate-pulse':'bg-slate-300'}`}><Sprout size={22}/></div>
                    <div className={`text-3xl sm:text-4xl font-black tracking-tight leading-none ${stats.multiplicando>0?'text-emerald-600 dark:text-emerald-400':'text-slate-400'}`}>{stats.multiplicando}</div>
                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Expansión</div>
                  </div>
                </div>
              </div>

              {/* Monitor */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                  <h3 className="text-[11px] sm:text-xs font-black text-slate-700 dark:text-white uppercase tracking-[0.2em]">Monitor de Estado</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {statusCards.map((c, i) => (
                    <div key={c.key} className={`bg-white dark:bg-slate-800/60 p-4 sm:p-5 rounded-[1.5rem] border shadow-sm ${c.light} ${c.dark}`} style={{ animationDelay:`${i*0.08}s` }}>
                      <div className="flex justify-between items-start mb-3">
                        <div className={`p-2 rounded-lg border ${c.light} ${c.dark}`}>{c.icon}</div>
                        <span className="text-[10px] font-black opacity-60">{pct(c.val)}%</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-0.5">{c.val}</div>
                      <div className="text-[9px] font-black uppercase tracking-wider mb-3 opacity-70">{c.label}</div>
                      <div className="h-1 w-full bg-slate-100 dark:bg-black/30 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${c.bar}`} style={{ width:`${pct(c.val)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen Rápido */}
              {stats.total > 0 && (
                <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/6 rounded-[1.8rem] p-5 sm:p-7 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-1 h-5 bg-amber-400 rounded-full" />
                    <h3 className="text-[11px] sm:text-xs font-black text-slate-700 dark:text-white uppercase tracking-[0.2em]">Resumen Rápido</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stats.activas > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-500/8 rounded-xl border border-indigo-100 dark:border-indigo-500/15">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400"><strong className="text-slate-800 dark:text-white font-black">{pct(stats.activas)}%</strong> células activas</span>
                      </div>
                    )}
                    {stats.incompletas > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-500/8 rounded-xl border border-amber-100 dark:border-amber-500/15">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400"><strong className="text-slate-800 dark:text-white font-black">{stats.incompletas}</strong> con liderazgo incompleto</span>
                      </div>
                    )}
                    {totalMembers > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/6">
                        <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400"><strong className="text-slate-800 dark:text-white font-black">{totalMembers}</strong> personas en CBI</span>
                      </div>
                    )}
                    {stats.activas === stats.total && stats.total > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-black">¡Todas las células activas!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ CENSO ══ */}
          {activeTab === 'members' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-indigo-600 rounded-[1.8rem] p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-[5rem] -mr-8 -mt-8 pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Users size={18} className="text-indigo-200" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Población Ministerial</span>
                    </div>
                    <div className="text-5xl sm:text-7xl font-black tracking-tight leading-none">{totalMembers > 0 ? totalMembers : '—'}</div>
                    <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mt-2">Personas consolidadas en CBI</p>
                    {totalMembers === 0 && (
                      <p className="text-indigo-300/70 text-[10px] mt-1">Sin datos · pasa <code className="bg-white/10 px-1 rounded">data.cells</code> desde el padre</p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-1 gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="text-center sm:text-right">
                      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-300">Capacidad</div>
                      <div className="text-xl sm:text-2xl font-black">{analytics?.totalCapacity || '—'}</div>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-300">Ocupación</div>
                      <div className={`text-xl sm:text-2xl font-black ${(analytics?.occupancy??0)>80?'text-rose-300':(analytics?.occupancy??0)>60?'text-amber-300':'text-emerald-300'}`}>{analytics?.occupancy??0}%</div>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-300">Promedio</div>
                      <div className="text-xl sm:text-2xl font-black">{analytics?.avgMembers ?? '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {(analytics?.totalCapacity ?? 0) > 0 && (
                <div className="bg-white dark:bg-slate-800/60 p-5 sm:p-7 rounded-[1.8rem] border border-slate-100 dark:border-white/6 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="text-indigo-500" size={15} />
                      <span className="text-[11px] font-black text-slate-700 dark:text-white uppercase tracking-[0.15em]">Disponibilidad Operativa</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400">{analytics.totalMembers} / {analytics.totalCapacity}</span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 dark:bg-black/30 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${analytics.occupancy>80?'bg-rose-500':analytics.occupancy>60?'bg-amber-400':'bg-indigo-500'}`} style={{ width:`${Math.min(analytics.occupancy,100)}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Bajo</span><span>Óptimo</span><span>Saturación</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {analytics && Object.keys(analytics.districts).length > 0 && (
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/6 rounded-[1.8rem] p-5 sm:p-7 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest"><MapPin size={15} className="text-indigo-500"/> Por Distrito</h4>
                      <span className="text-[9px] font-black text-slate-400 uppercase px-2.5 py-1 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/8">Geo</span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(analytics.districts).map(([dist, info]) => (
                        <div key={dist} className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 transition-colors">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mr-3">{dist}</span>
                          <div className="flex gap-4 shrink-0">
                            <div className="text-center"><div className="text-xs font-black text-slate-800 dark:text-white">{info.cells}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Cels</div></div>
                            <div className="text-center"><div className="text-xs font-black text-indigo-600 dark:text-indigo-400">{info.members}</div><div className="text-[8px] font-bold text-slate-400 uppercase">Censo</div></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analytics && analytics.topCells.length > 0 && (
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/6 rounded-[1.8rem] p-5 sm:p-7 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest"><Trophy size={15} className="text-amber-500"/> Elite de Células</h4>
                      <span className="text-[9px] font-black text-slate-400 uppercase px-2.5 py-1 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/8">Top 5</span>
                    </div>
                    <div className="space-y-4">
                      {analytics.topCells.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 group">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0 ${i===0?'bg-amber-400 text-white shadow-md shadow-amber-400/30':i===1?'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300':'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>{i+1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors truncate mr-2">{c.name}</span>
                              <span className="text-xs font-black text-slate-900 dark:text-white flex-shrink-0">{c.count}</span>
                            </div>
                            <div className="h-1 w-full bg-slate-100 dark:bg-black/30 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${i===0?'bg-amber-400':'bg-indigo-500'}`} style={{ width:`${(c.count/(analytics.topCells[0]?.count||1))*100}%`, transitionDelay:`${i*0.1}s` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!analytics && (
                  <div className="col-span-full bg-amber-50 dark:bg-amber-500/8 border border-amber-100 dark:border-amber-500/20 rounded-[1.5rem] p-6 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black text-amber-700 dark:text-amber-400">Sin datos de células</p>
                      <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 mt-1">Fusiona el array <code className="bg-amber-100 dark:bg-amber-500/10 px-1 rounded">cells</code> en <code className="bg-amber-100 dark:bg-amber-500/10 px-1 rounded">openStats()</code> del componente padre.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ CRECIMIENTO ══ */}
          {activeTab === 'growth' && analytics?.hasDates && (
            <div className="space-y-5 sm:space-y-6">
              <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/6 rounded-[1.8rem] p-5 sm:p-8 shadow-sm">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                  <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Aperturas por Año</h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {analytics.yearlyEntries.map(([year, count]) => (
                    <div key={year} className="flex-1 min-w-[110px] p-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/6 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-all duration-300 group">
                      <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight group-hover:scale-110 transition-transform">{count}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{year}</span>
                      <div className="w-6 h-0.5 bg-indigo-400/30 rounded-full group-hover:w-10 transition-all" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/6 rounded-[1.8rem] p-5 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                      <h4 className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Tendencia Mensual</h4>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 ml-3.5">Últimos 12 meses</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                    <Zap size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
                  </div>
                </div>
                <div className="h-52 sm:h-64 flex items-end gap-1 sm:gap-2 px-1">
                  {analytics.monthlyTrend.map((m, i) => {
                    const barH  = m.count > 0 ? Math.max((m.count/analytics.maxMonthly)*100, 8) : 0;
                    const isCur = i === analytics.monthlyTrend.length - 1;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar">
                        <span className={`text-[9px] font-black mb-1 ${m.count>0?'text-slate-700 dark:text-slate-300':'opacity-0'}`}>{m.count||''}</span>
                        <div className="w-full bg-slate-100 dark:bg-black/30 rounded-lg overflow-hidden h-40 sm:h-52 flex items-end">
                          <div className={`w-full rounded-lg transition-all duration-[1.2s] group-hover/bar:opacity-80 ${isCur?'bg-emerald-500':'bg-indigo-500'}`} style={{ height:`${barH}%`, transitionDelay:`${i*40}ms` }} />
                        </div>
                        <span className={`text-[8px] sm:text-[9px] font-black mt-1.5 uppercase tracking-wider ${isCur?'text-indigo-600 dark:text-indigo-400':'text-slate-400 dark:text-slate-600'}`}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const yr  = new Date().getFullYear();
                  const tot = analytics.monthlyTrend.filter(m => m.year===yr).reduce((s,m) => s+m.count, 0);
                  return tot > 0 ? (
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/6 flex items-center justify-center gap-2">
                      <Info size={14} className="text-indigo-500" />
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total {yr}: <strong className="text-indigo-600 dark:text-indigo-400 font-black text-sm">+{tot} células</strong></span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-8 py-4 sm:py-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/6">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/8">
            <Calendar size={13} className="text-indigo-500" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Última sincronía: {new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}
            </span>
          </div>
          <button onClick={onClose} className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-[0.25em] rounded-2xl transition-all active:scale-95 shadow-lg shadow-slate-900/20 dark:shadow-indigo-500/20">
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(40px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .custom-scrollbar::-webkit-scrollbar{width:4px}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
        .custom-scrollbar::-webkit-scrollbar-thumb{background-color:rgba(100,116,139,.2);border-radius:99px}
        .dark .custom-scrollbar::-webkit-scrollbar-thumb{background-color:rgba(71,85,105,.35)}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background-color:rgba(99,102,241,.5)}
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
  );
};

export default ModalCellStatistics;