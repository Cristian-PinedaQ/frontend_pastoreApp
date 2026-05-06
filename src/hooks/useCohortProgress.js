import { useEffect, useState, useRef } from "react";
import apiService from "../apiService";

const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (msg, data) => {
  if (DEBUG) console.debug(`[useCohortProgress] ${msg}`, data || "");
};

export default function useCohortProgress(requestPayload) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const payloadKey = JSON.stringify(requestPayload);

  useEffect(() => {
    mountedRef.current = true;

    if (!requestPayload) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        log("Generando reporte con payload:", requestPayload);
        const res = await apiService.generateCohortProgressReport(requestPayload);
        if (mountedRef.current) {
          setData(res);
          log("Reporte recibido:", { initial: res?.initial, finalCount: res?.finalCount });
        }
      } catch (err) {
        log("Error generando reporte:", err.message);
        if (mountedRef.current) {
          setError(err);
          setData(null);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchReport();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey]);

  return { data, loading, error };
}
