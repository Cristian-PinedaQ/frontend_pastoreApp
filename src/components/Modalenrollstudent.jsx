// 📝 ModalEnrollStudent.jsx - v3 CON FLUJO MEJORADO
// Modal para inscribir múltiples estudiantes a cohortes por nivel
// ✅ FLUJO CORREGIDO: Nivel → Estudiantes con ese nivel → Cohortes del nivel
// ✅ GENERADOR PDF: Exportar listado de estudiantes por nivel

import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../apiService';
import nameHelper from '../services/nameHelper';
// Al inicio del archivo ModalEnrollStudent.jsx
import { generateStudentsByLevelPDF } from '../services/studentsByLevelPdfGenerator';

const { getDisplayName } = nameHelper;

const ModalEnrollStudent = ({ isOpen, onClose, onEnrollmentSuccess }) => {
  // ========== DARK MODE ==========
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('darkMode');
    const htmlHasDarkClass = document.documentElement.classList.contains('dark-mode');

    setIsDarkMode(
      savedMode === 'true' || htmlHasDarkClass || prefersDark
    );

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark-mode'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (localStorage.getItem('darkMode') === null) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Tema
  const themeColors = {
    bg: isDarkMode ? '#0f172a' : '#ffffff',
    bgSecondary: isDarkMode ? '#1e293b' : '#f9fafb',
    bgLight: isDarkMode ? '#1a2332' : '#f5f7fa',
    text: isDarkMode ? '#f1f5f9' : '#111827',
    textSecondary: isDarkMode ? '#cbd5e1' : '#666666',
    textTertiary: isDarkMode ? '#94a3b8' : '#999999',
    border: isDarkMode ? '#334155' : '#e0e0e0',
    borderLight: isDarkMode ? '#475569' : '#f0f0f0',
    header: isDarkMode
      ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    hover: isDarkMode ? '#334155' : '#f9fafb',
    selected: isDarkMode ? '#334155' : '#e0e7ff',
    selectedBorder: isDarkMode ? '#6366f1' : '#667eea',
    infoBox: isDarkMode ? '#1e3a8a' : '#f0f9ff',
    infoBorder: isDarkMode ? '#3b82f6' : '#0284c7',
    infoText: isDarkMode ? '#93c5fd' : '#0c4a6e',
  };

  // ========== ESTADO ==========
  const [step, setStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [studentsByLevel, setStudentsByLevel] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [availableCohorts, setAvailableCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [enrollingStatus, setEnrollingStatus] = useState({});
  const [allMembers, setAllMembers] = useState([]);

  // Definir niveles con su orden
  const LEVELS = [
    { value: 'PREENCUENTRO', label: 'Pre-encuentro', order: 1 },
    { value: 'ENCUENTRO', label: 'Encuentro', order: 2 },
    { value: 'POST_ENCUENTRO', label: 'Post-encuentro', order: 3 },
    { value: 'BAUTIZOS', label: 'Bautizos', order: 4 },
    { value: 'ESENCIA_1', label: 'ESENCIA 1', order: 5 },
    { value: 'ESENCIA_2', label: 'ESENCIA 2', order: 6 },
    { value: 'ESENCIA_3', label: 'ESENCIA 3', order: 7 },
    { value: 'SANIDAD_INTEGRAL_RAICES', label: 'Sanidad Integral Raíces', order: 8 },
    { value: 'ESENCIA_4', label: 'ESENCIA 4', order: 9 },
    { value: 'ADIESTRAMIENTO', label: 'Adiestramiento', order: 10 },
    { value: 'GRADUACION', label: 'Graduación', order: 11 },
  ];

  // ========== RESETEAR MODAL ==========
  const handleReset = useCallback(() => {
  setStep(1);
  setSelectedLevel(null);
  setStudentsByLevel([]);
  setSelectedStudents([]);
  setAvailableCohorts([]);
  setSelectedCohort(null);
  setSearchStudent('');
  setError('');
  setEnrollingStatus({});
  onClose();
}, [onClose]);

  // Cargar todos los miembros al abrir modal
  useEffect(() => {
    if (isOpen) {
      loadAllMembers();
    } else {
      // Resetear estado al cerrar
      handleReset();
    }
  }, [isOpen, handleReset]);

  // Cargar todos los miembros
  const loadAllMembers = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📚 Cargando todos los miembros...');
      const data = await apiService.getAllMembers();
      setAllMembers(data || []);
      console.log('✅ Miembros cargados:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error cargando miembros:', err);
      setError('Error al cargar miembros: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== GENERAR PDF POR NIVEL ==========
// En ModalEnrollStudent.jsx - actualizar generatePDFByLevel

// En ModalEnrollStudent.jsx - Reemplazar la función generatePDFByLevel existente

const generatePDFByLevel = async (level) => {
  const levelInfo = LEVELS.find(l => l.value === level);
  if (!levelInfo) return;

  try {
    setLoading(true);
    
    // Usar el nuevo método que obtiene datos del backend
    const levelDetail = await apiService.getLevelStudents(level);
    
    if (!levelDetail || levelDetail.totalStudents === 0) {
      alert(`No hay estudiantes en el nivel ${levelInfo.label}`);
      return;
    }

    // Combinar todos los estudiantes con su categoría de estado
    const allStudents = [
      ...(levelDetail.currentlyStudying || []).map(s => ({ 
        ...s, 
        statusCategory: 'Cursando',
        // Asegurar que todos los campos necesarios estén presentes
        name: s.memberName || 'Sin nombre',
        document: s.document || '—',
        email: s.email || '—',
        phone: s.phone || '—',
        address: s.address || '—',
        district: s.district || '—',
        districtDescription: s.districtDescription || s.district || '—',
        gender: s.gender || '—',
        maritalStatus: s.maritalStatus || '—',
        // Datos de progreso
        attendancePercentage: s.attendancePercentage || 0,
        averageScore: s.averageScore || 0,
        passed: s.passed
      })),
      ...(levelDetail.completed || []).map(s => ({ 
        ...s, 
        statusCategory: 'Completado',
        name: s.memberName || 'Sin nombre',
        document: s.document || '—',
        email: s.email || '—',
        phone: s.phone || '—',
        address: s.address || '—',
        district: s.district || '—',
        districtDescription: s.districtDescription || s.district || '—',
        gender: s.gender || '—',
        maritalStatus: s.maritalStatus || '—',
        attendancePercentage: s.attendancePercentage || 0,
        averageScore: s.averageScore || 0,
        passed: s.passed
      })),
      ...(levelDetail.failed || []).map(s => ({ 
        ...s, 
        statusCategory: 'Reprobado',
        name: s.memberName || 'Sin nombre',
        document: s.document || '—',
        email: s.email || '—',
        phone: s.phone || '—',
        address: s.address || '—',
        district: s.district || '—',
        districtDescription: s.districtDescription || s.district || '—',
        gender: s.gender || '—',
        maritalStatus: s.maritalStatus || '—',
        attendancePercentage: s.attendancePercentage || 0,
        averageScore: s.averageScore || 0,
        passed: s.passed
      }))
    ];

    // Calcular estadísticas mejoradas
    const maleCount = allStudents.filter(s => s.gender === 'MASCULINO').length;
    const femaleCount = allStudents.filter(s => s.gender === 'FEMENINO').length;
    const withEmail = allStudents.filter(s => s.email && s.email !== '—' && s.email).length;
    const withPhone = allStudents.filter(s => s.phone && s.phone !== '—' && s.phone).length;
    const withDocument = allStudents.filter(s => s.document && s.document !== '—' && s.document).length;
    const withAddress = allStudents.filter(s => s.address && s.address !== '—' && s.address).length;
    
    // Distribución por distrito usando districtDescription
    const districtMap = {};
    allStudents.forEach(s => {
      const district = s.districtDescription || s.district || 'SIN DISTRITO';
      districtMap[district] = (districtMap[district] || 0) + 1;
    });
    
    const districts = Object.entries(districtMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Generar PDF con todos los datos
    generateStudentsByLevelPDF({
      students: allStudents,
      level: level,
      levelLabel: levelInfo.label,
      totalStudents: allStudents.length,
      stats: {
        maleCount,
        femaleCount,
        withEmail,
        withPhone,
        withDocument,
        withAddress,
        districts,
        // Estadísticas adicionales del backend
        passedCount: levelDetail.passedCount || levelDetail.completed?.length || 0,
        activeCount: levelDetail.activeCount || levelDetail.currentlyStudying?.length || 0,
        failedCount: levelDetail.failedCount || levelDetail.failed?.length || 0,
        averageAttendance: levelDetail.averageAttendance || 0,
        averageScore: levelDetail.averageScore || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar el PDF: ' + (error.message || 'Error desconocido'));
  } finally {
    setLoading(false);
  }
};

  // ========== CARGAR ESTUDIANTES POR NIVEL ==========
  const loadStudentsByLevel = useCallback(async () => {
    if (!selectedLevel) return;

    setLoading(true);
    setError('');

    try {
      console.log('📚 Cargando estudiantes con nivel:', selectedLevel);
      
      // Filtrar miembros cuyo currentLevel sea el seleccionado
      const filtered = allMembers.filter(member => 
        member.currentLevel === selectedLevel
      );
      
      setStudentsByLevel(filtered);
      console.log('✅ Estudiantes encontrados:', filtered.length);
    } catch (err) {
      console.error('❌ Error filtrando estudiantes:', err);
      setError('Error al cargar estudiantes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedLevel, allMembers]);

  // Cargar estudiantes cuando se selecciona nivel y se avanza al paso 2
  useEffect(() => {
    if (selectedLevel && step === 2) {
      loadStudentsByLevel();
      setSelectedStudents([]); // Resetear selección
    }
  }, [selectedLevel, step, loadStudentsByLevel]);

  // ========== CARGAR COHORTES DISPONIBLES ==========
  const loadAvailableCohorts = useCallback(async () => {
    if (!selectedLevel) return;
    
    setLoading(true);
    setError('');

    try {
      console.log('📚 Cargando cohortes disponibles para nivel:', selectedLevel);
      const data = await apiService.getAvailableCohortsByLevel(selectedLevel);
      
      const transformedCohorts = (data || []).map(cohort => ({
        ...cohort,
        maestro: cohort.maestro ? {
          ...cohort.maestro,
          displayName: getDisplayName(cohort.maestro.name)
        } : null
      }));
      
      setAvailableCohorts(transformedCohorts);
      console.log('✅ Cohortes cargadas:', data?.length || 0);
    } catch (err) {
      console.error('❌ Error cargando cohortes:', err);
      setError('Error al cargar cohortes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedLevel]);

  // Cargar cohortes cuando se avanza al paso 3
  useEffect(() => {
    if (selectedLevel && step === 3) {
      loadAvailableCohorts();
    }
  }, [selectedLevel, step, loadAvailableCohorts]);

  // ========== MANEJAR SIGUIENTE PASO ==========
  const handleNext = () => {
    if (step === 1 && !selectedLevel) {
      setError('Debes seleccionar un nivel');
      return;
    }
    if (step === 2 && selectedStudents.length === 0) {
      setError('Debes seleccionar al menos un estudiante');
      return;
    }
    
    setStep(step + 1);
    setError('');
  };

  // ========== MANEJAR PASO ANTERIOR ==========
  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  // ========== SELECCIONAR/DESELECCIONAR ESTUDIANTE ==========
  const toggleStudent = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  // ========== SELECCIONAR TODOS LOS ESTUDIANTES ==========
  const selectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents);
    }
  };

  // ========== INSCRIBIR ESTUDIANTES ==========
  const handleEnroll = async () => {
    if (selectedStudents.length === 0 || !selectedCohort) {
      setError('Falta seleccionar información');
      return;
    }

    setLoading(true);
    setError('');
    setEnrollingStatus({});

    try {
      console.log(`📝 Inscribiendo ${selectedStudents.length} estudiantes...`);
      
      const results = [];
      const errors = [];

      // Inscribir cada estudiante secuencialmente
      for (const student of selectedStudents) {
        try {
          setEnrollingStatus(prev => ({
            ...prev,
            [student.id]: { status: 'enrolling', name: student.name }
          }));

          await apiService.createStudentEnrollment(student.id, selectedCohort.cohortId);
          
          setEnrollingStatus(prev => ({
            ...prev,
            [student.id]: { status: 'success', name: student.name }
          }));
          
          results.push(student.name);
        } catch (err) {
          console.error(`❌ Error inscribiendo a ${student.name}:`, err);
          
          setEnrollingStatus(prev => ({
            ...prev,
            [student.id]: { status: 'error', name: student.name, error: err.message }
          }));
          
          errors.push({ name: student.name, error: err.message });
        }
      }

      // Mostrar resumen
      if (results.length > 0) {
        const successMessage = `✅ ${results.length} estudiante(s) inscrito(s) exitosamente`;
        if (errors.length === 0) {
          alert(successMessage);
        } else {
          alert(`${successMessage}\n❌ ${errors.length} error(es):\n${errors.map(e => `${e.name}: ${e.error}`).join('\n')}`);
        }
      } else if (errors.length > 0) {
        alert(`❌ No se pudo inscribir ningún estudiante:\n${errors.map(e => `${e.name}: ${e.error}`).join('\n')}`);
      }
      
      // Si al menos uno fue exitoso, refrescar y cerrar
      if (results.length > 0) {
        setTimeout(() => {
          handleReset();
          onEnrollmentSuccess();
        }, 2000);
      }
      
    } catch (err) {
      console.error('❌ Error en proceso de inscripción:', err);
      setError('Error en el proceso de inscripción: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar estudiantes por búsqueda
  const filteredStudents = studentsByLevel.filter(student =>
    student.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    getDisplayName(student.name)?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    student.document?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={handleReset}
    >
      <div
        className="modal-container enroll-modal"
        style={{
          backgroundColor: themeColors.bg,
          color: themeColors.text,
          maxWidth: step === 2 ? '800px' : '700px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background: themeColors.header,
          }}
        >
          <h2 className="modal-title">
            {step === 1 && '📚 Seleccionar Nivel'}
            {step === 2 && '👥 Seleccionar Estudiantes'}
            {step === 3 && '🎓 Seleccionar Cohorte'}
          </h2>
          <button className="modal-close-btn" onClick={handleReset}>✕</button>
        </div>

        {/* Progress Bar */}
        <div
          className="progress-container"
          style={{
            backgroundColor: themeColors.bgLight,
            borderBottomColor: themeColors.border,
          }}
        >
          <div className="progress-bar" style={{ backgroundColor: themeColors.border }}>
            <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }}></div>
          </div>
          <p className="progress-text" style={{ color: themeColors.textSecondary }}>Paso {step} de 3</p>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div
              className="error-message"
              style={{
                backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2',
                color: isDarkMode ? '#fca5a5' : '#991b1b',
                borderLeftColor: isDarkMode ? '#dc2626' : '#ef4444',
              }}
            >
              ❌ {error}
            </div>
          )}

          {loading && step !== 2 ? (
            <div className="loading-state" style={{ color: themeColors.textSecondary }}>
              ⏳ Cargando información...
            </div>
          ) : (
            <>
              {/* PASO 1: Seleccionar Nivel con botón PDF */}
              {step === 1 && (
                <div className="step-content">
                  <div className="level-header">
                    <p
                      className="step-info"
                      style={{
                        backgroundColor: themeColors.infoBox,
                        borderLeftColor: themeColors.infoBorder,
                        color: themeColors.infoText,
                      }}
                    >
                      Selecciona el nivel para ver los estudiantes disponibles
                    </p>
                    
                    {selectedLevel && (
                      <button
                        className="pdf-button"
                        onClick={() => generatePDFByLevel(selectedLevel)}
                        style={{
                          backgroundColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                          color: isDarkMode ? '#f1f5f9' : '#374151',
                          border: `1px solid ${themeColors.border}`,
                        }}
                      >
                        📄 Exportar Listado PDF
                      </button>
                    )}
                  </div>

                  <div className="options-grid">
                    {LEVELS.map(level => (
                      <div
                        key={level.value}
                        className={`option-card ${selectedLevel === level.value ? 'selected' : ''}`}
                        style={{
                          borderColor: selectedLevel === level.value ? themeColors.selectedBorder : themeColors.border,
                          backgroundColor: selectedLevel === level.value ? themeColors.selected : themeColors.card,
                        }}
                        onClick={() => setSelectedLevel(level.value)}
                      >
                        <input
                          type="radio"
                          checked={selectedLevel === level.value}
                          onChange={() => setSelectedLevel(level.value)}
                        />
                        <span className="card-label" style={{ color: themeColors.text }}>{level.label}</span>
                      </div>
                    ))}
                  </div>

                  {selectedLevel && (
                    <div
                      className="selection-summary"
                      style={{
                        backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4',
                        borderLeftColor: isDarkMode ? '#10b981' : '#10b981',
                        color: isDarkMode ? '#86efac' : '#065f46',
                      }}
                    >
                      <p>✅ Nivel seleccionado: <strong>{LEVELS.find(l => l.value === selectedLevel)?.label}</strong></p>
                      <p>📊 Estudiantes en este nivel: <strong>{allMembers.filter(m => m.currentLevel === selectedLevel).length}</strong></p>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: Seleccionar Estudiantes del nivel */}
              {step === 2 && (
                <div className="step-content">
                  <p
                    className="step-info"
                    style={{
                      backgroundColor: themeColors.infoBox,
                      borderLeftColor: themeColors.infoBorder,
                      color: themeColors.infoText,
                    }}
                  >
                    Nivel: <strong>{LEVELS.find(l => l.value === selectedLevel)?.label}</strong>
                    {' | '}
                    Estudiantes encontrados: <strong>{studentsByLevel.length}</strong>
                  </p>

                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="🔍 Buscar estudiante por nombre, email o documento..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="search-input"
                      style={{
                        backgroundColor: themeColors.card,
                        color: themeColors.text,
                        borderColor: themeColors.border,
                      }}
                    />
                  </div>

                  {studentsByLevel.length > 0 && (
                    <div className="select-all-container">
                      <label className="select-all-label">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                          onChange={selectAllStudents}
                          disabled={filteredStudents.length === 0}
                        />
                        <span style={{ color: themeColors.text }}>
                          {selectedStudents.length === filteredStudents.length 
                            ? 'Deseleccionar todos' 
                            : 'Seleccionar todos'}
                        </span>
                      </label>
                      <span className="selected-count" style={{ color: themeColors.textSecondary }}>
                        {selectedStudents.length} seleccionados
                      </span>
                    </div>
                  )}

                  <div className="students-list">
                    {loading ? (
                      <div className="loading-state" style={{ color: themeColors.textSecondary }}>
                        ⏳ Cargando estudiantes...
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <p className="no-options" style={{ color: themeColors.textTertiary }}>
                        {searchStudent 
                          ? 'No hay estudiantes que coincidan con la búsqueda'
                          : 'No hay estudiantes disponibles en este nivel'}
                      </p>
                    ) : (
                      filteredStudents.map(student => (
                        <div
                          key={student.id}
                          className={`student-item ${selectedStudents.some(s => s.id === student.id) ? 'selected' : ''}`}
                          style={{
                            borderColor: selectedStudents.some(s => s.id === student.id) ? themeColors.selectedBorder : themeColors.border,
                            backgroundColor: selectedStudents.some(s => s.id === student.id) ? themeColors.selected : themeColors.card,
                            opacity: enrollingStatus[student.id]?.status === 'success' ? 0.6 : 1,
                          }}
                          onClick={() => toggleStudent(student)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.some(s => s.id === student.id)}
                            onChange={() => toggleStudent(student)}
                            disabled={enrollingStatus[student.id]?.status === 'success'}
                          />
                          <div className="student-info">
                            <div className="student-name">
                              <strong style={{ color: themeColors.text }}>
                                {getDisplayName(student.name)}
                              </strong>
                              {enrollingStatus[student.id]?.status === 'success' && (
                                <span className="success-badge" style={{ color: isDarkMode ? '#86efac' : '#065f46' }}>
                                  ✅ Inscrito
                                </span>
                              )}
                              {enrollingStatus[student.id]?.status === 'error' && (
                                <span className="error-badge" style={{ color: isDarkMode ? '#fca5a5' : '#991b1b' }}>
                                  ❌ Error
                                </span>
                              )}
                            </div>
                            <div className="student-details" style={{ color: themeColors.textSecondary }}>
                              <span>{student.email || 'Sin email'}</span>
                              <span>{student.document || 'Sin documento'}</span>
                              <span>{student.phone || 'Sin teléfono'}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PASO 3: Seleccionar Cohorte */}
              {/* PASO 3: Seleccionar Cohorte */}
{step === 3 && (
  <div className="step-content">
    <p
      className="step-info"
      style={{
        backgroundColor: themeColors.infoBox,
        borderLeftColor: themeColors.infoBorder,
        color: themeColors.infoText,
      }}
    >
      <strong>Nivel:</strong> {LEVELS.find(l => l.value === selectedLevel)?.label}<br />
      <strong>Estudiantes seleccionados:</strong> {selectedStudents.length}
    </p>

    {loading ? (
      <div className="loading-state" style={{ color: themeColors.textSecondary }}>
        ⏳ Cargando cohortes disponibles...
      </div>
    ) : (
      <>
        <div className="cohorts-list">
          {availableCohorts.length === 0 ? (
            <div 
              className="no-cohorts"
              style={{
                backgroundColor: isDarkMode ? '#1e293b' : '#f9fafb',
                border: `1px dashed ${themeColors.border}`,
                borderRadius: '8px',
                padding: '30px 20px',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📭</span>
              <p style={{ color: themeColors.textSecondary, marginBottom: '8px' }}>
                No hay cohortes disponibles para el nivel {LEVELS.find(l => l.value === selectedLevel)?.label}
              </p>
              <p style={{ color: themeColors.textTertiary, fontSize: '12px' }}>
                Verifica que existan cohortes creadas y activas para este nivel
              </p>
            </div>
          ) : (
            availableCohorts.map(cohort => (
              <div
                key={cohort.cohortId}
                className={`cohort-item ${selectedCohort?.cohortId === cohort.cohortId ? 'selected' : ''}`}
                style={{
                  borderColor: selectedCohort?.cohortId === cohort.cohortId ? themeColors.selectedBorder : themeColors.border,
                  backgroundColor: selectedCohort?.cohortId === cohort.cohortId ? themeColors.selected : themeColors.card,
                  cursor: cohort.available ? 'pointer' : 'not-allowed',
                  opacity: cohort.available ? 1 : 0.6
                }}
                onClick={() => cohort.available && setSelectedCohort(cohort)}
              >
                <input
                  type="radio"
                  name="cohort"
                  checked={selectedCohort?.cohortId === cohort.cohortId}
                  onChange={() => setSelectedCohort(cohort)}
                  disabled={!cohort.available}
                />
                <div className="cohort-info" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: themeColors.text, fontSize: '14px' }}>
                      {cohort.cohortName}
                    </strong>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: cohort.available
                          ? isDarkMode ? '#064e3b' : '#d1fae5'
                          : isDarkMode ? '#7f1d1d' : '#fee2e2',
                        color: cohort.available
                          ? isDarkMode ? '#86efac' : '#065f46'
                          : isDarkMode ? '#fca5a5' : '#991b1b',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                    >
                      {cohort.available ? '✅ Disponible' : '❌ Llena'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: themeColors.textSecondary }}>
                      <span style={{ color: themeColors.textTertiary }}>📅 Inicio:</span>{' '}
                      {new Date(cohort.startDate).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '11px', color: themeColors.textSecondary }}>
                      <span style={{ color: themeColors.textTertiary }}>📅 Fin:</span>{' '}
                      {new Date(cohort.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11px', color: themeColors.textSecondary }}>
                      <span style={{ color: themeColors.textTertiary }}>👤 Maestro:</span>{' '}
                      {cohort.maestro?.displayName || 'No asignado'}
                    </div>
                    <div style={{ fontSize: '11px', color: themeColors.textSecondary }}>
                      <span style={{ color: themeColors.textTertiary }}>📊 Cupo:</span>{' '}
                      {cohort.currentStudents}/{cohort.maxStudents}
                    </div>
                    <div style={{ fontSize: '11px', color: themeColors.textSecondary }}>
                      <span style={{ color: themeColors.textTertiary }}>🪑 Disponibles:</span>{' '}
                      <span style={{ 
                        color: cohort.availableSpots > 0 ? themeColors.success : themeColors.danger,
                        fontWeight: 'bold'
                      }}>
                        {cohort.availableSpots}
                      </span>
                    </div>
                  </div>

                  {cohort.status && (
                    <div style={{ fontSize: '10px', color: themeColors.textTertiary }}>
                      Estado: {cohort.status}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {selectedCohort && (
          <div
            className="selection-summary"
            style={{
              backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4',
              borderLeftColor: isDarkMode ? '#10b981' : '#10b981',
              color: isDarkMode ? '#86efac' : '#065f46',
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '6px'
            }}
          >
            <p style={{ margin: '0 0 4px 0' }}>
              <strong>✅ Cohorte seleccionada:</strong> {selectedCohort.cohortName}
            </p>
            <p style={{ margin: 0, fontSize: '12px' }}>
              Inscribirás <strong>{selectedStudents.length}</strong> estudiante(s) en esta cohorte
            </p>
          </div>
        )}
      </>
    )}
  </div>
)}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            backgroundColor: themeColors.bgLight,
            borderTopColor: themeColors.border,
          }}
        >
          <button
            className="btn-secondary"
            onClick={handlePrevious}
            disabled={step === 1 || loading}
            style={{
              backgroundColor: themeColors.bgSecondary,
              color: themeColors.text,
              borderColor: themeColors.border,
            }}
          >
            ← Anterior
          </button>

          {step < 3 ? (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={
                loading || 
                (step === 1 && !selectedLevel) || 
                (step === 2 && selectedStudents.length === 0)
              }
            >
              Siguiente →
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleEnroll}
              disabled={loading || !selectedCohort}
            >
              {loading ? '⏳ Inscribiendo...' : `✅ Inscribir ${selectedStudents.length} estudiante(s)`}
            </button>
          )}

          <button
            className="btn-tertiary"
            onClick={handleReset}
            style={{
              color: themeColors.textSecondary,
              borderColor: themeColors.border,
            }}
          >
            ✕ Cancelar
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-in-out;
          padding: 20px;
          transition: background-color 300ms ease-in-out;
        }

        .modal-container {
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideInUp 0.3s ease-in-out;
          display: flex;
          flex-direction: column;
          transition: all 300ms ease-in-out;
        }

        .modal-header {
          color: white;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 12px 12px 0 0;
          transition: background 300ms ease-in-out;
        }

        .modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .modal-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .modal-close-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .progress-container {
          padding: 16px 24px;
          border-bottom: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .progress-bar {
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
          transition: background 300ms ease-in-out;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .progress-text {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          transition: color 300ms ease-in-out;
        }

        .modal-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          transition: color 300ms ease-in-out;
        }

        .error-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid;
          transition: all 300ms ease-in-out;
        }

        .loading-state {
          text-align: center;
          padding: 40px 20px;
          transition: color 300ms ease-in-out;
        }

        .step-content {
          animation: fadeIn 0.3s ease-in-out;
        }

        .level-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 16px;
        }

        .pdf-button {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .pdf-button:hover {
          opacity: 0.8;
          transform: translateY(-2px);
        }

        .step-info {
          margin: 0;
          padding: 12px 16px;
          border-left: 4px solid;
          border-radius: 6px;
          font-size: 13px;
          transition: all 300ms ease-in-out;
          flex: 1;
        }

        .step-info strong {
          font-weight: 600;
        }

        .search-box {
          margin-bottom: 16px;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .select-all-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 8px 12px;
          background-color: ${themeColors.bgLight};
          border-radius: 8px;
        }

        .select-all-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .select-all-label input {
          cursor: pointer;
        }

        .selected-count {
          font-size: 13px;
          font-weight: 500;
        }

        .students-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
        }

        .student-item {
          padding: 12px 16px;
          border: 1.5px solid;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .student-item:hover {
          transform: translateX(4px);
        }

        .student-item input {
          margin-top: 2px;
          cursor: pointer;
        }

        .student-info {
          flex: 1;
        }

        .student-name {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .student-name strong {
          font-weight: 600;
        }

        .success-badge,
        .error-badge {
          font-size: 11px;
          font-weight: 600;
        }

        .student-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12px;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .option-card {
          padding: 16px 12px;
          border: 1.5px solid;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .option-card:hover {
          transform: translateY(-2px);
        }

        .option-card input {
          margin-bottom: 8px;
          cursor: pointer;
        }

        .card-label {
          display: block;
          font-weight: 500;
          font-size: 13px;
          transition: color 300ms ease-in-out;
        }

        .cohorts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 400px;
          overflow-y: auto;
        }

        .cohort-item {
          padding: 12px 16px;
          border: 1.5px solid;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .cohort-item:hover {
          transform: translateX(4px);
        }

        .cohort-item input {
          margin-top: 2px;
          cursor: pointer;
        }

        .cohort-info {
          flex: 1;
        }

        .cohort-info strong {
          display: block;
          margin-bottom: 4px;
        }

        .cohort-info p {
          margin: 0 0 8px;
          font-size: 12px;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          transition: all 300ms ease-in-out;
        }

        .no-options {
          text-align: center;
          padding: 20px;
          transition: color 300ms ease-in-out;
        }

        .selection-summary {
          margin-top: 20px;
          padding: 12px 16px;
          border-left: 4px solid;
          border-radius: 6px;
          font-size: 13px;
          transition: all 300ms ease-in-out;
        }

        .modal-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid;
          border-radius: 0 0 12px 12px;
          transition: all 300ms ease-in-out;
        }

        .btn-primary,
        .btn-secondary,
        .btn-tertiary {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          transform: translateY(-2px);
        }

        .btn-secondary {
          border: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .btn-secondary:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-tertiary {
          background: none;
          border: 1px solid;
          transition: all 300ms ease-in-out;
        }

        .btn-tertiary:hover:not(:disabled) {
          opacity: 0.8;
        }

        .btn-primary:disabled,
        .btn-secondary:disabled,
        .btn-tertiary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .modal-container {
            width: 98%;
            max-height: 98vh;
          }

          .options-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .level-header {
            flex-direction: column;
            align-items: stretch;
          }

          .pdf-button {
            width: 100%;
          }

          .student-details {
            flex-direction: column;
            gap: 4px;
          }

          .modal-footer {
            flex-direction: column;
          }

          .btn-primary,
          .btn-secondary,
          .btn-tertiary {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalEnrollStudent;