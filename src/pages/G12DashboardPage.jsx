import React, { useState, useCallback } from "react";
import { Network, BarChart3, Play, Loader2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import useG12Health from "../hooks/useG12Health";
import useCohortProgress from "../hooks/useCohortProgress";
import useEnrollmentOptions from "../hooks/useEnrollmentOptions";
import G12ConfigAlert from "../components/g12/G12ConfigAlert";
import G12HealthCard from "../components/g12/G12HealthCard";
import G12Filters from "../components/g12/G12Filters";
import G12MetricsCard from "../components/g12/G12MetricsCard";
import G12LevelsProgress from "../components/g12/G12LevelsProgress";
import G12LeadersTable from "../components/g12/G12LeadersTable";
import G12HierarchyTree from "../components/g12/G12HierarchyTree";
import G12RetentionFunnel from "../components/g12/G12RetentionFunnel";

const DEFAULT_FILTERS = {
  startLevel: 1,
  endLevel: 3,
  startEnrollmentIds: [],
  endEnrollmentIds: [],
  network: "MEN",
  groupByLeader: true,
  includeHierarchy: false,
};

export default function G12DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { data: healthData, loading: healthLoading } = useG12Health();
  const { data: reportData, loading: reportLoading, generateReport } = useCohortProgress();
  const { cohorts, loading: cohortsLoading } = useEnrollmentOptions();

  const isHealthDown = healthData?.status === "DOWN";

  const canGenerate =
    filters.startEnrollmentIds.length > 0 &&
    filters.endEnrollmentIds.length > 0;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    await generateReport(filters);
  }, [canGenerate, generateReport, filters]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={Network}
        title="G12"
        subtitle="Configuración y estado del sistema G12"
      />

      {/* Estado del sistema */}
      {healthLoading ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Verificando estado del sistema G12...
            </p>
          </div>
        </div>
      ) : isHealthDown ? (
        <>
          <G12ConfigAlert data={healthData} />
          <G12HealthCard data={healthData} />
        </>
      ) : (
        <G12HealthCard data={healthData} />
      )}

      {/* Layout de dos columnas: filtros + contenido */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Sidebar de filtros */}
        <div className="xl:col-span-4">
          <G12Filters
            filters={filters}
            onChange={setFilters}
            cohorts={cohorts}
            loading={cohortsLoading}
          />
        </div>

        {/* Contenido principal */}
        <div className="xl:col-span-8 space-y-6">
          {/* Encabezado de sección + botón generar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white shadow-lg flex items-center justify-center">
                <BarChart3 size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Progreso de Cohortes
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Métricas globales y efectividad por líder
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || reportLoading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                canGenerate && !reportLoading
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              {reportLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {reportLoading ? "Generando..." : "Generar Reporte"}
            </button>
          </div>

          {/* Mensaje de estado */}
          {!canGenerate && !reportData && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Selecciona al menos una cohorte inicial y una cohorte final, luego presiona "Generar Reporte".
              </p>
            </div>
          )}

          {/* Contenido del reporte */}
          {reportLoading ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Generando reporte...
                </p>
              </div>
            </div>
          ) : reportData ? (
            <>
              <G12MetricsCard data={reportData} />
              <G12RetentionFunnel
                levels={reportData?.levels}
                initial={reportData?.initial}
                finalCount={reportData?.finalCount}
              />
              <G12LevelsProgress
                levels={reportData?.levels}
                initial={reportData?.initial}
              />
              <G12LeadersTable leaders={reportData?.leaders} />

              {filters.includeHierarchy && (
                <G12HierarchyTree
                  hierarchy={reportData?.hierarchy}
                  leaders={reportData?.leaders}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
