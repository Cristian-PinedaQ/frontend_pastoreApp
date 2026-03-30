// ============================================
// participantsGeneralPdfGenerator.js
// Generador de PDF para el listado general de participantes (con soporte de filtros)
// ✅ ACTUALIZADO: Incluye cantidad de unidades y entrega de artículo
// ============================================

const PAYMENT_STATUS_COLORS = {
  FULLY_PAID: '#10b981',    // Verde
  PARTIALLY_PAID: '#f59e0b', // Naranja
  PENDING: '#ef4444',        // Rojo
};

const PAYMENT_STATUS_LABELS = {
  FULLY_PAID: 'COMPLETO',
  PARTIALLY_PAID: 'PARCIAL',
  PENDING: 'PENDIENTE',
};

const DELIVERY_COLORS = {
  DELIVERED: '#10b981',     // Verde
  NOT_DELIVERED: '#f59e0b', // Naranja
};

const DELIVERY_LABELS = {
  DELIVERED: 'ENTREGADO',
  NOT_DELIVERED: 'PENDIENTE',
};

/**
 * Helper para obtener el estado de entrega de un participante
 * Soporta diferentes nombres de campo: itemDelivered, delivered, isDelivered
 */
const getItemDelivered = (participant) => {
  if (participant.itemDelivered !== undefined && participant.itemDelivered !== null) {
    return participant.itemDelivered === true;
  }
  if (participant.delivered !== undefined && participant.delivered !== null) {
    return participant.delivered === true;
  }
  if (participant.isDelivered !== undefined && participant.isDelivered !== null) {
    return participant.isDelivered === true;
  }
  if (participant.item_delivered !== undefined && participant.item_delivered !== null) {
    return participant.item_delivered === true;
  }
  return false;
};

/**
 * Helper para obtener la cantidad de unidades de un participante
 */
const getQuantity = (participant) => {
  return participant.quantity || 1;
};

/**
 * Helper para obtener el precio total considerando cantidad
 */
const getTotalPrice = (participant, unitPrice) => {
  if (participant.totalPrice) return participant.totalPrice;
  const qty = getQuantity(participant);
  return (unitPrice || 0) * qty;
};

/**
 * Genera un PDF con el listado general de participantes (filtrado o completo).
 * @param {Object} data - Datos para el reporte general
 * @param {string} filename - Nombre del archivo
 */
