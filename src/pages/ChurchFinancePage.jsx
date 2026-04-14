import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiService from "../apiService";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  FileText, 
  Plus, 
  ChevronRight,
  Download, 
  Lock, 
  History, 
  Settings2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  PieChart,
  Activity,
  CreditCard,
  Building2,
  Lightbulb,
  Users
} from 'lucide-react';

const MONTH_NAMES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const EXPENSE_CATEGORY_CONFIG = {
  SERVICIOS_PUBLICOS: { label: "Servicios", icon: <Lightbulb size={12} />, color: "amber" },
  NOMINA: { label: "Nómina", icon: <Users size={12} />, color: "indigo" },
  ARRIENDO: { label: "Arriendo", icon: <Building2 size={12} />, color: "blue" },
  MANTENIMIENTO: { label: "Mantenimiento", icon: <Settings2 size={12} />, color: "slate" },
  EVENTOS: { label: "Eventos", icon: <PieChart size={12} />, color: "violet" },
  OTROS: { label: "Otros", icon: <Activity size={12} />, color: "slate" },
};
const ChurchFinancePage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("balance"); // balance, fixed, occasional
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [occasionalExpenses, setOccasionalExpenses] = useState([]);
  const [healthIndicator, setHealthIndicator] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bal, fixed, occasional, health] = await Promise.all([
        apiService.getMonthlyBalance(selectedMonth, selectedYear),
        apiService.getOrCreateMonthlyRecords(selectedMonth, selectedYear),
        apiService.getOccasionalExpensesByMonth(selectedMonth, selectedYear),
        apiService.getFinancialHealthIndicator(selectedMonth, selectedYear)
      ]);
      setBalance(bal);
      setFixedExpenses(fixed || []);
      setOccasionalExpenses(occasional || []);
      setHealthIndicator(health);
    } catch (err) {
      console.error("Error cargando finanzas:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* TREASURY PREMIUM HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 px-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                <Building2 size={22} strokeWidth={2.5} />
             </div>
             <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Libro Colectivo</div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
            Tesorería <span className="text-indigo-600">Altar</span>
          </h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center gap-3">
            <Lock size={16} className="text-amber-500" /> Auditoría General • {MONTH_NAMES[selectedMonth]} {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl">
           <div className="flex items-center gap-2 p-1">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-50 dark:bg-slate-850 px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest outline-none ring-2 ring-transparent focus:ring-indigo-500/10 transition-all border-none cursor-pointer appearance-none min-w-[140px]"
              >
                {MONTH_NAMES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-slate-50 dark:bg-slate-850 px-6 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest outline-none ring-2 ring-transparent focus:ring-indigo-500/10 transition-all border-none cursor-pointer appearance-none"
              >
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>
           <button 
             onClick={loadData} 
             className="w-14 h-14 flex items-center justify-center bg-indigo-600 text-white rounded-3xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
           >
             <RefreshCw size={20} strokeWidth={3} className={loading ? "animate-spin" : ""} />
           </button>
        </div>
      </div>

      {/* FINANCIAL HEALTH - COCKPIT DESIGN */}
      {healthIndicator && (
        <div className="px-4">
          <div className={`relative overflow-hidden p-8 rounded-[3rem] border-t-4 shadow-2xl transition-all duration-700 animate-in fade-in flex flex-col md:flex-row items-center justify-between gap-10 ${
            healthIndicator.status === 'HEALTHY' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-900 dark:bg-emerald-500/5' : 
            healthIndicator.status === 'WARNING' ? 'bg-amber-50/50 border-amber-500 text-amber-900 dark:bg-amber-500/5' : 'bg-rose-50/50 border-rose-500 text-rose-900 dark:bg-rose-500/5'
          }`}>
            <div className="absolute top-0 right-0 opacity-[0.03] rotate-12 -translate-y-8 translate-x-8 pointer-events-none">
               <Activity size={240} />
            </div>

            <div className="flex items-center gap-8 relative">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl group transition-all duration-500 ${
                healthIndicator.status === 'HEALTHY' ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-8 ring-emerald-500/10' : 
                healthIndicator.status === 'WARNING' ? 'bg-amber-500 text-white shadow-amber-500/30 ring-8 ring-amber-500/10' : 'bg-rose-500 text-white shadow-rose-500/30 ring-8 ring-rose-500/10'
              }`}>
                {healthIndicator.status === 'HEALTHY' ? <CheckCircle2 size={40} strokeWidth={2.5} /> : <AlertCircle size={40} strokeWidth={2.5} />}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Status de Operación</p>
                <h4 className="text-3xl font-black tracking-tighter uppercase leading-none">{healthIndicator.message}</h4>
                <div className="flex items-center gap-2 pt-2">
                   <div className="h-1 w-12 bg-current opacity-20 rounded-full"></div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Periodo Vigente de Auditoría</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-12 bg-white/40 dark:bg-black/20 p-6 md:p-8 rounded-[2.5rem] backdrop-blur-xl border border-white/50 dark:border-white/5 relative">
               <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Ratio de Gasto</p>
                  <p className="text-4xl font-black tracking-tighter flex items-center justify-center gap-1">
                     {healthIndicator.expenseRatio}<span className="text-sm font-bold opacity-40">%</span>
                  </p>
               </div>
               <div className="w-px h-12 bg-slate-400/20"></div>
               <div className="text-center group cursor-help">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Inscripciones</p>
                  <p className="text-4xl font-black tracking-tighter text-indigo-600 group-hover:scale-110 transition-transform">
                     {balance?.totalIncome > 0 ? ((balance?.totalIncome / 2000000) * 100).toFixed(0) : 0}<span className="text-sm font-bold opacity-40 text-slate-400">%</span>
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS - FINANCIAL INSTITUTION DESIGN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {[
          { label: 'Ingresos Totales', val: balance?.totalIncome, color: 'emerald', icon: TrendingUp, desc: 'Diezmos y Ofrendas' },
          { label: 'Egresos Totales', val: balance?.totalExpenses, color: 'rose', icon: TrendingDown, desc: 'Gastos de Operación' },
          { label: 'Saldo Anterior', val: balance?.previousBalance, color: 'slate', icon: History, desc: 'Cierre mes previo' },
          { label: 'Balance Final', val: balance?.finalBalance, color: 'indigo', icon: Wallet, desc: balance?.status === 'CLOSED' ? 'Mes Auditorado' : 'Auditando...' },
        ].map((kpi, i) => (
          <div 
            key={i} 
            className={`relative overflow-hidden p-8 rounded-[3rem] border transition-all duration-500 group animate-in fade-in ${
              i === 3 ? 'bg-slate-900 border-slate-950 text-white shadow-2xl shadow-indigo-500/20' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-900 text-slate-900 dark:text-white shadow-sm hover:shadow-xl'
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {/* Background Texture */}
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:rotate-12 group-hover:scale-120 transition-all duration-700 pointer-events-none">
               <CreditCard size={180} />
            </div>

            <div className="space-y-6 relative">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                i === 3 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40' : 
                `bg-${kpi.color}-50 dark:bg-${kpi.color}-500/10 text-${kpi.color}-600`
              }`}>
                <kpi.icon size={24} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${i === 3 ? 'text-slate-400' : 'text-slate-400'}`}>{kpi.label}</p>
                <h3 className="text-3xl font-black tracking-tighter leading-none">{formatCurrency(kpi.val)}</h3>
              </div>
              <div className="flex items-center gap-2 pt-2">
                 <div className={`w-2 h-2 rounded-full ${i === 3 ? (balance?.status === 'CLOSED' ? 'bg-indigo-400' : 'bg-amber-400 animate-pulse') : `bg-${kpi.color}-500`}`}></div>
                 <p className="text-[9px] font-black uppercase tracking-widest opacity-50">{kpi.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AUDIT WORKSPACE */}
      <div className="px-4">
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden p-2">
          <div className="flex flex-col md:flex-row gap-2 mb-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-[3rem]">
            {[
              { id: 'balance', label: 'Libro de Ingresos', icon: <Plus size={16} /> },
              { id: 'fixed', label: 'Gastos Fijos', icon: <Building2 size={16} /> },
              { id: 'occasional', label: 'Ocasionales', icon: <CreditCard size={16} /> }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 py-6 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2.5rem] transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xl' 
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8 md:p-12 animate-in fade-in duration-500 min-h-[400px]">
            {activeTab === 'balance' && (
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-50 dark:border-slate-800">
                   <div className="space-y-2">
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Registro de <span className="text-emerald-500">Entradas</span></h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fuentes de Recaudación Ministerial</p>
                   </div>
                   <button className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                      <Download size={18} /> Exportar Auditoría JSON
                   </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {balance?.incomeByConcept && Object.entries(balance.incomeByConcept).map(([concept, amount], idx) => (
                    <div key={concept} className="flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-850 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 group hover:border-emerald-200 transition-all duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto #{idx + 1}</p>
                          <h6 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{concept}</h6>
                       </div>
                       <div className="text-right">
                          <p className="text-2xl font-black text-emerald-600 tracking-tighter">{formatCurrency(amount)}</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Acumulado Mensual</p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'fixed' && (
              <div className="space-y-10">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-50 dark:border-slate-800">
                    <div className="space-y-2">
                       <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Gastos <span className="text-indigo-500">Operativos</span></h4>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mantenimiento y Estructura Base</p>
                    </div>
                    <button className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 shadow-indigo-500/10">
                       <Plus size={18} /> Gestionar Base Maestra
                    </button>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {fixedExpenses.map((expense, idx) => {
                    const cfg = EXPENSE_CATEGORY_CONFIG[expense.category] || EXPENSE_CATEGORY_CONFIG.OTROS;
                    return (
                      <div key={expense.id} className="group relative p-8 bg-white dark:bg-slate-850 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-indigo-100 dark:hover:border-indigo-500/20 transition-all duration-500 animate-in fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="flex items-center justify-between mb-8">
                           <div className={`p-4 rounded-2xl bg-${cfg.color}-50 dark:bg-${cfg.color}-500/10 text-${cfg.color}-600 group-hover:scale-110 transition-transform duration-500`}>
                             {cfg.icon}
                           </div>
                           <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${expense.isPaid ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                             {expense.isPaid ? 'Conciliado' : 'Pago Pendiente'}
                           </span>
                        </div>
                        <div className="space-y-1 mb-8">
                          <h5 className="font-black text-lg text-slate-900 dark:text-white truncate uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">{expense.fixedExpenseName}</h5>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cfg.label}</p>
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                           <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(expense.amount)}</span>
                           <button className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-300 rounded-2xl flex items-center justify-center hover:bg-slate-900 hover:text-white dark:hover:bg-indigo-600 transition-all group-hover:shadow-lg">
                             <ChevronRight size={20} strokeWidth={3} />
                           </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'occasional' && (
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-50 dark:border-slate-800">
                   <div className="space-y-2">
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Egresos <span className="text-rose-500">Ocasionales</span></h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Eventos Especiales y Contingencias</p>
                   </div>
                   <button className="flex items-center gap-3 px-10 py-5 bg-slate-900 dark:bg-amber-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 shadow-indigo-500/10">
                     <Plus size={20} /> Nuevo Egreso No Listado
                   </button>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-950 rounded-[3.5rem] overflow-hidden border border-slate-100 dark:border-slate-800">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-10 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Gasto / Concepto</th>
                        <th className="px-10 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoría</th>
                        <th className="px-10 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha Efec.</th>
                        <th className="px-10 py-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {occasionalExpenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer group">
                          <td className="px-10 py-8">
                            <p className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight group-hover:text-indigo-600 transition-colors">{expense.name}</p>
                            <p className="text-[10px] text-slate-400 italic mt-1">{expense.description}</p>
                          </td>
                          <td className="px-10 py-8">
                            <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">{expense.category}</span>
                          </td>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-3">
                                <Calendar size={12} className="text-slate-300" />
                                <span className="text-[10px] font-black text-slate-500 uppercase">{new Date(expense.expenseDate).toLocaleDateString()}</span>
                             </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <span className="text-xl font-black text-rose-600 tracking-tighter">{formatCurrency(expense.amount)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {occasionalExpenses.length === 0 && (
                    <div className="py-24 text-center space-y-4">
                       <FileText size={48} className="mx-auto text-slate-100 dark:text-slate-800" />
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">No hay gastos registrados en este periodo</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECURITY VAULT ZONE */}
      <div className="px-4">
        <div className="relative overflow-hidden bg-slate-900 p-10 md:p-14 rounded-[4rem] text-white flex flex-col xl:flex-row items-center justify-between gap-10 shadow-3xl shadow-indigo-900/40">
           {/* Background Decoration */}
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 opacity-30"></div>
           </div>

           <div className="flex flex-col md:flex-row items-center gap-10 relative">
              <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white border-4 border-white/10 shadow-inner group transition-all duration-500 hover:rotate-12">
                 <Lock size={40} strokeWidth={2.5} />
              </div>
              <div className="text-center md:text-left space-y-2">
                 <h4 className="text-4xl font-black tracking-tighter uppercase leading-none">Cierre de <span className="text-amber-400">Libros</span></h4>
                 <p className="text-xs font-black opacity-60 uppercase tracking-[0.3em]">Cámara de Seguridad Financiera • No Reversible</p>
                 <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                    <div className="flex -space-x-3">
                       {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black">L{i}</div>)}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500">AUTORIZACIÓN REQUERIDA NIVEL 3</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-col md:flex-row gap-4 relative w-full xl:w-auto">
              <button className="flex-1 md:flex-none px-10 py-6 bg-white/10 hover:bg-white/20 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/10 active:scale-95 flex items-center justify-center gap-3">
                 <Download size={18} /> Informe Maestro
              </button>
              <button className="flex-1 md:flex-none px-12 py-6 bg-indigo-500 hover:bg-indigo-400 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 flex items-center justify-center gap-3">
                 <CheckCircle2 size={18} /> Ejecutar Cierre Mensual
              </button>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .shadow-3xl { shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3); }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}} />

    </div>
  );
};

export default ChurchFinancePage;