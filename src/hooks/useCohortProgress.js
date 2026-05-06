import { useState, useRef, useCallback } from "react";
import apiService from "../apiService";

const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (msg, data) => {
  if (DEBUG) console.debug(`[useCohortProgress] ${msg}`, data || "");
};

export default function useCohortProgress() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const generateReport = useCallback(async (filters) => {
    if (
      !filters?.startEnrollmentIds?.length ||
      !filters?.endEnrollmentIds?.length
    ) {
      log("Payload inválido: faltan enrollmentIds", {
        startLen: filters?.startEnrollmentIds?.length,
        endLen: filters?.endEnrollmentIds?.length,
      });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      log("Generando reporte con payload:", filters);
      const res = await apiService.generateCohortProgressReport(filters);
      if (mountedRef.current) {
        setData(res);
        log("Reporte recibido:", {
          initial: res?.initial,
          finalCount: res?.finalCount,
        });
      }
      return res;
    } catch (err) {
      log("Error generando reporte:", err.message);
      if (mountedRef.current) {
        setError(err);
        setData(null);
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, generateReport, reset };
}
