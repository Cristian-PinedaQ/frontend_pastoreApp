// ============================================
// ModalCellDetail.jsx
// Vista completa de una célula: Info | Miembros | Agregar Miembro | Editar
// Acciones (Verificar, Estado, Multiplicación, PDF, Eliminar) en el header
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import { logUserAction, logSecurityEvent } from '../utils/securityLogger';
import nameHelper from '../services/nameHelper';
import { generateCellDetailPDF } from '../services/cellDetailPdfGenerator';
import '../css/ModalCellDetail.css';

const { getDisplayName } = nameHelper;

const DEBUG = process.env.REACT_APP_DEBUG === 'true';
const log = (msg, d) => DEBUG && console.log(`[ModalCellDetail] ${msg}`, d || '');
const logError = (msg, e) => console.error(`[ModalCellDetail] ${msg}`, e);

const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
};

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_MAP = {
  ACTIVE:               { label: 'Activa',               icon: '✅', color: '#10b981', bg: '#d1fae5' },
  INCOMPLETE_LEADERSHIP:{ label: 'Liderazgo Incompleto', icon: '⚠️', color: '#f59e0b', bg: '#fef3c7' },
  INACTIVE:             { label: 'Inactiva',             icon: '⏹️', color: '#6b7280', bg: '#f3f4f6' },
  SUSPENDED:            { label: 'Suspendida',           icon: '⏸️', color: '#ef4444', bg: '#fee2e2' },
};

const TABS = [
  { id: 'info',    label: '📋 Información' },
  { id: 'members', label: '👥 Miembros' },
  { id: 'add',     label: '➕ Agregar Miembro' },
  { id: 'edit',    label: '✏️ Editar' },
];

const DAYS_OF_WEEK = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
];

const DISTRICTS = [
  'NORTE', 'SUR', 'ESTE', 'OESTE', 'CENTRO',
  'NORESTE', 'NOROESTE', 'SURESTE', 'SUROESTE',
];

