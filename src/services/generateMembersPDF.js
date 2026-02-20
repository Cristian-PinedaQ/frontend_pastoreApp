// 📄 membersPdfGenerator.js - Generador de PDF para reportes de miembros (Estilo CellGroups)
// ============================================
// membersPdfGenerator.js
// Generador de PDF para el listado de miembros (con soporte de filtros)
// Uso: import { generateMembersPDF } from './membersPdfGenerator';
// ============================================

const GENDER_COLORS = {
  MASCULINO: '#3b82f6',    // Azul
  FEMENINO: '#ec4899',     // Rosa
  OTRO: '#8b5cf6',         // Púrpura
};

const GENDER_LABELS = {
  MASCULINO: 'Masculino',
  FEMENINO: 'Femenino',
  OTRO: 'Otro',
};

const DISTRICT_COLORS = {
  NORTE:  '#3b82f6',
  SUR:    '#10b981',
  ESTE:   '#f59e0b',
  OESTE:  '#8b5cf6',
  CENTRO: '#ec4899',
};

/**
 * Genera un PDF con el listado de miembros (filtrado o completo).
 * @param {Array}   members       - Lista de miembros procesados a incluir
 * @param {Array}   filterSummary - Array con resumen de filtros aplicados
 * @param {string}  filename      - Nombre del archivo sin extensión
 */
export const generateMembersPDF = (
  members = [],
  filterSummary = [],
  filename = 'reporte_miembros'
) => {
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
  const filterBadges = filterSummary.map(filter => `
    <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">
      ${filter}
    </span>
  `).join('');

  const hasFilters = filterSummary.length > 0;

  // ────────────────────────────────────────────
  // KPI boxes
  // ────────────────────────────────────────────
  const totalMembers = members.length;
  const maleCount = members.filter(m => m.gender === 'MASCULINO').length;
  const femaleCount = members.filter(m => m.gender === 'FEMENINO').length;
  const withLeaderCount = members.filter(m => m.leader?.name).length;
  const withoutLeaderCount = members.filter(m => !m.leader?.name).length;

  const kpis = [
    { label: 'Total Miembros', value: totalMembers, color: COLORS.primary },
    { label: 'Hombres', value: maleCount, color: GENDER_COLORS.MASCULINO },
    { label: 'Mujeres', value: femaleCount, color: GENDER_COLORS.FEMENINO },
    { label: 'Con Líder', value: withLeaderCount, color: COLORS.success },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Distribución por género — mini barras
  // ────────────────────────────────────────────
  const total = totalMembers || 1;
  const genderDist = [
    { key: 'MASCULINO', count: maleCount, label: 'Masculino' },
    { key: 'FEMENINO', count: femaleCount, label: 'Femenino' },
    { key: 'OTRO', count: members.filter(m => m.gender === 'OTRO').length, label: 'Otro' },
  ].filter(g => g.count > 0);

  const genderBars = genderDist.map(g => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:80px">${g.label}</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((g.count/total)*100)}%;height:100%;background:${GENDER_COLORS[g.key]};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${GENDER_COLORS[g.key]};min-width:30px;text-align:right">${g.count}</span>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Distribución por liderazgo
  // ────────────────────────────────────────────
  const leadershipBars = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:80px">Con Líder</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((withLeaderCount/total)*100)}%;height:100%;background:${COLORS.success};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${COLORS.success};min-width:30px;text-align:right">${withLeaderCount}</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:80px">Sin Líder</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((withoutLeaderCount/total)*100)}%;height:100%;background:${COLORS.warning};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${COLORS.warning};min-width:30px;text-align:right">${withoutLeaderCount}</span>
    </div>
  `;

  // ────────────────────────────────────────────
  // Distribución por distrito
  // ────────────────────────────────────────────
  const districtMap = {};
  members.forEach(m => {
    const district = m.district || 'Sin Distrito';
    districtMap[district] = (districtMap[district] || 0) + 1;
  });
  
  const districtRows = Object.entries(districtMap)
    .sort((a, b) => b[1] - a[1])
    .map(([d, count]) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:10px;height:10px;border-radius:50%;background:${DISTRICT_COLORS[d] || COLORS.inactive}"></div>
      <span style="font-size:10px;color:${COLORS.textSub};flex:1">${d}</span>
      <span style="font-size:10px;font-weight:700;color:${DISTRICT_COLORS[d] || COLORS.inactive}">${count}</span>
    </div>
  `).join('');

  // ────────────────────────────────────────────
  // Tabla de miembros
  // ────────────────────────────────────────────
  const tableRows = members.map((m, i) => {
    const genderColor = GENDER_COLORS[m.gender] || COLORS.inactive;
    const genderLabel = GENDER_LABELS[m.gender] || m.gender || '—';
    const districtColor = DISTRICT_COLORS[m.district] || COLORS.inactive;
    const hasLeader = m.leader?.name;
    
    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${m.name || '—'}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${m.email || '—'}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${m.phone || '—'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${genderColor}22;color:${genderColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${genderLabel}</span>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${districtColor}22;color:${districtColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${m.district || '—'}</span>
        </td>
        <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid ${COLORS.border}">
          ${hasLeader 
            ? `<span style="color:${COLORS.success}">${m.leader.name}</span>` 
            : `<span style="color:${COLORS.warning}">—</span>`}
        </td>
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
  <title>Reporte de Miembros${hasFilters ? ' (Filtrado)' : ''}</title>
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
          👥 Reporte de Miembros${hasFilters ? ' — Filtrado' : ' — General'}
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
        Distribución por Género
      </div>
      ${genderBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Distribución por Liderazgo
      </div>
      ${leadershipBars}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Distribución por Distrito
      </div>
      ${districtRows || '<p style="font-size:11px;color:#94a3b8">Sin datos de distrito</p>'}
    </div>
  </div>

  <!-- TABLA -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado de Miembros</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${members.length} registros</span>
    </div>
    ${members.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay miembros que coincidan con los filtros aplicados.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          ${['Nombre','Email','Teléfono','Género','Distrito','Líder'].map(h =>
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
  win.onload = () => {
    setTimeout(() => {
      win.print();
      
      // Para guardar automáticamente, podemos usar un pequeño truco
      // pero la función print() ya permite guardar como PDF
      const timestamp = new Date().toISOString().split('T')[0];
      win.document.title = `${filename}_${timestamp}`;
    }, 400);
  };
};

/**
 * Generar PDF completo sin filtros
 */
export const generateCompleteMembersPDF = (members = [], filename = 'miembros_completo') =>
  generateMembersPDF(members, [], filename);