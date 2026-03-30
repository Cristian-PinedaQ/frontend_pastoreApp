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

// ============================================
// NUEVA FUNCIÓN: Obtener estadísticas de entregas
// ============================================
const fetchActivityDeliveryStats = async (activity) => {
  try {
    const apiService = await import('../apiService').then(module => module.default);
    
    // Obtener participantes con información de entregas
    const participants = await apiService.request(
      `/activity-contribution/activity/${activity.id}/with-leader-info`
    );
    
    if (!participants || !Array.isArray(participants)) {
      return { deliveredCount: 0, totalParticipants: 0, deliveryPercentage: 0 };
    }
    
    const deliveredCount = participants.filter(p => p.itemDelivered === true).length;
    const totalParticipants = participants.length;
    const deliveryPercentage = totalParticipants > 0 
      ? (deliveredCount / totalParticipants) * 100 
      : 0;
    
    return {
      deliveredCount,
      totalParticipants,
      deliveryPercentage: deliveryPercentage.toFixed(1)
    };
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener estadísticas de entregas para actividad ${activity.id}:`, error);
    return { deliveredCount: 0, totalParticipants: 0, deliveryPercentage: 0 };
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
// GENERADOR PRINCIPAL DE PDF (CON NUEVO FORMATO Y ENTREGADOS)
// ────────────────────────────────────────────

// ============================================
// activityPdfGenerator.js - CORRECCIÓN PARA ENTREGAS
// ============================================

// ============================================
// activityPdfGenerator.js - ACTUALIZADO CON CAPACIDAD Y UNIDADES
// ============================================

// ... (mantener todas las constantes y helpers existentes)

/**
 * Helper para obtener el total de unidades de una actividad
 * Suma la cantidad (quantity) de cada participante
 */
const fetchTotalUnits = async (activityId) => {
  try {
    const apiService = await import('../apiService').then(module => module.default);
    const participants = await apiService.request(
      `/activity-contribution/activity/${activityId}/with-leader-info`
    );
    
    if (!participants || !Array.isArray(participants)) return 0;
    
    // Sumar la cantidad de unidades por participante
    const totalUnits = participants.reduce((sum, p) => sum + (p.quantity || 1), 0);
    return totalUnits;
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener total de unidades para actividad ${activityId}:`, error);
    return 0;
  }
};

/**
 * Obtener información financiera de cada actividad (MODIFICADO - incluye unidades)
 */
const fetchActivityFinancialData = async (activity) => {
  try {
    const apiService = await import('../apiService').then(module => module.default);
    const balance = await apiService.request(`/activity/balance/${activity.id}`);
    
    // Obtener estadísticas de entregas
    const deliveryStats = await fetchActivityDeliveryStats(activity);
    
    // ✅ Obtener total de unidades (suma de quantity de participantes)
    const totalUnits = await fetchTotalUnits(activity.id);
    
    return {
      totalCollected: balance?.totalPaid || 0,
      totalExpenses: balance?.totalCosts || 0,
      balance: (balance?.totalPaid || 0) - (balance?.totalCosts || 0),
      totalCommitted: balance?.totalCommitted || 0,
      participantCount: balance?.participantCount || 0,
      compliancePercentage: balance?.compliancePercentage || 0,
      createdAt: activity.registrationDate,
      // Datos de entregas
      deliveredCount: deliveryStats.deliveredCount,
      totalParticipants: deliveryStats.totalParticipants,
      deliveryPercentage: deliveryStats.deliveryPercentage,
      // ✅ NUEVO: Total de unidades
      totalUnits: totalUnits
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
      createdAt: activity.registrationDate,
      deliveredCount: 0,
      totalParticipants: 0,
      deliveryPercentage: 0,
      totalUnits: 0 // ✅ NUEVO
    };
  }
};

/**
 * Genera un reporte PDF de actividades con capacidad y unidades
 */
