import React, { useState, useMemo, useCallback } from 'react';
import { useGeoMembersMissing, useGeoMembersFailed } from '../../hooks/useGeoMembersMissing';
import { useGeoCellsMissing, useGeoCellsFailed } from '../../hooks/useGeoCellsMissing';
import { geoApi } from '../../services/geoApi';
import { useQueryClient } from '@tanstack/react-query';
import { CityAutocomplete } from './CityAutocomplete';

const TABS = [
  { key: 'members-missing', label: 'Miembros sin geo', entityType: 'member', status: 'missing' },
  { key: 'members-failed', label: 'Miembros fallidos', entityType: 'member', status: 'failed' },
  { key: 'cells-missing', label: 'Células sin geo', entityType: 'cell', status: 'missing' },
  { key: 'cells-failed', label: 'Células fallidas', entityType: 'cell', status: 'failed' },
];

const STATUS_COLORS = {
  SIN_GEO: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-800',
  RETRY_PENDING: 'bg-orange-100 text-orange-800',
  FAILED: 'bg-red-100 text-red-800',
  SUCCESS: 'bg-green-100 text-green-800',
  MANUAL: 'bg-blue-100 text-blue-800',
};

export function GeoMissingPanel({ onClose, onRetryComplete, onEditLocation }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('members-missing');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState({ members: [], cells: [] });
  const [editingRow, setEditingRow] = useState(null);
  const [editingField, setEditingField] = useState(null); // 'address' | 'city'
  const [editValue, setEditValue] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState(null);

  const {
    data: membersMissing,
    isLoading: loadingMembersMissing,
    refetch: refetchMembersMissing,
  } = useGeoMembersMissing();

  const {
    data: membersFailed,
    isLoading: loadingMembersFailed,
    refetch: refetchMembersFailed,
  } = useGeoMembersFailed();

  const {
    data: cellsMissing,
    isLoading: loadingCellsMissing,
    refetch: refetchCellsMissing,
  } = useGeoCellsMissing();

  const {
    data: cellsFailed,
    isLoading: loadingCellsFailed,
    refetch: refetchCellsFailed,
  } = useGeoCellsFailed();

  const isLoading = useMemo(() => {
    switch (activeTab) {
      case 'members-missing': return loadingMembersMissing;
      case 'members-failed': return loadingMembersFailed;
      case 'cells-missing': return loadingCellsMissing;
      case 'cells-failed': return loadingCellsFailed;
      default: return false;
    }
  }, [activeTab, loadingMembersMissing, loadingMembersFailed, loadingCellsMissing, loadingCellsFailed]);

  const getData = useCallback(() => {
    switch (activeTab) {
      case 'members-missing': return membersMissing || [];
      case 'members-failed': return membersFailed || [];
      case 'cells-missing': return cellsMissing || [];
      case 'cells-failed': return cellsFailed || [];
      default: return [];
    }
  }, [activeTab, membersMissing, membersFailed, cellsMissing, cellsFailed]);

  const isMemberTab = activeTab.startsWith('members');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return getData();
    const query = searchQuery.toLowerCase();
    return getData().filter(item => 
      item.name?.toLowerCase().includes(query) ||
      item.address?.toLowerCase().includes(query) ||
      item.meetingAddress?.toLowerCase().includes(query) ||
      item.district?.toLowerCase().includes(query) ||
      item.city?.toLowerCase().includes(query)
    );
  }, [getData, searchQuery]);

  const handleSelectionChange = (id, checked) => {
    setSelectedIds(prev => {
      const key = isMemberTab ? 'members' : 'cells';
      const current = prev[key] || [];
      if (checked) {
        return { ...prev, [key]: [...current, id] };
      } else {
        return { ...prev, [key]: current.filter(x => x !== id) };
      }
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(prev => ({
        ...prev,
        [isMemberTab ? 'members' : 'cells']: filteredData.map(d => d.id)
      }));
    } else {
      setSelectedIds(prev => ({ ...prev, [isMemberTab ? 'members' : 'cells']: [] }));
    }
  };

  const handleEditClick = (row, field = 'address') => {
    setEditingRow(row.id);
    setEditingField(field);
    setEditValue(field === 'city' ? (row.city || '') : (row.address || row.meetingAddress || ''));
  };

  const handleSaveEdit = async (row) => {
    try {
      if (isMemberTab) {
        await geoApi.updateMemberAddress(row.id, { 
          address: editingField === 'address' ? editValue : row.address,
          city: editingField === 'city' ? editValue : row.city
        });
      } else {
        await geoApi.updateCellAddress(row.id, { 
          address: editingField === 'address' ? editValue : row.meetingAddress,
          city: editingField === 'city' ? editValue : row.city
        });
      }
      setEditingRow(null);
      setEditingField(null);
      setEditValue('');
      
      // Invalidar todas las queries del mapa y pendientes
      queryClient.invalidateQueries({ queryKey: ['geo-members'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells'] });
      queryClient.invalidateQueries({ queryKey: ['geo-stats'] });
      queryClient.invalidateQueries({ queryKey: ['geo-members-missing'] });
      queryClient.invalidateQueries({ queryKey: ['geo-members-failed'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells-missing'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells-failed'] });
    } catch (err) {
      alert('Error al guardar dirección: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleBatchRetry = async () => {
    const ids = isMemberTab ? selectedIds.members : selectedIds.cells;
    if (!ids.length) return;

    setIsRetrying(true);
    try {
      const result = await geoApi.batchRetry(
        isMemberTab ? ids : [],
        !isMemberTab ? ids : []
      );
      setRetryResult(result);
      
      // Invalidar queries para refrescar listas
      queryClient.invalidateQueries({ queryKey: ['geo-members-missing'] });
      queryClient.invalidateQueries({ queryKey: ['geo-members-failed'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells-missing'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells-failed'] });
      queryClient.invalidateQueries({ queryKey: ['geo-stats'] });
      queryClient.invalidateQueries({ queryKey: ['geo-members'] });
      queryClient.invalidateQueries({ queryKey: ['geo-cells'] });
      
      if (onRetryComplete) onRetryComplete(result);

      setSelectedIds({ members: [], cells: [] });
    } catch (err) {
      alert('Error en re-geocodificación: ' + err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleExportCSV = () => {
    const data = filteredData;
    if (!data.length) return;

    const headers = isMemberTab 
      ? ['ID', 'Nombre', 'Dirección', 'Ciudad', 'Distrito', 'Género', 'Líder Directo', 'Estado Geo', 'Tiene Dirección']
      : ['ID', 'Nombre', 'Dirección Reunión', 'Ciudad', 'Distrito', 'Líder Principal', 'Estado Célula', 'Estado Geo', 'Tiene Dirección'];

    const rows = data.map(item => {
      if (isMemberTab) {
        return [
          item.id,
          item.name,
          item.address || '',
          item.city || '',
          item.district || '',
          item.gender || '',
          item.directLeaderName || '',
          item.currentGeoStatus || '',
          item.hasAddress ? 'Sí' : 'No'
        ];
      } else {
        return [
          item.id,
          item.name,
          item.meetingAddress || '',
          item.city || '',
          item.district || '',
          item.mainLeaderName || '',
          item.cellStatus || '',
          item.currentGeoStatus || '',
          item.hasAddress ? 'Sí' : 'No'
        ];
      }
    });

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `geo-${activeTab}-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const refetchCurrent = () => {
    switch (activeTab) {
      case 'members-missing': return refetchMembersMissing();
      case 'members-failed': return refetchMembersFailed();
      case 'cells-missing': return refetchCellsMissing();
      case 'cells-failed': return refetchCellsFailed();
      default: return;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Geolocalización Pendiente</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {filteredData.length} {isMemberTab ? 'miembro' : 'célula'}{filteredData.length !== 1 ? 's' : ''} 
            {activeTab.includes('missing') ? 'sin coordenadas' : 'con error de geocodificación'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, dirección, distrito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 sm:w-80 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-gray-50"
            />
          </div>
          <button
            onClick={handleExportCSV}
            disabled={!filteredData.length}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5"
          >
            📥 Exportar CSV
          </button>
          <button
            onClick={refetchCurrent}
            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <nav className="flex overflow-x-auto" aria-label="Tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-4xl mb-2">📍</div>
            <p className="font-medium">No hay {isMemberTab ? 'miembros' : 'células'} en esta categoría</p>
            <p className="text-sm mt-1">¡Excelente! Todo geolocalizado correctamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={filteredData.length > 0 && filteredData.every(d => (isMemberTab ? selectedIds.members : selectedIds.cells).includes(d.id))}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">Dirección</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Ciudad / Distrito</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">{isMemberTab ? 'Género / Líder' : 'Líder / Estado'}</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">Estado Geo</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider">Dir.</th>
                  <th className="px-3 py-2 text-right w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((row, index) => {
                  const isSelected = isMemberTab 
                    ? selectedIds.members.includes(row.id)
                    : selectedIds.cells.includes(row.id);
                  const isEditing = editingRow === row.id;

                  return (
                    <tr key={row.id} className={isSelected ? 'bg-indigo-50/30' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectionChange(row.id, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </td>
                      
                      <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                      
                      <td className="px-3 py-2 text-gray-600 max-w-xs truncate">
                        {isEditing && editingField === 'address' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleSaveEdit(row)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(row)}
                            autoFocus
                            className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        ) : (
                          <span>{isMemberTab ? row.address : row.meetingAddress || 'Sin dirección'}</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-gray-500 hidden md:table-cell">
                        {isEditing && editingField === 'city' && !isMemberTab ? (
                          <CityAutocomplete
                            value={editValue}
                            onChange={setEditValue}
                            placeholder="Buscar ciudad..."
                            className="w-full"
                          />
                        ) : (
                          isMemberTab 
                            ? `${row.city || ''}${row.city && row.district ? ', ' : ''}${row.district || ''}`
                            : `${row.city || row.district || ''}`
                        )}
                      </td>

                      <td className="px-3 py-2 text-gray-500 hidden lg:table-cell">
                        {isMemberTab 
                          ? `${row.gender || ''} / ${row.directLeaderName || ''}`
                          : `${row.mainLeaderName || ''} / ${row.cellStatus || ''}`}
                      </td>

                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.currentGeoStatus] || 'bg-gray-100 text-gray-700'}`}>
                          {row.currentGeoStatus}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <span className={row.hasAddress ? 'text-green-600' : 'text-red-600'}>
                          {row.hasAddress ? '✓' : '✗'}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(row)}
                                className="px-2 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              {!isMemberTab && (
                                <>
                                  <button
                                    onClick={() => handleEditClick(row, 'address')}
                                    disabled={!row.hasAddress}
                                    className="px-2 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Editar dirección"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleEditClick(row, 'city')}
                                    disabled={!row.hasAddress}
                                    className="px-2 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Editar ciudad"
                                  >
                                    🏙️
                                  </button>
                                </>
                              )}
                              {isMemberTab && (
                                <button
                                  onClick={() => handleEditClick(row, 'address')}
                                  disabled={!row.hasAddress}
                                  className="px-2 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Editar dirección"
                                >
                                  ✏️
                                </button>
                              )}
                              {onEditLocation && (
                                <button
                                  onClick={() => onEditLocation(row, isMemberTab ? 'MEMBER' : 'CELL_GROUP')}
                                  className="px-2 py-1 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                                  title="Editar ubicación manual"
                                >
                                  📍
                                </button>
                              )}
                              <button
                                onClick={handleBatchRetry}
                                disabled={isRetrying}
                                className="px-2 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors disabled:opacity-50"
                                title={isMemberTab ? 'Re-geocodificar miembro' : 'Re-geocodificar célula'}
                              >
                                🔍
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch Actions Footer */}
      {((isMemberTab && selectedIds.members.length > 0) || (!isMemberTab && selectedIds.cells.length > 0)) && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            {isMemberTab ? selectedIds.members.length : selectedIds.cells.length} 
            {isMemberTab ? 'miembro' : 'célula'}{(isMemberTab ? selectedIds.members.length : selectedIds.cells.length) !== 1 ? 's' : ''} seleccionado{(isMemberTab ? selectedIds.members.length : selectedIds.cells.length) !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBatchRetry}
              disabled={isRetrying}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
            >
              {isRetrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : (
                '🔍 Re-geocodificar selección'
              )}
            </button>
            <button
              onClick={() => setSelectedIds({ members: [], cells: [] })}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
            >
              Deseleccionar
            </button>
          </div>
        </div>
      )}

      {/* Retry Result Toast */}
      {retryResult && (
        <div className="p-4 border-t border-gray-100 bg-green-50/50 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-800 text-sm">
              <span>✅</span>
              <span>Re-geocodificación completada: {retryResult.success} exitosos, {retryResult.failed} fallidos</span>
            </div>
            <button
              onClick={() => setRetryResult(null)}
              className="text-green-600 hover:text-green-800 font-bold text-lg leading-none"
            >
              ✕
            </button>
          </div>
          {retryResult.errors?.length && (
            <details className="mt-2 text-xs text-gray-600">
              <summary className="cursor-pointer font-medium">Ver errores ({retryResult.errors.length})</summary>
              <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                {retryResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {retryResult.errors.length > 10 && <li>... y {retryResult.errors.length - 10} más</li>}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

GeoMissingPanel.displayName = 'GeoMissingPanel';