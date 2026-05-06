import { useEffect, useState, useRef } from "react";
import apiService from "../apiService";

const DEFAULT_LEVELS = [
  { id: 1,  code: "PREENCUENTRO",           levelOrder: 1 },
  { id: 2,  code: "ENCUENTRO",              levelOrder: 2 },
  { id: 3,  code: "POST_ENCUENTRO",         levelOrder: 3 },
  { id: 4,  code: "BAUTIZOS",               levelOrder: 4 },
  { id: 5,  code: "ESENCIA_1",              levelOrder: 5 },
  { id: 6,  code: "ESENCIA_2",              levelOrder: 6 },
  { id: 7,  code: "ESENCIA_3",              levelOrder: 7 },
  { id: 8,  code: "SANIDAD_INTEGRAL_RAICES", levelOrder: 8 },
  { id: 9,  code: "ESENCIA_4",              levelOrder: 9 },
  { id: 10, code: "ADIESTRAMIENTO",          levelOrder: 10 },
  { id: 11, code: "GRADUACION",             levelOrder: 11 },
];

function buildLevelMap(levelsArr) {
  const codeToOrder = new Map();
  const idToOrder = new Map();
  (levelsArr || []).forEach((l) => {
    if (l.code) codeToOrder.set(l.code.toUpperCase(), l.levelOrder ?? 0);
    if (l.id) idToOrder.set(l.id, l.levelOrder ?? 0);
  });
  return { codeToOrder, idToOrder };
}

const FALLBACK_MAPS = buildLevelMap(DEFAULT_LEVELS);

function resolveOrder(cohort, maps) {
  const { codeToOrder, idToOrder } = maps;

  if (cohort.level?.levelOrder != null) return cohort.level.levelOrder;
  if (cohort.level?.code) {
    const v = codeToOrder.get(cohort.level.code.toUpperCase());
    if (v != null) return v;
  }
  if (cohort.level?.id) {
    const v = idToOrder.get(cohort.level.id);
    if (v != null) return v;
  }
  if (cohort.levelEnrollment?.levelOrder != null) return cohort.levelEnrollment.levelOrder;
  if (cohort.levelEnrollment?.code) {
    const v = codeToOrder.get(cohort.levelEnrollment.code.toUpperCase());
    if (v != null) return v;
  }
  if (cohort.levelEnrollment?.id) {
    const v = idToOrder.get(cohort.levelEnrollment.id);
    if (v != null) return v;
  }
  if (typeof cohort.levelEnrollment === "string") {
    const v = codeToOrder.get(cohort.levelEnrollment.toUpperCase());
    if (v != null) return v;
  }
  if (cohort.levelCode) {
    const v = codeToOrder.get(cohort.levelCode.toUpperCase());
    if (v != null) return v;
  }

  return 0;
}

export default function useEnrollmentOptions() {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [rawCohorts, levels] = await Promise.all([
          apiService.getEnrollments().catch(() => []),
          apiService.getAllLevels().catch(() => []),
        ]);

        if (!mountedRef.current) return;

        const apiMaps = buildLevelMap(levels || []);
        const maps = {
          codeToOrder: new Map([...FALLBACK_MAPS.codeToOrder, ...apiMaps.codeToOrder]),
          idToOrder: new Map([...FALLBACK_MAPS.idToOrder, ...apiMaps.idToOrder]),
        };

        const sorted = (rawCohorts || [])
          .map((c) => ({ ...c, _levelOrder: resolveOrder(c, maps) }))
          .sort((a, b) => a._levelOrder - b._levelOrder);

        setCohorts(sorted);
      } catch (err) {
        if (mountedRef.current) setError(err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { cohorts, loading };
}
