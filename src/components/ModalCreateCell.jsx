import React, { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Users,
  MapPin,
  Clock,
  Calendar,
  Building,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import apiService from "../apiService";
import { logUserAction, logSecurityEvent } from "../utils/securityLogger";

const MEETING_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DISTRICTS = [
  { value: "D1", label: "Distrito 1" },
  { value: "D2", label: "Distrito 2" },
  { value: "D3", label: "Distrito 3" },
  { value: "PASTORES", label: "Asignar a Pastores" },
];

const ModalCreateCell = ({ isOpen, onClose, onCreateSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    mainLeaderId: "",
    branchLeaderId: "",
    groupLeaderId: "",
    hostId: "",
    timoteoId: "",
    meetingDay: "",
    meetingTime: "",
    meetingAddress: "",
    maxCapacity: "15",
    district: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [createResult, setCreateResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (step === 2 && leaders.length === 0) loadLeaders();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, step, leaders.length]);

  const loadLeaders = async () => {
    setLoadingLeaders(true);
    try {
      const activeLeaders = await apiService.getActiveLeaders();
      const leadersList = activeLeaders.map((leader) => ({
        id: leader.id,
        name: leader.memberName || `ID: ${leader.id}`,
        type: leader.leaderType,
        typeDisplay: leader.leaderTypeDisplay,
        isLeader12: leader.leaderType === "LEADER_12",
        isLeader144: leader.leaderType === "LEADER_144",
        isServant: leader.leaderType === "SERVANT",
      }));

      leadersList.sort((a, b) => {
        if (a.isLeader12 && !b.isLeader12) return -1;
        if (!a.isLeader12 && b.isLeader12) return 1;
        return a.name.localeCompare(b.name);
      });

      setLeaders(leadersList);
    } catch (err) {
      setError("Error al sincronizar liderazgo ministerial");
    } finally {
      setLoadingLeaders(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Definición de nombre requerida";
    if (formData.maxCapacity && (parseInt(formData.maxCapacity) < 1 || parseInt(formData.maxCapacity) > 1000)) {
      newErrors.maxCapacity = "Capacidad fuera de rango pastoral";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.mainLeaderId) newErrors.mainLeaderId = "Cobertura 12 requerida";
    if (!formData.groupLeaderId) newErrors.groupLeaderId = "Liderazgo de grupo requerido";
    if (!formData.hostId) newErrors.hostId = "Anfitrión designado requerido";
    if (!formData.timoteoId) newErrors.timoteoId = "Timoteo ministerial requerido";
    if (formData.hostId && formData.timoteoId && formData.hostId === formData.timoteoId) {
      newErrors.duplicateHostTimoteo = "El rol de anfitrión y timoteo debe ser diferenciado";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const cellData = {
        ...formData,
        mainLeaderId: parseInt(formData.mainLeaderId),
        branchLeaderId: formData.branchLeaderId ? parseInt(formData.branchLeaderId) : null,
        groupLeaderId: parseInt(formData.groupLeaderId),
        hostId: parseInt(formData.hostId),
        timoteoId: parseInt(formData.timoteoId),
        maxCapacity: parseInt(formData.maxCapacity),
        name: formData.name.trim(),
        meetingAddress: formData.meetingAddress.trim(),
        notes: formData.notes.trim(),
      };
      const result = await apiService.createCell(cellData);
      setCreateResult(result);
      logUserAction("create_cell", { cellName: cellData.name });
    } catch (err) {
      setError(err.message || "Fallo en la apertura sistémica");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    if (onCreateSuccess) onCreateSuccess(createResult);
    resetModal();
    onClose();
  };

  const resetModal = () => {
    setStep(1);
    setFormData({ name: "", mainLeaderId: "", branchLeaderId: "", groupLeaderId: "", hostId: "", timoteoId: "", meetingDay: "", meetingTime: "", meetingAddress: "", maxCapacity: "15", district: "", notes: "" });
    setErrors({});
    setCreateResult(null);
    setError("");
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={() => step === 3 && createResult ? handleFinalize() : (resetModal(), onClose())}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#0f172a] sm:rounded-[2.5rem] shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[95vh] overflow-hidden border border-slate-200 dark:border-white/10 animate-in slide-in-from-bottom-8 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative pt-10 pb-8 px-10 bg-white dark:bg-[#0f172a] shrink-0 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl shadow-indigo-500/20">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter uppercase">Apertura de Altar</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                   <p className="text-slate-500 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Configuración de Grupo Familiar</p>
                </div>
              </div>
            </div>
            <button
               onClick={() => step === 3 && createResult ? handleFinalize() : (resetModal(), onClose())}
               className="p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-rose-500 dark:hover:text-white rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* STEP INDICATOR */}
        <div className="px-10 pb-8 bg-white dark:bg-[#0f172a]">
           <div className="flex items-center justify-between relative px-2">
             <div className="absolute inset-x-0 top-5 h-1 bg-slate-100 dark:bg-white/5 rounded-full" />
             <div 
               className="absolute left-0 top-5 h-1 bg-indigo-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
               style={{ width: `${((step - 1) / 2) * 100}%` }} 
             />
             {[1, 2, 3].map((s) => (
               <div key={s} className="relative z-10 flex flex-col items-center">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${
                   step >= s ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-100 dark:border-white/5'
                 }`}>
                   {step > s ? <CheckCircle2 size={20} /> : s}
                 </div>
                 <span className={`text-[9px] font-black uppercase tracking-widest mt-2 transition-colors duration-500 ${step >= s ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                   {s === 1 ? 'LOGÍSTICA' : s === 2 ? 'LIDERAZGO' : 'CONFIRMAR'}
                 </span>
               </div>
             ))}
           </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/50 dark:bg-black/20">
          {error && (
            <div className="mb-8 p-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-[1.5rem] flex items-center gap-4 animate-shake">
              <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-600">
                <ShieldCheck size={20} />
              </div>
              <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-relaxed flex-1">{error}</p>
            </div>
          )}

          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {step === 1 && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><Building className="text-indigo-500" size={20} />Nombre del Altar</label>
                  <div className="relative group">
                    
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Identificador del grupo..."
                      className={`w-full h-16 pl-14 pr-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 ${errors.name ? 'border-rose-400' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'} font-bold text-sm tracking-tight outline-none shadow-inner transition-all`}
                    />
                  </div>
                  {errors.name && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-3">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><Calendar size={14} className="text-indigo-500" /> Día Ministerial</label>
                    <select
                      name="meetingDay"
                      value={formData.meetingDay}
                      onChange={handleChange}
                      className="w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 font-bold text-sm outline-none shadow-inner transition-all"
                    >
                      <option value="">Seleccionar día</option>
                      {MEETING_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><Clock size={14} className="text-indigo-500" /> Horario Pactado</label>
                    <input
                      type="time"
                      name="meetingTime"
                      value={formData.meetingTime}
                      onChange={handleChange}
                      className="w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 font-bold text-sm outline-none shadow-inner transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><MapPin size={14} className="text-indigo-500" /> Dirección de Altar</label>
                  <input
                    type="text"
                    name="meetingAddress"
                    value={formData.meetingAddress}
                    onChange={handleChange}
                    placeholder="Ubicación física del encuentro..."
                    className="w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 font-bold text-sm outline-none shadow-inner transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><Users size={14} className="text-indigo-500" /> Censo Estimado Cap.</label>
                    <input
                      type="number"
                      name="maxCapacity"
                      value={formData.maxCapacity}
                      onChange={handleChange}
                      className="w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 font-bold text-sm outline-none shadow-inner transition-all"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2"><MapPin size={14} className="text-indigo-500" /> DISTRITO</label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      className="w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 font-bold text-sm outline-none shadow-inner transition-all"
                    >
                      <option value="">Seleccionar cobertura</option>
                      {DISTRICTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                {loadingLeaders ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Liderazgo...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">🌿 Cobertura Red (LÍDER 12)</label>
                      <select
                        name="mainLeaderId"
                        value={formData.mainLeaderId}
                        onChange={handleChange}
                        className={`w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 ${errors.mainLeaderId ? 'border-rose-400' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'} font-bold text-sm outline-none shadow-inner transition-all`}
                      >
                        <option value="">Seleccionar líder 12</option>
                        {leaders.filter(l => l.isLeader12).map(l => <option key={l.id} value={l.id}>{l.name} ({l.typeDisplay})</option>)}
                      </select>
                    </div>

                    <div className="space-y-3 opacity-80">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">🌳 Cobertura Rama (LÍDER 144) <span className="opacity-50">(OPCIONAL)</span></label>
                      <select
                        name="branchLeaderId"
                        value={formData.branchLeaderId}
                        onChange={handleChange}
                        className="w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 border-slate-100 dark:border-white/5 focus:border-indigo-500 font-bold text-sm outline-none shadow-inner transition-all"
                      >
                        <option value="">Estructura Directa</option>
                        {leaders.filter(l => l.isLeader144).map(l => <option key={l.id} value={l.id}>{l.name} ({l.typeDisplay})</option>)}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">🌱 Liderazgo Directo del Grupo</label>
                      <select
                        name="groupLeaderId"
                        value={formData.groupLeaderId}
                        onChange={handleChange}
                        className={`w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 ${errors.groupLeaderId ? 'border-rose-400' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'} font-bold text-sm outline-none shadow-inner transition-all`}
                      >
                        <option value="">Seleccionar responsable</option>
                        {leaders.map(l => <option key={l.id} value={l.id}>{l.name} ({l.typeDisplay})</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">🏠 Anfitrión design.</label>
                          <select
                            name="hostId"
                            value={formData.hostId}
                            onChange={handleChange}
                            className={`w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 ${errors.hostId ? 'border-rose-400' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'} font-bold text-sm outline-none shadow-inner transition-all`}
                          >
                            <option value="">Seleccionar</option>
                            {leaders.filter(l => l.isServant).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">🦺 Timoteo ministerial</label>
                          <select
                            name="timoteoId"
                            value={formData.timoteoId}
                            onChange={handleChange}
                            className={`w-full h-16 px-6 rounded-[1.5rem] bg-white dark:bg-[#1a2332] border-2 ${errors.timoteoId ? 'border-rose-400' : 'border-slate-100 dark:border-white/5 focus:border-indigo-500'} font-bold text-sm outline-none shadow-inner transition-all`}
                          >
                            <option value="">Seleccionar</option>
                            {leaders.filter(l => l.isServant).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                       </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 text-center sm:text-left">
                {!createResult ? (
                   <div className="space-y-8">
                      <div className="bg-white dark:bg-[#1a2332] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-500/5">
                        <div className="flex items-center gap-3 mb-6">
                           <ShieldCheck className="text-indigo-500" size={18} />
                           <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Ficha de Registro Altar</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 text-[11px] uppercase tracking-widest">
                           <div className="flex flex-col gap-1">
                              <span className="text-slate-400 font-black">Identificador:</span>
                              <span className="text-slate-900 dark:text-white font-black text-sm">{formData.name}</span>
                           </div>
                           <div className="flex flex-col gap-1">
                              <span className="text-slate-400 font-black">Cronograma:</span>
                              <span className="text-slate-900 dark:text-white font-black text-sm">{formData.meetingDay} • {formData.meetingTime || '---'}</span>
                           </div>
                           <div className="flex flex-col gap-1">
                              <span className="text-slate-400 font-black">Liderazgo 12:</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{leaders.find(l => l.id === parseInt(formData.mainLeaderId))?.name || '---'}</span>
                           </div>
                           <div className="flex flex-col gap-1">
                              <span className="text-slate-400 font-black">Liderazgo Grupo:</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{leaders.find(l => l.id === parseInt(formData.groupLeaderId))?.name || '---'}</span>
                           </div>
                        </div>
                      </div>
                      <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/20 flex items-center justify-between group overflow-hidden relative">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-700" />
                         <div className="space-y-2 relative z-10">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Estructura Ministerial</h4>
                            <p className="text-2xl font-black tracking-tighter">{formData.branchLeaderId ? 'Arquitectura Jerárquica' : 'Conexión Directa a Red'}</p>
                         </div>
                         <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 relative z-10 backdrop-blur-md border border-white/20">
                            <ShieldCheck className="w-8 h-8" />
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="bg-emerald-50 dark:bg-emerald-500/5 p-12 rounded-[3rem] border border-emerald-100 dark:border-emerald-500/20 text-center space-y-8 animate-in zoom-in-95 duration-700">
                      <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 relative">
                         <div className="absolute inset-0 rounded-[2rem] bg-emerald-500 animate-ping opacity-20" />
                         <CheckCircle2 size={48} className="relative z-10" />
                      </div>
                      <div className="space-y-3">
                         <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Activación Exitosa</h3>
                         <p className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest pl-1">El Altar <strong>{formData.name}</strong> ha sido comisionado.</p>
                      </div>
                      <div className="inline-flex px-8 py-3 bg-white dark:bg-[#0f172a] rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em]">
                        Certificación: {createResult.hierarchyType || 'ESTÁNDAR'}
                      </div>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-white/5 flex flex-col-reverse sm:flex-row justify-between items-center shrink-0 px-10 gap-6 relative z-20">
          <div className="flex items-center gap-4 w-full sm:w-auto">
             {step > 1 && !createResult && (
               <button
                 onClick={() => setStep(step - 1)}
                 disabled={loading}
                 className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm"
               >
                 <ChevronLeft size={18} /> Atrás
               </button>
             )}
             {!createResult && (
               <button
                 onClick={() => { resetModal(); onClose(); }}
                 disabled={loading}
                 className="flex-1 sm:flex-none px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 transition-colors"
               >
                 Cancelar
               </button>
             )}
          </div>

          <div className="w-full sm:w-auto">
             {step < 3 ? (
               <button
                 onClick={() => { if (step === 1 ? validateStep1() : validateStep2()) setStep(step + 1); }}
                 className="w-full sm:w-auto flex items-center justify-center gap-4 px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-[1.5rem] transition-all active:scale-95 shadow-2xl shadow-indigo-500/20 hover:-translate-y-1"
               >
                 Siguiente Fase <ChevronRight size={18} />
               </button>
             ) : !createResult ? (
               <button
                 onClick={handleCreate}
                 disabled={loading}
                 className="w-full sm:w-auto flex items-center justify-center gap-4 px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-[1.5rem] transition-all active:scale-95 shadow-2xl shadow-emerald-500/20 hover:-translate-y-1 disabled:opacity-50"
               >
                 {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle2 size={18} /> Confirmar Apertura</>}
               </button>
             ) : (
               <button
                 onClick={handleFinalize}
                 className="w-full sm:w-auto px-12 py-5 bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-[1.5rem] transition-all active:scale-95 shadow-2xl shadow-indigo-500/20 hover:-translate-y-1"
               >
                 Finalizar Inspección
               </button>
             )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.2); border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(71, 85, 105, 0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(99, 102, 241, 0.5); }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
      `}} />
    </div>
  );
};

export default ModalCreateCell;