// ============================================
// CellAttendancePage.jsx — Versión simplificada (sin estadísticas)
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import apiService from '../apiService';
import { logUserAction } from '../utils/securityLogger';
import nameHelper from '../services/nameHelper';
import CellAttendanceStatsModal from '../components/CellAttendanceStatsModal'; // 👈 Importamos el modal
import '../css/CellAttendancePage.css';

const { getDisplayName } = nameHelper;

const DEBUG = process.env.REACT_APP_DEBUG === 'true';
const log      = (msg, d) => DEBUG && console.log(`[CellAttendancePage] ${msg}`, d || '');
const logError = (msg, e) => console.error(`[CellAttendancePage] ${msg}`, e);

// ── Constantes ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_LABELS_SHORT = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Días permitidos: 0=Dom, 3=Mié, 4=Jue
const ALLOWED_DAYS = [0, 3, 4];
const ALLOWED_DAYS_NAMES = ['Domingo', 'Miércoles', 'Jueves'];

const LEADER_TYPE_MAP = {
  LEADER_12:  { label: 'Líder 12',        icon: '👑', color: '#8b5cf6' },
  LEADER_144: { label: 'Líder de Rama',   icon: '🌿', color: '#3b82f6' },
  SERVANT:    { label: 'Servidor',         icon: '🤝', color: '#10b981' },
  LEADER_GROUP: { label: 'Líder de Grupo', icon: '🏠', color: '#f59e0b' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const isAllowedDay = (date) => {
  if (!date) return false;
  try {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    const dow = d.getDay();
    return ALLOWED_DAYS.includes(dow);
  } catch (error) {
    logError('Error en isAllowedDay:', error);
    return false;
  }
};

const isCurrentMonth = (dateStr) => {
  if (!dateStr) return false;
  try {
    const now = new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  } catch (error) {
    logError('Error en isCurrentMonth:', error);
    return false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch (error) {
    return dateStr;
  }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return `${DAY_LABELS[d.getDay()]} ${d.getDate()}`;
  } catch (error) {
    return dateStr;
  }
};

const formatDateShortParts = (dateStr) => {
  if (!dateStr) return { dayShort: '', dayNum: '', dayFull: '', dayIndex: -1, dayName: '', isAllowed: false };
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    const dayIndex = d.getDay();
    return {
      dayShort: DAY_LABELS_SHORT[dayIndex],
      dayFull: DAY_LABELS[dayIndex],
      dayName: DAY_NAMES_FULL[dayIndex],
      dayNum: d.getDate().toString(),
      dayIndex: dayIndex,
      full: `${DAY_LABELS[dayIndex]} ${d.getDate()}`,
      month: d.getMonth(),
      year: d.getFullYear(),
      isAllowed: ALLOWED_DAYS.includes(dayIndex),
    };
  } catch (error) {
    return { dayShort: '', dayNum: '', dayFull: '', dayIndex: -1, dayName: '', isAllowed: false };
  }
};

const getAvailableDatesForCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dates = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day, 12, 0, 0);
    const dow = d.getDay();
    if (ALLOWED_DAYS.includes(dow)) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const parts = formatDateShortParts(iso);
      dates.push({
        value: iso,
        label: formatDateShort(iso),
        fullLabel: formatDate(iso),
        isPast: d < today,
        isToday: d.toDateString() === today.toDateString(),
        isFuture: d > today,
        dayShort: parts.dayShort,
        dayNum: parts.dayNum,
        dayName: parts.dayName,
        dayIndex: dow,
      });
    }
  }
  return dates;
};

const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
};

const resolveLeaderLabel = (attendance) => {
  if (!attendance || !attendance.leaderType) return null;
  if (attendance.roleInCell) {
    const roleMap = {
      GROUP_LEADER: { label: 'Líder de Grupo', icon: '🏠', color: '#f59e0b' },
      HOST:         { label: 'Anfitrión',       icon: '🏡', color: '#10b981' },
      TIMOTEO:      { label: 'Timoteo',         icon: '📖', color: '#10b981' },
      BRANCH_LEADER:{ label: 'Líder de Rama',   icon: '🌿', color: '#3b82f6' },
      MAIN_LEADER:  { label: 'Líder 12',        icon: '👑', color: '#8b5cf6' },
    };
    return roleMap[attendance.roleInCell] || LEADER_TYPE_MAP[attendance.leaderType] || null;
  }
  return LEADER_TYPE_MAP[attendance.leaderType] || { 
    label: attendance.leaderType, 
    icon: '👤', 
    color: '#6b7280' 
  };
};

