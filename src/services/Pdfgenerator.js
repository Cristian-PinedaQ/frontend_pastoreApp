// ============================================
// pdfGenerator.js
// Generador de PDF para el listado de estudiantes (con soporte de filtros)
// Uso: import { generatePDF } from './pdfGenerator';
// ============================================

const STATUS_COLORS = {
  ACTIVE:    '#10b981',
  COMPLETED: '#3b82f6',
  FAILED:    '#ef4444',
  PENDING:   '#f59e0b',
  CANCELLED: '#6b7280',
  SUSPENDED: '#6b7280',
};

const STATUS_LABELS = {
  ACTIVE:    'Activo',
  COMPLETED: 'Completado',
  FAILED:    'Reprobado',
  PENDING:   'Pendiente',
  CANCELLED: 'Cancelado',
  SUSPENDED: 'Suspendido',
};

/**
 * Genera un PDF con el listado de estudiantes (filtrado o completo).
 * @param {Object}  config        - Configuración del PDF
 * @param {Array}   config.students - Lista de estudiantes a incluir
 * @param {Object}  config.statistics - Estadísticas por nivel
 * @param {string}  config.title  - Título del reporte
 * @param {string}  config.level  - Nivel filtrado
 * @param {string}  config.year   - Año filtrado
 * @param {string}  config.date   - Fecha del reporte
 * @param {Object}  config.data   - Estructura alternativa con students/statistics
 * @param {Array}   config.filteredStudents - Estudiantes filtrados (compatibilidad)
 * @param {Object}  config.filteredStatistics - Estadísticas filtradas (compatibilidad)
 * @param {string}  config.filterLevel - Nivel filtrado (compatibilidad)
 * @param {string}  config.filterYear - Año filtrado (compatibilidad)
 * @param {string}  config.filterStatus - Estado filtrado (compatibilidad)
 * @param {string}  filenameParam - Nombre del archivo (opcional, se usa en el título)
 */
