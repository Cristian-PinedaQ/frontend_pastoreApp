// 📄 financePdfGenerator.js - GENERADOR DE PDF PARA REPORTES FINANCIEROS
// ============================================
// Generador de PDF para reportes financieros con estilo mejorado
// Uso: import { generateFinancePdf } from './financePdfGenerator';
// ============================================

/**
 * Genera un PDF con el reporte financiero usando el mismo formato que cellDetailPDF
 * @param {Object} options - Opciones para generar el PDF
 * @param {Array} options.financesData - Datos financieros
 * @param {string} options.reportType - Tipo de reporte (summary/members)
 * @param {string} options.selectedDate - Fecha seleccionada
 * @param {string} options.dateRange - Rango de fechas
 * @param {boolean} options.includeCharts - Incluir gráficos
 * @param {string} options.title - Título del reporte
 */

// ============================================
// Paleta de colores y constantes de diseño
// ============================================
const COLORS = {
  primary:   '#1e40af',     // Azul oscuro
  accent:    '#3b82f6',     // Azul brillante
  success:   '#10b981',     // Verde
  warning:   '#f59e0b',     // Amarillo
  danger:    '#ef4444',     // Rojo
  inactive:  '#6b7280',     // Gris
  dark:      '#1e293b',     // Azul muy oscuro
  light:     '#f8fafc',     // Gris muy claro
  border:    '#e2e8f0',     // Gris borde
  textMain:  '#1e293b',     // Texto principal
  textSub:   '#64748b',     // Texto secundario
  white:     '#ffffff',
  
  // Colores específicos para finanzas
  income:    '#10b981',     // Verde para ingresos
  verified:  '#10b981',     // Verde para verificado
  pending:   '#f59e0b',     // Amarillo para pendiente
  cash:      '#3b82f6',     // Azul para efectivo
  transfer:  '#8b5cf6',     // Púrpura para transferencia
};

// 📏 TAMAÑO CARTA (Letter) - 216mm x 279mm
//const PAGE = { 
 // W: 216,        // Ancho carta en mm
 // H: 279,        // Alto carta en mm
//  marginX: 18,   // Margen horizontal
 // marginY: 20    // Margen vertical
//};
// Nota: contentW está disponible si se necesita en el futuro
// const contentW = PAGE.W - PAGE.marginX * 2;

// ============================================
// Mapas de conceptos y métodos
// ============================================
const CONCEPT_MAP = {
  'TITHE': 'Diezmo',
  'OFFERING': 'Ofrenda',
  'SEED_OFFERING': 'Ofrenda de Semilla',
  'BUILDING_FUND': 'Fondo de Construcción',
  'FIRST_FRUITS': 'Primicias',
  'CELL_GROUP_OFFERING': 'Ofrenda Grupo de Célula',
  'OTRO': 'Otro'
};

const METHOD_MAP = {
  'CASH': 'Efectivo',
  'BANK_TRANSFER': 'Transferencia Bancaria'
};

