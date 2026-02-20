// ============================================
// leadersPdfGenerator.js
// Generador de PDF para el listado de líderes (con soporte de filtros)
// Uso: import { generateLeadersPDF } from './leadersPdfGenerator';
// ============================================

const LEADER_TYPE_COLORS = {
  SERVANT: '#3b82f6',
  LEADER_12: '#10b981',
  LEADER_144: '#8b5cf6',
};

const LEADER_TYPE_LABELS = {
  SERVANT: 'Servidor',
  LEADER_12: 'Líder 12',
  LEADER_144: 'Líder 144',
};

const LEADER_STATUS_COLORS = {
  ACTIVE: '#10b981',
  SUSPENDED: '#f59e0b',
  INACTIVE: '#6b7280',
};

const LEADER_STATUS_LABELS = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  INACTIVE: 'Inactivo',
};

/**
 * Genera un PDF con el listado de líderes (filtrado o completo).
 * @param {Object}  data          - Datos para el PDF
 * @param {Array}   data.leaders  - Lista de líderes a incluir
 * @param {string}  data.title    - Título del reporte
 * @param {number}  data.activeCount - Cantidad de activos
 * @param {number}  data.suspendedCount - Cantidad de suspendidos
 * @param {number}  data.inactiveCount - Cantidad de inactivos
 * @param {number}  data.totalCount - Total de líderes
 * @param {boolean} data.hasFilters - Si hay filtros aplicados
 * @param {Object}  data.filtersInfo - Información de filtros activos
 */
