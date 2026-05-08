import React from "react";

export const PageHeader = ({ title, subtitle, subtitleVariant = "description", icon: Icon, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter text-slate-900 dark:text-white whitespace-nowrap">
            {title}
          </h1>
          {subtitle && (
            <p
              className={
                subtitleVariant === "eyebrow"
                  ? "text-xs font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1"
                  : "text-sm text-slate-500 dark:text-slate-400 font-medium mt-1"
              }
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
