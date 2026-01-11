// 📊 EnrollmentPage - Gestión de Cohortes
// ✅ VERSIÓN CORREGIDA CON ENDPOINTS CORRECTOS
import React, { useState, useEffect } from 'react';
import apiService from '../apiService';


const EnrollmentsPage = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [filteredEnrollments, setFilteredEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    level: 'Selecciona un nivel',
    startDate: '',
    endDate: '',
    maxStudents: 30,
    minAttendancePercentage: 80,
    minAverageScore: 3.0,
  });

  const LEVELS = [
    { value: 'PREENCUENTRO', label: 'Pre-encuentro' },
    { value: 'ENCUENTRO', label: 'Encuentro' },
    { value: 'POST_ENCUENTRO', label: 'Post-encuentro' },
    { value: 'BAUTIZOS', label: 'Bautizos' },
    { value: 'EDIRD_1', label: 'EDIRD 1' },
    { value: 'EDIRD_2', label: 'EDIRD 2' },
    { value: 'EDIRD_3', label: 'EDIRD 3' },
    { value: 'SANIDAD_INTEGRAL_RAICES', label: 'Sanidad Integral Raíces' },
    { value: 'EDIRD_4', label: 'EDIRD 4' },
    { value: 'ADIESTRAMIENTO', label: 'Adiestramiento' },
    { value: 'GRADUACION', label: 'Graduación' },
  ];

  const STATUSES = [
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'SUSPENDED', label: 'Inactiva' },
    { value: 'PENDING', label: 'Programada' },
    { value: 'COMPLETED', label: 'Completada' },
    { value: 'CANCELLED', label: 'Cancelada' },
  ];

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEnrollments();
      console.log('📥 Cohortes obtenidas del backend:', data);
      
      const sorted = data.sort((a, b) => {
        return new Date(b.startDate) - new Date(a.startDate);
      });
      
      setEnrollments(sorted);
      applyFilters(sorted, filterLevel, filterStatus);
    } catch (err) {
      alert('❌ Error al cargar cohortes: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, level, status) => {
    console.log('🔍 Aplicando filtros:', { level, status, dataLength: data.length });
    
    let filtered = data;

    if (level && level.trim() !== '') {
      console.log(`Filtrando por nivel: "${level}"`);
      filtered = filtered.filter(e => {
        // ✅ CAMBIO CLAVE: Usar levelEnrollment en lugar de level
        const enrollmentLevel = e.levelEnrollment || e.level;
        const match = enrollmentLevel === level;
        console.log(`  Comparando: "${enrollmentLevel}" === "${level}" → ${match}`);
        return match;
      });
    }

    if (status && status.trim() !== '') {
      console.log(`Filtrando por estado: "${status}"`);
      filtered = filtered.filter(e => {
        const match = e.status === status;
        console.log(`  Comparando: "${e.status}" === "${status}" → ${match}`);
        return match;
      });
    }

    console.log(`✅ Resultado: ${filtered.length} cohortes`);
    setFilteredEnrollments(filtered);
  };

  const handleFilterChange = (type, value) => {
    console.log(`Cambio de filtro: ${type} = "${value}"`);
    
    if (type === 'level') {
      setFilterLevel(value);
      applyFilters(enrollments, value, filterStatus);
    } else if (type === 'status') {
      setFilterStatus(value);
      applyFilters(enrollments, filterLevel, value);
    }
  };

  const handleStatusChange = async (enrollmentId, newStatus) => {
    try {
      await apiService.updateEnrollmentStatus(enrollmentId, newStatus);
      alert('✅ Estado actualizado exitosamente');
      fetchEnrollments();
      setSelectedEnrollment(null);
    } catch (err) {
      alert('❌ Error al actualizar estado: ' + err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.level || !formData.startDate || !formData.endDate) {
        alert('Por favor completa todos los campos requeridos');
        return;
      }

      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        alert('La fecha de inicio debe ser anterior a la fecha de fin');
        return;
      }

      const enrollmentData = {
        level: formData.level,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxStudents: parseInt(formData.maxStudents),
        minAttendancePercentage: parseFloat(formData.minAttendancePercentage),
        minAverageScore: parseFloat(formData.minAverageScore),
      };

      console.log('📤 Enviando:', enrollmentData);

      await apiService.createEnrollment(enrollmentData);
      alert('✅ Cohorte creada exitosamente');
      setShowForm(false);
      resetForm();
      fetchEnrollments();
    } catch (err) {
      alert('❌ Error: ' + err.message);
      console.error('Error:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      level: 'PREENCUENTRO',
      startDate: '',
      endDate: '',
      maxStudents: 30,
      minAttendancePercentage: 80,
      minAverageScore: 3.0,
    });
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const getLevelLabel = (levelValue) => {
    return LEVELS.find(l => l.value === levelValue)?.label || levelValue;
  };

  const getStatusLabel = (statusValue) => {
    return STATUSES.find(s => s.value === statusValue)?.label || statusValue;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'INACTIVE': return 'status-inactive';
      case 'PAUSED': return 'status-paused';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
        
        {/* ========== ENCABEZADO ========== */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-2">📋 Gestión de Cohortes</h1>
          <p className="text-center text-gray-600 text-sm sm:text-base">Crea y gestiona cohortes de formación</p>
        </div>

        {/* ========== BOTÓN CREAR ========== */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn-primary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base"
          >
            {showForm ? '✖️ Cerrar' : '➕ Nueva Cohorte'}
          </button>
        </div>

        {/* ========== FORMULARIO ========== */}
        {showForm && (
          <div className="bg-gray-50 p-4 sm:p-6 lg:p-8 rounded-xl border-l-4 border-blue-500 mb-6 sm:mb-8 animate-slide-in-up">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Crear Nueva Cohorte</h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Nivel *</label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    required
                  >
                    {LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Fecha Inicio *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Fecha Fin *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Máx. Estudiantes *</label>
                  <input
                    type="number"
                    name="maxStudents"
                    value={formData.maxStudents}
                    onChange={handleInputChange}
                    min="1"
                    max="500"
                    className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">% Asistencia *</label>
                  <input
                    type="number"
                    name="minAttendancePercentage"
                    value={formData.minAttendancePercentage}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Calificación Min. *</label>
                  <input
                    type="number"
                    name="minAverageScore"
                    value={formData.minAverageScore}
                    onChange={handleInputChange}
                    min="0"
                    max="5"
                    step="0.1"
                    className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full rounded-lg font-semibold py-2 sm:py-3 text-sm sm:text-base">
                ✅ Crear Cohorte
              </button>
            </form>
          </div>
        )}

        {/* ========== FILTROS ========== */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 sm:p-6 rounded-xl border-2 border-gray-200 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
            {/* Filtro Nivel */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">📌 Filtrar por Nivel</label>
              <select
                value={filterLevel}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-xs sm:text-sm"
              >
                <option value="">Todos los niveles</option>
                {LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Estado */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">⚡ Filtrar por Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-xs sm:text-sm"
              >
                <option value="">Todos los estados</option>
                {STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Limpiar */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterLevel('');
                  setFilterStatus('');
                  applyFilters(enrollments, '', '');
                }}
                className="btn-secondary w-full rounded-lg font-semibold py-2 text-xs sm:text-sm"
              >
                🔄 Limpiar Filtros
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-600">
            Mostrando <strong>{filteredEnrollments.length}</strong> de <strong>{enrollments.length}</strong> cohortes
          </p>
        </div>

        {/* ========== CONTENEDOR PRINCIPAL ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* ========== LISTADO ========== */}
          <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border-2 border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">📊 Cohortes ({filteredEnrollments.length})</h2>
            
            {loading ? (
              <p className="text-center text-gray-500 py-8 text-sm">Cargando cohortes...</p>
            ) : filteredEnrollments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No hay cohortes que coincidan</p>
                <p className="text-xs text-gray-400 mt-2">Intenta cambiar los filtros</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 sm:max-h-[500px] overflow-y-auto scrollbar-custom">
                {filteredEnrollments.map(enrollment => (
                  <div
                    key={enrollment.id}
                    onClick={() => setSelectedEnrollment(enrollment)}
                    className={`enrollment-item ${selectedEnrollment?.id === enrollment.id ? 'selected' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex-1 min-w-0">
                        {enrollment.cohortName || getLevelLabel(enrollment.levelEnrollment || enrollment.level)}
                      </h3>
                      <span className={`status-badge ${getStatusColor(enrollment.status)} flex-shrink-0`}>
                        {getStatusLabel(enrollment.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                      <p><strong>Nivel:</strong> {getLevelLabel(enrollment.levelEnrollment || enrollment.level)}</p>
                      <p><strong>Inicio:</strong> {new Date(enrollment.startDate).toLocaleDateString('es-CO')}</p>
                      <p><strong>Fin:</strong> {new Date(enrollment.endDate).toLocaleDateString('es-CO')}</p>
                      <p><strong>Est.:</strong> {enrollment.maxStudents} máx</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========== DETALLES ========== */}
          {selectedEnrollment && (
            <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border-2 border-gray-200 animate-slide-in-up">
              <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 sm:p-6 flex justify-between items-center gap-4">
                  <h2 className="text-base sm:text-xl font-bold min-w-0 truncate">
                    {selectedEnrollment.cohortName || getLevelLabel(selectedEnrollment.levelEnrollment || selectedEnrollment.level)}
                  </h2>
                  <button
                    onClick={() => setSelectedEnrollment(null)}
                    className="text-white text-2xl font-bold hover:bg-white hover:bg-opacity-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">ID</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{selectedEnrollment.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Nivel</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900 truncate">{getLevelLabel(selectedEnrollment.levelEnrollment || selectedEnrollment.level)}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Estado</p>
                      <p className="mt-1">
                        <span className={`status-badge ${getStatusColor(selectedEnrollment.status)} text-xs`}>
                          {getStatusLabel(selectedEnrollment.status)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Inicio</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900">{new Date(selectedEnrollment.startDate).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Fin</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900">{new Date(selectedEnrollment.endDate).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Duración</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900">
                        {Math.ceil((new Date(selectedEnrollment.endDate) - new Date(selectedEnrollment.startDate)) / (1000 * 60 * 60 * 24))} d
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Máx. Est.</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900">{selectedEnrollment.maxStudents}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">% Asist.</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900">{selectedEnrollment.minAttendancePercentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Calif. Min</p>
                      <p className="text-sm sm:text-lg font-semibold text-gray-900">{selectedEnrollment.minAverageScore}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 sm:p-6 border-t-2 border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {selectedEnrollment.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusChange(selectedEnrollment.id, 'ACTIVE')}
                      className="btn-secondary rounded-lg font-semibold py-2 text-xs sm:text-sm"
                    >
                      ▶️ Activar
                    </button>
                  )}
                  {selectedEnrollment.status !== 'PAUSED' && (
                    <button
                      onClick={() => handleStatusChange(selectedEnrollment.id, 'PAUSED')}
                      className="bg-yellow-500 text-white rounded-lg font-semibold py-2 text-xs sm:text-sm hover:bg-yellow-600"
                    >
                      ⏸️ Pausar
                    </button>
                  )}
                  {selectedEnrollment.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleStatusChange(selectedEnrollment.id, 'COMPLETED')}
                      className="bg-blue-500 text-white rounded-lg font-semibold py-2 text-xs sm:text-sm hover:bg-blue-600"
                    >
                      ✅ Completar
                    </button>
                  )}
                  {selectedEnrollment.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleStatusChange(selectedEnrollment.id, 'CANCELLED')}
                      className="btn-danger rounded-lg font-semibold py-2 text-xs sm:text-sm"
                    >
                      ❌ Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentsPage;
