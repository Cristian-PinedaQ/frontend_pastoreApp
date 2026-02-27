// ============================================
// cellGroupOverviewPdfGenerator.js
// Generador de PDF para la vista general de altares
// Basado en el modelo de attendancePdfGenerator
// ============================================

const OVERVIEW_COLORS = {
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

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Devuelve el color de acento según el porcentaje de asistencia
 */
const pctColor = (pct) => {
  if (pct >= 75) return OVERVIEW_COLORS.success;
  if (pct >= 50) return OVERVIEW_COLORS.warning;
  return OVERVIEW_COLORS.danger;
};

/**
 * Devuelve la etiqueta de estado según el porcentaje
 */
const pctLabel = (pct) => {
  if (pct >= 75) return 'Saludable';
  if (pct >= 50) return 'Moderado';
  return 'En riesgo';
};

/**
 * Genera un PDF con la vista general de todos los altares
 * @param {Array}  cellStats      - Array de { cellId, cellName, stats, error }
 * @param {number} selectedMonth  - Mes seleccionado (1-12)
 * @param {number} selectedYear   - Año seleccionado
 * @param {Object} aggregated     - KPIs globales calculados en el modal
 */
export const generateOverviewPDF = (
  cellStats = [],
  selectedMonth = new Date().getMonth() + 1,
  selectedYear  = new Date().getFullYear(),
  aggregated    = null,
) => {

  const monthName  = MONTH_NAMES[selectedMonth - 1];
  const periodLabel = `${monthName} ${selectedYear}`;

  // Solo celdas con datos
  const cellsWithData = cellStats.filter(c => c.stats && c.stats.totalRegistered > 0);
  const cellsNoData   = cellStats.filter(c => !c.stats || c.stats.totalRegistered === 0);

  // Ordenar por porcentaje desc
  const sortedCells = [...cellsWithData].sort((a, b) => {
    const pctA = Math.round((a.stats.totalPresent / a.stats.totalRegistered) * 100);
    const pctB = Math.round((b.stats.totalPresent / b.stats.totalRegistered) * 100);
    return pctB - pctA;
  });

  // ────────────────────────────────────────────
  // KPI boxes globales
  // ────────────────────────────────────────────
  const kpiData = aggregated
    ? [
        { label: 'Altares con datos', value: aggregated.cellsWithData,   color: OVERVIEW_COLORS.accent,  icon: '🏘️' },
        { label: 'Total presentes',   value: aggregated.totalPresent,    color: OVERVIEW_COLORS.success, icon: '✅' },
        { label: 'Registros totales', value: aggregated.totalRegistered, color: OVERVIEW_COLORS.dark,    icon: '👥' },
        { label: '% Global',          value: `${aggregated.overallPct}%`,color: pctColor(aggregated.overallPct), icon: '📊' },
        { label: '% Promedio',        value: `${aggregated.avgPct}%`,    color: pctColor(aggregated.avgPct),     icon: '📈' },
        ...(aggregated.totalNew > 0
          ? [{ label: 'Nuevas visitas', value: aggregated.totalNew, color: OVERVIEW_COLORS.teal, icon: '🌟' }]
          : []),
      ]
    : [];

  const kpiBoxes = kpiData.map(k => `
    <div style="flex:1;min-width:100px;background:${OVERVIEW_COLORS.white};border:1px solid ${OVERVIEW_COLORS.border};border-radius:10px;padding:12px 8px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:20px;line-height:1;margin-bottom:4px">${k.icon}</div>
      <div style="font-size:22px;font-weight:800;color:${k.color};line-height:1.2">${k.value}</div>
      <div style="font-size:9px;color:${OVERVIEW_COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Mejor y peor altar
  // ────────────────────────────────────────────
  const bestCell  = sortedCells[0] || null;
  const worstCell = sortedCells[sortedCells.length - 1] || null;

  const bestWorstCards = [];
  if (bestCell) {
    const pct = Math.round((bestCell.stats.totalPresent / bestCell.stats.totalRegistered) * 100);
    bestWorstCards.push(`
      <div style="background:${OVERVIEW_COLORS.success}12;border:1px solid ${OVERVIEW_COLORS.success}28;border-radius:10px;padding:12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:14px">🏆</span>
          <span style="font-size:9px;color:${OVERVIEW_COLORS.success};font-weight:700;text-transform:uppercase;letter-spacing:0.04em">Mejor Altar</span>
        </div>
        <div style="font-size:12px;font-weight:600;color:${OVERVIEW_COLORS.textMain};margin-bottom:4px">🏡 ${bestCell.cellName}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:${OVERVIEW_COLORS.textSub}">Asistencia:</span>
          <span style="font-size:16px;font-weight:800;color:${OVERVIEW_COLORS.success}">
            ${bestCell.stats.totalPresent}/${bestCell.stats.totalRegistered}
            <span style="font-size:10px">(${pct}%)</span>
          </span>
        </div>
      </div>
    `);
  }
  if (worstCell && worstCell !== bestCell) {
    const pct = Math.round((worstCell.stats.totalPresent / worstCell.stats.totalRegistered) * 100);
    bestWorstCards.push(`
      <div style="background:${OVERVIEW_COLORS.danger}12;border:1px solid ${OVERVIEW_COLORS.danger}28;border-radius:10px;padding:12px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:14px">⚠️</span>
          <span style="font-size:9px;color:${OVERVIEW_COLORS.danger};font-weight:700;text-transform:uppercase;letter-spacing:0.04em">Altar más bajo</span>
        </div>
        <div style="font-size:12px;font-weight:600;color:${OVERVIEW_COLORS.textMain};margin-bottom:4px">🏡 ${worstCell.cellName}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:${OVERVIEW_COLORS.textSub}">Asistencia:</span>
          <span style="font-size:16px;font-weight:800;color:${OVERVIEW_COLORS.danger}">
            ${worstCell.stats.totalPresent}/${worstCell.stats.totalRegistered}
            <span style="font-size:10px">(${pct}%)</span>
          </span>
        </div>
      </div>
    `);
  }

  // ────────────────────────────────────────────
  // Distribución por estado de salud
  // ────────────────────────────────────────────
  const healthy  = cellsWithData.filter(c => Math.round((c.stats.totalPresent / c.stats.totalRegistered) * 100) >= 75).length;
  const moderate = cellsWithData.filter(c => { const p = Math.round((c.stats.totalPresent / c.stats.totalRegistered) * 100); return p >= 50 && p < 75; }).length;
  const risky    = cellsWithData.filter(c => Math.round((c.stats.totalPresent / c.stats.totalRegistered) * 100) < 50).length;
  const totalWithData = cellsWithData.length || 1;

  const healthBars = [
    { label: 'Saludable (≥75%)',  count: healthy,  color: OVERVIEW_COLORS.success },
    { label: 'Moderado (50-74%)', count: moderate, color: OVERVIEW_COLORS.warning },
    { label: 'En riesgo (<50%)',  count: risky,    color: OVERVIEW_COLORS.danger  },
  ].filter(s => s.count > 0).map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${OVERVIEW_COLORS.textSub};min-width:120px">${s.label}</span>
      <div style="flex:1;background:${OVERVIEW_COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((s.count / totalWithData) * 100)}%;height:100%;background:${s.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${s.color};min-width:30px;text-align:right">${s.count}</span>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Tabla de altares
  // ────────────────────────────────────────────
  const tableRows = sortedCells.map((c, i) => {
    const { stats, cellName } = c;
    const pct = Math.round((stats.totalPresent / stats.totalRegistered) * 100);
    const color = pctColor(pct);
    const newVisits = stats.totalNewParticipants || 0;

    return `
      <tr style="background:${i % 2 === 0 ? OVERVIEW_COLORS.white : OVERVIEW_COLORS.light}">
        <td style="padding:8px 10px;font-size:11px;font-weight:600;color:${OVERVIEW_COLORS.textMain};border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          🏡 ${cellName}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.textSub};border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          ${stats.totalMeetings}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.success};font-weight:600;border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          ${stats.totalPresent}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.danger};border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          ${stats.totalRegistered - stats.totalPresent}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.warning};border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          ${stats.totalJustified || 0}
        </td>
        <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.teal};border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          ${newVisits > 0 ? `🌟 ${newVisits}` : '—'}
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid ${OVERVIEW_COLORS.border}">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;background:${OVERVIEW_COLORS.border};border-radius:4px;height:6px">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${color}">${pct}%</span>
          </div>
        </td>
        <td style="padding:8px 10px;font-size:10px;font-weight:600;border-bottom:1px solid ${OVERVIEW_COLORS.border};color:${color}">
          ${pctLabel(pct)}
        </td>
      </tr>
    `;
  }).join('');

  // Altares sin datos
  const noDataRows = cellsNoData.map((c, i) => `
    <tr style="background:${(sortedCells.length + i) % 2 === 0 ? OVERVIEW_COLORS.white : OVERVIEW_COLORS.light};opacity:0.55">
      <td style="padding:8px 10px;font-size:11px;color:${OVERVIEW_COLORS.textSub};border-bottom:1px solid ${OVERVIEW_COLORS.border}" colspan="8">
        🏡 ${c.cellName} &nbsp;
        <span style="font-size:10px;background:#f1f5f9;padding:2px 8px;border-radius:8px;color:#94a3b8">
          📭 Sin datos para este período
        </span>
      </td>
    </tr>
  `).join('');

  // ────────────────────────────────────────────
  // HTML completo
  // ────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vista General Altares — ${periodLabel}</title>
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
      border-bottom: 1px solid ${OVERVIEW_COLORS.border};
    }
    td { padding: 8px 10px; border-bottom: 1px solid ${OVERVIEW_COLORS.border}; }
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
          🏘️ Vista General — Altares de Vida
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px">
            📅 ${periodLabel}
          </span>
          <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px">
            🏘️ ${cellStats.length} altar${cellStats.length !== 1 ? 'es' : ''}
          </span>
          <span style="background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px">
            📊 ${cellsWithData.length} con datos
          </span>
        </div>
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

  <!-- KPIs GLOBALES -->
  ${kpiData.length > 0 ? `<div class="kpi-container no-break">${kpiBoxes}</div>` : ''}

  <!-- DISTRIBUCIONES, MEJOR/PEOR Y RESUMEN -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">

    <!-- Distribución por salud -->
    <div style="flex:1;background:#fff;border:1px solid ${OVERVIEW_COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📊 Distribución por Estado
      </div>
      ${healthBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
      <div style="margin-top:12px;padding-top:8px;border-top:1px dashed ${OVERVIEW_COLORS.border}">
        <div style="display:flex;justify-content:space-between;font-size:10px">
          <span style="color:${OVERVIEW_COLORS.textSub}">Total altares:</span>
          <span style="font-weight:700">${cellStats.length}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px">
          <span style="color:${OVERVIEW_COLORS.textSub}">Con datos:</span>
          <span style="font-weight:700;color:${OVERVIEW_COLORS.accent}">${cellsWithData.length}</span>
        </div>
      </div>
    </div>

    <!-- Mejor / Peor altar -->
    ${bestWorstCards.length > 0 ? `
    <div style="flex:1;background:#fff;border:1px solid ${OVERVIEW_COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        🏆 Mejor / Peor Altar
      </div>
      <div style="display:flex;flex-direction:column">
        ${bestWorstCards.join('')}
      </div>
    </div>
    ` : ''}

    <!-- Resumen global -->
    <div style="flex:1;background:#fff;border:1px solid ${OVERVIEW_COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        📋 Resumen Global
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
          <span style="color:#64748b">Total sesiones</span>
          <span style="font-weight:700;color:${OVERVIEW_COLORS.textMain}">${aggregated?.totalMeetings || '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
          <span style="color:#64748b">Total presentes</span>
          <span style="font-weight:700;color:${OVERVIEW_COLORS.success}">${aggregated?.totalPresent || '—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
          <span style="color:#64748b">% Global</span>
          <span style="font-weight:700;color:${pctColor(aggregated?.overallPct || 0)}">${aggregated?.overallPct || 0}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
          <span style="color:#64748b">Nuevas visitas</span>
          <span style="font-weight:700;color:${OVERVIEW_COLORS.teal}">${aggregated?.totalNew || 0}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- TABLA DE ALTARES -->
  <div style="background:#fff;border:1px solid ${OVERVIEW_COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">
        🏘️ Comparativa por Altar
      </span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">
        ${cellsWithData.length} altares con datos
      </span>
    </div>
    ${cellsWithData.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay datos registrados para este período.
      </div>
    ` : `
    <table>
      <thead>
        <tr>
          <th>Altar</th>
          <th>Sesiones</th>
          <th>Presentes</th>
          <th>Ausentes</th>
          <th>Justificados</th>
          <th>Visitas</th>
          <th>% Asistencia</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
        ${noDataRows}
      </tbody>
    </table>
    `}
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>Sistema de Gestión Pastoral • Vista General Altares de Vida • Confidencial</span>
    <span>Página 1 de 1</span>
  </div>

</body>
</html>`;

  // Abrir ventana para imprimir/PDF
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