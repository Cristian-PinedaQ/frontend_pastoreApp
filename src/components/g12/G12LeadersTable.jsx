import React from "react";
import { Crown, Users, Shield } from "lucide-react";
import { getDisplayName } from "../../services/nameHelper";

function LeaderBadge({ classification }) {
  if (!classification) return null;

  if (classification.isLeader1728) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
        <Crown size={12} /> Líder 1728
      </span>
    );
  }
  if (classification.isLeader144) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
        <Shield size={12} /> Líder 144
      </span>
    );
  }
  if (classification.isLeader12) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
        <Users size={12} /> Líder 12
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
      <Users size={12} /> Miembro
    </span>
  );
}

export default function G12LeadersTable({ leaders }) {
  if (!leaders || leaders.length === 0) {
    return (
      <div className="rounded-3xl border bg-white dark:bg-slate-900 p-8 shadow-sm border-slate-200 dark:border-slate-800 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay datos de líderes para mostrar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Efectividad por Líder
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Métricas sobre la red ministerial completa de cada líder
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Clasificación
              </th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                Red
              </th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                Inicial
              </th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                Final
              </th>
              <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                Efectividad
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {leaders.map((leader) => {
              const eff = leader.eff ?? leader.effectiveness ?? 0;
              const effPct = (eff * 100).toFixed(1);
              const effColor =
                eff >= 0.7
                  ? "text-emerald-600 dark:text-emerald-400"
                  : eff >= 0.4
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400";

              return (
                <tr
                  key={leader.leaderId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                    {getDisplayName(leader.leaderName || leader.memberName || leader.name) || "Desconocido"}
                  </td>
                  <td className="px-6 py-4">
                    <LeaderBadge classification={leader.classification} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-right">
                    {leader.networkSize ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-right">
                    {leader.networkInitial ?? leader.initial ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-right">
                    {leader.networkFinalCount ?? leader.final ?? leader.finalCount ?? 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-bold ${effColor}`}>
                      {effPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
