// ============================================
// ModalLeaderStatistics.jsx - ELITE MODERN EDITION
// ============================================
import React, { useEffect } from 'react';
import { 
  X, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  PauseCircle, 
  StopCircle, 
  Award,
  Star,
  TrendingUp,
  Activity,
  Target,
  Crown,
  Zap,
  Layout
} from 'lucide-react';

const ModalLeaderStatistics = ({ onClose, stats }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!stats) return null;

  const total = stats.totalLeaders || 0;
  const active = stats.activeLeaders || 0;
  const suspended = stats.suspendedLeaders || 0;
  const inactive = stats.inactiveLeaders || 0;
  const promotionsLastMonth = stats.promotionsLastMonth || 0;
  const byType = stats.byType || {};

  const pctActive = total > 0 ? Math.round((active / total) * 100) : 0;
  const pctSuspended = total > 0 ? Math.round((suspended / total) * 100) : 0;
  const pctInactive = total > 0 ? Math.round((inactive / total) * 100) : 0;

  const typeConfig = {
    SERVANT: { label: 'Servidores', color: 'indigo', iconColor: 'text-blue-500', icon: <Star size={16} /> },
    LEADER_144: { label: 'Líderes 144', color: 'violet', iconColor: 'text-amber-500', icon: <Users size={16} /> },
    LEADER_12: { label: 'Líderes 12', color: 'emerald', iconColor: 'text-green-500', icon: <Award size={16} /> },
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-40 -mb-40 pointer-events-none" />

        <div className="px-8 md:px-10 py-6 md:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-lg border border-indigo-100 dark:border-indigo-800/50">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Analíticas de Gobierno</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mt-1">Visión & Estrategia Ministerial</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-2xl transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 md:p-10 overflow-y-auto flex-1 custom-scrollbar space-y-10 relative z-10">
          
          {/* Main KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-blue-400 transition-all duration-300 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users size={20} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Líderes Totales</p>
                <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{total}</h4>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-emerald-400 transition-all duration-300 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><CheckCircle2 size={20} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Estado Activo</p>
                <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">{active}</h4>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-amber-400 transition-all duration-300 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><PauseCircle size={20} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Bajo Auditoría</p>
                <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tighter leading-none">{suspended}</h4>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 group hover:border-slate-400 transition-all duration-300 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><StopCircle size={20} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">Inactivos</p>
                <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{inactive}</h4>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Status Distribution */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-400 rotate-12 group-hover:rotate-0 transition-transform duration-700"><Layout size={64} /></div>
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                    <Activity size={14} className="text-blue-500" /> Distribución Operativa
                  </h3>
                  <div className="flex items-end gap-1 mb-8 h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner ring-4 ring-slate-50/50 dark:ring-slate-950/50">
                     <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out delay-100" style={{ width: `${pctActive}%` }} />
                     <div className="h-full bg-amber-500 transition-all duration-1000 ease-out delay-300" style={{ width: `${pctSuspended}%` }} />
                     <div className="h-full bg-slate-400 transition-all duration-1000 ease-out delay-500" style={{ width: `${pctInactive}%` }} />
                  </div>
                  <div className="space-y-4">
                     {[
                       { label: 'Activos', pct: pctActive, color: 'bg-emerald-500', icon: <CheckCircle2 size={12} /> },
                       { label: 'Suspendidos', pct: pctSuspended, color: 'bg-amber-500', icon: <PauseCircle size={12} /> },
                       { label: 'Inactivos', pct: pctInactive, color: 'bg-slate-400', icon: <StopCircle size={12} /> }
                     ].map(item => (
                       <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                          <div className="flex items-center gap-3">
                             <div className={`w-6 h-6 rounded-lg ${item.color} flex items-center justify-center text-white text-[10px] shadow-lg`}>{item.icon}</div>
                             <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{item.label}</span>
                          </div>
                          <span className="text-base font-black text-slate-900 dark:text-white">{item.pct}%</span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* Anointing Distribution */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-400 -rotate-12 group-hover:rotate-0 transition-transform duration-700"><Crown size={64} /></div>
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-6">
                    <Target size={14} className="text-indigo-500" /> Niveles de Unción Activos
                  </h3>
                  <div className="space-y-6">
                    {Object.entries(byType).map(([typeKey, typeData]) => {
                      const config = typeConfig[typeKey];
                      const count = typeData?.count || 0;
                      const barWidth = active > 0 ? Math.round((count / active) * 100) : 0;
                      return (
                        <div key={typeKey} className="space-y-2">
                           <div className="flex justify-between items-end">
                              <div className="flex items-center gap-2.5">
                                 <div className={`w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 ${config.iconColor} flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm`}>{config.icon}</div>
                                 <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block leading-none mb-1">{config.label}</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase line-clamp-1">{typeData.requiredLevel || 'Estándar'}</span>
                                 </div>
                              </div>
                              <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{count}</span>
                           </div>
                           <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                              <div className={`h-full bg-gradient-to-r from-blue-600 to-indigo-700 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${barWidth}%` }} />
                           </div>
                        </div>
                      )
                    })}
                  </div>
               </div>
            </div>
          </div>

          {/* Growth Footer */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xl shadow-blue-500/30 group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-1000 group-hover:scale-150" />
             <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-2xl">
                   <TrendingUp size={40} className="animate-pulse" />
                </div>
                <div className="space-y-2">
                   <h5 className="text-white text-3xl font-black tracking-tighter leading-tight">Expansión del Reino</h5>
                   <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.3em]">Crecimiento en el último ciclo de visión</p>
                </div>
             </div>
             <div className="text-center md:text-right relative z-10">
                <span className="text-white text-6xl font-black tracking-tighter flex items-center gap-3 justify-center md:justify-end">
                   +{promotionsLastMonth}
                   <Zap size={32} className="text-amber-400 animate-bounce" />
                </span>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-2">Nuevos Nombramientos de Líderes</p>
             </div>
          </div>

        </div>

        <div className="px-8 md:px-10 py-6 md:py-8 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/30 shrink-0 relative z-10">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-95"
          >
            Cerrar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalLeaderStatistics;