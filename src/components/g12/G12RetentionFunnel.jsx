import React from "react";
import { Funnel, TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function G12RetentionFunnel({ levels, initial, finalCount }) {
  if (!levels || levels.length === 0) {
    return (
      <div className="rounded-3xl border bg-white dark:bg-slate-900 p-8 shadow-sm border-slate-200 dark:border-slate-800 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay datos de progreso para mostrar el funnel.
        </p>
      </div>
    );
  }

  const maxVal = Math.max(initial, ...levels.map((l) => l.count ?? 0), finalCount ?? 0, 1);
  const allStages = [
    { label: "Inicial", value: initial, isStart: true },
    ...levels.map((l) => ({ label: `Nivel ${l.level}`, value: l.count ?? 0 })),
    { label: "Final", value: finalCount ?? 0, isEnd: true },
  ];

  const gradientColors = allStages.map((stage, idx) => {
    const ratio = idx / (allStages.length - 1 || 1);
    const r = Math.round(99 + ratio * 190);
    const g = Math.round(102 - ratio * 50);
    const b = Math.round(241 - ratio * 100);
    return `rgb(${r},${g},${b})`;
  });

  return (
    <div className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm border-slate-200 dark:border-slate-800 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center">
          <Funnel size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Embudo de Retención
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Progresión de miembros a través de los niveles
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {allStages.map((stage, idx) => {
          const pct = maxVal > 0 ? (stage.value / maxVal) * 100 : 0;
          const retention = initial > 0 ? (stage.value / initial) * 100 : 0;
          const prevValue = idx > 0 ? allStages[idx - 1].value : stage.value;
          const dropped = idx > 0 ? prevValue - stage.value : 0;

          let DropIcon = Minus;
          let dropColor = "text-slate-400";
          if (dropped > 0) {
            DropIcon = TrendingDown;
            dropColor = "text-rose-500";
          } else if (dropped < 0) {
            DropIcon = TrendingUp;
            dropColor = "text-emerald-500";
          }

          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      stage.isStart
                        ? "text-indigo-700 dark:text-indigo-300"
                        : stage.isEnd
                        ? "text-purple-700 dark:text-purple-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {stage.label}
                  </span>
                  {idx > 0 && (
                    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${dropColor}`}>
                      <DropIcon size={10} />
                      {dropped !== 0 && Math.abs(dropped)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">
                    {retention.toFixed(1)}%
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                    {stage.value}
                  </span>
                </div>
              </div>

              <div className="relative h-5 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${gradientColors[idx]}, ${gradientColors[idx]}cc)`,
                  }}
                />
                <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                  <span className="text-[9px] font-bold text-white/60 mix-blend-difference">
                    {Math.round(retention)}% retención
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800">
        <span>
          🔻 qu&eacute; bajó &nbsp; 🔺 subi&oacute; &nbsp; ➖ sin cambio
        </span>
        <span>{initial || 0} inicial → {finalCount ?? 0} final</span>
      </div>
    </div>
  );
}
