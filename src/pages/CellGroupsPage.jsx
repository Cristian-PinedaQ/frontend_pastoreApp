// ============================================
// CellGroupsPage.jsx — Gestión de Células (refactorizado)
// • Filas clickeables → ModalCellDetail (info + miembros + agregar)
// • PDF de listado con filtros → cellGroupsPdfGenerator
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import { generateCellGroupsPDF } from '../services/cellGroupsPdfGenerator';
import { logSecurityEvent, logUserAction } from '../utils/securityLogger';
import nameHelper from '../services/nameHelper';
import ModalCreateCell from '../components/ModalCreateCell';
import ModalCellStatistics from '../components/ModalCellStatistics';
import ModalCellDetail from '../components/ModalCellDetail';
import '../css/CellGroupspage.css';

const { getDisplayName } = nameHelper;

const DEBUG = process.env.REACT_APP_DEBUG === 'true';
const log      = (msg, d) => DEBUG && console.log(`[CellGroupsPage] ${msg}`, d || '');
const logError = (msg, e) => console.error(`[CellGroupsPage] ${msg}`, e);

const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
};

const validateSearchText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.length > 100 ? text.substring(0, 100) : text.trim();
};

// ── Constantes ────────────────────────────────────────────────────────────────

const CELL_STATUS_MAP = {
  ACTIVE: {
    label: 'Activa', color: '#10b981', bgColor: '#d1fae5',
    darkColor: '#34d399', darkBg: '#064e3b', icon: '✅',
    description: 'Célula activa con todos los líderes completos',
  },
  INCOMPLETE_LEADERSHIP: {
    label: 'Liderazgo Incompleto', color: '#f59e0b', bgColor: '#fed7aa',
    darkColor: '#fbbf24', darkBg: '#78350f', icon: '⚠️',
    description: 'Falta algún líder o alguno no está activo',
  },
  INACTIVE: {
    label: 'Inactiva', color: '#6b7280', bgColor: '#e5e7eb',
    darkColor: '#9ca3af', darkBg: '#1f2937', icon: '⏹️',
    description: 'Célula desactivada manualmente',
  },
  SUSPENDED: {
    label: 'Suspendida', color: '#ef4444', bgColor: '#fee2e2',
    darkColor: '#f87171', darkBg: '#7f1d1d', icon: '⏸️',
    description: 'Célula suspendida temporalmente',
  },
};

const DISTRICT_MAP = {
  PASTORES: { label: 'Pastores',    color: '#8b5cf6' },
  D1:       { label: 'Distrito 1',  color: '#3b82f6' },
  D2:       { label: 'Distrito 2',  color: '#10b981' },
  D3:       { label: 'Distrito 3',  color: '#f59e0b' },
};

// ── Componente ────────────────────────────────────────────────────────────────

