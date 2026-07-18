import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Users, MapPin, Video, Clock, Search, Trash2, Edit3, XCircle, 
  Check, X, Lock, Unlock, BarChart3, Flame, Sparkles, Plus, 
  RotateCcw, FileText, CheckSquare, Square, AlertTriangle, ChevronRight, Filter, ExternalLink
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import apiService from '../apiService';
import { useAuth } from '../context/AuthContext';
import { useConfirmation } from '../context/ConfirmationContext';
import PageHeader from '../components/PageHeader';

// Tipos de Convocatoria oficiales y sus nombres amigables
const CONVOCATION_TYPES = [
  { value: 'LIDERES_12_HOMBRES', label: 'Líderes 12 – Hombres' },
  { value: 'LIDERES_12_MUJERES', label: 'Líderes 12 – Mujeres' },
  { value: 'LIDERES_144_HOMBRES', label: 'Líderes 144 – Hombres' },
  { value: 'LIDERES_144_MUJERES', label: 'Líderes 144 – Mujeres' },
  { value: 'CELLGROUP_HOMBRES_LEADER', label: 'Equipos Células Hombres (Líderes)' },
  { value: 'CELLGROUP_HOMBRES_HOST', label: 'Equipos Células Hombres (Anfitriones)' },
  { value: 'CELLGROUP_HOMBRES_TIMOTEO', label: 'Equipos Células Hombres (Timoteos)' },
  { value: 'CELLGROUP_MUJERES_LEADER', label: 'Equipos Células Mujeres (Líderes)' },
  { value: 'CELLGROUP_MUJERES_HOST', label: 'Equipos Células Mujeres (Anfitriones)' },
  { value: 'CELLGROUP_MUJERES_TIMOTEO', label: 'Equipos Células Mujeres (Timoteos)' },
  { value: 'ESPECIAL', label: 'Especial (Selección manual)' },
];

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

const formatTimeWithSeconds = (timeStr) => {
  if (!timeStr) return null;
  if (timeStr.length === 5) return timeStr + ':00';
  return timeStr;
};

