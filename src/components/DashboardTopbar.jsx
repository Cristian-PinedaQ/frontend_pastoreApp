// ============================================
// DashboardTopbar.jsx - ELITE MODERN EDITION
// ============================================

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import logoBlanco from '../assets/Pastoreapp_blanco.png';
import logoNegro from '../assets/Pastoreappnegro.png';

const DashboardTopbar = ({ user }) => {
  const [isDark, setIsDark] = useState(false);

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
    window.dispatchEvent(new Event('storage'));
  };

  return (
    // ✅ min-w-0 + overflow-hidden: nunca desborda su celda del grid del header
    <div className="flex items-center gap-3 min-w-0 overflow-hidden">

      {/*
        Logo solo visible en mobile (lg:hidden).
        En desktop ya aparece en el sidebar — mostrarlo aquí
        consumía espacio horizontal y empujaba la campana.
      */}
      <div className="relative group lg:hidden shrink-0">
        <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-500" />
        <div className="relative flex items-center h-10">
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

      {/* Separador — solo si el logo está visible */}
      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 lg:hidden shrink-0" />

      {/* Nombre de la iglesia — truncate evita que expanda el contenedor */}
      <h2 className="text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase truncate min-w-0">
        {user?.name || 'Iglesia Raiz de David'}
      </h2>

      {/* Theme toggle — shrink-0 para que nunca se comprima */}
      <button
        onClick={toggleTheme}
        className="relative shrink-0 flex items-center w-16 h-8 p-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700/50 shadow-inner transition-all duration-500 focus:outline-none"
        title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      >
        <div
          className={`
            flex items-center justify-center w-6 h-6 rounded-full shadow-lg
            transition-all duration-500 transform
            ${isDark
              ? 'translate-x-8 bg-indigo-600'
              : 'translate-x-0 bg-amber-400 rotate-[360deg]'}
          `}
        >
          {isDark
            ? <Moon className="w-3.5 h-3.5 text-white fill-white/20" />
            : <Sun  className="w-3.5 h-3.5 text-white fill-white/20" />
          }
        </div>
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
          <Sun  className={`w-3 h-3 text-amber-500 transition-opacity duration-500 ${isDark ? 'opacity-20' : 'opacity-0'}`} />
          <Moon className={`w-3 h-3 text-slate-400 transition-opacity duration-500 ${isDark ? 'opacity-0' : 'opacity-20'}`} />
        </div>
      </button>
    </div>
  );
};

export default DashboardTopbar;