// ============================================
// DashboardTopbar.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import logoBlanco from '../assets/Pastoreapp_blanco.png';
import logoNegro from '../assets/Pastoreappnegro.png';

const DashboardTopbar = ({ user }) => {
  const [isDark, setIsDark] = useState(false);

  // Inicializar estado del tema
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark', 'dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark', 'dark-mode');
      localStorage.setItem('theme', 'light');
    }
    
    // Disparar un evento storage para que otros componentes se enteren si es necesario
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="flex items-center gap-4">
      {/* Logos responsivos con cambio según tema */}
      <div className="relative group">
        <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
        <div className="relative flex items-center h-12">
          {/* Logo que cambia según el tema del sistema/clase dark */}
          <img
            src={logoNegro}
            alt="Logo"
            className="block dark:hidden h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <img
            src={logoBlanco}
            alt="Logo"
            className="hidden dark:block h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />

      {/* Título Identitario */}
      <h2 className="hidden sm:block text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase mr-4">
        {user?.name || 'Iglesia Raiz de David'}
      </h2>

      {/* THEME TOGGLE BUTTON - PREMIUM PILL DESIGN */}
      <button
        onClick={toggleTheme}
        className="relative flex items-center w-16 h-8 p-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700/50 shadow-inner transition-all duration-500 group focus:outline-none"
        title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
      >
        <div className={`
          flex items-center justify-center w-6 h-6 rounded-full shadow-lg transition-all duration-500 transform
          ${isDark ? 'translate-x-8 bg-indigo-600 rotate-0' : 'translate-x-0 bg-amber-400 rotate-[360deg]'}
        `}>
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-white fill-white/20" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-white fill-white/20" />
          )}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-between px-2 px-3 pointer-events-none">
          <Sun className={`w-3 h-3 text-amber-500 transition-opacity duration-500 ${isDark ? 'opacity-20' : 'opacity-0'}`} />
          <Moon className={`w-3 h-3 text-slate-400 transition-opacity duration-500 ${isDark ? 'opacity-0' : 'opacity-20'}`} />
        </div>
      </button>
    </div>
  );
};

export default DashboardTopbar;