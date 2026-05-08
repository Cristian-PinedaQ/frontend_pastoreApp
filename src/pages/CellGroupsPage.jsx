import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../apiService';
import { generateCellGroupsPDF } from '../services/cellGroupsPdfGenerator';
import nameHelper from '../services/nameHelper';
import ModalCreateCell from '../components/ModalCreateCell';
import ModalCellStatistics from '../components/ModalCellStatistics';
import ModalCellDetail from '../components/ModalCellDetail';
import ModalLeaderDetail from '../components/ModalLeaderDetail';
import PageHeader from '../components/PageHeader';
import StatsBar from '../components/StatsBar';
import {
  Home, House, MapPin, MoreHorizontal, HousePlus,
  FileDown, BarChart3, ShieldCheck, Clock, TrendingUp,
  LayoutGrid, List, RefreshCw, AlertTriangle, ChevronRight,
  ShieldAlert, Calendar, CheckCircle2, X, Search,
} from 'lucide-react';

const { getDisplayName } = nameHelper;

const CELL_STATUS_CONFIG = {
  ACTIVE:               { label:'Activa',            colorClass:'text-emerald-600 dark:text-emerald-400', bgClass:'bg-emerald-50 dark:bg-emerald-500/10',  borderClass:'border-emerald-100 dark:border-emerald-500/20', dotClass:'bg-emerald-500', icon:<ShieldCheck size={12}/> },
  INCOMPLETE_LEADERSHIP:{ label:'Liderazgo Parcial', colorClass:'text-amber-600 dark:text-amber-400',   bgClass:'bg-amber-50 dark:bg-amber-500/10',    borderClass:'border-amber-100 dark:border-amber-500/20',   dotClass:'bg-amber-500',  icon:<AlertTriangle size={12}/> },
  SUSPENDED:            { label:'Suspendida',         colorClass:'text-rose-600 dark:text-rose-400',     bgClass:'bg-rose-50 dark:bg-rose-500/10',      borderClass:'border-rose-100 dark:border-rose-500/20',     dotClass:'bg-rose-500',   icon:<ShieldAlert size={12}/> },
  INACTIVE:             { label:'Inactiva',           colorClass:'text-slate-600 dark:text-slate-400',   bgClass:'bg-slate-50 dark:bg-slate-500/10',    borderClass:'border-slate-200 dark:border-slate-500/20',   dotClass:'bg-slate-400',  icon:<MoreHorizontal size={12}/> },
};

const DISTRICT_CONFIG = {
  PASTORES: { label:'Pastores',    colorClass:'text-indigo-600 dark:text-indigo-400',  bgClass:'bg-indigo-50 dark:bg-indigo-500/10',   borderClass:'border-indigo-100 dark:border-indigo-500/20' },
  D1:       { label:'Distrito 1',  colorClass:'text-blue-600 dark:text-blue-400',      bgClass:'bg-blue-50 dark:bg-blue-500/10',       borderClass:'border-blue-100 dark:border-blue-500/20' },
  D2:       { label:'Distrito 2',  colorClass:'text-emerald-600 dark:text-emerald-400',bgClass:'bg-emerald-50 dark:bg-emerald-500/10', borderClass:'border-emerald-100 dark:border-emerald-500/20' },
  D3:       { label:'Distrito 3',  colorClass:'text-amber-600 dark:text-amber-400',    bgClass:'bg-amber-50 dark:bg-amber-500/10',     borderClass:'border-amber-100 dark:border-amber-500/20' },
};

