import React from 'react';
import logoBlanco from '../assets/Pastoreapp_blanco.png';
import logoNegro from '../assets/Pastoreappnegro.png';

const DashboardTopbar = ({ user }) => {
  return (
    <div className="flex items-center gap-3 min-w-0 overflow-hidden">

      <div className="relative group lg:hidden shrink-0">
        <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full blur opacity-0 group-hover:opacity-20 transition duration-500" />
        <div className="relative flex items-center h-10">
          <img
            src={logoNegro}
            alt="PastoreApp Logo"
            loading="lazy"
            className="block dark:hidden h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <img
            src={logoBlanco}
            alt="PastoreApp Logo"
            loading="lazy"
            className="hidden dark:block h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 lg:hidden shrink-0" />

      <h2 className="text-base lg:text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase truncate min-w-0">
        {user?.name || 'Iglesia Raiz de David'}
      </h2>
    </div>
  );
};

export default DashboardTopbar;
