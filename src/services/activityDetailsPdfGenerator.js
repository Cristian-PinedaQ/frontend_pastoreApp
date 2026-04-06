// ============================================
// activityPdfGenerator.js
// Generador de PDF para el reporte detallado de una Actividad
// ============================================

const STATUS_COLORS = {
  ACTIVE:    '#10b981',
  COMPLETED: '#3b82f6',
  FAILED:    '#ef4444',
  PENDING:   '#f59e0b',
  CANCELLED: '#6b7280',
};

const STATUS_LABELS = {
  ACTIVE:    'Activo',
  COMPLETED: 'Completado',
  FAILED:    'Reprobado',
  PENDING:   'Pendiente',
  CANCELLED: 'Cancelado',
};

const formatCurrency = (value) => {
  return `$${(value || 0).toLocaleString('es-CO')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-CO');
};

export const generateActivityPDF = (config) => {
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

  const { activity, balance, participants = [], totalCASH = 0, totalBANK = 0, totalValue = 0 } = config;

  // ========== KPIs FINANCIEROS ==========
  const kpis = [
    { label: 'Valor Total', value: formatCurrency(totalValue), color: COLORS.primary },
    { label: 'Total Pagado', value: formatCurrency(balance?.totalPaid), color: COLORS.success },
    { label: 'Saldo Pendiente', value: formatCurrency(balance?.balance), color: COLORS.warning },
    { label: 'Efectivo', value: formatCurrency(totalCASH), color: '#10b981' },
    { label: 'Transferencia', value: formatCurrency(totalBANK), color: '#3b82f6' },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:18px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ========== TABLA DE PARTICIPANTES ==========
  const tableRows = participants.map((part, i) => {
    const sc = STATUS_COLORS[part.enrollmentStatus] || COLORS.inactive;
    const sl = STATUS_LABELS[part.enrollmentStatus] || part.enrollmentStatus || 'Pendiente';
    
    // Obtener métodos de pago únicos de este participante
    const methods = [...new Set((part.payments || []).map(p => p.incomeMethod))];
    const methodBadges = methods.map(m => {
      const isCash = m === 'CASH';
      return `<span style="font-size:9px; background:${isCash ? '#10b98122' : '#3b82f622'}; color:${isCash ? '#10b981' : '#3b82f6'}; padding:2px 6px; border-radius:4px; margin-right:4px;">${isCash ? 'Efectivo' : 'Transf.'}</span>`;
    }).join('') || '<span style="font-size:9px;color:#94a3b8">—</span>';

    const deliveredText = part.itemDelivered ? '✅ Sí' : '⏳ No';
    const deliveredColor = part.itemDelivered ? COLORS.success : COLORS.warning;

    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${part.memberName || 'Desconocido'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="background:${sc}22;color:${sc};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${sl}</span>
        </td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border};text-align:center">${part.quantity || 1}</td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.success};border-bottom:1px solid ${COLORS.border};text-align:right;font-weight:600">${formatCurrency(part.totalPaid)}</td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.warning};border-bottom:1px solid ${COLORS.border};text-align:right;font-weight:600">${formatCurrency(part.pendingBalance)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">${methodBadges}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="color:${deliveredColor};font-size:10px;font-weight:700">${deliveredText}</span>
        </td>
      </tr>
    `;
  }).join('');

  // ========== HTML COMPLETO ==========
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Actividad - ${activity.activityName}</title>
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
          Reporte de Actividad
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">
          📋 ${activity.activityName}
        </div>
        <div style="font-size:11px; opacity:0.9;">
          <span style="margin-right:15px;"><strong>Costo base:</strong> ${formatCurrency(activity.price)}</span>
          <span style="margin-right:15px;"><strong>Capacidad:</strong> ${activity.quantity || 'Ilimitada'}</span>
          <span><strong>Cierre:</strong> ${formatDate(activity.endDate)}</span>
        </div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <div style="font-size:10px;margin-top:4px">${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div style="display:flex;gap:12px;margin-bottom:18px" class="no-break">
    ${kpiBoxes}
  </div>

  <!-- TABLA DE PARTICIPANTES -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado de Participantes</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${participants.length} inscritos</span>
    </div>
    ${participants.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay participantes inscritos en esta actividad.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Participante</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Estado</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Cant.</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:right;font-weight:700;border-bottom:1px solid ${COLORS.border}">Pagado</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:right;font-weight:700;border-bottom:1px solid ${COLORS.border}">Pendiente</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Método(s)</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border}">Entregado</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    `}
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:9px;color:#94a3b8">Sistema Financiero • Reporte Generado Automáticamente</span>
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