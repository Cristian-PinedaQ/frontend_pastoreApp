import React, { useState, useMemo, useEffect } from 'react';
import { Marker } from 'react-leaflet';
import { useGeoMembers } from '../hooks/useGeoMembers';
import { useGeoCells } from '../hooks/useGeoCells';
import { geoApi } from '../services/geoApi';
import { useQueryClient } from '@tanstack/react-query';

import { InteractiveMap } from '../components/geo/InteractiveMap';
import { MarkerClusterLayer } from '../components/geo/MarkerClusterLayer';
import { MemberMarkerPopup } from '../components/geo/MemberMarkerPopup';
import { CellMarkerPopup } from '../components/geo/CellMarkerPopup';
import { GeoStats } from '../components/geo/GeoStats';
import { MapLegend } from '../components/geo/MapLegend';
import { MapFilters } from '../components/geo/MapFilters';
import { LocationEditor } from '../components/geo/LocationEditor';
import { BatchMigrationPanel } from '../components/geo/BatchMigrationPanel';

import { createCustomMarker } from '../utils/markerIcons';

export default function GeoMapPage() {
  const queryClient = useQueryClient();
  
  // Estados para filtros
  const [filters, setFilters] = useState({});
  const [debouncedFilters, setDebouncedFilters] = useState({});

  // Estado para panel de migración batch
  const [showBatchPanel, setShowBatchPanel] = useState(false);

  // Estados para edición manual de coordenadas
  const [editingEntity, setEditingEntity] = useState(null);
  const [editingType, setEditingType] = useState(null); // 'MEMBER' o 'CELL_GROUP'

  // Debounce de filtros (300ms) para optimizar carga
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters]);

  // Hooks de consulta TanStack Query
  const { data: members, isLoading: loadingMembers } = useGeoMembers(debouncedFilters);
  const { data: cells, isLoading: loadingCells } = useGeoCells(debouncedFilters);

  const handleEditLocation = (entity, type) => {
    setEditingEntity(entity);
    setEditingType(type);
  };

  const handleSaveLocation = async (id, locationData) => {
    try {
      if (editingType === 'MEMBER') {
        await geoApi.updateMemberLocation(id, locationData);
      } else {
        await geoApi.updateCellLocation(id, locationData);
      }
      
      // Invalidar queries para refrescar mapa de inmediato
      queryClient.invalidateQueries({ queryKey: ['geo-members'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells'] });
      queryClient.invalidateQueries({ queryKey: ['geo-stats'] });

      // Salir del modo edición
      setEditingEntity(null);
      setEditingType(null);
    } catch (err) {
      alert('Error al guardar ubicación: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntity(null);
    setEditingType(null);
  };

  // Memoizar marcadores de miembros para alto rendimiento de renderizado
  const memberMarkers = useMemo(() => {
    if (!members) return null;
    return members.map(m => (
      <Marker
        key={`member-${m.id}`}
        position={[m.latitude, m.longitude]}
        icon={createCustomMarker({ type: 'MEMBER', gender: m.gender, district: m.district })}
      >
        <MemberMarkerPopup
          member={m}
          onEditLocation={(entity) => handleEditLocation(entity, 'MEMBER')}
        />
      </Marker>
    ));
  }, [members]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoizar marcadores de células
  const cellMarkers = useMemo(() => {
    if (!cells) return null;
    return cells.map(c => (
      <Marker
        key={`cell-${c.id}`}
        position={[c.latitude, c.longitude]}
        icon={createCustomMarker({ type: 'CELL_GROUP' })}
      >
        <CellMarkerPopup
          cell={c}
          onEditLocation={(entity) => handleEditLocation(entity, 'CELL_GROUP')}
        />
      </Marker>
    ));
  }, [cells]); // eslint-disable-line react-hooks/exhaustive-deps

  const showLoader = loadingMembers || loadingCells;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full p-4 space-y-4 bg-gray-50/50">
      {/* Cabecera / Stats Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-150/40 gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 leading-none">Mapa Geográfico</h1>
          <p className="text-xs text-gray-500 mt-1">Planificación y georreferenciación de miembros y células.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowBatchPanel(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold py-2 px-3.5 rounded-xl border border-indigo-100 transition-colors"
          >
            ⚙️ Migración Lote
          </button>
          <GeoStats />
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 relative overflow-hidden">
        {/* Panel lateral de filtros (flotante / sidebar) */}
        <div className="z-10 md:relative">
          <MapFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Mapa Container */}
        <div className="flex-1 h-full rounded-2xl overflow-hidden relative shadow-md">
          {showLoader && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-[2000] flex items-center justify-center pointer-events-none">
              <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100 flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold text-gray-700">Cargando marcadores...</span>
              </div>
            </div>
          )}

          <InteractiveMap>
            {editingEntity && editingType ? (
              <LocationEditor
                entity={editingEntity}
                type={editingType}
                onSave={handleSaveLocation}
                onCancel={handleCancelEdit}
              />
            ) : (
              <MarkerClusterLayer>
                {memberMarkers}
                {cellMarkers}
              </MarkerClusterLayer>
            )}
          </InteractiveMap>

          {/* Leyenda flotante */}
          <div className="absolute bottom-4 right-4 z-[1000] hidden md:block">
            <MapLegend />
          </div>
        </div>
      </div>

      {/* Modal de Migración Batch */}
      {showBatchPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
          <BatchMigrationPanel onClose={() => setShowBatchPanel(false)} />
        </div>
      )}
    </div>
  );
}
