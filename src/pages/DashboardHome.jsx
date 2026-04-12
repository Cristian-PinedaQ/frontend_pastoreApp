import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Heart, 
  Sword, 
  Home, 
  ShieldCheck, 
  FolderKanban, 
  ArrowRight,
  Sparkles,
  Zap,
  Calendar,
  CheckCircle2,
  Flame,
  NotebookPen
} from 'lucide-react';
import logoDora from '../assets/LOGO_PNG_DORADO.avif';

const StatCard = ({ title, value, icon: Icon, gradient, loading }) => (
  <div className={`relative group overflow-hidden rounded-[2.5rem] p-8 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${gradient}`}>
    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
    <div className="relative flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-white/70 text-xs font-black uppercase tracking-[0.2em]">{title}</p>
        <h3 className="text-white text-4xl font-black tracking-tighter">
          {loading ? (
            <div className="h-10 w-16 bg-white/20 animate-pulse rounded-lg"></div>
          ) : value}
        </h3>
      </div>
      <div className="p-4 bg-white/15 backdrop-blur-md rounded-[1.5rem] text-white shadow-xl">
        <Icon size={28} strokeWidth={2.5} />
      </div>
    </div>
  </div>
);

const QuickAction = ({ href, title, description, icon: Icon, variant }) => {
  const themes = {
    indigo: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/20",
    violet: "bg-violet-600 hover:bg-violet-700 shadow-violet-200 dark:shadow-violet-900/20",
    slate: "bg-slate-900 hover:bg-black shadow-slate-200 dark:shadow-slate-900/40"
  };

  return (
    <a 
      href={href} 
      className={`relative group p-6 rounded-[2rem] text-white transition-all duration-300 hover:-translate-y-1 shadow-xl ${themes[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="p-3 bg-white/10 rounded-2xl w-fit group-hover:bg-white/20 transition-colors">
            <Icon size={24} />
          </div>
          <div>
            <h4 className="font-black text-lg tracking-tight">{title}</h4>
            <p className="text-white/70 text-xs font-medium leading-relaxed">{description}</p>
          </div>
        </div>
        <ArrowRight size={20} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </div>
    </a>
  );
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMembersFemale: 0,
    totalMembersMale: 0,
    totalEnrollments: 0,
    totalLessons: 0,
    totalAttendance: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [members, enrollments, leaders, cells] = await Promise.all([
          apiService.getAllMembers(),
          apiService.getEnrollments(),
          apiService.getActiveLeaders().catch(() => apiService.getLeaders()),
          apiService.getCells()
        ]);

        const activeMembers = members?.filter(m => m.isActive) || [];
        
        setStats({
          totalMembers: activeMembers.length,
          totalMembersFemale: activeMembers.filter(m => m.gender === "FEMENINO").length,
          totalMembersMale: activeMembers.filter(m => m.gender === "MASCULINO").length,
          totalEnrollments: enrollments?.filter(e => e.status === 'PENDING' || e.status === 'ACTIVE').length || 0,
          totalLessons: Array.isArray(cells) ? cells.filter(c => c.status === 'ACTIVE' || c.isActive).length : 0,
          totalAttendance: Array.isArray(leaders) ? leaders.length : 0,
        });
      } catch (err) {
        setError("Error al sincronizar datos pastorales");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 sm:p-12 text-white">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px]"></div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white/5 backdrop-blur-xl rounded-[3rem] p-6 flex items-center justify-center border border-white/10 shadow-2xl">
            <img src={logoDora} alt="Logo" className="w-full h-full object-contain filter drop-shadow-2xl" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">
              <Sparkles size={14} />
              Nivel de Gestión Élite
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-tight">
              ¡Bienvenido de nuevo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">{user?.username?.split(" ")[0]}</span>! 👋
            </h1>
            <p className="text-white/50 text-base font-medium max-w-xl">
              Tu ministerio hoy: {stats.totalMembers} corazones bajo tu cuidado y {stats.totalLessons} altares encendidos.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 font-bold animate-shake">
          <Zap size={20} /> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Membresía Activa" 
          value={stats.totalMembers} 
          icon={Users} 
          gradient="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900" 
          loading={loading}
        />
        <StatCard 
          title="Rocíos de Vida" 
          value={stats.totalMembersFemale} 
          icon={Heart} 
          gradient="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800" 
          loading={loading}
        />
        <StatCard 
          title="Radicales" 
          value={stats.totalMembersMale} 
          icon={Sword} 
          gradient="bg-gradient-to-br from-slate-800 via-slate-900 to-black" 
          loading={loading}
        />
        <StatCard 
          title="Altares de Vida" 
          value={stats.totalLessons} 
          icon={Flame} 
          gradient="bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900" 
          loading={loading}
        />
        <StatCard 
          title="Servidores" 
          value={stats.totalAttendance} 
          icon={ShieldCheck} 
          gradient="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900" 
          loading={loading}
        />
        <StatCard 
          title="Procesos Activos" 
          value={stats.totalEnrollments} 
          icon={NotebookPen} 
          gradient="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900" 
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8">
        {/* Quick Access */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Zap className="text-indigo-600" /> Accesos de Alta Velocidad
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickAction 
              href="/dashboard/members" 
              title="Miembros" 
              description="Gestión integral" 
              icon={Users} 
              variant="indigo"
            />
            <QuickAction 
              href="/dashboard/cellgroups-atendance" 
              title="Asistencia" 
              description="Altares de vida" 
              icon={CheckCircle2} 
              variant="slate"
            />
            <QuickAction 
              href="/dashboard/activity" 
              title="Actividades" 
              description="Crea y gestiona" 
              icon={Calendar} 
              variant="violet"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] p-8 space-y-6 border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Estrategia Pastoral</h2>
          <div className="space-y-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
              PastoreApp centraliza tu visión ministerial. Administra cada corazón con precisión digital y calidez humana.
            </p>
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Permisos Actuales</p>
              <div className="flex flex-wrap gap-2">
                {user?.roles?.map((r, i) => (
                  <span key={i} className="px-3 py-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-700 shadow-sm">
                    {r.username || r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;