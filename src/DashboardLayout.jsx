// ============================================
// DashboardLayout.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useConfirmation } from "./context/ConfirmationContext";
import { 
  Users, HeartHandshake, GraduationCap, 
  UserStar, Church, CheckSquare, Music, 
  Calendar, Landmark, ChartPie, SlidersHorizontal, UserCircle, LogOut, Menu, X, Flame, MessageCircleQuestionMark, NotebookPen
} from 'lucide-react';
import DashboardTopbar from "./components/DashboardTopbar";
import NotificationBell from "./components/NotificationBell";
import logoBlanco from './assets/Pastoreapp_blanco.png';
import logoNegro from './assets/Pastoreappnegro.png';

const SCROLLBAR_STYLES = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }
`;

export const DashboardLayout = () => {
  const { user, logout, hasRole, hasAnyRole } = useAuth();
  const confirm = useConfirmation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setIsDarkMode] = useState(false);

  // ========== SYNC DARK MODE ==========
  useEffect(() => {
    // Cargar preferencia guardada
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-mode');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark', 'dark-mode');
    }

    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "¿Cerrar Sesión?",
      message: "¿Estás seguro de que deseas salir del sistema? Deberás autenticarte nuevamente para acceder.",
      type: "info",
      confirmLabel: "Finalizar Sesión",
      onConfirm: async () => {
        logout();
        navigate("/login");
      }
    });
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (window.innerWidth <= 1024) {
      setSidebarOpen(false);
    }
  };
 
  const menuItems = [
    { label: "Inicio", path: "/dashboard", icon: Church, visible: true },
    { label: "Membresía", path: "/dashboard/members", icon: Users, visible: true },
    { label: "Consejería", path: "/dashboard/Counseling", icon: HeartHandshake, visible: hasAnyRole(["ROLE_PASTORES"]) },
    { label: "Formaciones", path: "/dashboard/enrollments", icon: NotebookPen, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_CONEXION", "ROLE_CIMIENTO", "ROLE_ESENCIA", "ROLE_PROFESORES"]) },
    { label: "Estudiantes", path: "/dashboard/students", icon: GraduationCap, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_CONEXION", "ROLE_CIMIENTO", "ROLE_ESENCIA"]) },
    { label: "Servidores", path: "/dashboard/leadership", icon: UserStar, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_CONEXION", "ROLE_CIMIENTO", "ROLE_ESENCIA", "ROLE_DESPLIEGUE"]) },
    { label: "Altares de Vida", path: "/dashboard/cellgroups", icon: Flame, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_CONEXION", "ROLE_DESPLIEGUE"]) },
    { label: "Asistencias", path: "/dashboard/cellgroups-atendance", icon: CheckSquare, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_LIDER", "ROLE_CONEXION"]) },
    { label: "Alabanza", path: "/dashboard/worshipPage", icon: Music, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_ALABANZA"]) },
    { label: "Actividades", path: "/dashboard/activity", icon: Calendar, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_ECONOMICO", "ROLE_CONEXION", "ROLE_CIMIENTO", "ROLE_ESENCIA"]) },
    { label: "Finanzas", path: "/dashboard/finances", icon: Landmark, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_ECONOMICO"]) },
    { label: "Contabilidad", path: "/dashboard/financesChurch", icon: ChartPie, visible: hasAnyRole(["ROLE_PASTORES"]) },
    { label: "Configuración", path: "/dashboard/LevelsConfig", icon: SlidersHorizontal, visible: hasRole("ROLE_PASTORES") },
    { label: "Manual Raiz Viva", path: "/dashboard/ManualRaizViva", icon: MessageCircleQuestionMark, visible: hasAnyRole(["ROLE_PASTORES", "ROLE_ECONOMICO", "ROLE_CONEXION", "ROLE_CIMIENTO", "ROLE_ESENCIA", "ROLE_LIDER"]) },
    { label: "Usuarios", path: "/dashboard/users", icon: UserCircle, visible: hasRole("ROLE_PASTORES") },
  ];

  const filteredMenu = menuItems.filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans selection:bg-indigo-500/30">
      <style>{SCROLLBAR_STYLES}</style>
      
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 bg-white dark:bg-slate-900 
        border-r border-slate-200 dark:border-white/5
        flex flex-col transform transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* SIDEBAR MOBILE CLOSE BUTTON */}
        <button 
          className="lg:hidden absolute top-5 right-4 w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform active:scale-95"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={20} />
        </button>
        {/* SIDEBAR HEADER */}
        <div className="h-20 flex items-center px-8 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-1">
            <div className="relative w-14 h-14 flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src={logoNegro} 
                alt="Logo" 
                className="block dark:hidden w-full h-full object-contain"
              />
              <img 
                src={logoBlanco} 
                alt="Logo" 
                className="hidden dark:block w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tighter leading-tight">
              PastoreApp
            </h1>
          </div>
        </div>

        {/* SIDEBAR NAVIGATION */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'}
                `}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* SIDEBAR USER SECTION */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase truncate">
                  {user?.roles?.map((r) => r.name || r).join(" • ")}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 transition-all uppercase tracking-widest"
            >
              <LogOut size={14} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        
        {/* TOPBAR */}
        <header className="h-20 flex items-center justify-between px-4 lg:px-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 sticky top-0 z-50 transition-all">
          <div className="flex items-center gap-2 lg:gap-4 truncate mr-2">
            <button 
              className="lg:hidden p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            
            <div className="flex-1 truncate">
              <DashboardTopbar user={user} />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-6 shrink-0">
            <div className="hidden md:flex flex-col items-end mr-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sesión activa</span>
              <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[120px]">{user?.username}</span>
            </div>
            
            <div className="relative">
              <NotificationBell username={user?.username} pollInterval={30000} />
            </div>
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar relative">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
