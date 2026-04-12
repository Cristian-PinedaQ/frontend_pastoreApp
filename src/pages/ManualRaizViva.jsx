import React, { useState, useCallback, useEffect, useMemo } from "react";
import { 
  Layers, 
  Target, 
  GraduationCap, 
  Rocket, 
  ChevronRight, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  BookOpen,
  LayoutGrid,
  FileText,
  Clock,
  Zap,
  ShieldCheck,
  UserPlus,
  Calendar,
  ClipboardCheck,
  Star,
  Activity,
  UserCheck,
  Home,
  Briefcase,
  Users,
  Search,
  Flag
} from "lucide-react";

// ── Datos Maestros ─────────────────────────────────────────────────────────────────────
const AREAS = {
  CONEXION: {
    key: "CONEXION", num: "01", icon: <Target size={24} />,
    label: "ÁREA 01 · CONEXIÓN", title: "Conexión", subtitle: "Primer Contacto",
    color: "from-blue-600 to-indigo-500", shade: "blue",
    desc: "Puerta de entrada al proceso. Gestiona el registro de nuevos asistentes, supervisa altares de vida y programa eventos de evangelismo.",
  },
  CIMIENTO: {
    key: "CIMIENTO", num: "02", icon: <Layers size={24} />,
    label: "ÁREA 02 · CIMIENTO", title: "Cimiento", subtitle: "Consolidación",
    color: "from-emerald-600 to-teal-500", shade: "emerald",
    desc: "Conduce por Encuentros, Pos-encuentros y Bautizos. Coordina con el área económica las actividades de recaudo para retiros espirituales.",
  },
  ESENCIA: {
    key: "ESENCIA", num: "03", icon: <BookOpen size={24} />,
    label: "ÁREA 03 · ESENCIA", title: "Esencia", subtitle: "Discipulado",
    color: "from-violet-600 to-purple-500", shade: "violet",
    desc: "Formación académica de discipulado. Gestiona niveles de aprendizaje, matrículas económicas y supervisión de asistencia a lecciones.",
  },
  DESPLIEGUE: {
    key: "DESPLIEGUE", num: "04", icon: <Rocket size={24} />,
    label: "ÁREA 04 · DESPLIEGUE", title: "Despliegue", subtitle: "Comisión",
    color: "from-amber-600 to-orange-500", shade: "amber",
    desc: "Cierra el ciclo comisionando líderes. Gestiona promociones, creación de altares de vida y supervisión ministerial superior.",
  },
};

const LEVELS = [
  { num: 1,  name: "Pre-encuentro",  area: "CONEXION"   },
  { num: 2,  name: "Encuentro",      area: "CIMIENTO"   },
  { num: 3,  name: "Pos-encuentro",  area: "CIMIENTO"   },
  { num: 4,  name: "Bautizos",       area: "CIMIENTO"   },
  { num: 5,  name: "Esencia 1",      area: "ESENCIA"    },
  { num: 6,  name: "Esencia 2",      area: "ESENCIA"    },
  { num: 7,  name: "Esencia 3",      area: "ESENCIA"    },
  { num: 8,  name: "Esencia 4",      area: "ESENCIA"    },
  { num: 9,  name: "Adiestramiento", area: "ESENCIA"    },
  { num: 10, name: "Graduación",     area: "DESPLIEGUE" },
];

