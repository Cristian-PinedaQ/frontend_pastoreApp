// ============================================
// ModalActivityFinance.jsx
// Modal para ver información financiera detallada de una actividad
// 🔐 AÑADIDO: prop readOnly para roles con solo GET (solo indicador visual)
// ============================================

import React, { useState } from "react";
import {
  X, DollarSign, Users, PiggyBank,
  TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, Clock, PieChart, BarChart2,
  Lightbulb, Bell, CreditCard, Wallet, Lock
} from "lucide-react";

const ModalActivityFinance = ({ 
  isOpen, 
  onClose, 
  activity, 
  balance,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState("summary");

  if (!isOpen || !activity || !balance) return null;

  // Calcular porcentajes
  const complianceRate = balance.compliancePercentage || 0;
  const paidPercentage = balance.totalCommitted > 0 
    ? (balance.totalPaid / balance.totalCommitted) * 100 
    : 0;
  const pendingPercentage = 100 - paidPercentage;

  // Calcular costos vs ingresos
  const costRatio = balance.totalPaid > 0 
    ? (balance.totalCosts / balance.totalPaid) * 100 
    : 0;
  const profitability = balance.totalPaid - balance.totalCosts;

  const isProfitable = profitability >= 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-slate-50 dark:bg-slate-950 w-full sm:max-w-6xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] border-x-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* PREMIUM HEADER AREA (Fixed) */}
        <div className={`p-6 sm:p-10 pb-6 sm:pb-8 relative overflow-hidden shrink-0 ${
          isProfitable 
            ? "bg-emerald-600 dark:bg-emerald-900/40" 
            : "bg-rose-600 dark:bg-rose-900/40"
        }`}>
           {/* Abstract Background Elements */}
           <div className={`absolute top-0 right-0 w-64 h-64 rounded-full -mr-24 -mt-24 blur-3xl opacity-30 ${isProfitable ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
           <div className={`absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-20 -mb-20 blur-3xl opacity-20 ${isProfitable ? 'bg-teal-300' : 'bg-orange-300'}`}></div>

           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
              <div className="flex items-center gap-4 sm:gap-6">
                 <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-xl rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-2xl">
                    <DollarSign size={24} className="sm:w-8 sm:h-8" />
                 </div>
                 <div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                       <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/20 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/20 backdrop-blur-md">
                          INTELIGENCIA FINANCIERA
                       </span>
                       <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                         isProfitable ? 'bg-emerald-400/20 text-emerald-100' : 'bg-rose-400/20 text-rose-100'
                       }`}>
                          {isProfitable ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {isProfitable ? 'RENTABLE' : 'DÉFICIT'}
                       </span>
                    </div>
                    <h2 className="text-xl sm:text-3xl font-black text-white tracking-tighter leading-tight uppercase truncate max-w-[250px] sm:max-w-none">
                      {activity.activityName}
                    </h2>
                 </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                 {readOnly && (
                    <div className="px-4 py-2 bg-amber-500/20 text-amber-200 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-500/30 backdrop-blur-md flex items-center gap-2">
                       <Lock size={12} /> Lectura
                    </div>
                 )}
                 <button onClick={onClose} className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg sm:rounded-2xl transition-all border border-white/10">
                    <X size={20} />
                 </button>
              </div>
           </div>
        </div>



        {/* TABS AREA (Fixed) */}
        <div className="flex px-6 sm:px-10 pt-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 gap-6 sm:gap-10 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: "summary", icon: PieChart, label: "Resumen" },
            { id: "participants", icon: Users, label: "Participantes" },
            { id: "costs", icon: Wallet, label: "Egresos" },
            { id: "analysis", icon: BarChart2, label: "Métricas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-4 text-[10px] sm:text-xs font-black transition-all duration-300 relative whitespace-nowrap uppercase tracking-widest ${
                activeTab === tab.id 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'opacity-100' : 'opacity-70'} />
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 dark:bg-indigo-400 rounded-t-full shadow-[0_-2px_10px_rgba(79,70,229,0.3)] animate-in slide-in-from-bottom-1 duration-300"></span>
              )}
            </button>
          ))}
        </div>

        {/* CONTENT AREA (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 bg-slate-50 dark:bg-slate-950">
          
          {/* TAB: SUMMARY */}
          {activeTab === "summary" && (
            <div className="space-y-8 sm:space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* INGRESOS */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-white dark:border-slate-800 group hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PiggyBank size={24} />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comprometido</h3>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCurrency(balance.totalCommitted)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl flex justify-between items-center text-[10px] uppercase font-bold tracking-widest leading-none">
                      <span className="text-slate-500">Pagado:</span>
                      <span className="text-emerald-600">{formatCurrency(balance.totalPaid)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl flex justify-between items-center text-[10px] uppercase font-bold tracking-widest leading-none">
                      <span className="text-slate-500">Saldo:</span>
                      <span className="text-amber-500">{formatCurrency(balance.balance)}</span>
                    </div>
                  </div>
                </div>

                {/* COSTOS */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-white dark:border-slate-800 group hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos Totales</h3>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {formatCurrency(balance.totalCosts)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl flex justify-between items-center text-[10px] uppercase font-bold tracking-widest leading-none">
                      <span className="text-slate-500">Ratio:</span>
                      <span className={`font-black ${costRatio <= 50 ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {costRatio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl flex justify-between items-center text-[10px] uppercase font-bold tracking-widest leading-none">
                      <span className="text-slate-500">Impacto:</span>
                      <span className={`font-black ${isProfitable ? 'text-indigo-600' : 'text-rose-500'}`}>
                        {formatCurrency(profitability)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PARTICIPANTES */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-white dark:border-slate-800 group hover:shadow-xl transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audiencia</h3>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {balance.participantCount || 0}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex flex-col items-center">
                       <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Pagas</span>
                       <span className="text-xs font-black text-emerald-600 leading-none">{balance.fullyPaidParticipants || 0}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl flex flex-col items-center">
                       <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Pend.</span>
                       <span className="text-xs font-black text-rose-500 leading-none">{balance.pendingParticipants || 0}</span>
                    </div>
                  </div>
                </div>

                {/* CUMPLIMIENTO */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-white dark:border-slate-800 group hover:shadow-xl transition-all flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recaudo</h3>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                        {complianceRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 flex overflow-hidden shadow-inner">
                      <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${paidPercentage}%` }}></div>
                      <div className="bg-amber-400 h-full transition-all duration-1000 ease-out delay-200" style={{ width: `${pendingPercentage}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2">
                       <span className="text-[8px] font-black text-emerald-600 uppercase">Eficiencia {paidPercentage.toFixed(0)}%</span>
                       <span className="text-[8px] font-black text-amber-500 uppercase">Cartera {pendingPercentage.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK SUMMARY */}
              <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm">
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">
                  <BarChart2 size={16} className="text-indigo-500" /> Panorama de Negocio
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">P/U Neto</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">{formatCurrency(Math.round(activity.price || 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Acomodación</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                      {balance.participantCount || 0} / {activity.quantity || "∞"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Potencial</p>
                    <p className="text-base sm:text-lg font-black text-indigo-600 leading-tight uppercase tracking-tight">
                       {formatCurrency((activity.price || 0) * (activity.quantity || 0))}
                    </p>
                  </div>
                  <div className={`p-4 rounded-2xl ${isProfitable ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Proyección Fin.</p>
                    <p className={`text-base sm:text-lg font-black ${isProfitable ? 'text-emerald-600' : 'text-rose-600'} leading-tight`}>
                      {formatCurrency(Math.abs(profitability))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
              {/* TAB: PARTICIPANTES */}
          {activeTab === "participants" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10">
                   <Users size={16} className="text-blue-500" /> Distribución de Recaudo
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Pago Total', value: balance.fullyPaidParticipants, icon: CheckCircle, color: 'emerald' },
                    { label: 'Pago Parcial', value: balance.partiallyPaidParticipants, icon: AlertTriangle, color: 'amber' },
                    { label: 'Pendiente', value: balance.pendingParticipants, icon: Clock, color: 'rose' }
                  ].map(item => (
                    <div key={item.label} className={`flex flex-col items-center justify-center p-8 bg-${item.color}-500/5 rounded-[2rem] border border-${item.color}-500/10 group hover:shadow-lg transition-all`}>
                      <div className={`w-14 h-14 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-500 mb-4 group-hover:scale-110 transition-transform`}>
                        <item.icon size={28} />
                      </div>
                      <div className={`text-4xl font-black text-${item.color}-600 tracking-tighter mb-2`}>{item.value || 0}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{item.label}</div>
                      <div className="text-[10px] font-black px-4 py-1 bg-white dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 shadow-sm">
                        {balance.participantCount ? ((item.value / balance.participantCount) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm">
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">
                  <CreditCard size={16} className="text-indigo-500" /> Rendimiento de Cobro
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Ticket Medio', value: formatCurrency(balance.participantCount > 0 ? (balance.totalPaid / balance.participantCount) : 0), icon: DollarSign },
                    { label: 'Base de Cobro', value: formatCurrency(activity.price), icon: Users },
                    { label: 'Cumplimiento', value: `${complianceRate.toFixed(1)}%`, icon: TrendingUp },
                    { label: 'Eficiencia', value: `${balance.totalCommitted > 0 ? ((balance.totalPaid / balance.totalCommitted) * 100).toFixed(1) : 0}%`, icon: CheckCircle }
                  ].map(stat => (
                    <div key={stat.label} className="flex gap-4 items-center p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl group hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                      <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <stat.icon size={20} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: COSTOS */}
          {activeTab === "costs" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm">
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10">
                   <TrendingDown size={16} className="text-rose-500" /> Auditoría de Egresos
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-6 bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/10">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos Totales</span>
                      <span className="text-xl font-black text-emerald-600">{formatCurrency(balance.totalPaid)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-6 bg-rose-500/5 rounded-[1.5rem] border border-rose-500/10">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costos de Operación</span>
                      <span className="text-xl font-black text-rose-600">{formatCurrency(balance.totalCosts)}</span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-8 rounded-[2rem] border ${isProfitable ? 'bg-indigo-600/5 border-indigo-600/10' : 'bg-orange-600/5 border-orange-600/10'} shadow-inner`}>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Balance Neto</span>
                      <span className={`text-3xl font-black ${isProfitable ? 'text-indigo-600' : 'text-orange-600'} tracking-tighter`}>
                        {formatCurrency(profitability)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Relación Gasto / Recaudo</h5>
                    
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-10 flex overflow-hidden mb-8 shadow-inner p-1">
                       <div className="flex-1 bg-emerald-500 rounded-l-full flex items-center justify-end px-4">
                          {!isProfitable && <span className="text-[8px] font-black text-white uppercase opacity-40">Déficit</span>}
                       </div>
                       <div 
                         className="bg-rose-500 h-full rounded-r-full flex items-center justify-center transition-all duration-1000 ease-out" 
                         style={{ width: `${Math.min(costRatio, 100)}%` }}
                       >
                          {costRatio > 20 && <span className="text-[9px] font-black text-white uppercase tracking-tighter px-2">Costos {costRatio.toFixed(0)}%</span>}
                       </div>
                    </div>
                    
                    <div className="p-6 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${
                          costRatio <= 30 ? 'bg-emerald-500/10 text-emerald-500' : 
                          costRatio <= 50 ? 'bg-indigo-500/10 text-indigo-500' : 
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          <Lightbulb size={24} />
                        </div>
                        <div>
                          <p className={`text-xs font-black uppercase tracking-widest mb-1 ${
                            costRatio <= 30 ? 'text-emerald-600' : 
                            costRatio <= 50 ? 'text-indigo-600' : 
                            'text-amber-600'
                          }`}>
                            {costRatio <= 30 ? 'Excelente Salud' : costRatio <= 50 ? 'Estructura Estable' : 'Alerta de Margen'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            {costRatio <= 30 ? 'Los costos operativos están optimizados al máximo.' : 
                             costRatio <= 50 ? 'La operación mantiene una relación de gastos moderada.' : 
                             'La carga operativa está superando la mitad de los ingresos recaudados.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ANALYSIS */}
          {activeTab === "analysis" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {[
                  { label: "Recaudo Real", value: `${balance.totalCommitted > 0 ? ((balance.totalPaid / balance.totalCommitted) * 100).toFixed(1) : 0}%`, desc: "Porcentaje de aportes comprometidos ya conciliados.", icon: TrendingUp, color: "indigo" },
                  { label: "Ocupación Total", value: `${activity.quantity ? ((balance.participantCount / activity.quantity) * 100).toFixed(1) : '100'}%`, desc: "Uso de la capacidad establecida para este evento.", icon: Users, color: "blue" },
                  { label: "Márgen / Persona", value: formatCurrency(balance.participantCount > 0 ? (profitability / balance.participantCount) : 0), desc: "Impacto financiero neto generado por cada asistente.", icon: DollarSign, color: "emerald" },
                  { label: "Índice de Solvencia", value: `${complianceRate.toFixed(1)}%`, desc: "Progreso global del pago total de los inscritos.", icon: Clock, color: "amber" }
                ].map(metric => (
                  <div key={metric.label} className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm group hover:scale-[1.02] transition-all">
                    <div className={`w-12 h-12 bg-${metric.color}-500/10 text-${metric.color}-500 rounded-2xl flex items-center justify-center mb-6`}>
                      <metric.icon size={24} />
                    </div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{metric.label}</h5>
                    <div className={`text-3xl font-black text-${metric.color}-600 tracking-tighter mb-4`}>
                      {metric.value}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed opacity-60">
                      {metric.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* RECOMENDACIONES */}
              <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full -mr-20 -mb-20 blur-3xl"></div>
                <h4 className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">
                  <Lightbulb size={16} className="text-amber-500" /> Hoja de Ruta Sugerida
                </h4>
                
                <div className="space-y-4 relative z-10">
                  {balance.pendingParticipants > 0 && (
                    <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                      <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0"><Bell size={20} /></div>
                      <p className="text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest leading-relaxed mt-1">
                        Notificar a los <span className="text-indigo-600 font-black">{balance.pendingParticipants}</span> miembros que aún no reportan abonos iniciales.
                      </p>
                    </div>
                  )}

                  {balance.participantCount < (activity.quantity || 0) * 0.5 && activity.quantity > 0 && (
                    <div className="flex items-start gap-4 p-5 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/10 hover:border-amber-500/20 transition-all">
                      <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl shrink-0"><Users size={20} /></div>
                      <p className="text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest leading-relaxed mt-1">
                        Intensificar promoción: La ocupación actual es del <span className="text-amber-600 font-black">{((balance.participantCount / activity.quantity) * 100).toFixed(0)}%</span> ({balance.participantCount}/{activity.quantity} cupos).
                      </p>
                    </div>
                  )}
                  
                  {balance.partiallyPaidParticipants > 0 && (
                    <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                      <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0"><PiggyBank size={20} /></div>
                      <p className="text-[11px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest leading-relaxed mt-1">
                        Seguimiento comercial con <span className="text-emerald-600 font-black">{balance.partiallyPaidParticipants}</span> personas para el recaudo final del saldo.
                      </p>
                    </div>
                  )}
                  
                  {costRatio > 50 && (
                    <div className="flex items-start gap-4 p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                      <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl shrink-0"><AlertTriangle size={20} /></div>
                      <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest leading-relaxed mt-1">
                        Revisar plan de egresos prioritarios. El gasto actual del <span className="font-black">{costRatio.toFixed(1)}%</span> compromete la reinversión.
                      </p>
                    </div>
                  )}

                  {profitability >= 0 && balance.pendingParticipants === 0 && balance.partiallyPaidParticipants === 0 && (
                    <div className="flex items-start gap-4 p-6 bg-emerald-500/5 rounded-[2rem] border border-emerald-500/10 shadow-inner">
                      <div className="p-3 bg-emerald-500/20 text-emerald-600 rounded-full shrink-0 animate-bounce"><CheckCircle size={24} /></div>
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-widest leading-relaxed mt-1.5">
                        Ciclo financiero completado exitosamente con solvencia total y 100% de recaudo conciliado.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* FOOTER GENERAL FIJO ESTILO APPLE */}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 pointer-events-none flex justify-center z-20">
           <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-2 py-2 rounded-full border border-slate-200/50 dark:border-slate-800 shadow-2xl flex items-center justify-center gap-1.5 pointer-events-auto shrink-0 w-fit">
              <button
                onClick={onClose}
                className="px-10 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 dark:shadow-white/10 flex items-center gap-2"
              >
                 <CheckCircle size={16} /> Finalizar Revisión
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ModalActivityFinance;