const CellGroupsPage = () => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [allCells, setAllCells]         = useState([]);
  const [filteredCells, setFilteredCells] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filtros
  const [selectedStatus,    setSelectedStatus]    = useState('ALL');
  const [selectedDistrict,  setSelectedDistrict]  = useState('ALL');
  const [searchText,        setSearchText]         = useState('');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

  // Modales
  const [showCreateModal,     setShowCreateModal]     = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [statisticsData,      setStatisticsData]      = useState(null);
  const [showVerifyAllModal,  setShowVerifyAllModal]  = useState(false);
  const [verificationResult,  setVerificationResult]  = useState(null);

  // Modal de detalle de célula (nuevo)
  const [selectedCell, setSelectedCell] = useState(null);

  // Filtros info
  const [hasFiltersApplied, setHasFiltersApplied] = useState(false);
  const [activeFiltersInfo,  setActiveFiltersInfo]  = useState({});

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ── Dark mode detection ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedMode   = localStorage.getItem('darkMode');
      const htmlDark    = document.documentElement.classList.contains('dark-mode') ||
                          document.documentElement.classList.contains('dark');
      setIsDarkMode(savedMode === 'true' || htmlDark || prefersDark);

      const observer = new MutationObserver(() => {
        setIsDarkMode(
          document.documentElement.classList.contains('dark-mode') ||
          document.documentElement.classList.contains('dark')
        );
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => { if (!localStorage.getItem('darkMode')) setIsDarkMode(e.matches); };
      mq.addEventListener('change', handler);

      return () => { observer.disconnect(); mq.removeEventListener('change', handler); };
    } catch (e) { logError('Error detectando dark mode:', e); }
  }, []);

  const theme = {
    bg:          isDarkMode ? '#0f172a' : '#f9fafb',
    bgSecondary: isDarkMode ? '#1e293b' : '#ffffff',
    text:        isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border:      isDarkMode ? '#334155' : '#e5e7eb',
    errorBg:     isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorBorder: '#ef4444',
    errorText:   isDarkMode ? '#fecaca' : '#991b1b',
    successBg:   isDarkMode ? '#14532d' : '#d1fae5',
    successBorder: '#10b981',
    successText: isDarkMode ? '#a7f3d0' : '#065f46',
  };

  // ── Cargar células ─────────────────────────────────────────────────────────
  const loadCells = useCallback(async () => {
    setLoading(true); setError(''); setSuccessMessage('');
    try {
      log('Cargando células');
      const cells = await apiService.getCells();
      if (!cells || cells.length === 0) { setAllCells([]); return; }

      const processed = cells.map(cell => ({
        ...cell,
        name:            escapeHtml(cell.name || 'Sin nombre'),
        mainLeaderName:  getDisplayName(escapeHtml(cell.mainLeaderName  || 'Sin asignar')),
        groupLeaderName: getDisplayName(escapeHtml(cell.groupLeaderName || 'Sin asignar')),
        hostName:        getDisplayName(escapeHtml(cell.hostName        || 'Sin asignar')),
        timoteoName:     getDisplayName(escapeHtml(cell.timoteoName     || 'Sin asignar')),
        statusIcon:      CELL_STATUS_MAP[cell.status]?.icon  || '•',
        statusLabel:     CELL_STATUS_MAP[cell.status]?.label || cell.status,
        statusColor:     isDarkMode
          ? CELL_STATUS_MAP[cell.status]?.darkColor
          : CELL_STATUS_MAP[cell.status]?.color,
        districtLabel:   cell.district ? DISTRICT_MAP[cell.district]?.label || cell.district : 'Sin distrito',
        districtColor:   cell.district ? DISTRICT_MAP[cell.district]?.color : '#6b7280',
        meetingTimeFormatted: cell.meetingTime
          ? new Date(`2000-01-01T${cell.meetingTime}`).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
          : 'No definido',
        occupancyPercentage: cell.maxCapacity
          ? Math.round((cell.currentMemberCount || 0) / cell.maxCapacity * 100)
          : 0,
        creationDateFormatted: cell.creationDate
          ? new Date(cell.creationDate).toLocaleDateString('es-CO')
          : '-',
      }));

      setAllCells(processed);
      logUserAction('load_cells', { cellCount: processed.length, timestamp: new Date().toISOString() });

    } catch (err) {
      logError('Error cargando células:', err);
      setError('Error al cargar la lista de células');
      logSecurityEvent('cells_load_error', { errorType: 'api_error', timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, [isDarkMode]);

  // ── Aplicar filtros ────────────────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    try {
      let filtered = [...allCells];
      if (selectedStatus !== 'ALL')   filtered = filtered.filter(c => c.status === selectedStatus);
      if (selectedDistrict !== 'ALL') filtered = filtered.filter(c => c.district === selectedDistrict);
      if (showIncompleteOnly)         filtered = filtered.filter(c => !c.hasAllLeadersActive);
      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        filtered = filtered.filter(c =>
          c.name?.toLowerCase().includes(q) ||
          c.mainLeaderName?.toLowerCase().includes(q) ||
          c.groupLeaderName?.toLowerCase().includes(q) ||
          c.hostName?.toLowerCase().includes(q) ||
          c.timoteoName?.toLowerCase().includes(q) ||
          c.meetingAddress?.toLowerCase().includes(q)
        );
      }
      filtered.sort((a, b) => {
        const order = { ACTIVE: 1, INCOMPLETE_LEADERSHIP: 2, SUSPENDED: 3, INACTIVE: 4 };
        const diff  = (order[a.status] || 99) - (order[b.status] || 99);
        return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
      });
      setFilteredCells(filtered);
    } catch (e) {
      logError('Error aplicando filtros:', e);
      setFilteredCells(allCells);
    }
  }, [allCells, selectedStatus, selectedDistrict, showIncompleteOnly, searchText]);

  useEffect(() => { loadCells(); }, [loadCells]);
  useEffect(() => { applyFilters(); }, [applyFilters]);

  // ── Detectar filtros activos ────────────────────────────────────────────────
  useEffect(() => {
    const active = selectedStatus !== 'ALL' || selectedDistrict !== 'ALL' ||
                   showIncompleteOnly || searchText.trim() !== '';
    setHasFiltersApplied(active);
    if (active) {
      const info = {};
      if (selectedStatus !== 'ALL')  info.status    = CELL_STATUS_MAP[selectedStatus]?.label || selectedStatus;
      if (selectedDistrict !== 'ALL') info.district  = DISTRICT_MAP[selectedDistrict]?.label  || selectedDistrict;
      if (showIncompleteOnly)         info.incomplete = 'Solo liderazgo incompleto';
      if (searchText.trim())          info.search     = validateSearchText(searchText);
      setActiveFiltersInfo(info);
    } else {
      setActiveFiltersInfo({});
    }
  }, [selectedStatus, selectedDistrict, showIncompleteOnly, searchText]);

  // ── Verificar todas ────────────────────────────────────────────────────────
  const handleVerifyAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await apiService.verifyAllCells();
      setVerificationResult(result);
      setShowVerifyAllModal(true);
      await loadCells();
      logUserAction('verify_all_cells', { totalVerified: result.totalVerified, timestamp: new Date().toISOString() });
    } catch (err) {
      logError('Error en verificación masiva:', err);
      setError('Error al verificar células');
    } finally {
      setLoading(false);
    }
  }, [loadCells]);

  // ── Estadísticas ───────────────────────────────────────────────────────────
  const handleShowStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await apiService.getCellStatistics();
      setStatisticsData({
        ...stats,
        hasFilters: hasFiltersApplied,
        filtersInfo: activeFiltersInfo,
        currentViewCount: filteredCells.length,
        totalCount: allCells.length,
      });
      setShowStatisticsModal(true);
      logUserAction('view_cell_statistics', { timestamp: new Date().toISOString() });
    } catch (err) {
      logError('Error cargando estadísticas:', err);
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, [hasFiltersApplied, activeFiltersInfo, filteredCells.length, allCells.length]);

  // ── Exportar PDF del listado ────────────────────────────────────────────────
  const handleExportPDF = useCallback(() => {
    try {
      const data   = hasFiltersApplied ? filteredCells : allCells;
      const stats  = {
        total:      data.length,
        active:     data.filter(c => c.status === 'ACTIVE').length,
        incomplete: data.filter(c => c.status === 'INCOMPLETE_LEADERSHIP').length,
        suspended:  data.filter(c => c.status === 'SUSPENDED').length,
        inactive:   data.filter(c => c.status === 'INACTIVE').length,
      };
      generateCellGroupsPDF(data, activeFiltersInfo, hasFiltersApplied, stats);
      logUserAction('export_cells_pdf', { hasFilters: hasFiltersApplied, count: data.length, timestamp: new Date().toISOString() });
    } catch (err) {
      logError('Error generando PDF:', err);
      setError('Error al generar PDF');
    }
  }, [hasFiltersApplied, filteredCells, allCells, activeFiltersInfo]);

  // ── Render mini status badge ────────────────────────────────────────────────
  const renderStatusBadge = (status) => {
    const si = CELL_STATUS_MAP[status] || { label: status, icon: '•', color: '#6b7280', darkColor: '#9ca3af' };
    const color = isDarkMode ? si.darkColor : si.color;
    const bg    = isDarkMode ? `${si.darkBg}80` : si.bgColor;
    return (
      <span
        className="cells-page__status-badge"
        style={{ backgroundColor: bg, color, borderColor: color }}
        title={si.description}
      >
        {si.icon} {si.label}
      </span>
    );
  };

  // ── Render barra de ocupación ───────────────────────────────────────────────
  const renderOccupancyBar = (cell) => {
    const pct = cell.occupancyPercentage || 0;
    const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981';
    return (
      <div className="cells-page__occupancy">
        <div className="cells-page__occupancy-bar">
          <div className="cells-page__occupancy-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <span className="cells-page__occupancy-text">
          {cell.currentMemberCount || 0} / {cell.maxCapacity || '∞'}
        </span>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="cells-page" style={{ backgroundColor: theme.bg, color: theme.text, transition: 'all 0.3s ease' }}>
      <div className="cells-page-container">

        {/* HEADER */}
        <div className="cells-page__header">
          <h1>🏠 Gestión de Células</h1>
          <p>Administra las células, sus líderes y miembros. Toca una fila para ver el detalle.</p>
        </div>

        {/* CONTROLES */}
        <div className="cells-page__controls">
          <div className="cells-page__controls-grid">
            {/* Búsqueda */}
            <div className="cells-page__filter-item">
              <label>🔍 Buscar</label>
              <input
                type="text"
                placeholder="Nombre, líder, dirección..."
                value={searchText}
                onChange={e => setSearchText(validateSearchText(e.target.value))}
                maxLength="100"
                style={{ backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border }}
              />
            </div>

            {/* Filtro Estado */}
            <div className="cells-page__filter-item">
              <label>📌 Estado</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{ backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border }}
              >
                <option value="ALL">Todos los Estados ({allCells.length})</option>
                <option value="ACTIVE">✅ Activas ({allCells.filter(c => c.status === 'ACTIVE').length})</option>
                <option value="INCOMPLETE_LEADERSHIP">⚠️ Liderazgo Incompleto ({allCells.filter(c => c.status === 'INCOMPLETE_LEADERSHIP').length})</option>
                <option value="SUSPENDED">⏸️ Suspendidas ({allCells.filter(c => c.status === 'SUSPENDED').length})</option>
                <option value="INACTIVE">⏹️ Inactivas ({allCells.filter(c => c.status === 'INACTIVE').length})</option>
              </select>
            </div>

            {/* Filtro Distrito */}
            <div className="cells-page__filter-item">
              <label>📍 Distrito</label>
              <select
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                style={{ backgroundColor: theme.bgSecondary, color: theme.text, borderColor: theme.border }}
              >
                <option value="ALL">Todos los Distritos</option>
                {Object.entries(DISTRICT_MAP).map(([k, { label }]) => (
                  <option key={k} value={k}>
                    {label} ({allCells.filter(c => c.district === k).length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkbox + botones */}
          <div className="cells-page__filters-row">
            <label className="cells-page__checkbox">
              <input
                type="checkbox"
                checked={showIncompleteOnly}
                onChange={e => setShowIncompleteOnly(e.target.checked)}
              />
              <span>⚠️ Solo liderazgo incompleto</span>
            </label>

            <div className="cells-page__actions">
              <button
                className="cells-page__btn cells-page__btn--primary"
                onClick={() => setShowCreateModal(true)}
              >
                ➕ Nueva Célula
              </button>

              <button
                className="cells-page__btn cells-page__btn--secondary"
                onClick={handleShowStatistics}
                disabled={loading}
              >
                📊 Estadísticas {hasFiltersApplied && '🔍'}
              </button>

              <button
                className="cells-page__btn cells-page__btn--export"
                onClick={handleExportPDF}
                disabled={loading}
                title={hasFiltersApplied ? 'Exportar células filtradas a PDF' : 'Exportar todas las células a PDF'}
              >
                📄 PDF {hasFiltersApplied && '🔍'}
              </button>

              <button
                className="cells-page__btn cells-page__btn--verify-all"
                onClick={handleVerifyAll}
                disabled={loading}
              >
                🔄 Verificar Todas
              </button>

              <button
                className="cells-page__btn cells-page__btn--refresh"
                onClick={loadCells}
                disabled={loading}
              >
                🔄 Recargar
              </button>
            </div>
          </div>
        </div>

        {/* Contador de registros */}
        <div className="cells-page__filter-info">
          <p>
            Mostrando <strong>{filteredCells.length}</strong> de <strong>{allCells.length}</strong> células
            {hasFiltersApplied && ' (🔍 Con filtros aplicados)'}
          </p>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="cells-page__error" style={{ backgroundColor: theme.errorBg, borderColor: theme.errorBorder, color: theme.errorText }}>
            ❌ {error}
          </div>
        )}
        {successMessage && (
          <div className="cells-page__success" style={{ backgroundColor: theme.successBg, borderColor: theme.successBorder, color: theme.successText }}>
            {successMessage}
          </div>
        )}

        {/* TABLA */}
        {loading ? (
          <div className="cells-page__loading" style={{ color: theme.text }}>⏳ Cargando células...</div>
        ) : filteredCells.length === 0 ? (
          <div className="cells-page__empty">
            <p>🏠 No hay células que coincidan con los filtros</p>
            {allCells.length === 0 && (
              <p className="cells-page__empty-hint">
                💡 Crea la primera célula usando el botón "Nueva Célula"
              </p>
            )}
          </div>
        ) : (
          <div className="cells-page__table-container">
            <table className="cells-page__table">
              <thead>
                <tr>
                  <th className="cells-page__col-name">Célula</th>
                  <th className="cells-page__col-status">Estado</th>
                  <th className="cells-page__col-leadership">Liderazgo</th>
                  <th className="cells-page__col-district">Distrito</th>
                  <th className="cells-page__col-meeting">Reunión</th>
                  <th className="cells-page__col-occupancy">Ocupación</th>
                  <th className="cells-page__col-multiplication">Multiplicación</th>
                </tr>
              </thead>
              <tbody>
                {filteredCells.map(cell => (
                  <tr
                    key={cell.id}
                    className={`cells-page__row cells-page__row--${cell.status?.toLowerCase()} cells-page__row--clickable`}
                    style={{ backgroundColor: isDarkMode ? '#1a2332' : '#fff', borderColor: theme.border, cursor: 'pointer' }}
                    onClick={() => setSelectedCell(cell)}
                    title={`Ver detalle de ${cell.name}`}
                  >
                    {/* Nombre */}
                    <td className="cells-page__col-name">
                      <div className="cells-page__cell-info">
                        <span className="cells-page__cell-icon">🏠</span>
                        <div className="cells-page__cell-details">
                          <span className="cells-page__cell-name">{cell.name}</span>
                          <span className="cells-page__cell-meta" style={{ color: theme.textSecondary }}>
                            {cell.mainLeaderName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="cells-page__col-status">
                      {renderStatusBadge(cell.status)}
                    </td>

                    {/* Liderazgo */}
                    <td className="cells-page__col-leadership">
                      {cell.hasAllLeadersActive ? (
                        <span className="cells-page__leadership-badge cells-page__leadership-badge--complete">✅ Completo</span>
                      ) : (
                        <span className="cells-page__leadership-badge cells-page__leadership-badge--incomplete">
                          ⚠️ {cell.missingOrInactiveLeaders?.length || 0} problema(s)
                        </span>
                      )}
                    </td>

                    {/* Distrito */}
                    <td className="cells-page__col-district">
                      <span
                        className="cells-page__district-badge"
                        style={{
                          backgroundColor: isDarkMode ? `${cell.districtColor}20` : `${cell.districtColor}10`,
                          color: cell.districtColor,
                          borderColor: `${cell.districtColor}30`,
                        }}
                      >
                        {cell.districtLabel}
                      </span>
                    </td>

                    {/* Reunión */}
                    <td className="cells-page__col-meeting">
                      <div className="cells-page__meeting-info">
                        <span className="cells-page__meeting-day">{cell.meetingDay || 'N/A'}</span>
                        <span className="cells-page__meeting-time" style={{ color: theme.textSecondary }}>
                          {cell.meetingTimeFormatted}
                        </span>
                      </div>
                    </td>

                    {/* Ocupación */}
                    <td className="cells-page__col-occupancy">
                      {renderOccupancyBar(cell)}
                    </td>

                    {/* Multiplicación */}
                    <td className="cells-page__col-multiplication">
                      {cell.isMultiplying ? (
                        <span className="cells-page__multiplying-badge">🌱 En multiplicación</span>
                      ) : (
                        <span className="cells-page__multiplication-count" style={{ color: theme.textSecondary }}>
                          {cell.multiplicationCount || 0} {cell.multiplicationCount === 1 ? 'vez' : 'veces'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALES ── */}

      <ModalCreateCell
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateSuccess={() => { setShowCreateModal(false); loadCells(); }}
      />

      <ModalCellStatistics
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        data={statisticsData}
        isDarkMode={isDarkMode}
      />

      {/* Modal de detalle (click en fila) */}
      <ModalCellDetail
        isOpen={!!selectedCell}
        cell={selectedCell}
        onClose={() => setSelectedCell(null)}
        onCellChanged={() => {
          // Actualiza el cell seleccionado en la lista local sin recargar todo
          loadCells().then(() => {
            if (selectedCell) {
              setSelectedCell(prev => {
                // Buscar el cell actualizado en allCells (se habrá recargado)
                return prev;
              });
            }
          });
        }}
      />

      {/* Modal verificación masiva */}
      {showVerifyAllModal && verificationResult && (
        <div className="cells-page__modal-overlay">
          <div className="cells-page__modal" style={{ backgroundColor: theme.bgSecondary }}>
            <div className="cells-page__modal-header">
              <h2>🔍 Resultado de Verificación Masiva</h2>
              <button onClick={() => setShowVerifyAllModal(false)}>✕</button>
            </div>
            <div className="cells-page__modal-body">
              <p>✅ Verificación completada:</p>
              <ul>
                <li><strong>Total verificadas:</strong> {verificationResult.totalVerified}</li>
                <li><strong>Cambiaron de estado:</strong> {verificationResult.statusChanged}</li>
              </ul>
              {verificationResult.changedCells?.length > 0 && (
                <>
                  <h3>Células que cambiaron de estado:</h3>
                  <ul>
                    {verificationResult.changedCells.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.cellName}</strong>: {item.previousStatus} → {item.newStatus}
                        {item.reasons?.length > 0 && (
                          <ul className="cells-page__reasons-list">
                            {item.reasons.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="cells-page__modal-footer">
              <button className="cells-page__btn cells-page__btn--primary" onClick={() => setShowVerifyAllModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CellGroupsPage;