// ── Componente Principal ──────────────────────────────────────────────────────
const CellAttendancePage = () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [toastMessage, setToastMessage]     = useState('');

  // Datos
  const [config, setConfig]                     = useState(null);
  const [userCells, setUserCells]               = useState([]);
  const [monthAttendances, setMonthAttendances] = useState({});
  const [selectedCellId, setSelectedCellId]     = useState(null);
  const [selectedDate, setSelectedDate]         = useState('');
  const [attendances, setAttendances]           = useState([]);
  const [editedAttendances, setEditedAttendances] = useState({});
  const [saving, setSaving]                     = useState(false);
  const [generating, setGenerating]             = useState(false);

  // Summary
  const [summary, setSummary] = useState(null);

  // Modal de estadísticas
  const [showStatsModal, setShowStatsModal] = useState(false);

  // UI
  const [activeTab, setActiveTab]       = useState('register');
  const [expandedCard, setExpandedCard] = useState(null);
  const [isDarkMode, setIsDarkMode]     = useState(false);
  const [isMobile, setIsMobile]         = useState(window.innerWidth <= 480);

  // Refs
  const quickActionRef = useRef(null);

  // ── Fechas disponibles ─────────────────────────────────────────────────────
  const availableDates = useMemo(() => getAvailableDatesForCurrentMonth(), []);

  // ── Detectar móvil ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    bg:            isDarkMode ? '#0f172a' : '#f9fafb',
    bgSecondary:   isDarkMode ? '#1e293b' : '#ffffff',
    bgTertiary:    isDarkMode ? '#0f172a' : '#f1f5f9',
    text:          isDarkMode ? '#f3f4f6' : '#1f2937',
    textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
    border:        isDarkMode ? '#334155' : '#e5e7eb',
    errorBg:       isDarkMode ? '#7f1d1d' : '#fee2e2',
    errorText:     isDarkMode ? '#fecaca' : '#991b1b',
    successBg:     isDarkMode ? '#14532d' : '#d1fae5',
    successText:   isDarkMode ? '#a7f3d0' : '#065f46',
    accentBlue:    isDarkMode ? '#60a5fa' : '#3b82f6',
    accentGreen:   isDarkMode ? '#34d399' : '#10b981',
    accentAmber:   isDarkMode ? '#fbbf24' : '#f59e0b',
    accentPurple:  isDarkMode ? '#a78bfa' : '#8b5cf6',
  };

  // ── Auto-clear messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 2000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // ── Cargar config y datos iniciales ────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const cfgRes = await apiService.getAttendanceConfig();
      setConfig(cfgRes);

      let cellsList = [];
      try {
        cellsList = await apiService.getCells();
        log('Células cargadas:', cellsList?.length || 0);
      } catch (cellErr) {
        logError('Error cargando células:', cellErr);
        cellsList = [];
      }
      setUserCells(Array.isArray(cellsList) ? cellsList : []);

      let attendancesMap = {};
      try {
        const monthRes = await apiService.getCellAttendancesCurrentMonth();
        attendancesMap = monthRes?.attendances || {};
      } catch (attErr) {
        logError('Error cargando asistencias del mes:', attErr);
      }
      setMonthAttendances(attendancesMap);

      const finalCells = Array.isArray(cellsList) ? cellsList : [];
      if (finalCells.length === 1) {
        setSelectedCellId(String(finalCells[0].id));
      }

      logUserAction('load_cell_attendances', {
        totalCells: finalCells.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los datos de asistencia');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // ── Cargar asistencias al seleccionar célula + fecha ───────────────────────
  const loadAttendancesForDate = useCallback(async () => {
    if (!selectedCellId || !selectedDate) {
      setAttendances([]);
      setSummary(null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await apiService.getCellAttendancesByDate(selectedCellId, selectedDate);
      const list = res?.attendances || [];
      setAttendances(list);

      const edited = {};
      list.forEach(a => {
        edited[a.memberId] = {
          present: a.present ?? false,
          justifiedAbsence: a.justifiedAbsence ?? false,
          justificationReason: a.justificationReason || '',
        };
      });
      setEditedAttendances(edited);

      try {
        const summaryRes = await apiService.getCellAttendanceSummary(selectedCellId, selectedDate);
        setSummary(summaryRes);
      } catch { setSummary(null); }

    } catch (err) {
      logError('Error cargando asistencias:', err);
      if (err.message?.includes('No encontrado') || err.message?.includes('404')) {
        setAttendances([]);
        setEditedAttendances({});
        setSummary(null);
      } else if (err.message?.includes('Acceso denegado') || err.message?.includes('403') || err.message?.includes('permiso')) {
        setAttendances([]);
        setEditedAttendances({});
        setSummary(null);
        setError('No tienes permiso para acceder a esta célula.');
      } else {
        setError(err.message || 'Error al cargar asistencias');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCellId, selectedDate]);

  useEffect(() => { loadAttendancesForDate(); }, [loadAttendancesForDate]);

  // ── Computed values ────────────────────────────────────────────────────────
  const hasUnsavedChanges = useMemo(() => {
    return attendances.some(a => {
      const edited = editedAttendances[a.memberId];
      if (!edited) return false;
      return (
        a.present !== edited.present ||
        (a.justifiedAbsence ?? false) !== edited.justifiedAbsence ||
        (a.justificationReason || '') !== edited.justificationReason
      );
    });
  }, [attendances, editedAttendances]);

  const liveStats = useMemo(() => {
    const total = Object.keys(editedAttendances).length;
    const presentCount = Object.values(editedAttendances).filter(a => a.present).length;
    const absentCount = total - presentCount;
    const justifiedCount = Object.values(editedAttendances).filter(a => !a.present && a.justifiedAbsence).length;
    const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    return { total, presentCount, absentCount, justifiedCount, percentage };
  }, [editedAttendances]);

  const { leaders, members } = useMemo(() => {
    const l = attendances.filter(a => a.leaderType && !a.isRegularMember);
    const m = attendances.filter(a => !a.leaderType || a.isRegularMember);
    return { leaders: l, members: m };
  }, [attendances]);

  const isEditable = useMemo(() => {
    if (!selectedDate) return false;
    return isCurrentMonth(selectedDate) && isAllowedDay(selectedDate);
  }, [selectedDate]);

  const cellNames = useMemo(() => {
    const names = {};
    userCells.forEach(c => { names[String(c.id)] = c.name || `Célula #${c.id}`; });
    return names;
  }, [userCells]);

  const cellHasMonthAttendances = useCallback((cellId) => {
    const key = String(cellId);
    return monthAttendances[key] && monthAttendances[key].length > 0;
  }, [monthAttendances]);

  const selectedDateParts = useMemo(() => {
    return formatDateShortParts(selectedDate);
  }, [selectedDate]);

  // ✅ Abrir modal de estadísticas
  const handleOpenStats = useCallback(() => {
    if (!selectedCellId) return;
    setShowStatsModal(true);
  }, [selectedCellId]);

  // ── Generar asistencias ─────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedCellId || !selectedDate) return;

    if (!isAllowedDay(selectedDate)) {
      setError('La fecha seleccionada no es un día permitido para reuniones (Domingo, Miércoles o Jueves)');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      await apiService.generateCellAttendances(selectedCellId, selectedDate);
      setSuccessMessage('Asistencias generadas exitosamente');

      await loadAttendancesForDate();

      try {
        const monthRes = await apiService.getCellAttendancesCurrentMonth();
        setMonthAttendances(monthRes?.attendances || {});
      } catch { /* no-op */ }

      logUserAction('generate_cell_attendances', {
        cellId: selectedCellId,
        date: selectedDate,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError('Error generando asistencias:', err);
      setError(err.message || 'Error al generar asistencias');
    } finally {
      setGenerating(false);
    }
  }, [selectedCellId, selectedDate, loadAttendancesForDate]);

  // ── Handlers de asistencia ─────────────────────────────────────────────────
  const handleTogglePresent = useCallback((memberId) => {
    setEditedAttendances(prev => {
      const current = prev[memberId] || {};
      const newPresent = !current.present;
      return {
        ...prev,
        [memberId]: {
          ...current,
          present: newPresent,
          justifiedAbsence: newPresent ? false : current.justifiedAbsence,
          justificationReason: newPresent ? '' : current.justificationReason,
        },
      };
    });
  }, []);

  const handleToggleJustified = useCallback((memberId) => {
    setEditedAttendances(prev => {
      const current = prev[memberId] || {};
      return {
        ...prev,
        [memberId]: {
          ...current,
          justifiedAbsence: !current.justifiedAbsence,
          justificationReason: !current.justifiedAbsence ? current.justificationReason : '',
        },
      };
    });
  }, []);

  const handleJustificationChange = useCallback((memberId, reason) => {
    setEditedAttendances(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], justificationReason: reason },
    }));
  }, []);

  const handleMarkAll = useCallback((present) => {
    setEditedAttendances(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(memberId => {
        updated[memberId] = {
          ...updated[memberId],
          present,
          justifiedAbsence: present ? false : updated[memberId]?.justifiedAbsence,
          justificationReason: present ? '' : updated[memberId]?.justificationReason,
        };
      });
      return updated;
    });
    
    setToastMessage(present ? '✅ Todos marcados como presentes' : '❌ Todos marcados como ausentes');
    
    if (quickActionRef.current) {
      quickActionRef.current.style.animation = 'none';
      void quickActionRef.current.offsetHeight;
      quickActionRef.current.style.animation = 'caQuickActionFlash 0.2s ease-out';
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedCellId || !selectedDate) return;
    setSaving(true);
    setError('');
    try {
      const requests = Object.entries(editedAttendances).map(([memberId, data]) => ({
        memberId: Number(memberId),
        present: data.present,
        justifiedAbsence: !data.present ? data.justifiedAbsence : null,
        justificationReason: !data.present && data.justifiedAbsence ? data.justificationReason : null,
      }));

      await apiService.updateBulkCellAttendances(selectedCellId, selectedDate, requests);
      setSuccessMessage('Asistencias guardadas exitosamente');
      
      await loadAttendancesForDate();

      logUserAction('save_cell_attendances', {
        cellId: selectedCellId,
        date: selectedDate,
        totalRecords: requests.length,
        presentCount: requests.filter(r => r.present).length,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError('Error guardando asistencias:', err);
      setError(err.message || 'Error al guardar asistencias');
    } finally {
      setSaving(false);
    }
  }, [selectedCellId, selectedDate, editedAttendances, loadAttendancesForDate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS (los mismos que antes, omitidos por brevedad)
  // ═══════════════════════════════════════════════════════════════════════════

  const renderParticipantCard = (attendance, isLeader = false) => {
    // ... (mismo código que tenías)
  };

  const renderLiveStats = () => {
    // ... (mismo código que tenías)
  };

  const renderSummaryTab = () => {
    // ... (mismo código que tenías)
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="ca-page" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <div className="ca-page-container">

        <div className="ca-page__header">
          <div className="ca-page__header-content">
            <h1>📋 Asistencias de Células</h1>
            <p>
              {config?.currentMonth || MONTH_NAMES[new Date().getMonth()]} {config?.currentYear || new Date().getFullYear()}
              {' · '} Días permitidos: {ALLOWED_DAYS_NAMES.join(', ')}
            </p>
          </div>
          <div className="ca-page__header-badge">
            <span className="ca-page__cells-count">{userCells.length}</span>
            <span>Célula{userCells.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="ca-page__selectors" style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}>
          <div className="ca-page__selectors-grid">
            <div className="ca-page__selector-item">
              <label>🏠 Célula</label>
              {isMobile && selectedCellId ? (
                <div className="ca-page__cell-chip" style={{ backgroundColor: theme.accentBlue }}>
                  <span>{cellNames[selectedCellId]}</span>
                  <button onClick={() => setSelectedCellId(null)} title="Cambiar célula">✕</button>
                </div>
              ) : (
                <select
                  value={selectedCellId || ''}
                  onChange={(e) => {
                    setSelectedCellId(e.target.value || null);
                    setActiveTab('register');
                  }}
                  style={{ backgroundColor: theme.bgTertiary, color: theme.text, borderColor: theme.border }}
                >
                  <option value="">— Seleccionar célula ({userCells.length}) —</option>
                  {userCells.map(cell => (
                    <option key={cell.id} value={String(cell.id)}>
                      {cell.name || `Célula #${cell.id}`}
                      {cellHasMonthAttendances(cell.id) ? ' ✅' : ' 📋'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="ca-page__selector-item">
              <label>📅 Fecha</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!selectedCellId}
                style={{ backgroundColor: theme.bgTertiary, color: theme.text, borderColor: theme.border }}
              >
                <option value="">— Seleccionar fecha —</option>
                {availableDates.map(d => (
                  <option key={d.value} value={d.value}>
                    {d.dayShort} {d.dayNum} {d.isToday ? '(Hoy)' : ''} {d.isFuture ? '📌' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="ca-page__selector-actions">
              {selectedCellId && selectedDate && attendances.length === 0 && (
                <button
                  className="ca-page__btn ca-page__btn--generate"
                  onClick={handleGenerate}
                  disabled={generating || loading}
                >
                  {generating ? '⏳ Generando...' : '⚡ Generar Asistencias'}
                </button>
              )}
              <button
                className="ca-page__btn ca-page__btn--refresh"
                onClick={loadInitialData}
                disabled={loading}
                title="Recargar datos"
              >
                🔄
              </button>
            </div>
          </div>

          {selectedDate && (
            <div className="ca-page__date-info">
              <span className="ca-page__date-full">
                <span className="ca-page__date-day-highlight">
                  {selectedDateParts.dayShort}
                </span>
                {formatDate(selectedDate)}
              </span>
              {isEditable ? (
                <span className="ca-page__date-editable">✏️ Editable</span>
              ) : (
                <span className="ca-page__date-readonly">🔒 Solo lectura</span>
              )}
            </div>
          )}
        </div>

        {toastMessage && (
          <div className="ca-page__toast" style={{
            position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: theme.accentBlue, color: 'white', padding: '8px 16px',
            borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000, animation: 'caFadeIn 0.2s ease',
          }}>
            {toastMessage}
          </div>
        )}

        {error && (
          <div className="ca-page__message ca-page__message--error" style={{ backgroundColor: theme.errorBg, color: theme.errorText }}>
            ❌ {error}
          </div>
        )}
        {successMessage && (
          <div className="ca-page__message ca-page__message--success" style={{ backgroundColor: theme.successBg, color: theme.successText }}>
            ✅ {successMessage}
          </div>
        )}

        {selectedCellId && (
          <div className="ca-page__tabs" style={{ borderColor: theme.border }}>
            <button
              className={`ca-page__tab ${activeTab === 'register' ? 'ca-page__tab--active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              📝 Registro
            </button>
            {attendances.length > 0 && (
              <button
                className={`ca-page__tab ${activeTab === 'summary' ? 'ca-page__tab--active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                📊 Resumen
              </button>
            )}
            <button
              className="ca-page__tab"
              onClick={handleOpenStats}
              style={{ marginLeft: 'auto' }}
            >
              📈 Estadísticas
            </button>
          </div>
        )}

        {loading && !attendances.length ? (
          <div className="ca-page__loading" style={{ backgroundColor: theme.bgSecondary }}>
            <div className="ca-page__spinner" />
            <p>Cargando asistencias...</p>
          </div>
        ) : !selectedCellId ? (
          <div className="ca-page__empty-state" style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}>
            <div className="ca-page__empty-icon">🏠</div>
            <h2>Selecciona una célula</h2>
            <p style={{ color: theme.textSecondary }}>
              {userCells.length === 0
                ? 'No tienes células asignadas. Contacta al administrador.'
                : `Tienes ${userCells.length} célula${userCells.length !== 1 ? 's' : ''} disponible${userCells.length !== 1 ? 's' : ''}. Selecciona una y elige una fecha para registrar asistencia.`}
            </p>
          </div>
        ) : !selectedDate ? (
          <div className="ca-page__empty-state" style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}>
            <div className="ca-page__empty-icon">📅</div>
            <h2>Selecciona una fecha</h2>
            <p style={{ color: theme.textSecondary }}>
              Elige un día de reunión ({ALLOWED_DAYS_NAMES.join(', ')}) para registrar la asistencia.
            </p>
          </div>
        ) : attendances.length === 0 ? (
          <div className="ca-page__empty-state" style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}>
            <div className="ca-page__empty-icon">📋</div>
            <h2>Sin asistencias generadas</h2>
            <p style={{ color: theme.textSecondary }}>
              No se han generado asistencias para esta fecha. Usa el botón "Generar Asistencias" para crear los registros.
            </p>
          </div>
        ) : activeTab === 'summary' ? (
          renderSummaryTab()
        ) : (
          <div className="ca-page__register-content">
            <div className={isMobile ? "ca-page__live-stats-sticky" : ""}>
              {renderLiveStats()}
            </div>

            {isEditable && (
              <div className="ca-page__quick-actions" style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}>
                <button
                  ref={quickActionRef}
                  className="ca-page__btn ca-page__btn--mark-all-present"
                  onClick={() => handleMarkAll(true)}
                >
                  ✅ Todos Presentes
                </button>
                <button
                  className="ca-page__btn ca-page__btn--mark-all-absent"
                  onClick={() => handleMarkAll(false)}
                >
                  ❌ Todos Ausentes
                </button>
                <div className="ca-page__quick-actions-spacer" />
                <button
                  className={`ca-page__btn ca-page__btn--save ${hasUnsavedChanges ? 'ca-page__btn--save-pulse' : ''}`}
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                >
                  {saving ? '⏳ Guardando...' : hasUnsavedChanges ? '💾 Guardar Cambios' : '✓ Sin cambios'}
                </button>
              </div>
            )}

            {leaders.length > 0 && (
              <div className="ca-page__section">
                <div className="ca-page__section-header">
                  <h2>👑 Equipo de Liderazgo</h2>
                  <span className="ca-page__section-count" style={{ color: theme.textSecondary }}>
                    {leaders.length} participante{leaders.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="ca-page__participants-list">
                  {leaders.map(a => renderParticipantCard(a, true))}
                </div>
              </div>
            )}

            {members.length > 0 && (
              <div className="ca-page__section">
                <div className="ca-page__section-header">
                  <h2>👥 Miembros</h2>
                  <span className="ca-page__section-count" style={{ color: theme.textSecondary }}>
                    {members.length} participante{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="ca-page__participants-list">
                  {members.map(a => renderParticipantCard(a, false))}
                </div>
              </div>
            )}

            {isEditable && hasUnsavedChanges && (
              <div className="ca-page__sticky-save">
                <button
                  className="ca-page__btn ca-page__btn--save-sticky"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '⏳ Guardando...' : `💾 Guardar Cambios (${liveStats.presentCount}/${liveStats.total} presentes)`}
                </button>
              </div>
            )}
          </div>
        )}

        {config?.rules && (
          <div className="ca-page__rules" style={{ backgroundColor: theme.bgSecondary, borderColor: theme.border }}>
            <details>
              <summary>📖 Reglas de Asistencia</summary>
              <ul>
                {config.rules.map((rule, i) => (
                  <li key={i} style={{ color: theme.textSecondary }}>{rule}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>

      {/* ✅ Modal de Estadísticas separado */}
      <CellAttendanceStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        cellId={selectedCellId}
        cellName={cellNames[selectedCellId]}
        apiService={apiService}
        theme={theme}
        isMobile={isMobile}
        onRefresh={() => {
          // Opcional: recargar datos cuando se cierre el modal
          setShowStatsModal(false);
        }}
        logUserAction={logUserAction}
      />
    </div>
  );
};

export default CellAttendancePage;