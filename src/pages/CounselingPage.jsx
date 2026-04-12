// ============================================
// CounselingPage.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import apiService from "../apiService";
import { useConfirmation } from "../context/ConfirmationContext";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  FileText,
  BarChart3,
  MoreVertical,
  History,
  UserCheck,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MapPin,
  ClipboardList,
  Target,
  Bell,
  Activity,
  User,
  Phone,
  Mail,
  Zap,
  RefreshCw,
  Download,
  Ghost,
  ShieldCheck,
  Edit3,
} from "lucide-react";

// ============================================================
// CONSTANTES
// ============================================================
const COUNSELING_STATUS = {
  SCHEDULED:   { label: "Programada",   color: "indigo",  icon: Calendar    },
  RESCHEDULED: { label: "Reprogramada", color: "violet",  icon: RefreshCw   },
  IN_PROGRESS: { label: "En curso",     color: "emerald", icon: Activity    },
  COMPLETED:   { label: "Completada",   color: "sky",     icon: CheckCircle2 },
  CANCELLED:   { label: "Cancelada",    color: "rose",    icon: XCircle     },
  NO_SHOW:     { label: "No asistió",   color: "amber",   icon: Ghost       },
};

const COUNSELING_TOPICS = {
  SPIRITUAL: "🙏 Espiritual",
  FAMILY:    "👨‍👩‍👧‍👦 Familiar",
  MARRIAGE:  "💍 Matrimonial",
  EMOTIONAL: "🧠 Emocional",
  FINANCIAL: "💰 Financiero",
  YOUTH:     "🎈 Juvenil",
  OTHER:     "🏷️ Otro",
};

const EMPTY_SESSION_FORM = {
  memberId: "",
  scheduledAt: "",
  durationMinutes: 60,
  location: "",
  topic: "OTHER",
  objectives: "",
};

const EMPTY_COMPLETE_FORM = {
  notes: "",
  followUpRequired: false,
  followUpNotes: "",
  followUpDate: "",
};

// ============================================================
// HELPERS
// ============================================================
const formatDateTime = (dt) => {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("es-CO", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return dt; }
};

const formatDate = (dt) => {
  if (!dt) return "-";
  try {
    const d = new Date(dt);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dt; }
};

const toLocalDatetimeInput = (iso) => {
  if (!iso) return "";
  return iso.length >= 16 ? iso.slice(0, 16) : iso;
};

// ============================================================
// MODAL: Confirmación personalizada  ← NUEVO (reemplaza window.confirm)
// ============================================================
// ModalConfirm was removed - using centralized useConfirmation

