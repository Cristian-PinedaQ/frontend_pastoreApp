import React from "react";
import { Users, Target, TrendingUp } from "lucide-react";

export default function G12MetricsCard({ data }) {
  const initial = data?.initial ?? 0;
  const finalCount = data?.finalCount ?? 0;
  const effectiveness = data?.effectiveness ?? 0;

  const items = [
    {
      label: "Inicial",
      value: initial,
      icon: Users,
      color: "indigo",
    },
    {
      label: "Final",
      value: finalCount,
      icon: Target,
      color: "emerald",
    },
    {
      label: "Efectividad",
      value: `${(effectiveness * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: effectiveness >= 0.7 ? "emerald" : effectiveness >= 0.4 ? "amber" : "rose",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        const colorMap = {
          indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
          emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
          amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
          rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
        };
        return (
          <div
            key={item.label}
            className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorMap[item.color]}`}>
                <Icon size={20} />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {item.label}
              </p>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
