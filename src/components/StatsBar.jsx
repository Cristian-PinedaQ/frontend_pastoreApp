import React from "react";

export const StatsBar = ({ children, className = "" }) => {
  return (
    <div className={`flex flex-wrap items-center gap-6 ${className}`}>
      {children}
    </div>
  );
};

export const StatItem = ({ label, value, color = "slate" }) => {
  const colorClasses = {
    slate: "text-slate-900 dark:text-white",
    emerald: "text-emerald-600 dark:text-emerald-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="text-center">
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-black ${colorClasses[color] || colorClasses.slate}`}>{value}</p>
    </div>
  );
};

export default StatsBar;