const FUNCTIONS = {
  CONEXION: [
    {
      id: "CON-01", title: "Creación de cohortes PRE-ENCUENTRO",
      desc: "Habilitar el nivel inicial de formación en PastoreApp antes de cada ciclo de atención.",
      steps: [
        "Ir a Formaciones -> + Nueva Cohorte.",
        "Seleccionar nivel PREENCUENTRO.",
        "Configurar fechas y cupo máximo.",
        "Guardar para habilitar matrícula automática."
      ],
      path: "Formaciones -> + Nueva Cohorte",
    },
    {
      id: "CON-02", title: "Registro de nuevos conectados",
      desc: "Matrícula automática en Pre-encuentro al registrar personas nuevas en el sistema.",
      steps: [
        "Ir a Membresia -> + Agregar.",
        "Completar datos personales y líder asignado.",
        "El sistema realiza la vinculación académica automática."
      ],
      path: "Membresia -> + Agregar",
      note: "Requiere una cohorte PREENCUENTRO activa previa.",
    },
    {
      id: "CON-03", title: "Supervisión de asistencia en altares",
      desc: "Monitorear que los líderes registren puntualmente la asistencia semanal.",
      steps: [
        "Ficha de Asistencias -> Vista General.",
        "Verificar registros dominicales y semanales.",
        "Contactar líderes con registros pendientes."
      ],
      path: "Asistencias -> Vista General",
    },
    {
      id: "CON-04", title: "Programación de eventos especiales",
      desc: "Crear jornadas de evangelismo que habilitan registros de presencia extra.",
      steps: [
        "Asistencias -> Crear Evento.",
        "Definir nombre, fecha y altares participantes.",
        "Habilitar registro por período limitado."
      ],
      path: "Asistencias -> Crear Evento",
    },
  ],
  CIMIENTO: [
    {
      id: "CIM-01", title: "Creación de cohortes de consolidación",
      desc: "Gestionar los tres niveles de consolidación (Encuentro, Pos-encuentro y Bautizos).",
      steps: [
        "Formaciones -> + Nueva Cohorte.",
        "Seleccionar el tipo de nivel correspondiente.",
        "Definir requisitos de aprobación (Asistencia %)."
      ],
      path: "Formaciones -> + Nueva Cohorte",
    },
    {
      id: "CIM-02", title: "Seguimiento económico — Encuentro",
      desc: "Validar pagos de retiros espirituales desde el módulo de actividades.",
      steps: [
        "Actividades -> Buscar Evento Encuentro.",
        "Revisar saldos y pagos totales.",
        "Al completarse el pago, la matrícula se automatiza."
      ],
      path: "Actividades -> Seleccionar Evento",
      note: "La matrícula solo se activa con el pago real capturado en sistema.",
    },
    {
      id: "CIM-03", title: "Inscripción manual a Bautizos",
      desc: "Procesar a los estudiantes aprobados para su ceremonia de bautismo.",
      steps: [
        "Estudiantes -> + Inscribir.",
        "Cargar aprobados del nivel Pos-encuentro.",
        "Confirmar cohorte de Bautizos activa."
      ],
      path: "Estudiantes -> + Inscribir",
    },
  ],
  ESENCIA: [
    {
      id: "ESE-01", title: "Creación de cohortes de discipulado",
      desc: "Lanzar niveles académicos (Esencia 1-4) con requisitos financieros.",
      steps: [
        "Formaciones -> + Nueva Cohorte -> Seleccionar Nivel.",
        "Asignar docente y configurar parámetros de aula.",
        "Sincronizar con Actividades Económicas."
      ],
      path: "Formaciones -> + Nueva Cohorte",
    },
    {
      id: "ESE-02", title: "Gestión de matrículas pagadas",
      desc: "Monitorear el flujo de inscripciones basadas en cumplimiento de pago.",
      steps: [
        "Módulo Actividades -> Revisar Inscritos.",
        "Coordinar con Tesorería registros pendientes.",
        "Confirmar activación académica de estudiantes."
      ],
      path: "Actividades -> Estudiantes Inscritos",
    },
    {
      id: "ESE-03", title: "Registro de asistencia a lecciones",
      desc: "Capturar la presencia en sesión para determinar la aprobación del nivel.",
      steps: [
        "Formaciones -> Seleccionar Cohorte activa.",
        "Pestaña Asistencias -> Seleccionar Lección.",
        "Marcar asistencia en lista digital de clase."
      ],
      path: "Formaciones -> [Cohorte] -> Asistencias",
    },
  ],
  DESPLIEGUE: [
    {
      id: "DES-01", title: "Promoción al liderazgo formal",
      desc: "Habilitar nuevos líderes basándose en fidelidad, doctrina y formación.",
      steps: [
        "Servidores -> Promover nuevo líder.",
        "Seleccionar candidato de la base académica.",
        "El sistema valida requisitos automáticamente."
      ],
      path: "Servidores -> Botón Promover",
      note: "Requiere 10 niveles aprobados, estado civil bíblico y fidelidad en diezmos.",
    },
    {
      id: "DES-02", title: "Supervisión y control de líderes",
      desc: "Monitorear la fatiga o faltas para inactivación o corrección.",
      steps: [
        "Ficha de Servidor -> Ver Historial.",
        "Detectar 3 faltas consecutivas (Inactivación Auto).",
        "Gestionar procesos de restauración manual."
      ],
      path: "Servidores -> Detalle de Líder",
    },
    {
      id: "DES-03", title: "Reactivación de suspendidos",
      desc: "Reincorporar líderes que han subsanado sus faltas o requisitos.",
      steps: [
        "Servidores -> Reactivar Suspendidos.",
        "Validar cumplimiento de nuevos parámetros.",
        "Restaurar altar de vida asoaciado."
      ],
      path: "Servidores -> Reactivar Suspendidos",
    },
    {
      id: "DES-04", title: "Lanzamiento de nuevos Altares de Vida",
      desc: "Formalizar la apertura de un nuevo grupo celular en la red.",
      steps: [
        "Altares de Vida -> + Nuevo Altar.",
        "Asignar nombre, líder principal y geolocalización.",
        "Definir día y hora oficial de reunión."
      ],
      path: "Altares de Vida -> + Nuevo",
    },
  ],
};