export const generateLeadersPDF = (data) => {
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
  };

  const {
    leaders = [],
    title = 'Reporte de Líderes',
    activeCount = 0,
    suspendedCount = 0,
    inactiveCount = 0,
    totalCount = 0,
    hasFilters = false,
    filtersInfo = {},
  } = data;

  // ========== CONSTRUIR BADGES DE FILTROS ==========
  const filterBadges = Object.entries(filtersInfo).map(([key, val]) => `
    <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 10px;border-radius:12px;margin-right:6px;margin-top:4px">
      ${key === 'status' ? '📌' : key === 'type' ? '🛠️' : '🔍'} ${val}
    </span>
  `).join('');

  // ========== KPIs ==========
  const kpis = [
    { label: 'Total Líderes', value: totalCount || leaders.length, color: COLORS.primary },
    { label: 'Activos', value: activeCount || leaders.filter(l => l.status === 'ACTIVE').length, color: COLORS.success },
    { label: 'Suspendidos', value: suspendedCount || leaders.filter(l => l.status === 'SUSPENDED').length, color: COLORS.warning },
    { label: 'Inactivos', value: inactiveCount || leaders.filter(l => l.status === 'INACTIVE').length, color: COLORS.inactive },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ========== DISTRIBUCIÓN POR ESTADO ==========
  const total = leaders.length || 1;
  const statusDist = [
    { key: 'ACTIVE', count: leaders.filter(l => l.status === 'ACTIVE').length, color: LEADER_STATUS_COLORS.ACTIVE, label: LEADER_STATUS_LABELS.ACTIVE },
    { key: 'SUSPENDED', count: leaders.filter(l => l.status === 'SUSPENDED').length, color: LEADER_STATUS_COLORS.SUSPENDED, label: LEADER_STATUS_LABELS.SUSPENDED },
    { key: 'INACTIVE', count: leaders.filter(l => l.status === 'INACTIVE').length, color: LEADER_STATUS_COLORS.INACTIVE, label: LEADER_STATUS_LABELS.INACTIVE },
  ].filter(s => s.count > 0);

  const statusBars = statusDist.map(s => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:100px">${s.label}</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((s.count/total)*100)}%;height:100%;background:${s.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${s.color};min-width:30px;text-align:right">${s.count}</span>
    </div>
  `).join('');

  // ========== DISTRIBUCIÓN POR TIPO ==========
  const servantCount = leaders.filter(l => l.leaderType === 'SERVANT').length;
  const leader12Count = leaders.filter(l => l.leaderType === 'LEADER_12').length;
  const leader144Count = leaders.filter(l => l.leaderType === 'LEADER_144').length;

  const typeDist = [
    { key: 'SERVANT', count: servantCount, color: LEADER_TYPE_COLORS.SERVANT, label: LEADER_TYPE_LABELS.SERVANT },
    { key: 'LEADER_12', count: leader12Count, color: LEADER_TYPE_COLORS.LEADER_12, label: LEADER_TYPE_LABELS.LEADER_12 },
    { key: 'LEADER_144', count: leader144Count, color: LEADER_TYPE_COLORS.LEADER_144, label: LEADER_TYPE_LABELS.LEADER_144 },
  ].filter(t => t.count > 0);

  const typeBars = typeDist.map(t => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${COLORS.textSub};min-width:100px">${t.label}</span>
      <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((t.count/total)*100)}%;height:100%;background:${t.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${t.color};min-width:30px;text-align:right">${t.count}</span>
    </div>
  `).join('');

  // ========== TABLA DE LÍDERES ==========
  const tableRows = leaders.map((leader, i) => {
    const sc = LEADER_STATUS_COLORS[leader.status] || COLORS.inactive;
    const sl = LEADER_STATUS_LABELS[leader.status] || leader.status;
    const tc = LEADER_TYPE_COLORS[leader.leaderType] || COLORS.accent;
    const tl = LEADER_TYPE_LABELS[leader.leaderType] || leader.leaderType;

    // Formatear fecha de verificación
    const lastVerificationFormatted = leader.lastVerificationDate 
      ? new Date(leader.lastVerificationDate).toLocaleDateString('es-CO')
      : null;

    const verifiedBadge = lastVerificationFormatted
      ? `<span style="color:${COLORS.success};font-size:10px">✅ ${lastVerificationFormatted}</span>`
      : `<span style="color:${COLORS.warning};font-size:10px">⏳ Nunca</span>`;

    // Formatear fecha de promoción
    const promotionDateFormatted = leader.promotionDate
      ? new Date(leader.promotionDate).toLocaleDateString('es-CO')
      : '—';

    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:7px 10px;font-size:11px;font-weight:600;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">
          <div>${leader.memberName || 'Sin nombre'}</div>
          <div style="font-size:9px;color:${COLORS.textSub}">${leader.memberDocument || 'Sin documento'}</div>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${tc}22;color:${tc};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${tl}</span>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${sc}22;color:${sc};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;white-space:nowrap">${sl}</span>
        </td>
        <td style="padding:7px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${leader.cellGroupCode || '—'}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${promotionDateFormatted}</td>
        <td style="padding:7px 10px;font-size:10px;border-bottom:1px solid ${COLORS.border}">${verifiedBadge}</td>
        <td style="padding:7px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${leader.memberEmail || '—'}</td>
      </tr>
    `;
  }).join('');

  // ========== HTML COMPLETO ==========
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Líderes${hasFilters ? ' (Filtrado)' : ''}</title>
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
          Sistema de Gestión de Liderazgo
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">
          👥 ${title}${hasFilters ? ' — Filtrado' : ' — General'}
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
        Distribución por Tipo
      </div>
      ${typeBars || '<p style="font-size:11px;color:#94a3b8">Sin datos</p>'}
    </div>
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">
        Resumen de Verificación
      </div>
      ${(() => {
        const verified = leaders.filter(l => l.lastVerificationDate).length;
        const neverVerified = leaders.filter(l => !l.lastVerificationDate).length;
        const suspendedWithReason = leaders.filter(l => l.status === 'SUSPENDED' && l.suspensionReason).length;
        
        return `
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">✅ Verificados</span>
            <span style="font-weight:700;color:#10b981">${verified}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px">
            <span style="color:#64748b">⏳ Nunca verificados</span>
            <span style="font-weight:700;color:#f59e0b">${neverVerified}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px">
            <span style="color:#64748b">⚠️ Suspendidos con motivo</span>
            <span style="font-weight:700;color:#ef4444">${suspendedWithReason}</span>
          </div>
        `;
      })()}
    </div>
  </div>

  <!-- TABLA DE LÍDERES -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:#1e40af;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado de Líderes</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${leaders.length} registros</span>
    </div>
    ${leaders.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay líderes que coincidan con los filtros aplicados.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          ${['Líder','Tipo','Estado','Célula','Promoción','Verificación','Email'].map(h =>
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
    <span style="font-size:9px;color:#94a3b8">Sistema de Gestión de Liderazgo • Reporte Confidencial${hasFilters ? ' • Con filtros aplicados' : ''}</span>
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