// ============================================================
// MODAL: Agendar / Editar sesión
// ============================================================
function ModalScheduleSession({ isOpen, onClose, onSave, initialData, members, isEditing }) {
  const confirm = useConfirmation();
  const [form, setForm] = useState(EMPTY_SESSION_FORM);
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setForm({
          memberId:        initialData.memberId || "",
          scheduledAt:     toLocalDatetimeInput(initialData.scheduledAt) || "",
          durationMinutes: initialData.durationMinutes || 60,
          location:        initialData.location || "",
          topic:           initialData.topic || "OTHER",
          objectives:      initialData.objectives || "",
        });
        setMemberSearch(initialData.memberName || "");
      } else {
        setForm(EMPTY_SESSION_FORM);
        setMemberSearch("");
      }
    }
  }, [isOpen, isEditing, initialData]);

  if (!isOpen) return null;

  const filteredMembers = memberSearch.length >= 2
    ? members.filter(m =>
        m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.document?.toLowerCase().includes(memberSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleMemberSelect = (m) => {
    setForm(f => ({ ...f, memberId: m.id }));
    setMemberSearch(m.name);
  };

  const handleSubmit = async () => {
    if (!form.memberId) {
      await confirm({
        title: "Dato Requerido",
        message: "Por favor, selecciona un miembro para agendar la sesión.",
        type: "warning",
        confirmLabel: "Entendido"
      });
      return;
    }
    if (!form.scheduledAt) {
      await confirm({
        title: "Dato Requerido",
        message: "La fecha y hora son obligatorias para programar la cita.",
        type: "warning",
        confirmLabel: "Entendido"
      });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        memberId:        Number(form.memberId),
        scheduledAt:     form.scheduledAt,
        durationMinutes: Number(form.durationMinutes),
        location:        form.location || null,
        topic:           form.topic,
        objectives:      form.objectives || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              {isEditing ? <FileText className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEditing ? "Editar Sesión" : "Agendar Sesión"}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {isEditing ? "Modificar detalles de la consejería" : "Programar nueva cita pastoral"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <XCircle className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Miembro */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Miembro *</label>
            <div className="relative">
              <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={memberSearch}
                onChange={e => {
                  setMemberSearch(e.target.value);
                  if (form.memberId) setForm(f => ({ ...f, memberId: "" }));
                }}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-3xl text-sm font-bold transition-all outline-none"
              />
            </div>
            {filteredMembers.length > 0 && !form.memberId && (
              <div className="absolute z-10 w-full top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-xl overflow-hidden max-h-48 overflow-y-auto backdrop-blur-xl">
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    className="w-full text-left px-6 py-4 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors flex flex-col group"
                    onClick={() => handleMemberSelect(m)}
                  >
                    <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{m.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-400 uppercase tracking-widest">{m.document}</span>
                  </button>
                ))}
              </div>
            )}
            {form.memberId && (
              <div className="flex items-center gap-2 mt-2 ml-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Miembro Seleccionado</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Fecha y Hora *</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-3xl text-sm font-bold transition-all outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Duración (minutos)</label>
              <input
                type="number"
                min="15"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-3xl text-sm font-bold transition-all outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Lugar</label>
              <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ej: Oficina Pastoral"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-3xl text-sm font-bold transition-all outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Tema Central</label>
              <select
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-3xl text-sm font-bold transition-all outline-none cursor-pointer appearance-none"
              >
                {Object.entries(COUNSELING_TOPICS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Objetivos de la sesión</label>
            <textarea
              rows={3}
              placeholder="Describe los propósitos principales de este encuentro..."
              value={form.objectives}
              onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-indigo-500 rounded-3xl text-sm font-bold transition-all outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-4 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
          >
            {saving ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Completar sesión
// ============================================================
function ModalCompleteSession({ isOpen, onClose, onSave, session }) {
  const confirm = useConfirmation();
  const [form, setForm] = useState(EMPTY_COMPLETE_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY_COMPLETE_FORM,
        // FIX: usar session?.notes aunque sea string vacío
        notes: session?.notes ?? "",
      });
    }
  }, [isOpen, session]);

  if (!isOpen || !session) return null;

  const handleSubmit = async () => {
    if (!form.notes.trim()) {
      await confirm({
        title: "Campo Requerido",
        message: "Las notas y conclusiones son obligatorias para cerrar el expediente de la sesión.",
        type: "warning",
        confirmLabel: "Entendido"
      });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        notes:            form.notes,
        followUpRequired: form.followUpRequired,
        followUpNotes:    form.followUpNotes || null,
        followUpDate:     form.followUpDate  || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border-4 border-emerald-500/10 overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Cerrar Sesión</h2>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{session.memberName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Conclusiones y Notas Pastorales *</label>
            <textarea
              rows={5}
              placeholder="Resume los puntos clave, acuerdos y guianza espiritual brindada..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-emerald-500 rounded-3xl text-sm font-bold transition-all outline-none resize-none"
            />
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form.followUpRequired ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>
                {form.followUpRequired && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={form.followUpRequired}
                onChange={e => setForm(f => ({ ...f, followUpRequired: e.target.checked }))}
              />
              <span className="text-sm font-black text-slate-700 dark:text-slate-300 group-hover:text-emerald-500 transition-colors uppercase tracking-widest">
                Requiere Seguimiento Pastoral
              </span>
            </label>

            {form.followUpRequired && (
              <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Notas de seguimiento</label>
                  <textarea
                    rows={2}
                    placeholder="Especifique qué aspectos verificar en el futuro..."
                    value={form.followUpNotes}
                    onChange={e => setForm(f => ({ ...f, followUpNotes: e.target.value }))}
                    className="w-full px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all outline-none resize-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Próxima fecha sugerida</label>
                  <input
                    type="datetime-local"
                    value={form.followUpDate}
                    onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
                    className="w-full px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold transition-all outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 flex gap-4">
          <button onClick={onClose} disabled={saving} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-colors">
            Volver
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-500/30"
          >
            {saving ? "Finalizando..." : "Confirmar Finalización"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Sesión Activa (Misión Control)
// ============================================================
function ModalActiveSession({ isOpen, onClose, sessionData, onComplete, onCancel, onNoShow, liveNotes, setLiveNotes }) {
  const [activeTab, setActiveTab] = useState("current");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("current");
      // FIX: usar === "" para detectar liveNotes vacío sin ignorar el string vacío intencional
      if (liveNotes === "" && sessionData?.activeSession?.notes) {
        setLiveNotes(sessionData.activeSession.notes);
      }
    }
  }, [isOpen, sessionData]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !sessionData) return null;

  const { activeSession, previousSessions = [], pendingFollowUps = [], memberStats, totalPreviousSessions } = sessionData;
  const hasPrevious  = previousSessions.length > 0;
  const hasFollowUps = pendingFollowUps.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div
        className="bg-slate-50 dark:bg-slate-950 w-full max-w-6xl h-full max-h-[90vh] rounded-[3.5rem] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

        {/* HEADER */}
        <div className="p-10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-emerald-400 shadow-2xl relative z-10">
                <Users className="w-10 h-10" />
              </div>
              <div className="absolute inset-0 bg-emerald-500 rounded-[2.5rem] animate-ping opacity-20 blur-xl"></div>
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-slate-50 dark:border-slate-950 shadow-xl z-20">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  En Curso Ahora
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sesión #{activeSession.sessionNumber}</span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{activeSession.memberName}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  {activeSession.location || "Presencial"}
                </span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  Inicio: {formatDateTime(activeSession.startedAt)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-8 right-8 p-3 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all select-none group"
          >
            <XCircle className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-10 flex gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar py-2">
          {[
            { id: "current",   label: "Evolución Actual",  icon: ClipboardList },
            { id: "history",   label: "Historial Clínico", icon: History,    badge: totalPreviousSessions },
            { id: "followups", label: "Pendientes",        icon: Bell,       badge: pendingFollowUps.length, color: "rose" },
            { id: "stats",     label: "Estadísticas",      icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-t-[2.5rem] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-x border-t border-transparent translate-y-[1px] ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-indigo-600" : ""}`} />
              {tab.label}
              {tab.badge > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-lg text-[9px] ${tab.color === "rose" ? "bg-rose-500 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-y-auto p-10 bg-white dark:bg-slate-900" ref={scrollRef}>

          {/* TAB: Evolución Actual */}
          {activeTab === "current" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-500" /> Perfil del Miembro
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "Documento", value: activeSession.memberDocument || "N/A", icon: FileText },
                      { label: "Teléfono",  value: activeSession.memberPhone    || "N/A", icon: Phone    },
                      { label: "Correo",    value: activeSession.memberEmail    || "N/A", icon: Mail     },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between group">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          {item.label}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-500" /> Métrica de Sesión
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "Tópico Principal",   value: COUNSELING_TOPICS[activeSession.topic] || activeSession.topic, icon: Zap      },
                      { label: "Duración Estimada",  value: `${activeSession.durationMinutes} min`,                        icon: Clock    },
                      { label: "Posición Histórica", value: `Sesión #${activeSession.sessionNumber}`,                      icon: BarChart3 },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between group">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          {item.label}
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {activeSession.objectives && (
                <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-[8rem] group-hover:bg-white/10 transition-all duration-700"></div>
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] mb-3 opacity-70 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> Objetivo Establecido
                  </h3>
                  <p className="text-lg font-black leading-tight tracking-tight relative z-10 italic">"{activeSession.objectives}"</p>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-500" />
                  Bitácora de la Sesión (Notas en tiempo real)
                </h3>
                <textarea
                  value={liveNotes}
                  onChange={e => setLiveNotes(e.target.value)}
                  placeholder="Escriba aquí los puntos clave, acuerdos y revelaciones del encuentro..."
                  className="w-full h-48 p-8 bg-slate-50 dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 focus:border-emerald-500 rounded-[2.5rem] text-sm font-bold transition-all outline-none resize-none shadow-inner"
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right mr-4 italic">Autoguardado local activado</p>
              </div>
            </div>
          )}

          {/* TAB: Historial */}
          {activeTab === "history" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              {!hasPrevious ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300">
                    <History className="w-12 h-12 opacity-50" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-slate-200">Paciente sin Antecedentes</h4>
                  <p className="text-slate-400 font-medium mt-2">Esta es la primera intervención registrada para este miembro.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {previousSessions.map(s => (
                    <div key={s.sessionId ?? s.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                            Sesión #{s.sessionNumber}
                          </span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white mt-2 mb-1 uppercase tracking-tight">
                            {COUNSELING_TOPICS[s.topic] || s.topic}
                          </h4>
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {formatDate(s.scheduledAt)}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                        {s.notes && (
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anotaciones Pastorales</span>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">"{s.notes}"</p>
                          </div>
                        )}
                        {s.followUpRequired && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex items-start gap-3">
                            <Bell className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">Pendiente de Seguimiento</span>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.followUpNotes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Follow-ups */}
          {activeTab === "followups" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              {!hasFollowUps ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-950/30 rounded-[2rem] flex items-center justify-center mb-6 text-emerald-500 shadow-xl shadow-emerald-500/10">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-slate-200">Sin Compromisos Pendientes</h4>
                  <p className="text-slate-400 font-medium mt-2">Todo el seguimiento pastoral ha sido evacuado correctamente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingFollowUps.map(fu => (
                    <div
                      key={fu.originSessionId}
                      className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all ${
                        fu.overdue
                          ? "bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-900/50"
                          : "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-900/50 shadow-sm shadow-amber-500/5"
                      }`}
                    >
                      {fu.overdue && (
                        <span className="absolute top-6 right-6 px-3 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                          Prioridad Alta
                        </span>
                      )}
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <History className="w-3.5 h-3.5" />
                        Ref: Sesión #{fu.originSessionNumber}
                      </span>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-200 leading-tight mb-4">{fu.followUpNotes}</p>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white/50 dark:bg-slate-900/50 w-fit px-4 py-2 rounded-xl">
                        <Calendar className="w-3.5 h-3.5" />
                        Establecido para: {formatDate(fu.followUpDate)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Estadísticas */}
          {activeTab === "stats" && (
            <div className="animate-in slide-in-from-right-4 duration-500 h-full flex items-center justify-center">
              {!memberStats ? (
                <div className="text-center opacity-40 py-20">
                  <BarChart3 className="w-20 h-20 mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest">Análisis no disponible todavía</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mx-auto">
                  {[
                    { label: "Encuentros Totales", value: memberStats.totalSessions,    icon: Users,       color: "indigo"  },
                    { label: "Tasa Exito",          value: `${memberStats.completionRate}%`, icon: Zap,    color: "emerald" },
                    { label: "Cancelaciones",       value: memberStats.cancelledSessions, icon: XCircle,   color: "rose"    },
                    { label: "Incomparecencias",    value: memberStats.noShowSessions,    icon: Ghost,      color: "amber"   },
                    { label: "Completadas",         value: memberStats.completedSessions, icon: CheckCircle2, color: "sky"  },
                    { label: "Nivel Confianza",     value: memberStats.completionRate > 80 ? "ALTO" : "MEDIO", icon: ShieldCheck, color: "indigo" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center group hover:border-indigo-500/50 transition-all">
                      <div className={`w-12 h-12 bg-${stat.color}-500/10 text-${stat.color}-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{stat.value}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ACTIVE FOOTER ACTION BAR */}
        <div className="p-10 bg-slate-100 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between backdrop-blur-3xl">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-[2rem] font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
            >
              Minimizar Panel
            </button>
            <div className="w-px h-10 bg-slate-300 dark:bg-slate-700 mx-2"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-[150px] leading-relaxed">
              Sus cambios se guardarán permanentemente al finalizar
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* FIX: onNoShow ahora pasa la sesión correctamente */}
            <button
              onClick={() => onNoShow(activeSession)}
              className="px-6 py-4 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all active:scale-95 border border-amber-200 dark:border-amber-900/30 flex items-center gap-2"
            >
              <Ghost className="w-4 h-4" />
              Ausente
            </button>
            <button
              onClick={() => onCancel(activeSession)}
              className="px-6 py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 border border-rose-200 dark:border-rose-900/30 flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={() => onComplete({ ...activeSession, notes: liveNotes })}
              className="px-10 py-4 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-600/30 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5" />
              Concluir Sesión Pastoral
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Detalle + Acciones integradas
// ============================================================
function ModalSessionDetail({ isOpen, onClose, session, onEdit, onComplete, onCancel, onNoShow, onPdf, onStart }) {
  if (!isOpen || !session) return null;

  const status    = COUNSELING_STATUS[session.status] || { label: session.status, color: "slate", icon: ClipboardList };
  const isActive  = session.status === "SCHEDULED" || session.status === "RESCHEDULED";
  const isOngoing = session.status === "IN_PROGRESS";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Detail Header */}
        <div className={`p-10 pb-8 bg-gradient-to-br from-${status.color}-600 to-${status.color}-700 text-white relative flex justify-between items-start`}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-white/20 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-lg backdrop-blur-md">
                #ID {session.id} · Sesión #{session.sessionNumber}
              </span>
              <div className="flex items-center gap-1 text-[9px] font-black bg-white/10 px-3 py-1 rounded-lg uppercase tracking-widest backdrop-blur-sm">
                <status.icon className="w-3 h-3" />
                {status.label}
              </div>
            </div>
            <h2 className="text-4xl font-black tracking-tighter leading-none mb-4">{session.memberName}</h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 opacity-60" />
              {formatDateTime(session.scheduledAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all relative z-10">
            <XCircle className="w-7 h-7" />
          </button>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 -mr-12 -mt-12 rounded-full blur-3xl opacity-30"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50 dark:bg-slate-950/20">
          <div className="grid grid-cols-2 gap-8 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className={`absolute left-0 top-0 w-1.5 h-full bg-${status.color}-500`}></div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Información del Miembro</h4>
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> ID: <span className="text-slate-900 dark:text-white font-black">{session.memberDocument || "-"}</span>
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> TEL: <span className="text-slate-900 dark:text-white font-black">{session.memberPhone || "-"}</span>
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detalles Técnicos</h4>
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> TIEMPO: <span className="text-slate-900 dark:text-white font-black">{session.durationMinutes} min</span>
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> TEMA: <span className="text-slate-900 dark:text-white font-black">{COUNSELING_TOPICS[session.topic] || session.topic}</span>
                </p>
              </div>
            </div>
          </div>

          {session.objectives && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> Objetivos de Sesión
              </h4>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">"{session.objectives}"</p>
            </div>
          )}

          {session.notes && (
            <div className="bg-emerald-50 dark:bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-500/20 shadow-inner">
              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Resultado y Acuerdos
              </h4>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-relaxed uppercase tracking-tight">{session.notes}</p>
            </div>
          )}

          {session.cancellationReason && (
            <div className="bg-rose-50 dark:bg-rose-500/5 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-500/20 shadow-inner">
              <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Reporte de Cancelación
              </h4>
              <p className="text-sm font-black text-rose-800 dark:text-rose-400 leading-relaxed uppercase tracking-tight">{session.cancellationReason}</p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <button
            onClick={() => { onPdf(session); onClose(); }}
            className="px-6 py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3"
          >
            <Download className="w-4 h-4" />
            Expediente PDF
          </button>

          <div className="flex gap-3">
            {isOngoing && (
              <button
                onClick={() => { onStart(session); }}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-500/20 flex items-center gap-3"
              >
                <Zap className="w-5 h-5" />
                Retomar Sesión
              </button>
            )}
            {isActive && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { onStart(session); }}
                  className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Iniciar
                </button>
                <button
                  onClick={() => { onEdit(session); }}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { onComplete(session); }}
                  className="px-6 py-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => { onCancel(session); }}
                  className="px-6 py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
                >
                  Anular
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Cancelar sesión
// ============================================================
function ModalCancelSession({ isOpen, onClose, onSave, session }) {
  const confirm = useConfirmation();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isOpen) setReason(""); }, [isOpen]);
  if (!isOpen || !session) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      await confirm({
        title: "Justificación Requerida",
        message: "El motivo de cancelación es obligatorio para anular el registro.",
        type: "warning",
        confirmLabel: "Entendido"
      });
      return;
    }
    setSaving(true);
    try { await onSave({ cancellationReason: reason }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-rose-950/40 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl border-4 border-rose-500/10 overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-500/20">
              <XCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Anular Sesión</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-3xl border border-rose-100 dark:border-rose-900/40">
            <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Impacto en Agenda</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Esta acción liberará el espacio agendado para <strong>{session.memberName}</strong>.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Motivo de la cancelación *</label>
            <textarea
              rows={3}
              placeholder="Justifique el motivo de la anulación..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-rose-500 rounded-3xl text-sm font-bold transition-all outline-none resize-none"
            />
          </div>
        </div>
        <div className="p-8 flex gap-4">
          <button onClick={onClose} disabled={saving} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">
            Abortar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-[2] py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-rose-600/30"
          >
            {saving ? "Procesando..." : "Confirmar Anulación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL (COUNSELING PAGE)
// ============================================================
const CounselingPage = () => {
  const confirm = useConfirmation();
  const [sessions, setSessions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(false);

  // Filtros
  const [filterStatus,   setFilterStatus]   = useState("ALL");
  const [filterTopic,    setFilterTopic]     = useState("ALL");
  const [filterSearch,   setFilterSearch]   = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");

  // Modales
  const [showSchedule, setShowSchedule] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showCancel,   setShowCancel]   = useState(false);
  const [showDetail,   setShowDetail]   = useState(false);
  const [showActive,   setShowActive]   = useState(false);

  const [activeSession,     setActiveSession]     = useState(null);
  const [activeSessionData, setActiveSessionData] = useState(null);
  const [isEditing,         setIsEditing]         = useState(false);
  const [liveNotes,         setLiveNotes]         = useState("");

  const opInProgress = useRef(false);

  const handleOpenDetail = useCallback((session) => {
    setActiveSession(session);
    setShowDetail(true);
  }, []);

  // ── LOADERS ────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (opInProgress.current) return;
    opInProgress.current = true;
    setLoading(true);
    try {
      const data = await apiService.getMySessions();
      const list = Array.isArray(data) ? data : (data?.content || data?.sessions || []);
      setSessions(list);
      if (list.length === 0) {
        console.warn("⚠️ Gabinete Pastoral: No se encontraron sesiones registradas.");
      }
    } catch (err) {
      console.error("❌ Error cargando sesiones de consejería:", err);
      console.log("Error al sincronizar con el Gabinete Pastoral");
    } finally {
      setLoading(false);
      opInProgress.current = false;
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiService.getAllMembers();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) { console.error("Error cargando miembros", err); }
  }, []);

  useEffect(() => { loadSessions(); loadMembers(); }, [loadSessions, loadMembers]);

  // ── FILTERS ────────────────────────────────────────────────
  useEffect(() => {
    let result = [...sessions];
    result.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    if (filterStatus !== "ALL") result = result.filter(s => s.status === filterStatus);
    if (filterTopic  !== "ALL") result = result.filter(s => s.topic  === filterTopic);
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      result = result.filter(s =>
        s.memberName?.toLowerCase().includes(q) ||
        s.memberDocument?.toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) result = result.filter(s => s.scheduledAt >= filterDateFrom);
    if (filterDateTo)   result = result.filter(s => s.scheduledAt <= filterDateTo + "T23:59");
    setFiltered(result);
  }, [sessions, filterStatus, filterTopic, filterSearch, filterDateFrom, filterDateTo]);

  // ── INICIAR SESIÓN ─────────────────────────────────────────
  const handleStartSession = useCallback(async (session) => {
    if (opInProgress.current) return;

    // Retomar sesión ya en curso (desde lista o desde detalle)
    if (session.status === "IN_PROGRESS") {
      opInProgress.current = true;
      setShowDetail(false);
      try {
        const historyRaw     = await apiService.request(`/counseling/member/${session.memberId}/history`);
        const currentId      = session.id;
        const previousSessions = (Array.isArray(historyRaw) ? historyRaw : [])
          .filter(s => s.id !== currentId && s.status === "COMPLETED")
          .slice(0, 5);
        const pendingFollowUps = previousSessions
          .filter(s => s.followUpRequired && s.followUpNotes)
          .map(s => ({
            originSessionId:     s.id,
            originSessionNumber: s.sessionNumber,
            originSessionDate:   s.scheduledAt,
            followUpNotes:       s.followUpNotes,
            followUpDate:        s.followUpDate,
            overdue:             s.followUpDate && new Date(s.followUpDate) < new Date(),
          }));

        // FIX: también actualizar activeSession state para que complete/cancel funcionen
        setActiveSession(session);
        setActiveSessionData({
          activeSession: session,
          totalPreviousSessions: previousSessions.length,
          previousSessions,
          pendingFollowUps,
          memberStats: null,
        });
        setLiveNotes(session.notes || "");
        setShowActive(true);
      } catch {
        setActiveSession(session);
        setActiveSessionData({
          activeSession: session,
          previousSessions: [],
          pendingFollowUps: [],
          memberStats: null,
          totalPreviousSessions: 0,
        });
        setLiveNotes(session.notes || "");
        setShowActive(true);
      } finally { opInProgress.current = false; }
      return;
    }

    // Iniciar sesión por primera vez (SCHEDULED / RESCHEDULED)
    if (session.status !== "SCHEDULED" && session.status !== "RESCHEDULED") return;
    opInProgress.current = true;
    setShowDetail(false);
    try {
      const data = await apiService.request(`/counseling/${session.id}/start`, { method: "PATCH" });
      // El backend devuelve StartSessionResponse con activeSession, previousSessions, etc.
      setActiveSession(data.activeSession ?? session);
      setActiveSessionData(data);
      setLiveNotes("");
      setShowActive(true);
      await loadSessions();
    } catch (err) {
      console.log(`Error crítico: ${err.message}`);
      await confirm({
        title: "Error de Sistema",
        message: `No se pudo iniciar la sesión: ${err.message}`,
        type: "error",
        confirmLabel: "Cerrar"
      });
    } finally { opInProgress.current = false; }
  }, [loadSessions, confirm]);



  // ── ESTADÍSTICAS ───────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      sessions.length,
    scheduled:  sessions.filter(s => s.status === "SCHEDULED" || s.status === "RESCHEDULED").length,
    inProgress: sessions.filter(s => s.status === "IN_PROGRESS").length,
    completed:  sessions.filter(s => s.status === "COMPLETED").length,
    cancelled:  sessions.filter(s => s.status === "CANCELLED" || s.status === "NO_SHOW").length,
    rate: sessions.length
      ? Math.round((sessions.filter(s => s.status === "COMPLETED").length / sessions.length) * 100)
      : 0,
  }), [sessions]);

  // ── PDFs ───────────────────────────────────────────────────
  const handleManagementPdf = async () => {
    try {
      await apiService.downloadCounselingManagementReportPdf();
    } catch { 
      await confirm({
        title: "Falla de Exportación",
        message: "Ocurrió un error al intentar generar el Reporte Maestro de Gestión.",
        type: "error",
        confirmLabel: "Entendido"
      });
    }
  };

  const handleMemberHistoryPdf = async (session) => {
    try {
      await apiService.downloadCounselingMemberHistoryPdf(session.memberId, session.memberName);
    } catch { 
      await confirm({
        title: "Falla de Exportación",
        message: "Error al intentar generar la Ficha Pastoral del miembro. Verifique su conexión.",
        type: "error",
        confirmLabel: "Entendido"
      });
    }
  };

  // ── NOSHOW: registrar incomparecencia ────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleNoShow = useCallback(async (session) => {
    if (!session?.id) return;
    
    await confirm({
      title: "Registrar Ausencia",
      message: "¿Desea marcar este miembro como AUSENTE? Esta acción quedará registrada permanentemente en su historial pastoral.",
      type: "warning",
      confirmLabel: "Registrar Ausencia",
      onConfirm: async () => {
        try {
          await apiService.post(`/counseling/sessions/${session.id}/no-show`);
          loadSessions();
        } catch (err) {
          console.log("Error al registrar ausencia");
        }
      }
    });
  }, [confirm, loadSessions]);


  // ── ACCIONES PRINCIPALES ───────────────────────────────────
  const handleAction = useCallback(async (type, data) => {
    if (opInProgress.current) return;
    opInProgress.current = true;
    try {
      if (type === "save") {
        if (isEditing) {
          await apiService.updateCounselingSession(activeSession.id, data);
        } else {
          await apiService.scheduleSession(data);
        }
        await confirm({
          title: "¡Éxito!",
          message: "La operación se ha completado correctamente en el Gabinete Pastoral.",
          type: "success",
          confirmLabel: "Excelente"
        });
        setShowSchedule(false);
        setIsEditing(false);
        setActiveSession(null);

      } else if (type === "complete") {
        const tid = activeSession?.id ?? data?.id;
        if (!tid) throw new Error("ID de sesión no reconocido");
        await apiService.request(`/counseling/${tid}/complete`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        await confirm({
          title: "Sesión Finalizada",
          message: "El expediente ha sido cerrado y guardado exitosamente.",
          type: "success",
          confirmLabel: "Continuar"
        });
        setShowComplete(false);
        setShowActive(false);
        setActiveSession(null);
        setActiveSessionData(null);
        setLiveNotes("");

      } else if (type === "cancel") {
        const tid = activeSession?.id ?? data?.id;
        if (!tid) throw new Error("ID de sesión no reconocido");
        await apiService.request(`/counseling/${tid}/cancel`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
        await confirm({
          title: "Registro Anulado",
          message: "La sesión ha sido cancelada y el espacio en agenda liberado.",
          type: "info",
          confirmLabel: "Entendido"
        });
        setShowCancel(false);
        setShowActive(false);
        setActiveSession(null);
        setActiveSessionData(null);
        setLiveNotes("");
      }

      setTimeout(() => loadSessions(), 300);
    } catch (err) {
      await confirm({
        title: "Error en Operación",
        message: err.message || "Ocurrió un problema al procesar su solicitud.",
        type: "error",
        confirmLabel: "Cerrar"
      });
    } finally {
      opInProgress.current = false;
    }
  }, [isEditing, activeSession, loadSessions, confirm]);

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-10 space-y-10 animate-fade-in relative">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="space-y-3">
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-4">
            <div className="h-12 w-3 bg-indigo-600 rounded-full"></div>
            Gabinete Pastoral
          </h1>
          <p className="text-slate-500 font-black flex items-center gap-3 ml-7 uppercase tracking-[0.2em] text-[10px] dark:text-slate-400">
            <Users className="w-5 h-5 text-indigo-500" />
            Atención Espiritual y Consejería Familiar
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleManagementPdf}
            className="flex items-center gap-3 px-8 py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest hover:border-indigo-500 transition-all active:scale-95 shadow-sm shadow-indigo-500/5 group"
          >
            <Download className="w-5 h-5 text-indigo-500 group-hover:scale-125 transition-transform" />
            Informe Maestro
          </button>
          <button
            onClick={() => { setIsEditing(false); setActiveSession(null); setShowSchedule(true); }}
            className="flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-all active:scale-95 shadow-2xl shadow-indigo-600/30"
          >
            <Plus className="w-6 h-6" />
            Agendar Encuentro
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Intervenciones", value: stats.total,      icon: ClipboardList, color: "indigo",  sub: "Historial acumulado"   },
          { label: "Agenda Activa",         value: stats.scheduled,  icon: Calendar,      color: "violet",  sub: "Encuentros próximos"   },
          { label: "En Curso Ahora",        value: stats.inProgress, icon: Activity,      color: "emerald", sub: "Sesiones pulsantes", pulse: stats.inProgress > 0 },
          { label: "Efectividad Pastoral",  value: `${stats.rate}%`, icon: BarChart3,     color: "sky",     sub: "Tasa de conclusión"    },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-8 rounded-[3rem] shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 dark:bg-${stat.color}-500/10 rounded-bl-[5rem] -mr-8 -mt-8 group-hover:scale-110 transition-transform`}></div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</h2>
              {stat.pulse && <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>}
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2 italic flex items-center gap-2">
              <stat.icon className={`w-3.5 h-3.5 text-${stat.color}-500`} />
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 p-10 rounded-[3.5rem] shadow-sm space-y-8">
        <div className="flex items-center gap-4 ml-2">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Criterios de Localización</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Refine la búsqueda del expediente pastoral</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="space-y-2 group">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Miembro / Documento</label>
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-3xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 dark:focus:bg-slate-950 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nivel de Estado</label>
            <div className="relative">
              <Activity className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full pl-14 pr-10 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-3xl text-sm font-black appearance-none outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="ALL">Histórico Completo</option>
                {Object.entries(COUNSELING_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Línea Pastoral / Tema</label>
            <div className="relative">
              <Zap className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                className="w-full pl-14 pr-10 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-3xl text-sm font-black appearance-none outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value="ALL">Cualquier Tópico</option>
                {Object.entries(COUNSELING_TOPICS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha Inicial</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha Final</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>
      </div>

      {/* LISTA DE SESIONES */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="py-32 flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
              Sincronizando Archivo Pastoral...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl p-20 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Sin Correspondencia</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed italic">
              "En la paz de la justicia no se hallaron registros bajo estos criterios."
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(session => {
              const status    = COUNSELING_STATUS[session.status] || { label: session.status, color: "slate", icon: ClipboardList };
              const isOngoing = session.status === "IN_PROGRESS";

              return (
                <div
                  key={session.id}
                  onClick={() => handleOpenDetail(session)}
                  className={`bg-white dark:bg-slate-900/60 backdrop-blur-2xl p-10 rounded-[3rem] border shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden cursor-pointer active:scale-95 ${
                    isOngoing ? "ring-4 ring-emerald-500/20 border-emerald-500/30" : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-${status.color}-500/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700`}></div>

                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 bg-${status.color}-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-${status.color}-500/20 group-hover:rotate-6 transition-transform duration-500`}>
                        <status.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                          Sesión #{session.sessionNumber}
                        </span>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mt-1 truncate max-w-[150px]">
                          {session.memberName}
                        </h4>
                      </div>
                    </div>
                    {isOngoing
                      ? <div className="p-2 bg-emerald-500 text-white rounded-full animate-pulse shadow-lg shadow-emerald-500/40"><Zap className="w-4 h-4" /></div>
                      : <MoreVertical className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    }
                  </div>

                  <div className="space-y-4 mb-8 relative z-10">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Calendar className={`w-4 h-4 text-${status.color}-500`} />
                      {formatDateTime(session.scheduledAt)}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider">
                      <Zap className={`w-4 h-4 text-${status.color}-500`} />
                      {COUNSELING_TOPICS[session.topic] || session.topic}
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
                        <MapPin className={`w-4 h-4 text-${status.color}-500`} />
                        {session.location}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-6 relative z-10">
                    <div className={`px-4 py-2 bg-${status.color}-50 dark:bg-${status.color}-500/10 text-${status.color}-600 dark:text-${status.color}-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-${status.color}-100 dark:border-${status.color}-500/20`}>
                      {status.label}
                    </div>
                    <div className="flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalles</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-indigo-600 p-12 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-1000"></div>
        <div className="relative z-10">
          <h3 className="text-4xl font-black tracking-tighter mb-4">Misión Pastoral Activa</h3>
          <div className="flex flex-wrap gap-6 items-center">
            {[
              { label: "Consolidadas", value: stats.completed  },
              { label: "En Curso",     value: stats.inProgress },
              { label: "Efectividad",  value: `${stats.rate}%` },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{item.label}</span>
                <span className="text-2xl font-black">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center lg:items-end gap-3 relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.4em] opacity-40">Raíz de David · Gabinete Pastoral</p>
          <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/60 animate-shimmer" style={{ width: "40%" }}></div>
          </div>
        </div>
      </div>

      {/* ── MODALES ─────────────────────────────────────────── */}

      {/* Confirm centralizado */}

      <ModalScheduleSession
        isOpen={showSchedule}
        onClose={() => { setShowSchedule(false); setActiveSession(null); setIsEditing(false); }}
        onSave={d => handleAction("save", d)}
        initialData={activeSession}
        members={members}
        isEditing={isEditing}
      />

      <ModalCompleteSession
        isOpen={showComplete}
        onClose={() => { setShowComplete(false); setActiveSession(null); }}
        onSave={d => handleAction("complete", d)}
        session={activeSession}
      />

      <ModalCancelSession
        isOpen={showCancel}
        onClose={() => { setShowCancel(false); setActiveSession(null); }}
        onSave={d => handleAction("cancel", d)}
        session={activeSession}
      />

      <ModalSessionDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setActiveSession(null); }}
        session={activeSession}
        onEdit={s => {
          setIsEditing(true);
          setActiveSession(s);
          setShowDetail(false);
          setShowSchedule(true);
        }}
        onComplete={s => {
          setActiveSession(s);
          setShowDetail(false);
          setShowComplete(true);
        }}
        onCancel={s => {
          setActiveSession(s);
          setShowDetail(false);
          setShowCancel(true);
        }}
        // FIX: cierra detail antes de mostrar confirm
        onNoShow={s => {
          setShowDetail(false);
          handleNoShow(s);
        }}
        onPdf={handleMemberHistoryPdf}
        onStart={s => {
          setShowDetail(false);
          handleStartSession(s);
        }}
      />

      <ModalActiveSession
        isOpen={showActive}
        onClose={() => setShowActive(false)}
        sessionData={activeSessionData}
        onComplete={s => {
          setActiveSession(s);
          setShowActive(false);
          setShowComplete(true);
        }}
        onCancel={s => {
          setActiveSession(s);
          setShowActive(false);
          setShowCancel(true);
        }}
        // FIX: usa handleNoShow en lugar de handleAction('noshow')
        onNoShow={handleNoShow}
        liveNotes={liveNotes}
        setLiveNotes={setLiveNotes}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-fade-in  { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shimmer  { animation: shimmer 2s infinite linear; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
      `}} />
    </div>
  );
};

export default CounselingPage;