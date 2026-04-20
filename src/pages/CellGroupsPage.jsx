// CellGroupsPage.jsx — fixes:
// 1. openStats() fusiona allCells → data.cells llega al modal
// 2. Eliminado className duplicado en botón de métricas

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiService from '../apiService';
import { generateCellGroupsPDF } from '../services/cellGroupsPdfGenerator';
import nameHelper from '../services/nameHelper';
import ModalCreateCell from '../components/ModalCreateCell';
import ModalCellStatistics from '../components/ModalCellStatistics';
import ModalCellDetail from '../components/ModalCellDetail';
import ModalLeaderDetail from '../components/ModalLeaderDetail';
import { 
  Home, House, MapPin, MoreHorizontal, Search, HousePlus,
  FileDown, BarChart3, ShieldCheck, Clock, TrendingUp,
  LayoutGrid, List, RefreshCw, AlertTriangle, ChevronRight,
  ShieldAlert, Calendar, CheckCircle2, X
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
  const [viewMode, setViewMode]               = useState('grid');
  const [filters, setFilters]                 = useState({ status:'ALL', district:'ALL', incompleteOnly:false });
  const [modals, setModals]                   = useState({ create:false, stats:false, detail:false, verify:false, leader:false });
  const [selectedCell, setSelectedCell]       = useState(null);
  const [selectedLeader, setSelectedLeader]   = useState(null);
  const [statsData, setStatsData]             = useState(null);
  const [, setVerificationResult] = useState(null);

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
        const matchesSearch    = !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.mainLeaderName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus    = filters.status   === 'ALL' || c.status   === filters.status;
        const matchesDistrict  = filters.district === 'ALL' || c.district === filters.district;
        const matchesIncomplete= !filters.incompleteOnly || !c.hasAllLeadersActive;
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

  // ✅ FIX: fusiona allCells en data para que el modal pueda calcular el censo
  const openStats = async () => {
    try {
      setLoading(true);
      const stats = await apiService.getCellStatistics();
      setStatsData({
        ...stats,
        cells: allCells,   // ← array de CellGroupDTO ya cargado en la página
      });
      setModals(m => ({ ...m, stats: true }));
    } catch (err) {
      setError('Error cargando métricas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-24 animate-in fade-in p-4 md:p-6 lg:p-8">

      {/* ALERTS */}
      {(error || successMessage) && (
        <div className={`mb-8 p-6 rounded-[2rem] flex items-center justify-between animate-shake border-2 ${error ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${error ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
              {error ? <ShieldAlert className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
            </div>
            <span className="font-black text-[10px] md:text-xs uppercase tracking-widest leading-relaxed max-w-[80%]">{error || successMessage}</span>
          </div>
          <button onClick={() => { setError(''); setSuccessMessage(''); }} className="p-2.5 bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-xl transition-all shrink-0">
            <X className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-8 md:gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Home size={22} strokeWidth={2.5}/>
            </div>
            <div className="text-[10px] sm:text-xs font-black text-indigo-500 uppercase tracking-[0.3em] sm:tracking-[0.4em]">Red de Cuidado Familiar</div>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
            Grupos de <span className="text-indigo-600 dark:text-indigo-500">Altar</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-2">
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <House size={14} className="text-emerald-500"/> {allCells.length} hogares
            </p>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"/>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-500"/> Cobertura Total
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4">
          <button
            onClick={handleExportPDF}
            className="group flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 sm:px-8 py-3.5 sm:py-5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[1.5rem] font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap"
          >
            <FileDown size={18} className="group-hover:translate-y-0.5 transition-transform"/>
            <span className="hidden sm:inline">Exportar Planilla</span><span className="sm:hidden">Exportar</span>
          </button>

          {/* ✅ FIX: eliminado className duplicado */}
          <button
            onClick={openStats}
            className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 sm:px-8 py-3.5 sm:py-5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-[2rem] font-bold text-[10px] sm:text-xs uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all border border-indigo-100 dark:border-indigo-800/30 whitespace-nowrap"
          >
            <BarChart3 size={18}/>
            <span className="hidden sm:inline">Panel de Métricas</span><span className="sm:hidden">Métricas</span>
          </button>

          <button
            onClick={() => setModals(m => ({ ...m, create: true }))}
            className="flex w-full sm:w-auto justify-center items-center gap-2 px-6 sm:px-10 py-3.5 sm:py-5 bg-indigo-600 text-white rounded-[2rem] font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <HousePlus size={18} strokeWidth={3}/> Aperturar Altar
          </button>
        </div>
      </div>

      {/* SEARCH & CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-6">
            <div className="relative flex-1 group w-full">
              <input
                type="text"
                placeholder="Identificar grupo por nombre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-14 md:h-16 pl-12 md:pl-16 pr-6 bg-slate-50 dark:bg-slate-950/50 rounded-[1.5rem] font-medium text-sm outline-none border border-transparent focus:border-indigo-200 dark:focus:border-indigo-800 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 transition-all text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end overflow-x-auto no-scrollbar pb-2 lg:pb-0">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.2rem] shrink-0">
                <button onClick={() => setViewMode('grid')} className={`flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-[1rem] transition-all text-[10px] font-bold uppercase tracking-widest ${viewMode==='grid'?'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400':'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  <LayoutGrid size={18}/> <span className="hidden sm:inline ml-2">Rejilla</span>
                </button>
                <button onClick={() => setViewMode('list')} className={`flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 rounded-[1rem] transition-all text-[10px] font-bold uppercase tracking-widest ${viewMode==='list'?'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400':'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                  <List size={18}/> <span className="hidden sm:inline ml-2">Listado</span>
                </button>
              </div>

              <button onClick={handleVerifyAll} className="flex items-center gap-2 px-4 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-[1.2rem] font-bold text-[10px] uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-slate-600 transition-all shrink-0 active:scale-95 shadow-sm whitespace-nowrap">
                <ShieldAlert size={16} className="text-amber-500"/> <span className="hidden sm:inline">Auditoría Masiva</span>
              </button>

              <button onClick={loadCells} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-[1.2rem] hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shrink-0 active:rotate-180 duration-500" aria-label="Recargar">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
              </button>
            </div>
          </div>

          {/* FILTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-4 md:pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5 flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1">Estado de Célula</span>
              <select value={filters.status} onChange={e => setFilters({...filters, status:e.target.value})} className="w-full h-12 px-4 bg-white dark:bg-slate-800 rounded-xl font-medium text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-200 transition-all">
                <option value="ALL">Visualizar Todos</option>
                {Object.entries(CELL_STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1">Cobertura (Distrito)</span>
              <select value={filters.district} onChange={e => setFilters({...filters, district:e.target.value})} className="w-full h-12 px-4 bg-white dark:bg-slate-800 rounded-xl font-medium text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-slate-800 dark:text-slate-200 transition-all">
                <option value="ALL">Toda la Jurisdicción</option>
                {Object.entries(DISTRICT_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            </div>
            <div className="flex items-center sm:justify-start lg:justify-center mt-2 sm:mt-6">
              <label className="flex items-center gap-3 cursor-pointer group bg-slate-50 dark:bg-slate-800/50 px-4 md:px-6 py-2.5 md:py-3 rounded-[1rem] md:rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all w-full sm:w-auto">
                <div className="relative">
                  <input type="checkbox" checked={filters.incompleteOnly} onChange={e => setFilters({...filters, incompleteOnly:e.target.checked})} className="sr-only peer"/>
                  <div className="w-10 h-5 md:w-11 md:h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-amber-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all peer-checked:after:translate-x-5"/>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Alertas de Liderazgo</span>
              </label>
            </div>
            <div className="flex items-center sm:justify-end mt-2 sm:mt-6">
              <div className="px-4 md:px-6 py-2.5 md:py-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-[1rem] md:rounded-2xl border border-indigo-100 dark:border-indigo-800/50 w-full sm:w-auto text-center">
                <span className="text-[10px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{filteredCells.length} Resultados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div>
        {loading && filteredCells.length === 0 ? (
          <div className="p-20 text-center space-y-4">
            <RefreshCw size={40} className="mx-auto text-indigo-500 animate-spin"/>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Sincronizando Células...</p>
          </div>
        ) : filteredCells.length === 0 ? (
          <div className="px-4 md:px-0">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-16 md:p-24 text-center border border-slate-200 dark:border-slate-800">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-slate-400"/>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sin Coincidencias</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Prueba ajustando los filtros o borra tu búsqueda.</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredCells.map(cell => {
              const status   = CELL_STATUS_CONFIG[cell.status] || CELL_STATUS_CONFIG.INACTIVE;
              const district = DISTRICT_CONFIG[cell.district]  || { colorClass:'text-slate-600 dark:text-slate-400', bgClass:'bg-slate-50 dark:bg-slate-800', borderClass:'border-slate-200 dark:border-slate-700' };
              const occupancy= Math.round(((cell.currentMemberCount||0) / (cell.maxCapacity||12)) * 100);
              return (
                <div
                  key={cell.id}
                  onClick={() => { setSelectedCell(cell); setModals(m => ({ ...m, detail:true })); }}
                  className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-800 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                >
                  <div className="p-6 md:p-8 space-y-6 md:space-y-8 flex-1">
                    <div className="flex items-center justify-between">
                      <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${status.bgClass} ${status.colorClass} ${status.borderClass} border`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status.dotClass} animate-pulse`}/>
                        {status.label}
                      </div>
                      <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl ${district.bgClass} ${district.colorClass} ${district.borderClass} border font-bold text-[10px] tracking-widest uppercase`}>
                        {district.label || cell.district}
                      </div>
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2">{cell.name}</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-500 group-hover:text-white shrink-0 transition-colors">
                          <ShieldCheck size={12}/>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">{getDisplayName(cell.mainLeaderName)}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={14} className={occupancy>90?'text-amber-500':'text-emerald-500'}/>
                          <span>Aforo</span>
                        </div>
                        <span className={occupancy>90?'text-amber-500 font-black':'text-indigo-600 dark:text-indigo-400 font-black'}>{occupancy}%</span>
                      </div>
                      <div className="w-full h-2 md:h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/50">
                        <div className={`h-full transition-all duration-700 rounded-full shadow-sm ${occupancy>90?'bg-amber-500':'bg-indigo-500'}`} style={{ width:`${Math.min(occupancy,100)}%` }}/>
                      </div>
                    </div>
                    <div className="pt-6 md:pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <Calendar size={16} className="text-slate-400 dark:text-slate-500"/> <span className="truncate">{cell.meetingDay}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
                        <MapPin size={16} className="text-slate-400 dark:text-slate-500 shrink-0"/> <span className="truncate">{cell.meetingAddress}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 md:p-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <div className="w-full bg-white dark:bg-slate-800 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between shadow-sm border border-slate-100 dark:border-slate-700">
                      <span>Ver Detalles</span>
                      <ChevronRight size={18} strokeWidth={2.5}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
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
                                <Clock size={12} className="text-slate-400"/>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{cell.meetingDay} • {cell.meetingTime}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-slate-400 dark:text-slate-500"/>
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
                            <TrendingUp size={14} className="text-emerald-500"/>
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