export const generatePDF = (config, filenameParam = 'reporte') => {
  const COLORS = {
    primary:  '#1e40af',
    accent:   '#3b82f6',
    success:  '#10b981',
    warning:  '#f59e0b',
    danger:   '#ef4444',
    inactive: '#6b7280',
    dark:     '#1e293b',
    light:    '#f8fafc',
    border:   '#e2e8f0',
    textMain: '#1e293b',
    textSub:  '#64748b',
    white:    '#ffffff',
  };

  // Destructurar con flexibilidad para ambas estructuras de datos
  const {
    title,
    level,
    year,
    date,
    students = [],
    statistics = {},
    // Compatibilidad con estructura anterior
    data,
    filteredStudents,
    filteredStatistics,
    filterLevel = null,
    filterYear = null,
    filterStatus = null,
  } = config;

  // Determinar valores correctos según estructura de datos
  const studentsData = students || filteredStudents || data?.students || [];
  const statsData = statistics || filteredStatistics || data?.statistics || {};
  const titleData = title || data?.title || 'Listado de Estudiantes';
  const levelData = level || filterLevel || data?.level || 'Todos los Niveles';
  const yearData = year || filterYear || data?.year || 'Todos los Años';
  const statusFilter = filterStatus;

  // ========== GENERAR FECHA CORRECTAMENTE ==========
  // Si hay filtro de año: "Año 2025 - Fecha del reporte: 31 de enero de 2025"
  // Sin filtro de año: "Fecha del reporte: 31 de enero de 2025"
  const formatDate = (dateString) => {
    if (dateString) return dateString;
    return new Date().toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  let dateStringValue = '';
  if (yearData !== 'Todos los Años' && yearData !== 'ALL') {
    const reportDate = formatDate(date);
    dateStringValue = `Año ${yearData} - Fecha del reporte: ${reportDate}`;
  } else {
    dateStringValue = `Fecha del reporte: ${formatDate(date)}`;
  }

  // ========== CONSTRUIR BADGES DE FILTROS ==========
  const filterBadges = [];
  if (levelData !== 'Todos los Niveles' && levelData !== 'ALL') {
    filterBadges.push(`<span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">Nivel: ${levelData}</span>`);
  }
  if (yearData !== 'Todos los Años' && yearData !== 'ALL') {
    filterBadges.push(`<span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">Año: ${yearData}</span>`);
  }
  if (statusFilter) {
    filterBadges.push(`<span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">Estado: ${statusFilter}</span>`);
  }

  // ========== KPIs ==========
  const totalStudents = studentsData.length;
  const activeStudents = studentsData.filter(s => s.status === 'ACTIVE').length;
  const completedStudents = studentsData.filter(s => s.status === 'COMPLETED').length;
  const failedStudents = studentsData.filter(s => s.status === 'FAILED').length;
  const pendingStudents = studentsData.filter(s => s.status === 'PENDING').length;

  const kpis = [
    { label: 'Total Estudiantes', value: totalStudents, color: COLORS.primary },
    { label: 'Activos', value: activeStudents, color: COLORS.success },
    { label: 'Completados', value: completedStudents, color: COLORS.accent },
    { label: 'Reprobados', value: failedStudents, color: COLORS.danger },
    { label: 'Pendientes', value: pendingStudents, color: COLORS.warning },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ========== DISTRIBUCIÓN POR ESTADO ==========
  const total = totalStudents || 1;
  const statusDist = [
    { key: 'ACTIVE', count: activeStudents, color: STATUS_COLORS.ACTIVE, label: STATUS_LABELS.ACTIVE },
    { key: 'COMPLETED', count: completedStudents, color: STATUS_COLORS.COMPLETED, label: STATUS_LABELS.COMPLETED },
    { key: 'FAILED', count: failedStudents, color: STATUS_COLORS.FAILED, label: STATUS_LABELS.FAILED },
    { key: 'PENDING', count: pendingStudents, color: STATUS_COLORS.PENDING, label: STATUS_LABELS.PENDING },
  ].filter(s => s.count > 0);

  const statusBars = statusDist.map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:100px">${s.label}</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((s.count/total)*100)}%;height:100%;background:${s.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${s.color};min-width:30px;text-align:right">${s.count}</span>
    </div>
  `).join('');

  // ========== ESTADÍSTICAS POR NIVEL ==========
  const levelRows = Object.entries(statsData).map(([key, stat]) => {
    const passColor = stat.passPercentage >= 70 ? COLORS.success : (stat.passPercentage >= 50 ? COLORS.warning : COLORS.danger);
    return `
      <tr>
        <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${stat.label || key}</td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border};text-align:center">${stat.total || 0}</td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.success};border-bottom:1px solid ${COLORS.border};text-align:center">${stat.passed || 0}</td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.danger};border-bottom:1px solid ${COLORS.border};text-align:center">${stat.failed || 0}</td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.warning};border-bottom:1px solid ${COLORS.border};text-align:center">${stat.pending || 0}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="background:${passColor}22;color:${passColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${stat.passPercentage || 0}%</span>
        </td>
      </tr>
    `;
  }).join('');

  // ========== TABLA DE ESTUDIANTES ==========
  const tableRows = studentsData.map((student, i) => {
    const sc = STATUS_COLORS[student.status] || COLORS.inactive;
    const sl = STATUS_LABELS[student.status] || student.status;
    
    // Extraer año de la fecha de inscripción
    let enrollYear = '-';
    if (student.enrollmentDate) {
      try {
        enrollYear = new Date(student.enrollmentDate).getFullYear().toString();
      } catch (e) {
        enrollYear = '-';
      }
    }

    const attendanceColor = student.attendancePercentage >= 75 ? COLORS.success : (student.attendancePercentage >= 50 ? COLORS.warning : COLORS.danger);
    const resultText = student.passed === true ? '✅ Aprobado' : student.passed === false ? '❌ Reprobado' : '⏳ Pendiente';
    const resultColor = student.passed === true ? COLORS.success : (student.passed === false ? COLORS.danger : COLORS.warning);

    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${student.studentName || ''}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${sc}22;color:${sc};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${sl}</span>
        </td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${student.levelEnrollment || ''}</td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border};text-align:center">${enrollYear}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="background:${attendanceColor}22;color:${attendanceColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${(student.attendancePercentage || 0).toFixed(1)}%</span>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="background:${resultColor}22;color:${resultColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${resultText}</span>
        </td>
      </tr>
    `;
  }).join('');

  // ========== TOTALES GENERALES ==========
  const totalPassed = Object.values(statsData).reduce((sum, s) => sum + (s.passed || 0), 0);
  const totalFailed = Object.values(statsData).reduce((sum, s) => sum + (s.failed || 0), 0);
  const totalPending = Object.values(statsData).reduce((sum, s) => sum + (s.pending || 0), 0);
  const overallPercentage = totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0;

  // ========== HTML COMPLETO ==========
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Estudiantes${filterBadges.length ? ' (Filtrado)' : ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #1e293b; font-size: 12px; }
    @page { size: A4 landscape; margin: 14mm 16mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-break { break-inside: avoid; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);border-radius:12px;padding:20px 24px;margin-bottom:18px;color:#fff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:10px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">
          Sistema de Gestión Educativa
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">
          📚 ${titleData}${filterBadges.length ? ' — Filtrado' : ' — General'}
        </div>
        ${filterBadges.length ? `<div>Filtros activos: ${filterBadges.join('')}</div>` : ''}
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <div style="font-size:10px;margin-top:4px">${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div style="display:flex;gap:12px;margin-bottom:16px" class="no-break">
    ${kpiBoxes}
  </div>

  <!-- DISTRIBUCIONES Y RESUMEN -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Distribución por Estado
      </div>
      ${statusBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
    </div>
    <div style="flex:2;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Resumen General
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:15px">
        <div style="flex:1;min-width:120px">
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">Total estudiantes</span>
            <span style="font-weight:700;color:#1e293b">${totalStudents}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">Aprobados</span>
            <span style="font-weight:700;color:#10b981">${totalPassed}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">Reprobados</span>
            <span style="font-weight:700;color:#ef4444">${totalFailed}</span>
          </div>
        </div>
        <div style="flex:1;min-width:120px">
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">Pendientes</span>
            <span style="font-weight:700;color:#f59e0b">${totalPending}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">Tasa aprobación</span>
            <span style="font-weight:700;color:#1e40af">${overallPercentage}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
            <span style="color:#64748b">${dateStringValue}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ESTADÍSTICAS POR NIVEL -->
  ${Object.keys(statsData).length > 0 ? `
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;margin-bottom:18px" class="no-break">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Estadísticas por Nivel</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${Object.keys(statsData).length} niveles</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Nivel</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Total</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Aprobados</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Reprobados</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Pendientes</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">% Aprobación</th>
        </tr>
      </thead>
      <tbody>${levelRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- TABLA DE ESTUDIANTES -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado de Estudiantes</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${studentsData.length} registros</span>
    </div>
    ${studentsData.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay estudiantes que coincidan con los filtros aplicados.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Estudiante</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Estado</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Nivel</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Año</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Asistencia</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Resultado</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    `}
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:9px;color:#94a3b8">Sistema de Gestión Educativa • Reporte Confidencial${filterBadges.length ? ' • Con filtros aplicados' : ''}</span>
    <span style="font-size:9px;color:#94a3b8">${new Date().toLocaleString('es-CO')}</span>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=750');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
};

/**
 * Genera un PDF de estadísticas con el mismo formato
 * @param {Object} config - Configuración del PDF de estadísticas
 * @param {string} filenameParam - Nombre del archivo (opcional)
 */
export const generateStatisticsPDF = (config, filenameParam = 'estadisticas') => {
  // Reutilizar la misma función pero con un título diferente
  const statsConfig = {
    ...config,
    title: config.title || 'Estadísticas por Nivel',
    students: [], // No mostrar estudiantes individuales
  };
  
  // Llamar a generatePDF con la configuración modificada
  // Pero en este caso, como queremos enfocarnos en estadísticas,
  // podríamos crear una versión simplificada o simplemente usar generatePDF
  generatePDF(statsConfig, filenameParam);
};

// Helper para obtener etiqueta de estado (se mantiene por compatibilidad)
//const getStatusLabel = (status) => {
//  return STATUS_LABELS[status] || status;
//};