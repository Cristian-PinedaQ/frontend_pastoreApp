import React, { useState, useEffect } from 'react';
import { geoApi } from '../../services/geoApi';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Componente panel para administrar las ejecuciones batch de geolocalización.
 * Permite ejecutar migración, continuar desde el último ID fallido (resume) y monitorear errores.
 */
export const BatchMigrationPanel = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [activeMigration, setActiveMigration] = useState(null);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await geoApi.getMigrationLogs();
      // Ordenar por ID descendente (más recientes primero)
      setLogs(data.sort((a, b) => b.id - a.id));
      
      // Buscar si hay alguna migración RUNNING
      const running = data.find(l => l.status === 'RUNNING');
      if (running) {
        setActiveMigration(running);
        setIsMigrating(true);
      } else {
        setActiveMigration(null);
        setIsMigrating(false);
      }
    } catch (err) {
      console.error('Error al obtener logs de migración:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Polling cada 5 segundos si hay una migración activa
  useEffect(() => {
    let intervalId;
    if (isMigrating) {
      intervalId = setInterval(async () => {
        try {
          const data = await geoApi.getMigrationLogs();
          setLogs(data.sort((a, b) => b.id - a.id));
          const running = data.find(l => l.status === 'RUNNING');
          if (!running) {
            setIsMigrating(false);
            setActiveMigration(null);
            clearInterval(intervalId);
          } else {
            setActiveMigration(running);
          }
        } catch (err) {
          console.error('Error en polling de migración:', err);
        }
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isMigrating]);

  const handleStartMigration = async (type) => {
    setIsMigrating(true);
    try {
      const result = await geoApi.batchMigrate(type);
      setActiveMigration(result);
      
      // Invalidar queries al iniciar la migración
      queryClient.invalidateQueries({ queryKey: ['geo-members'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells'] });
      queryClient.invalidateQueries({ queryKey: ['geo-stats'] });
      queryClient.invalidateQueries({ queryKey: ['geo-members-missing'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells-missing'] });
      queryClient.invalidateQueries({ queryKey: ['geo-members-failed'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells-failed'] });

      fetchLogs();
    } catch (err) {
      alert('Error al iniciar migración: ' + err.message);
      setIsMigrating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-150 p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto font-sans">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">Migración en Lote (Batch Geocoding)</h3>
          <p className="text-xs text-gray-500 mt-0.5">Geocodifica de manera masiva todos los registros sin coordenadas en el sistema.</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      {/* Controles de Ejecución */}
      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Nueva Migración</h4>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            disabled={isMigrating}
            onClick={() => handleStartMigration('MEMBER')}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md"
          >
            Migrar Miembros (Sin Ubicación)
          </button>
          <button
            disabled={isMigrating}
            onClick={() => handleStartMigration('CELL_GROUP')}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md"
          >
            Migrar Células (Sin Ubicación)
          </button>
        </div>
      </div>

      {/* Progreso Activo */}
      {isMigrating && activeMigration && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span>Procesando {activeMigration.entityType}...</span>
            </span>
            <span className="text-[10px] text-blue-500 font-semibold">ID Anterior: {activeMigration.lastProcessedId || 0}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs mt-3">
            <div className="bg-white p-2 rounded-xl border border-blue-50">
              <p className="text-[10px] font-bold text-gray-400">PROCESADOS</p>
              <p className="text-lg font-black text-gray-800">{activeMigration.totalProcessed}</p>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-50">
              <p className="text-[10px] font-bold text-gray-400">ÉXITO</p>
              <p className="text-lg font-black text-emerald-600">{activeMigration.totalSuccess}</p>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-50">
              <p className="text-[10px] font-bold text-gray-400">FALLIDO</p>
              <p className="text-lg font-black text-rose-600">{activeMigration.totalFailed}</p>
            </div>
            <div className="bg-white p-2 rounded-xl border border-blue-50">
              <p className="text-[10px] font-bold text-gray-400">OMITIDO</p>
              <p className="text-lg font-black text-amber-600">{activeMigration.totalSkipped}</p>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Auditoría */}
      <div>
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Historial de Auditoría</h4>
        
        {isLoadingLogs && logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">Cargando historial...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">No hay registros de migración previos.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const date = new Date(log.startedAt).toLocaleString();
              const isRunning = log.status === 'RUNNING';
              const isSuccess = log.status === 'SUCCESS';
              const isFailed = log.status === 'FAILED';

              return (
                <div key={log.id} className="border border-gray-150/70 rounded-xl p-3 text-xs">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-gray-800">{log.entityType} Log #{log.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isSuccess ? 'bg-emerald-100 text-emerald-800' :
                      isFailed ? 'bg-rose-100 text-rose-800' :
                      isRunning ? 'bg-blue-100 text-blue-800 animate-pulse' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-500 mt-1">
                    <p><strong>Fecha:</strong> {date}</p>
                    <p><strong>Total:</strong> {log.totalProcessed}</p>
                    <p><strong>Éxitos:</strong> <span className="text-emerald-600 font-semibold">{log.totalSuccess}</span></p>
                    <p><strong>Fallidos:</strong> <span className="text-rose-600 font-semibold">{log.totalFailed}</span></p>
                  </div>
                  {log.errorDetails && (
                    <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-2 text-[10px] text-gray-500 max-h-20 overflow-y-auto font-mono">
                      {log.errorDetails}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