const CellGroupsPage = () => {
  const [allCells, setAllCells]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [successMessage, setSuccessMessage]   = useState('');
  const [searchTerm, setSearchTerm]           = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [viewMode, setViewMode]               = useState('grid');
  const [filters, setFilters]                 = useState({ status:'ALL', district:'ALL', incompleteOnly:false });
  const [modals, setModals]                   = useState({ create:false, stats:false, detail:false, verify:false, leader:false });
  const [selectedCell, setSelectedCell]       = useState(null);
  const [selectedLeader, setSelectedLeader]   = useState(null);
  const [statsData, setStatsData]             = useState(null);
  const [, setVerificationResult]             = useState(null);

  const loadCells = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getCells();
      setAllCells(data || []);
    } catch (err) {
      setError('No se pudieron sincronizar las células');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCells(); }, [loadCells]);

  const filteredCells = useMemo(() => {
    return allCells
      .filter(c => {
        const matchesSearch     = !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mainLeaderName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus     = filters.status   === 'ALL' || c.status   === filters.status;
        const matchesDistrict   = filters.district === 'ALL' || c.district === filters.district;
        const matchesIncomplete = !filters.incompleteOnly || !c.hasAllLeadersActive;
        return matchesSearch && matchesStatus && matchesDistrict && matchesIncomplete;
      })
      .sort((a, b) => (a.status === 'ACTIVE' ? -1 : 1));
  }, [allCells, searchTerm, filters]);

  const handleExportPDF = () => {
    generateCellGroupsPDF(filteredCells, filters, filters.status !== 'ALL', { total: filteredCells.length });
  };

  const handleVerifyAll = async () => {
    try {
      setLoading(true);
      const result = await apiService.verifyAllCells();
      setVerificationResult(result);
      setSuccessMessage(`Auditoría exitosa. Líderes suspendidos reportados: ${result?.totalSuspended || 0}`);
      setTimeout(() => setSuccessMessage(''), 6000);
      loadCells();
    } catch (err) {
      setError('Error en verificación sistémica');
    } finally {
      setLoading(false);
    }
  };

  const openStats = async () => {
    try {
      setLoading(true);
      const stats = await apiService.getCellStatistics();
      setStatsData({ ...stats, cells: allCells });
      setModals(m => ({ ...m, stats: true }));
    } catch (err) {
      setError('Error cargando métricas');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = filters.status !== 'ALL' || filters.district !== 'ALL' || filters.incompleteOnly || searchTerm;

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 pb-24 animate-in fade-in px-3 sm:px-4 md:px-6 lg:px-8">

      {/* ALERTS */}
      {(error || successMessage) && (
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between border-2 ${error ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${error ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
              {error ? <ShieldAlert className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
            </div>
            <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest leading-relaxed">{error || successMessage}</span>
          </div>
          <button onClick={() => { setError(''); setSuccessMessage(''); }} className="p-2 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-xl transition-all shrink-0 ml-3">
            <X className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* PAGE HEADER */}
      <PageHeader
        icon={Home}
        title="Grupos de Altar"
        subtitle="Red de Cuidado Familiar"
        subtitleVariant="eyebrow"
        actions={
          <div className="flex items-center gap-2">
            {/* Exportar — solo icono hasta xl */}
            <button
              onClick={handleExportPDF}
              title="Exportar Planilla"
              className="group flex items-center gap-2 px-3 py-3 xl:px-5 xl:py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap"
            >
              <FileDown size={16} className="group-hover:translate-y-0.5 transition-transform shrink-0"/>
              <span className="hidden xl:inline">Exportar</span>
            </button>

            {/* Métricas — solo icono hasta xl */}
            <button
              onClick={openStats}
              title="Panel de Métricas"
              className="flex items-center gap-2 px-3 py-3 xl:px-5 xl:py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap"
            >
              <BarChart3 size={16} className="shrink-0"/>
              <span className="hidden xl:inline">Métricas</span>
            </button>

            {/* Aperturar — texto desde lg */}
            <button
              onClick={() => setModals(m => ({ ...m, create: true }))}
              title="Aperturar Altar"
              className="flex items-center gap-2 px-3 py-3 lg:px-5 lg:py-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              <HousePlus size={16} strokeWidth={2.5} className="shrink-0"/>
              <span className="hidden lg:inline">Aperturar</span>
            </button>
          </div>
        }
      />

      {/* STATS BAR */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <StatsBar>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <House size={14} className="text-emerald-500"/> {allCells.length} hogares
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <ShieldCheck size={14} className="text-indigo-500"/> Cobertura Total
          </div>
        </StatsBar>
      </div>

      {/* SEARCH & CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

        {/* ── MOBILE TOOLBAR ── */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 lg:hidden">
          {/* Search toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className={`flex items-center justify-center rounded-2xl border transition-all shrink-0 ${showMobileSearch || searchTerm ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
          >
            <Search size={17}/>
          </button>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
            className="flex-1 min-w-0 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 text-xs font-bold outline-none text-slate-800 dark:text-slate-200 appearance-none"
          >
            <option value="ALL">Todos los estados</option>
            {Object.entries(CELL_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* District filter */}
          <select
            value={filters.district}
            onChange={e => setFilters({...filters, district: e.target.value})}
            className="flex-1 min-w-0 h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 text-xs font-bold outline-none text-slate-800 dark:text-slate-200 appearance-none"
          >
            <option value="ALL">Todos los distritos</option>
            {Object.entries(DISTRICT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* View mode */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode==='grid' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <LayoutGrid size={16}/>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode==='list' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
              <List size={16}/>
            </button>
          </div>
        </div>

        {/* Mobile expandable search */}
        {showMobileSearch && (
          <div className="px-3 pb-3 lg:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                autoFocus
                type="text"
                placeholder="Nombre del grupo o líder..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-9 bg-slate-50 dark:bg-slate-950/50 rounded-2xl font-medium text-sm outline-none border border-slate-200 dark:border-slate-800 focus:border-indigo-300 dark:focus:border-indigo-700 transition-all text-slate-800 dark:text-slate-100"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14}/>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Alertas toggle + verify + results count */}
        <div className="flex items-center gap-2 px-3 pb-3 lg:hidden">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-2xl border border-slate-100 dark:border-slate-700 flex-1">
            <div className="relative shrink-0">
              <input type="checkbox" checked={filters.incompleteOnly} onChange={e => setFilters({...filters, incompleteOnly: e.target.checked})} className="sr-only peer"/>
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-amber-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"/>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Alertas</span>
          </label>

          <button
            onClick={handleVerifyAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all shrink-0"
          >
            <ShieldAlert size={14} className="text-amber-500"/> Auditoría
          </button>

          <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shrink-0">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{filteredCells.length}</span>
          </div>

          <button onClick={loadCells} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 active:rotate-180 duration-500">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>

        {/* Active filter pills — mobile */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 px-3 pb-3 overflow-x-auto lg:hidden">
            {searchTerm && (
              <span className="flex items-center gap-1.5 text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-full px-3 py-1.5 whitespace-nowrap">
                "{searchTerm.slice(0,12)}{searchTerm.length>12?'…':''}"
                <button onClick={() => setSearchTerm('')}><X size={10}/></button>
              </span>
            )}
            {filters.status !== 'ALL' && (
              <span className="flex items-center gap-1.5 text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 whitespace-nowrap">
                {CELL_STATUS_CONFIG[filters.status].label}
                <button onClick={() => setFilters({...filters, status:'ALL'})}><X size={10}/></button>
              </span>
            )}
            {filters.district !== 'ALL' && (
              <span className="flex items-center gap-1.5 text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full px-3 py-1.5 whitespace-nowrap">
                {DISTRICT_CONFIG[filters.district]?.label}
                <button onClick={() => setFilters({...filters, district:'ALL'})}><X size={10}/></button>
              </span>
            )}
            <button
              onClick={() => { setSearchTerm(''); setFilters({status:'ALL', district:'ALL', incompleteOnly:false}); }}
              className="ml-auto text-[10px] font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap"
            >
              Limpiar
            </button>
          </div>
        )}

        {/* ── DESKTOP TOOLBAR ── */}
        <div className="hidden lg:block p-5 lg:p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-1 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Identificar grupo por nombre o líder..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-12 pr-8 bg-slate-50 dark:bg-slate-950/50 rounded-[1.5rem] font-medium text-sm outline-none border border-transparent focus:border-indigo-200 dark:focus:border-indigo-800 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all text-slate-800 dark:text-slate-100"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14}/>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.2rem]">
                <button onClick={() => setViewMode('grid')} className={`flex items-center justify-center px-4 py-2 rounded-[1rem] transition-all text-[10px] font-bold uppercase tracking-widest ${viewMode==='grid'?'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400':'text-slate-400 hover:text-slate-600'}`}>
                  <LayoutGrid size={16}/> <span className="ml-2">Rejilla</span>
                </button>
                <button onClick={() => setViewMode('list')} className={`flex items-center justify-center px-4 py-2 rounded-[1rem] transition-all text-[10px] font-bold uppercase tracking-widest ${viewMode==='list'?'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400':'text-slate-400 hover:text-slate-600'}`}>
                  <List size={16}/> <span className="ml-2">Listado</span>
                </button>
              </div>

              <button onClick={handleVerifyAll} className="flex items-center gap-2 px-4 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-[1.2rem] font-bold text-[10px] uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-slate-600 transition-all active:scale-95 shadow-sm whitespace-nowrap">
                <ShieldAlert size={15} className="text-amber-500"/> Auditoría Masiva
              </button>

              <button onClick={loadCells} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-[1.2rem] hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 transition-all active:rotate-180 duration-500">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''}/>
              </button>
            </div>
          </div>

          {/* Desktop Filters */}
          <div className="grid grid-cols-4 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1">Estado de Célula</span>
              <select value={filters.status} onChange={e => setFilters({...filters, status:e.target.value})} className="w-full h-12 px-4 bg-white dark:bg-slate-800 rounded-xl font-medium text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-200 transition-all appearance-none">
                <option value="ALL">Visualizar Todos</option>
                {Object.entries(CELL_STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1">Distrito</span>
              <select value={filters.district} onChange={e => setFilters({...filters, district:e.target.value})} className="w-full h-12 px-4 bg-white dark:bg-slate-800 rounded-xl font-medium text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-200 transition-all appearance-none">
                <option value="ALL">Toda la Jurisdicción</option>
                {Object.entries(DISTRICT_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all w-full">
                <div className="relative shrink-0">
                  <input type="checkbox" checked={filters.incompleteOnly} onChange={e => setFilters({...filters, incompleteOnly:e.target.checked})} className="sr-only peer"/>
                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-amber-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"/>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Alertas de Liderazgo</span>
              </label>
            </div>
            <div className="flex items-end justify-end pb-0.5">
              <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 text-center">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{filteredCells.length} Resultados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div>
        {loading && filteredCells.length === 0 ? (
          <div className="text-center space-y-4">
            <RefreshCw size={36} className="mx-auto text-indigo-500 animate-spin"/>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sincronizando Células...</p>
          </div>

        ) : filteredCells.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] p-16 sm:p-24 text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} className="text-slate-400"/>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">Sin Coincidencias</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Prueba ajustando los filtros o borra tu búsqueda.</p>
            <button
              onClick={() => { setSearchTerm(''); setFilters({status:'ALL', district:'ALL', incompleteOnly:false}); }}
              className=" text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest hover:underline"
            >
              Reiniciar Filtros
            </button>
          </div>

        ) : viewMode === 'grid' ? (
          /* ── GRID VIEW ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-8">
            {filteredCells.map(cell => {
              const status   = CELL_STATUS_CONFIG[cell.status] || CELL_STATUS_CONFIG.INACTIVE;
              const district = DISTRICT_CONFIG[cell.district]  || { colorClass:'text-slate-600 dark:text-slate-400', bgClass:'bg-slate-50 dark:bg-slate-800', borderClass:'border-slate-200 dark:border-slate-700' };
              const occupancy= Math.round(((cell.currentMemberCount||0) / (cell.maxCapacity||12)) * 100);
              return (
                <div
                  key={cell.id}
                  onClick={() => { setSelectedCell(cell); setModals(m => ({ ...m, detail:true })); }}
                  className="group relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-800 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                >
                  <div className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 flex-1">
                    {/* Status & District */}
                    <div className="flex items-center justify-between gap-2">
                      <div className={`px-2.5 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${status.bgClass} ${status.colorClass} ${status.borderClass} border`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dotClass} animate-pulse`}/>
                        {status.label}
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl ${district.bgClass} ${district.colorClass} ${district.borderClass} border font-bold text-[9px] sm:text-[10px] tracking-widest uppercase`}>
                        {district.label || cell.district}
                      </div>
                    </div>

                    {/* Name & Leader */}
                    <div className="space-y-1.5">
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2">{cell.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-500 group-hover:text-white shrink-0 transition-colors">
                          <ShieldCheck size={11}/>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">{getDisplayName(cell.mainLeaderName)}</p>
                      </div>
                    </div>

                    {/* Occupancy */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={12} className={occupancy>90?'text-amber-500':'text-emerald-500'}/>
                          <span>Aforo</span>
                        </div>
                        <span className={occupancy>90?'text-amber-500 font-black':'text-indigo-600 dark:text-indigo-400 font-black'}>{occupancy}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50">
                        <div className={`h-full transition-all duration-700 rounded-full shadow-sm ${occupancy>90?'bg-amber-500':'bg-indigo-500'}`} style={{ width:`${Math.min(occupancy,100)}%` }}/>
                      </div>
                    </div>

                    {/* Meeting info */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <Calendar size={13} className="text-slate-400 shrink-0"/> <span className="truncate">{cell.meetingDay}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <MapPin size={13} className="text-slate-400 shrink-0"/> <span className="truncate">{cell.meetingAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover CTA */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 sm:p-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <div className="w-full bg-white dark:bg-slate-800 p-3 rounded-2xl text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between shadow-sm border border-slate-100 dark:border-slate-700">
                      <span>Ver Detalles</span>
                      <ChevronRight size={16} strokeWidth={2.5}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          /* ── LIST VIEW ── */
          <>
            {/* Mobile list — compact rows */}
            <div className="lg:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCells.map(cell => {
                const status   = CELL_STATUS_CONFIG[cell.status] || CELL_STATUS_CONFIG.INACTIVE;
                const district = DISTRICT_CONFIG[cell.district] || { label: cell.district, colorClass:'text-slate-600 dark:text-slate-400' };
                const occupancy= Math.round(((cell.currentMemberCount||0) / (cell.maxCapacity||12)) * 100);
                return (
                  <div
                    key={cell.id}
                    onClick={() => { setSelectedCell(cell); setModals(m => ({ ...m, detail:true })); }}
                    className="flex items-center gap-3 px-4 py-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-100 dark:border-indigo-800/50 shrink-0">
                      {cell.name?.[0]?.toUpperCase()}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{cell.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${district.colorClass}`}>{district.label}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-[9px] font-bold text-slate-400">{occupancy}% aforo</span>
                      </div>
                    </div>

                    {/* Status + chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${status.bgClass} ${status.colorClass} border ${status.borderClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}/>
                        {status.label}
                      </span>
                      <ChevronRight size={14} className="text-slate-300 dark:text-slate-600"/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Grupo Altar</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Liderazgo</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Distrito</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Censo / Cap.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                    {filteredCells.map(cell => {
                      const status   = CELL_STATUS_CONFIG[cell.status] || CELL_STATUS_CONFIG.INACTIVE;
                      const district = DISTRICT_CONFIG[cell.district]  || { label:cell.district, bgClass:'bg-slate-100 dark:bg-slate-800', colorClass:'text-slate-600 dark:text-slate-400', borderClass:'border-transparent' };
                      return (
                        <tr key={cell.id} onClick={() => { setSelectedCell(cell); setModals(m => ({ ...m, detail:true })); }} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-[1rem] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-100 dark:border-indigo-800/50 group-hover:scale-105 transition-transform shrink-0">
                                {cell.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{cell.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Clock size={11} className="text-slate-400"/>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{cell.meetingDay} • {cell.meetingTime}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={14} className="text-slate-400 dark:text-slate-500"/>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{getDisplayName(cell.mainLeaderName)}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold tracking-wide ${status.bgClass} ${status.colorClass} border ${status.borderClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}/>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold tracking-wide border ${district.bgClass} ${district.colorClass} ${district.borderClass}`}>{district.label}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 font-bold text-slate-900 dark:text-white">
                              <TrendingUp size={13} className="text-emerald-500"/>
                              <span className="text-base">{cell.currentMemberCount}</span>
                              <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">/ {cell.maxCapacity || '--'}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODALS */}
      <ModalCreateCell isOpen={modals.create} onClose={() => setModals(m => ({ ...m, create:false }))} onCreateSuccess={loadCells}/>
      <ModalCellStatistics isOpen={modals.stats} onClose={() => setModals(m => ({ ...m, stats:false }))} data={statsData}/>
      <ModalCellDetail
        isOpen={modals.detail}
        cell={selectedCell}
        onClose={() => setModals(m => ({ ...m, detail:false }))}
        onCellChanged={loadCells}
        onOpenLeaderDetail={async id => {
          const leader = await apiService.getLeaderById(id);
          setSelectedLeader(leader);
          setModals(m => ({ ...m, leader:true }));
        }}
      />
      <ModalLeaderDetail isOpen={modals.leader} leader={selectedLeader} onClose={() => setModals(m => ({ ...m, leader:false }))} onLeaderChanged={loadCells}/>
    </div>
  );
};

export default CellGroupsPage;