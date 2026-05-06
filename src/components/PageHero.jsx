import React from "react";

/**
 * PageHero — Contrato formal para páginas de identidad visual.
 * NO es PageHeader extendido. Es un componente distinto para layouts hero.
 *
 * Diferencia clave con PageHeader:
 * - PageHeader: CRUD, gestión, paneles funcionales
 * - PageHero: identidad visual, dashboards principales, presencia de marca
 *
 * API:
 *   title        string    — obligatorio
 *   highlight    string    — parte del título en gradiente (opcional)
 *   eyebrow      string    — categoría superior (opcional)
 *   icon         Icon      — Lucide icon para eyebrow (opcional)
 *   description  string    — subtítulo descriptivo (opcional)
 *   image        ReactNode — logo o imagen lateral (opcional)
 *   stats        array     — badges inline [{ label, value, variant, icon }]
 *   actions      ReactNode — botones
 *   variant      'light' | 'dark'  — default 'light'
 *   decorative   boolean   — gradient blob/orb decorativo, default true
 *   size         'large' | 'medium' — default 'large'
 */

export const PageHero = ({
  title,
  highlight,
  eyebrow,
  icon: EyebrowIcon,
  description,
  image,
  stats = [],
  actions,
  variant = "light",
  decorative = true,
  size = "large",
  children,
}) => {
  const isDark = variant === "dark";

  const sizeClasses = {
    large: "p-8 md:p-10 lg:p-14",
    medium: "p-6 md:p-8",
  };

  const titleSize = {
    large: "text-4xl md:text-5xl lg:text-6xl",
    medium: "text-3xl md:text-4xl",
  };

  const baseClasses = isDark
    ? "bg-slate-900 border-white/5 text-white"
    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white";

  const orbColor = isDark
    ? "bg-indigo-600 opacity-[0.15] blur-[140px]"
    : "bg-gradient-to-bl from-blue-500/10 to-transparent";

  const eyebrowColor = isDark
    ? "text-indigo-400"
    : "text-indigo-600 dark:text-indigo-400";

  return (
    <div
      className={`relative overflow-hidden rounded-[2.5rem] border shadow-lg ${sizeClasses[size]} ${baseClasses}`}
    >
      {/* Decorative orb */}
      {decorative && (
        <div
          className={`absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 rounded-full -mr-10 -mt-10 pointer-events-none ${orbColor}`}
        />
      )}

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left: image + title block */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 min-w-0 flex-1">
          {image && <div className="shrink-0">{image}</div>}
          <div className="space-y-4 min-w-0 text-center md:text-left">
            {eyebrow && (
              <div
                className={`flex items-center justify-center md:justify-start gap-3 font-black text-xs uppercase tracking-[0.4em] ${eyebrowColor}`}
              >
                {EyebrowIcon && <EyebrowIcon size={16} />}
                {eyebrow}
              </div>
            )}

            <h1
              className={`font-black tracking-tighter leading-tight ${titleSize[size]}`}
            >
              {title}
              {highlight && (
                <>
                  {" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-violet-400">
                    {highlight}
                  </span>
                </>
              )}
            </h1>

            {description && (
              <p className={isDark ? "text-white/50 font-medium" : "text-slate-500 dark:text-slate-400 font-medium"}>
                {description}
              </p>
            )}

            {stats.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {stats.map((stat, i) => {
                  const variantClass =
                    stat.variant === "emerald"
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50"
                      : stat.variant === "indigo"
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50"
                      : stat.variant === "amber"
                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/50"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700";

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-sm font-bold tracking-tight ${variantClass}`}
                    >
                      {stat.icon && <stat.icon size={16} className="shrink-0" />}
                      <span>{stat.label}</span>
                      {stat.value !== undefined && (
                        <span className="font-black">{stat.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions */}
        {actions && (
          <div className="flex flex-wrap gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Extra slot */}
      {children && <div className="relative z-10 mt-6">{children}</div>}
    </div>
  );
};

export default PageHero;