export const generateActivityPDF = async (data, filename = 'activity-report') => {
  try {
    console.log('🔧 [generateActivityPDF] Iniciando generación de PDF...');
    
    // Obtener información financiera completa (incluye unidades)
    const activitiesWithFinance = await Promise.all(
      (data.activities || []).map(async (activity) => {
        const financeData = await fetchActivityFinancialData(activity);
        const daysLeft = calculateDaysLeft(activity.endDate);
        const statusText = getStatusText(activity.isActive, activity.endDate);
        
        // ✅ Capacidad: quantity de la actividad (cupo máximo)
        const capacity = activity.quantity || 0;
        const totalUnits = financeData.totalUnits; // Unidades vendidas (suma de quantity de participantes)
        const totalParticipants = financeData.totalParticipants; // Número de participantes
        const capacityUsage = calculateCapacityUsage(totalParticipants, capacity);
        
        // ✅ Porcentaje de ocupación basado en unidades vs capacidad
        const unitCapacityPercentage = capacity > 0 
          ? ((totalUnits / capacity) * 100).toFixed(1)
          : 0;
        
        const totalValue = calculateTotalValue(activity.price, totalUnits);
        
        // ✅ Usar datos de entregas que vienen de ActivityPage
        let deliveryStats = activity.deliveryStats;
        
        if (!deliveryStats) {
          deliveryStats = {
            deliveredCount: financeData.deliveredCount,
            totalParticipants: financeData.totalParticipants,
            deliveryPercentage: financeData.deliveryPercentage
          };
        }
        
        return { 
          ...activity, 
          financeData,
          daysLeft,
          statusText,
          capacity,
          totalUnits,           // ✅ Unidades vendidas
          totalParticipants,    // ✅ Participantes inscritos
          capacityUsage,
          unitCapacityPercentage, // ✅ Porcentaje de capacidad usado
          totalValue,
          deliveryStats
        };
      })
    );
    
    // Calcular totales globales
    const totalCollected = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalCollected, 0);
    const totalExpenses = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalExpenses, 0);
    const overallBalance = totalCollected - totalExpenses;
    const totalParticipantsGlobal = activitiesWithFinance.reduce((sum, a) => sum + a.totalParticipants, 0);
    const totalUnitsGlobal = activitiesWithFinance.reduce((sum, a) => sum + a.totalUnits, 0);
    const totalCapacityGlobal = activitiesWithFinance.reduce((sum, a) => sum + (a.capacity || 0), 0);
    
    // Totales de entregas
    const totalDelivered = activitiesWithFinance.reduce((sum, a) => sum + (a.deliveryStats?.deliveredCount || 0), 0);
    const totalDeliveryPercentage = totalParticipantsGlobal > 0 
      ? ((totalDelivered / totalParticipantsGlobal) * 100).toFixed(1) 
      : 0;
    
    // ✅ Porcentaje global de capacidad usada
    const globalCapacityPercentage = totalCapacityGlobal > 0 
      ? ((totalUnitsGlobal / totalCapacityGlobal) * 100).toFixed(1)
      : 0;
    
    console.log('📊 [PDF] Totales:', {
      totalParticipantsGlobal,
      totalUnitsGlobal,
      totalCapacityGlobal,
      globalCapacityPercentage,
      totalDelivered
    });
    
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
    .capacity-bar-container {
      background: ${COLORS.border};
      border-radius: 4px;
      height: 6px;
      width: 80px;
      overflow: hidden;
      display: inline-block;
      margin-left: 6px;
    }
    .capacity-bar-fill {
      height: 100%;
      border-radius: 4px;
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
      flex-wrap: wrap;
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
    .delivery-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 600;
      background: #e6f7e6;
      color: #2e7d32;
    }
    .delivery-badge.low {
      background: #fff3e0;
      color: #ed6c02;
    }
    .delivery-badge.critical {
      background: #ffebee;
      color: #c62828;
    }
    .capacity-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 600;
    }
    .capacity-badge.high {
      background: #d4edda;
      color: #155724;
    }
    .capacity-badge.medium {
      background: #fff3cd;
      color: #856404;
    }
    .capacity-badge.low {
      background: #f8d7da;
      color: #721c24;
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

  <!-- ══ KPIs GLOBALES (CON CAPACIDAD Y UNIDADES) ══ -->
  <div class="kpi-grid">
    <div class="kpi-card" style="border-top-color: ${COLORS.primary}">
      <div class="kpi-label">Total Actividades</div>
      <div class="kpi-value" style="color: ${COLORS.primary}">${activitiesWithFinance.length}</div>
    </div>
    <div class="kpi-card" style="border-top-color: ${COLORS.success}">
      <div class="kpi-label">Participantes</div>
      <div class="kpi-value" style="color: ${COLORS.success}">${totalParticipantsGlobal}</div>
    </div>
    <div class="kpi-card" style="border-top-color: #2196f3">
      <div class="kpi-label">🔢 Unidades Totales</div>
      <div class="kpi-value" style="color: #2196f3">${totalUnitsGlobal}</div>
      <div class="kpi-sub">${globalCapacityPercentage}% de capacidad total</div>
    </div>
    <div class="kpi-card" style="border-top-color: #9c27b0">
      <div class="kpi-label">🎯 Capacidad Total</div>
      <div class="kpi-value" style="color: #9c27b0">${totalCapacityGlobal}</div>
      <div class="kpi-sub">Cupo máximo disponible</div>
    </div>
    <div class="kpi-card" style="border-top-color: #4caf50">
      <div class="kpi-label">📦 Entregados</div>
      <div class="kpi-value" style="color: #4caf50">${totalDelivered}</div>
      <div class="kpi-sub">${totalDeliveryPercentage}% del total</div>
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

  <!-- ══ TABLA PRINCIPAL DE ACTIVIDADES (CON CAPACIDAD Y UNIDADES) ══ -->
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;margin-bottom:20px">
    <div style="background:${COLORS.primary};padding:12px 16px">
      <span style="color:${COLORS.white};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px">📋 DETALLE DE ACTIVIDADES</span>
    </div>
    
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:left">ACTIVIDAD</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:center">ESTADO</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:right">PRECIO</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:center">🎯 CAPACIDAD</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:center">🔢 UNIDADES</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:center">👥 PARTIC.</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:center">📦 ENTREGADOS</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:center">FECHA FIN</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:right">VALOR TOTAL</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:right">PAGADO</th>
          <th style="padding:8px 6px;font-size:9px;color:#64748b;text-align:right">BALANCE</th>
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
          
          // ✅ Capacidad y unidades
          const capacity = activity.capacity;
          const totalUnits = activity.totalUnits;
          const totalParticipants = activity.totalParticipants;
          const capacityPercentage = capacity > 0 
            ? ((totalUnits / capacity) * 100).toFixed(1)
            : 0;
          
          const capacityBadgeClass = capacityPercentage >= 80 ? 'high' : (capacityPercentage >= 50 ? 'medium' : 'low');
          const capacityBarColor = capacityPercentage >= 80 ? '#28a745' : (capacityPercentage >= 50 ? '#ffc107' : '#dc3545');
          
          // 📦 Entregas
          const deliveredCount = activity.deliveryStats?.deliveredCount || 0;
          const deliveryPercent = activity.deliveryStats?.deliveryPercentage || 0;
          const deliveryBadgeClass = deliveryPercent >= 80 ? '' : (deliveryPercent >= 50 ? 'low' : 'critical');
          
          // ✅ Mostrar información de capacidad
          const capacityDisplay = capacity > 0 
            ? `${capacity} cupos`
            : 'Ilimitada';
          
          const unitsDisplay = `${totalUnits} unidad${totalUnits !== 1 ? 'es' : ''}`;
          const participantsDisplay = `${totalParticipants} persona${totalParticipants !== 1 ? 's' : ''}`;
          
          return `
            <tr style="border-bottom:1px solid ${COLORS.border}">
              <td style="padding:8px 6px;font-size:11px;font-weight:600">
                ${activity.activityName || 'Sin nombre'}
                ${activity.levelCode ? `<br><small style="font-size:8px;color:#666">🎓 ${activity.levelDisplayName || activity.levelCode}</small>` : ''}
              </td>
              <td style="padding:8px 6px;text-align:center">
                <span class="status-badge" style="background:${statusColor}20; color:${statusColor}">${activity.statusText}</span>
              </td>
              <td style="padding:8px 6px;text-align:right">${formatCurrency(activity.price || 0)}</td>
              <td style="padding:8px 6px;text-align:center">
                <div><strong>${capacityDisplay}</strong></div>
                ${capacity > 0 ? `
                <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:3px">
                  <span class="capacity-badge ${capacityBadgeClass}" style="font-size:8px">
                    ${capacityPercentage}% usado
                  </span>
                  <div class="capacity-bar-container">
                    <div class="capacity-bar-fill" style="width:${capacityPercentage}%;background:${capacityBarColor}"></div>
                  </div>
                </div>
                ` : ''}
              </td>
              <td style="padding:8px 6px;text-align:center;font-weight:600;color:#2196f3">
                ${unitsDisplay}
              </td>
              <td style="padding:8px 6px;text-align:center;color:${COLORS.textSub}">
                ${participantsDisplay}
              </td>
              <td style="padding:8px 6px;text-align:center">
                <span class="delivery-badge ${deliveryBadgeClass}">
                  ${deliveredCount} / ${totalParticipants} (${deliveryPercent}%)
                </span>
              </td>
              <td style="padding:8px 6px;text-align:center">${formatDate(activity.endDate)}${daysLeftText}</td>
              <td style="padding:8px 6px;text-align:right;font-weight:700">${formatCurrency(activity.totalValue)}</td>
              <td style="padding:8px 6px;text-align:right;color:${COLORS.success}">${formatCurrency(activity.financeData.totalCollected)}</td>
              <td style="padding:8px 6px;text-align:right;color:${balanceColor};font-weight:700">${formatCurrency(balance)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- ══ RESUMEN DE CAPACIDAD Y OCUPACIÓN ══ -->
  <div class="financial-summary">
    <div class="summary-title">🎯 RESUMEN DE CAPACIDAD Y OCUPACIÓN</div>
    
    <div style="display:flex;gap:20px;margin-top:15px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div style="font-size:11px;color:${COLORS.textSub};margin-bottom:5px">📊 Ocupación General</div>
        <div style="font-size:28px;font-weight:800;color:${globalCapacityPercentage >= 80 ? '#28a745' : (globalCapacityPercentage >= 50 ? '#ffc107' : '#dc3545')}">
          ${globalCapacityPercentage}%
        </div>
        <div style="font-size:10px;color:${COLORS.textSub}">
          ${totalUnitsGlobal} de ${totalCapacityGlobal} unidades ocupadas
        </div>
      </div>
      <div style="flex:2">
        <div style="font-size:11px;color:${COLORS.textSub};margin-bottom:5px">Distribución por nivel de ocupación</div>
        <div style="background:${COLORS.border};border-radius:8px;height:20px;overflow:hidden">
          <div style="display:flex;height:100%">
            ${(() => {
              const high = activitiesWithFinance.filter(a => a.capacity > 0 && (a.totalUnits / a.capacity) >= 0.8).length;
              const medium = activitiesWithFinance.filter(a => a.capacity > 0 && (a.totalUnits / a.capacity) >= 0.5 && (a.totalUnits / a.capacity) < 0.8).length;
              const low = activitiesWithFinance.filter(a => a.capacity > 0 && (a.totalUnits / a.capacity) < 0.5).length;
              const totalWithCapacity = activitiesWithFinance.filter(a => a.capacity > 0).length;
              
              if (totalWithCapacity === 0) return '<div style="background:#e9ecef;height:100%;width:100%;text-align:center;font-size:10px;line-height:20px">Sin actividades con capacidad definida</div>';
              
              const highPercent = (high / totalWithCapacity) * 100;
              const mediumPercent = (medium / totalWithCapacity) * 100;
              const lowPercent = (low / totalWithCapacity) * 100;
              
              return `
                <div style="width:${highPercent}%;background:#28a745;text-align:center;font-size:9px;color:white;line-height:20px">${high > 0 ? `${high} alta` : ''}</div>
                <div style="width:${mediumPercent}%;background:#ffc107;text-align:center;font-size:9px;color:#333;line-height:20px">${medium > 0 ? `${medium} media` : ''}</div>
                <div style="width:${lowPercent}%;background:#dc3545;text-align:center;font-size:9px;color:white;line-height:20px">${low > 0 ? `${low} baja` : ''}</div>
              `;
            })()}
          </div>
        </div>
        <div class="legend" style="margin-top:10px">
          <div class="legend-item"><div class="legend-color" style="background:#28a745"></div><span>Alta ocupación (>80%)</span></div>
          <div class="legend-item"><div class="legend-color" style="background:#ffc107"></div><span>Media ocupación (50-80%)</span></div>
          <div class="legend-item"><div class="legend-color" style="background:#dc3545"></div><span>Baja ocupación (<50%)</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ ANÁLISIS FINANCIERO DETALLADO ══ -->
  <div class="financial-summary" style="margin-top:16px">
    <div class="summary-title">💰 ANÁLISIS FINANCIERO DETALLADO</div>
    
    <table style="margin-top:10px;width:100%">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 6px;font-size:9px;text-align:left">ACTIVIDAD</th>
          <th style="padding:8px 6px;font-size:9px;text-align:right">UNIDADES</th>
          <th style="padding:8px 6px;font-size:9px;text-align:right">PRECIO UNIT.</th>
          <th style="padding:8px 6px;font-size:9px;text-align:right">VALOR TOTAL</th>
          <th style="padding:8px 6px;font-size:9px;text-align:right">PAGADO</th>
          <th style="padding:8px 6px;font-size:9px;text-align:right">PENDIENTE</th>
          <th style="padding:8px 6px;font-size:9px;text-align:right">% COBRANZA</th>
         </tr>
      </thead>
      <tbody>
        ${activitiesWithFinance.map(activity => {
          const pending = activity.financeData.totalCommitted - activity.financeData.totalCollected;
          const cobranza = activity.financeData.totalCommitted > 0 
            ? (activity.financeData.totalCollected / activity.financeData.totalCommitted * 100).toFixed(1)
            : '0';
          const cobranzaColor = cobranza >= 80 ? COLORS.success : cobranza >= 50 ? COLORS.warning : COLORS.danger;
          
          return `
            <tr style="border-bottom:1px solid ${COLORS.border}">
              <td style="padding:6px;font-size:10px;font-weight:600">${activity.activityName || 'Sin nombre'}</td>
              <td style="padding:6px;text-align:right;font-size:10px">${activity.totalUnits}</td>
              <td style="padding:6px;text-align:right;font-size:10px">${formatCurrency(activity.price || 0)}</td>
              <td style="padding:6px;text-align:right;font-size:10px;font-weight:600">${formatCurrency(activity.totalValue)}</td>
              <td style="padding:6px;text-align:right;font-size:10px;color:${COLORS.success}">${formatCurrency(activity.financeData.totalCollected)}</td>
              <td style="padding:6px;text-align:right;font-size:10px;color:${COLORS.warning}">${formatCurrency(pending)}</td>
              <td style="padding:6px;text-align:center;font-size:10px;font-weight:700;color:${cobranzaColor}">${cobranza}%</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    
    <div class="legend" style="margin-top:15px">
      <div class="legend-item"><div class="legend-color" style="background:${COLORS.success}"></div><span>Balance positivo / Pagado</span></div>
      <div class="legend-item"><div class="legend-color" style="background:${COLORS.danger}"></div><span>Balance negativo / Gastos</span></div>
      <div class="legend-item"><div class="legend-color" style="background:${COLORS.warning}"></div><span>Pendiente</span></div>
      <div class="legend-item"><div class="legend-color" style="background:#2196f3"></div><span>🔢 Unidades = Suma de quantity por participante</span></div>
      <div class="legend-item"><div class="legend-color" style="background:#9c27b0"></div><span>🎯 Capacidad = Cupo máximo de la actividad</span></div>
      <div class="legend-item"><div class="legend-color" style="background:#4caf50"></div><span>📦 Artículo entregado</span></div>
    </div>
    
    <div style="margin-top:15px; padding:10px; background:${COLORS.light}; border-radius:8px; font-size:9px; color:${COLORS.textSub}">
      <div style="font-weight:700; margin-bottom:5px">📝 Notas:</div>
      <div>• 🔢 Unidades = Suma de la cantidad de unidades por cada participante (para actividades que lo permiten)</div>
      <div>• 🎯 Capacidad = Cupo máximo definido para la actividad (opcional)</div>
      <div>• Ocupación = (Unidades / Capacidad) × 100</div>
      <div>• Balance = Pagado - Gastos (utilidad de la actividad)</div>
      <div>• 📦 Entregados = Participantes que recibieron el artículo/kit de la actividad</div>
    </div>
  </div>

  <!-- ══ FOOTER ══ -->
  <div style="margin-top:20px; padding-top:12px; border-top:1px solid ${COLORS.border}; display:flex; justify-content:space-between; align-items:center">
    <span style="font-size:8px; color:${COLORS.textSub}">Sistema de Gestión de Actividades • Información equivalente a vista "Información General"</span>
    <span style="font-size:8px; color:${COLORS.textSub}">Página 1 de 1 • Confidencial</span>
  </div>

</body>
</html>`;

    // Abrir ventana e imprimir
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