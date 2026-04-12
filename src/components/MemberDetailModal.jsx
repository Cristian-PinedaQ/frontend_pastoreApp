import React, { useState, useEffect, useCallback } from "react";
import { 
  X, Mail, Phone, MapPin, Briefcase, Heart, Calendar, 
  ShieldCheck, History, BookOpen, ChevronLeft, Trash2, Edit3,
  Award, Clock, CheckCircle2, AlertCircle, ExternalLink, Download
} from "lucide-react";
import apiService from "../apiService";
import { useConfirmation } from "../context/ConfirmationContext";
import { getDisplayName } from "../services/nameHelper";

/**
 * MemberDetailModal - Modernized for "Elite" Standard
 * Displays comprehensive member data with an immersive UI
 */
export const MemberDetailModal = ({
  member,
  onClose,
  onUpdated,
  onEdit,
  onDelete,
  onViewEnrollment,
  canEdit = true
}) => {
  const confirm = useConfirmation();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("info");
  const [enrollmentDetail, setEnrollmentDetail] = useState(null);

  const getLevelName = (level) => {
    if (!level) return "N/A";
    if (typeof level === "string") return level;
    return level.displayName || level.code || "N/A";
  };

  const loadEnrollments = useCallback(async () => {
    if (!member?.id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getStudentEnrollmentsByMember(member.id);
      setEnrollments(response || []);
    } catch (err) {
      console.error("Error loading enrollments:", err);
      setError("No se pudieron cargar las inscripciones vinculadas.");
    } finally {
      setLoading(false);
    }
  }, [member?.id]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  const handleViewEnrollmentDetail = async (enrollment) => {
    try {
      setLoading(true);
      const response = await apiService.getStudentDetailedReport(enrollment.id);
      
      let lessons = response.lessons || [];
      if ((!lessons || lessons.length === 0) && enrollment.enrollment?.id) {
        const lessonsResponse = await apiService.getLessonsByEnrollment(enrollment.enrollment.id);
        lessons = lessonsResponse || [];
      }

      setEnrollmentDetail({ ...response, lessons });
      setActiveTab("enrollmentDetail");
    } catch (err) {
      console.error("Error:", err);
      setError("Error al obtener detalles del curso.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (enrollmentId) => {
    await confirm({
      title: "¿Retirar del Curso?",
      message: "¿Deseas retirar a este integrante del curso actual? Esta acción detendrá su progreso académico.",
      type: "danger",
      confirmLabel: "Confirmar Retiro",
      onConfirm: async () => {
        try {
          await apiService.withdrawStudentFromCohort(enrollmentId);
          loadEnrollments();
          if (onUpdated) onUpdated();
        } catch (err) {
          console.error("Error withdrawing:", err);
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      ACTIVE: { color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50", text: "Activo", icon: Clock },
      COMPLETED: { color: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50", text: "Completado", icon: Award },
      CANCELLED: { color: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50", text: "Retirado", icon: X },
      PENDING: { color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50", text: "Pendiente", icon: History },
    };
    const config = configs[status] || { color: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200", text: status, icon: History };
    const Icon = config.icon;
    
    return (
      <span className={`${config.color} px-2.5 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 md:gap-2 shadow-sm whitespace-nowrap`}>
        <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" /> {config.text}
      </span>
    );
  };

  // Avatar and Display Info
  const fullName = (member.name || `${member.firstName || ""} ${member.lastName || ""}`).trim();
  const dispName = getDisplayName(fullName);
  const initials = dispName.split(" ").map(n => n?.[0]).join("").substring(0, 2).toUpperCase() || "U";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 lg:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#1a2332] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh] border border-slate-200 dark:border-slate-800 animate-slide-up">
        
        {/* Modern Header Section */}
        <div className="relative p-6 md:p-8 lg:p-10 flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-8 border-b border-slate-100 dark:border-slate-800/80 overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-48 h-48 md:w-80 md:h-80 bg-indigo-500/5 rounded-bl-[10rem] md:rounded-bl-[15rem] -mr-10 -mt-10 md:-mr-20 md:-mt-20 pointer-events-none"></div>
          
          <div className="w-20 h-20 md:w-28 md:h-28 shrink-0 rounded-[1.5rem] md:rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-2xl md:text-3xl font-black shadow-xl shadow-indigo-500/20 dark:shadow-none border-4 border-white dark:border-[#1a2332] relative z-10 mx-auto md:mx-0">
            {initials}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2 md:space-y-3 relative z-10 w-full mt-2 md:mt-0 pt-0">
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3">
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 md:px-4 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50">
                  ID: {member.document || "Sin Documento"}
                </span>
                <span className={`px-3 md:px-4 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border ${member.isActive ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50" : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/50"}`}>
                  {member.isActive ? "● Estatus Activo" : "○ Estatus Inactivo"}
                </span>
             </div>
             <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight line-clamp-2 md:line-clamp-1">{dispName}</h2>
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-6 text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-2 md:mt-0">
                <span className="flex items-center gap-1.5 md:gap-2"><Mail className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-500 shrink-0" /> <span className="line-clamp-1">{member.email || "—"}</span></span>
                <span className="flex items-center gap-1.5 md:gap-2"><Phone className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-500 shrink-0" /> <span className="line-clamp-1">{member.phone || "—"}</span></span>
             </div>
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 md:p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full md:rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all group z-20">
             <X className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 overflow-x-auto no-scrollbar shrink-0">
           <button 
             onClick={() => setActiveTab("info")} 
             className={`px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === "info" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
           >
             Información General
             {activeTab === "info" && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full"></div>}
           </button>
           <button 
             onClick={() => setActiveTab("enrollments")} 
             className={`px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === "enrollments" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
           >
             Cursos  {enrollments.length > 0 && <span className="ml-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full text-[9px]">{enrollments.length}</span>}
             {activeTab === "enrollments" && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-indigo-600 rounded-t-full"></div>}
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 custom-scrollbar relative">
          
          {/* TAB: Personal Info */}
          {activeTab === "info" && (
            <div className="space-y-8 md:space-y-10 animate-fade-in">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <InfoItem icon={MapPin} label="Ubicación" value={member.address || "No registrada"} />
                  <InfoItem icon={Briefcase} label="Profesión / Oficio" value={member.profession || "No especificada"} />
                  <InfoItem icon={Clock} label="Estado Laboral" value={member.employmentStatus || "—"} />
                  <InfoItem icon={Heart} label="Estado Civil" value={member.maritalStatus || "—"} />
                  <InfoItem icon={Calendar} label="Fecha Nacimiento" value={member.birthdate ? new Date(member.birthdate).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
                  <InfoItem icon={ShieldCheck} label="Distrito" value={member.district || "Distrito 1"} />
               </div>

               <div className="pt-6 md:pt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row flex-wrap gap-3 md:gap-4">
                  {canEdit && (
                    <>
                      <button onClick={() => { onEdit(member); onClose(); }} className="w-full md:w-auto justify-center px-6 md:px-8 py-3.5 md:py-4 bg-indigo-600 text-white rounded-[1.2rem] md:rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all group">
                         <Edit3 className="w-4 h-4 md:w-5 md:h-5 group-hover:-rotate-12 transition-transform" /> Editar Info
                      </button>
                       <button 
                         onClick={async () => { 
                           await confirm({
                             title: "¿Eliminar Integrante?",
                             message: "¿Estás seguro de que deseas eliminar permanentemente a este miembro del sistema?",
                             type: "danger",
                             confirmLabel: "Eliminar Ahora",
                             onConfirm: async () => {
                               onDelete(member.id);
                             }
                           });
                         }} 
                         className="w-full md:w-auto justify-center px-6 md:px-8 py-3.5 md:py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 rounded-[1.2rem] md:rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all"
                       >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" /> Eliminar
                       </button>
                    </>
                  )}
                  {onViewEnrollment && (
                    <button onClick={() => { onViewEnrollment(member.id, member.name); onClose(); }} className="w-full md:w-auto justify-center px-6 md:px-8 py-3.5 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-[1.2rem] md:rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all md:ml-auto">
                       <History className="w-4 h-4 md:w-5 md:h-5" /> Historial Completo
                    </button>
                  )}
               </div>
            </div>
          )}

          {/* TAB: Enrollments List */}
          {activeTab === "enrollments" && (
            <div className="space-y-4 md:space-y-6 animate-fade-in">
               {loading ? (
                 <div className="py-16 md:py-20 flex flex-col items-center justify-center gap-4">
                    <History className="w-10 h-10 md:w-12 md:h-12 animate-spin text-indigo-500/50" />
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center">Sincronizando expedientes...</p>
                 </div>
               ) : enrollments.length === 0 ? (
                 <div className="py-16 md:py-24 text-center bg-slate-50 dark:bg-slate-800/30 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 px-6">
                    <BookOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4 md:mb-6" />
                    <h4 className="text-lg md:text-xl font-black text-slate-800 dark:text-white mb-2">Sin Inscripciones Activas</h4>
                    <p className="text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest max-w-[250px] mx-auto">Este miembro no registra cursos actualmente en la plataforma</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {enrollments.map(enroll => (
                      <EnrollmentCard 
                        key={enroll.id} 
                        enroll={enroll} 
                        onView={() => handleViewEnrollmentDetail(enroll)}
                        onWithdraw={() => handleWithdraw(enroll.id)}
                        getLevelName={getLevelName}
                        getStatusBadge={getStatusBadge}
                      />
                    ))}
                 </div>
               )}
            </div>
          )}

          {/* TAB: Enrollment Detail View */}
          {activeTab === "enrollmentDetail" && enrollmentDetail && (
            <div className="space-y-6 md:space-y-8 animate-fade-in">
               <button 
                 onClick={() => { setActiveTab("enrollments"); setEnrollmentDetail(null); }}
                 className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] md:text-xs uppercase tracking-wider hover:gap-3 transition-all"
               >
                 <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" /> Volver a Inscripciones
               </button>

               {/* Course Summary Card */}
               <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-white/10 rounded-bl-[10rem] -mr-10 -mt-10 md:-mr-16 md:-mt-16 pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 md:gap-8">
                     <div className="space-y-1.5 md:space-y-2">
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Curso Actual</span>
                        <h3 className="text-2xl md:text-4xl font-black tracking-tight leading-tight line-clamp-2 md:line-clamp-none">{enrollmentDetail.cohortName}</h3>
                        <p className="font-semibold text-xs md:text-sm flex items-center gap-2 opacity-90 mt-1 md:mt-2">
                          <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4" /> Nivel: {getLevelName(enrollmentDetail.currentLevel)}
                        </p>
                     </div>
                     <div className="w-full sm:w-auto text-center px-6 md:px-8 py-4 md:py-6 bg-white/10 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-white/20 shrink-0">
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Cumplimiento</p>
                        <p className="text-3xl md:text-4xl font-black tracking-tighter">{(enrollmentDetail.attendancePercentage || 0).toFixed(1)}<span className="text-xl md:text-2xl ml-0.5 opacity-80">%</span></p>
                     </div>
                  </div>
               </div>

               {/* Lessons Grid */}
               <div className="space-y-4 md:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                     <h4 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">Lecciones Registradas</h4>
                     <button className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                        <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> Descargar 
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {enrollmentDetail.lessons.map((lesson, idx) => (
                      <LessonItem key={idx} lesson={lesson} index={idx} />
                    ))}
                  </div>

                  {enrollmentDetail.lessons.length === 0 && (
                    <div className="py-12 md:py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[1.5rem] md:rounded-[2rem] px-6">
                       <AlertCircle className="w-10 h-10 md:w-12 md:h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3 md:mb-4" />
                       <p className="text-slate-500 font-bold uppercase text-[9px] md:text-[10px] tracking-widest max-w-[200px] mx-auto leading-relaxed">No hay historial de lecciones para este curso</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {error && (
            <div className="mt-6 md:mt-8 p-4 md:p-6 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl md:rounded-[2rem] flex items-center gap-3 md:gap-4 text-rose-600 dark:text-rose-400 animate-shake">
               <AlertCircle className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
               <p className="font-bold text-[10px] md:text-xs uppercase tracking-wider">{error}</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  );
};

// Helper Components
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 lg:p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[1.2rem] md:rounded-[1.5rem] lg:rounded-[2rem] border border-slate-200 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all group">
     <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-white dark:bg-[#1a2332] border border-slate-100 dark:border-slate-700 rounded-[0.8rem] md:rounded-xl lg:rounded-2xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all shadow-sm">
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
     </div>
     <div className="space-y-0.5 md:space-y-1 overflow-hidden mt-0.5 md:mt-1">
        <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{label}</p>
        <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2 md:line-clamp-1 break-words">{value || "—"}</p>
     </div>
  </div>
);

const EnrollmentCard = ({ enroll, onView, onWithdraw, getLevelName, getStatusBadge }) => (
  <div className="group bg-white dark:bg-slate-800/30 rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 dark:border-slate-700/80 p-5 md:p-6 lg:p-8 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all flex flex-col gap-4 md:gap-5 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    
    <div className="flex justify-between items-start gap-3 md:gap-4">
      <div className="space-y-1 md:space-y-1.5 min-w-0 flex-1">
         <h4 className="font-bold text-base md:text-lg text-slate-900 dark:text-white tracking-tight line-clamp-2 leading-snug">
           {enroll.cohortName || "Curso General"}
         </h4>
         <p className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
           <BookOpen className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" /> <span className="line-clamp-1">{getLevelName(enroll.enrollment?.level)}</span>
         </p>
      </div>
      <div className="shrink-0">{getStatusBadge(enroll.status)}</div>
    </div>

    <div className="flex items-center gap-4 md:gap-6 py-3 md:py-4 border-y border-slate-100 dark:border-slate-700/50">
       <div className="flex-1 text-center">
          <p className="text-[8px] md:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Asistencia</p>
          <p className="text-lg md:text-xl font-black text-indigo-600 dark:text-indigo-400">
            {enroll.finalAttendancePercentage ? `${enroll.finalAttendancePercentage.toFixed(1)}%` : "—"}
          </p>
       </div>
       <div className="w-px h-6 md:h-8 bg-slate-200 dark:border-slate-700"></div>
       <div className="flex-1 text-center">
          <p className="text-[8px] md:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Estatus</p>
          <div className="flex items-center justify-center">
            {enroll.passed === null ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-slate-300 dark:text-slate-600" /> : enroll.passed ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" /> : <X className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />}
          </div>
       </div>
    </div>

    <div className="flex gap-2.5 md:gap-3 pt-1 md:pt-2">
       <button onClick={onView} className="flex-1 py-3 md:py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[1rem] md:rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all">
          <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" /> Detalles
       </button>
       {enroll.status === "ACTIVE" && (
         <button onClick={onWithdraw} className="p-3 md:p-3.5 bg-rose-50 dark:bg-rose-900/30 text-rose-500 border border-rose-100 dark:border-rose-800/50 rounded-[1rem] md:rounded-2xl hover:bg-rose-100 transition-all shrink-0">
            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
         </button>
       )}
    </div>
  </div>
);

const LessonItem = ({ lesson, index }) => (
  <div className="flex items-center justify-between p-4 md:p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[1.2rem] md:rounded-[1.5rem] border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group shadow-sm">
     <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-[0.8rem] md:rounded-xl bg-white dark:bg-[#1a2332] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] md:text-[11px] font-black text-slate-500 dark:text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all shrink-0 shadow-sm">
           L{lesson.lessonNumber || index + 1}
        </div>
        <div className="space-y-0.5 md:space-y-1 min-w-0">
           <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{lesson.lessonName || lesson.title || "Lección sin nombre"}</p>
           <p className="text-[8px] md:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
             <Calendar className="w-2.5 h-2.5" /> 
             {lesson.lessonDate ? new Date(lesson.lessonDate).toLocaleDateString() : "Fecha no disp."}
           </p>
        </div>
     </div>
     <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {lesson.score !== undefined && lesson.score !== null && (
          <span className="px-2 md:px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] md:text-[10px] font-black border border-indigo-100 dark:border-indigo-800/50 whitespace-nowrap">
             {lesson.score} <span className="opacity-70">pts</span>
          </span>
        )}
        <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm border ${lesson.attended ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800/50" : "text-rose-500 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800/50"}`}>
           {lesson.attended ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <X className="w-4 h-4 md:w-5 md:h-5" />}
        </div>
     </div>
  </div>
);

export default MemberDetailModal;