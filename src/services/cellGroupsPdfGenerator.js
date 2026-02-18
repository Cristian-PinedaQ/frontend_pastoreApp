// ============================================
// cellGroupsPdfGenerator.js
// Generador de PDF para el listado de células (con soporte de filtros)
// Uso: import { generateCellGroupsPDF } from './cellGroupsPdfGenerator';
// ============================================

const STATUS_COLORS = {
  ACTIVE:               '#10b981',
  INCOMPLETE_LEADERSHIP: '#f59e0b',
  INACTIVE:             '#6b7280',
  SUSPENDED:            '#ef4444',
};

const STATUS_LABELS = {
  ACTIVE:               'Activa',
  INCOMPLETE_LEADERSHIP: 'Liderazgo Incompleto',
  INACTIVE:             'Inactiva',
  SUSPENDED:            'Suspendida',
};

const DISTRICT_COLORS = {
  NORTE:  '#3b82f6',
  SUR:    '#10b981',
  ESTE:   '#f59e0b',
  OESTE:  '#8b5cf6',
  CENTRO: '#ec4899',
};

/**
 * Genera un PDF con el listado de células (filtrado o completo).
 * @param {Array}   cells         - Lista de células procesadas a incluir
 * @param {Object}  filtersInfo   - Información sobre filtros activos { status, district, search, ... }
 * @param {boolean} hasFilters    - Si hay filtros aplicados
 * @param {Object}  stats         - Contadores { total, active, incomplete, suspended, inactive }
 */
export const generateCellGroupsPDF = (cells = [], filtersInfo = {}, hasFilters = false, stats = {}) => {
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

  // ────────────────────────────────────────────
  // Resumen de filtros aplicados
  // ────────────────────────────────────────────
  const filterBadges = Object.entries(filtersInfo).map(([key, val]) => `
    <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">
      ${val}
    </span>
  `).join('');

  // ────────────────────────────────────────────
  // KPI boxes
  // ────────────────────────────────────────────
  const kpis = [
    { label: 'Total Células',       value: stats.total    || cells.length,          color: COLORS.primary },
    { label: 'Activas',             value: stats.active   || cells.filter(c => c.status === 'ACTIVE').length, color: COLORS.success },
    { label: 'Liderazgo Incompleto',value: stats.incomplete || cells.filter(c => c.status === 'INCOMPLETE_LEADERSHIP').length, color: COLORS.warning },
    { label: 'Suspendidas/Inactivas', value: (stats.suspended || cells.filter(c => c.status === 'SUSPENDED').length) + (stats.inactive || cells.filter(c => c.status === 'INACTIVE').length), color: COLORS.danger },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Distribución por estado — mini barras
  // ────────────────────────────────────────────
  const total = cells.length || 1;
  const statusDist = [
    { key: 'ACTIVE',               count: cells.filter(c => c.status === 'ACTIVE').length },
    { key: 'INCOMPLETE_LEADERSHIP', count: cells.filter(c => c.status === 'INCOMPLETE_LEADERSHIP').length },
    { key: 'SUSPENDED',            count: cells.filter(c => c.status === 'SUSPENDED').length },
    { key: 'INACTIVE',             count: cells.filter(c => c.status === 'INACTIVE').length },
  ].filter(s => s.count > 0);

  const statusBars = statusDist.map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:130px">${STATUS_LABELS[s.key]}</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((s.count/total)*100)}%;height:100%;background:${STATUS_COLORS[s.key]};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${STATUS_COLORS[s.key]};min-width:30px;text-align:right">${s.count}</span>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Distribución por distrito
  // ────────────────────────────────────────────
  const districtMap = {};
  cells.forEach(c => {
    if (c.district) districtMap[c.district] = (districtMap[c.district] || 0) + 1;
  });
  const districtRows = Object.entries(districtMap).map(([d, count]) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:10px;height:10px;border-radius:50%;background:${DISTRICT_COLORS[d] || COLORS.inactive}"></div>
      <span style="font-size:10px;color:${COLORS.textSub};flex:1">${d}</span>
      <span style="font-size:10px;font-weight:700;color:${DISTRICT_COLORS[d] || COLORS.inactive}">${count}</span>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Tabla de células
  // ────────────────────────────────────────────
  const tableRows = cells.map((cell, i) => {
    const sc     = STATUS_COLORS[cell.status] || COLORS.inactive;
    const sl     = STATUS_LABELS[cell.status]  || cell.status;
    const dc     = DISTRICT_COLORS[cell.district] || COLORS.inactive;
    const occ    = cell.maxCapacity
      ? `${cell.currentMemberCount || 0}/${cell.maxCapacity} (${cell.occupancyPercentage || 0}%)`
      : `${cell.currentMemberCount || 0}`;
    const leader = cell.hasAllLeadersActive
      ? `<span style="color:${COLORS.success};font-size:10px;font-weight:700">✓ Completo</span>`
      : `<span style="color:${COLORS.warning};font-size:10px;font-weight:700">⚠ Incompleto</span>`;
    const mult   = cell.isMultiplying
      ? `<span style="color:#0d9488;font-size:10px">🌱 En proceso</span>`
      : `${cell.multiplicationCount || 0}`;

    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};max-width:120px">${cell.name}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${sc}22;color:${sc};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${sl}</span>
        </td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${leader}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${dc}22;color:${dc};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${cell.districtLabel || cell.district || '—'}</span>
        </td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${cell.meetingDay || '—'} ${cell.meetingTimeFormatted || ''}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};font-weight:600">${occ}</td>
        <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid ${COLORS.border}">${mult}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border};max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cell.mainLeaderName || '—'}</td>
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
  <title>Reporte de Células${hasFilters ? ' (Filtrado)' : ''}</title>
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
          Sistema de Gestión Pastoral
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">
          🏠 Reporte de Células${hasFilters ? ' — Filtrado' : ' — General'}
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

  <!-- KPIs -->
  <div style="display:flex;gap:12px;margin-bottom:16px" class="no-break">
    ${kpiBoxes}
  </div>

  <!-- DISTRIBUCIONES -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Distribución por Estado
      </div>
      ${statusBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Distribución por Distrito
      </div>
      ${districtRows || '<p style="font-size:11px;color:#94a3b8">Sin datos de distrito</p>'}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Resumen de Miembros
      </div>
      ${(() => {
        const totalM    = cells.reduce((s, c) => s + (c.currentMemberCount || 0), 0);
        const withCap   = cells.filter(c => c.maxCapacity);
        const avgOcc    = withCap.length ? Math.round(withCap.reduce((s, c) => s + (c.occupancyPercentage || 0), 0) / withCap.length) : 0;
        const multiplying = cells.filter(c => c.isMultiplying).length;
        return `
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">Total miembros</span>
            <span style="font-weight:700;color:#1e293b">${totalM}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">Ocupación promedio</span>
            <span style="font-weight:700;color:#1e293b">${avgOcc}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
            <span style="color:#64748b">En multiplicación</span>
            <span style="font-weight:700;color:#0d9488">${multiplying}</span>
          </div>
        `;
      })()}
    </div>
  </div>

  <!-- TABLA -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado de Células</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${cells.length} registros</span>
    </div>
    ${cells.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay células que coincidan con los filtros aplicados.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          ${['Nombre','Estado','Liderazgo','Distrito','Reunión','Ocupación','Multiplicac.','Líder Principal'].map(h =>
            `<th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">${h}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    `}
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:9px;color:#94a3b8">Sistema de Gestión Pastoral • Reporte Confidencial${hasFilters ? ' • Con filtros aplicados' : ''}</span>
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