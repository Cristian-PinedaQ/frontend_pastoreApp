// ============================================
// worshipPdfGenerator.js
// Generador de PDF para la asistencia del equipo de alabanza
// ============================================

const COLORS = {
  primary:  '#1e40af', // Azul oscuro
  accent:   '#8b5cf6', // Morado (Alabanza)
  success:  '#10b981', // Verde
  warning:  '#f59e0b', // Naranja
  danger:   '#ef4444', // Rojo
  inactive: '#6b7280', // Gris
  dark:     '#1e293b',
  light:    '#f8fafc',
  border:   '#e2e8f0',
  textMain: '#1e293b',
  textSub:  '#64748b',
  white:    '#ffffff',
};

// Helper seguro para fechas
const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    return new Date(y, m - 1, d, h, min, s);
  }
  const safeString = String(dateVal).replace(" ", "T");
  return new Date(safeString);
};

const getDisplayName = (name) => {
  if (!name) return "Desconocido";
  const parts = name.split(" ");
  return parts.length > 2 ? `${parts[0]} ${parts[1]} ${parts[2][0]}.` : name;
};

/**
 * 1. Genera un PDF de asistencia para UN SOLO EVENTO
 */
export const generateSingleEventAttendancePDF = (event) => {
  const assignments = event.assignments || [];
  const total = assignments.length;
  const present = assignments.filter(a => a.attended === true).length;
  const absent = assignments.filter(a => a.attended === false).length;
  //const pending = assignments.filter(a => a.attended === null || a.attended === undefined).length;
  
  // Calcular porcentaje solo en base a los que ya se les tomó asistencia
  const evaluated = present + absent;
  const attendanceRate = evaluated > 0 ? Math.round((present / evaluated) * 100) : 0;

  const eventDate = parseSafeDate(event.eventDate);

  // KPIs
  const kpiBoxes = [
    { label: 'Convocados', value: total, color: COLORS.accent },
    { label: 'Presentes', value: present, color: COLORS.success },
    { label: 'Ausentes', value: absent, color: COLORS.danger },
    { label: '% Asistencia', value: `${attendanceRate}%`, color: attendanceRate >= 80 ? COLORS.success : COLORS.warning },
  ].map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // Tabla
  const tableRows = assignments.map((a, i) => {
    const name = a.worshipTeamMember?.leader?.member?.name || a.worshipTeamMember?.name || 'Músico';
    const role = a.assignedRole?.name || 'Instrumento';
    
    let statusLabel = 'Pendiente';
    let statusColor = COLORS.inactive;
    
    if (a.attended === true) { statusLabel = 'Presente'; statusColor = COLORS.success; }
    if (a.attended === false) { statusLabel = 'Ausente'; statusColor = COLORS.danger; }

    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:10px;font-size:12px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${getDisplayName(name)}</td>
        <td style="padding:10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${role}</td>
        <td style="padding:10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${statusColor}22;color:${statusColor};font-size:10px;padding:4px 10px;border-radius:12px;font-weight:700">${statusLabel}</span>
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Asistencia - ${event.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #1e293b; font-size: 12px; }
    @page { size: A4 portrait; margin: 14mm 16mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div style="background:linear-gradient(135deg, ${COLORS.dark} 0%, ${COLORS.accent} 100%);border-radius:12px;padding:20px 24px;margin-bottom:18px;color:#fff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:10px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Reporte de Alabanza</div>
        <div style="font-size:22px;font-weight:800;margin-bottom:4px">🎸 ${event.name}</div>
        <div style="font-size:12px;opacity:0.9">📅 ${eventDate.toLocaleDateString('es-CO')} | ⏰ ${eventDate.toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${new Date().toLocaleDateString('es-CO')}</div>
      </div>
    </div>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:20px">${kpiBoxes}</div>

  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:${COLORS.dark};padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Detalle de Asistencia</span>
    </div>
    ${assignments.length === 0 ? `<div style="padding:30px;text-align:center;color:${COLORS.inactive}">No hay músicos asignados.</div>` : `
    <table style="width:100%;border-collapse:collapse;text-align:left">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;border-bottom:1px solid ${COLORS.border}">Músico</th>
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;border-bottom:1px solid ${COLORS.border}">Rol / Instrumento</th>
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;border-bottom:1px solid ${COLORS.border}">Estado</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    `}
  </div>
</body>
</html>`;

  printHTML(html);
};

/**
 * 2. Genera un PDF de asistencia para UN RANGO DE FECHAS (Resumen de múltiples cultos)
 */
export const generateWorshipRangeAttendancePDF = (events, startDate, endDate) => {
  let totalAssignments = 0;
  let totalPresent = 0;
  let totalAbsent = 0;

  // Ordenar eventos por fecha ascendente
  const sortedEvents = [...events].sort((a, b) => parseSafeDate(a.eventDate) - parseSafeDate(b.eventDate));

  const tableRows = sortedEvents.map((ev, i) => {
    const assignments = ev.assignments || [];
    const evTotal = assignments.length;
    const evPresent = assignments.filter(a => a.attended === true).length;
    const evAbsent = assignments.filter(a => a.attended === false).length;
    //const evPending = assignments.filter(a => a.attended === null || a.attended === undefined).length;
    
    totalAssignments += evTotal;
    totalPresent += evPresent;
    totalAbsent += evAbsent;

    const evaluated = evPresent + evAbsent;
    const rate = evaluated > 0 ? Math.round((evPresent / evaluated) * 100) : 0;
    const dateObj = parseSafeDate(ev.eventDate);

    let rateColor = COLORS.warning;
    if (rate >= 80) rateColor = COLORS.success;
    if (rate < 50 && evaluated > 0) rateColor = COLORS.danger;

    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:8px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${ev.name}</td>
        <td style="padding:8px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${dateObj.toLocaleDateString('es-CO')}</td>
        <td style="padding:8px 10px;font-size:11px;text-align:center;border-bottom:1px solid ${COLORS.border}">${evTotal}</td>
        <td style="padding:8px 10px;font-size:11px;color:${COLORS.success};text-align:center;font-weight:bold;border-bottom:1px solid ${COLORS.border}">${evPresent}</td>
        <td style="padding:8px 10px;font-size:11px;color:${COLORS.danger};text-align:center;font-weight:bold;border-bottom:1px solid ${COLORS.border}">${evAbsent}</td>
        <td style="padding:8px 10px;font-size:11px;text-align:center;border-bottom:1px solid ${COLORS.border}">
          ${evaluated > 0 ? `<span style="color:${rateColor};font-weight:bold">${rate}%</span>` : '<span style="color:#94a3b8">N/A</span>'}
        </td>
      </tr>
    `;
  }).join('');

  const globalEvaluated = totalPresent + totalAbsent;
  const globalRate = globalEvaluated > 0 ? Math.round((totalPresent / globalEvaluated) * 100) : 0;

  const kpiBoxes = [
    { label: 'Total Cultos', value: events.length, color: COLORS.primary },
    { label: 'Total Asignaciones', value: totalAssignments, color: COLORS.accent },
    { label: 'Total Ausencias', value: totalAbsent, color: COLORS.danger },
    { label: 'Asistencia Promedio', value: `${globalRate}%`, color: globalRate >= 80 ? COLORS.success : COLORS.warning },
  ].map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Asistencia Alabanza - Rango</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #1e293b; font-size: 12px; }
    @page { size: A4 landscape; margin: 14mm 16mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div style="background:linear-gradient(135deg, ${COLORS.dark} 0%, ${COLORS.accent} 100%);border-radius:12px;padding:20px 24px;margin-bottom:18px;color:#fff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:10px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Ministerio de Alabanza</div>
        <div style="font-size:22px;font-weight:800;margin-bottom:4px">📊 Consolidado de Asistencias</div>
        <div style="font-size:12px;opacity:0.9">Período: ${startDate} al ${endDate}</div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${new Date().toLocaleDateString('es-CO')}</div>
      </div>
    </div>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:20px">${kpiBoxes}</div>

  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:${COLORS.dark};padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Desglose por Culto</span>
    </div>
    ${events.length === 0 ? `<div style="padding:30px;text-align:center;color:${COLORS.inactive}">No hay eventos en este rango de fechas.</div>` : `
    <table style="width:100%;border-collapse:collapse;text-align:left">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;border-bottom:1px solid ${COLORS.border}">Culto / Evento</th>
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;border-bottom:1px solid ${COLORS.border}">Fecha</th>
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;text-align:center;border-bottom:1px solid ${COLORS.border}">Convocados</th>
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;text-align:center;border-bottom:1px solid ${COLORS.border}">Presentes</th>
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;text-align:center;border-bottom:1px solid ${COLORS.border}">Ausentes</th>
          <th style="padding:10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;text-align:center;border-bottom:1px solid ${COLORS.border}">% Asistencia</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    `}
  </div>
</body>
</html>`;

  printHTML(html);
};

// Utilidad para abrir la ventana e imprimir
const printHTML = (html) => {
  const win = window.open('', '_blank', 'width=1100,height=750');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
};