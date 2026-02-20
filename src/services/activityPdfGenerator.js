// ============================================
// activityPdfGenerator.js
// Generador de PDF para reportes de actividades
// Uso: import { generateActivityPDF, generateActivityDetailPDF } from './activityPdfGenerator';
// ============================================

// ────────────────────────────────────────────
// Paleta de colores (MISMA que cellDetailPdfGenerator)
// ────────────────────────────────────────────
const COLORS = {
  primary:   '#1e40af',     // Azul oscuro
  accent:    '#3b82f6',     // Azul brillante
  success:   '#10b981',     // Verde
  warning:   '#f59e0b',     // Amarillo/Ámbar
  danger:    '#ef4444',     // Rojo
  inactive:  '#6b7280',     // Gris
  dark:      '#1e293b',     // Azul muy oscuro
  light:     '#f8fafc',     // Casi blanco
  border:    '#e2e8f0',     // Gris borde
  textMain:  '#1e293b',     // Texto principal
  textSub:   '#64748b',     // Texto secundario
  white:     '#ffffff',
};

// Helper para formatear moneda (MANTENIDO)
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "$ 0";
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper para formatear fecha (MANTENIDO)
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '—';
  }
};

// Obtener información financiera de cada actividad (MANTENIDO)
const fetchActivityFinancialData = async (activity) => {
  try {
    const apiService = await import('../apiService').then(module => module.default);
    const balance = await apiService.request(`/activity/balance/${activity.id}`);
    
    return {
      totalCollected: balance?.totalPaid || 0,
      totalExpenses: balance?.totalCosts || 0,
      balance: (balance?.totalPaid || 0) - (balance?.totalCosts || 0),
      totalCommitted: balance?.totalCommitted || 0,
      participantCount: balance?.participantCount || 0,
      compliancePercentage: balance?.compliancePercentage || 0,
      createdAt: activity.registrationDate
    };
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener información financiera para la actividad ${activity.id}:`, error);
    return {
      totalCollected: 0,
      totalExpenses: 0,
      balance: 0,
      totalCommitted: 0,
      participantCount: 0,
      compliancePercentage: 0,
      createdAt: activity.registrationDate
    };
  }
};

// Calcular días restantes (MANTENIDO)
const calculateDaysLeft = (endDate) => {
  if (!endDate) return null;
  try {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (e) {
    return null;
  }
};

// Obtener texto de estado (MANTENIDO)
const getStatusText = (isActive, endDate) => {
  if (!isActive) return "Inactiva";
  
  const today = new Date();
  const end = new Date(endDate);
  
  if (isNaN(end.getTime())) return "Activa";
  
  if (end < today) return "Finalizada";
  if (end.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000) {
    return "Por finalizar";
  }
  
  return "Activa";
};

// Calcular capacidad utilizada y porcentaje (MANTENIDO)
const calculateCapacityUsage = (participantCount, quantity) => {
  if (!quantity || quantity <= 0) return { used: participantCount, total: "Ilimitada", percentage: 0 };
  
  const percentage = quantity > 0 ? ((participantCount / quantity) * 100) : 0;
  return {
    used: participantCount,
    total: quantity,
    percentage: percentage.toFixed(1)
  };
};

// Calcular valor total (MANTENIDO)
const calculateTotalValue = (price, quantity) => {
  return (price || 0) * (quantity || 0);
};

// Helper para determinar color según balance (MANTENIDO)
const getBalanceColor = (balance) => {
  return balance >= 0 ? COLORS.success : COLORS.danger;
};

// ────────────────────────────────────────────
// GENERADOR PRINCIPAL DE PDF (CON NUEVO FORMATO)
// ────────────────────────────────────────────

/**
 * Genera un reporte PDF de actividades con el mismo formato que cellDetailPdfGenerator
 * @param {Object} data - Datos de actividades
 * @param {string} filename - Nombre del archivo
 */
export const generateActivityPDF = async (data, filename = 'activity-report') => {
  try {
    console.log('🔧 [generateActivityPDF] Iniciando generación de PDF...');
    
    // Obtener información financiera completa
    const activitiesWithFinance = await Promise.all(
      (data.activities || []).map(async (activity) => {
        const financeData = await fetchActivityFinancialData(activity);
        const daysLeft = calculateDaysLeft(activity.endDate);
        const statusText = getStatusText(activity.isActive, activity.endDate);
        const capacityUsage = calculateCapacityUsage(financeData.participantCount, activity.quantity);
        const totalValue = calculateTotalValue(activity.price, activity.quantity);
        
        return { 
          ...activity, 
          financeData,
          daysLeft,
          statusText,
          capacityUsage,
          totalValue
        };
      })
    );
    
    // Calcular totales globales
    const totalCollected = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalCollected, 0);
    const totalExpenses = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalExpenses, 0);
    const overallBalance = totalCollected - totalExpenses;
    const totalCommitted = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalCommitted, 0);
    const totalParticipants = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.participantCount, 0);
    const totalValue = activitiesWithFinance.reduce((sum, a) => sum + a.totalValue, 0);
    
    // Constantes de página
    //const PAGE = { W: 297, H: 210, marginX: 18, marginY: 20 }; // landscape
    //const contentW = PAGE.W - PAGE.marginX * 2;

    // ────────────────────────────────────────────
    // Construir el HTML del documento
    // ────────────────────────────────────────────
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Actividades</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: ${COLORS.white};
      color: ${COLORS.textMain};
      font-size: 12px;
      line-height: 1.5;
    }
    @page { 
      size: A4 landscape; 
      margin: 18mm; 
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .kpi-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .kpi-card {
      flex: 1;
      min-width: 140px;
      background: ${COLORS.light};
      border: 1px solid ${COLORS.border};
      border-radius: 10px;
      padding: 14px;
      border-top: 3px solid;
    }
    .kpi-label {
      font-size: 10px;
      color: ${COLORS.textSub};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 800;
      line-height: 1;
    }
    .kpi-sub {
      font-size: 10px;
      color: ${COLORS.textSub};
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    th {
      background: ${COLORS.primary};
      color: ${COLORS.white};
      padding: 8px 6px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      border: 1px solid ${COLORS.primary};
    }
    td {
      padding: 6px;
      border: 1px solid ${COLORS.border};
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background: ${COLORS.light};
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .financial-summary {
      background: ${COLORS.white};
      border: 1px solid ${COLORS.border};
      border-radius: 10px;
      padding: 16px;
      margin-top: 20px;
    }
    .summary-title {
      font-size: 12px;
      font-weight: 800;
      color: ${COLORS.primary};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${COLORS.accent};
    }
    .legend {
      display: flex;
      gap: 20px;
      margin-top: 15px;
      font-size: 8px;
      color: ${COLORS.textSub};
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
  </style>
</head>
<body>

  <!-- ══ HEADER ══ -->
  <div style="background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.accent} 100%);border-radius:12px;padding:24px 28px;margin-bottom:20px;color:${COLORS.white}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:11px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Reporte de Gestión</div>
        <div style="font-size:28px;font-weight:800;line-height:1.1;margin-bottom:8px">REPORTE DE ACTIVIDADES</div>
        <div style="font-size:14px;opacity:0.9">${data.subtitle || 'Resumen general de actividades'}</div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:13px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
      </div>
    </div>
  </div>

  <!-- ══ KPIs GLOBALES ══ -->
  <div class="kpi-grid">
    <div class="kpi-card" style="border-top-color: ${COLORS.primary}">
      <div class="kpi-label">Total Actividades</div>
      <div class="kpi-value" style="color: ${COLORS.primary}">${activitiesWithFinance.length}</div>
    </div>
    <div class="kpi-card" style="border-top-color: ${COLORS.success}">
      <div class="kpi-label">Participantes</div>
      <div class="kpi-value" style="color: ${COLORS.success}">${totalParticipants}</div>
    </div>
    <div class="kpi-card" style="border-top-color: ${COLORS.primary}">
      <div class="kpi-label">Valor Total</div>
      <div class="kpi-value" style="color: ${COLORS.primary}">${formatCurrency(totalValue)}</div>
    </div>
    <div class="kpi-card" style="border-top-color: ${COLORS.primary}">
      <div class="kpi-label">Comprometido</div>
      <div class="kpi-value" style="color: ${COLORS.primary}">${formatCurrency(totalCommitted)}</div>
    </div>
    <div class="kpi-card" style="border-top-color: ${COLORS.success}">
      <div class="kpi-label">Recaudado</div>
      <div class="kpi-value" style="color: ${COLORS.success}">${formatCurrency(totalCollected)}</div>
    </div>
    <div class="kpi-card" style="border-top-color: ${COLORS.danger}">
      <div class="kpi-label">Gastos</div>
      <div class="kpi-value" style="color: ${COLORS.danger}">${formatCurrency(totalExpenses)}</div>
    </div>
    <div class="kpi-card" style="border-top-color: ${getBalanceColor(overallBalance)}">
      <div class="kpi-label">Balance General</div>
      <div class="kpi-value" style="color: ${getBalanceColor(overallBalance)}">${formatCurrency(overallBalance)}</div>
    </div>
  </div>

  <!-- ══ TABLA PRINCIPAL DE ACTIVIDADES ══ -->
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;margin-bottom:20px">
    <div style="background:${COLORS.primary};padding:12px 16px">
      <span style="color:${COLORS.white};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px">📋 DETALLE DE ACTIVIDADES</span>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>ACTIVIDAD</th>
          <th>ESTADO</th>
          <th>PRECIO</th>
          <th>CAPACIDAD</th>
          <th>CREACIÓN</th>
          <th>FINALIZACIÓN</th>
          <th>VALOR TOTAL</th>
          <th>COMPROMETIDO</th>
          <th>PAGADO</th>
          <th>PENDIENTE</th>
          <th>GASTOS</th>
          <th>BALANCE</th>
          <th>CUMPLIMIENTO</th>
        </tr>
      </thead>
      <tbody>
        ${activitiesWithFinance.map(activity => {
          const daysLeftText = activity.daysLeft > 0 ? ` (${activity.daysLeft} días)` : '';
          const statusColor = 
            activity.statusText === 'Activa' ? COLORS.success :
            activity.statusText === 'Por finalizar' ? COLORS.warning :
            activity.statusText === 'Finalizada' ? COLORS.inactive :
            activity.statusText === 'Inactiva' ? COLORS.danger : COLORS.textSub;
          
          const balance = activity.financeData.balance;
          const balanceColor = balance >= 0 ? COLORS.success : COLORS.danger;
          const compliance = activity.financeData.compliancePercentage || 0;
          const complianceColor = compliance >= 80 ? COLORS.success : compliance >= 50 ? COLORS.warning : COLORS.danger;
          
          return `
            <tr>
              <td class="font-bold">${activity.activityName || 'Sin nombre'}</td>
              <td class="text-center">
                <span class="status-badge" style="background:${statusColor}20; color:${statusColor}">${activity.statusText}</span>
              </td>
              <td class="text-right">${formatCurrency(activity.price || 0)}</td>
              <td class="text-center">
                ${activity.capacityUsage.total === "Ilimitada" 
                  ? `${activity.capacityUsage.used} / Ilimitada`
                  : `${activity.capacityUsage.used} / ${activity.capacityUsage.total} (${activity.capacityUsage.percentage}%)`}
              </td>
              <td class="text-center">${formatDate(activity.registrationDate)}</td>
              <td class="text-center">${formatDate(activity.endDate)}${daysLeftText}</td>
              <td class="text-right font-bold">${formatCurrency(activity.totalValue)}</td>
              <td class="text-right" style="color:${COLORS.primary}; font-weight:700">${formatCurrency(activity.financeData.totalCommitted)}</td>
              <td class="text-right" style="color:${COLORS.success}; font-weight:700">${formatCurrency(activity.financeData.totalCollected)}</td>
              <td class="text-right" style="color:${COLORS.warning}; font-weight:700">${formatCurrency(activity.financeData.totalCommitted - activity.financeData.totalCollected)}</td>
              <td class="text-right" style="color:${COLORS.danger}; font-weight:700">${formatCurrency(activity.financeData.totalExpenses)}</td>
              <td class="text-right" style="color:${balanceColor}; font-weight:700">${formatCurrency(balance)}</td>
              <td class="text-center" style="color:${complianceColor}; font-weight:700">${compliance.toFixed(1)}%</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- ══ ANÁLISIS FINANCIERO DETALLADO ══ -->
  <div class="financial-summary">
    <div class="summary-title">💰 ANÁLISIS FINANCIERO DETALLADO</div>
    
    <table style="margin-top:10px">
      <thead>
        <tr>
          <th>ACTIVIDAD</th>
          <th>COMPROMETIDO</th>
          <th>PAGADO</th>
          <th>PENDIENTE</th>
          <th>GASTOS</th>
          <th>BALANCE</th>
          <th>% COBRANZA</th>
        </tr>
      </thead>
      <tbody>
        ${activitiesWithFinance.map(activity => {
          const balance = activity.financeData.balance;
          const balanceColor = balance >= 0 ? COLORS.success : COLORS.danger;
          const cobranza = activity.financeData.totalCommitted > 0 
            ? (activity.financeData.totalCollected / activity.financeData.totalCommitted * 100).toFixed(1)
            : '0';
          const cobranzaColor = cobranza >= 80 ? COLORS.success : cobranza >= 50 ? COLORS.warning : COLORS.danger;
          
          return `
            <tr>
              <td class="font-bold">${activity.activityName || 'Sin nombre'}</td>
              <td class="text-right" style="color:${COLORS.primary}">${formatCurrency(activity.financeData.totalCommitted)}</td>
              <td class="text-right" style="color:${COLORS.success}">${formatCurrency(activity.financeData.totalCollected)}</td>
              <td class="text-right" style="color:${COLORS.warning}">${formatCurrency(activity.financeData.totalCommitted - activity.financeData.totalCollected)}</td>
              <td class="text-right" style="color:${COLORS.danger}">${formatCurrency(activity.financeData.totalExpenses)}</td>
              <td class="text-right" style="color:${balanceColor}; font-weight:700">${formatCurrency(balance)}</td>
              <td class="text-center" style="color:${cobranzaColor}; font-weight:700">${cobranza}%</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <!-- Leyenda -->
    <div class="legend">
      <div class="legend-item">
        <div class="legend-color" style="background:${COLORS.success}"></div>
        <span>Balance positivo / Pagado</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background:${COLORS.danger}"></div>
        <span>Balance negativo / Gastos</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background:${COLORS.warning}"></div>
        <span>Pendiente</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background:${COLORS.primary}"></div>
        <span>Comprometido</span>
      </div>
    </div>
    
    <!-- Notas explicativas -->
    <div style="margin-top:15px; padding:10px; background:${COLORS.light}; border-radius:8px; font-size:9px; color:${COLORS.textSub}">
      <div style="font-weight:700; margin-bottom:5px">📝 Notas:</div>
      <div>• Balance = Pagado - Gastos (utilidad de la actividad)</div>
      <div>• Cumplimiento = (Pagado / Comprometido) × 100</div>
    </div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div style="margin-top:20px; padding-top:12px; border-top:1px solid ${COLORS.border}; display:flex; justify-content:space-between; align-items:center">
    <span style="font-size:8px; color:${COLORS.textSub}">Sistema de Gestión de Actividades • Información equivalente a vista "Información General"</span>
    <span style="font-size:8px; color:${COLORS.textSub}">Página 1 de 1 • Confidencial</span>
  </div>

</body>
</html>`;

    // ────────────────────────────────────────────
    // Abrir ventana e imprimir
    // ────────────────────────────────────────────
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) {
      alert('Por favor permite ventanas emergentes para generar el PDF.');
      return false;
    }

    win.document.write(html);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        win.print();
        // Opcional: cerrar después de imprimir
        // win.onafterprint = () => win.close();
      }, 400);
    };

    console.log('✅ PDF generado exitosamente');
    return true;

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar el PDF. Por favor, intente nuevamente.');
    return false;
  }
};

