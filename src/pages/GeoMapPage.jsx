import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Marker } from 'react-leaflet';
import { useGeoMembers } from '../hooks/useGeoMembers';
import { useGeoCells } from '../hooks/useGeoCells';
import { geoApi } from '../services/geoApi';
import { useQueryClient } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import L from 'leaflet';

import { InteractiveMap } from '../components/geo/InteractiveMap';
import { MarkerClusterLayer } from '../components/geo/MarkerClusterLayer';
import { MemberMarkerPopup } from '../components/geo/MemberMarkerPopup';
import { CellMarkerPopup } from '../components/geo/CellMarkerPopup';
import { GeoStats } from '../components/geo/GeoStats';
import { MapLegend } from '../components/geo/MapLegend';
import { MapFilters } from '../components/geo/MapFilters';
import { GeoMapToolbar } from '../components/geo/GeoMapToolbar';
import { GeoEntityDetailCard } from '../components/geo/GeoEntityDetailCard';
import { LocationEditor } from '../components/geo/LocationEditor';
import { BatchMigrationPanel } from '../components/geo/BatchMigrationPanel';
import { GeoMissingPanel } from '../components/geo/GeoMissingPanel';

import { MemberDetailModal } from '../components/MemberDetailModal';
import ModalCellDetail from '../components/ModalCellDetail';

import { createCustomMarker } from '../utils/markerIcons';

