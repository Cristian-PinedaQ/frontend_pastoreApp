import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function G12LevelsProgress({ levels, initial }) {
  if (!levels || levels.length === 0) {
    return (
      <div className="rounded-3xl border bg-white dark:bg-slate-900 p-8 shadow-sm border-slate-200 dark:border-slate-800 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay datos de progreso por nivel.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...levels.map((l) => l.count ?? 0), 1);

  return (
    <div className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm border-slate-200 dark:border-slate-800 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Progreso por Nivel
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Retención de miembros a través de los niveles formativos
        </p>
      </div>

      <div className="space-y-4">
        {levels.map((level, idx) => {
          const count = level.count ?? 0;
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const retention = initial > 0 ? (count / initial) * 100 : 0;
          const prevCount = idx > 0 ? (levels[idx - 1].count ?? 0) : initial;
          const diff = prevCount > 0 ? count - prevCount : 0;

          let TrendIcon = Minus;
          let trendColor = "text-slate-400";
          if (diff < 0) {
            TrendIcon = TrendingDown;
            trendColor = "text-rose-500";
          } else if (diff > 0) {
            TrendIcon = TrendingUp;
            trendColor = "text-emerald-500";
          }

          return (
            <div key={level.level ?? idx}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nivel {level.level}
                  </span>
                  {idx > 0 && (
                    <TrendIcon className={`${trendColor}`} size={14} />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">
                    {retention.toFixed(1)}% retención
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
