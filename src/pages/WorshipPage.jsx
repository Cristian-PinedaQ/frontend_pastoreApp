import React, { useState, useEffect, useCallback } from "react";
import apiService from "../apiService";
import PageHero from "../components/PageHero";
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
  const canManageWorship = true; // Permiso hardcodeado según lógica previa de administración

  const [activeTab, setActiveTab] = useState("SCHEDULE");
  const [refreshKey, setRefreshKey] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [events, setEvents] = useState([]);
  const [songs, setSongs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    loadData();
  };

  const theme = {
    // ... existiendo
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
        
        <PageHero
          variant="dark"
          size="large"
          title="Ministerio"
          highlight="de Alabanza"
          stats={[
            { label: "Excelencia Musical & Litúrgica", variant: "amber", icon: Sparkles },
            { label: "Sistema Live", variant: "emerald", icon: ShieldCheck },
          ]}
          actions={
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-4 bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-[1.5rem] border border-white/5 transition-all duration-500 active:scale-90 shadow-lg hover:shadow-indigo-600/40"
            >
              <RefreshCw size={24} className={`${loading ? "animate-spin" : "group-hover:rotate-180"} transition-all duration-700`} />
            </button>
          }
        />

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
                      key={`schedule-${refreshKey}`}
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
                      key={`team-${refreshKey}`}
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
                      key={`roles-${refreshKey}`}
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
                      key={`repertoire-${refreshKey}`}
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