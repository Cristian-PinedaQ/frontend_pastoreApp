import React, { useMemo } from "react";
import { Filter, RotateCcw } from "lucide-react";

const NETWORKS = [
  { value: "MEN", label: "Hombres" },
  { value: "WOMEN", label: "Mujeres" },
];

const LEVELS = Array.from({ length: 11 }, (_, i) => i + 1);

export default function G12Filters({ filters, onChange, cohorts, loading }) {
  const handleChange = (field, value) => {
    const next = { ...filters, [field]: value };
    if (field === "startLevel") {
      next.startEnrollmentIds = [];
    }
    if (field === "endLevel") {
      next.endEnrollmentIds = [];
    }
    onChange(next);
  };

  const toggleCohort = (field, cohortId) => {
    const current = new Set(filters[field] || []);
    if (current.has(cohortId)) {
      current.delete(cohortId);
    } else {
      current.add(cohortId);
    }
    handleChange(field, Array.from(current));
  };

  const isSelected = (field, id) => (filters[field] || []).includes(id);

  const reset = () => {
    onChange({
      startLevel: 1,
      endLevel: 3,
      startEnrollmentIds: [],
      endEnrollmentIds: [],
      network: "MEN",
      groupByLeader: true,
      includeHierarchy: false,
    });
  };

  const getLevel = (c) => c._levelOrder ?? 0;

  const startCohorts = useMemo(
    () => cohorts.filter((c) => getLevel(c) === filters.startLevel),
    [cohorts, filters.startLevel]
  );

  const endCohorts = useMemo(
    () => cohorts.filter((c) => getLevel(c) === filters.endLevel),
    [cohorts, filters.endLevel]
  );

  return (
    <div className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm border-slate-200 dark:border-slate-800 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <Filter size={20} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Filtros</h3>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw size={14} />
          Restablecer
        </button>
      </div>

      {/* Red */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          Red
        </label>
        <div className="flex gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.value}
              onClick={() => handleChange("network", n.value)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                filters.network === n.value
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Niveles */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Nivel inicial
          </label>
          <select
            value={filters.startLevel}
            onChange={(e) => handleChange("startLevel", Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                Nivel {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Nivel final
          </label>
          <select
            value={filters.endLevel}
            onChange={(e) => handleChange("endLevel", Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                Nivel {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cohortes inicial */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          Cohortes inicial {filters.startEnrollmentIds.length > 0 && `(${filters.startEnrollmentIds.length})`}
          <span className="ml-1 font-normal normal-case text-[10px] text-slate-400">
            &mdash; nivel {filters.startLevel}
          </span>
        </label>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando cohortes...</p>
        ) : startCohorts.length === 0 ? (
          <p className="text-sm text-slate-400">Sin cohortes en este nivel</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
            {startCohorts.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCohort("startEnrollmentIds", c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected("startEnrollmentIds", c.id)
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {c.cohortName || c.name || `Cohorte ${c.id}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cohortes final */}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          Cohortes final {filters.endEnrollmentIds.length > 0 && `(${filters.endEnrollmentIds.length})`}
          <span className="ml-1 font-normal normal-case text-[10px] text-slate-400">
            &mdash; nivel {filters.endLevel}
          </span>
        </label>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando cohortes...</p>
        ) : endCohorts.length === 0 ? (
          <p className="text-sm text-slate-400">Sin cohortes en este nivel</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
            {endCohorts.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCohort("endEnrollmentIds", c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isSelected("endEnrollmentIds", c.id)
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {c.cohortName || c.name || `Cohorte ${c.id}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Jerarquía toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          &Aacute;rbol G12
        </label>
        <button
          onClick={() => handleChange("includeHierarchy", !filters.includeHierarchy)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            filters.includeHierarchy
              ? "bg-violet-600"
              : "bg-slate-300 dark:bg-slate-700"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              filters.includeHierarchy ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