// ============================================
// Helpers de formato
// ============================================
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDateFull = (date) => {
  try {
    if (!date) return 'Sin fecha';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return date;
    
    return dateObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return date || 'Sin fecha';
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;
  if (num < 0) return 0;
  if (num > 999999999) return 999999999;
  return num;
};

// ============================================
// Calcular estadísticas
// ============================================
const calculateDetailedStats = (financesData = []) => {
  const stats = {
    totalAmount: 0,
    byConcept: {},
    byMethod: {
      CASH: { count: 0, total: 0 },
      BANK_TRANSFER: { count: 0, total: 0 }
    },
    totalRecords: financesData.length,
    verifiedCount: 0,
    pendingCount: 0,
    finances: financesData
  };

  financesData.forEach(finance => {
    const amount = validateAmount(finance.amount);
    stats.totalAmount += amount;

    // Estado de verificación
    if (finance.isVerified === true) {
      stats.verifiedCount++;
    } else {
      stats.pendingCount++;
    }

    // Por concepto
    const concept = finance.concept || finance.incomeConcept || 'OTRO';
    if (!stats.byConcept[concept]) {
      stats.byConcept[concept] = {
        count: 0,
        total: 0,
        verified: 0,
        pending: 0
      };
    }
    stats.byConcept[concept].count++;
    stats.byConcept[concept].total += amount;
    if (finance.isVerified === true) {
      stats.byConcept[concept].verified++;
    } else {
      stats.byConcept[concept].pending++;
    }

    // Por método
    const method = finance.method || finance.incomeMethod || 'CASH';
    if (method === 'CASH' || method === 'BANK_TRANSFER') {
      stats.byMethod[method].count++;
      stats.byMethod[method].total += amount;
    }
  });

  return stats;
};

// ============================================
// Generador principal de PDF
// ============================================
export const generateFinancePdf = ({
  financesData = [],
  reportType = 'summary',
  selectedDate = null,
  dateRange = null,
  includeCharts = false,
  title = 'Reporte Financiero'
}) => {
  if (!financesData || !Array.isArray(financesData)) return;

  const stats = calculateDetailedStats(financesData);
  const isRangeReport = !!(dateRange && typeof dateRange === 'string');
  const currentDate = new Date();

  // ============================================
  // Construir HTML del documento
  // ============================================
  
  // Función para generar filas de KPIs
  const kpiRow = (label, value, subValue, color = COLORS.primary) => `
    <div style="flex:1;background:${COLORS.light};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${color}">
      <div style="font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${label}</div>
      <div style="font-size:20px;font-weight:800;color:${color};line-height:1">${value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:3px">${subValue}</div>
    </div>
  `;

  // Función para filas de información
  const infoRow = (label, value, valueColor = COLORS.textMain) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid ${COLORS.border}">
      <span style="font-size:11px;color:${COLORS.textSub};font-weight:500">${label}</span>
      <span style="font-size:11px;color:${valueColor};font-weight:600;text-align:right">${value}</span>
    </div>
  `;

  // Función para badge de estado
  const statusBadge = (status, text) => {
    const colors = {
      verified: { bg: '#d1fae5', text: '#065f46' },
      pending: { bg: '#fff7ed', text: '#c2410c' }
    };
    const style = colors[status] || colors.pending;
    return `<span style="background:${style.bg};color:${style.text};font-size:10px;padding:2px 7px;border-radius:10px;white-space:nowrap">${text}</span>`;
  };

  // Generar filas de conceptos
  const conceptRows = Object.entries(stats.byConcept)
    .filter(([_, data]) => data && typeof data === 'object')
    .map(([concept, data], index) => `
      <tr style="background:${index % 2 === 0 ? COLORS.white : '#f8fafc'}">
        <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${CONCEPT_MAP[concept] || concept}</td>
        <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};text-align:center">${data.count}</td>
        <td style="padding:6px 10px;font-size:11px;color:${COLORS.success};border-bottom:1px solid ${COLORS.border};text-align:right;font-weight:600">${formatCurrency(data.total)}</td>
        <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};text-align:center">${statusBadge('verified', data.verified)}</td>
        <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};text-align:center">${statusBadge('pending', data.pending)}</td>
      </tr>
    `).join('');

  // Generar filas de métodos de pago
  const methodRows = [
    { method: 'CASH', label: METHOD_MAP.CASH, color: COLORS.cash },
    { method: 'BANK_TRANSFER', label: METHOD_MAP.BANK_TRANSFER, color: COLORS.transfer }
  ].map(({ method, label, color }, index) => `
    <tr style="background:${index % 2 === 0 ? COLORS.white : '#f8fafc'}">
      <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${label}</td>
      <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};text-align:center">${stats.byMethod[method].count}</td>
      <td style="padding:6px 10px;font-size:11px;color:${color};border-bottom:1px solid ${COLORS.border};text-align:right;font-weight:600">${formatCurrency(stats.byMethod[method].total)}</td>
    </tr>
  `).join('');

  // Generar filas de miembros (si aplica)
  const memberRows = reportType === 'members' ? stats.finances.map((finance, i) => `
    <tr style="background:${i % 2 === 0 ? COLORS.white : '#f8fafc'}">
      <td style="padding:6px 8px;font-size:10px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${i + 1}</td>
      <td style="padding:6px 8px;font-size:10px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${finance.memberName || 'Sin nombre'}</td>
      <td style="padding:6px 8px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${CONCEPT_MAP[finance.concept] || finance.concept || 'OTRO'}</td>
      <td style="padding:6px 8px;font-size:10px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${finance.isVerified ? statusBadge('verified', 'Verificado') : statusBadge('pending', 'Pendiente')}</td>
      <td style="padding:6px 8px;font-size:10px;color:${COLORS.success};border-bottom:1px solid ${COLORS.border};text-align:right;font-weight:600">${formatCurrency(validateAmount(finance.amount))}</td>
      <td style="padding:6px 8px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${finance.recordedBy || '-'}</td>
    </tr>
  `).join('') : '';

  // Construir el HTML completo
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${isRangeReport ? 'Reporte de Ingresos' : 'Reporte Diario de Ingresos'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: ${COLORS.white};
      color: ${COLORS.textMain};
      font-size: 12px;
    }
    /* 📏 TAMAÑO CARTA */
    @page { 
      size: letter; 
      margin: 18mm; 
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- ══ HEADER ══ -->
  <div style="background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.accent} 100%);border-radius:12px;padding:24px 28px;margin-bottom:20px;color:${COLORS.white}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:11px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Reporte Financiero</div>
        <div style="font-size:24px;font-weight:800;line-height:1.1;margin-bottom:8px">${isRangeReport ? 'REPORTE DE INGRESOS' : 'REPORTE DIARIO DE INGRESOS'}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <span style="background:${COLORS.success};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">Total: ${formatCurrency(stats.totalAmount)}</span>
          <span style="background:${COLORS.accent};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">Registros: ${stats.totalRecords}</span>
          ${dateRange ? `<span style="background:${COLORS.warning};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">${dateRange}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:13px;font-weight:700">${formatDateFull(currentDate)}</div>
        <div style="font-size:11px;margin-top:6px">${currentDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  </div>

  <!-- ══ KPIs ══ -->
  <div style="display:flex;gap:12px;margin-bottom:20px">
    ${kpiRow('Total Ingresos', formatCurrency(stats.totalAmount), 'Suma total', COLORS.income)}
    ${kpiRow('Registros', stats.totalRecords, 'Aportes realizados', COLORS.accent)}
    ${kpiRow('Verificados', stats.verifiedCount, `${((stats.verifiedCount/stats.totalRecords)*100 || 0).toFixed(1)}% del total`, COLORS.success)}
    ${kpiRow('Pendientes', stats.pendingCount, `${((stats.pendingCount/stats.totalRecords)*100 || 0).toFixed(1)}% del total`, COLORS.warning)}
  </div>

  <!-- ══ DOS COLUMNAS: INFORMACIÓN + ESTADÍSTICAS ══ -->
  <div style="display:flex;gap:14px;margin-bottom:20px">

    <!-- Información del Reporte -->
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:${COLORS.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${COLORS.accent}">
        📍 Información del Reporte
      </div>
      ${infoRow('Tipo de Reporte', reportType === 'summary' ? 'Resumen' : 'Detallado con Miembros')}
      ${infoRow('Período', dateRange || formatDateFull(selectedDate) || 'No especificado')}
      ${infoRow('Fecha Generación', formatDateTime(currentDate))}
      ${infoRow('Total Conceptos', Object.keys(stats.byConcept).length.toString())}
    </div>

    <!-- Resumen Financiero -->
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:${COLORS.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${COLORS.accent}">
        📊 Resumen Financiero
      </div>
      ${infoRow('Monto Verificado', formatCurrency(stats.byConcept.TITHE?.total || 0), COLORS.success)}
      ${infoRow('Monto Pendiente', formatCurrency(stats.totalAmount - (stats.byConcept.TITHE?.total || 0)), COLORS.warning)}
      ${infoRow('Promedio por Registro', formatCurrency(stats.totalAmount / (stats.totalRecords || 1)), COLORS.textMain)}
      ${infoRow('Tasa de Verificación', `${((stats.verifiedCount/stats.totalRecords)*100 || 0).toFixed(1)}%`, COLORS.success)}
    </div>
  </div>

  <!-- ══ DESGLOSE POR CONCEPTO ══ -->
  ${Object.keys(stats.byConcept).length > 0 ? `
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;margin-bottom:20px">
    <div style="background:${COLORS.primary};padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:${COLORS.white};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px">📋 Desglose por Concepto</span>
      <span style="background:rgba(255,255,255,0.2);color:${COLORS.white};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:700">${Object.keys(stats.byConcept).length} conceptos</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Concepto</th>
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Registros</th>
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:right;font-weight:700;border-bottom:1px solid ${COLORS.border}">Monto Total</th>
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Verificados</th>
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Pendientes</th>
        </tr>
      </thead>
      <tbody>${conceptRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- ══ DESGLOSE POR MÉTODO DE PAGO ══ -->
  ${(stats.byMethod.CASH.count > 0 || stats.byMethod.BANK_TRANSFER.count > 0) ? `
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;margin-bottom:20px">
    <div style="background:${COLORS.accent};padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:${COLORS.white};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px">💳 Desglose por Método de Pago</span>
      <span style="background:rgba(255,255,255,0.2);color:${COLORS.white};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:700">${(stats.byMethod.CASH.count > 0 ? 1 : 0) + (stats.byMethod.BANK_TRANSFER.count > 0 ? 1 : 0)} métodos</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Método de Pago</th>
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Registros</th>
          <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:right;font-weight:700;border-bottom:1px solid ${COLORS.border}">Monto Total</th>
        </tr>
      </thead>
      <tbody>${methodRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- ══ LISTA DETALLADA DE MIEMBROS ══ -->
  ${reportType === 'members' && stats.finances.length > 0 ? `
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;margin-bottom:20px">
    <div style="background:${COLORS.primary};padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:${COLORS.white};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px">👥 Lista Detallada de Aportes</span>
      <span style="background:rgba(255,255,255,0.2);color:${COLORS.white};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:700">${stats.finances.length} aportes</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 8px;font-size:9px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">#</th>
          <th style="padding:8px 8px;font-size:9px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Miembro</th>
          <th style="padding:8px 8px;font-size:9px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Concepto</th>
          <th style="padding:8px 8px;font-size:9px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Estado</th>
          <th style="padding:8px 8px;font-size:9px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:right;font-weight:700;border-bottom:1px solid ${COLORS.border}">Monto</th>
          <th style="padding:8px 8px;font-size:9px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Registrado por</th>
        </tr>
      </thead>
      <tbody>${memberRows}</tbody>
    </table>
  </div>
  ` : ''}

  <!-- ══ RESUMEN FINAL ══ -->
  <div style="margin-top:20px;padding:16px;background:linear-gradient(135deg,${COLORS.primary}10,${COLORS.accent}10);border-radius:10px;border:1px solid ${COLORS.border}">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:14px;font-weight:700;color:${COLORS.primary}">RESUMEN FINAL</span>
      <span style="font-size:20px;font-weight:800;color:${COLORS.success}">${formatCurrency(stats.totalAmount)}</span>
    </div>
    <div style="display:flex;gap:20px;font-size:11px;color:${COLORS.textSub}">
      <span>✓ Verificados: ${stats.verifiedCount} (${formatCurrency(stats.byConcept.TITHE?.total || 0)})</span>
      <span>⏳ Pendientes: ${stats.pendingCount} (${formatCurrency(stats.totalAmount - (stats.byConcept.TITHE?.total || 0))})</span>
      <span>📊 Total registros: ${stats.totalRecords}</span>
    </div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div style="margin-top:20px;padding-top:12px;border-top:1px solid ${COLORS.border};display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:10px;color:${COLORS.textSub}">Sistema de Gestión Financiera • Reporte Confidencial</span>
    <span style="font-size:10px;color:${COLORS.textSub}">${formatDateTime(currentDate)}</span>
  </div>

</body>
</html>`;

  // ============================================
  // Abrir ventana e imprimir
  // ============================================
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }

  win.document.write(html);
  win.document.close();

  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 400);
  };

  return true;
};

// ============================================
// Función de compatibilidad para FinancesPage
// ============================================
export const handlePdfExport = async ({
  financesData,
  selectedDate,
  dateRange,
  reportType = 'summary',
  onSuccess,
  onError
}) => {
  try {
    if (!financesData || financesData.length === 0) {
      throw new Error('No hay datos financieros para exportar');
    }

    await generateFinancePdf({
      financesData,
      reportType,
      selectedDate,
      dateRange,
      title: dateRange ? 'Reporte de Ingresos por Rango' : 'Reporte Diario de Ingresos'
    });

    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess();
    }

    return true;
  } catch (error) {
    console.error('Error en exportación PDF:', error);
    
    if (onError && typeof onError === 'function') {
      onError(error.message || 'Error al generar PDF');
    }
    
    return false;
  }
};

// ============================================
// Funciones de compatibilidad con código existente
// ============================================
export const generateDailyFinancePDF = (data, filename = 'reporte-ingresos') => {
  return generateFinancePdf({
    financesData: data.finances || [],
    reportType: data.reportType || 'summary',
    selectedDate: data.date,
    dateRange: data.dateRange,
    title: data.config?.title || 'Reporte de Ingresos'
  });
};

export const generateFinancePDF = (data, filename = 'financial-report') => {
  return generateFinancePdf({
    financesData: data.finances || [],
    reportType: 'summary',
    title: data.title || 'Reporte Financiero'
  });
};

export const generateFilteredFinancePDF = (data, filename = 'filtered-finance-report') => {
  return generateFinancePdf({
    financesData: data.finances || [],
    reportType: data.reportType || 'summary',
    dateRange: data.dateRange,
    title: data.title || 'Reporte Filtrado'
  });
};

// ============================================
// Exportar helpers para uso externo
// ============================================
export const helpers = {
  formatDate: (date) => formatDateFull(date),
  formatDateTime,
  formatCurrency
};

// ============================================
// Export default con todas las funciones
// ============================================
const pdfGenerator = {
  generateFinancePdf,
  handlePdfExport,
  generateDailyFinancePDF,
  generateFinancePDF,
  generateFilteredFinancePDF,
  helpers
};

export default pdfGenerator;