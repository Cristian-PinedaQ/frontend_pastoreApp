// ============================================
// attendancePdfGenerator.js
// Generador de PDF para estadísticas de asistencias
// v2 — incluye nuevas visitas y total en el lugar
// ============================================

const ATTENDANCE_COLORS = {
  primary:  '#1e40af',
  accent:   '#3b82f6',
  success:  '#10b981',
  warning:  '#f59e0b',
  danger:   '#ef4444',
  inactive: '#6b7280',
  purple:   '#8b5cf6',
  teal:     '#0d9488',
  dark:     '#1e293b',
  light:    '#f8fafc',
  border:   '#e2e8f0',
  textMain: '#1e293b',
  textSub:  '#64748b',
  white:    '#ffffff',
};

/**
 * Formatea una fecha YYYY-MM-DD a formato legible
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return d.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return dateStr;
  }
};

/**
 * Genera un PDF con las estadísticas mensuales de asistencia
 * @param {Object} stats        - Estadísticas mensuales del backend
 * @param {string} cellName     - Nombre de la célula
 * @param {Object} filtersInfo  - Información de filtros { mes, año }
 * @param {boolean} hasFilters  - Si hay filtros aplicados
 */
export const generateAttendancePDF = (
  stats = {},
  cellName = 'Célula',
  filtersInfo = {},
  hasFilters = false
) => {

  // ── Extraer datos ──────────────────────────────────────────────────────────
  const totalMeetings   = stats?.totalMeetings   ?? 0;
  const totalPresent    = stats?.totalPresent    ?? 0;
  const totalRegistered = stats?.totalRegistered ?? 0;
  const totalJustified  = stats?.totalJustified  ?? 0;
  const totalAbsent     = totalRegistered - totalPresent;
  const avgAttendance   = stats?.averageAttendance ?? 0;
  const overallPct      = totalRegistered > 0
    ? Math.round((totalPresent / totalRegistered) * 100) : 0;
  const dailyStats      = stats?.dailyStats ?? [];

  // ── NUEVO: datos de sesión ─────────────────────────────────────────────────
  // A nivel mensual/anual el backend puede devolver totalNewParticipants
  const totalNewParticipants = stats?.totalNewParticipants ?? 0;

  // A nivel diario, sumamos desde dailyStats si el campo existe por sesión
  const dailyNewParticipants = dailyStats.reduce(
    (sum, d) => sum + (d.newParticipants || 0), 0
  );
  const dailyTotalAttendees = dailyStats.reduce(
    (sum, d) => sum + (d.totalAttendees || 0), 0
  );

  // Usar totalNewParticipants del top level si está disponible,
  // si no, sumar desde dailyStats
  const newParticipantsTotal = totalNewParticipants > 0
    ? totalNewParticipants
    : dailyNewParticipants;

  // Indicador de si hay datos de sesión que mostrar
  const hasSessionData = newParticipantsTotal > 0 || dailyTotalAttendees > 0 ||
    dailyStats.some(d => d.hasSessionData);

  // ── Ordenar dailyStats ─────────────────────────────────────────────────────
  const sortedDailyStats = [...dailyStats].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  const bestDay = sortedDailyStats.length > 0
    ? sortedDailyStats.reduce((a, b) => (b.percentage > a.percentage ? b : a))
    : null;
  const worstDay = sortedDailyStats.length > 1
    ? sortedDailyStats.reduce((a, b) => (b.percentage < a.percentage ? b : a))
    : null;

  // ── Filter badges ──────────────────────────────────────────────────────────
  const filterBadges = Object.entries(filtersInfo).map(([key, val]) => `
    <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">
      ${key === 'mes' ? '📅' : '📆'} ${val}
    </span>
  `).join('');

  // ── KPI boxes ──────────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Sesiones',        value: totalMeetings,             color: ATTENDANCE_COLORS.primary, icon: '📅' },
    { label: 'Presentes',       value: totalPresent,              color: ATTENDANCE_COLORS.success, icon: '✅' },
    { label: 'Ausentes',        value: totalAbsent,               color: ATTENDANCE_COLORS.danger,  icon: '❌' },
    { label: 'Justificados',    value: totalJustified,            color: ATTENDANCE_COLORS.warning, icon: '📝' },
    { label: 'Promedio/Sesión', value: Math.round(avgAttendance), color: ATTENDANCE_COLORS.accent,  icon: '👥' },
    { label: '% Global',        value: `${overallPct}%`,          color: ATTENDANCE_COLORS.purple,  icon: '📊' },
    ...(hasSessionData ? [
      { label: 'Nuevas visitas', value: newParticipantsTotal, color: ATTENDANCE_COLORS.teal,   icon: '🌟' },
      ...(dailyTotalAttendees > 0 ? [
        { label: 'Total en el lugar', value: dailyTotalAttendees, color: ATTENDANCE_COLORS.purple, icon: '🏠' },
      ] : []),
    ] : []),
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;min-width:100px;background:${ATTENDANCE_COLORS.white};border:1px solid ${ATTENDANCE_COLORS.border};border-radius:10px;padding:12px 8px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:20px;line-height:1;margin-bottom:4px">${k.icon}</div>
      <div style="font-size:22px;font-weight:800;color:${k.color};line-height:1.2">${k.value}</div>
      <div style="font-size:9px;color:${ATTENDANCE_COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ── Distribución de estado ─────────────────────────────────────────────────
  const total = totalRegistered || 1;
  const statusDist = [
    { label: 'Presentes',    count: totalPresent,   color: ATTENDANCE_COLORS.success },
    { label: 'Ausentes',     count: totalAbsent,    color: ATTENDANCE_COLORS.danger  },
    { label: 'Justificados', count: totalJustified, color: ATTENDANCE_COLORS.warning },
  ].filter(s => s.count > 0);

  const statusBars = statusDist.map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${ATTENDANCE_COLORS.textSub};min-width:90px">${s.label}</span>
      <div style="flex:1;background:${ATTENDANCE_COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((s.count / total) * 100)}%;height:100%;background:${s.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${s.color};min-width:40px;text-align:right">${s.count}</span>
    </div>
  `).join('');

  // ── Mejor / Peor sesión ────────────────────────────────────────────────────
  const bestWorstCards = [];
  if (bestDay) {
    bestWorstCards.push(`
      <div style="background:${ATTENDANCE_COLORS.success}12;border:1px solid ${ATTENDANCE_COLORS.success}28;border-radius:10px;padding:12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:14px">🏆</span>
          <span style="font-size:9px;color:${ATTENDANCE_COLORS.success};font-weight:700;text-transform:uppercase;letter-spacing:0.04em">Mejor Sesión</span>
        </div>
        <div style="font-size:12px;font-weight:600;color:${ATTENDANCE_COLORS.textMain};margin-bottom:4px">${formatDate(bestDay.date)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:${ATTENDANCE_COLORS.textSub}">Asistencia:</span>
          <span style="font-size:16px;font-weight:800;color:${ATTENDANCE_COLORS.success}">
            ${bestDay.present}/${bestDay.total} <span style="font-size:10px">(${Math.round(bestDay.percentage)}%)</span>
          </span>
        </div>
        ${bestDay.newParticipants > 0 ? `
        <div style="margin-top:6px;padding-top:6px;border-top:1px dashed ${ATTENDANCE_COLORS.success}40;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:10px;color:${ATTENDANCE_COLORS.textSub}">🌟 Nuevas visitas:</span>
          <span style="font-size:12px;font-weight:700;color:${ATTENDANCE_COLORS.teal}">${bestDay.newParticipants}</span>
        </div>` : ''}
      </div>
    `);
  }
  if (worstDay) {
    bestWorstCards.push(`
      <div style="background:${ATTENDANCE_COLORS.danger}12;border:1px solid ${ATTENDANCE_COLORS.danger}28;border-radius:10px;padding:12px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:14px">⚠️</span>
          <span style="font-size:9px;color:${ATTENDANCE_COLORS.danger};font-weight:700;text-transform:uppercase;letter-spacing:0.04em">Sesión más baja</span>
        </div>
        <div style="font-size:12px;font-weight:600;color:${ATTENDANCE_COLORS.textMain};margin-bottom:4px">${formatDate(worstDay.date)}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:${ATTENDANCE_COLORS.textSub}">Asistencia:</span>
          <span style="font-size:16px;font-weight:800;color:${ATTENDANCE_COLORS.danger}">
            ${worstDay.present}/${worstDay.total} <span style="font-size:10px">(${Math.round(worstDay.percentage)}%)</span>
          </span>
        </div>
      </div>
    `);
  }

  // ── Tabla de sesiones diarias ──────────────────────────────────────────────
  // Cabeceras condicionales si hay datos de sesión
  const sessionCols = hasSessionData
    ? `<th>🌟 Visitas</th><th>🏠 Total lugar</th>`
    : '';

  const tableRows = sortedDailyStats.map((row, i) => {
    const pct = Math.round(row.percentage ?? 0);
    const pctColor = pct >= 75 ? ATTENDANCE_COLORS.success
                   : pct >= 50 ? ATTENDANCE_COLORS.warning
                   : ATTENDANCE_COLORS.danger;
    const isEvent = row.isEvent || row.dayType === 'EVENTO';

    const sessionCells = hasSessionData ? `
      <td style="padding:8px 10px;font-size:11px;font-weight:${row.newParticipants > 0 ? '700' : '400'};color:${row.newParticipants > 0 ? ATTENDANCE_COLORS.teal : ATTENDANCE_COLORS.inactive};border-bottom:1px solid ${ATTENDANCE_COLORS.border}">
        ${row.newParticipants > 0 ? row.newParticipants : '—'}
      </td>
      <td style="padding:8px 10px;font-size:11px;font-weight:${row.totalAttendees > 0 ? '700' : '400'};color:${row.totalAttendees > 0 ? ATTENDANCE_COLORS.purple : ATTENDANCE_COLORS.inactive};border-bottom:1px solid ${ATTENDANCE_COLORS.border}">
        ${row.totalAttendees > 0 ? row.totalAttendees : '—'}
      </td>
    ` : '';

    return `
      <tr style="background:${i % 2 === 0 ? ATTENDANCE_COLORS.white : ATTENDANCE_COLORS.light}">
        <td style="padding:8px 10px;font-size:11px;font-weight:600;color:${ATTENDANCE_COLORS.textMain};border-bottom:1px solid ${ATTENDANCE_COLORS.border}">
          ${isEvent ? '<span style="font-size:9px;margin-right:3px">🎯</span>' : ''}${formatDate(row.date)}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${ATTENDANCE_COLORS.textSub};border-bottom:1px solid ${ATTENDANCE_COLORS.border}">${row.total || 0}</td>
        <td style="padding:8px 10px;font-size:11px;color:${ATTENDANCE_COLORS.success};font-weight:600;border-bottom:1px solid ${ATTENDANCE_COLORS.border}">${row.present || 0}</td>
        <td style="padding:8px 10px;font-size:11px;color:${ATTENDANCE_COLORS.danger};border-bottom:1px solid ${ATTENDANCE_COLORS.border}">${row.absent || 0}</td>
        <td style="padding:8px 10px;font-size:11px;color:${ATTENDANCE_COLORS.warning};border-bottom:1px solid ${ATTENDANCE_COLORS.border}">${row.justified || 0}</td>
        ${sessionCells}
        <td style="padding:8px 10px;border-bottom:1px solid ${ATTENDANCE_COLORS.border}">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;background:${ATTENDANCE_COLORS.border};border-radius:4px;height:6px">
              <div style="width:${pct}%;height:100%;background:${pctColor};border-radius:4px"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${pctColor}">${pct}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Fila de totales al pie si hay datos de sesión
  const tableFoot = hasSessionData && sortedDailyStats.length > 0 ? `
    <tfoot>
      <tr style="background:#f1f5f9">
        <td style="padding:8px 10px;font-size:10px;font-weight:800;color:${ATTENDANCE_COLORS.textSub};text-transform:uppercase;letter-spacing:0.5px">
          TOTAL
        </td>
        <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${ATTENDANCE_COLORS.textMain}">${totalRegistered}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${ATTENDANCE_COLORS.success}">${totalPresent}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${ATTENDANCE_COLORS.danger}">${totalAbsent}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${ATTENDANCE_COLORS.warning}">${totalJustified}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${ATTENDANCE_COLORS.teal}">${newParticipantsTotal > 0 ? newParticipantsTotal : '—'}</td>
        <td style="padding:8px 10px;font-size:11px;font-weight:700;color:${ATTENDANCE_COLORS.purple}">${dailyTotalAttendees > 0 ? dailyTotalAttendees : '—'}</td>
        <td style="padding:8px 10px">
          <span style="font-size:11px;font-weight:800;color:${overallPct >= 75 ? ATTENDANCE_COLORS.success : overallPct >= 50 ? ATTENDANCE_COLORS.warning : ATTENDANCE_COLORS.danger}">
            ${overallPct}%
          </span>
        </td>
      </tr>
    </tfoot>
  ` : '';

  // ── Bloque de datos de sesión en resumen ───────────────────────────────────
  const sessionSummaryBlock = hasSessionData ? `
    <div style="background:#fff;border:1px solid ${ATTENDANCE_COLORS.border};border-radius:10px;padding:14px;margin-bottom:18px" class="no-break">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        👥 Datos de Sesión — Visitas y Alcance
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:120px;background:#f0fdfa;border:1px solid #5eead4;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:${ATTENDANCE_COLORS.teal}">${newParticipantsTotal}</div>
          <div style="font-size:9px;color:${ATTENDANCE_COLORS.textSub};text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">🌟 Nuevas visitas</div>
          <div style="font-size:9px;color:${ATTENDANCE_COLORS.textSub};margin-top:2px">acumulado del período</div>
        </div>
        ${dailyTotalAttendees > 0 ? `
        <div style="flex:1;min-width:120px;background:#faf5ff;border:1px solid #d8b4fe;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:${ATTENDANCE_COLORS.purple}">${dailyTotalAttendees}</div>
          <div style="font-size:9px;color:${ATTENDANCE_COLORS.textSub};text-transform:uppercase;letter-spacing:0.5px;margin-top:4px">🏠 Total en el lugar</div>
          <div style="font-size:9px;color:${ATTENDANCE_COLORS.textSub};margin-top:2px">suma de todas las sesiones</div>
        </div>
        ` : ''}
        <div style="flex:2;min-width:200px;background:#f8fafc;border:1px solid ${ATTENDANCE_COLORS.border};border-radius:8px;padding:12px">
          <div style="font-size:10px;color:${ATTENDANCE_COLORS.textSub};margin-bottom:8px;font-weight:600">Detalle por sesión con visitas</div>
          ${sortedDailyStats.filter(d => d.newParticipants > 0).length === 0
            ? `<div style="font-size:10px;color:${ATTENDANCE_COLORS.inactive}">No hay sesiones con visitas registradas</div>`
            : sortedDailyStats.filter(d => d.newParticipants > 0).map(d => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid ${ATTENDANCE_COLORS.border};font-size:10px">
                <span style="color:${ATTENDANCE_COLORS.textMain};font-weight:600">${formatDate(d.date)}</span>
                <span style="color:${ATTENDANCE_COLORS.teal};font-weight:700">🌟 ${d.newParticipants} visita${d.newParticipants !== 1 ? 's' : ''}</span>
                ${d.totalAttendees > 0 ? `<span style="color:${ATTENDANCE_COLORS.purple};font-weight:700">🏠 ${d.totalAttendees} total</span>` : ''}
              </div>
            `).join('')
          }
        </div>
      </div>
    </div>
  ` : '';

  // ── HTML completo ──────────────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte de Asistencias — ${cellName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #fff;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.5;
      padding: 20px;
    }
    @page { size: A4 landscape; margin: 1.5cm 1.2cm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
      .no-break { break-inside: avoid; }
    }
    .kpi-container { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    .kpi-container > div { flex: 1 1 120px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th {
      background: #f1f5f9;
      padding: 8px 10px;
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      text-align: left;
      font-weight: 700;
      border-bottom: 1px solid ${ATTENDANCE_COLORS.border};
    }
    td { padding: 8px 10px; border-bottom: 1px solid ${ATTENDANCE_COLORS.border}; }
    .header-gradient {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 18px;
      color: #fff;
    }
    .footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-gradient">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:10px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">
          Sistema de Gestión Pastoral
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">
          📊 Reporte de Asistencias — ${cellName}
        </div>
        ${hasFilters && filterBadges ? `<div style="margin-top:8px">Filtros activos: ${filterBadges}</div>` : ''}
        ${hasSessionData ? `
        <div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:20px">
          <span style="font-size:10px">🌟</span>
          <span style="font-size:10px">Incluye datos de visitas y alcance de sesión</span>
        </div>` : ''}
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">
          ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
        <div style="font-size:10px;margin-top:4px">
          ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-container no-break">
    ${kpiBoxes}
  </div>

  <!-- BLOQUE DE DATOS DE SESIÓN (si aplica) -->
  ${sessionSummaryBlock}

  <!-- DISTRIBUCIÓN + MEJOR/PEOR + RESUMEN -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">

    <!-- Distribución -->
    <div style="flex:1;background:#fff;border:1px solid ${ATTENDANCE_COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📊 Distribución de Asistencia
      </div>
      ${statusBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
      <div style="margin-top:12px;padding-top:8px;border-top:1px dashed ${ATTENDANCE_COLORS.border}">
        <div style="display:flex;justify-content:space-between;font-size:10px">
          <span style="color:${ATTENDANCE_COLORS.textSub}">Total registros:</span>
          <span style="font-weight:700">${totalRegistered}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px">
          <span style="color:${ATTENDANCE_COLORS.textSub}">Asistencia global:</span>
          <span style="font-weight:700;color:${overallPct >= 75 ? ATTENDANCE_COLORS.success : overallPct >= 50 ? ATTENDANCE_COLORS.warning : ATTENDANCE_COLORS.danger}">
            ${overallPct}%
          </span>
        </div>
      </div>
    </div>

    <!-- Mejor / Peor sesión -->
    ${bestWorstCards.length > 0 ? `
    <div style="flex:1;background:#fff;border:1px solid ${ATTENDANCE_COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        🏆 Mejor / Peor Sesión
      </div>
      <div style="display:flex;flex-direction:column">
        ${bestWorstCards.join('')}
      </div>
    </div>
    ` : ''}

    <!-- Resumen del mes -->
    <div style="flex:1;background:#fff;border:1px solid ${ATTENDANCE_COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📋 Resumen del Período
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${[
          ['Total sesiones',      totalMeetings,             ATTENDANCE_COLORS.textMain],
          ['Promedio por sesión', Math.round(avgAttendance), ATTENDANCE_COLORS.textMain],
          ['Total presentes',     totalPresent,              ATTENDANCE_COLORS.success],
          ['Total ausentes',      totalAbsent,               ATTENDANCE_COLORS.danger],
          ['Total justificados',  totalJustified,            ATTENDANCE_COLORS.warning],
          ...(newParticipantsTotal > 0 ? [['🌟 Nuevas visitas', newParticipantsTotal, ATTENDANCE_COLORS.teal]] : []),
          ...(dailyTotalAttendees > 0 ? [['🏠 Total en el lugar', dailyTotalAttendees, ATTENDANCE_COLORS.purple]] : []),
        ].map(([label, value, color]) => `
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">${label}</span>
            <span style="font-weight:700;color:${color}">${value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- TABLA DE SESIONES DIARIAS -->
  <div style="background:#fff;border:1px solid ${ATTENDANCE_COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">
        📅 Detalle por Sesión
      </span>
      <div style="display:flex;gap:8px;align-items:center">
        ${hasSessionData ? `
        <span style="background:rgba(255,255,255,0.15);color:#fff;padding:3px 10px;border-radius:12px;font-size:10px">
          🌟 con datos de visitas
        </span>` : ''}
        <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">
          ${sortedDailyStats.length} sesiones
        </span>
      </div>
    </div>
    ${sortedDailyStats.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay sesiones registradas para este período.
      </div>
    ` : `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Total</th>
          <th>Presentes</th>
          <th>Ausentes</th>
          <th>Justificados</th>
          ${sessionCols}
          <th>% Asistencia</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      ${tableFoot}
    </table>
    `}
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Sistema de Gestión Pastoral • Reporte de Asistencias • Confidencial</span>
    <span>Generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })} — Página 1 de 1</span>
  </div>

</body>
</html>`;

  // ── Abrir ventana e imprimir ───────────────────────────────────────────────
  const win = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  if (!win) {
    alert('⚠️ Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }

  win.document.write(html);
  win.document.close();

  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 500);
  };
};