// ── Convierte cualquier formato de hora al formato HH:mm que requiere <input type="time"> ──
const toInputTime = (timeStr) => {
  if (!timeStr) return '';
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr.slice(0, 5);
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const period = match[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return timeStr;
};

// ── Componente principal ──────────────────────────────────────────────────────

const ModalCellDetail = ({ isOpen, onClose, cell: initialCell, onCellChanged }) => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [cell, setCell]           = useState(initialCell);
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading]     = useState(false);
  const [members, setMembers]     = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError]         = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Add-member sub-state
  const [addStep, setAddStep]                 = useState(1);
  const [searchTerm, setSearchTerm]           = useState('');
  const [searchResults, setSearchResults]     = useState([]);
  const [searching, setSearching]             = useState(false);
  const [selectedMember, setSelectedMember]   = useState(null);
  const [addResult, setAddResult]             = useState(null);
  const [addError, setAddError]               = useState('');

  // Edit sub-state
  const [editForm, setEditForm]       = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Delete sub-state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText]  = useState('');
  const [deleting, setDeleting]                    = useState(false);

  // Unlink leader sub-state
  const [unlinkTarget, setUnlinkTarget] = useState(null); // { leaderId, leaderName, role }
  const [unlinking, setUnlinking]       = useState(false);

  // Leader search for edit
  const [leaderSearchField, setLeaderSearchField] = useState(null);
  const [leaderSearchTerm, setLeaderSearchTerm]   = useState('');
  const [leaderResults, setLeaderResults]         = useState([]);
  const [searchingLeaders, setSearchingLeaders]   = useState(false);

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const savedMode  = localStorage.getItem('darkMode');
      const htmlDark   = document.documentElement.classList.contains('dark-mode') ||
                         document.documentElement.classList.contains('dark');
      const mediaDark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(savedMode === 'true' || htmlDark || mediaDark);
    } catch (_) {}
  }, []);

  const T = {
    bg:          isDarkMode ? '#1e293b' : '#ffffff',
    bgSecondary: isDarkMode ? '#0f172a' : '#f9fafb',
    text:        isDarkMode ? '#f3f4f6' : '#1f2937',
    textSub:     isDarkMode ? '#9ca3af' : '#6b7280',
    border:      isDarkMode ? '#334155' : '#e5e7eb',
    rowAlt:      isDarkMode ? '#1a2332' : '#f8fafc',
    cardBg:      isDarkMode ? '#1e293b' : '#ffffff',
    errorBg:     isDarkMode ? '#7f1d1d30' : '#fee2e2',
    errorText:   isDarkMode ? '#fecaca'  : '#991b1b',
    successBg:   isDarkMode ? '#14532d30' : '#d1fae5',
    successText: isDarkMode ? '#a7f3d0'  : '#065f46',
    warnBg:      isDarkMode ? '#78350f30' : '#fef3c7',
    warnText:    isDarkMode ? '#fcd34d'  : '#92400e',
  };

  // ── Sync cell prop ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialCell) {
      setCell(initialCell);
      setError('');
      setSuccessMsg('');
    }
  }, [initialCell]);

  // ── Load members when tab opens ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && (activeTab === 'members' || activeTab === 'add') && cell?.id) {
      loadMembers();
    }
  }, [isOpen, activeTab, cell?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset add-member form when switching away
  useEffect(() => {
    if (activeTab !== 'add') {
      setAddStep(1);
      setSearchTerm('');
      setSearchResults([]);
      setSelectedMember(null);
      setAddResult(null);
      setAddError('');
    }
  }, [activeTab]);

  // ── Initialize edit form when switching to edit tab ──────────────────────────
  useEffect(() => {
    if (activeTab === 'edit' && cell) {
      setEditForm({
        name:           cell.name           ?? '',
        meetingDay:     cell.meetingDay     ?? '',
        meetingTime:    toInputTime(cell.meetingTime ?? cell.meetingTimeFormatted ?? ''),
        meetingAddress: cell.meetingAddress ?? '',
        maxCapacity:    cell.maxCapacity    ?? 12,
        district:       cell.district       ?? '',
        notes:          cell.notes          ?? '',
        mainLeaderId:   cell.mainLeaderId   ?? null,
        groupLeaderId:  cell.groupLeaderId  ?? null,
        hostId:         cell.hostId         ?? null,
        timoteoId:      cell.timoteoId      ?? null,
        mainLeaderName:  cell.mainLeaderName  ?? '',
        groupLeaderName: cell.groupLeaderName ?? '',
        hostName:        cell.hostName        ?? '',
        timoteoName:     cell.timoteoName     ?? '',
      });
      setEditError('');
      setEditSuccess('');
      setLeaderSearchField(null);
      setLeaderSearchTerm('');
      setLeaderResults([]);
    }
  }, [activeTab, cell]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const loadMembers = useCallback(async () => {
    if (!cell?.id) return;
    setLoadingMembers(true);
    try {
      const raw = await apiService.getCellMembers(cell.id);
      const list = Array.isArray(raw) ? raw : [];
      setMembers(list.map(m => ({
        ...m,
        displayName: getDisplayName(escapeHtml(m.name || 'Sin nombre')),
      })));
      log('Miembros cargados', { count: list.length });
    } catch (err) {
      logError('Error cargando miembros:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [cell?.id]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    setLoading(true); setError('');
    try {
      const result = await apiService.verifyCell(cell.id);
      showSuccess(`✅ ${cell.name} verificada — Estado: ${result.statusDisplay || result.status}`);
      if (onCellChanged) onCellChanged();
      setCell(prev => ({ ...prev, status: result.status }));
      logUserAction('verify_cell', { cellId: cell.id });
    } catch (err) {
      setError(`Error al verificar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    setShowStatusMenu(false);
    const names = { ACTIVE: 'Activa', SUSPENDED: 'Suspendida', INACTIVE: 'Inactiva' };
    if (!window.confirm(`¿Cambiar estado de "${cell.name}" a ${names[newStatus] || newStatus}?`)) return;
    setLoading(true); setError('');
    try {
      await apiService.changeCellStatus(cell.id, newStatus);
      showSuccess(`✅ Estado cambiado a ${names[newStatus] || newStatus}`);
      setCell(prev => ({ ...prev, status: newStatus }));
      if (onCellChanged) onCellChanged();
    } catch (err) {
      setError(`Error al cambiar estado: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMultiplication = async () => {
    setLoading(true); setError('');
    try {
      if (!cell.isMultiplying) {
        if (!window.confirm(`¿Iniciar multiplicación para "${cell.name}"?`)) { setLoading(false); return; }
        await apiService.startMultiplication(cell.id);
        showSuccess(`🌱 Multiplicación iniciada para ${cell.name}`);
        setCell(prev => ({ ...prev, isMultiplying: true }));
      } else {
        if (!window.confirm(`¿Completar multiplicación para "${cell.name}"?`)) { setLoading(false); return; }
        await apiService.completeMultiplication(cell.id);
        showSuccess(`✅ Multiplicación completada para ${cell.name}`);
        setCell(prev => ({ ...prev, isMultiplying: false, multiplicationCount: (prev.multiplicationCount || 0) + 1 }));
      }
      if (onCellChanged) onCellChanged();
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    generateCellDetailPDF(cell, members);
    logUserAction('export_cell_pdf', { cellId: cell.id });
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`¿Remover a "${memberName}" de la célula?`)) return;
    setLoading(true);
    try {
      await apiService.removeMemberFromCell(cell.id, memberId);
      showSuccess(`✅ ${memberName} removido de ${cell.name}`);
      await loadMembers();
      setCell(prev => ({ ...prev, currentMemberCount: Math.max(0, (prev.currentMemberCount || 1) - 1) }));
      if (onCellChanged) onCellChanged();
    } catch (err) {
      setError(`Error al remover miembro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Unlink leader ────────────────────────────────────────────────────────────
  const handleConfirmUnlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true); setError('');
    try {
      const result = await apiService.unlinkLeaderFromCell(cell.id, unlinkTarget.leaderId);

      const roleToFields = {
        mainLeader:   { idKey: 'mainLeaderId',  nameKey: 'mainLeaderName',  activeKey: 'mainLeaderIsActive' },
        groupLeader:  { idKey: 'groupLeaderId', nameKey: 'groupLeaderName', activeKey: 'groupLeaderIsActive' },
        host:         { idKey: 'hostId',        nameKey: 'hostName',        activeKey: 'hostIsActive' },
        timoteo:      { idKey: 'timoteoId',     nameKey: 'timoteoName',     activeKey: 'timoteoIsActive' },
      };
      const fields = roleToFields[unlinkTarget.role];

      // Actualizar cell state
      setCell(prev => ({
        ...prev,
        status: result.newCellStatus ?? prev.status,
        hasAllLeadersActive: false,
        missingOrInactiveLeaders: result.missingOrInactiveLeaders ?? prev.missingOrInactiveLeaders,
        ...(fields ? {
          [fields.idKey]:     null,
          [fields.nameKey]:   null,
          [fields.activeKey]: null,
        } : {}),
      }));

      // Limpiar también el editForm para que quede en sincronía
      if (fields) {
        setEditForm(prev => ({
          ...prev,
          [fields.idKey]:   null,
          // nameKey en editForm usa el mismo key que en cell (ej: mainLeaderName)
          [fields.nameKey]: '',
        }));
      }

      showSuccess(`✂️ Líder "${unlinkTarget.leaderName}" desvinculado. Estado: ${result.newCellStatusDisplay ?? result.newCellStatus}`);
      logUserAction('unlink_leader_from_cell', { cellId: cell.id, leaderId: unlinkTarget.leaderId, role: unlinkTarget.role });
      if (onCellChanged) onCellChanged();
    } catch (err) {
      setEditError(`Error al desvincular líder: ${err.message}`);
    } finally {
      setUnlinking(false);
      setUnlinkTarget(null);
    }
  };

  // ── Delete cell ──────────────────────────────────────────────────────────────
  const handleDeleteCell = async () => {
    if (deleteConfirmText !== cell.name) return;
    setDeleting(true); setError('');
    try {
      await apiService.deleteCell(cell.id);
      logUserAction('delete_cell', { cellId: cell.id, cellName: cell.name });
      setShowDeleteConfirm(false);
      if (onCellChanged) onCellChanged();
      onClose();
    } catch (err) {
      setError(`Error al eliminar célula: ${err.message}`);
      setDeleting(false);
    }
  };

  // ── Edit cell ────────────────────────────────────────────────────────────────
  const handleEditField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchLeaders = async () => {
    if (leaderSearchTerm.trim().length < 2) return;
    setSearchingLeaders(true);
    try {
      const servants = await apiService.getLeadersByType('SERVANT');
      const q = leaderSearchTerm.toLowerCase().trim();
      const results = (Array.isArray(servants) ? servants : [])
        .filter(l =>
          l.name?.toLowerCase().includes(q) ||
          l.memberName?.toLowerCase().includes(q) ||
          l.document?.toLowerCase().includes(q)
        )
        .map(l => ({
          id: l.leaderId ?? l.id,
          name: l.name ?? l.memberName ?? `Líder #${l.leaderId ?? l.id}`,
          document: l.document ?? '',
        }))
        .slice(0, 10);
      setLeaderResults(results);
      if (results.length === 0) logError('Sin resultados para:', leaderSearchTerm);
    } catch (err) {
      logError('Error buscando líderes:', err);
      setLeaderResults([]);
    } finally {
      setSearchingLeaders(false);
    }
  };

  const handleSelectLeader = (leader) => {
    if (!leaderSearchField) return;
    const idField = leaderSearchField;
    const nameField = leaderSearchField.replace('Id', 'Name');
    setEditForm(prev => ({
      ...prev,
      [idField]: leader.id,
      [nameField]: leader.name || `Líder #${leader.id}`,
    }));
    setLeaderSearchField(null);
    setLeaderSearchTerm('');
    setLeaderResults([]);
  };

  const handleSaveEdit = async () => {
    setEditLoading(true); setEditError(''); setEditSuccess('');
    try {
      if (!editForm.name?.trim()) { setEditError('El nombre es obligatorio'); setEditLoading(false); return; }

      const payload = {
        name:           editForm.name.trim(),
        mainLeaderId:   editForm.mainLeaderId,
        groupLeaderId:  editForm.groupLeaderId,
        hostId:         editForm.hostId,
        timoteoId:      editForm.timoteoId,
        meetingDay:     editForm.meetingDay || null,
        meetingTime:    editForm.meetingTime || null,
        meetingAddress: editForm.meetingAddress || null,
        maxCapacity:    editForm.maxCapacity ? parseInt(editForm.maxCapacity, 10) : null,
        district:       editForm.district || null,
        notes:          editForm.notes || null,
      };

      await apiService.updateCell(cell.id, payload);
      setEditSuccess('✅ Célula actualizada exitosamente');
      logUserAction('edit_cell', { cellId: cell.id });

      setCell(prev => ({
        ...prev,
        name:             payload.name,
        meetingDay:       payload.meetingDay,
        meetingTime:      payload.meetingTime,
        meetingTimeFormatted: payload.meetingTime,
        meetingAddress:   payload.meetingAddress,
        maxCapacity:      payload.maxCapacity,
        district:         payload.district,
        notes:            payload.notes,
        mainLeaderId:     payload.mainLeaderId,
        groupLeaderId:    payload.groupLeaderId,
        hostId:           payload.hostId,
        timoteoId:        payload.timoteoId,
        mainLeaderName:   editForm.mainLeaderName,
        groupLeaderName:  editForm.groupLeaderName,
        hostName:         editForm.hostName,
        timoteoName:      editForm.timoteoName,
      }));

      if (onCellChanged) onCellChanged();
      onClose();
    } catch (err) {
      setEditError(err.message || 'Error al actualizar la célula');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Add member flow ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) { setAddError('Ingresa al menos 2 caracteres'); return; }
    setSearching(true); setAddError(''); setSearchResults([]);
    try {
      const [allMembers, currentMembers] = await Promise.all([
        apiService.getAllMembers(),
        apiService.getCellMembers(cell.id),
      ]);
      const currentIds = new Set((Array.isArray(currentMembers) ? currentMembers : []).map(m => m.id));
      const q = searchTerm.toLowerCase().trim();
      const results = allMembers
        .filter(m => !currentIds.has(m.id) && (
          m.name?.toLowerCase().includes(q) ||
          m.document?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
        ))
        .map(m => ({ ...m, displayName: getDisplayName(escapeHtml(m.name || 'Sin nombre')) }))
        .slice(0, 20);
      setSearchResults(results);
      if (results.length === 0) setAddError('No se encontraron miembros disponibles');
    } catch (err) {
      setAddError('Error al buscar miembros');
      logSecurityEvent('member_search_error', { errorType: 'api_error' });
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmAdd = async () => {
    setLoading(true); setAddError('');
    try {
      const result = await apiService.addMemberToCell(cell.id, selectedMember.id);
      setAddResult(result);
      setAddStep(3);
      await loadMembers();
      setCell(prev => ({ ...prev, currentMemberCount: (prev.currentMemberCount || 0) + 1 }));
      if (onCellChanged) onCellChanged();
      logUserAction('add_member_to_cell', { cellId: cell.id, memberId: selectedMember.id });
    } catch (err) {
      setAddError(err.message || 'Error al agregar miembro');
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const statusInfo = STATUS_MAP[cell?.status] || { label: cell?.status, icon: '•', color: '#6b7280', bg: '#f3f4f6' };

  if (!isOpen || !cell) return null;

  // ── Info tab ─────────────────────────────────────────────────────────────────
  const renderInfo = () => {
    const LEADER_ROLES = [
      { role: 'mainLeader',  label: 'Líder Principal', idKey: 'mainLeaderId',  nameKey: 'mainLeaderName',  activeKey: 'mainLeaderIsActive'  },
      { role: 'groupLeader', label: 'Líder de Grupo',  idKey: 'groupLeaderId', nameKey: 'groupLeaderName', activeKey: 'groupLeaderIsActive' },
      { role: 'host',        label: 'Anfitrión/a',     idKey: 'hostId',        nameKey: 'hostName',        activeKey: 'hostIsActive'        },
      { role: 'timoteo',     label: 'Timoteo',         idKey: 'timoteoId',     nameKey: 'timoteoName',     activeKey: 'timoteoIsActive'     },
    ];

    // Sin botón desvincular — solo info + badges de estado
    const leaderItem = ({ role, label, idKey, nameKey, activeKey }) => {
      const name     = cell[nameKey];
      const isActive = cell[activeKey];

      return (
        <div key={role} className="mcd-detail-row mcd-detail-row--leader" style={{ borderBottomColor: T.border }}>
          <span className="mcd-detail-label" style={{ color: T.textSub }}>{label}</span>
          <div className="mcd-detail-value-row">
            <span className="mcd-detail-value" style={{ color: T.text }}>{name || '—'}</span>
            <div className="mcd-leader-row-actions">
              {isActive === false && (
                <span className="mcd-badge mcd-badge--warn">⚠ Inactivo</span>
              )}
              {isActive === true && (
                <span className="mcd-badge mcd-badge--ok">✓ Activo</span>
              )}
            </div>
          </div>
        </div>
      );
    };

    const infoItem = (label, value) => (
      <div className="mcd-detail-row" style={{ borderBottomColor: T.border }}>
        <span className="mcd-detail-label" style={{ color: T.textSub }}>{label}</span>
        <span className="mcd-detail-value" style={{ color: T.text }}>{value || '—'}</span>
      </div>
    );

    const pct = cell.occupancyPercentage || 0;
    const barColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981';

    return (
      <div className="mcd-info-grid">
        {/* Tarjeta Liderazgo */}
        <div className="mcd-card" style={{ backgroundColor: T.cardBg, borderColor: T.border }}>
          <div className="mcd-card-title-row">
            <h4 className="mcd-card-title" style={{ color: '#1e40af' }}>👥 Equipo de Liderazgo</h4>
            <button
              className="mcd-btn mcd-btn--sm mcd-btn--secondary"
              style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary, fontSize: '12px' }}
              onClick={() => setActiveTab('edit')}
              title="Ir a editar para cambiar o desvincular líderes"
            >
              ✏️ Gestionar líderes
            </button>
          </div>
          {LEADER_ROLES.map(leaderItem)}
        </div>

        {/* Tarjeta Reunión */}
        <div className="mcd-card" style={{ backgroundColor: T.cardBg, borderColor: T.border }}>
          <h4 className="mcd-card-title" style={{ color: '#1e40af' }}>📍 Reunión</h4>
          {infoItem('Día',       cell.meetingDay)}
          {infoItem('Hora',      cell.meetingTimeFormatted)}
          {infoItem('Dirección', cell.meetingAddress)}
          {infoItem('Distrito',  cell.districtLabel || cell.district)}
        </div>

        {/* Tarjeta Estadísticas */}
        <div className="mcd-card" style={{ backgroundColor: T.cardBg, borderColor: T.border }}>
          <h4 className="mcd-card-title" style={{ color: '#1e40af' }}>📊 Estadísticas</h4>
          {infoItem('Creación',         cell.creationDateFormatted)}
          {infoItem('ID Célula',        `#${cell.id}`)}
          {infoItem('Multiplicaciones', `${cell.multiplicationCount || 0} veces`)}
          <div className="mcd-detail-row" style={{ borderBottomColor: T.border }}>
            <span className="mcd-detail-label" style={{ color: T.textSub }}>Ocupación</span>
            <div className="mcd-occupancy-inline">
              <div className="mcd-occ-bar-track">
                <div className="mcd-occ-bar-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
              <span style={{ color: T.text, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {cell.currentMemberCount || 0} / {cell.maxCapacity || '∞'}
              </span>
            </div>
          </div>
        </div>

        {/* Alertas de liderazgo */}
        {!cell.hasAllLeadersActive && cell.missingOrInactiveLeaders?.length > 0 && (
          <div className="mcd-card mcd-card--warn" style={{ borderColor: '#f59e0b' }}>
            <h4 className="mcd-card-title" style={{ color: '#b45309' }}>⚠️ Problemas Detectados</h4>
            <ul className="mcd-issues-list">
              {cell.missingOrInactiveLeaders.map((issue, i) => (
                <li key={i} style={{ color: T.text }}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Notas */}
        {cell.notes && (
          <div className="mcd-card" style={{ backgroundColor: T.cardBg, borderColor: T.border }}>
            <h4 className="mcd-card-title" style={{ color: '#1e40af' }}>📝 Notas</h4>
            <p style={{ fontSize: '13px', color: T.textSub, lineHeight: 1.6 }}>{cell.notes}</p>
          </div>
        )}
      </div>
    );
  };

  // ── Members tab ───────────────────────────────────────────────────────────────
  const renderMembers = () => (
    <div className="mcd-members">
      <div className="mcd-members-header">
        <span style={{ color: T.textSub, fontSize: '13px' }}>
          {loadingMembers ? 'Cargando miembros…' : `${members.length} miembro${members.length !== 1 ? 's' : ''} registrado${members.length !== 1 ? 's' : ''}`}
        </span>
        <button
          className="mcd-btn mcd-btn--sm mcd-btn--secondary"
          onClick={loadMembers}
          disabled={loadingMembers}
          style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
        >
          🔄 Actualizar
        </button>
      </div>

      {loadingMembers ? (
        <div className="mcd-loading" style={{ color: T.textSub }}>⏳ Cargando…</div>
      ) : members.length === 0 ? (
        <div className="mcd-empty" style={{ color: T.textSub }}>
          <span style={{ fontSize: '32px' }}>👥</span>
          <p>Esta célula no tiene miembros registrados.</p>
          <button
            className="mcd-btn mcd-btn--primary"
            onClick={() => setActiveTab('add')}
          >
            ➕ Agregar primer miembro
          </button>
        </div>
      ) : (
        <div className="mcd-table-wrapper">
          <table className="mcd-table" style={{ borderColor: T.border }}>
            <thead>
              <tr style={{ backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }}>
                {['#', 'Nombre', 'Documento', 'Teléfono', 'Email', 'Acciones'].map(h => (
                  <th key={h} className="mcd-th" style={{ color: T.textSub, borderBottomColor: T.border }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr
                  key={m.id}
                  className="mcd-tr"
                  style={{ backgroundColor: i % 2 === 0 ? T.cardBg : T.rowAlt }}
                >
                  <td className="mcd-td" style={{ color: T.textSub, borderBottomColor: T.border }}>{i + 1}</td>
                  <td className="mcd-td mcd-td--name" style={{ color: T.text, borderBottomColor: T.border }}>
                    <span className="mcd-member-avatar">👤</span>
                    {m.displayName}
                  </td>
                  <td className="mcd-td" style={{ color: T.textSub, borderBottomColor: T.border }}>{m.document || '—'}</td>
                  <td className="mcd-td" style={{ color: T.textSub, borderBottomColor: T.border }}>{m.phone || '—'}</td>
                  <td className="mcd-td" style={{ color: T.textSub, borderBottomColor: T.border }}>{m.email || '—'}</td>
                  <td className="mcd-td" style={{ borderBottomColor: T.border }}>
                    <button
                      className="mcd-btn mcd-btn--sm mcd-btn--danger-ghost"
                      onClick={() => handleRemoveMember(m.id, m.displayName)}
                      disabled={loading}
                      title="Remover de la célula"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── Add member tab ────────────────────────────────────────────────────────────
  const isFull = cell.maxCapacity && cell.currentMemberCount >= cell.maxCapacity;

  const renderAddMember = () => {
    if (isFull) return (
      <div className="mcd-full-cell" style={{ backgroundColor: T.errorBg, color: T.errorText }}>
        <h3>⚠️ Célula llena</h3>
        <p>Esta célula alcanzó su capacidad máxima de {cell.maxCapacity} miembros.</p>
      </div>
    );

    if (addStep === 1) return (
      <div className="mcd-add-step">
        <p className="mcd-add-desc" style={{ color: T.textSub }}>
          Busca el miembro que deseas agregar a <strong style={{ color: T.text }}>{cell.name}</strong>
        </p>
        <div className="mcd-search-row">
          <input
            type="text"
            placeholder="Nombre, documento o email…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="mcd-input"
            style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
            disabled={searching}
          />
          <button
            className="mcd-btn mcd-btn--primary"
            onClick={handleSearch}
            disabled={searching || searchTerm.trim().length < 2}
          >
            {searching ? 'Buscando…' : '🔍 Buscar'}
          </button>
        </div>

        {addError && (
          <div className="mcd-inline-error" style={{ backgroundColor: T.errorBg, color: T.errorText }}>
            ❌ {addError}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mcd-results">
            <p className="mcd-results-count" style={{ color: T.textSub }}>
              {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
            </p>
            <div className="mcd-results-list">
              {searchResults.map(m => (
                <button
                  key={m.id}
                  className="mcd-result-item"
                  style={{ backgroundColor: T.bgSecondary, borderColor: T.border }}
                  onClick={() => { setSelectedMember(m); setAddStep(2); setAddError(''); }}
                >
                  <span className="mcd-result-avatar">👤</span>
                  <div className="mcd-result-info">
                    <span className="mcd-result-name" style={{ color: T.text }}>{m.displayName}</span>
                    <span className="mcd-result-meta" style={{ color: T.textSub }}>
                      {m.document && `🆔 ${m.document}`}
                      {m.phone && ` • 📞 ${m.phone}`}
                      {m.email && ` • 📧 ${m.email}`}
                    </span>
                  </div>
                  <span className="mcd-result-arrow" style={{ color: T.textSub }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    if (addStep === 2) return (
      <div className="mcd-add-step">
        <p className="mcd-add-desc" style={{ color: T.textSub }}>Confirma que deseas agregar este miembro:</p>
        <div className="mcd-confirm-card" style={{ backgroundColor: T.bgSecondary, borderColor: T.border }}>
          <div className="mcd-confirm-member">
            <span className="mcd-confirm-avatar">👤</span>
            <div>
              <div className="mcd-confirm-name" style={{ color: T.text }}>{selectedMember.displayName}</div>
              <div className="mcd-confirm-meta" style={{ color: T.textSub }}>
                {selectedMember.document && `🆔 ${selectedMember.document} • `}
                {selectedMember.phone && `📞 ${selectedMember.phone} • `}
                {selectedMember.email && `📧 ${selectedMember.email}`}
              </div>
            </div>
          </div>
          <div className="mcd-confirm-cell" style={{ borderTopColor: T.border }}>
            <span style={{ color: T.textSub, fontSize: '12px' }}>Será agregado a</span>
            <strong style={{ color: T.text }}>{cell.name}</strong>
          </div>
          <div className="mcd-confirm-warn" style={{ backgroundColor: isDarkMode ? '#78350f20' : '#fff3cd', color: isDarkMode ? '#fbbf24' : '#856404' }}>
            ⚠️ El miembro será agregado inmediatamente.
          </div>
        </div>

        {addError && (
          <div className="mcd-inline-error" style={{ backgroundColor: T.errorBg, color: T.errorText }}>
            ❌ {addError}
          </div>
        )}

        <div className="mcd-confirm-actions">
          <button
            className="mcd-btn mcd-btn--secondary"
            onClick={() => setAddStep(1)}
            disabled={loading}
            style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
          >
            ← Atrás
          </button>
          <button
            className="mcd-btn mcd-btn--primary"
            onClick={handleConfirmAdd}
            disabled={loading}
          >
            {loading ? 'Agregando…' : '✅ Confirmar'}
          </button>
        </div>
      </div>
    );

    if (addStep === 3) return (
      <div className="mcd-add-step mcd-add-step--success">
        <div className="mcd-success-icon">✅</div>
        <h3 style={{ color: T.text }}>¡Miembro agregado!</h3>
        <div className="mcd-success-detail" style={{ backgroundColor: T.successBg, color: T.successText }}>
          <strong>{selectedMember.displayName}</strong> fue agregado a <strong>{cell.name}</strong>
          <br />
          <span style={{ fontSize: '12px' }}>
            Ocupación actual: {addResult?.currentMembers || cell.currentMemberCount} / {cell.maxCapacity || '∞'}
          </span>
        </div>
        <div className="mcd-confirm-actions">
          <button
            className="mcd-btn mcd-btn--secondary"
            onClick={() => { setAddStep(1); setSearchTerm(''); setSearchResults([]); setSelectedMember(null); setAddResult(null); }}
            style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
          >
            ➕ Agregar otro
          </button>
          <button
            className="mcd-btn mcd-btn--primary"
            onClick={() => setActiveTab('members')}
          >
            👥 Ver Miembros
          </button>
        </div>
      </div>
    );
  };

  // ── Edit tab ──────────────────────────────────────────────────────────────────
  const renderEdit = () => {
    // Roles de líderes con sus claves
    const LEADER_ROLES_EDIT = [
      { role: 'mainLeader',  label: 'Líder Principal', idKey: 'mainLeaderId',  nameKey: 'mainLeaderName'  },
      { role: 'groupLeader', label: 'Líder de Grupo',  idKey: 'groupLeaderId', nameKey: 'groupLeaderName' },
      { role: 'host',        label: 'Anfitrión/a',     idKey: 'hostId',        nameKey: 'hostName'        },
      { role: 'timoteo',     label: 'Timoteo',         idKey: 'timoteoId',     nameKey: 'timoteoName'     },
    ];

    const leaderField = (label, idKey, nameKey, role) => (
      <div className="mcd-edit-field" key={idKey}>
        <label className="mcd-edit-label" style={{ color: T.textSub }}>{label}</label>
        <div className="mcd-edit-leader-row">
          <div
            className="mcd-edit-leader-current"
            style={{ backgroundColor: T.bgSecondary, borderColor: T.border, color: T.text }}
          >
            <span className="mcd-edit-leader-avatar">👤</span>
            <span className="mcd-edit-leader-name">
              {editForm[nameKey] || '— Sin asignar —'}
            </span>
          </div>

          {/* Botón Cambiar */}
          <button
            className="mcd-btn mcd-btn--sm mcd-btn--secondary"
            style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
            onClick={() => {
              setLeaderSearchField(idKey);
              setLeaderSearchTerm('');
              setLeaderResults([]);
            }}
            type="button"
            title={`Buscar y asignar un nuevo ${label}`}
          >
            🔄 Cambiar
          </button>

          {/* Botón Desvincular — solo si hay líder asignado */}
          {editForm[idKey] && (
            <button
              className="mcd-btn mcd-btn--sm mcd-btn--ghost-danger"
              onClick={() => setUnlinkTarget({
                leaderId:   editForm[idKey],
                leaderName: editForm[nameKey] || `Líder #${editForm[idKey]}`,
                role,
              })}
              disabled={loading || unlinking}
              type="button"
              title={`Desvincular a ${editForm[nameKey] || 'este líder'} de la célula`}
            >
              ✂️ Desvincular
            </button>
          )}
        </div>

        {/* Inline leader search */}
        {leaderSearchField === idKey && (
          <div className="mcd-leader-search-inline" style={{ borderColor: T.border, backgroundColor: T.bg }}>
            <div className="mcd-search-row">
              <input
                type="text"
                placeholder="Buscar líder por nombre o documento…"
                value={leaderSearchTerm}
                onChange={e => setLeaderSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchLeaders()}
                className="mcd-input"
                style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
                autoFocus
              />
              <button
                className="mcd-btn mcd-btn--primary mcd-btn--sm"
                onClick={handleSearchLeaders}
                disabled={searchingLeaders || leaderSearchTerm.trim().length < 2}
                type="button"
              >
                {searchingLeaders ? '…' : '🔍'}
              </button>
              <button
                className="mcd-btn mcd-btn--sm mcd-btn--secondary"
                style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
                onClick={() => { setLeaderSearchField(null); setLeaderResults([]); }}
                type="button"
              >
                ✕
              </button>
            </div>
            {leaderResults.length > 0 && (
              <div className="mcd-leader-results">
                {leaderResults.map(l => (
                  <button
                    key={l.id}
                    className="mcd-leader-result-item"
                    style={{ backgroundColor: T.bgSecondary, borderColor: T.border, color: T.text }}
                    onClick={() => handleSelectLeader(l)}
                    type="button"
                  >
                    <span>👤</span>
                    <div className="mcd-leader-result-info">
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{l.name || `Líder #${l.id}`}</span>
                      {l.document && <span style={{ color: T.textSub, fontSize: '11px' }}>🆔 {l.document}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );

    return (
      <div className="mcd-edit-form">
        {editError && (
          <div className="mcd-inline-error" style={{ backgroundColor: T.errorBg, color: T.errorText }}>
            ❌ {editError}
          </div>
        )}
        {editSuccess && (
          <div className="mcd-feedback mcd-feedback--success" style={{ backgroundColor: T.successBg, color: T.successText, borderRadius: '10px' }}>
            {editSuccess}
          </div>
        )}

        {/* Información básica */}
        <div className="mcd-card" style={{ backgroundColor: T.cardBg, borderColor: T.border }}>
          <h4 className="mcd-card-title" style={{ color: '#1e40af' }}>📝 Información General</h4>

          <div className="mcd-edit-field">
            <label className="mcd-edit-label" style={{ color: T.textSub }}>Nombre de la célula *</label>
            <input
              type="text"
              value={editForm.name || ''}
              onChange={e => handleEditField('name', e.target.value)}
              className="mcd-input"
              style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
              placeholder="Nombre de la célula"
            />
          </div>

          <div className="mcd-edit-row-2">
            <div className="mcd-edit-field">
              <label className="mcd-edit-label" style={{ color: T.textSub }}>Día de reunión</label>
              <select
                value={editForm.meetingDay || ''}
                onChange={e => handleEditField('meetingDay', e.target.value)}
                className="mcd-input mcd-select"
                style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
              >
                <option value="">— Seleccionar —</option>
                {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="mcd-edit-field">
              <label className="mcd-edit-label" style={{ color: T.textSub }}>Hora de reunión</label>
              <input
                type="time"
                value={editForm.meetingTime || ''}
                onChange={e => handleEditField('meetingTime', e.target.value)}
                className="mcd-input"
                style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
              />
            </div>
          </div>

          <div className="mcd-edit-field">
            <label className="mcd-edit-label" style={{ color: T.textSub }}>Dirección</label>
            <input
              type="text"
              value={editForm.meetingAddress || ''}
              onChange={e => handleEditField('meetingAddress', e.target.value)}
              className="mcd-input"
              style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
              placeholder="Dirección de reunión"
            />
          </div>

          <div className="mcd-edit-row-2">
            <div className="mcd-edit-field">
              <label className="mcd-edit-label" style={{ color: T.textSub }}>Capacidad máxima</label>
              <input
                type="number"
                min="1"
                max="50"
                value={editForm.maxCapacity || ''}
                onChange={e => handleEditField('maxCapacity', e.target.value)}
                className="mcd-input"
                style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
              />
            </div>
            <div className="mcd-edit-field">
              <label className="mcd-edit-label" style={{ color: T.textSub }}>Distrito</label>
              <select
                value={editForm.district || ''}
                onChange={e => handleEditField('district', e.target.value)}
                className="mcd-input mcd-select"
                style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
              >
                <option value="">— Seleccionar —</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="mcd-edit-field">
            <label className="mcd-edit-label" style={{ color: T.textSub }}>Notas</label>
            <textarea
              value={editForm.notes || ''}
              onChange={e => handleEditField('notes', e.target.value)}
              className="mcd-input mcd-textarea"
              style={{ backgroundColor: T.bgSecondary, color: T.text, borderColor: T.border }}
              placeholder="Notas adicionales…"
              rows={3}
            />
          </div>
        </div>

        {/* Líderes — con Cambiar y Desvincular */}
        <div className="mcd-card" style={{ backgroundColor: T.cardBg, borderColor: T.border }}>
          <h4 className="mcd-card-title" style={{ color: '#1e40af' }}>👥 Equipo de Liderazgo</h4>
          <p style={{ fontSize: '12px', color: T.textSub, marginBottom: '12px' }}>
            Usa <strong>🔄 Cambiar</strong> para asignar un nuevo líder, o <strong>✂️ Desvincular</strong> para liberar el rol.
          </p>
          {LEADER_ROLES_EDIT.map(({ label, idKey, nameKey, role }) =>
            leaderField(label, idKey, nameKey, role)
          )}
        </div>

        {/* Botones */}
        <div className="mcd-edit-actions">
          <button
            className="mcd-btn mcd-btn--secondary"
            onClick={() => setActiveTab('info')}
            disabled={editLoading}
            style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
          >
            ← Cancelar
          </button>
          <button
            className="mcd-btn mcd-btn--primary"
            onClick={handleSaveEdit}
            disabled={editLoading}
          >
            {editLoading ? '⏳ Guardando…' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>
    );
  };

  // ── Unlink leader confirmation overlay ───────────────────────────────────────
  const renderUnlinkConfirm = () => {
    if (!unlinkTarget) return null;

    return (
      <div className="mcd-delete-overlay" onClick={() => !unlinking && setUnlinkTarget(null)}>
        <div
          className="mcd-delete-modal"
          style={{ backgroundColor: T.bg, borderColor: T.border }}
          onClick={e => e.stopPropagation()}
        >
          <div className="mcd-delete-icon">✂️</div>
          <h3 className="mcd-delete-title" style={{ color: T.text }}>¿Desvincular este líder?</h3>
          <p className="mcd-delete-desc" style={{ color: T.textSub }}>
            <strong style={{ color: T.text }}>{unlinkTarget.leaderName}</strong> será desvinculado de la célula{' '}
            <strong style={{ color: T.text }}>{cell.name}</strong>.
          </p>

          <div className="mcd-confirm-warn" style={{ backgroundColor: T.warnBg, color: T.warnText, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px' }}>
            ⚠️ El líder quedará libre para ser asignado a otra célula. El estado de la célula se actualizará automáticamente a <strong>Liderazgo Incompleto</strong>.
          </div>

          <div className="mcd-delete-actions">
            <button
              className="mcd-btn mcd-btn--secondary"
              onClick={() => setUnlinkTarget(null)}
              disabled={unlinking}
              style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
            >
              Cancelar
            </button>
            <button
              className="mcd-btn mcd-btn--danger"
              onClick={handleConfirmUnlink}
              disabled={unlinking}
            >
              {unlinking ? '⏳ Desvinculando…' : '✂️ Confirmar Desvinculación'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Delete confirmation overlay ───────────────────────────────────────────────
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="mcd-delete-overlay" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
        <div
          className="mcd-delete-modal"
          style={{ backgroundColor: T.bg, borderColor: T.border }}
          onClick={e => e.stopPropagation()}
        >
          <div className="mcd-delete-icon">🗑️</div>
          <h3 className="mcd-delete-title" style={{ color: T.text }}>¿Eliminar esta célula?</h3>
          <p className="mcd-delete-desc" style={{ color: T.textSub }}>
            Esta acción marcará la célula <strong style={{ color: T.errorText }}>{cell.name}</strong> como inactiva.
            Los miembros serán desvinculados.
          </p>

          <div className="mcd-delete-confirm-box" style={{ backgroundColor: T.errorBg, borderColor: '#ef4444' }}>
            <p style={{ color: T.errorText, fontSize: '12px', fontWeight: 600, margin: '0 0 8px' }}>
              Para confirmar, escribe el nombre de la célula:
            </p>
            <div className="mcd-delete-expected" style={{ color: T.errorText }}>
              {cell.name}
            </div>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="mcd-input"
              style={{ backgroundColor: T.bg, color: T.text, borderColor: deleteConfirmText === cell.name ? '#10b981' : T.border }}
              placeholder="Escribe el nombre aquí…"
              autoFocus
            />
          </div>

          <div className="mcd-delete-actions">
            <button
              className="mcd-btn mcd-btn--secondary"
              onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
              disabled={deleting}
              style={{ borderColor: T.border, color: T.text, backgroundColor: T.bgSecondary }}
            >
              Cancelar
            </button>
            <button
              className="mcd-btn mcd-btn--danger"
              onClick={handleDeleteCell}
              disabled={deleting || deleteConfirmText !== cell.name}
            >
              {deleting ? '⏳ Eliminando…' : '🗑️ Eliminar Célula'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="mcd-overlay" onClick={onClose}>
      <div
        className="mcd-container"
        style={{ backgroundColor: T.bg, color: T.text }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="mcd-header" style={{ borderBottomColor: T.border }}>
          <div className="mcd-header-info">
            <div className="mcd-header-top">
              <span className="mcd-header-icon">🏠</span>
              <div>
                <h2 className="mcd-header-title" style={{ color: T.text }}>{cell.name}</h2>
                <div className="mcd-header-badges">
                  <span
                    className="mcd-status-badge"
                    style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                  >
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                  {cell.districtLabel && (
                    <span
                      className="mcd-district-badge"
                      style={{ backgroundColor: `${cell.districtColor}20`, color: cell.districtColor }}
                    >
                      📍 {cell.districtLabel}
                    </span>
                  )}
                  {cell.isMultiplying && (
                    <span className="mcd-multiplying-badge">🌱 En Multiplicación</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mcd-header-actions">
            <button
              className="mcd-action-btn mcd-action-btn--verify"
              onClick={handleVerify}
              disabled={loading}
              title="Verificar estado de liderazgo"
            >
              🔍 Verificar
            </button>

            <button
              className={`mcd-action-btn ${cell.isMultiplying ? 'mcd-action-btn--complete' : 'mcd-action-btn--multiply'}`}
              onClick={handleMultiplication}
              disabled={loading || (!cell.isMultiplying && !cell.hasAllLeadersActive)}
              title={cell.isMultiplying ? 'Completar multiplicación' : 'Iniciar multiplicación'}
            >
              {cell.isMultiplying ? '✅ Completar Mult.' : '🌱 Multiplicar'}
            </button>

            {/* Menú de estado */}
            <div className="mcd-status-menu-wrapper">
              <button
                className="mcd-action-btn mcd-action-btn--status"
                onClick={() => setShowStatusMenu(v => !v)}
                disabled={loading}
                title="Cambiar estado"
              >
                📌 Estado ▾
              </button>
              {showStatusMenu && (
                <div
                  className="mcd-status-dropdown"
                  style={{ backgroundColor: T.bg, borderColor: T.border }}
                  onMouseLeave={() => setShowStatusMenu(false)}
                >
                  {[
                    { s: 'ACTIVE',    label: '✅ Activa' },
                    { s: 'SUSPENDED', label: '⏸️ Suspendida' },
                    { s: 'INACTIVE',  label: '⏹️ Inactiva' },
                  ].map(({ s, label }) => (
                    <button
                      key={s}
                      className="mcd-dropdown-item"
                      style={{ color: T.text }}
                      onClick={() => handleChangeStatus(s)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className="mcd-action-btn mcd-action-btn--pdf"
              onClick={handleExportPDF}
              disabled={loading}
              title="Exportar PDF de esta célula"
            >
              📄 PDF
            </button>

            <button
              className="mcd-action-btn mcd-action-btn--delete"
              onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
              disabled={loading || deleting}
              title="Eliminar célula"
            >
              🗑️ Eliminar
            </button>

            <button
              className="mcd-close-btn"
              onClick={onClose}
              style={{ color: T.textSub }}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Feedback messages ── */}
        {error && (
          <div className="mcd-feedback mcd-feedback--error" style={{ backgroundColor: T.errorBg, color: T.errorText }}>
            ❌ {error}
          </div>
        )}
        {successMsg && (
          <div className="mcd-feedback mcd-feedback--success" style={{ backgroundColor: T.successBg, color: T.successText }}>
            {successMsg}
          </div>
        )}

        {/* ── TABS ── */}
        <div className="mcd-tabs" style={{ borderBottomColor: T.border }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`mcd-tab ${isActive ? 'mcd-tab--active' : ''}`}
                style={{
                  color: isActive ? '#1e40af' : T.textSub,
                  borderBottomColor: isActive ? '#1e40af' : 'transparent',
                  backgroundColor: 'transparent',
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'members' && members.length > 0 && (
                  <span className="mcd-tab-count">{members.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── CONTENT ── */}
        <div className="mcd-body">
          {activeTab === 'info'    && renderInfo()}
          {activeTab === 'members' && renderMembers()}
          {activeTab === 'add'     && renderAddMember()}
          {activeTab === 'edit'    && renderEdit()}
        </div>

        {/* ── OVERLAYS ── */}
        {renderUnlinkConfirm()}
        {renderDeleteConfirm()}
      </div>
    </div>
  );
};

export default ModalCellDetail;