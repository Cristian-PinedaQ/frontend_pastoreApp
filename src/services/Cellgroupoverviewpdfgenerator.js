// ============================================
// cellGroupOverviewPdfGenerator.js
// Generador de PDF actualizado: Impacto REAL (totalAttendees)
// Ahora usa el campo totalRealAttendees en lugar de calcular presentes + visitas
// ============================================

const OVERVIEW_COLORS = {
  primary: '#1e40af',
  accent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  inactive: '#6b7280',
  purple: '#8b5cf6',
  teal: '#0d9488',
  dark: '#1e293b',
  light: '#f8fafc',
  border: '#e2e8f0',
  textMain: '#1e293b',
  textSub: '#64748b',
  white: '#ffffff',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const pctColor = (pct) => {
  if (pct >= 75) return OVERVIEW_COLORS.success;
  if (pct >= 50) return OVERVIEW_COLORS.warning;
  return OVERVIEW_COLORS.danger;
};

const pctLabel = (pct) => {
  if (pct >= 75) return 'Saludable';
  if (pct >= 50) return 'Moderado';
  return 'En riesgo';
};

export const generateOverviewPDF = (
  cellStats = [],
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
  aggregated = null,
  selectedDate = '',
) => {

  const monthName = MONTH_NAMES[selectedMonth - 1];
  const periodLabel = selectedDate
    ? `Sesión del ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`
    : `${monthName} ${selectedYear}`;

  const reportSubtitle = selectedDate ? "Reporte Detallado de Sesión Única" : "Resumen Comparativo Mensual";

  const cellsWithData = cellStats.filter(c => c.stats && c.stats.totalRegistered > 0);

  const sortedCells = [...cellsWithData].sort((a, b) => {
    const pctA = Math.round((a.stats.totalPresent / a.stats.totalRegistered) * 100);
    const pctB = Math.round((b.stats.totalPresent / b.stats.totalRegistered) * 100);
    return pctB - pctA;
  });

  // 1. KPI boxes globales - Usando totalRealAttendees para IMPACTO
  const kpiData = aggregated
    ? [
      { 
        label: 'Altares con datos', 
        value: aggregated.cellsWithData, 
        color: OVERVIEW_COLORS.accent, 
        icon: '🏘️' 
      },
      { 
        label: 'Miembros Presentes', 
        value: aggregated.totalPresent, 
        color: OVERVIEW_COLORS.success, 
        icon: '✅' 
      },
      { 
        label: 'Ausencias Justificadas', 
        value: aggregated.totalJustified || 0, 
        color: OVERVIEW_COLORS.warning, 
        icon: '📝' 
      },
      { 
        label: 'Nuevas Visitas', 
        value: aggregated.totalNew || 0, 
        color: OVERVIEW_COLORS.teal, 
        icon: '🌟' 
      },
      { 
        label: 'Impacto REAL', 
        value: aggregated.totalRealAttendees || (aggregated.totalPresent + (aggregated.totalNew || 0)), 
        color: OVERVIEW_COLORS.purple, 
        icon: '🏠',
        note: 'Total real de asistentes (incluye correcciones manuales)'
      },
    ]
    : [];

  const kpiBoxes = kpiData.map(k => `
    <div style="flex:1;min-width:100px;background:${OVERVIEW_COLORS.white};border:1px solid ${OVERVIEW_COLORS.border};border-radius:10px;padding:12px 8px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:20px;line-height:1;margin-bottom:4px">${k.icon}</div>
      <div style="font-size:20px;font-weight:800;color:${k.color};line-height:1.2">${k.value}</div>
      <div style="font-size:8px;color:${OVERVIEW_COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
      ${k.note ? `<div style="font-size:6px;color:${OVERVIEW_COLORS.textSub};margin-top:2px;">${k.note}</div>` : ''}
    </div>
  `).join('');

  // 2. Tabla de altares - Usando totalRealAttendees para IMPACTO REAL
  const tableRows = sortedCells.map((c, i) => {
    const { stats, cellName } = c;
    const pct = Math.round((stats.totalPresent / stats.totalRegistered) * 100);
    const color = pctColor(pct);
    const newVisits = stats.totalNewParticipants || 0;
    const justified = stats.totalJustified || 0;
    // 🔥 NUEVO: Usar totalRealAttendees del backend, no calcular
    const realImpact = stats.totalRealAttendees || (stats.totalPresent + newVisits);
    const hasManualCorrection = stats.totalAttendees !== null && stats.totalAttendees !== undefined;
    const correctionIcon = hasManualCorrection ? '' : '';

    return `
      <tr style="background:${i % 2 === 0 ? OVERVIEW_COLORS.white : OVERVIEW_COLORS.light}">
        <td style="padding:8px 10px;font-size:11px;font-weight:600;color:${OVERVIEW_COLORS.textMain};border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          🏡 ${cellName}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.success};font-weight:600;text-align:center;">
          ${stats.totalPresent}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.warning};font-weight:600;text-align:center;">
          ${justified}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.teal};font-weight:600;text-align:center;">
          🌟 ${newVisits}
        </td>
        <td style="padding:8px 10px;font-size:11px;background:${OVERVIEW_COLORS.purple}08;color:${OVERVIEW_COLORS.purple};font-weight:800;text-align:center;">
          🏠 ${realImpact} ${correctionIcon}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          <div style="display:flex;align-items:center;gap:8px;justify-content:center;">
            <div style="width:50px;background:${OVERVIEW_COLORS.border};border-radius:4px;height:6px">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${color}">${pct}%</span>
          </div>
        </td>
        <td style="padding:8px 10px;font-size:10px;font-weight:600;color:${color};text-align:right;">
          ${pctLabel(pct)}
        </td>
      </tr>
    `;
  }).join('');

  // Calcular totales reales para el pie de página
  const totalRealImpact = sortedCells.reduce((sum, c) => {
    return sum + (c.stats.totalRealAttendees || (c.stats.totalPresent + (c.stats.totalNewParticipants || 0)));
  }, 0);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #1e293b; }
    @page { size: A4 landscape; margin: 1cm; }
    .header-gradient {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      border-radius: 12px; padding: 20px; margin-bottom: 20px; color: #fff;
    }
    .kpi-container { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th {
      background: #f8fafc; padding: 10px; font-size: 9px; color: #64748b;
      text-transform: uppercase; text-align: center; border-bottom: 2px solid #e2e8f0;
    }
    th:first-child { text-align: left; }
    .footer {
      margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;
    }
    .note {
      background: #fef3c7; padding: 8px 12px; border-radius: 8px; font-size: 8px;
      color: #92400e; margin-top: 15px; display: flex; align-items: center; gap: 8px;
    }
    .badge {
      background: ${OVERVIEW_COLORS.purple}20; padding: 2px 6px; border-radius: 12px;
      font-size: 7px; font-weight: 700; color: ${OVERVIEW_COLORS.purple};
    }
  </style>
</head>
<body>
  <div class="header-gradient">
    <div style="font-size:22px;font-weight:800;">🏘️ Vista General: Altares de Vida</div>
    <div style="font-size:14px;opacity:0.9;margin-top:5px;">${periodLabel} — ${reportSubtitle}</div>
  </div>

  <div class="kpi-container">${kpiBoxes}</div>

  <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
    <div style="background:${OVERVIEW_COLORS.primary}; padding:10px; color:white; font-size:11px; font-weight:700;">
      COMPARATIVA DETALLADA POR ALTAR
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;">Altar</th>
          <th>Presentes</th>
          <th>Justificados</th>
          <th>Visitas</th>
          <th>Impacto REAL</th>
          <th>Asistencia %</th>
          <th style="text-align:right;">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  ${selectedDate ? `
  <div class="note">
    <span>📌</span>
    <span><strong>Nota:</strong> El campo "Impacto REAL" representa el total de asistentes reales registrados por el líder (incluye miembros presentes + visitas + ajustes manuales).</span>
    <span class="badge">✏️ Corregido manualmente</span>
  </div>
  ` : `
  <div class="note">
    <span>📊</span>
    <span><strong>Resumen del mes:</strong> ${totalRealImpact} asistentes reales en total entre todos los altares (Impacto REAL).</span>
    <span class="badge">Datos en tiempo real</span>
  </div>
  `}

  <div class="footer">
    <span>Generado el ${new Date().toLocaleString()}</span>
    <span>Sistema de Gestión Pastoral • Impacto REAL (totalAttendees)</span>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { setTimeout(() => { win.print(); }, 500); };
};