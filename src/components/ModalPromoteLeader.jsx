// ============================================
// ModalPromoteLeader.jsx - ELITE MODERN EDITION
// ============================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Search,
  CheckCircle2,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  Star,
  Users,
  Trophy,
  Zap,
  ShieldAlert,
  Ghost,
  Fingerprint,
  MessageSquare,
  Sparkles,
  Target,
  Crown,
  RefreshCcw
} from "lucide-react";
import apiService from "../apiService";
import { logUserAction } from "../utils/securityLogger";



const LEADER_TYPES = [
  {
    value: "SERVANT",
    label: "Servidor",
    icon: <Star size={24} />,
    description: "Nivel mínimo: ESENCIA 2 o superior",
    requiredLevelCode: "ESENCIA_2",
    requiredLevelOrder: 6,
    color: "blue",
    gradient: "from-blue-500/20 to-indigo-600/20",
    accent: "bg-blue-600",
    border: "border-blue-200 dark:border-blue-800/50",
    text: "text-blue-600 dark:text-blue-400"
  },
  {
    value: "LEADER_144",
    label: "Líder 144",
    icon: <Users size={24} />,
    description: "Nivel mínimo: Graduación (Líder de Rama)",
    requiredLevelCode: "GRADUACION",
    requiredLevelOrder: 11,
    color: "amber",
    gradient: "from-amber-500/20 to-orange-600/20",
    accent: "bg-amber-600",
    border: "border-amber-200 dark:border-amber-800/50",
    text: "text-amber-600 dark:text-amber-400"
  },
  {
    value: "LEADER_12",
    label: "Líder 12",
    icon: <Award size={24} />,
    description: "Nivel mínimo: Graduación (Líder de Red)",
    requiredLevelCode: "GRADUACION",
    requiredLevelOrder: 11,
    color: "emerald",
    gradient: "from-green-500/20 to-emerald-600/20",
    accent: "bg-emerald-600",
    border: "border-emerald-200 dark:border-emerald-800/50",
    text: "text-emerald-600 dark:text-emerald-400"
  },
];

