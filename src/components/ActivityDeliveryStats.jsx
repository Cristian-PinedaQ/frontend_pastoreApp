import React, { useMemo } from "react";
import { 
  Users, 
  CreditCard, 
  Package, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
  Info
} from "lucide-react";

/**
 * @param {Array}   participants  - array de ActivityContributionWithLeaderDTO
 * @param {string}  activityName  - nombre de la actividad
 * @param {boolean} compact       - modo compacto para cabecera de lista
 */
const ActivityDeliveryStats = ({ participants = [], activityName = "", compact = false }) => {
  const stats = useMemo(() => {
    const total = participants.length;
    const delivered = participants.filter((p) => p.itemDelivered === true).length;
    const fullyPaid = participants.filter((p) => p.isFullyPaid === true).length;
    const paidAndDelivered = participants.filter((p) => p.isFullyPaid && p.itemDelivered).length;
    const paidNotDelivered = participants.filter((p) => p.isFullyPaid && !p.itemDelivered).length;
    const deliveredNotPaid = participants.filter((p) => !p.isFullyPaid && p.itemDelivered).length;
    const neitherPaidNorDelivered = participants.filter((p) => !p.isFullyPaid && !p.itemDelivered).length;

    const deliveryPct = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const paymentPct = total > 0 ? Math.round((fullyPaid / total) * 100) : 0;

    return {
      total, delivered, pendingDelivery: total - delivered,
      fullyPaid, paidAndDelivered, paidNotDelivered,
      deliveredNotPaid, neitherPaidNorDelivered,
      deliveryPct, paymentPct,
    };
  }, [participants]);

  if (stats.total === 0) return null;

  // ── MODO COMPACTO (Chips para listas) ─────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 items-center animate-in fade-in duration-500">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
           <Users className="w-3 h-3" /> {stats.total}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
           <CreditCard className="w-3 h-3" /> {stats.fullyPaid}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
           <Package className="w-3 h-3" /> {stats.delivered}
        </div>
        {stats.paidNotDelivered > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-full text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest border border-amber-100 dark:border-amber-500/20 animate-pulse">
             <AlertTriangle className="w-3 h-3" /> {stats.paidNotDelivered} x Entregar
          </div>
        )}
      </div>
    );
  }

  // ── MODO COMPLETO (Panel de Dashboard) ──────────────────────────────────
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center">
               <ClipboardList className="w-5 h-5" />
            </div>
            <div>
               <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Resumen de Seguimiento Operativo</h4>
               {activityName && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{activityName}</p>}
            </div>
         </div>
         <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{stats.deliveryPct}% Eficacia</span>
         </div>
      </div>

      <div className="p-8 space-y-8">
         {/* METRICS GRID */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Inscritos', value: stats.total, icon: Users, color: 'slate' },
              { label: 'Pagos OK', value: stats.fullyPaid, icon: CreditCard, color: 'indigo', pct: stats.paymentPct },
              { label: 'Entregados', value: stats.delivered, icon: Package, color: 'emerald', pct: stats.deliveryPct },
              { label: 'Por Entregar', value: stats.pendingDelivery, icon: stats.pendingDelivery > 0 ? Clock : CheckCircle2, color: stats.pendingDelivery > 0 ? 'amber' : 'emerald' }
            ].map(m => (
              <div key={m.label} className="p-5 bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative group overflow-hidden">
                 <div className={`w-8 h-8 bg-${m.color}-500/10 text-${m.color}-600 dark:text-${m.color}-400 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <m.icon className="w-4 h-4" />
                 </div>
                 <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{m.value}</p>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                 {m.pct !== undefined && (
                   <div className="absolute top-4 right-4 text-[8px] font-black bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border dark:border-slate-700">
                      {m.pct}%
                   </div>
                 )}
              </div>
            ))}
         </div>

         {/* PROGRESS BARS */}
         <div className="space-y-6">
            <div className="space-y-3">
               <div className="flex justify-between items-end">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <CreditCard className="w-4 h-4 text-indigo-500" /> Compromiso de Pago
                  </span>
                  <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg uppercase tracking-widest">
                     {stats.fullyPaid} / {stats.total} Completados
                  </span>
               </div>
               <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-slate-700 p-[2px]">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.paymentPct}%` }}></div>
               </div>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-end">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Package className="w-4 h-4 text-emerald-500" /> Logística de Entrega
                  </span>
                  <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg uppercase tracking-widest">
                     {stats.delivered} / {stats.total} Finalizados
                  </span>
               </div>
               <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-50 dark:border-slate-700 p-[2px]">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${stats.deliveryPct}%` }}></div>
               </div>
            </div>
         </div>

         {/* BREAKDOWN LIST */}
         <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Análisis de Casos</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[
                 { label: 'Pagos y Entregas OK', count: stats.paidAndDelivered, icon: CheckCircle2, color: 'emerald', bg: 'emerald' },
                 { label: 'Pendientes por Entregar', count: stats.paidNotDelivered, icon: AlertTriangle, color: 'amber', bg: 'amber', highlight: stats.paidNotDelivered > 0 },
                 { label: 'Irregular (Entregado s/pago)', count: stats.deliveredNotPaid, icon: Info, color: 'blue', bg: 'blue', hidden: stats.deliveredNotPaid === 0 },
                 { label: 'Sin Acción Registrada', count: stats.neitherPaidNorDelivered, icon: Clock, color: 'slate', bg: 'slate' }
               ].map(it => !it.hidden && (
                 <div key={it.label} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${it.highlight ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 shadow-lg shadow-amber-500/5' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-3">
                       <it.icon className={`w-4 h-4 text-${it.color}-500`} />
                       <span className={`text-[11px] font-black uppercase tracking-tight ${it.highlight ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>{it.label}</span>
                    </div>
                    <span className={`text-sm font-black text-${it.color}-600 dark:text-${it.color}-400`}>{it.count}</span>
                 </div>
               ))}
            </div>
         </div>

         {/* ALERTA CRÍTICA */}
         {stats.paidNotDelivered > 0 && (
           <div className="p-5 bg-amber-600 text-white rounded-[2rem] shadow-xl shadow-amber-600/20 flex items-center gap-5 animate-in slide-in-from-top-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                 <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Prioridad de Entrega</p>
                 <p className="text-[10px] font-bold text-white/70 uppercase tracking-tight">Hay {stats.paidNotDelivered} participante(s) con pago completo que aún no reciben su material.</p>
              </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default ActivityDeliveryStats;