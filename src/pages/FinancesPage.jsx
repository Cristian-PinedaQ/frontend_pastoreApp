// 💰 FinancesPage.jsx - GESTIÓN DE FINANZAS v5.5 FINAL CORREGIDO
// ✅ ZONA HORARIA: CORREGIDA - Evita desfase usando getDateWithoutTimezone SIEMPRE
// ✅ RECARGAR: Ahora limpia todos los filtros cuando presionas el botón
// ✅ FECHAS: Sin desfases, muestra las fechas correctas seleccionadas
// ✅ MODAL SIEMPRE: Se abre para cualquier tipo de reporte
// ✅ NUEVO: FIRST_FRUITS (Primicias) agregado como concepto

import React, { useState, useEffect } from 'react';
import apiService from '../apiService';
import ModalAddFinance from '../components/ModalAddFinance';
import ModalFinanceStatistics from '../components/ModalFinanceStatistics';
import ModalDailyReportOptions from '../components/ModalDailyReportOptions';
import { generateFinancePDF, generateDailyFinancePDF } from '../services/financepdfgenerator';
import { logSecurityEvent, logUserAction } from '../utils/securityLogger';
import '../css/FinancesPage.css';

const devLog = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

const devWarn = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }
};

// ========== FUNCIÓN AUXILIAR: Convertir fecha sin problemas de zona horaria ==========
const getDateWithoutTimezone = (dateString) => {
  // dateString es formato "2024-03-26"
  // Retorna un Date objeto que representa esa fecha a las 00:00:00 sin problemas de timezone
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// ========== FUNCIÓN AUXILIAR: Obtener fecha en formato YYYY-MM-DD sin timezone ==========
const getDateStringWithoutTimezone = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FinancesPage = () => {
  const [allFinances, setAllFinances] = useState([]);
  const [filteredFinances, setFilteredFinances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedConcept, setSelectedConcept] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [selectedVerification, setSelectedVerification] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [statisticsData, setStatisticsData] = useState(null);
  const [editingFinance, setEditingFinance] = useState(null);

  // Enums para conceptos e métodos (del backend Java)
  // ✅ NUEVO: FIRST_FRUITS y CELL_GROUP_OFFERING agregados
  const INCOME_CONCEPTS = ['TITHE', 'OFFERING', 'SEED_OFFERING', 'BUILDING_FUND', 'FIRST_FRUITS', 'CELL_GROUP_OFFERING'];
  const INCOME_METHODS = ['CASH', 'BANK_TRANSFER'];

  useEffect(() => {
    loadFinances();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allFinances, selectedConcept, selectedMethod, selectedVerification, searchText, startDate, endDate]);

  // ========== CARGAR FINANZAS ==========
  const loadFinances = async () => {
    setLoading(true);
    setError('');

    try {
      devLog('💰 Cargando ingresos financieros...');

      const response = await apiService.getFinances(0, 100);
      const finances = response?.content || [];

      devLog('✅ Finanzas cargadas - Cantidad:', finances.length);

      if (!finances || finances.length === 0) {
        devWarn('⚠️ No hay registros financieros disponibles');
        setAllFinances([]);
        return;
      }

      const processedFinances = finances.map(finance => ({
        id: finance.id,
        memberId: finance.memberId,
        memberName: finance.memberName || 'Sin nombre',
        amount: finance.amount || 0,
        concept: finance.incomeConcept || 'OTRO',
        method: finance.incomeMethod || 'EFECTIVO',
        registrationDate: finance.registrationDate,
        isVerified: finance.isVerified || false,
        description: finance.description || '',
      }));

      devLog('✅ Finanzas procesadas - Cantidad:', processedFinances.length);
      setAllFinances(processedFinances);

      logUserAction('load_finances', {
        financeCount: processedFinances.length,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      devWarn('❌ Error cargando finanzas:', err.message);
      setError('Error al cargar registros financieros: ' + err.message);

      logSecurityEvent('finance_load_error', {
        errorType: 'api_error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== RECARGAR Y LIMPIAR TODOS LOS FILTROS ==========
  const handleReloadAndClearFilters = async () => {
    devLog('🔄 Recargando datos y limpiando filtros...');
    
    // Limpiar todos los filtros
    setSelectedConcept('ALL');
    setSelectedMethod('ALL');
    setSelectedVerification('ALL');
    setSearchText('');
    setStartDate('');
    setEndDate('');
    
    // Recargar datos
    await loadFinances();
    
    devLog('✅ Filtros limpiados y datos recargados');
  };

  // ========== LÓGICA DE FILTROS ==========
  const applyFilters = () => {
    let filtered = [...allFinances];

    // 📅 Ordenar por fecha (más recientes primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.registrationDate || 0).getTime();
      const dateB = new Date(b.registrationDate || 0).getTime();
      return dateB - dateA;
    });

    // 🔍 Filtrar por concepto
    if (selectedConcept !== 'ALL') {
      devLog('🔍 Filtrando por concepto:', selectedConcept);
      filtered = filtered.filter(finance => finance.concept === selectedConcept);
    }

    // 🔍 Filtrar por método de pago
    if (selectedMethod !== 'ALL') {
      devLog('🔍 Filtrando por método:', selectedMethod);
      filtered = filtered.filter(finance => finance.method === selectedMethod);
    }

    // 🔍 Filtrar por verificación
    if (selectedVerification !== 'ALL') {
      devLog('🔍 Filtrando por verificación:', selectedVerification);
      if (selectedVerification === 'VERIFIED') {
        filtered = filtered.filter(finance => finance.isVerified === true);
      } else if (selectedVerification === 'UNVERIFIED') {
        filtered = filtered.filter(finance => finance.isVerified === false);
      }
    }

    // 📅 LÓGICA INTELIGENTE DE FILTRADO POR FECHA (SIN PROBLEMAS DE TIMEZONE)
    if (startDate && !endDate) {
      // CASO 1: Solo "Desde" - Buscar SOLO ESE DÍA
      devLog('📅 Filtro: Solo "Desde" seleccionado');
      const targetDate = startDate; // 2024-03-26
      filtered = filtered.filter(finance => {
        // Obtener la fecha del registro sin problemas de timezone
        const financeDate = new Date(finance.registrationDate);
        const financeDateString = getDateStringWithoutTimezone(financeDate);
        return financeDateString === targetDate;
      });
    } else if (startDate && endDate) {
      // CASO 2: Ambos rellenos - Buscar el RANGO
      devLog('📅 Filtro: Rango de fechas desde', startDate, 'hasta', endDate);
      filtered = filtered.filter(finance => {
        const financeDate = new Date(finance.registrationDate);
        const financeDateString = getDateStringWithoutTimezone(financeDate);
        
        // Comparar como strings para evitar problemas de timezone
        return financeDateString >= startDate && financeDateString <= endDate;
      });
    } else if (!startDate && endDate) {
      // CASO 3: Solo "Hasta" - Buscar HASTA ESE DÍA
      devLog('📅 Filtro: Solo "Hasta" seleccionado');
      filtered = filtered.filter(finance => {
        const financeDate = new Date(finance.registrationDate);
        const financeDateString = getDateStringWithoutTimezone(financeDate);
        return financeDateString <= endDate;
      });
    }

    // 🔍 Buscar por nombre de miembro
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(finance =>
        finance.memberName.toLowerCase().includes(search)
      );
    }

    devLog('📊 Resultado final de filtros:', `${filtered.length} registros`);
    setFilteredFinances(filtered);
  };

  // ========== DETECTAR SI HAY FECHAS SELECCIONADAS ==========
  const hasDatesSelected = () => {
    // Abre modal siempre que haya al menos una fecha seleccionada
    return !!(startDate || endDate);
  };

  // ========== MANEJAR CLIC EN BOTÓN PDF ==========
  const handleExportPDF = async () => {
    try {
      // SIEMPRE abre el modal si hay fechas seleccionadas
      if (hasDatesSelected()) {
        devLog('📅 Abriendo modal de opciones de reporte');
        setShowReportModal(true);

        logUserAction('open_report_modal', {
          startDate: startDate,
          endDate: endDate,
          recordCount: filteredFinances.length,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Si NO hay fechas seleccionadas, genera PDF con todos los registros
      devLog('📄 Generando PDF con todos los registros (sin filtro de fechas)');

      let title = 'Reporte de Ingresos Financieros';
      if (selectedConcept !== 'ALL') {
        title = `Ingresos: ${getConceptLabel(selectedConcept)}`;
      }
      if (selectedMethod !== 'ALL') {
        title += ` - ${getMethodLabel(selectedMethod)}`;
      }

      const data = {
        title,
        totalAmount: calculateStatistics().totalAmount,
        date: new Date().toLocaleDateString('es-CO'),
        finances: filteredFinances,
        statistics: calculateStatistics(),
      };

      generateFinancePDF(data, 'financial-report');

      devLog('✅ PDF generado');

      logUserAction('export_finance_pdf', {
        type: 'traditional',
        recordCount: filteredFinances.length,
        dateRange: 'sin filtro',
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      devWarn('❌ Error generando PDF:', err.message);
      alert('Error al generar PDF: ' + err.message);
    }
  };

  // ========== MANEJAR CONFIRMACIÓN DE REPORTE ==========
  const handleConfirmReport = (reportType) => {
    try {
      devLog('📄 Generando PDF - Tipo:', reportType);

      // 🔧 CORRECCIÓN v5.5: Usar getDateWithoutTimezone SIEMPRE para evitar desfase
      let reportDateRange = '';
      let reportDateForPDF = startDate;
      
      if (startDate && endDate) {
        // ✅ Usar getDateWithoutTimezone para ambas fechas
        const startDateObj = getDateWithoutTimezone(startDate);
        const endDateObj = getDateWithoutTimezone(endDate);
        const startFormatted = startDateObj.toLocaleDateString('es-CO');
        const endFormatted = endDateObj.toLocaleDateString('es-CO');
        reportDateRange = `${startFormatted} - ${endFormatted}`;
        reportDateForPDF = `${startDate} a ${endDate}`;
        
        devLog('📅 Rango:', {
          input: `${startDate} - ${endDate}`,
          output: reportDateRange,
          startObj: startDateObj,
          endObj: endDateObj
        });
      } else if (startDate) {
        // ✅ Usar getDateWithoutTimezone
        const startDateObj = getDateWithoutTimezone(startDate);
        reportDateRange = startDateObj.toLocaleDateString('es-CO');
        
        devLog('📅 Desde:', {
          input: startDate,
          output: reportDateRange,
          dateObj: startDateObj
        });
      } else if (endDate) {
        // ✅ Usar getDateWithoutTimezone
        const endDateObj = getDateWithoutTimezone(endDate);
        reportDateRange = endDateObj.toLocaleDateString('es-CO');
        reportDateForPDF = endDate;
        
        devLog('📅 Hasta:', {
          input: endDate,
          output: reportDateRange,
          dateObj: endDateObj
        });
      }

      const data = {
        startDate: startDate,
        endDate: endDate,
        date: reportDateForPDF,
        dateRange: reportDateRange,     // ✅ El rango correcto SIN DESFASE
        finances: filteredFinances,
        reportType: reportType,
        statistics: calculateStatistics(),
      };

      devLog('📋 Datos al PDF:', data);

      generateDailyFinancePDF(data, 'reporte-ingresos');

      devLog('✅ PDF generado correctamente');

      logUserAction('generate_report_pdf', {
        startDate: startDate,
        endDate: endDate,
        reportType: reportType,
        recordCount: filteredFinances.length,
        dateRange: reportDateRange,
        timestamp: new Date().toISOString()
      });

      setShowReportModal(false);
      alert('Reporte generado exitosamente');
    } catch (err) {
      devWarn('❌ Error generando PDF:', err.message);
      alert('Error al generar reporte: ' + err.message);
    }
  };

  const handleAddFinance = async (financeData) => {
    try {
      devLog('➕ Creando nuevo ingreso');

      await apiService.createFinance(financeData);

      devLog('✅ Ingreso creado');

      logUserAction('create_finance', {
        amount: financeData.amount,
        concept: financeData.concept,
        timestamp: new Date().toISOString()
      });

      alert('Ingreso registrado exitosamente');
      setShowAddModal(false);
      loadFinances();
    } catch (err) {
      devWarn('❌ Error creando ingreso:', err.message);
      alert('Error al registrar ingreso: ' + err.message);

      logSecurityEvent('finance_create_error', {
        errorType: 'api_error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleEditFinance = async (financeData) => {
    if (!editingFinance) return;

    try {
      devLog('✏️ Actualizando ingreso');

      await apiService.updateFinance(editingFinance.id, financeData);

      devLog('✅ Ingreso actualizado');

      logUserAction('update_finance', {
        financeId: editingFinance.id,
        timestamp: new Date().toISOString()
      });

      alert('Ingreso actualizado exitosamente');
      setShowAddModal(false);
      setEditingFinance(null);
      loadFinances();
    } catch (err) {
      devWarn('❌ Error actualizando ingreso:', err.message);
      alert('Error al actualizar ingreso: ' + err.message);
    }
  };

  const handleVerifyFinance = async (financeId) => {
    if (!window.confirm('¿Deseas verificar este registro?')) {
      return;
    }

    try {
      devLog('✅ Verificando ingreso');

      await apiService.verifyFinance(financeId);

      devLog('✅ Ingreso verificado');

      logUserAction('verify_finance', {
        financeId,
        timestamp: new Date().toISOString()
      });

      alert('Registro verificado exitosamente');
      loadFinances();
    } catch (err) {
      devWarn('❌ Error verificando ingreso:', err.message);
      alert('Error al verificar ingreso: ' + err.message);
    }
  };

  const handleDeleteFinance = async (financeId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      return;
    }

    try {
      devLog('🗑️ Eliminando ingreso');

      await apiService.deleteFinance(financeId);

      devLog('✅ Ingreso eliminado');

      logUserAction('delete_finance', {
        financeId,
        timestamp: new Date().toISOString()
      });

      alert('Registro eliminado exitosamente');
      loadFinances();
    } catch (err) {
      devWarn('❌ Error eliminando ingreso:', err.message);
      alert('Error al eliminar registro: ' + err.message);
    }
  };

  const handleShowStatistics = async () => {
    try {
      devLog('📊 Generando estadísticas');
      const stats = calculateStatistics();
      setStatisticsData(stats);
      setShowStatisticsModal(true);

      logUserAction('view_finance_statistics', {
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      devWarn('❌ Error generando estadísticas:', err.message);
      alert('Error al generar estadísticas: ' + err.message);
    }
  };

  const calculateStatistics = () => {
    const stats = {
      totalRecords: allFinances.length,
      totalAmount: 0,
      verifiedAmount: 0,
      unverifiedAmount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
      byConcept: {},
      byMethod: {},
    };

    allFinances.forEach(finance => {
      stats.totalAmount += finance.amount || 0;

      if (finance.isVerified) {
        stats.verifiedAmount += finance.amount || 0;
        stats.verifiedCount += 1;
      } else {
        stats.unverifiedAmount += finance.amount || 0;
        stats.unverifiedCount += 1;
      }

      if (!stats.byConcept[finance.concept]) {
        stats.byConcept[finance.concept] = { count: 0, total: 0 };
      }
      stats.byConcept[finance.concept].count += 1;
      stats.byConcept[finance.concept].total += finance.amount || 0;

      if (!stats.byMethod[finance.method]) {
        stats.byMethod[finance.method] = { count: 0, total: 0 };
      }
      stats.byMethod[finance.method].count += 1;
      stats.byMethod[finance.method].total += finance.amount || 0;
    });

    return stats;
  };

  const getConceptLabel = (concept) => {
    const map = {
      'TITHE': '💵 Diezmo',
      'OFFERING': '🎁 Ofrenda',
      'SEED_OFFERING': '🌱 Ofrenda de Semilla',
      'BUILDING_FUND': '🏗️ Fondo de Construcción',
      'FIRST_FRUITS': '🍇 Primicias',
      'CELL_GROUP_OFFERING': '🏘️ Ofrenda Grupo de Célula',  // ✅ NUEVO: Ofrenda de Grupo de Célula
    };
    return map[concept] || concept;
  };

  const getMethodLabel = (method) => {
    const map = {
      'CASH': '💵 Efectivo',
      'BANK_TRANSFER': '🏦 Transferencia Bancaria',
    };
    return map[method] || method;
  };

  const getVerificationLabel = (isVerified) => {
    return isVerified ? '✅ Verificado' : '⏳ Pendiente';
  };

  return (
    <div className="finances-page">
      <div className="finances-page-container">
        <div className="finances-page__header">
          <h1>💰 Gestión de Finanzas</h1>
          <p>Registra y gestiona ingresos financieros de la iglesia</p>
        </div>

        <div className="finances-page__controls">
          <div className="finances-page__controls-grid">
            <div className="finances-page__filter-item">
              <label>🔍 Buscar Miembro</label>
              <input
                type="text"
                placeholder="Nombre del miembro..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="finances-page__filter-item">
              <label>💵 Filtrar por Concepto</label>
              <select
                value={selectedConcept}
                onChange={(e) => setSelectedConcept(e.target.value)}
              >
                <option value="ALL">Todos los Conceptos</option>
                {INCOME_CONCEPTS.map(concept => (
                  <option key={concept} value={concept}>
                    {getConceptLabel(concept)}
                  </option>
                ))}
              </select>
            </div>

            <div className="finances-page__filter-item">
              <label>💳 Filtrar por Método</label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
              >
                <option value="ALL">Todos los Métodos</option>
                {INCOME_METHODS.map(method => (
                  <option key={method} value={method}>
                    {getMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>

            <div className="finances-page__filter-item">
              <label>✅ Filtrar por Estado</label>
              <select
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="VERIFIED">✅ Verificados</option>
                <option value="UNVERIFIED">⏳ Pendientes de Verificar</option>
              </select>
            </div>

            <div className="finances-page__filter-item">
              <label>📅 Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="finances-page__filter-item">
              <label>📅 Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="finances-page__actions">
            <button
              className="finances-page__btn finances-page__btn--primary"
              onClick={() => {
                setEditingFinance(null);
                setShowAddModal(true);
              }}
              title="Registrar nuevo ingreso"
            >
              ➕ Registrar
            </button>

            <button
              className="finances-page__btn finances-page__btn--secondary"
              onClick={handleShowStatistics}
              title="Ver estadísticas y gráficos"
            >
              📊 Estadísticas
            </button>

            <button
              className="finances-page__btn finances-page__btn--export"
              onClick={handleExportPDF}
              title="Abrir opciones de reporte"
            >
              📄 PDF
            </button>

            <button
              className="finances-page__btn finances-page__btn--refresh"
              onClick={handleReloadAndClearFilters}
              disabled={loading}
              title="Recargar datos y limpiar filtros"
            >
              🔄 Recargar
            </button>
          </div>
        </div>

        <div className="finances-page__filter-info">
          <p>
            Mostrando <strong>{filteredFinances.length}</strong> de{' '}
            <strong>{allFinances.length}</strong> registros
            {selectedConcept !== 'ALL' && ` · Concepto: ${getConceptLabel(selectedConcept)}`}
            {selectedMethod !== 'ALL' && ` · Método: ${getMethodLabel(selectedMethod)}`}
            {selectedVerification !== 'ALL' && ` · Estado: ${selectedVerification === 'VERIFIED' ? 'Verificados' : 'Pendientes'}`}
            {startDate && !endDate && ` · 📅 ${getDateWithoutTimezone(startDate).toLocaleDateString('es-CO')}`}
            {startDate && endDate && ` · 📅 ${getDateWithoutTimezone(startDate).toLocaleDateString('es-CO')} - ${getDateWithoutTimezone(endDate).toLocaleDateString('es-CO')}`}
          </p>
        </div>

        {error && (
          <div className="finances-page__error">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="finances-page__loading">
            ⏳ Cargando registros financieros...
          </div>
        ) : filteredFinances.length === 0 ? (
          <div className="finances-page__empty">
            <p>💰 No hay registros que coincidan con los filtros</p>
            {allFinances.length === 0 && (
              <p className="finances-page__empty-hint">
                💡 Comienza registrando tu primer ingreso
              </p>
            )}
          </div>
        ) : (
          <div className="finances-page__table-container">
            <table className="finances-page__table">
              <thead>
                <tr>
                  <th className="finances-page__col-member">Miembro</th>
                  <th className="finances-page__col-amount">Monto</th>
                  <th className="finances-page__col-concept">Concepto</th>
                  <th className="finances-page__col-method">Método</th>
                  <th className="finances-page__col-status">Estado</th>
                  <th className="finances-page__col-date">Fecha</th>
                  <th className="finances-page__col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFinances.map(finance => (
                  <tr
                    key={finance.id}
                    className={finance.isVerified ? 'verified' : 'unverified'}
                  >
                    <td className="finances-page__col-member">
                      <div className="finances-page__member-info">
                        <span className="finances-page__avatar">👤</span>
                        <span className="finances-page__member-name">{finance.memberName}</span>
                      </div>
                    </td>

                    <td className="finances-page__col-amount">
                      <span className="finances-page__amount">
                        $ {(finance.amount || 0).toLocaleString('es-CO')}
                      </span>
                    </td>

                    <td className="finances-page__col-concept">
                      <span className="finances-page__badge">
                        {getConceptLabel(finance.concept)}
                      </span>
                    </td>

                    <td className="finances-page__col-method">
                      <span className="finances-page__method-badge">
                        {getMethodLabel(finance.method)}
                      </span>
                    </td>

                    <td className="finances-page__col-status">
                      <span
                        className={`finances-page__status-badge ${
                          finance.isVerified ? 'verified' : 'unverified'
                        }`}
                      >
                        {getVerificationLabel(finance.isVerified)}
                      </span>
                    </td>

                    <td className="finances-page__col-date">
                      {finance.registrationDate
                        ? new Date(finance.registrationDate).toLocaleDateString('es-CO')
                        : '-'}
                    </td>

                    <td className="finances-page__col-actions">
                      <div className="finances-page__action-buttons">
                        {!finance.isVerified && (
                          <button
                            className="finances-page__btn-action verify"
                            onClick={() => handleVerifyFinance(finance.id)}
                            title="Verificar registro"
                          >
                            ✅
                          </button>
                        )}
                        <button
                          className="finances-page__btn-action edit"
                          onClick={() => {
                            setEditingFinance(finance);
                            setShowAddModal(true);
                          }}
                          title="Editar registro"
                        >
                          ✏️
                        </button>
                        <button
                          className="finances-page__btn-action delete"
                          onClick={() => handleDeleteFinance(finance.id)}
                          title="Eliminar registro"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalAddFinance
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingFinance(null);
        }}
        onSave={editingFinance ? handleEditFinance : handleAddFinance}
        initialData={editingFinance}
        isEditing={!!editingFinance}
      />

      <ModalFinanceStatistics
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
        data={statisticsData}
        onExportPDF={() => {
          const stats = calculateStatistics();
          generateFinancePDF(
            { statistics: stats, title: 'Estadísticas de Finanzas' },
            'finance-statistics-report'
          );
        }}
      />

      {/* MODAL: Se abre siempre cuando se presiona PDF */}
      <ModalDailyReportOptions
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onConfirm={handleConfirmReport}
        selectedDate={startDate || endDate}
        financesData={filteredFinances}
        dateRange={startDate && endDate ? `${startDate} - ${endDate}` : null}
      />
    </div>
  );
};

export default FinancesPage;