export default function MeetingsPage() {
  const { user } = useAuth();
  const confirm = useConfirmation();

  // Tab principal: "list" o "dashboard"
  const [activeTab, setActiveTab] = useState('list');
  
  // Estados para Citaciones
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtros de Listado
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    convocationType: ''
  });

  // Modal Crear/Editar
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    subject: '',
    description: '',
    meetingDate: '',
    startTime: '',
    endTime: '',
    location: '',
    modality: 'PRESENCIAL',
    meetingLink: '',
    convocationTypes: [],
    specialLeaderIds: [],
    recurrence: null
  });

  // Recurrencia config
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceConfig, setRecurrenceConfig] = useState({
    frequency: 'SEMANAL',
    startDate: '',
    endDate: '',
    dayOfWeek: 'MONDAY',
    maxOccurrences: ''
  });

  // Lista de líderes cargados del sistema (para convocatoria especial)
  const [allLeaders, setAllLeaders] = useState([]);
  const [leaderSearch, setLeaderSearch] = useState('');
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);

  // Conflictos detectados
  const [conflictWarnings, setConflictWarnings] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Modal Detalle y Registro de Asistencia
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState('');

  // Reprogramar Modal
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    newDate: '',
    newStartTime: '',
    newEndTime: '',
    newLocation: '',
    newMeetingLink: ''
  });

  // Cancelar Modal
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Estados del Dashboard
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardFilters, setDashboardFilters] = useState({
    dateFrom: '',
    dateTo: ''
  });
  const [rankingData, setRankingData] = useState([]);
  const [rankingSortBy, setRankingSortBy] = useState('absence_desc');
  const [rankingPage, setRankingPage] = useState(0);
  const [rankingTotalPages, setRankingTotalPages] = useState(0);
  const [rankingTotalElements, setRankingTotalElements] = useState(0);
  const [rankingPageSize] = useState(10);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);

  // Cargar datos
  const loadMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMeetings(filters);
      setMeetings(data || []);
    } catch (err) {
      setError(err.message || 'Error al obtener citaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaders = async () => {
    try {
      const data = await apiService.getLeaders();
      setAllLeaders(data || []);
    } catch (err) {
      console.error('Error cargando líderes:', err);
    }
  };

  const loadDashboard = async () => {
    try {
      setDashboardLoading(true);
      const dash = await apiService.getMeetingDashboard(dashboardFilters);
      setDashboardData(dash);
    } catch (err) {
      console.error('Error cargando dashboard de citaciones:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadRanking = async () => {
    try {
      setRankingLoading(true);
      const res = await apiService.getMeetingRanking({ ...dashboardFilters, sortBy: rankingSortBy }, rankingPage, rankingPageSize);
      setRankingData(res.content || []);
      setRankingTotalPages(res.totalPages || 0);
      setRankingTotalElements(res.totalElements || 0);
    } catch (err) {
      console.error('Error cargando ranking:', err);
    } finally {
      setRankingLoading(false);
    }
  };

  // Resetear página de ranking cuando cambien filtros o la ordenación
  useEffect(() => {
    setRankingPage(0);
  }, [dashboardFilters, rankingSortBy]);

  useEffect(() => {
    if (activeTab === 'list') {
      loadMeetings();
    } else if (activeTab === 'dashboard') {
      loadDashboard();
    } else if (activeTab === 'ranking') {
      loadRanking();
    }
  }, [activeTab, filters, dashboardFilters, rankingSortBy, rankingPage]);

  useEffect(() => {
    loadLeaders();
  }, []);

  // Crear Reunión
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      // Validar tipo especial
      if (newMeeting.convocationTypes.includes('ESPECIAL') && newMeeting.specialLeaderIds.length === 0) {
        setError('Debe seleccionar al menos un servidor para la convocatoria Especial');
        return;
      }

      const payload = {
        ...newMeeting,
        startTime: formatTimeWithSeconds(newMeeting.startTime),
        endTime: formatTimeWithSeconds(newMeeting.endTime),
        convocationTypes: newMeeting.convocationTypes,
        recurrence: recurrenceEnabled ? {
          ...recurrenceConfig,
          maxOccurrences: recurrenceConfig.maxOccurrences ? parseInt(recurrenceConfig.maxOccurrences) : null,
          endDate: recurrenceConfig.endDate || null
        } : null
      };

      await apiService.createMeeting(payload);
      setIsCreateModalOpen(false);
      // Reset form
      setNewMeeting({
        subject: '',
        description: '',
        meetingDate: '',
        startTime: '',
        endTime: '',
        location: '',
        modality: 'PRESENCIAL',
        meetingLink: '',
        convocationTypes: [],
        specialLeaderIds: [],
        recurrence: null
      });
      setRecurrenceEnabled(false);
      setConflictWarnings([]);
      loadMeetings();
    } catch (err) {
      setError(err.message || 'Error al guardar citación');
    }
  };

  // Verificar conflictos preventivos
  const checkConflicts = async () => {
    if (!newMeeting.meetingDate || !newMeeting.startTime || !newMeeting.endTime || newMeeting.convocationTypes.length === 0) {
      alert('Por favor complete fecha, hora de inicio, hora de fin y al menos un tipo de convocatoria para validar conflictos.');
      return;
    }
    try {
      setCheckingConflicts(true);
      const payload = {
        ...newMeeting,
        startTime: formatTimeWithSeconds(newMeeting.startTime),
        endTime: formatTimeWithSeconds(newMeeting.endTime),
        recurrence: null
      };
      const res = await apiService.checkMeetingConflicts(payload);
      setConflictWarnings(res || []);
      if (res && res.length === 0) {
        alert('✅ ¡Excelente! No se detectaron conflictos de horario para los convocados.');
      }
    } catch (err) {
      alert('Error verificando conflictos: ' + err.message);
    } finally {
      setCheckingConflicts(false);
    }
  };

  // Ver detalle
  const viewDetail = async (id) => {
    try {
      setLoading(true);
      const detail = await apiService.getMeeting(id);
      setSelectedMeeting(detail);
      setAttendanceRecords(detail.attendees || []);
      setIsDetailModalOpen(true);
    } catch (err) {
      alert('Error cargando detalle: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Guardar asistencia individual
  const updateAttendanceStatus = async (attendeeId, status) => {
    try {
      let changeNote = '';
      if (selectedMeeting?.attendanceLocked) {
        changeNote = prompt('Esta reunión ya está finalizada. Por favor ingresa el motivo del cambio de asistencia:');
        if (changeNote === null) return; // cancelado
      }

      const res = await apiService.updateMeetingAttendance(attendeeId, { status, changeNote });
      // Actualizar listado local
      setAttendanceRecords(prev => prev.map(rec => rec.attendeeId === attendeeId ? { 
        ...rec, 
        attendanceStatus: res.attendanceStatus,
        recordedByUsername: res.recordedByUsername,
        recordedAt: res.recordedAt
      } : rec));
    } catch (err) {
      alert('Error al registrar asistencia: ' + err.message);
    }
  };

  // Registrar asistencia en lote (Asistieron todos / Faltaron todos)
  const handleBulkAttendance = async (status) => {
    const isConfirmed = await confirm({
      title: "¿Registrar Asistencia en Lote?",
      message: `¿Estás seguro de marcar a todos los servidores filtrados como '${status}'?`,
      type: "info",
      confirmLabel: "Marcar Todos",
    });

    if (!isConfirmed) return;

    try {
      setSavingAttendance(true);
      let changeNote = '';
      if (selectedMeeting?.attendanceLocked) {
        changeNote = prompt('Reunión finalizada. Ingresa el motivo del cambio general:');
        if (changeNote === null) return;
      }

      // Filtrar los que están en la vista actual
      const itemsToUpdate = filteredAttendance.map(a => ({
        attendeeId: a.attendeeId,
        status,
        changeNote
      }));

      await apiService.bulkUpdateMeetingAttendance(selectedMeeting.id, itemsToUpdate);
      
      // Volver a cargar el detalle para refrescar todo
      const detail = await apiService.getMeeting(selectedMeeting.id);
      setSelectedMeeting(detail);
      setAttendanceRecords(detail.attendees || []);
    } catch (err) {
      alert('Error al guardar asistencia en lote: ' + err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Reprogramar
  const handleReschedule = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...rescheduleData,
        newStartTime: formatTimeWithSeconds(rescheduleData.newStartTime),
        newEndTime: formatTimeWithSeconds(rescheduleData.newEndTime)
      };
      const res = await apiService.rescheduleMeeting(selectedMeeting.id, payload);
      setIsRescheduleOpen(false);
      setSelectedMeeting(res);
      loadMeetings();
      alert('✅ Citación reprogramada con éxito. Se enviaron notificaciones a los servidores.');
    } catch (err) {
      alert('Error al reprogramar: ' + err.message);
    }
  };

  // Cancelar
  const handleCancel = async (e) => {
    e.preventDefault();
    try {
      const res = await apiService.cancelMeeting(selectedMeeting.id, { reason: cancelReason });
      setIsCancelOpen(false);
      setSelectedMeeting(res);
      loadMeetings();
      alert('❌ Citación cancelada con éxito. Se notificó a todos los convocados.');
    } catch (err) {
      alert('Error al cancelar: ' + err.message);
    }
  };

  // Borrar Citación
  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: "⚠ ¿Borrar Citación Definitivamente?",
      message: "Esta acción eliminará definitivamente la citación.\n\nLos convocados recibirán una notificación de cancelación por Telegram.\n\nEsta acción no se puede deshacer. ¿Desea continuar?",
      type: "danger",
      confirmLabel: "Borrar Citación",
      cancelLabel: "Cancelar"
    });

    if (!isConfirmed) return;

    try {
      await apiService.deleteMeeting(selectedMeeting.id);
      setSelectedMeeting(null);
      loadMeetings();
      alert('🗑️ Citación eliminada con éxito. Se notificó a los convocados sobre la cancelación.');
    } catch (err) {
      alert('Error al borrar citación: ' + err.message);
    }
  };

  // Finalizar
  const handleFinalize = async () => {
    const isConfirmed = await confirm({
      title: "¿Finalizar Reunión?",
      message: "Esta acción bloqueará el registro de asistencia y marcará a los pendientes como inasistentes. ¿Deseas continuar?",
      type: "warning",
      confirmLabel: "Finalizar Reunión",
    });

    if (!isConfirmed) return;

    try {
      const res = await apiService.finalizeMeeting(selectedMeeting.id);
      setSelectedMeeting(res);
      setAttendanceRecords(res.attendees || []);
      loadMeetings();
      alert('🔒 Reunión finalizada con éxito. Asistencia bloqueada.');
    } catch (err) {
      alert('Error al finalizar reunión: ' + err.message);
    }
  };

  // Filtros aplicados a lista de asistencia
  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter(rec => {
      const matchesSearch = rec.leaderName.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                            (rec.cellGroupName && rec.cellGroupName.toLowerCase().includes(attendanceSearch.toLowerCase()));
      const matchesStatus = attendanceFilterStatus ? rec.attendanceStatus === attendanceFilterStatus : true;
      return matchesSearch && matchesStatus;
    });
  }, [attendanceRecords, attendanceSearch, attendanceFilterStatus]);

  // Selección de líderes para Especial
  const filteredLeadersForSpecial = useMemo(() => {
    return allLeaders.filter(l => {
      const name = l.memberName || '';
      return name.toLowerCase().includes(leaderSearch.toLowerCase());
    });
  }, [allLeaders, leaderSearch]);

  const toggleSpecialLeader = (id) => {
    setNewMeeting(prev => {
      const ids = prev.specialLeaderIds.includes(id)
        ? prev.specialLeaderIds.filter(x => x !== id)
        : [...prev.specialLeaderIds, id];
      return { ...prev, specialLeaderIds: ids };
    });
  };

  const toggleConvocationType = (val) => {
    setNewMeeting(prev => {
      const types = prev.convocationTypes.includes(val)
        ? prev.convocationTypes.filter(x => x !== val)
        : [...prev.convocationTypes, val];
      return { ...prev, convocationTypes: types };
    });
  };

  // Recharts data transformation
  const chartData = useMemo(() => {
    if (!dashboardData || !dashboardData.meetingsByType) return [];
    return Object.entries(dashboardData.meetingsByType).map(([name, value]) => ({
      name,
      cantidad: value
    }));
  }, [dashboardData]);

  const attendancePieData = useMemo(() => {
    if (!dashboardData) return [];
    return [
      { name: 'Asistió', value: dashboardData.totalAttended, color: '#10b981' },
      { name: 'No Asistió', value: dashboardData.totalAbsent, color: '#ef4444' },
      { name: 'Pendiente', value: dashboardData.totalPending, color: '#f59e0b' }
    ].filter(x => x.value > 0);
  }, [dashboardData]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <PageHeader 
        title="Citaciones Pastorales" 
        subtitle="Administra, programa y realiza el control de asistencia de las reuniones de servidores."
        icon={Calendar}
        actions={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={2.5} /> Programar Citación
          </button>
        }
      />

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-6 py-4 font-black text-sm tracking-tight border-b-2 transition-all ${
            activeTab === 'list'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar size={18} /> Historial y Programación
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-4 font-black text-sm tracking-tight border-b-2 transition-all ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 size={18} /> Métricas Generales
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex items-center gap-2 px-6 py-4 font-black text-sm tracking-tight border-b-2 transition-all ${
            activeTab === 'ranking'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Flame size={18} /> Alerta y Ranking
        </button>
      </div>

      {/* ERROR PANEL */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold">
          <AlertTriangle size={20} /> {error}
        </div>
      )}

      {/* TAB 1: LIST / PROGRAMACIÓN */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          
          {/* BARRA DE FILTROS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estado</label>
              <select
                value={filters.status}
                onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Todos los Estados</option>
                <option value="PROGRAMADA">Programada</option>
                <option value="REPROGRAMADA">Reprogramada</option>
                <option value="FINALIZADA">Finalizada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Convocatoria</label>
              <select
                value={filters.convocationType}
                onChange={e => setFilters(prev => ({ ...prev, convocationType: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Todas las Convocatorias</option>
                {CONVOCATION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* LISTADO DE CITACIONES */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-bold">Cargando citaciones...</div>
          ) : meetings.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <Calendar className="mx-auto text-slate-350 dark:text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Sin citaciones programadas</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Intenta ajustando los filtros o crea una nueva citación para comenzar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map(m => {
                const isFinalized = m.status === 'FINALIZADA';
                const isCancelled = m.status === 'CANCELADA';
                const isRescheduled = m.status === 'REPROGRAMADA';

                return (
                  <div 
                    key={m.id}
                    className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                          isFinalized ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' :
                          isCancelled ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450' :
                          isRescheduled ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450' :
                          'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {m.status}
                        </span>
                        {m.isRecurring && (
                          <span className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                            <RotateCcw size={10} className="animate-spin-slow" /> Recurrente
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {m.subject}
                      </h3>

                      <div className="space-y-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span>{m.meetingDate} de {m.startTime} a {m.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          <span>{m.location} ({m.modality})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-slate-400" />
                          <span>{m.totalAttendees} convocados • Asistidos: {m.attendedCount} / Faltaron: {m.absentCount}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => viewDetail(m.id)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-xs text-slate-700 dark:text-slate-300 transition-all"
                    >
                      Asistencias y Detalles <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: METRICAS / DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* FILTROS DASHBOARD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Desde</label>
              <input
                type="date"
                value={dashboardFilters.dateFrom}
                onChange={e => setDashboardFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hasta</label>
              <input
                type="date"
                value={dashboardFilters.dateTo}
                onChange={e => setDashboardFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* INDICADORES CLAVE */}
          {dashboardLoading ? (
            <div className="text-center p-8 text-slate-500">Cargando métricas...</div>
          ) : dashboardData && (
            <div className="space-y-8 animate-in fade-in duration-500">
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/30 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Totales</p>
                  <h4 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{dashboardData.totalMeetings}</h4>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Finalizadas</p>
                  <h4 className="text-3xl font-black text-slate-800 dark:text-white">{dashboardData.finalizedMeetings}</h4>
                </div>
                <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/30 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Reprogramadas</p>
                  <h4 className="text-3xl font-black text-amber-600 dark:text-amber-400">{dashboardData.rescheduledMeetings}</h4>
                </div>
                <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/30 rounded-3xl">
                  <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest mb-1">Canceladas</p>
                  <h4 className="text-3xl font-black text-rose-600 dark:text-rose-450">{dashboardData.cancelledMeetings}</h4>
                </div>
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30 rounded-3xl col-span-2 md:col-span-1">
                  <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Asistencia Promedio</p>
                  <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-450">{dashboardData.avgAttendanceRate}%</h4>
                </div>
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Distribución por tipo */}
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl">
                  <h3 className="text-md font-black text-slate-900 dark:text-white mb-4">Citaciones por Tipo de Convocatoria</h3>
                  <div className="h-64">
                    {chartData.length === 0 ? (
                      <p className="text-sm font-semibold text-slate-500 p-12 text-center">Sin suficientes datos para graficar</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="cantidad" fill="#6366f1" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Distribución de asistencia */}
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl">
                  <h3 className="text-md font-black text-slate-900 dark:text-white mb-4">Asistencia Global Acumulada</h3>
                  <div className="h-64 flex flex-col sm:flex-row items-center justify-around">
                    {attendancePieData.length === 0 ? (
                      <p className="text-sm font-semibold text-slate-500 p-12 text-center">Sin suficientes datos de asistencia</p>
                    ) : (
                      <>
                        <ResponsiveContainer width="60%" height="100%">
                          <PieChart>
                            <Pie
                              data={attendancePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {attendancePieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 text-xs font-semibold text-slate-650 dark:text-slate-350">
                          {attendancePieData.map((x, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: x.color }} />
                              <span>{x.name}: <b>{x.value}</b></span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* PREVIEW DE ABSENTISMO / RACHAS */}
              {dashboardData.ranking && dashboardData.ranking.length > 0 && (
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center">
                        <Flame size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Alerta de Absentismo (Top 5)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Servidores con mayores rachas o ausencias recientes.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('ranking')}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      Ver ranking completo <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-3 px-4">Servidor</th>
                          <th className="py-3 px-4">Cargo / Red</th>
                          <th className="py-3 px-4 text-center">Convocado</th>
                          <th className="py-3 px-4 text-center">% Asistencia</th>
                          <th className="py-3 px-4 text-center">Racha Faltas 🚨</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {dashboardData.ranking.slice(0, 5).map(r => (
                          <tr key={r.leaderId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-850 dark:text-white">{r.leaderName}</td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs block text-slate-500 dark:text-slate-400">{r.leaderType}</span>
                              <span className="text-[10px] text-slate-400">{r.cellGroupName || 'Sin Altar'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">{r.totalInvitations}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${
                                r.attendanceRate >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' :
                                r.attendanceRate >= 50 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450' :
                                'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455'
                              }`}>
                                {r.attendanceRate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {r.currentAbsenceStreak > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-lg text-xs font-black animate-pulse">
                                  <Flame size={12} /> {r.currentAbsenceStreak} {r.currentAbsenceStreak >= 2 && '🚨'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* TAB 3: ALERTA Y RANKING PAGINADO */}
      {activeTab === 'ranking' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* FILTROS RANKING */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Desde</label>
              <input
                type="date"
                value={dashboardFilters.dateFrom}
                onChange={e => setDashboardFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hasta</label>
              <input
                type="date"
                value={dashboardFilters.dateTo}
                onChange={e => setDashboardFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ordenar Ranking</label>
              <select
                value={rankingSortBy}
                onChange={e => setRankingSortBy(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="absence_desc">Mayor inasistencia consecutiva (Racha 🚨)</option>
                <option value="attendance_desc">Mejor porcentaje de asistencia (% ⭐)</option>
                <option value="attendance_asc">Menor porcentaje de asistencia (% ⚠️)</option>
              </select>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl flex items-center justify-center">
                <Flame size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Ranking de Asistencia General</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Listado completo y ordenado de todos los servidores convocados.</p>
              </div>
            </div>

            {rankingLoading ? (
              <div className="text-center p-12 text-slate-500">Cargando servidores convocados...</div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Servidor</th>
                        <th className="py-3 px-4">Cargo / Red</th>
                        <th className="py-3 px-4 text-center">Convocado</th>
                        <th className="py-3 px-4 text-center">Asistió</th>
                        <th className="py-3 px-4 text-center">Faltó</th>
                        <th className="py-3 px-4 text-center">% Asistencia</th>
                        <th className="py-3 px-4 text-center">Racha Faltas 🚨</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {rankingData.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-sm font-semibold text-slate-500">
                            No se encontraron servidores en el ranking para este período.
                          </td>
                        </tr>
                      ) : (
                        rankingData.map(r => (
                          <tr key={r.leaderId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-850 dark:text-white">{r.leaderName}</td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs block text-slate-500 dark:text-slate-400">{r.leaderType}</span>
                              <span className="text-[10px] text-slate-400">{r.cellGroupName || 'Sin Altar'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">{r.totalInvitations}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-450">{r.totalAttended}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-rose-500">{r.totalAbsent}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${
                                r.attendanceRate >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' :
                                r.attendanceRate >= 50 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450' :
                                'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455'
                              }`}>
                                {r.attendanceRate}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {r.currentAbsenceStreak > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-lg text-xs font-black animate-pulse">
                                  <Flame size={12} /> {r.currentAbsenceStreak} {r.currentAbsenceStreak >= 2 && '🚨'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINACIÓN */}
                {rankingTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500">
                      Mostrando {rankingData.length} de {rankingTotalElements} servidores (Página {rankingPage + 1} de {rankingTotalPages})
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRankingPage(p => Math.max(0, p - 1))}
                        disabled={rankingPage === 0 || rankingLoading}
                        className="px-4 py-2 text-xs font-black bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setRankingPage(p => Math.min(rankingTotalPages - 1, p + 1))}
                        disabled={rankingPage >= rankingTotalPages - 1 || rankingLoading}
                        className="px-4 py-2 text-xs font-black bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREAR CITACIÓN ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800">
            
            <div className="flex justify-between items-center p-8 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Programar Nueva Citación</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure los detalles, los grupos a convocar y las reglas de recurrencia.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-8 space-y-6">
              
              {/* Campos generales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Asunto de la reunión</label>
                  <input
                    type="text"
                    required
                    value={newMeeting.subject}
                    onChange={e => setNewMeeting(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ej. Discipulado de Líderes de 12"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Descripción / Temario (Opcional)</label>
                  <textarea
                    value={newMeeting.description}
                    onChange={e => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detalles sobre los temas a tratar o consignas..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Fecha de la Citación</label>
                  <input
                    type="date"
                    required
                    value={newMeeting.meetingDate}
                    onChange={e => setNewMeeting(prev => ({ ...prev, meetingDate: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Hora Inicio</label>
                    <input
                      type="time"
                      required
                      value={newMeeting.startTime}
                      onChange={e => setNewMeeting(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Hora Fin</label>
                    <input
                      type="time"
                      required
                      value={newMeeting.endTime}
                      onChange={e => setNewMeeting(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Lugar / Ubicación</label>
                  <input
                    type="text"
                    required
                    value={newMeeting.location}
                    onChange={e => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ej. Templo Principal"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Modalidad</label>
                  <select
                    value={newMeeting.modality}
                    onChange={e => setNewMeeting(prev => ({ ...prev, modality: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                  </select>
                </div>

                {newMeeting.modality === 'VIRTUAL' && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Enlace de la Reunión Virtual</label>
                    <input
                      type="url"
                      value={newMeeting.meetingLink}
                      onChange={e => setNewMeeting(prev => ({ ...prev, meetingLink: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                )}
              </div>

              {/* CONVOCATORIAS */}
              <div className="space-y-3 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Grupos y Servidores a Convocar</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONVOCATION_TYPES.map(type => {
                    const isSelected = newMeeting.convocationTypes.includes(type.value);
                    return (
                      <button
                        type="button"
                        key={type.value}
                        onClick={() => toggleConvocationType(type.value)}
                        className={`flex items-center gap-3 p-3 rounded-2xl text-left text-xs font-semibold border transition-all ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400' 
                            : 'bg-white border-slate-100 hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        {type.label}
                      </button>
                    );
                  })}
                </div>

                {/* Buscador y listado si es especial */}
                {newMeeting.convocationTypes.includes('ESPECIAL') && (
                  <div className="mt-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-2xl space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Convocados Especiales ({newMeeting.specialLeaderIds.length})</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Buscar servidores por nombre..."
                        value={leaderSearch}
                        onChange={e => {
                          setLeaderSearch(e.target.value);
                          setShowLeaderDropdown(true);
                        }}
                        onFocus={() => setShowLeaderDropdown(true)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                      />

                      {/* Dropdown de búsqueda */}
                      {showLeaderDropdown && (
                        <>
                          <div className="fixed inset-0 z-[190]" onClick={() => setShowLeaderDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar p-2 z-[200]">
                            {filteredLeadersForSpecial.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-400">No se encontraron servidores</div>
                            ) : (
                              filteredLeadersForSpecial.map(l => {
                                const name = l.memberName || 'N/D';
                                const isAdded = newMeeting.specialLeaderIds.includes(l.id);
                                return (
                                  <button
                                    type="button"
                                    key={l.id}
                                    onClick={() => {
                                      toggleSpecialLeader(l.id);
                                      setShowLeaderDropdown(false);
                                      setLeaderSearch('');
                                    }}
                                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-semibold transition-colors ${
                                      isAdded ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span>{name} <span className="text-[10px] text-slate-400">({l.leaderType})</span></span>
                                    {isAdded ? <Check size={14} /> : <Plus size={14} />}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Servidores seleccionados */}
                    {newMeeting.specialLeaderIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {newMeeting.specialLeaderIds.map(id => {
                          const l = allLeaders.find(leader => leader.id === id);
                          if (!l) return null;
                          return (
                            <span key={id} className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-xl text-[10px] font-black border border-indigo-100 dark:border-indigo-900/30">
                              {l.memberName}
                              <button
                                type="button"
                                onClick={() => toggleSpecialLeader(id)}
                                className="text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RECURRENCIA CONFIG */}
              <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Generación Recurrente</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Permite programar la repetición automática de esta reunión.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRecurrenceEnabled(!recurrenceEnabled)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      recurrenceEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      recurrenceEnabled ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                {recurrenceEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Frecuencia</label>
                      <select
                        value={recurrenceConfig.frequency}
                        onChange={e => setRecurrenceConfig(prev => ({ ...prev, frequency: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                      >
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINCENAL">Quincenal</option>
                        <option value="MENSUAL">Mensual</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Día de la semana</label>
                      <select
                        value={recurrenceConfig.dayOfWeek}
                        onChange={e => setRecurrenceConfig(prev => ({ ...prev, dayOfWeek: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                      >
                        <option value="MONDAY">Lunes</option>
                        <option value="TUESDAY">Martes</option>
                        <option value="WEDNESDAY">Miércoles</option>
                        <option value="THURSDAY">Jueves</option>
                        <option value="FRIDAY">Viernes</option>
                        <option value="SATURDAY">Sábado</option>
                        <option value="SUNDAY">Domingo</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Ocurrencias Máx.</label>
                      <input
                        type="number"
                        placeholder="Sin límite"
                        value={recurrenceConfig.maxOccurrences}
                        onChange={e => setRecurrenceConfig(prev => ({ ...prev, maxOccurrences: e.target.value }))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* WARNING DE CONFLICTOS PREVENTIVOS */}
              {conflictWarnings.length > 0 && (
                <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-3xl space-y-2">
                  <h5 className="text-xs font-black text-amber-700 dark:text-amber-450 flex items-center gap-2">
                    <AlertTriangle size={16} /> ¡Atención! Conflictos de Horario Detectados
                  </h5>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Los siguientes servidores tienen otras citaciones activas en este rango de horario:</p>
                  <ul className="text-[10px] text-amber-600 dark:text-amber-400 space-y-1 font-semibold pl-4 list-disc">
                    {conflictWarnings.map((w, idx) => (
                      <li key={idx}>
                        <b>{w.leaderName}</b> convocado a <i>"{w.conflictingMeetingSubject}"</i> ({w.conflictingDate} de {w.conflictingStartTime} a {w.conflictingEndTime})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Botonera modal */}
              <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={checkConflicts}
                  disabled={checkingConflicts}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs transition-all"
                >
                  {checkingConflicts ? 'Validando...' : 'Verificar Conflictos'}
                </button>
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 sm:flex-initial px-5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-350 rounded-2xl font-bold text-xs transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-600/10 transition-all"
                  >
                    Programar e Invitar
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DETALLE Y CONTROL DE ASISTENCIA ==================== */}
      {isDetailModalOpen && selectedMeeting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-800">
            
            <div className="flex justify-between items-start p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                    selectedMeeting.status === 'FINALIZADA' ? 'bg-slate-100 dark:bg-slate-850 text-slate-500' :
                    selectedMeeting.status === 'CANCELADA' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500' :
                    'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {selectedMeeting.status}
                  </span>
                  {selectedMeeting.attendanceLocked && (
                    <span className="px-2.5 py-0.5 text-[9px] font-black uppercase bg-slate-100 text-slate-500 rounded-md flex items-center gap-1">
                      <Lock size={10} /> Asistencia Bloqueada
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{selectedMeeting.subject}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedMeeting.description || 'Sin descripción'}</p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Columna Izquierda: Información y Acciones */}
              <div className="lg:col-span-4 space-y-6">
                
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Detalles de Citación</h4>
                  <div className="space-y-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-slate-400" />
                      <span>{selectedMeeting.meetingDate} de {selectedMeeting.startTime} a {selectedMeeting.endTime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-slate-400" />
                      <span>{selectedMeeting.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Video size={16} className="text-slate-400" />
                      <span>{selectedMeeting.modality}</span>
                    </div>
                    {selectedMeeting.meetingLink && (
                      <div className="flex items-center gap-3">
                        <ExternalLink size={16} className="text-slate-400" />
                        <a href={selectedMeeting.meetingLink} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                          Unirse a videollamada <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estadísticas de Asistencia */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Métricas de la Citación</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
                      <p className="text-[9px] font-black uppercase">Asistió</p>
                      <h5 className="text-lg font-black">{selectedMeeting.attendedCount}</h5>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
                      <p className="text-[9px] font-black uppercase">Faltó</p>
                      <h5 className="text-lg font-black">{selectedMeeting.absentCount}</h5>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
                      <p className="text-[9px] font-black uppercase">Pendiente</p>
                      <h5 className="text-lg font-black">{selectedMeeting.pendingCount}</h5>
                    </div>
                  </div>
                </div>

                {/* Acciones Pastorales */}
                <div className="space-y-2.5">
                  {selectedMeeting.status !== 'FINALIZADA' && selectedMeeting.status !== 'CANCELADA' && (
                    <>
                      <button
                        onClick={handleFinalize}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-2xl font-black text-xs transition-all shadow-md"
                      >
                        <Lock size={14} /> Finalizar y Cerrar Asistencia
                      </button>

                      <button
                        onClick={() => {
                          setRescheduleData({
                            newDate: selectedMeeting.meetingDate,
                            newStartTime: selectedMeeting.startTime,
                            newEndTime: selectedMeeting.endTime,
                            newLocation: selectedMeeting.location,
                            newMeetingLink: selectedMeeting.meetingLink || ''
                          });
                          setIsRescheduleOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xs transition-all"
                      >
                        <Edit3 size={14} /> Reprogramar Fecha/Hora
                      </button>

                      <button
                        onClick={() => {
                          setCancelReason('');
                          setIsCancelOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 dark:text-rose-450 rounded-2xl font-black text-xs transition-all"
                      >
                        <XCircle size={14} /> Cancelar Citación
                      </button>

                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs transition-all shadow-sm transition-all"
                      >
                        <Trash2 size={14} /> Borrar Citación
                      </button>
                    </>
                  )}
                </div>

                {/* Historial de Auditoría */}
                {selectedMeeting.auditLogs && selectedMeeting.auditLogs.length > 0 && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Historial de Auditoría</h4>
                    <div className="max-h-40 overflow-y-auto space-y-3 custom-scrollbar pr-2 text-[11px] font-semibold text-slate-500 dark:text-slate-450">
                      {selectedMeeting.auditLogs.map((logItem, idx) => (
                        <div key={idx} className="pb-2.5 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0">
                          <p className="text-slate-800 dark:text-white font-bold">{logItem.action} <span className="font-medium text-slate-400">por {logItem.performedBy}</span></p>
                          {logItem.details && <p className="text-[10px] text-slate-450 italic mt-0.5">{logItem.details}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Columna Derecha: Control de Asistencia */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Convocatoria y Control</h3>
                  
                  {/* Acciones en lote */}
                  {selectedMeeting.status !== 'CANCELADA' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleBulkAttendance('ASISTIO')}
                        disabled={savingAttendance}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-xl font-bold text-xs transition-all"
                      >
                        Asistieron Todos
                      </button>
                      <button
                        onClick={() => handleBulkAttendance('NO_ASISTIO')}
                        disabled={savingAttendance}
                        className="flex-1 sm:flex-initial px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-xl font-bold text-xs transition-all"
                      >
                        Faltaron Todos
                      </button>
                    </div>
                  )}
                </div>

                {/* Filtro listado asistencia */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-3 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Filtrar por nombre del servidor o altar..."
                      value={attendanceSearch}
                      onChange={e => setAttendanceSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>
                  <select
                    value={attendanceFilterStatus}
                    onChange={e => setAttendanceFilterStatus(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="PENDIENTE">Pendientes</option>
                    <option value="ASISTIO">Asistieron</option>
                    <option value="NO_ASISTIO">No Asistieron</option>
                    <option value="JUSTIFICADO">Justificados</option>
                  </select>
                </div>

                {/* Tabla de Convocados */}
                <div className="border border-slate-100 dark:border-slate-800/80 rounded-3xl overflow-hidden max-h-[50vh] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Servidor</th>
                        <th className="py-3 px-4">Cargo / Altar</th>
                        <th className="py-3 px-4 text-center">Registro</th>
                        <th className="py-3 px-4 text-center">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {filteredAttendance.map(a => {
                        return (
                          <tr key={a.attendeeId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{a.leaderName}</td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                              <div>{a.leaderType}</div>
                              <div className="text-[10px] text-slate-400">{a.cellGroupName || 'Sin Altar'}</div>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400 text-[10px]">
                              {a.recordedAt ? (
                                <>
                                  <div>{a.recordedAt}</div>
                                  <div className="font-semibold text-slate-500">por {a.recordedByUsername}</div>
                                </>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {selectedMeeting.status === 'CANCELADA' ? (
                                <span className="text-slate-400 text-xs italic">Cancelada</span>
                              ) : (
                                <select
                                  value={a.attendanceStatus}
                                  onChange={e => updateAttendanceStatus(a.attendeeId, e.target.value)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border focus:outline-none ${
                                    a.attendanceStatus === 'ASISTIO' ? 'bg-emerald-50 border-emerald-250 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' :
                                    a.attendanceStatus === 'NO_ASISTIO' ? 'bg-rose-50 border-rose-250 text-rose-500 dark:bg-rose-950/20 dark:text-rose-450' :
                                    a.attendanceStatus === 'JUSTIFICADO' ? 'bg-indigo-50 border-indigo-250 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' :
                                    'bg-amber-50 border-amber-250 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450'
                                  }`}
                                >
                                  <option value="PENDIENTE">Pendiente</option>
                                  <option value="ASISTIO">Asistió</option>
                                  <option value="NO_ASISTIO">No Asistió</option>
                                  <option value="JUSTIFICADO">Justificado</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-MODAL: REPROGRAMAR ==================== */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6">
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Reprogramar Citación</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Defina los nuevos detalles de fecha y horario.</p>
            </div>
            
            <form onSubmit={handleReschedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Nueva Fecha</label>
                <input
                  type="date"
                  required
                  value={rescheduleData.newDate}
                  onChange={e => setRescheduleData(prev => ({ ...prev, newDate: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={rescheduleData.newStartTime}
                    onChange={e => setRescheduleData(prev => ({ ...prev, newStartTime: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Hora Fin</label>
                  <input
                    type="time"
                    required
                    value={rescheduleData.newEndTime}
                    onChange={e => setRescheduleData(prev => ({ ...prev, newEndTime: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Ubicación</label>
                <input
                  type="text"
                  required
                  value={rescheduleData.newLocation}
                  onChange={e => setRescheduleData(prev => ({ ...prev, newLocation: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRescheduleOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-black text-xs shadow-md"
                >
                  Confirmar Reprogramación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SUB-MODAL: CANCELAR ==================== */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6">
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Cancelar Citación</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Por favor ingrese el motivo de la cancelación. Se notificará a todos los convocados.</p>
            </div>
            
            <form onSubmit={handleCancel} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-355">Motivo</label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Detalle el motivo de la cancelación..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(false)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-black text-xs shadow-md"
                >
                  Cancelar Citación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