const ModalPromoteLeader = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [levels, setLevels] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [cellGroupCode, setCellGroupCode] = useState("");
  const [notes, setNotes] = useState("");
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [promotionResult, setPromotionResult] = useState(null);
  const [error, setError] = useState("");

  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const loadLevels = useCallback(async () => {
    try {
      const data = await apiService.getActiveLevels();
      setLevels(data || []);
    } catch (error) {
      setLevels(apiService.getDefaultLevels());
    }
  }, []);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const getLevelDisplayName = useCallback((level) => {
    if (!level) return "Pendiente";
    if (typeof level === "object") return level.displayName || level.code || "Pendiente";
    const foundLevel = levels.find((l) => l.code === level);
    return foundLevel?.displayName || level;
  }, [levels]);

  const getLevelOrder = useCallback((level) => {
    if (!level) return 0;
    if (typeof level === "object") return level.levelOrder || 0;
    const foundLevel = levels.find((l) => l.code === level);
    return foundLevel?.levelOrder || 0;
  }, [levels]);

  const checkBasicEligibility = useCallback((member, leaderType) => {
    const typeConfig = LEADER_TYPES.find((t) => t.value === leaderType);
    if (!typeConfig) return null;

    const memberLevelObj = member.currentLevel || member.levelEnrollment;
    const memberLevelOrder = getLevelOrder(memberLevelObj);
    const hasRequiredLevel = memberLevelOrder >= typeConfig.requiredLevelOrder;

    let levelMessage = "";
    if (!hasRequiredLevel) {
      const requiredLevelName = getLevelDisplayName(typeConfig.requiredLevelCode);
      const currentLevelName = getLevelDisplayName(memberLevelObj);
      levelMessage = `Nivel insuficiente: ${currentLevelName}. Mínimo ${requiredLevelName}.`;
    }

    return {
      hasRequiredLevel,
      hasMaritalStatus: !!member.maritalStatus,
      hasTitheLastThreeMonths: member.hasTitheLastThreeMonths || false,
      levelMessage,
      isEligible: hasRequiredLevel,
    };
  }, [getLevelOrder, getLevelDisplayName]);

  const performSearch = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setSearching(true);
    setError("");

    try {
      const members = await apiService.searchMembers(term);
      const nonLeaderMembers = members.filter((m) => !m.isLeader);
      const enhancedResults = nonLeaderMembers.map((member) => ({
        ...member,
        eligibility: {
          SERVANT: checkBasicEligibility(member, "SERVANT"),
          LEADER_144: checkBasicEligibility(member, "LEADER_144"),
          LEADER_12: checkBasicEligibility(member, "LEADER_12"),
        },
        currentLevelDisplay: getLevelDisplayName(member.currentLevel || member.levelEnrollment),
      }));
      setSearchResults(enhancedResults);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError("Error al buscar miembros");
    } finally {
      setSearching(false);
    }
  }, [checkBasicEligibility, getLevelDisplayName]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => performSearch(searchTerm), 500);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchTerm, performSearch]);

  const handleCheckEligibility = async () => {
    if (!selectedType) {
      setError("Seleccione un tipo de liderazgo");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiService.checkEligibility(selectedMember.id, selectedType);
      setEligibilityResult(result);
      setStep(3);
    } catch (err) {
      setError(err.message || "Error al verificar requisitos");
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiService.promoteToLeader(selectedMember.id, selectedType, cellGroupCode || null, notes || null);
      setPromotionResult(result);
      setStep(4);
      logUserAction("promote_to_leader", { memberId: selectedMember.id, leaderType: selectedType });
    } catch (err) {
      setError(err.message || "Error al procesar promoción");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    if (onSuccess) onSuccess(promotionResult);
    onClose();
  };

  const renderProgress = () => {
    const steps = [
      { id: 1, label: "Selección", icon: <User size={14} /> },
      { id: 2, label: "Gobierno", icon: <Crown size={14} /> },
      { id: 3, label: "Auditoría", icon: <ShieldCheck size={14} /> },
      { id: 4, label: "Visión", icon: <Trophy size={14} /> }
    ];
    return (
      <div className="flex items-center justify-between mb-8 md:mb-12 relative px-4 overflow-x-auto no-scrollbar pb-2">
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 dark:bg-slate-800" />
        <div 
          className="absolute left-8 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-700 ease-in-out" 
          style={{ width: `${((step - 1) / (steps.length - 1)) * 90}%` }}
        />
        {steps.map((s) => (
          <div key={s.id} className="relative z-10 flex flex-col items-center gap-2 shrink-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500 overflow-hidden ${
              step >= s.id ? "bg-blue-600 text-white shadow-xl shadow-blue-500/30 rotate-0" : "bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-400 rotate-12"
            }`}>
              {step > s.id ? <CheckCircle2 size={18} /> : s.icon}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>{s.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-0 md:p-6 lg:p-8 overflow-y-auto bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose}>
      <div className="relative w-full min-h-full md:min-h-0 md:h-auto md:max-h-[90vh] max-w-4xl bg-white dark:bg-slate-900 rounded-none md:rounded-[3rem] shadow-2xl border-none md:border border-slate-200 dark:border-slate-800 flex flex-col overflow-visible md:overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>
        
        {/* Decorative background effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        <div className="flex justify-between items-center px-6 md:px-10 py-4 md:py-8 border-b border-slate-100 dark:border-slate-800 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Award size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Promoción Ministerial</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mt-1">Niveles de Gobierno & Unción</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-visible md:overflow-y-auto custom-scrollbar p-6 md:p-10 relative z-10">
          {renderProgress()}

          {error && (
            <div className="mb-8 p-5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-[1.5rem] flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="transition-all duration-700 ease-in-out">
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Buscar Aspitante</h3>
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-all" size={24} />
                    <input
                      type="text"
                      placeholder="Ingrese nombre, documento o email del miembro..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-16 md:h-20 pl-16 pr-8 bg-slate-50 dark:bg-slate-950/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-8 focus:ring-blue-50 dark:focus:ring-blue-900/10 outline-none transition-all font-bold text-lg text-slate-800 dark:text-white"
                      disabled={searching}
                    />
                    {searching && (
                      <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        <RefreshCcw className="animate-spin text-blue-500" size={24} />
                      </div>
                    )}
                  </div>
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => { setSelectedMember(member); setStep(2); setError(""); }}
                        className="group bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-800 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer transition-all duration-300"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <User size={28} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <h4 className="font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">{member.name}</h4>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Fingerprint size={12} /> {member.document || 'No Document'}</span>
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><Trophy size={12} /> {member.currentLevelDisplay}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchTerm.length >= 2 && !searching && (
                  <div className="py-20 text-center space-y-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <Ghost size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="text-slate-500 dark:text-slate-400 font-bold">Sin aspirantes encontrados en el radar</p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && selectedMember && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-[2rem] border border-blue-100 dark:border-blue-900/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg font-black text-2xl tracking-tighter shrink-0">{selectedMember.name?.[0]?.toUpperCase()}</div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.2em]">Candidato Seleccionado</span>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">{selectedMember.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700/60 dark:text-blue-400/60">
                         <Target size={14} /> Nivel Actual: {getLevelDisplayName(selectedMember.currentLevel || selectedMember.levelEnrollment)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Crown size={20} className="text-blue-600" /> Tipo de Gobierno Ministerial
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {LEADER_TYPES.map((type) => {
                      const eligibility = selectedMember.eligibility[type.value];
                      const isSelected = selectedType === type.value;
                      return (
                        <div
                          key={type.value}
                          onClick={() => setSelectedType(type.value)}
                          className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${
                            isSelected ? `${type.border} ${type.gradient} scale-105 shadow-2xl shadow-blue-500/10` : 
                            "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer shadow-sm"
                          } ${!eligibility.isEligible && !isSelected ? "opacity-70 grayscale-[0.5]" : ""}`}
                        >
                          <div className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border ${isSelected ? type.border : 'border-slate-50 dark:border-slate-700'} w-fit shrink-0 mb-6 shadow-xl ${type.text}`}>
                            {type.icon}
                          </div>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2 leading-none">{type.label}</h4>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">{type.description}</p>
                          
                          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mínimo: {getLevelDisplayName(type.requiredLevelCode)}</span>
                             {isSelected && <Zap size={16} className={`${type.text} animate-pulse`} />}
                          </div>

                          {!eligibility.isEligible && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-[10px] font-black text-red-600 uppercase tracking-widest">
                               ⚠️ {eligibility.levelMessage || 'Requisitos Pendientes'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <Fingerprint size={14} className="text-blue-500" /> Código de Célula
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: CEL-NORTH-01"
                      value={cellGroupCode}
                      onChange={(e) => setCellGroupCode(e.target.value)}
                      className="w-full h-16 px-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <MessageSquare size={14} className="text-blue-500" /> Notas de Nombramiento
                    </label>
                    <textarea
                      placeholder="Observaciones importantes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="2"
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-white resize-none h-16"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && eligibilityResult && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`p-8 rounded-[2.5rem] border flex items-center justify-between relative overflow-hidden group ${
                  eligibilityResult.isEligible ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50" : "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/50"
                }`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 ${eligibilityResult.isEligible ? 'bg-emerald-500/10' : 'bg-red-500/10'}`} />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
                      eligibilityResult.isEligible ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}>
                      {eligibilityResult.isEligible ? <CheckCircle2 size={32} /> : <ShieldAlert size={32} />}
                    </div>
                    <div>
                      <h4 className={`text-2xl font-black tracking-tight leading-none ${eligibilityResult.isEligible ? "text-emerald-800 dark:text-emerald-400" : "text-red-800 dark:text-red-400"}`}>
                        {eligibilityResult.isEligible ? "Mando Ministerial Validado" : "Requisitos No Satisfechos"}
                      </h4>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-2 ${eligibilityResult.isEligible ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                        Auditoría de cumplimiento de liderazgo — Raiz Viva - Vision 2026
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-6 border-b border-slate-50 dark:border-slate-800 pb-4">
                      <ShieldCheck size={16} className="text-emerald-500" /> Requisitos Superados
                    </h5>
                    <div className="space-y-4">
                      {eligibilityResult.passedRequirements?.map((req, i) => (
                        <div key={i} className="flex items-center gap-3 bg-emerald-50/50 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                           <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0 ring-4 ring-emerald-50 dark:ring-emerald-950/50">
                             <CheckCircle2 size={12} />
                           </div>
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 mb-6 border-b border-slate-50 dark:border-slate-800 pb-4">
                      <ShieldAlert size={16} className="text-red-500" /> Brechas en el Perfil
                    </h5>
                    <div className="space-y-4">
                      {eligibilityResult.failedRequirements?.length > 0 ? eligibilityResult.failedRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-3 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl border border-red-100/50 dark:border-red-900/30">
                           <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs shrink-0 ring-4 ring-red-50 dark:ring-red-950/50">
                             <X size={12} />
                           </div>
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{req}</span>
                        </div>
                      )) : (
                        <div className="text-center py-8">
                           <Sparkles size={32} className="mx-auto text-emerald-400 opacity-20" />
                           <p className="text-[10px] font-black uppercase text-slate-400 mt-2">Cumplimiento Total</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                   <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Aspirante</span>
                      <p className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{eligibilityResult.memberName}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Nivel Actual</span>
                      <p className="text-sm font-black text-blue-600 dark:text-blue-400 line-clamp-1">{getLevelDisplayName(eligibilityResult.memberCurrentLevel)}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Estado Civil</span>
                      <p className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{eligibilityResult.maritalStatus || 'No Reg.'}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Fidelidad 3M</span>
                      <p className={`text-sm font-black line-clamp-1 ${eligibilityResult.hasTitheLastThreeMonths ? 'text-emerald-500' : 'text-red-500'}`}>{eligibilityResult.hasTitheLastThreeMonths ? 'COMPLETA' : 'INCOMPLETA'}</p>
                   </div>
                </div>
              </div>
            )}

            {step === 4 && promotionResult && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-10 animate-in zoom-in duration-700">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
                  <div className="w-32 h-32 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-2xl relative z-10 transform scale-110 rotate-3">
                    <Trophy size={64} className="animate-bounce" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-full text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                    <CheckCircle2 size={14} /> Nueva Jerarquía Establecida
                  </div>
                  <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight max-w-lg mx-auto">
                    ¡Gobierno Activado para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{promotionResult.memberName}</span>!
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-bold tracking-tight">El miembro ha sido oficialmente ascendido a <span className="text-blue-600 dark:text-blue-400">{promotionResult.leaderTypeDisplay}</span>.</p>
                </div>

                <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 space-y-4 text-left">
                  <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Credencial Ministerial</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">#{promotionResult.leaderId}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Estado Sistémico</span>
                    <span className="text-sm font-black text-emerald-500">{promotionResult.status}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Célula Asignada</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{promotionResult.cellGroupCode || 'PENDIENTE'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 md:px-10 py-6 md:py-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30 shrink-0 relative z-10">
          <div>
            {step > 1 && step < 4 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50"
              >
                <ChevronLeft size={18} /> Atrás
              </button>
            )}
          </div>
          <div className="flex gap-4">
            {step < 4 && (
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
            )}

            {step === 1 && (
              <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] flex items-center gap-2 pr-4 italic">Seleccione un aspirante para continuar <ChevronRight size={12} /></p>
            )}

            {step === 2 && (
              <button
                onClick={handleCheckEligibility}
                disabled={loading || !selectedType}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black dark:hover:bg-slate-100 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCcw className="animate-spin" size={18} /> : "Verificar Requisitos"} <ChevronRight size={18} />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handlePromote}
                disabled={loading || !eligibilityResult?.isEligible}
                className={`flex items-center gap-3 px-10 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all ${
                  eligibilityResult?.isEligible
                    ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:shadow-blue-500/50 hover:-translate-y-1 active:scale-95"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50"
                }`}
              >
                {loading ? <RefreshCcw className="animate-spin" size={18} /> : "Confirmar Promoción"} <ChevronRight size={18} />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleFinalize}
                className="flex items-center gap-3 px-10 py-4 bg-emerald-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 hover:-translate-y-1 active:scale-95 transition-all"
              >
                Finalizar Operación <CheckCircle2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPromoteLeader;