import React, { useState, useEffect, useCallback } from "react";
import { 
  X, 
  Home, 
  ShieldCheck, 
  Users, 
  Search, 
  UserPlus, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  PauseCircle, 
  StopCircle, 
  FileText, 
  MapPin,  
  TrendingUp, 
  Save, 
  Unlink, 
  Info,
  Plus,
  Loader2,
} from 'lucide-react';
import apiService from "../apiService";
import { logUserAction } from "../utils/securityLogger";
import nameHelper from "../services/nameHelper";
import { generateCellDetailPDF } from "../services/cellDetailPdfGenerator";

const { getDisplayName } = nameHelper;

const STATUS_MAP = {
  ACTIVE: { label: "Activa", icon: CheckCircle2, color: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  INCOMPLETE_LEADERSHIP: { label: "Liderazgo Incompleto", icon: AlertTriangle, color: "amber", bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  INACTIVE: { label: "Inactiva", icon: StopCircle, color: "slate", bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400" },
  SUSPENDED: { label: "Suspendida", icon: PauseCircle, color: "rose", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
};

const TABS = [
  { id: "info", label: "Información", icon: Info },
  { id: "members", label: "Miembros", icon: Users },
  { id: "add", label: "Nuevo Miembro", icon: UserPlus },
  { id: "edit", label: "Configuración", icon: Edit3 },
];

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DISTRICTS = ["Sector Pastores", "Jurisdicción D1", "Jurisdicción D2", "Jurisdicción D3"];

const ModalCellDetail = ({ isOpen, onClose, cell: initialCell, onCellChanged }) => {
  const [cell, setCell] = useState(initialCell);
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState("");
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Edit state
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    if (initialCell) {
      setCell(initialCell);
      setEditForm({ ...initialCell });
    }
  }, [initialCell]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (activeTab === 'members' || activeTab === 'add') loadMembers();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, activeTab, cell?.id]);

  const loadMembers = useCallback(async () => {
    if (!cell?.id) return;
    setLoadingMembers(true);
    try {
      const raw = await apiService.getCellMembers(cell.id);
      setMembers(raw || []);
    } catch (err) {
      setError("Error al sincronizar integrantes");
    } finally {
      setLoadingMembers(false);
    }
  }, [cell?.id]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await apiService.verifyCell(cell.id);
      setCell(prev => ({ ...prev, status: result.status }));
      if (onCellChanged) onCellChanged();
      logUserAction("verify_cell", { cellId: cell.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditLoading(true);
    try {
      await apiService.updateCell(cell.id, editForm);
      setCell(prev => ({ ...prev, ...editForm }));
      if (onCellChanged) onCellChanged();
      setActiveTab("info");
    } catch (err) {
      setError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) return;
    setSearching(true);
    try {
      const all = await apiService.getAllMembers();
      const q = searchTerm.toLowerCase();
      setSearchResults(all.filter(m => m.name?.toLowerCase().includes(q) || m.document?.includes(q)).slice(0, 10));
    } catch (err) {
      setError("Error en búsqueda");
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (member) => {
    setLoading(true);
    try {
      await apiService.addMemberToCell(cell.id, member.id);
      await loadMembers();
      setCell(prev => ({ ...prev, currentMemberCount: (prev.currentMemberCount || 0) + 1 }));
      setActiveTab("members");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkMember = (member) => {
    setConfirmDialog({
      title: "¿Desvincular Integrante?",
      message: `El registro de ${member.name} será omitido de esta célula.`,
      action: async () => {
        setLoading(true);
        try {
          await apiService.removeMemberFromCell(cell.id, member.id);
          await loadMembers();
          setCell(prev => ({ ...prev, currentMemberCount: Math.max(0, (prev.currentMemberCount || 1) - 1) }));
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  if (!isOpen || !cell) return null;

  const status = STATUS_MAP[cell.status] || STATUS_MAP.ACTIVE;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-6xl bg-white dark:bg-[#0f172a] sm:rounded-[3rem] shadow-2xl flex flex-col h-full sm:h-[85vh] overflow-hidden border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-12 duration-500">
        
        {/* HEADER SECTION */}
        <div className="relative pt-10 px-10 pb-2 shrink-0 overflow-hidden">
           <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
           
           <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 relative z-10">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 shrink-0 border border-white/10">
                    <Home className="w-10 h-10 text-white" />
                 </div>
                 <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`px-4 py-1.5 ${status.bg} ${status.text} text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-white/5 flex items-center gap-2`}>
                          <status.icon size={14} className="animate-pulse" /> {status.label}
                       </span>
                       {cell.isMultiplying && (
                         <span className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-emerald-500/20">🌱 Multiplicación</span>
                       )}
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{cell.name}</h2>
                 </div>
              </div>

              <div className="flex items-center gap-4 w-full xl:w-auto overflow-x-auto no-scrollbar pb-2 xl:pb-0">
                 <button onClick={handleVerify} disabled={loading} className="flex-1 sm:flex-none h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <ShieldCheck size={20} />} Verificar
                 </button>
                 <button onClick={() => generateCellDetailPDF(cell, members)} className="h-14 w-14 sm:w-auto sm:px-8 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-[1.2rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3">
                    <FileText size={20} /> <span className="hidden sm:inline">Exportar PDF</span>
                 </button>
                 <button onClick={onClose} className="h-14 w-14 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-[1.2rem] transition-all flex items-center justify-center"><X size={24} /></button>
              </div>
           </div>

           {/* NAVIGATION TABS */}
           <div className="flex gap-8 mt-10 border-b border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative pb-5 flex items-center gap-3 transition-all ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-60'}`}
                >
                  <tab.icon size={18} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">{tab.label}</span>
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                </button>
              ))}
           </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-50/30 dark:bg-black/20">
           {activeTab === 'info' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-2 space-y-8 text-slate-800 dark:text-slate-200">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { label: 'COBERTURA 12', name: cell.mainLeaderName, icon: ShieldCheck, color: 'indigo' },
                        { label: 'LÍDER DE GRUPO', name: cell.groupLeaderName, icon: Users, color: 'emerald' },
                        { label: 'ANFITRIÓN', name: cell.hostName, icon: Home, color: 'amber' },
                        { label: 'TIMOTEO', name: cell.timoteoName, icon: TrendingUp, color: 'violet' }
                      ].map((r, i) => (
                        <div key={i} className="p-6 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 flex items-center gap-5 hover:border-indigo-500/30 transition-all shadow-sm">
                           <div className={`w-14 h-14 bg-${r.color}-500/10 rounded-2xl flex items-center justify-center text-${r.color}-500 shadow-inner`}>
                              <r.icon size={28} />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{r.label}</p>
                              <p className="font-black text-base truncate">{r.name || 'SIN ASIGNAR'}</p>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="p-8 bg-white dark:bg-[#1a2332] rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5 space-y-6">
                      <div className="flex items-center gap-3">
                         <MapPin className="text-indigo-500" size={20} />
                         <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Logística de Altar</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Día Ministerial</p>
                            <p className="font-black text-sm">{cell.meetingDay || 'S.N.'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Horario Pactado</p>
                            <p className="font-black text-sm">{cell.meetingTimeFormatted || cell.meetingTime || 'S.N.'}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sector / Distrito</p>
                            <p className="font-black text-sm">{cell.district || 'S.N.'}</p>
                         </div>
                      </div>
                      <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación Física</p>
                         <p className="font-black text-sm">{cell.meetingAddress || 'S.N.'}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="p-10 bg-indigo-600 rounded-[3rem] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                      <p className="text-[10px] font-black text-indigo-100/60 uppercase tracking-[0.3em] mb-6">Métrica de Censo</p>
                      <div className="flex items-end gap-3 mb-8">
                         <span className="text-7xl font-black leading-none">{cell.currentMemberCount || 0}</span>
                         <span className="text-2xl font-black text-indigo-100/40 mb-2 uppercase tracking-tighter">/ {cell.maxCapacity || 12}</span>
                      </div>
                      <div className="h-4 bg-white/20 rounded-full overflow-hidden border border-white/10">
                         <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min(100, ((cell.currentMemberCount || 0) / (cell.maxCapacity || 12)) * 100)}%` }} />
                      </div>
                   </div>

                   {cell.notes && (
                     <div className="p-8 bg-white dark:bg-[#1a2332] rounded-[2.5rem] border-2 border-slate-100 dark:border-white/5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Anotaciones Ministeriales</p>
                        <p className="text-sm font-bold leading-relaxed opacity-80 italic">"{cell.notes}"</p>
                     </div>
                   )}
                </div>
             </div>
           )}

           {activeTab === 'members' && (
             <div className="animate-in slide-in-from-right-4 duration-500 h-full">
                {loadingMembers ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando membresía...</p>
                   </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                     {members.map(m => (
                       <div key={m.id} className="p-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-indigo-500/40 transition-all shadow-sm">
                          <div className="flex items-center gap-5">
                             <div className="w-14 h-14 bg-slate-50 dark:bg-black/20 rounded-2xl flex items-center justify-center font-black text-indigo-500 text-xl shadow-inner">{m.name?.[0].toUpperCase()}</div>
                             <div className="min-w-0">
                                <h4 className="font-black text-sm uppercase tracking-tight truncate max-w-[120px]">{m.name}</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.document || '---'}</p>
                             </div>
                          </div>
                          <button onClick={() => handleUnlinkMember(m)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"><Unlink size={18} /></button>
                       </div>
                     ))}
                     <button onClick={() => setActiveTab('add')} className="p-8 border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-500 transition-all opacity-60 hover:opacity-100 group">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Vincular Integrante</span>
                     </button>
                  </div>
                )}
             </div>
           )}

           {activeTab === 'add' && (
             <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500 py-10">
                <div className="text-center mb-12">
                   <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-indigo-500 mx-auto mb-6 shadow-inner">
                      <UserPlus size={48} />
                   </div>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Vinculación de Red</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Expande el censo ministerial integrando nuevos discípulos</p>
                </div>

                <div className="relative group mb-12">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
                   <input
                     type="text"
                     placeholder="Buscar por Nombre o Documento..."
                     className="w-full h-20 pl-16 pr-8 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-lg transition-all shadow-lg shadow-indigo-500/5"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                     onKeyUp={e => e.key === 'Enter' && handleSearch()}
                   />
                </div>

                {searching ? (
                   <div className="flex justify-center py-10"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-4">
                     {searchResults.map(m => (
                       <button key={m.id} onClick={() => handleAddMember(m)} className="w-full p-6 bg-white dark:bg-[#1a2332] rounded-[2rem] border-2 border-slate-100 dark:border-white/5 flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/20 transition-all active:scale-95 shadow-sm">
                          <div className="flex items-center gap-6">
                             <div className="w-16 h-16 bg-slate-50 dark:bg-black/20 rounded-2xl flex items-center justify-center font-black text-indigo-500 text-2xl shadow-inner">{m.name[0]}</div>
                             <div className="text-left">
                                <h4 className="font-black text-base uppercase tracking-tight">{m.name}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.document}</p>
                             </div>
                          </div>
                          <Plus className="text-emerald-500 group-hover:scale-150 transition-transform" size={24} />
                       </button>
                     ))}
                  </div>
                ) : searchTerm.length > 2 && (
                  <div className="p-12 text-center bg-slate-100/50 dark:bg-black/20 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-white/5">
                     <Users className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron registros activos</p>
                  </div>
                )}
             </div>
           )}

           {activeTab === 'edit' && (
             <div className="animate-in slide-in-from-left-4 duration-500 space-y-12 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Identificador del Altar</label>
                      <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Censo Estimado</label>
                      <input type="number" value={editForm.maxCapacity} onChange={e => setEditForm({ ...editForm, maxCapacity: e.target.value })} className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all" />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Día de Encuentro</label>
                      <select value={editForm.meetingDay} onChange={e => setEditForm({ ...editForm, meetingDay: e.target.value })} className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm appearance-none">
                         {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Horario</label>
                      <input type="time" value={editForm.meetingTime} onChange={e => setEditForm({ ...editForm, meetingTime: e.target.value })} className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Sector Cobertura</label>
                      <select value={editForm.district} onChange={e => setEditForm({ ...editForm, district: e.target.value })} className="w-full h-16 px-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm appearance-none">
                         {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Ubicación Física</label>
                   <div className="relative">
                      <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                      <input type="text" value={editForm.meetingAddress} onChange={e => setEditForm({ ...editForm, meetingAddress: e.target.value })} className="w-full h-16 pl-14 pr-6 bg-white dark:bg-[#1a2332] rounded-3xl border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none font-black text-sm transition-all" />
                   </div>
                </div>

                <div className="flex justify-end pt-8">
                   <button onClick={handleSaveEdit} disabled={editLoading} className="w-full sm:w-auto h-16 px-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-4">
                      {editLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={20} />} Actualizar Configuración
                   </button>
                </div>
             </div>
           )}
        </div>

        {/* CONFIRMATION OVERLAY */}
        {confirmDialog && (
          <div className="fixed inset-0 z-[2000] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-10 shadow-2xl border border-rose-500/20 animate-in zoom-in-95 duration-500 text-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-inner">
                   <AlertTriangle size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">{confirmDialog.title}</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed mb-10">{confirmDialog.message}</p>
                <div className="flex gap-4">
                   <button onClick={() => setConfirmDialog(null)} className="flex-1 h-14 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-slate-200">Cancelar</button>
                   <button onClick={confirmDialog.action} className="flex-1 h-14 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-rose-500 shadow-xl shadow-rose-500/20 active:scale-95">Confirmar</button>
                </div>
             </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default ModalCellDetail;