export default function GeoMapPage() {
  const queryClient = useQueryClient();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Estados de vista y navegación
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'missing'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Estados para filtros
  const [filters, setFilters] = useState({
    entityTypes: ['MEMBER', 'LEADER', 'CELL_GROUP'],
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Entidad seleccionada (para la Ficha de Información / Drawer)
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'MEMBER' | 'LEADER' | 'CELL_GROUP'

  // Modales de Ficha Completa del Sistema
  const [fullDetailEntity, setFullDetailEntity] = useState(null);
  const [fullDetailType, setFullDetailType] = useState(null);

  // Estado para panel de migración batch y edición de ubicación
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [editingType, setEditingType] = useState(null);

  // Debounce de 300ms para filtros
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters]);

  // Tecla Escape para salir de Pantalla Completa o cerrar selección
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        if (selectedEntity) setSelectedEntity(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, selectedEntity]);

  // Carga de datos base desde el servidor (API existente 100% intacta)
  const { data: rawMembers = [], isLoading: loadingMembers } = useGeoMembers({});
  const { data: rawCells = [], isLoading: loadingCells } = useGeoCells({});

  // Identificación y enriquecimiento de Líderes en el Frontend
  const { members, cells, availableCells, availableLeaders } = useMemo(() => {
    // Extraer nombres de líderes conocidos de las células
    const leaderNamesSet = new Set();
    rawCells.forEach((c) => {
      if (c.mainLeaderName && c.mainLeaderName !== 'Sin Líder') leaderNamesSet.add(c.mainLeaderName);
      if (c.branchLeaderName && c.branchLeaderName !== 'Sin Líder') leaderNamesSet.add(c.branchLeaderName);
      if (c.groupLeaderName && c.groupLeaderName !== 'Sin Líder') leaderNamesSet.add(c.groupLeaderName);
    });

    const enrichedMembers = rawMembers.map((m) => ({
      ...m,
      isLeader: leaderNamesSet.has(m.name),
    }));

    const availableLeadersList = Array.from(leaderNamesSet).sort();

    return {
      members: enrichedMembers,
      cells: rawCells,
      availableCells: rawCells,
      availableLeaders: availableLeadersList,
    };
  }, [rawMembers, rawCells]);

  // Filtrado 100% en memoria en el Frontend
  const { filteredMembers, filteredCells } = useMemo(() => {
    const searchLower = (debouncedFilters.search || '').toLowerCase().trim();
    const entityTypes = debouncedFilters.entityTypes || ['MEMBER', 'LEADER', 'CELL_GROUP'];
    const districts = debouncedFilters.district || [];

    // Filtrar Miembros y Líderes
    let fMembers = members.filter((m) => {
      // 1. Tipo de entidad
      const matchesLeaderType = entityTypes.includes('LEADER') && m.isLeader;
      const matchesMemberType = entityTypes.includes('MEMBER') && !m.isLeader;
      if (!matchesLeaderType && !matchesMemberType) return false;

      // 2. Búsqueda por texto
      if (searchLower) {
        const nameMatch = m.name?.toLowerCase().includes(searchLower);
        const addrMatch = m.address?.toLowerCase().includes(searchLower);
        const leaderMatch = m.leaderName?.toLowerCase().includes(searchLower);
        if (!nameMatch && !addrMatch && !leaderMatch) return false;
      }

      // 3. Distrito
      if (districts.length > 0 && !districts.includes(m.district)) return false;

      // 4. Sexo / Género
      if (debouncedFilters.gender && m.gender !== debouncedFilters.gender) return false;

      // 5. Nivel Formativo
      if (debouncedFilters.level && m.level !== debouncedFilters.level) return false;

      // 6. Líder Directo específico
      if (debouncedFilters.leaderName && m.leaderName !== debouncedFilters.leaderName) return false;

      return true;
    });

    // Filtrar Altares / Células
    let fCells = cells.filter((c) => {
      if (!entityTypes.includes('CELL_GROUP')) return false;

      if (searchLower) {
        const nameMatch = c.name?.toLowerCase().includes(searchLower);
        const addrMatch = c.meetingAddress?.toLowerCase().includes(searchLower);
        const leaderMatch = c.mainLeaderName?.toLowerCase().includes(searchLower);
        if (!nameMatch && !addrMatch && !leaderMatch) return false;
      }

      if (districts.length > 0 && !districts.includes(c.district)) return false;
      if (debouncedFilters.cellId && String(c.id) !== String(debouncedFilters.cellId)) return false;
      if (debouncedFilters.leaderName && c.mainLeaderName !== debouncedFilters.leaderName) return false;

      return true;
    });

    return { filteredMembers: fMembers, filteredCells: fCells };
  }, [members, cells, debouncedFilters]);

  // Selección de Entidad y Apertura de Ficha Detallada
  const handleSelectEntity = useCallback((entity, type) => {
    setSelectedEntity(entity);
    setSelectedType(type);
  }, []);

  const handleOpenFullDetail = useCallback((entity, type) => {
    setFullDetailEntity(entity);
    setFullDetailType(type);
  }, []);

  const handleEditLocation = useCallback((entity, type) => {
    setEditingEntity(entity);
    setEditingType(type);
  }, []);

  const handleSaveLocation = async (id, locationData) => {
    try {
      if (editingType === 'MEMBER' || editingType === 'LEADER') {
        await geoApi.updateMemberLocation(id, locationData);
      } else {
        await geoApi.updateCellLocation(id, locationData);
      }

      queryClient.invalidateQueries({ queryKey: ['geo-members'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells'] });
      queryClient.invalidateQueries({ queryKey: ['geo-stats'] });

      setEditingEntity(null);
      setEditingType(null);
    } catch (err) {
      alert('Error al guardar ubicación: ' + err.message);
    }
  };

  // Controles del mapa (Zoom, Encuadre, Fullscreen)
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleResetView = useCallback(() => {
    if (!mapRef.current) return;
    const allCoords = [
      ...filteredMembers.map((m) => [m.latitude, m.longitude]),
      ...filteredCells.map((c) => [c.latitude, c.longitude]),
    ];
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      mapRef.current.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
    }
  }, [filteredMembers, filteredCells]);

  // Captura y Descarga del Mapa como Imagen PNG
  const handleCaptureMap = async () => {
    if (!mapContainerRef.current) return;
    setIsCapturing(true);
    try {
      // Breve pausa para asegurar renderizado de baldosas
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Alta resolución
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      link.download = `mapa_pastoral_${today}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('No se pudo generar la imagen del mapa: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Memoizar Marcadores de Miembros
  const memberMarkers = useMemo(() => {
    return filteredMembers.map((m) => (
      <Marker
        key={`member-${m.id}`}
        position={[m.latitude, m.longitude]}
        icon={createCustomMarker({
          type: m.isLeader ? 'LEADER' : 'MEMBER',
          isLeader: m.isLeader,
          gender: m.gender,
          district: m.district,
          isSelected: selectedEntity?.id === m.id && selectedType !== 'CELL_GROUP',
        })}
        eventHandlers={{
          click: () => handleSelectEntity(m, m.isLeader ? 'LEADER' : 'MEMBER'),
        }}
      />
    ));
  }, [filteredMembers, selectedEntity, selectedType, handleSelectEntity]);

  // Memoizar Marcadores de Células / Altares
  const cellMarkers = useMemo(() => {
    return filteredCells.map((c) => (
      <Marker
        key={`cell-${c.id}`}
        position={[c.latitude, c.longitude]}
        icon={createCustomMarker({
          type: 'CELL_GROUP',
          isSelected: selectedEntity?.id === c.id && selectedType === 'CELL_GROUP',
        })}
        eventHandlers={{
          click: () => handleSelectEntity(c, 'CELL_GROUP'),
        }}
      />
    ));
  }, [filteredCells, selectedEntity, selectedType, handleSelectEntity]);

  const showLoader = loadingMembers || loadingCells;
  const visibleTotal = filteredMembers.length + filteredCells.length;

  const renderMapContent = () => (
    <>
      {/* Panel Lateral Flotante de Filtros */}
      <div className="z-10 md:relative shrink-0">
        <MapFilters
          filters={filters}
          onChange={setFilters}
          availableCells={availableCells}
          availableLeaders={availableLeaders}
          stats={{ visibleTotal }}
        />
      </div>

      {/* Contenedor Principal del Mapa */}
      <div
        ref={mapContainerRef}
        className="flex-1 h-full rounded-3xl overflow-hidden relative shadow-lg border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-all duration-300"
      >
        {showLoader && (
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[2px] z-[2000] flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center space-x-2.5">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Cargando marcadores...</span>
            </div>
          </div>
        )}

        {/* Botonera Flotante de Herramientas */}
        <GeoMapToolbar
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          onCaptureMap={handleCaptureMap}
          isCapturing={isCapturing}
        />

        {/* Mapa Interactivo */}
        <InteractiveMap mapRef={mapRef} isFullscreen={isFullscreen}>
          {editingEntity && editingType ? (
            <LocationEditor
              entity={editingEntity}
              type={editingType}
              onSave={handleSaveLocation}
              onCancel={() => {
                setEditingEntity(null);
                setEditingType(null);
              }}
            />
          ) : (
            <MarkerClusterLayer>
              {memberMarkers}
              {cellMarkers}
            </MarkerClusterLayer>
          )}
        </InteractiveMap>

        {/* Ficha Detallada Flotante al Seleccionar Entidad */}
        {selectedEntity && selectedType && !editingEntity && (
          <div className="absolute bottom-6 left-6 z-[1000] max-w-sm w-full">
            <GeoEntityDetailCard
              entity={selectedEntity}
              type={selectedType}
              onClose={() => setSelectedEntity(null)}
              onOpenFullDetail={handleOpenFullDetail}
              onEditLocation={handleEditLocation}
              cells={cells}
              mapRef={mapRef}
            />
          </div>
        )}

        {/* Leyenda flotante en la esquina inferior derecha */}
        <div className="absolute bottom-6 right-6 z-[1000] hidden md:block">
          <MapLegend />
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`font-sans transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] bg-slate-900 p-4'
          : 'flex flex-col h-[calc(100vh-64px)] w-full p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50'
      }`}
    >
      {/* Cabecera Principal */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 gap-4 transition-colors">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
              {activeTab === 'map' ? 'Geolocalización Pastoral' : 'Registros Pendientes'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {activeTab === 'map'
                ? 'Visualización de miembros, líderes y altares con georreferenciación inteligente.'
                : 'Gestión de direcciones pendientes o con geocodificación fallida.'}
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'map'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                🗺️ Mapa
              </button>
              <button
                onClick={() => setActiveTab('missing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'missing'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                ⏳ Pendientes
              </button>
            </div>

            <button
              onClick={() => setShowBatchPanel(true)}
              className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold py-2 px-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 transition-colors"
            >
              ⚙️ Migración Lote
            </button>
            {activeTab === 'map' && <GeoStats />}
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 relative overflow-hidden h-full">
        {activeTab === 'map' ? (
          renderMapContent()
        ) : (
          <GeoMissingPanel
            onRetryComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['geo-stats'] });
              queryClient.invalidateQueries({ queryKey: ['geo-members'] });
              queryClient.invalidateQueries({ queryKey: ['geo-cells'] });
            }}
          />
        )}
      </div>

      {/* Modal de Migración Batch */}
      {showBatchPanel && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[3000] flex items-center justify-center p-4">
          <BatchMigrationPanel onClose={() => setShowBatchPanel(false)} />
        </div>
      )}

      {/* Modales Existentes de Ficha Completa del Sistema */}
      {fullDetailEntity && (fullDetailType === 'MEMBER' || fullDetailType === 'LEADER') && (
        <MemberDetailModal
          member={fullDetailEntity}
          onClose={() => setFullDetailEntity(null)}
        />
      )}

      {fullDetailEntity && fullDetailType === 'CELL_GROUP' && (
        <ModalCellDetail
          isOpen={!!fullDetailEntity}
          cell={fullDetailEntity}
          onClose={() => setFullDetailEntity(null)}
        />
      )}
    </div>
  );
}