const FunctionCard = React.memo(({ func, areaKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const area = AREAS[areaKey];
  
  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      <div className={`h-1.5 w-full bg-gradient-to-r ${area.color}`} />
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left space-y-3 outline-none"
      >
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-${area.shade}-500/20 bg-${area.shade}-500/5 text-${area.shade}-600 dark:text-${area.shade}-400`}>
            {func.id}
          </span>
          <div className={`p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-indigo-500 transition-all ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronRight size={16} />
          </div>
        </div>
        <h3 className="text-[15px] font-black tracking-tight text-slate-900 dark:text-white leading-tight uppercase group-hover:text-indigo-600 transition-colors">
          {func.title}
        </h3>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="h-px bg-slate-100 dark:bg-white/5" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
            {func.desc}
          </p>
          
          <div className="space-y-2.5">
            {func.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-gradient-to-br ${area.color} shadow-lg shadow-indigo-500/30`} />
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{step}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex items-center gap-3">
             <LayoutGrid size={14} className="text-indigo-500 flex-shrink-0" />
             <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">{func.path}</span>
          </div>

          {func.note && (
            <div className={`p-4 bg-${area.shade}-500/5 border-l-4 border-${area.shade}-500 rounded-r-2xl flex gap-3 text-slate-900 dark:text-white`}>
              <Info size={16} className={`text-${area.shade}-600 flex-shrink-0 mt-0.5`} />
              <p className="text-[10px] font-bold leading-relaxed">{func.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
FunctionCard.displayName = "FunctionCard";

const ManualRaizViva = () => {
  const [activeArea, setActiveArea] = useState("CONEXION");
  const areaKeys = Object.keys(AREAS);

  const scrollToArea = useCallback((key) => {
    setActiveArea(key);
    document.getElementById(`area-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-500 pt-20 pb-20">
      
      {/* ── STICKY NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-[100] h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 flex items-center px-4 md:px-8 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-6 max-w-7xl mx-auto w-full">
           <div className="flex items-center gap-2 group cursor-pointer mr-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                 <ShieldCheck size={18} />
              </div>
              <span className="text-xs font-black tracking-tighter text-slate-900 dark:text-white uppercase">Raíz Viva</span>
           </div>
           
           <div className="flex items-center gap-1">
             {areaKeys.map(key => (
               <button 
                 key={key}
                 onClick={() => scrollToArea(key)}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeArea === key 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl" 
                      : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                 }`}
               >
                 {AREAS[key].title}
               </button>
             ))}
           </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 space-y-16 animate-in">
        
        {/* ── HERO ── */}
        <header className="relative py-20 px-8 rounded-[4rem] bg-slate-900 overflow-hidden group shadow-2xl shadow-indigo-500/10">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600 opacity-20 blur-[120px] -mr-48 -mt-48 transition-all duration-1000 group-hover:scale-110" />
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600 opacity-10 blur-[100px] -ml-32 -mb-32" />
           
           <div className="relative z-10 text-center space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-2">
                 <Zap size={14} className="text-amber-400 animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Manual de Ingeniería Pastoral</span>
              </div>
              <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] uppercase italic">
                Proceso <span className="text-indigo-400 not-italic">Raíz Viva</span>
              </h1>
              <p className="text-slate-400 font-bold text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                El mapa operativo para consolidar, discipular y comisionar a la próxima generación de líderes en el Reino.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                 <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Versión 2026</span>
                 </div>
                 <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5">
                    <Activity size={16} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Optimizado PastoreApp</span>
                 </div>
              </div>
           </div>
        </header>

        {/* ── TRACK OVERVIEW ── */}
        <section className="space-y-10 py-10">
           <div className="flex items-center gap-4 mb-10">
              <div className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
              <div className="flex items-center gap-3 px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
                 <LayoutGrid size={16} className="text-indigo-600" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Arquitectura de Proceso</span>
              </div>
              <div className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {areaKeys.map((key, i) => {
                const area = AREAS[key];
                return (
                  <div 
                    key={key}
                    onClick={() => scrollToArea(key)}
                    className="group relative cursor-pointer p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/5 hover:border-indigo-500/30 transition-all hover:-translate-y-2 hover:shadow-2xl shadow-slate-100 dark:shadow-none overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${area.color}`} />
                    <div className="flex flex-col h-full gap-6">
                       <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${area.color} flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform`}>
                          {area.icon}
                       </div>
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">ÁREA {area.num}</p>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{area.title}</h3>
                       </div>
                       <p className="text-xs font-bold text-slate-500 leading-relaxed italic">{area.subtitle}</p>
                       <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                          Ver Manual <ArrowRight size={14} />
                       </div>
                    </div>
                  </div>
                );
              })}
           </div>

           {/* Levels Linear Track */}
           <div className="bg-slate-900/5 dark:bg-white/5 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-3 min-w-max">
                 {LEVELS.map((lvl, i) => (
                    <React.Fragment key={lvl.num}>
                       <div className="group flex flex-col items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-all border-2 border-transparent bg-white dark:bg-slate-800 shadow-sm group-hover:bg-indigo-600 group-hover:text-white ${lvl.area === activeArea ? 'ring-4 ring-indigo-500/20 bg-indigo-500 text-white' : 'text-slate-400'}`}>
                             {lvl.num}
                          </div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter group-hover:text-slate-900 dark:group-hover:text-white whitespace-nowrap">{lvl.name}</span>
                       </div>
                       {i < LEVELS.length - 1 && <ChevronRight size={14} className="text-slate-300 dark:text-slate-700 flex-shrink-0" />}
                    </React.Fragment>
                 ))}
              </div>
           </div>
        </section>

        {/* ── AREA SECTIONS ── */}
        <main className="space-y-32">
          {areaKeys.map((key) => {
            const area = AREAS[key];
            const funcs = FUNCTIONS[key];
            return (
              <section key={key} id={`area-${key}`} className="scroll-mt-40 space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
                
                {/* Section Header */}
                <div className="flex flex-col md:flex-row gap-10 items-start">
                   <div className="relative group">
                      <div className={`w-28 h-28 rounded-[2.5rem] bg-gradient-to-br ${area.color} flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30 group-hover:rotate-6 transition-transform`}>
                         {area.icon}
                      </div>
                      <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-900 dark:text-white shadow-xl border border-slate-100 dark:border-white/10">
                         {area.num}
                      </div>
                   </div>
                   <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-10">
                         <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                            {area.title} <span className="text-indigo-600 not-italic opacity-30 tracking-widest">{area.subtitle}</span>
                         </h2>
                      </div>
                      <p className="text-lg font-bold text-slate-500 max-w-3xl leading-relaxed italic">
                        {area.desc}
                      </p>
                   </div>
                </div>

                {/* Grid of functions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                   {funcs.map((func) => (
                     <FunctionCard key={func.id} func={func} areaKey={key} />
                   ))}
                </div>
              </section>
            );
          })}
        </main>
      </div>

      {/* ── FOOTER ── */}
      <footer className="mt-40 py-20 bg-slate-900 text-center space-y-4">
         <div className="w-16 h-1 bg-indigo-600 mx-auto rounded-full mb-8" />
         <p className="text-sm font-black text-white uppercase tracking-[0.4em]">Manual Operativo Raíz Viva</p>
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic leading-relaxed">
            Consola de Gestión Pastoral v2.6 • © 2026 Todos los derechos reservados
         </p>
         <div className="flex justify-center gap-6 pt-10">
            <ShieldCheck size={24} className="text-indigo-500 opacity-50" />
            <Flag size={24} className="text-slate-700" />
            <Zap size={24} className="text-amber-500 opacity-30" />
         </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default ManualRaizViva;