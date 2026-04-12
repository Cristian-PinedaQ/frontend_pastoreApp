// ============================================
// ModalLeaderDetail.jsx - ELITE MODERN EDITION
// ============================================
import React, { useEffect, useState } from 'react';
import { 
  X, 
  Mail, 
  Phone,  
  CheckCircle2, 
  AlertCircle, 
  Award, 
  ShieldCheck, 
  ShieldAlert, 
  PauseCircle, 
  PlayCircle,
  StopCircle,
  FileText,
  Edit3,
  Trash2,
  Save,
  Users,
  Fingerprint,
  Zap,
  Sparkles,
  History,
  Target,
  Clock,
  Star,
  Loader2
} from 'lucide-react';

const LEADER_TYPE_MAP = {
  SERVANT: { label: 'Servidor', color: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/40', border: 'border-blue-100 dark:border-blue-800/50', icon: <Star size={16} /> },
  LEADER_144: { label: 'Líder 144', color: 'amber', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/40', border: 'border-amber-100 dark:border-amber-800/50', icon: <Users size={16} /> },
  LEADER_12: { label: 'Líder 12', color: 'emerald', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/40', border: 'border-emerald-100 dark:border-emerald-800/50', icon: <Award size={16} /> },
};

const LEADER_STATUS_MAP = {
  ACTIVE: { label: 'Gobernando', color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: <CheckCircle2 size={14} /> },
  SUSPENDED: { label: 'En Auditoría', color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: <PauseCircle size={14} /> },
  INACTIVE: { label: 'Retirado', color: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/40', icon: <StopCircle size={14} /> },
};

const ModalLeaderDetail = ({
  isOpen,
  onClose,
  leader,
  loading,
  onVerify,
  onSuspend,
  onUnsuspend,
  onDeactivate,
  onReactivate,
  onEdit,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'evolution' | 'governance'
  const [editMode, setEditMode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
    type: 'info'
  });
  const [editForm, setEditForm] = useState({
    leaderType: '',
    cellGroupCode: '',
    notes: '',
  });

  useEffect(() => {
    if (leader) {
      setEditForm({
        leaderType: leader.leaderType || '',
        cellGroupCode: leader.cellGroupCode || '',
        notes: leader.notes || '',
      });
    }
  }, [leader]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('identity');
      setEditMode(false);
      setConfirmation({ ...confirmation, isOpen: false });
    }
  }, [isOpen]);

  if (!isOpen || !leader) return null;

  const typeInfo = LEADER_TYPE_MAP[leader.leaderType] || LEADER_TYPE_MAP.SERVANT;
  const statusInfo = LEADER_STATUS_MAP[leader.status] || LEADER_STATUS_MAP.ACTIVE;

  return (
    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose}>
      <div className="relative w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] max-w-5xl bg-white dark:bg-slate-900 rounded-none md:rounded-[3rem] shadow-2xl border-none md:border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row overflow-visible md:overflow-hidden animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
        
        {/* Left Side: Avatar & Core Info (Ministerial Card) */}
        <div className="w-full md:w-[380px] bg-slate-50 dark:bg-slate-950/50 border-r border-slate-100 dark:border-slate-800 p-6 md:p-8 flex flex-col overflow-visible md:overflow-y-auto custom-scrollbar shrink-0">
          <div className="flex justify-between items-center mb-10 md:hidden">
             <h2 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">Perfil Ministerial</h2>
             <button onClick={onClose} className="p-2 text-slate-400"><X size={24} /></button>
          </div>

          <div className="relative mx-auto mb-8">
             <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
             <div className={`w-36 h-36 rounded-[3rem] bg-gradient-to-br transition-all duration-700 ${leader.status === 'ACTIVE' ? 'from-blue-600 to-indigo-700' : 'from-slate-400 to-slate-600'} flex items-center justify-center text-white shadow-2xl rotate-3 relative z-10`}>
                <span className="text-6xl font-black tracking-tighter -rotate-3">{leader.memberName?.[0]?.toUpperCase()}</span>
             </div>
             <div className="absolute -bottom-2 -right-2 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-700 z-20">
                <ShieldCheck size={24} className="animate-pulse" />
             </div>
          </div>

          <div className="text-center space-y-4 mb-10">
             <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none px-4 line-clamp-2">{leader.memberName}</h3>
             <div className="flex flex-col items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${typeInfo.border} ${typeInfo.bg} ${typeInfo.text} text-[10px] font-black uppercase tracking-[0.2em] shadow-sm`}>
                   <Star size={12} className="fill-current" /> {typeInfo.label}
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${statusInfo.bg} ${statusInfo.text} text-[10px] font-black uppercase tracking-[0.2em] border border-transparent`}>
                   <span className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`} /> {statusInfo.label}
                </div>
             </div>
          </div>

          <div className="space-y-6 mt-auto">
             <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Mail size={18} /></div>
                    <div className="flex-1 overflow-hidden">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email Ministerial</p>
                       <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{leader.memberEmail || 'No Definido'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Phone size={18} /></div>
                    <div className="flex-1 overflow-hidden">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Canal Directo</p>
                       <p className="text-sm font-black text-slate-800 dark:text-slate-200">{leader.memberPhone || 'No Definido'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Fingerprint size={18} /></div>
                    <div className="flex-1 overflow-hidden">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">ID Ciudadano</p>
                       <p className="text-sm font-black text-slate-800 dark:text-slate-200">{leader.memberDocument || 'N/A'}</p>
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Tabbed Content & Actions */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 relative">
          
          {/* Header Controls */}
          <div className="px-6 md:px-10 py-4 md:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0 z-10">
             <div className="flex gap-8 overflow-x-auto custom-scrollbar no-scrollbar pb-1">
                {['identity', 'evolution', 'governance'].map(tab => (
                   <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2 shrink-0 ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}
                   >
                      {tab === 'identity' ? 'Identidad' : tab === 'evolution' ? 'Evolución' : 'Gobierno'}
                      {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full animate-in slide-in-from-left-2 duration-300" />}
                   </button>
                ))}
             </div>
             <button onClick={onClose} className="p-3 text-slate-400 hover:text-red-500 transition-all active:scale-95 hidden md:block">
               <X size={24} />
             </button>
          </div>

          <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
             {activeTab === 'identity' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group hover:border-blue-500/30 transition-all">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <Target size={14} className="text-blue-500" /> Posicionamiento
                         </h4>
                         <div className="space-y-4 font-black">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                               <span className="text-xs text-slate-400 uppercase tracking-widest">Nivel de Rango</span>
                               <span className="text-sm text-slate-800 dark:text-white uppercase">{leader.leaderTypeDisplay}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                               <span className="text-xs text-slate-400 uppercase tracking-widest">Código Célula</span>
                               <span className="text-sm text-blue-600 dark:text-blue-400 uppercase">{leader.cellGroupCode || 'SIN ASIGNAR'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                               <span className="text-xs text-slate-400 uppercase tracking-widest">Estado Sistémico</span>
                               <span className="text-sm text-emerald-500 uppercase">{leader.status}</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group hover:border-blue-500/30 transition-all">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                            <History size={14} className="text-blue-500" /> Cronología Digital
                         </h4>
                         <div className="space-y-4 font-black">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-slate-800/50">
                               <span className="text-xs text-slate-400 uppercase tracking-widest">Fecha Nombramiento</span>
                               <span className="text-sm text-slate-800 dark:text-white uppercase">{leader.promotionDate ? new Date(leader.promotionDate).toLocaleDateString() : 'No Reg.'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                               <span className="text-xs text-slate-400 uppercase tracking-widest">Última Verificación</span>
                               <div className="text-right">
                                  <span className={`text-sm block leading-none ${leader.lastVerificationDate ? 'text-emerald-500' : 'text-amber-500'}`}>{leader.lastVerificationDate ? new Date(leader.lastVerificationDate).toLocaleDateString() : 'PENDIENTE'}</span>
                                  {!leader.lastVerificationDate && <span className="text-[8px] opacity-60 uppercase text-amber-600">Requiere Auditoría</span>}
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                         <FileText size={14} className="text-blue-500" /> Notas de Nombramiento
                      </h4>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
                         "{leader.notes || 'Sin observaciones adicionales registradas para este líder.'}"
                      </p>
                   </div>
                </div>
             )}

             {activeTab === 'evolution' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex items-center gap-4 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100/50 dark:border-blue-800/50">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg"><Clock size={24} /></div>
                      <div>
                         <h5 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Historial de Operaciones</h5>
                         <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/70">Trazabilidad del rango ministerial</p>
                      </div>
                   </div>
                   
                   <div className="space-y-6">
                      {(leader.status === 'SUSPENDED' || leader.suspensionReason) && (
                         <div className="p-8 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-[2.5rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-amber-500 rotate-12"><ShieldAlert size={64} /></div>
                            <div className="flex items-center gap-3 mb-4">
                               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">Sanción Sistémica</span>
                               <span className="text-[10px] font-black text-slate-400">{leader.suspensionDate ? new Date(leader.suspensionDate).toLocaleDateString() : 'Fecha Pendiente'}</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-amber-200">{leader.suspensionReason || 'Bloqueo preventivo activado por el magisterio.'}</p>
                         </div>
                       )}

                      {(leader.status === 'INACTIVE' || leader.deactivationReason) && (
                         <div className="p-8 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-[2.5rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-red-500 rotate-12"><StopCircle size={64} /></div>
                            <div className="flex items-center gap-3 mb-4">
                               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">Retiro Ministerial</span>
                               <span className="text-[10px] font-black text-slate-400">{leader.deactivationDate ? new Date(leader.deactivationDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-red-200">{leader.deactivationReason || 'Salida del sistema de gobierno ministerial.'}</p>
                         </div>
                       )}

                       {leader.status === 'ACTIVE' && !leader.suspensionReason && !leader.deactivationReason && (
                         <div className="py-20 text-center space-y-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-[3rem] border border-dashed border-slate-200">
                            <Sparkles size={48} className="mx-auto text-emerald-400 opacity-20" />
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Hoja de Vida Ministerial Limpia</p>
                            <p className="text-xs font-bold text-slate-500">Sin registros de sanciones o bloqueos sistémicos.</p>
                         </div>
                       )}
                   </div>
                </div>
             )}

             {activeTab === 'governance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-blue-500/30 mb-10 overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-150" />
                      <div className="flex items-center gap-6 relative z-10">
                         <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"><Zap size={32} /></div>
                         <div className="space-y-1">
                            <h5 className="text-xl font-black tracking-tighter uppercase leading-none">Auditoría & Gobierno</h5>
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-100">Panel de ejecución de estado ministerial</p>
                         </div>
                      </div>
                      <button 
                        onClick={(e) => { 
                           e.preventDefault(); 
                           e.stopPropagation(); 
                           setConfirmation({
                              isOpen: true,
                              title: 'Verificación de Ministro',
                              message: `¿Está seguro de emitir una verificación de auditoría para "${leader.memberName}"? Esta acción se registrará en la trazabilidad del magisterio.`,
                              confirmText: 'SÍ, VERIFICAR',
                              onConfirm: () => onVerify(leader.id, leader.memberName),
                              type: 'info'
                           });
                        }}
                        disabled={loading}
                        className="px-8 py-3 bg-white text-blue-600 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:-translate-y-1 active:scale-95 transition-all relative z-10"
                      >
                         VERIFICAR MINISTRO
                      </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {leader.status === 'ACTIVE' && (
                        <>
                           <button 
                             onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                setConfirmation({
                                   isOpen: true,
                                   title: 'Confirmar Suspensión',
                                   message: `¿Realmente desea suspender el gobierno de "${leader.memberName}"? El líder entrará en estado de auditoría preventiva.`,
                                   confirmText: 'SÍ, SUSPENDER',
                                   onConfirm: () => onSuspend(leader.id, leader.memberName),
                                   type: 'warning'
                                });
                             }}
                             disabled={loading}
                             className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-[2rem] flex flex-col items-center gap-3 hover:border-amber-400 transition-all group scale-100 active:scale-95"
                           >
                              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><PauseCircle size={24} /></div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500">Suspender</span>
                           </button>
                           <button 
                             onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                setConfirmation({
                                   isOpen: true,
                                   title: 'Retiro Ministerial',
                                   message: `¿Está seguro de retirar definitivamente a "${leader.memberName}"? Esta acción es una desactivación formal del sistema de gobierno.`,
                                   confirmText: 'SÍ, RETIRAR',
                                   onConfirm: () => onDeactivate(leader.id, leader.memberName),
                                   type: 'danger'
                                });
                             }}
                             disabled={loading}
                             className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-[2rem] flex flex-col items-center gap-3 hover:border-red-400 transition-all group scale-100 active:scale-95"
                           >
                              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><StopCircle size={24} /></div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-500">Desactivar</span>
                           </button>
                        </>
                      )}
                      
                      {(leader.status === 'SUSPENDED' || leader.status === 'INACTIVE') && (
                        <button 
                          onClick={(e) => { 
                             e.preventDefault(); 
                             e.stopPropagation(); 
                             setConfirmation({
                                isOpen: true,
                                title: 'Restablecer Gobierno',
                                message: `¿Confirmas la reactivación ministerial de "${leader.memberName}"? El líder volverá a estar plenamente operativo.`,
                                confirmText: 'SÍ, REACTIVAR',
                                onConfirm: () => leader.status === 'SUSPENDED' ? onUnsuspend(leader.id, leader.memberName) : onReactivate(leader.id, leader.memberName),
                                type: 'info'
                             });
                          }}
                          disabled={loading}
                          className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-[2rem] flex flex-col items-center gap-3 hover:border-emerald-400 transition-all group scale-100 active:scale-95 flex-1"
                        >
                           <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><PlayCircle size={24} /></div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-500 text-center">Reactivar Gobierno</span>
                        </button>
                      )}

                      <button 
                        onClick={() => setEditMode(true)}
                        className="p-6 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center gap-3 hover:border-slate-400 transition-all group scale-100 active:scale-95"
                      >
                         <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Edit3 size={24} /></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Editar Datos</span>
                      </button>

                      <button 
                        onClick={() => {
                           setConfirmation({
                              isOpen: true,
                              title: 'Eliminar Ficha',
                              message: `Esta acción revocará la unción digital del sistema para "${leader.memberName}". ¿Confirmas la eliminación permanente?`,
                              confirmText: 'ELIMINAR AHORA',
                              onConfirm: () => onDelete(leader.id, leader.memberName),
                              type: 'danger'
                           });
                        }}
                        className="p-6 bg-white dark:bg-slate-900 border-2 border-dashed border-red-100 dark:border-red-900/30 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-red-50 hover:border-red-400 transition-all group scale-100 active:scale-95"
                      >
                         <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all"><Trash2 size={24} /></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Eliminar Ficha</span>
                      </button>
                   </div>
                </div>
             )}
          </div>
        </div>

        {/* Edit Sub-View (Overlay-ish) */}
        {editMode && (
           <div className="absolute inset-x-0 bottom-0 top-[100px] z-[20] bg-white dark:bg-slate-900 animate-in slide-in-from-bottom duration-500 flex flex-col">
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                 <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center"><Edit3 size={20} /></div>
                    <h4 className="text-2xl font-black tracking-tighter">Modificar Credencial Ministerial</h4>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Rango Ministerial</label>
                       <select 
                          value={editForm.leaderType}
                          onChange={(e) => setEditForm({...editForm, leaderType: e.target.value})}
                          className="w-full h-16 px-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-white appearance-none"
                       >
                          <option value="SERVANT">Servidor</option>
                          <option value="LEADER_144">Líder 144</option>
                          <option value="LEADER_12">Líder 12</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Código de Célula</label>
                       <input 
                          type="text"
                          value={editForm.cellGroupCode}
                          onChange={(e) => setEditForm({...editForm, cellGroupCode: e.target.value})}
                          className="w-full h-16 px-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-white"
                          placeholder="ASIGNACIÓN CELULAR"
                       />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">Notas de Identidad</label>
                    <textarea 
                       value={editForm.notes}
                       onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                       className="w-full h-32 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-white resize-none"
                       placeholder="OBSERVACIONES DEL MAGISTERIO..."
                    />
                 </div>
              </div>
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-4 shadow-2xl relative z-10">
                 <button onClick={() => setEditMode(false)} className="px-6 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600">Descartar</button>
                 <button 
                    onClick={async () => {
                       await onEdit(leader.id, editForm);
                       setEditMode(false);
                    }}
                    className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 flex items-center gap-2 hover:-translate-y-1 transition-transform"
                 >
                    <Save size={18} /> Consolidar Cambios
                 </button>
              </div>
           </div>
        )}

        {/* Reusable Confirmation Overlay */}
        {confirmation.isOpen && (
           <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300 overflow-y-auto">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl p-6 md:p-10 border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in duration-500 my-auto">
                 <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl ${
                   confirmation.type === 'danger' ? 'bg-red-100 dark:bg-red-950/20 text-red-600' : 
                   confirmation.type === 'warning' ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-600' : 
                   'bg-blue-100 dark:bg-blue-950/20 text-blue-600'
                 }`}>
                   {confirmation.isError ? <AlertCircle size={40} /> : (confirmation.type === 'danger' ? <Trash2 size={40} /> : confirmation.type === 'warning' ? <AlertCircle size={40} /> : <CheckCircle2 size={40} />)}
                 </div>
                 <h3 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white mb-4 leading-none">{confirmation.title}</h3>
                 <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 leading-relaxed italic">
                    {confirmation.message}
                 </p>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setConfirmation({ ...confirmation, isOpen: false })} className="px-6 py-4 font-black text-xs uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-2xl sm:flex-1">Cancelar</button>
                    <button 
                       onClick={async () => {
                          try {
                             setIsExecuting(true);
                             await confirmation.onConfirm();
                             setConfirmation({ ...confirmation, isOpen: false });
                             if (confirmation.type === 'danger' && !confirmation.isError) onClose();
                          } catch (err) {
                             setConfirmation({
                                isOpen: true,
                                title: 'Operación Fallida',
                                message: err.message || 'Error inesperado del servidor',
                                confirmText: 'ENTENDIDO',
                                onConfirm: () => setConfirmation({ ...confirmation, isOpen: false }),
                                type: 'danger',
                                isError: true
                             });
                          } finally {
                             setIsExecuting(false);
                          }
                       }}
                       disabled={isExecuting}
                       className={`px-6 py-4 font-black text-xs uppercase tracking-widest text-white rounded-2xl sm:flex-1 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                         confirmation.type === 'danger' ? 'bg-red-600 shadow-red-500/20' : 
                         confirmation.type === 'warning' ? 'bg-amber-600 shadow-amber-500/20' : 
                         'bg-blue-600 shadow-blue-500/20'
                       }`}
                    >
                       {isExecuting ? <Loader2 size={16} className="animate-spin" /> : confirmation.confirmText}
                    </button>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default ModalLeaderDetail;