// services/participantsPdfGenerator.js
// ============================================
// participantsPdfGenerator.js
// Generador de PDF para detalle de participante (con el mismo formato que cellGroupsPdfGenerator)
// Uso: import { generateParticipantsPDF } from './participantsPdfGenerator';
// ============================================

const PAYMENT_STATUS_COLORS = {
  COMPLETED: '#10b981',   // Verde
  PENDING: '#ef4444',     // Rojo
  PARTIAL: '#f59e0b',     // Naranja
};

const PAYMENT_METHOD_LABELS = {
  BANK_TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

const PAYMENT_METHOD_COLORS = {
  BANK_TRANSFER: '#3b82f6',  // Azul
  CASH: '#10b981',           // Verde
  CARD: '#8b5cf6',           // Púrpura
  OTHER: '#6b7280',          // Gris
};

const ENROLLMENT_STATUS_COLORS = {
  COMPLETED: '#10b981',      // Verde
  ACTIVE: '#3b82f6',         // Azul
  PENDING: '#f59e0b',        // Naranja
  CANCELLED: '#ef4444',      // Rojo
};

const ENROLLMENT_STATUS_LABELS = {
  COMPLETED: 'Completado',
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  CANCELLED: 'Cancelado',
};

/**
 * Genera un PDF con información detallada de un participante específico
 * @param {Object} data - Datos para el reporte { activity, participants }
 * @param {string} filename - Nombre base del archivo
 */
export const generateParticipantsPDF = (data, filename = 'detalle-participante') => {
  const COLORS = {
    primary: '#1e40af',
    primaryLight: '#3b82f6',
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
  };

  // Obtener el participante
  const participant = data.participants && data.participants.length > 0 
    ? data.participants[0] 
    : null;
  
  if (!participant) {
    console.error('❌ No hay datos de participante para generar el PDF');
    alert('No hay información del participante para generar el PDF');
    return false;
  }

  // ────────────────────────────────────────────
  // Helper functions
  // ────────────────────────────────────────────
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$ 0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  // ────────────────────────────────────────────
  // Calcular valores financieros
  // ────────────────────────────────────────────
  const totalPrice = data.activity?.price || 0;
  const totalPaid = participant.totalPaid || 0;
  const pendingBalance = participant.pendingBalance || 0;
  const compliancePercentage = totalPrice > 0 ? (totalPaid / totalPrice) * 100 : 0;
  const isFullyPaid = participant.isFullyPaid || pendingBalance <= 0;
  const paymentStatus = isFullyPaid ? 'COMPLETED' : pendingBalance < totalPrice ? 'PARTIAL' : 'PENDING';
  const enrollmentStatus = participant.enrollmentStatus || 'PENDING';
  
  // Obtener historial de pagos
  const paymentHistory = participant.paymentHistory || [];

  // ────────────────────────────────────────────
  // KPI boxes
  // ────────────────────────────────────────────
  const kpis = [
    { 
      label: 'Precio Total', 
      value: formatCurrency(totalPrice), 
      color: COLORS.primary,
      subtext: 'Valor actividad'
    },
    { 
      label: 'Total Pagado', 
      value: formatCurrency(totalPaid), 
      color: COLORS.success,
      subtext: `${paymentHistory.length} pago(s)`
    },
    { 
      label: 'Saldo Pendiente', 
      value: formatCurrency(pendingBalance), 
      color: isFullyPaid ? COLORS.success : COLORS.danger,
      subtext: isFullyPaid ? 'Cancelado' : 'Por pagar'
    },
    { 
      label: 'Cumplimiento', 
      value: `${compliancePercentage.toFixed(1)}%`, 
      color: compliancePercentage >= 100 ? COLORS.success : 
             compliancePercentage >= 50 ? COLORS.warning : COLORS.danger,
      subtext: `${paymentHistory.length} de ${totalPrice > 0 ? Math.ceil(totalPrice / 50000) : 0} cuotas estimadas`
    },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:22px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
      <div style="font-size:8px;color:${COLORS.textSub};margin-top:2px">${k.subtext}</div>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Información de la actividad (cards)
  // ────────────────────────────────────────────
  const activityInfoRows = `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Actividad</span>
      <span style="font-weight:700;color:${COLORS.textMain}">${data.activity?.name || 'No disponible'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Precio</span>
      <span style="font-weight:700;color:${COLORS.primary}">${formatCurrency(totalPrice)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Estado actividad</span>
      <span style="font-weight:700;color:${data.activity?.isActive ? COLORS.success : COLORS.inactive}">${data.activity?.isActive ? 'Activa' : 'Inactiva'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
      <span style="color:${COLORS.textSub}">Fecha fin</span>
      <span style="font-weight:700;color:${COLORS.textMain}">${data.activity?.endDate ? formatDate(data.activity.endDate) : 'No definida'}</span>
    </div>
  `;

  // ────────────────────────────────────────────
  // Información del participante (cards)
  // ────────────────────────────────────────────
  const participantInfoRows = `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Nombre</span>
      <span style="font-weight:700;color:${COLORS.textMain}">${participant.memberName || 'No disponible'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Líder</span>
      <span style="font-weight:700;color:${COLORS.textMain}">${participant.leaderName || 'Sin líder asignado'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Distrito</span>
      <span style="font-weight:700;color:${COLORS.textMain}">${participant.districtDescription || participant.districtName || 'Sin distrito'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${COLORS.border};font-size:11px">
      <span style="color:${COLORS.textSub}">Fecha inscripción</span>
      <span style="font-weight:700;color:${COLORS.textMain}">${participant.registrationDate ? formatDateTime(participant.registrationDate) : 'No disponible'}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
      <span style="color:${COLORS.textSub}">Estado inscripción</span>
      <span style="display:inline-block;background:${ENROLLMENT_STATUS_COLORS[enrollmentStatus] || COLORS.inactive}22;color:${ENROLLMENT_STATUS_COLORS[enrollmentStatus] || COLORS.inactive};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${ENROLLMENT_STATUS_LABELS[enrollmentStatus] || enrollmentStatus}</span>
    </div>
  `;

  // ────────────────────────────────────────────
  // Barra de progreso visual
  // ────────────────────────────────────────────
  const progressBar = `
    <div style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:10px;color:${COLORS.textSub}">Progreso de pago</span>
        <span style="font-size:11px;font-weight:700;color:${compliancePercentage >= 100 ? COLORS.success : (compliancePercentage >= 50 ? COLORS.warning : COLORS.danger)}">${compliancePercentage.toFixed(1)}%</span>
      </div>
      <div style="background:${COLORS.border};border-radius:4px;height:10px;width:100%">
        <div style="width:${compliancePercentage}%;height:100%;background:${compliancePercentage >= 100 ? COLORS.success : (compliancePercentage >= 50 ? COLORS.warning : COLORS.danger)};border-radius:4px"></div>
      </div>
    </div>
  `;

  // ────────────────────────────────────────────
  // Resumen de pagos
  // ────────────────────────────────────────────
  const paymentSummary = `
    <div style="display:flex;gap:10px;margin-top:12px">
      <div style="flex:1;text-align:center;background:${COLORS.light};border-radius:8px;padding:8px">
        <div style="font-size:9px;color:${COLORS.textSub}">Total pagos</div>
        <div style="font-size:16px;font-weight:800;color:${COLORS.primary}">${paymentHistory.length}</div>
      </div>
      <div style="flex:1;text-align:center;background:${COLORS.light};border-radius:8px;padding:8px">
        <div style="font-size:9px;color:${COLORS.textSub}">Métodos</div>
        <div style="font-size:16px;font-weight:800;color:${COLORS.primary}">${[...new Set(paymentHistory.map(p => p.incomeMethod || 'OTHER'))].length}</div>
      </div>
      <div style="flex:1;text-align:center;background:${COLORS.light};border-radius:8px;padding:8px">
        <div style="font-size:9px;color:${COLORS.textSub}">Promedio</div>
        <div style="font-size:16px;font-weight:800;color:${COLORS.primary}">${paymentHistory.length ? formatCurrency(totalPaid / paymentHistory.length) : '$0'}</div>
      </div>
    </div>
  `;

  // ────────────────────────────────────────────
  // Tabla de historial de pagos
  // ────────────────────────────────────────────
  const paymentTableRows = paymentHistory.map((payment, index) => {
    const method = payment.incomeMethod || 'OTHER';
    const methodColor = PAYMENT_METHOD_COLORS[method] || COLORS.inactive;
    const methodLabel = PAYMENT_METHOD_LABELS[method] || method;
    
    return `
      <tr style="background:${index % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border};text-align:center">${index + 1}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${payment.date || payment.registrationDate ? formatDateTime(payment.date || payment.registrationDate) : '-'}</td>
        <td style="padding:7px 10px;font-size:11px;font-weight:700;color:${COLORS.success};border-bottom:1px solid ${COLORS.border};text-align:right">${formatCurrency(payment.amount || 0)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${methodColor}22;color:${methodColor};font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700">${methodLabel}</span>
        </td>
        <td style="padding:7px 10px;font-size:9px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${payment.recordedBy || 'Sistema'}</td>
      </tr>
    `;
  }).join('');

  // ────────────────────────────────────────────
  // HTML completo
  // ────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Estado de Cuenta - ${participant.memberName || 'Participante'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #1e293b; font-size: 12px; }
    @page { size: A4; margin: 14mm 16mm; }
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
          Sistema de Gestión Pastoral
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:4px">
          👤 Estado de Cuenta - Participante
        </div>
        <div style="font-size:16px;font-weight:600;opacity:0.9">
          ${participant.memberName || 'Participante sin nombre'}
        </div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</div>
        <div style="font-size:10px;margin-top:4px">${new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}</div>
      </div>
    </div>
    <!-- Badge de estado de pago -->
    <div style="margin-top:12px">
      <span style="display:inline-block;background:${PAYMENT_STATUS_COLORS[paymentStatus] || COLORS.inactive}22;color:#fff;font-size:11px;padding:4px 16px;border-radius:20px;font-weight:700;border:1px solid rgba(255,255,255,0.3)">
        ${isFullyPaid ? '✓ CUENTA CANCELADA' : pendingBalance < totalPrice ? '⚠ PAGO PARCIAL' : '● PENDIENTE DE PAGO'}
      </span>
    </div>
  </div>

  <!-- KPIs -->
  <div style="display:flex;gap:12px;margin-bottom:16px" class="no-break">
    ${kpiBoxes}
  </div>

  <!-- INFORMACIÓN DETALLADA -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">
    <!-- Actividad -->
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📅 Información de la Actividad
      </div>
      ${activityInfoRows}
    </div>
    
    <!-- Participante -->
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        👤 Datos del Participante
      </div>
      ${participantInfoRows}
    </div>
    
    <!-- Progreso -->
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📊 Progreso de Pago
      </div>
      ${progressBar}
      ${paymentSummary}
    </div>
  </div>

  <!-- HISTORIAL DE PAGOS -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden;margin-bottom:16px">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">💰 Historial de Pagos</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${paymentHistory.length} registros</span>
    </div>
    
    ${paymentHistory.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No se han registrado pagos para este participante.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;font-weight:700;border-bottom:1px solid ${COLORS.border};width:30px">#</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Fecha</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:right;font-weight:700;border-bottom:1px solid ${COLORS.border}">Monto</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Método</th>
          <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Registrado por</th>
        </tr>
      </thead>
      <tbody>
        ${paymentTableRows}
      </tbody>
      <tfoot>
        <tr style="background:#f8fafc">
          <td colspan="2" style="padding:10px;font-size:10px;font-weight:700;color:${COLORS.textMain};text-align:right">TOTAL PAGADO:</td>
          <td style="padding:10px;font-size:12px;font-weight:800;color:${COLORS.success};text-align:right">${formatCurrency(totalPaid)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
    `}
  </div>

  <!-- RESUMEN FINAL -->
  <div style="background:${isFullyPaid ? COLORS.success + '11' : COLORS.danger + '11'};border:1px solid ${isFullyPaid ? COLORS.success : COLORS.danger};border-radius:10px;padding:16px;margin-bottom:16px;text-align:center" class="no-break">
    <div style="font-size:14px;font-weight:800;color:${isFullyPaid ? COLORS.success : COLORS.danger};margin-bottom:4px">
      ${isFullyPaid ? '✓ CUENTA COMPLETA - Sin saldo pendiente' : `⚠ CUENTA PENDIENTE - Saldo: ${formatCurrency(pendingBalance)}`}
    </div>
    <div style="font-size:10px;color:${COLORS.textSub}">
      ${isFullyPaid 
        ? 'El participante ha cancelado la totalidad del valor de la actividad.' 
        : `El participante tiene un saldo pendiente de ${formatCurrency(pendingBalance)} por cancelar.`}
    </div>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:8px;color:#94a3b8">Sistema de Gestión Pastoral • Estado de Cuenta Individual • Documento válido para constancia</span>
    <span style="font-size:8px;color:#94a3b8">${new Date().toLocaleString('es-CO')}</span>
  </div>

</body>
</html>`;

  // Abrir ventana para impresión/PDF
  const win = window.open('', '_blank', 'width=1100,height=750');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return false;
  }
  
  win.document.write(html);
  win.document.close();
  
  // Configurar título de la ventana
  win.document.title = `Estado-Cuenta-${participant.memberName?.toLowerCase().replace(/\s+/g, '-') || 'participante'}`;
  
  // Esperar a que carguen los estilos y luego imprimir
  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 400);
  };
  
  console.log('✅ PDF de detalle de participante generado exitosamente');
  return true;
};