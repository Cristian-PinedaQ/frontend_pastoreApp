import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import { useAuth } from "../context/AuthContext";
import { 
  Music, 
  Calendar, 
  Users, 
  RefreshCw, 
  Guitar,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ListMusic
} from "lucide-react";

import WorshipScheduleTab from "../components/worship-components/WorshipScheduleTab";
import WorshipTeamTab from "../components/worship-components/WorshipTeamTab";
import WorshipRolesTab from "../components/worship-components/WorshipRolesTab";
import WorshipRepertoireTab from "../components/worship-components/WorshipRepertoireTab";

const toArray = (val) => (Array.isArray(val) ? val : []);

const unwrap = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.content && Array.isArray(data.content)) return data.content;
  return [];
};

const WorshipPage = () => {
  const { user } = useAuth();
  const canManageWorship = true; // Permiso hardcodeado según lógica previa de administración

  const [activeTab, setActiveTab] = useState("SCHEDULE");
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [songs, setSongs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const theme = {
    primary: "#6366f1",
    danger: "#ef4444",
    successText: "#10b981",
    bgSecondary: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.1)",
    text: "#f8fafc",
    textSecondary: "#94a3b8"
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 6000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teamData, rolesData, eventsData, songsData] = await Promise.all([
        apiService.getWorshipTeam(),
        apiService.getWorshipRoles(),
        apiService.getWorshipEvents(),
        apiService.getWorshipSongs(),
      ]);

      const safeTeam   = unwrap(teamData);
      const safeRoles  = unwrap(rolesData);
      const safeEvents = unwrap(eventsData);
      const safeSongs  = unwrap(songsData);

      setTeamMembers(safeTeam);
      setRoles(safeRoles.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setEvents(safeEvents);
      setSongs(safeSongs.sort((a, b) => (a.title || "").localeCompare(b.title || "")));
    } catch (err) {
      showError("Error crítico al sincronizar el ministerio. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = {
    events: toArray(events).length,
    team: toArray(teamMembers).length,
    roles: toArray(roles).length,
    songs: toArray(songs).length
  };

  const tabs = [
    { id: "SCHEDULE",   label: "Cronograma", icon: Calendar, count: stats.events },
    { id: "TEAM",       label: "Equipo",      icon: Users,    count: stats.team   },
    { id: "ROLES",      label: "Instrumentos",icon: Guitar,   count: stats.roles  },
    { id: "REPERTOIRE", label: "Repertorio",  icon: ListMusic,count: stats.songs  },
  ];

  const isInitialLoading = loading && stats.team === 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0e14] p-4 md:p-8 pt-20 transition-all duration-500">
      <div className="max-w-[1600px] mx-auto space-y-10 animate-in">
        
        {/* ── HEADER SUPREMO ── */}
        <header className="relative bg-slate-900 overflow-hidden rounded-[3.5rem] p-8 md:p-14 shadow-[0_32px_80px_rgba(0,0,0,0.4)] border border-white/5 group">
           {/* Animated Background Orbs */}
           <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-indigo-600 opacity-[0.15] blur-[140px] -mr-48 -mt-48 transition-all duration-1000 group-hover:scale-110 pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600 opacity-[0.08] blur-[120px] -ml-32 -mb-32 pointer-events-none" />
           
           <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                 <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-[0_20px_50px_rgba(79,70,229,0.5)] transition-all duration-700 hover:rotate-[10deg] hover:scale-110 border-4 border-white/10 group-hover:bg-indigo-500">
                    <Music size={48} strokeWidth={2.5} className="animate-pulse" />
                 </div>
                 <div className="space-y-3">
                    <div className="flex flex-col">
                       <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.9] group-hover:text-indigo-50 transition-colors">
                          Ministerio <br />
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 not-italic">de Alabanza</span>
                       </h1>
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-4">
                       <p className="text-[10px] font-black text-indigo-200/40 uppercase tracking-[0.5em] flex items-center gap-3">
                          <Sparkles size={12} className="text-amber-400" /> Excelencia Musical & Litúrgica
                       </p>
                       <div className="h-4 w-px bg-white/10" />
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest">Sistema Live</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6">
                 {/* Profile Dashboard Card */}
                 <div className="flex items-center gap-5 px-8 py-4 bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-inner group/card hover:bg-white/[0.08] transition-all">
                    <div className="flex flex-col text-right">
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Director en Turno</span>
                       <span className="text-sm font-black text-white uppercase tracking-tighter italic">{user?.username || "Pastor Admin"}</span>
                    </div>
                    <div className="relative">
                       <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 group-hover/card:scale-110 transition-transform shadow-lg">
                          <ShieldCheck size={28} />
                       </div>
                    </div>
                 </div>

                 <button 
                   onClick={loadData}
                   disabled={loading}
                   className="group/sync w-16 h-16 bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-[1.8rem] flex items-center justify-center border border-white/5 transition-all duration-500 active:scale-90 shadow-lg hover:shadow-indigo-600/40"
                 >
                    <RefreshCw size={28} className={`${loading ? "animate-spin" : "group-hover/sync:rotate-180"} transition-all duration-700`} />
                 </button>
              </div>
           </div>
        </header>

        {/* ── ALERTS SYSTEM ── */}
        <div className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl flex items-center gap-4 text-rose-500 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-rose-500/5">
               <AlertCircle size={24} />
               <p className="text-sm font-black uppercase tracking-tight">{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl flex items-center gap-4 text-emerald-500 animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-emerald-500/5">
               <CheckCircle2 size={24} />
               <p className="text-sm font-black uppercase tracking-tight">{successMessage}</p>
            </div>
          )}
        </div>

        {/* ── MASTER TABS CONSOLE ── */}
        <div className="space-y-8">
           <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 px-3 sm:px-8 py-3 sm:py-5 rounded-[1.2rem] sm:rounded-[2rem] transition-all duration-500 whitespace-nowrap group min-w-[85px] sm:min-w-0
                    ${activeTab === tab.id 
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 font-black" 
                      : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                    }
                  `}
                >
                  <tab.icon size={18} className={`sm:w-[22px] sm:h-[22px] transition-transform duration-500 ${activeTab === tab.id ? 'rotate-0' : 'group-hover:-rotate-12'}`} />
                  <div className="flex flex-col sm:flex-row items-center gap-1.5">
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-tighter sm:tracking-widest">{tab.label}</span>
                    <div className={`
                      min-w-[18px] sm:min-w-[24px] px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black border
                      ${activeTab === tab.id ? "bg-white/20 border-white/20 text-white" : "bg-slate-100 dark:bg-white/5 border-transparent text-slate-500"}
                    `}>
                      {tab.count}
                    </div>
                  </div>
                </button>
              ))}
           </div>

           {/* ── VIEPORT ── */}
           <main className="min-h-[600px] animate-in slide-in-from-bottom-10 duration-1000">
             {isInitialLoading ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-8 bg-white/50 dark:bg-white/5 rounded-[4rem] border border-dashed border-slate-200 dark:border-white/10">
                   <div className="relative">
                      <div className="w-24 h-24 border-8 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                      <Music className="absolute inset-0 m-auto w-10 h-10 text-indigo-400 animate-pulse" />
                   </div>
                   <div className="text-center space-y-2">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sincronizando Consola...</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Preparando partituras y alineación ministerial</p>
                   </div>
                </div>
             ) : (
                <div className="pb-20">
                  {activeTab === "SCHEDULE" && (
                    <WorshipScheduleTab
                      events={toArray(events)}
                      teamMembers={toArray(teamMembers)}
                      roles={toArray(roles)}
                      songs={toArray(songs)}
                      canManageWorship={canManageWorship}
                      theme={theme}
                      isDarkMode={true}
                      loadData={loadData}
                      showSuccess={showSuccess}
                      showError={showError}
                      loading={loading}
                      setLoading={setLoading}
                    />
                  )}

                  {activeTab === "TEAM" && (
                    <WorshipTeamTab
                      teamMembers={toArray(teamMembers)}
                      roles={toArray(roles)}
                      canManageWorship={canManageWorship}
                      theme={theme}
                      isDarkMode={true}
                      loadData={loadData}
                      showSuccess={showSuccess}
                      showError={showError}
                      loading={loading}
                      setLoading={setLoading}
                    />
                  )}

                  {activeTab === "ROLES" && (
                    <WorshipRolesTab
                      roles={toArray(roles)}
                      canManageWorship={canManageWorship}
                      theme={theme}
                      isDarkMode={true}
                      loadData={loadData}
                      showSuccess={showSuccess}
                      showError={showError}
                      loading={loading}
                      setLoading={setLoading}
                    />
                  )}

                  {activeTab === "REPERTOIRE" && (
                    <WorshipRepertoireTab
                      songs={toArray(songs)}
                      teamMembers={toArray(teamMembers)}
                      canManageWorship={canManageWorship}
                      theme={theme}
                      isDarkMode={true}
                      loadData={loadData}
                      showSuccess={showSuccess}
                      showError={showError}
                      loading={loading}
                      setLoading={setLoading}
                    />
                  )}
                </div>
             )}
           </main>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-datetime-edit-fields-wrapper { background: transparent; }
      `}} />
    </div>
  );
};

export default WorshipPage;