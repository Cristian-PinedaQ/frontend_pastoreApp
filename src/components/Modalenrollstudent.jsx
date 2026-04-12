// ============================================
// ModalEnrollStudent.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import apiService from "../apiService";
import { useConfirmation } from "../context/ConfirmationContext";
import nameHelper from "../services/nameHelper";
import { generateStudentsByLevelPDF } from "../services/studentsByLevelPdfGenerator";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  GraduationCap, 
  Users, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  UserCheck, 
  Calendar,
  CreditCard,
  Check,
  Loader2
} from "lucide-react";

const { getDisplayName } = nameHelper;

const getMemberLevelCode = (member) => {
  if (!member?.currentLevel) return null;
  return typeof member.currentLevel === "object" ? member.currentLevel.code : member.currentLevel;
};

const ModalEnrollStudent = ({ isOpen, onClose, onEnrollmentSuccess }) => {
  const confirm = useConfirmation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [studentsByLevel, setStudentsByLevel] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [availableCohorts, setAvailableCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [enrollingStatus, setEnrollingStatus] = useState({});
  const [allMembers, setAllMembers] = useState([]);
  const [confirmedExternal, setConfirmedExternal] = useState([]);
  const isEnrolling = useRef(false);

  const LEVELS = [
    { value: "PREENCUENTRO",            label: "Pre-encuentro",            order: 1,  color: 'blue' },
    { value: "ENCUENTRO",               label: "Encuentro",                 order: 2,  color: 'violet' },
    { value: "POST_ENCUENTRO",          label: "Post-encuentro",            order: 3,  color: 'indigo' },
    { value: "BAUTIZOS",                label: "Bautizos",                  order: 4,  color: 'cyan' },
    { value: "ESENCIA_1",               label: "ESENCIA 1",                 order: 5,  color: 'emerald' },
    { value: "ESENCIA_2",               label: "ESENCIA 2",                 order: 6,  color: 'emerald' },
    { value: "ESENCIA_3",               label: "ESENCIA 3",                 order: 7,  color: 'emerald' },
    { value: "SANIDAD_INTEGRAL_RAICES", label: "Sanidad Integral Raíces",   order: 8,  color: 'rose' },
    { value: "ESENCIA_4",               label: "ESENCIA 4",                 order: 9,  color: 'emerald' },
    { value: "ADIESTRAMIENTO",          label: "Adiestramiento",            order: 10, color: 'amber' },
    { value: "GRADUACION",              label: "Graduación",                order: 11, color: 'purple' },
  ];

  // ─── Theme Detection ────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark');
    };
    checkDark();
    const invoker = setInterval(checkDark, 1000);
    return () => clearInterval(invoker);
  }, []);

  const handleReset = useCallback(() => {
    setStep(1);
    setSelectedLevel(null);
    setStudentsByLevel([]);
    setSelectedStudents([]);
    setAvailableCohorts([]);
    setSelectedCohort(null);
    setSearchStudent("");
    setError("");
    setEnrollingStatus({});
    setConfirmedExternal([]);
    onClose();
  }, [onClose]);

  const loadAllMembers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiService.getAllMembers();
      setAllMembers(data || []);
    } catch (err) {
      setError("Error al cargar miembros: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadAllMembers();
    else handleReset();
  }, [isOpen, handleReset]);

  const generatePDFByLevel = async (level) => {
    const levelInfo = LEVELS.find((l) => l.value === level);
    if (!levelInfo) return;
    try {
      setLoading(true);
      const levelDetail = await apiService.getLevelStudents(level);
      if (!levelDetail || levelDetail.totalStudents === 0) {
        await confirm({
          title: "Sin Estudiantes",
          message: `No se encontraron estudiantes registrados en el nivel ${levelInfo.label} para generar el reporte.`,
          type: "info",
          confirmLabel: "Entendido"
        });
        return;
      }
      const students = [
        ...(levelDetail.currentlyStudying || []).map(s => ({ ...s, statusCategory: "Cursando", name: s.memberName || "Sin nombre" })),
        ...(levelDetail.completed || []).map(s => ({ ...s, statusCategory: "Completado", name: s.memberName || "Sin nombre" })),
        ...(levelDetail.failed || []).map(s => ({ ...s, statusCategory: "Reprobado", name: s.memberName || "Sin nombre" }))
      ];
      generateStudentsByLevelPDF({
        students,
        level,
        levelLabel: levelInfo.label,
        totalStudents: students.length,
        stats: {
          maleCount: students.filter(s => s.gender === "MASCULINO").length,
          femaleCount: students.filter(s => s.gender === "FEMENINO").length,
          passedCount: levelDetail.passedCount || 0,
          activeCount: levelDetail.activeCount || 0,
          failedCount: levelDetail.failedCount || 0,
          averageAttendance: levelDetail.averageAttendance || 0,
          averageScore: levelDetail.averageScore || 0,
        },
      });
    } catch (err) {
      setError("Error generando PDF: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsByLevel = useCallback(async () => {
    if (!selectedLevel) return;
    setLoading(true);
    try {
      const filtered = allMembers.filter(m => getMemberLevelCode(m) === selectedLevel);
      setStudentsByLevel(filtered);
    } catch (err) {
      setError("Error al filtrar estudiantes");
    } finally {
      setLoading(false);
    }
  }, [selectedLevel, allMembers]);

  useEffect(() => {
    if (selectedLevel && step === 2) {
      loadStudentsByLevel();
      setSelectedStudents([]);
    }
  }, [selectedLevel, step, loadStudentsByLevel]);

  const loadAvailableCohorts = useCallback(async () => {
    if (!selectedLevel) return;
    setLoading(true);
    try {
      const data = await apiService.getAvailableCohortsByLevel(selectedLevel);
      const transformed = (data || []).map(c => ({
        cohortId: c.cohortId ?? c.id,
        cohortName: c.cohortName ?? c.name,
        currentStudents: c.currentStudents ?? 0,
        maxStudents: c.maxStudents ?? 0,
        availableSpots: (c.maxStudents ?? 0) - (c.currentStudents ?? 0),
        available: ((c.maxStudents ?? 0) - (c.currentStudents ?? 0)) > 0,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        maestro: c.maestro ? { ...c.maestro, displayName: getDisplayName(c.maestro.name) } : null,
      }));
      setAvailableCohorts(transformed);
    } catch (err) {
      setError("Error al cargar cohortes disponibles");
    } finally {
      setLoading(false);
    }
  }, [selectedLevel]);

  useEffect(() => {
    if (selectedLevel && step === 3) loadAvailableCohorts();
  }, [selectedLevel, step, loadAvailableCohorts]);

  const handleNext = () => {
    if (step === 1 && !selectedLevel) { setError("Selecciona un nivel"); return; }
    if (step === 2 && selectedStudents.length === 0) { setError("Selecciona al menos un estudiante"); return; }
    setStep(step + 1);
    setError("");
  };

  const handlePrevious = () => { if (step > 1) setStep(step - 1); setError(""); };

  const toggleStudent = async (student) => {
    const alreadySelected = selectedStudents.some(s => s.id === student.id);
    if (alreadySelected) {
      setSelectedStudents(prev => prev.filter(s => s.id !== student.id));
      setConfirmedExternal(prev => prev.filter(id => id !== student.id));
      return;
    }
    const isExternal = selectedLevel === "PREENCUENTRO" && getMemberLevelCode(student) !== "PREENCUENTRO";
    if (isExternal && !confirmedExternal.includes(student.id)) {
      const isConfirmed = await confirm({
        title: "Advertencia Académica",
        message: `"${getDisplayName(student.name)}" ya tiene un proceso formativo avanzado. ¿Seguro que quieres reiniciarlo inscribiéndolo en PREENCUENTRO?`,
        type: "warning",
        confirmLabel: "Sí, reiniciar proceso",
        onConfirm: async () => { }
      });
      if (!isConfirmed) return;
      setConfirmedExternal(prev => [...prev, student.id]);
    }
    setSelectedStudents(prev => [...prev, student]);
  };

  const filteredStudents = useMemo(() => {
    const source = selectedLevel === "PREENCUENTRO" ? allMembers : studentsByLevel;
    const q = searchStudent.toLowerCase();
    return source.filter(m => 
      m.name?.toLowerCase().includes(q) || 
      getDisplayName(m.name)?.toLowerCase().includes(q) ||
      m.document?.includes(q)
    );
  }, [selectedLevel, allMembers, studentsByLevel, searchStudent]);

  const handleEnroll = async () => {
    if (isEnrolling.current) return;
    isEnrolling.current = true;
    setLoading(true);
    setEnrollingStatus({});
    try {
      let successCount = 0;
      for (const student of selectedStudents) {
        setEnrollingStatus(prev => ({ ...prev, [student.id]: 'enrolling' }));
        try {
          await apiService.createStudentEnrollment(student.id, selectedCohort.cohortId);
          setEnrollingStatus(prev => ({ ...prev, [student.id]: 'success' }));
          successCount++;
        } catch (err) {
          setEnrollingStatus(prev => ({ ...prev, [student.id]: 'error' }));
        }
      }
      if (successCount > 0) {
        setTimeout(() => {
          handleReset();
          onEnrollmentSuccess();
        }, 1500);
      }
    } finally {
      setLoading(false);
      isEnrolling.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={handleReset} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20`}>
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {step === 1 ? "Inscripción: Paso 1" : step === 2 ? "Inscripción: Paso 2" : "Inscripción: Paso 3"}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {step === 1 ? "Selecciona el nivel académico" : step === 2 ? "Selecciona los estudiantes" : "Selecciona la cohorte activa"}
              </p>
            </div>
          </div>
          <button onClick={handleReset} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><X size={24} /></button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 animate-head-shake">
              <AlertTriangle size={18} />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          {/* STEP 1: LEVELS */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 dark:text-slate-400 font-medium italic">Selecciona el nivel para proceder con la inscripción:</p>
                {selectedLevel && (
                  <button 
                    onClick={() => generatePDFByLevel(selectedLevel)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-all"
                  >
                    <FileText size={16} /> Exportar Listado
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {LEVELS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => setSelectedLevel(l.value)}
                    className={`p-4 rounded-[1.5rem] border-2 text-left transition-all relative overflow-hidden group ${
                      selectedLevel === l.value 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/50'
                    }`}
                  >
                    {selectedLevel === l.value && <div className="absolute top-2 right-2 text-indigo-600"><CheckCircle2 size={16} /></div>}
                    <div className={`w-8 h-8 rounded-lg bg-${l.color}-500/10 text-${l.color}-600 dark:text-${l.color}-400 flex items-center justify-center mb-3`}>
                      <Layers size={18} />
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight leading-tight">{l.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: STUDENTS */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Buscar estudiante por nombre o documento..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 font-medium"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {selectedStudents.length} Seleccionados
                  </span>
                  <button 
                    onClick={() => {
                      if (selectedStudents.length === filteredStudents.length) setSelectedStudents([]);
                      else setSelectedStudents(filteredStudents);
                    }}
                    className="px-4 py-2 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    {selectedStudents.length === filteredStudents.length ? 'Deseleccionar' : 'Seleccionar Todos'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredStudents.map(student => {
                  const isSelected = selectedStudents.some(s => s.id === student.id);
                  const status = enrollingStatus[student.id];
                  const isExternal = selectedLevel === "PREENCUENTRO" && getMemberLevelCode(student) !== "PREENCUENTRO";

                  return (
                    <div 
                      key={student.id}
                      onClick={() => status !== 'success' && toggleStudent(student)}
                      className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm'
                      } ${status === 'success' ? 'opacity-60 grayscale' : ''}`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${isSelected ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        {status === 'success' ? <Check size={24} /> : student.name?.charAt(0)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-black text-slate-800 dark:text-white tracking-tight uppercase line-clamp-1">
                            {getDisplayName(student.name)}
                          </p>
                          {isSelected && <CheckCircle2 size={16} className="text-indigo-600 animate-in zoom-in" />}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            <CreditCard size={12} /> {student.document || '---'}
                          </span>
                          {isExternal && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-tight italic bg-amber-500/10 px-1.5 rounded-lg border border-amber-500/20">
                              <AlertTriangle size={10} /> Avanzado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: COHORTS */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full w-fit">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{selectedLevel}</span>
                  </div>
                  <h3 className="text-3xl font-black tracking-tighter leading-none italic">Asignar Cohorte de Destino</h3>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-5xl font-black">{selectedStudents.length}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Estudiantes a Inscribir</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {availableCohorts.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Layers size={40} />
                    </div>
                    <div>
                      <p className="font-black text-slate-400 uppercase tracking-widest italic">No hay cohortes activas</p>
                      <p className="text-sm text-slate-500 font-medium">Debes crear una cohorte para el nivel "{selectedLevel}" antes de continuar.</p>
                    </div>
                  </div>
                ) : (
                  availableCohorts.map(cohort => (
                    <button
                      key={cohort.cohortId}
                      onClick={() => cohort.available && setSelectedCohort(cohort)}
                      disabled={!cohort.available}
                      className={`p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden group flex flex-col md:flex-row gap-6 md:items-center ${
                        selectedCohort?.cohortId === cohort.cohortId
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 bg-white dark:bg-slate-900 shadow-sm'
                      } ${!cohort.available ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner`}>
                          <Users size={32} strokeWidth={1.5} />
                        </div>
                        {selectedCohort?.cohortId === cohort.cohortId && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{cohort.cohortName}</h4>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            cohort.available ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }`}>
                            {cohort.available ? 'Disponible' : 'Sin Cupos'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maestro</p>
                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <UserCheck size={14} className="text-indigo-500" /> {cohort.maestro?.displayName || 'Por Asignar'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Periodo</p>
                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Calendar size={14} className="text-indigo-500" /> {new Date(cohort.startDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cupos Libres</p>
                            <p className={`text-xs font-black flex items-center gap-1.5 ${cohort.availableSpots < 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              <Users size={14} /> {cohort.availableSpots} de {cohort.maxStudents}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                             <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden border border-slate-200 dark:border-slate-700">
                                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(cohort.currentStudents / cohort.maxStudents) * 100}%` }} />
                             </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReset} 
              className="px-6 py-3 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm active:scale-95"
            >
              Cancelar Proceso
            </button>
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button 
                onClick={handlePrevious} 
                className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95 text-sm"
              >
                <ChevronLeft size={20} /> Atrás
              </button>
            )}
            {step < 3 ? (
              <button 
                onClick={handleNext}
                disabled={loading || (step === 1 && !selectedLevel) || (step === 2 && selectedStudents.length === 0)}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all text-sm active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
              >
                Siguiente Paso <ChevronRight size={20} />
              </button>
            ) : (
              <button 
                onClick={handleEnroll}
                disabled={loading || !selectedCohort || selectedStudents.length === 0}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all text-sm active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {loading ? "Sincronizando..." : "Finalizar Inscripción"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalEnrollStudent;