/**
 * Genera un PDF detallado para una actividad específica
 * @param {Object} data - Datos de la actividad y su balance
 * @param {string} filename - Nombre del archivo
 */
export const generateActivityDetailPDF = (data, filename = 'activity-detail') => {
  try {
    console.log('📄 [generateActivityDetailPDF] Generando PDF...');
    
    if (!data || !data.activity) {
      console.error('❌ Datos inválidos para generar PDF de detalle');
      return false;
    }
    
    const activity = data.activity;
    const balance = data.balance || {};
    
    // Calcular valores
    const totalCommitted = balance.totalCommitted || 0;
    const totalPaid = balance.totalPaid || 0;
    const totalCosts = balance.totalCosts || 0;
    const balanceValue = balance.balance || (totalPaid - totalCosts);
    const percentagePaid = totalCommitted > 0 ? ((totalPaid / totalCommitted) * 100) : 0;
    const percentageCosts = totalCommitted > 0 ? ((totalCosts / totalCommitted) * 100) : 0;
    const status = getStatusText(activity.isActive, activity.endDate);
    
    const statusColor = 
      status === 'Activa' ? COLORS.success :
      status === 'Por finalizar' ? COLORS.warning :
      status === 'Finalizada' ? COLORS.inactive :
      status === 'Inactiva' ? COLORS.danger : COLORS.textMain;

    // ────────────────────────────────────────────
    // Construir el HTML del documento
    // ────────────────────────────────────────────
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Detalle de Actividad - ${activity.activityName || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: ${COLORS.white};
      color: ${COLORS.textMain};
      font-size: 12px;
      line-height: 1.5;
    }
    @page { 
      size: A4; 
      margin: 18mm; 
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: ${COLORS.primary};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 20px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid ${COLORS.accent};
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid ${COLORS.border};
    }
    .info-label {
      font-size: 11px;
      color: ${COLORS.textSub};
      font-weight: 500;
      min-width: 200px;
    }
    .info-value {
      font-size: 11px;
      color: ${COLORS.textMain};
      font-weight: 600;
      text-align: right;
      flex: 1;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .kpi-card {
      flex: 1;
      background: ${COLORS.light};
      border: 1px solid ${COLORS.border};
      border-radius: 10px;
      padding: 16px;
      border-top: 3px solid;
    }
    .progress-bar-container {
      background: ${COLORS.border};
      border-radius: 6px;
      height: 10px;
      overflow: hidden;
      margin: 8px 0;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.3s;
    }
    .financial-grid {
      display: flex;
      gap: 14px;
      margin: 20px 0;
    }
  </style>
</head>
<body>

  <!-- ══ HEADER ══ -->
  <div style="background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.accent} 100%);border-radius:12px;padding:24px 28px;margin-bottom:20px;color:${COLORS.white}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:11px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Reporte Detallado de Actividad</div>
        <div style="font-size:24px;font-weight:800;line-height:1.2;margin-bottom:8px">${activity.activityName || 'Sin nombre'}</div>
        <div>
          <span class="status-badge" style="background:${statusColor}; color:${COLORS.white}">${status}</span>
        </div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:13px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</div>
        <div style="font-size:11px;margin-top:6px">ID: #${activity.id || '—'}</div>
      </div>
    </div>
  </div>

  <!-- ══ INFORMACIÓN BÁSICA ══ -->
  <div class="section-title">📋 INFORMACIÓN BÁSICA</div>
  
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px;margin-bottom:20px">
    <div class="info-row">
      <span class="info-label">💰 Precio por participante</span>
      <span class="info-value">${formatCurrency(activity.price || 0)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">👥 Capacidad máxima</span>
      <span class="info-value">${activity.quantity ? activity.quantity : 'Ilimitada'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">📅 Fecha de creación</span>
      <span class="info-value">${formatDate(activity.registrationDate)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">📅 Fecha de finalización</span>
      <span class="info-value">${formatDate(activity.endDate)}</span>
    </div>
  </div>

  <!-- ══ INFORMACIÓN FINANCIERA ══ -->
  <div class="section-title">💰 INFORMACIÓN FINANCIERA</div>
  
  <div class="financial-grid">
    <!-- Recaudado -->
    <div class="kpi-card" style="border-top-color: ${COLORS.success}">
      <div style="font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Recaudado</div>
      <div style="font-size:24px;font-weight:800;color:${COLORS.success};line-height:1">${formatCurrency(totalPaid)}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:3px">${percentagePaid.toFixed(1)}% del comprometido</div>
    </div>
    
    <!-- Comprometido -->
    <div class="kpi-card" style="border-top-color: ${COLORS.primary}">
      <div style="font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Comprometido</div>
      <div style="font-size:24px;font-weight:800;color:${COLORS.primary};line-height:1">${formatCurrency(totalCommitted)}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:3px">100% base</div>
    </div>
    
    <!-- Gastos -->
    <div class="kpi-card" style="border-top-color: ${COLORS.danger}">
      <div style="font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Gastos</div>
      <div style="font-size:24px;font-weight:800;color:${COLORS.danger};line-height:1">${formatCurrency(totalCosts)}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:3px">${percentageCosts.toFixed(1)}% del comprometido</div>
    </div>
    
    <!-- Balance -->
    <div class="kpi-card" style="border-top-color: ${getBalanceColor(balanceValue)}">
      <div style="font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Balance Actual</div>
      <div style="font-size:24px;font-weight:800;color:${getBalanceColor(balanceValue)};line-height:1">${formatCurrency(balanceValue)}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:3px">${balanceValue >= 0 ? 'Superávit' : 'Déficit'}</div>
    </div>
  </div>

  <!-- ══ BARRAS DE PROGRESO ══ -->
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px;margin:20px 0">
    <div style="font-size:12px;font-weight:800;color:${COLORS.primary};margin-bottom:15px">📊 INDICADORES DE RENDIMIENTO</div>
    
    <!-- Barra de recaudación -->
    <div style="margin-bottom:15px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:11px;color:${COLORS.textMain}">Recaudación vs Comprometido</span>
        <span style="font-size:11px;font-weight:700;color:${COLORS.success}">${percentagePaid.toFixed(1)}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width:${Math.min(100, percentagePaid)}%;background:${COLORS.success}"></div>
      </div>
    </div>
    
    <!-- Barra de gastos -->
    <div style="margin-bottom:15px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:11px;color:${COLORS.textMain}">Gastos vs Comprometido</span>
        <span style="font-size:11px;font-weight:700;color:${COLORS.warning}">${percentageCosts.toFixed(1)}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width:${Math.min(100, percentageCosts)}%;background:${COLORS.warning}"></div>
      </div>
    </div>
    
    <!-- Barra de cumplimiento (si existe) -->
    ${balance.compliancePercentage ? `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:11px;color:${COLORS.textMain}">Cumplimiento General</span>
        <span style="font-size:11px;font-weight:700;color:${balance.compliancePercentage >= 80 ? COLORS.success : balance.compliancePercentage >= 50 ? COLORS.warning : COLORS.danger}">${balance.compliancePercentage.toFixed(1)}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width:${balance.compliancePercentage}%;background:${balance.compliancePercentage >= 80 ? COLORS.success : balance.compliancePercentage >= 50 ? COLORS.warning : COLORS.danger}"></div>
      </div>
    </div>
    ` : ''}
  </div>

  <!-- ══ ESTADÍSTICAS ADICIONALES ══ -->
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px;margin:20px 0">
    <div style="font-size:12px;font-weight:800;color:${COLORS.primary};margin-bottom:12px">📈 ESTADÍSTICAS ADICIONALES</div>
    
    <div style="display:flex;gap:20px;flex-wrap:wrap">
      ${balance.totalParticipants !== undefined ? `
      <div style="flex:1;min-width:150px">
        <div style="font-size:10px;color:${COLORS.textSub};margin-bottom:2px">Participantes Inscritos</div>
        <div style="font-size:18px;font-weight:800;color:${COLORS.primary}">${balance.totalParticipants}</div>
      </div>
      ` : ''}
      
      ${balance.compliancePercentage !== undefined ? `
      <div style="flex:1;min-width:150px">
        <div style="font-size:10px;color:${COLORS.textSub};margin-bottom:2px">Tasa de Cumplimiento</div>
        <div style="font-size:18px;font-weight:800;color:${balance.compliancePercentage >= 80 ? COLORS.success : balance.compliancePercentage >= 50 ? COLORS.warning : COLORS.danger}">${balance.compliancePercentage.toFixed(1)}%</div>
      </div>
      ` : ''}
      
      <div style="flex:1;min-width:150px">
        <div style="font-size:10px;color:${COLORS.textSub};margin-bottom:2px">Eficiencia de Recaudo</div>
        <div style="font-size:18px;font-weight:800;color:${percentagePaid >= 80 ? COLORS.success : percentagePaid >= 50 ? COLORS.warning : COLORS.danger}">${percentagePaid.toFixed(1)}%</div>
      </div>
    </div>
  </div>

  <!-- ══ CONCLUSIÓN ══ -->
  <div style="background:${COLORS.light};border:1px solid ${COLORS.border};border-radius:10px;padding:16px;margin:20px 0">
    <div style="font-size:12px;font-weight:800;color:${COLORS.primary};margin-bottom:8px">📝 CONCLUSIÓN</div>
    <p style="font-size:11px;color:${COLORS.textMain};line-height:1.6">
      ${balanceValue > 0 
        ? `✅ La actividad presenta un balance POSITIVO de ${formatCurrency(balanceValue)}. Esto indica una gestión financiera efectiva con un recaudo del ${percentagePaid.toFixed(1)}% de los ingresos comprometidos${balance.compliancePercentage ? ` y una tasa de cumplimiento del ${balance.compliancePercentage.toFixed(1)}%` : ''}.`
        : balanceValue < 0
        ? `⚠️ La actividad presenta un balance NEGATIVO de ${formatCurrency(Math.abs(balanceValue))}. Se recomienda revisar los gastos (${percentageCosts.toFixed(1)}% de los ingresos) y optimizar la gestión financiera.`
        : `ℹ️ La actividad se encuentra en EQUILIBRIO financiero. El recaudo actual es de ${formatCurrency(totalPaid)} con un ${percentagePaid.toFixed(1)}% de cumplimiento.`
      }
    </p>
  </div>

  <!-- ══ FOOTER ══ -->
  <div style="margin-top:20px;padding-top:12px;border-top:1px solid ${COLORS.border};display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:8px;color:${COLORS.textSub}">Sistema de Gestión de Actividades • Reporte Confidencial</span>
    <span style="font-size:8px;color:${COLORS.textSub}">${new Date().toLocaleString('es-CO')}</span>
  </div>

</body>
</html>`;

    // ────────────────────────────────────────────
    // Abrir ventana e imprimir
    // ────────────────────────────────────────────
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Por favor permite ventanas emergentes para generar el PDF.');
      return false;
    }

    win.document.write(html);
    win.document.close();

    win.onload = () => {
      setTimeout(() => {
        win.print();
        // Opcional: cerrar después de imprimir
        // win.onafterprint = () => win.close();
      }, 400);
    };

    console.log('✅ PDF de detalle de actividad generado exitosamente');
    return true;

  } catch (error) {
    console.error('❌ Error generando PDF de detalle:', error);
    alert('Error al generar el PDF. Por favor, intente nuevamente.');
    return false;
  }
};