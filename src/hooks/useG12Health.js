import { useEffect, useState, useRef } from "react";
import apiService from "../apiService";

const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (msg, data) => {
  if (DEBUG) console.debug(`[useG12Health] ${msg}`, data || "");
};

const POLL_INTERVAL_MS = 60_000;

const SYNTHETIC_DOWN = {
  status: "DOWN",
  details: {
    error: "No se pudo verificar la configuración G12. Verifica la conexión con el servidor.",
    hint: "Asegúrate de que el backend esté corriendo y que el endpoint /actuator/health/g12 esté accesible.",
  },
};

export default function useG12Health() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const fetchHealth = async () => {
      try {
        const res = await apiService.getG12Health();
        if (mountedRef.current) {
          setData(res);
          setError(null);
          log("status:", res?.status);
        }
      } catch (err) {
        log("fetch failed:", err.message);
        if (mountedRef.current) {
          setError(err);
          setData(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchHealth();

    const interval = setInterval(fetchHealth, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const effectiveData = data || (error ? SYNTHETIC_DOWN : null);

  return { data: effectiveData, loading, error };
}