export const generateGeneralParticipantsPDF = (data, filename = 'participantes-general') => {
  const COLORS = {
    primary: '#1e40af',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    inactive: '#6b7280',
    dark: '#1e293b',
    light: '#f8fafc',
    border: '#e2e8f0',
    textMain: '#1e293b',
    textSub: '#64748b',
    white: '#ffffff',
    info: '#0891b2',
    delivered: '#10b981',
    notDelivered: '#f59e0b',
  };

  const { activity, participants = [], filters = {}, statistics: providedStats } = data;

  if (!participants || participants.length === 0) {
    alert('No hay participantes para generar el reporte');
    return false;
  }

  // ────────────────────────────────────────────
  // Calcular estadísticas (ACTUALIZADO con cantidad y entregas)
  // ────────────────────────────────────────────
  const calculateStatistics = (participants) => {
    const unitPrice = activity?.price || 0;
    
    const deliveredCount = participants.filter(p => getItemDelivered(p) === true).length;
    const notDeliveredCount = participants.length - deliveredCount;
    
    // ✅ Nueva estadística: total de unidades
    const totalUnits = participants.reduce((sum, p) => sum + getQuantity(p), 0);
    
    // ✅ Nueva estadística: total a pagar considerando cantidad
    const totalToPay = participants.reduce((sum, p) => sum + getTotalPrice(p, unitPrice), 0);
    
    const stats = {
      total: participants.length,
      totalUnits: totalUnits, // 🆕 Total de unidades (para actividades con cantidad)
      totalToPay: totalToPay, // 🆕 Total a pagar (considerando cantidad)
      fullyPaid: participants.filter(p => p.isFullyPaid).length,
      partiallyPaid: participants.filter(p => (p.totalPaid || 0) > 0 && !p.isFullyPaid).length,
      pending: participants.filter(p => (p.totalPaid || 0) === 0).length,
      totalPaid: participants.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
      totalPending: participants.reduce((sum, p) => sum + (p.pendingBalance || 0), 0),
      delivered: deliveredCount,
      notDelivered: notDeliveredCount,
    };
    
    stats.percentagePaid = totalToPay > 0 
      ? ((stats.totalPaid / totalToPay) * 100).toFixed(1)
      : 0;
    
    stats.deliveryPercentage = stats.total > 0
      ? ((stats.delivered / stats.total) * 100).toFixed(1)
      : 0;
    
    return stats;
  };

  const stats = providedStats || calculateStatistics(participants);

  // ────────────────────────────────────────────
  // Helper para formatear moneda
  // ────────────────────────────────────────────
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "$ 0";
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ────────────────────────────────────────────
  // Helper para formatear fecha
  // ────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return '-';
    }
  };

  // ────────────────────────────────────────────
  // Resumen de filtros aplicados
  // ────────────────────────────────────────────
  const appliedFilters = [];
  if (filters.searchText) appliedFilters.push(`Búsqueda: "${filters.searchText}"`);
  if (filters.leaderFilter) appliedFilters.push(`Líder: ${filters.leaderFilter}`);
  if (filters.districtFilter) appliedFilters.push(`Distrito: ${filters.districtFilter}`);
  
  const filterBadges = appliedFilters.map(filter => `
    <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">
      ${filter}
    </span>
  `).join('');

  const hasFilters = appliedFilters.length > 0;

  // ────────────────────────────────────────────
  // KPI boxes (ACTUALIZADOS con UNIDADES y ENTREGAS)
  // ────────────────────────────────────────────
  const unitPrice = activity?.price || 0;
  const hasQuantity = participants.some(p => getQuantity(p) > 1);
  
  const kpis = [
    { label: 'Total Participantes', value: stats.total, color: COLORS.primary },
    ...(hasQuantity ? [{ label: 'Total Unidades', value: stats.totalUnits, color: COLORS.info }] : []),
    { label: 'Completamente Pagado', value: stats.fullyPaid, color: COLORS.success },
    { label: 'Pago Parcial', value: stats.partiallyPaid, color: COLORS.warning },
    { label: 'Pendiente', value: stats.pending, color: COLORS.danger },
    { label: '📦 Entregados', value: stats.delivered, color: COLORS.delivered, subtext: `${stats.deliveryPercentage}%` },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
      ${k.subtext ? `<div style="font-size:8px;color:${COLORS.textSub};margin-top:2px">${k.subtext} del total</div>` : ''}
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Distribución por estado de pago — mini barras
  // ────────────────────────────────────────────
  const total = participants.length || 1;
  const paymentStatusDist = [
    { key: 'FULLY_PAID', count: stats.fullyPaid, label: 'Completamente Pagado' },
    { key: 'PARTIALLY_PAID', count: stats.partiallyPaid, label: 'Pago Parcial' },
    { key: 'PENDING', count: stats.pending, label: 'Pendiente' },
  ].filter(s => s.count > 0);

  const statusBars = paymentStatusDist.map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:140px">${s.label}</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((s.count/total)*100)}%;height:100%;background:${PAYMENT_STATUS_COLORS[s.key]};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${PAYMENT_STATUS_COLORS[s.key]};min-width:30px;text-align:right">${s.count}</span>
    </div>
  `).join('');

  // 🆕 Distribución por estado de entrega
  const deliveryDist = [
    { key: 'DELIVERED', count: stats.delivered, label: 'Entregados', color: COLORS.delivered },
    { key: 'NOT_DELIVERED', count: stats.notDelivered, label: 'Pendientes de entrega', color: COLORS.notDelivered },
  ].filter(s => s.count > 0);

  const deliveryBars = deliveryDist.map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:140px">${s.label}</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((s.count/total)*100)}%;height:100%;background:${s.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${s.color};min-width:30px;text-align:right">${s.count}</span>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Resumen financiero (ACTUALIZADO con total a pagar)
  // ────────────────────────────────────────────
  const financialSummary = `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Total a pagar</span>
      <span style="font-weight:700;color:${COLORS.primary}">${formatCurrency(stats.totalToPay)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Total recaudado</span>
      <span style="font-weight:700;color:${COLORS.success}">${formatCurrency(stats.totalPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Por cobrar</span>
      <span style="font-weight:700;color:${COLORS.danger}">${formatCurrency(stats.totalPending)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
      <span style="color:${COLORS.textSub}">Porcentaje recaudado</span>
      <span style="font-weight:700;color:${COLORS.primary}">${stats.percentagePaid}%</span>
    </div>
  `;

  // 🆕 Resumen de entregas
  const deliverySummary = `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">📦 Entregados</span>
      <span style="font-weight:700;color:${COLORS.delivered}">${stats.delivered}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">⏳ Pendientes de entrega</span>
      <span style="font-weight:700;color:${COLORS.notDelivered}">${stats.notDelivered}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
      <span style="color:${COLORS.textSub}">Tasa de entrega</span>
      <span style="font-weight:700;color:${COLORS.primary}">${stats.deliveryPercentage}%</span>
    </div>
  `;

  // 🆕 Resumen de unidades (si aplica)
  const unitsSummary = hasQuantity ? `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">🔢 Total unidades</span>
      <span style="font-weight:700;color:${COLORS.info}">${stats.totalUnits}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
      <span style="color:${COLORS.textSub}">📊 Promedio por participante</span>
      <span style="font-weight:700;color:${COLORS.textMain}">${(stats.totalUnits / stats.total).toFixed(1)}</span>
    </div>
  ` : '';

  // ────────────────────────────────────────────
  // Información de la actividad (ACTUALIZADA con cantidad)
  // ────────────────────────────────────────────
  const activityInfo = activity ? `
    <div style="background:${COLORS.light};border-radius:8px;padding:12px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        <div>
          <div style="font-size:9px;color:${COLORS.textSub};text-transform:uppercase">Actividad</div>
          <div style="font-size:11px;font-weight:600;color:${COLORS.textMain}">${activity.name || 'Sin nombre'}</div>
        </div>
        <div>
          <div style="font-size:9px;color:${COLORS.textSub};text-transform:uppercase">${hasQuantity ? 'Precio Unitario' : 'Precio'}</div>
          <div style="font-size:11px;font-weight:600;color:${COLORS.textMain}">${formatCurrency(activity.price || 0)}</div>
        </div>
        ${hasQuantity ? `
        <div>
          <div style="font-size:9px;color:${COLORS.textSub};text-transform:uppercase">Total Unidades</div>
          <div style="font-size:11px;font-weight:600;color:${COLORS.textMain}">${stats.totalUnits}</div>
        </div>
        <div>
          <div style="font-size:9px;color:${COLORS.textSub};text-transform:uppercase">Total a Pagar</div>
          <div style="font-size:11px;font-weight:600;color:${COLORS.success}">${formatCurrency(stats.totalToPay)}</div>
        </div>
        ` : `
        <div>
          <div style="font-size:9px;color:${COLORS.textSub};text-transform:uppercase">Cupo máximo</div>
          <div style="font-size:11px;font-weight:600;color:${COLORS.textMain}">${activity.quantity || 'Sin límite'}</div>
        </div>
        <div>
          <div style="font-size:9px;color:${COLORS.textSub};text-transform:uppercase">Fecha fin</div>
          <div style="font-size:11px;font-weight:600;color:${COLORS.textMain}">${activity.endDate ? formatDate(activity.endDate) : 'No definida'}</div>
        </div>
        `}
      </div>
    </div>
  ` : '';

  // ────────────────────────────────────────────
  // Tabla de participantes (CON COLUMNAS ACTUALIZADAS)
  // ────────────────────────────────────────────
  const tableRows = participants.map((p, i) => {
    const status = p.isFullyPaid ? 'FULLY_PAID' : (p.totalPaid || 0) > 0 ? 'PARTIALLY_PAID' : 'PENDING';
    const statusColor = PAYMENT_STATUS_COLORS[status];
    const statusLabel = PAYMENT_STATUS_LABELS[status];
    
    const isDelivered = getItemDelivered(p);
    const deliveryStatus = isDelivered ? 'DELIVERED' : 'NOT_DELIVERED';
    const deliveryColor = DELIVERY_COLORS[deliveryStatus];
    const deliveryLabel = DELIVERY_LABELS[deliveryStatus];
    const deliveryIcon = isDelivered ? '✅' : '⏳';
    
    const quantity = getQuantity(p);
    const totalPrice = getTotalPrice(p, unitPrice);
    
    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border};text-align:center">${i + 1}</td>
        <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${p.memberName || 'Sin nombre'}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${p.leaderName || 'Sin líder'}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${p.districtDescription || 'Sin distrito'}</td>
        ${hasQuantity ? `
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};text-align:center;font-weight:600">${quantity}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.primary};border-bottom:1px solid ${COLORS.border};text-align:right">${formatCurrency(totalPrice)}</td>
        ` : ''}
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.success};font-weight:600;border-bottom:1px solid ${COLORS.border};text-align:right">${formatCurrency(p.totalPaid || 0)}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.danger};font-weight:600;border-bottom:1px solid ${COLORS.border};text-align:right">${formatCurrency(p.pendingBalance || 0)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="background:${statusColor}22;color:${statusColor};font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${statusLabel}</span>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="background:${deliveryColor}22;color:${deliveryColor};font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${deliveryIcon} ${deliveryLabel}</span>
        </td>
        <td style="padding:7px 10px;font-size:9px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border};text-align:center">${p.registrationDate ? formatDate(p.registrationDate) : '-'}</td>
      </tr>
    `;
  }).join('');

  // ────────────────────────────────────────────
  // Definir columnas de la tabla dinámicamente
  // ────────────────────────────────────────────
  const tableColumns = [
    '#', 'Nombre', 'Líder', 'Distrito',
    ...(hasQuantity ? ['Unidades', 'Total'] : []),
    'Pagado', 'Pendiente', 'Estado', '📦 Entrega', 'Inscripción'
  ];

  // ────────────────────────────────────────────
  // HTML completo
  // ────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte General de Participantes${hasFilters ? ' (Filtrado)' : ''}</title>
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
          Sistema de Gestión de Actividades
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">
          👥 Reporte General de Participantes${hasFilters ? ' — Filtrado' : ''}
        </div>
        ${hasFilters && filterBadges ? `<div>Filtros activos: ${filterBadges}</div>` : ''}
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</div>
        <div style="font-size:10px;margin-top:4px">${new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}</div>
      </div>
    </div>
  </div>

  <!-- ACTIVITY INFO -->
  ${activityInfo}

  <!-- KPIs -->
  <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap" class="no-break">
    ${kpiBoxes}
  </div>

  <!-- DISTRIBUCIONES Y FINANZAS (3 columnas) -->
  <div style="display:flex;gap:14px;margin-bottom:18px;flex-wrap:wrap" class="no-break">
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Distribución por Estado de Pago
      </div>
      ${statusBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📦 Distribución por Entrega
      </div>
      ${deliveryBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Resumen Financiero
      </div>
      ${financialSummary}
    </div>
  </div>

  <!-- SEGUNDA FILA: RESUMEN DE ENTREGAS Y RESUMEN DE UNIDADES -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📦 Resumen de Entregas
      </div>
      ${deliverySummary}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Resumen de Actividad
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between">
          <span style="color:${COLORS.textSub};font-size:10px">Total participantes:</span>
          <span style="font-weight:700;color:${COLORS.primary}">${stats.total}</span>
        </div>
        ${hasQuantity ? `
        <div style="display:flex;justify-content:space-between">
          <span style="color:${COLORS.textSub};font-size:10px">🔢 Total unidades:</span>
          <span style="font-weight:700;color:${COLORS.info}">${stats.totalUnits}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:${COLORS.textSub};font-size:10px">📊 Promedio por participante:</span>
          <span style="font-weight:700;color:${COLORS.textMain}">${(stats.totalUnits / stats.total).toFixed(1)}</span>
        </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between">
          <span style="color:${COLORS.textSub};font-size:10px">Promedio por líder:</span>
          <span style="font-weight:700;color:${COLORS.textMain}">${(stats.total / Math.max(1, new Set(participants.map(p => p.leaderName)).size)).toFixed(1)}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:${COLORS.textSub};font-size:10px">Eficiencia de pago:</span>
          <span style="font-weight:700;color:${stats.percentagePaid > 70 ? COLORS.success : COLORS.warning}">${stats.percentagePaid}%</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:${COLORS.textSub};font-size:10px">📦 Tasa de entrega:</span>
          <span style="font-weight:700;color:${stats.deliveryPercentage > 70 ? COLORS.success : COLORS.warning}">${stats.deliveryPercentage}%</span>
        </div>
      </div>
    </div>
    ${hasQuantity ? `
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        🔢 Resumen de Unidades
      </div>
      ${unitsSummary}
    </div>
    ` : ''}
  </div>

  <!-- TABLA -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado de Participantes</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${participants.length} registros</span>
    </div>
    ${participants.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay participantes que coincidan con los filtros aplicados.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          ${tableColumns.map(h => `
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:${h === '#' || h === 'Pagado' || h === 'Pendiente' || h === 'Unidades' || h === 'Total' ? 'center' : 'left'};font-weight:700;border-bottom:1px solid ${COLORS.border}">${h}</th>
          `).join('')}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    `}
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:9px;color:#94a3b8">Sistema de Gestión de Actividades • Reporte General de Participantes • Documento generado automáticamente</span>
    <span style="font-size:9px;color:#94a3b8">${new Date().toLocaleString('es-CO')}</span>
  </div>

  <!-- RESUMEN FINAL (ACTUALIZADO CON UNIDADES Y ENTREGAS) -->
  <div style="margin-top:12px;padding:10px;background:${COLORS.light};border-radius:8px;text-align:center">
    <span style="font-size:11px;font-weight:600;color:${COLORS.primary}">
      📊 ${stats.total} participante${stats.total !== 1 ? 's' : ''} • 
      ${hasQuantity ? `🔢 ${stats.totalUnits} unidad${stats.totalUnits !== 1 ? 'es' : ''} • ` : ''}
      📦 ${stats.delivered}/${stats.total} entregados (${stats.deliveryPercentage}%) • 
      💰 Total recaudado: ${formatCurrency(stats.totalPaid)} (${stats.percentagePaid}%) • 
      ⏳ Por cobrar: ${formatCurrency(stats.totalPending)}
    </span>
  </div>

  <!-- NOTAS EXPLICATIVAS -->
  <div style="margin-top:10px;padding:8px;background:${COLORS.light};border-radius:6px;text-align:center;font-size:8px;color:${COLORS.textSub}">
    📦 Entregado = Participante que ha recibido el artículo/kit de la actividad<br/>
    ${hasQuantity ? '🔢 Unidades = Cantidad de artículos/inscripciones por participante' : ''}
  </div>

</body>
</html>`;

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
  
  return true;
};