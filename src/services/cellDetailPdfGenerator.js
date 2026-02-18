// ============================================
// cellDetailPdfGenerator.js
// Generador de PDF para el detalle individual de una célula
// Uso: import { generateCellDetailPDF } from './cellDetailPdfGenerator';
// ============================================

/**
 * Genera un PDF con la información completa de una célula específica.
 * @param {Object} cell - Datos procesados de la célula (de CellGroupsPage state)
 * @param {Array}  members - Lista de miembros actuales de la célula
 */
export const generateCellDetailPDF = (cell, members = []) => {
  if (!cell) return;

  // ────────────────────────────────────────────
  // Paleta de colores y constantes de diseño
  // ────────────────────────────────────────────
  const COLORS = {
    primary:   '#1e40af',
    accent:    '#3b82f6',
    success:   '#10b981',
    warning:   '#f59e0b',
    danger:    '#ef4444',
    inactive:  '#6b7280',
    dark:      '#1e293b',
    light:     '#f8fafc',
    border:    '#e2e8f0',
    textMain:  '#1e293b',
    textSub:   '#64748b',
    white:     '#ffffff',
  };

  const STATUS_COLORS = {
    ACTIVE:               COLORS.success,
    INCOMPLETE_LEADERSHIP: COLORS.warning,
    INACTIVE:             COLORS.inactive,
    SUSPENDED:            COLORS.danger,
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

  const PAGE = { W: 210, H: 297, marginX: 18, marginY: 20 };
  const contentW = PAGE.W - PAGE.marginX * 2;

  // ────────────────────────────────────────────
  // Construir el HTML del documento
  // ────────────────────────────────────────────
  const memberRows = members.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? COLORS.white : '#f8fafc'}">
      <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border}">${i + 1}</td>
      <td style="padding:6px 10px;font-size:11px;color:${COLORS.textMain};border-bottom:1px solid ${COLORS.border};font-weight:500">${m.name || m.displayName || '—'}</td>
      <td style="padding:6px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${m.document || '—'}</td>
      <td style="padding:6px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${m.phone || '—'}</td>
      <td style="padding:6px 10px;font-size:11px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${m.email || '—'}</td>
    </tr>
  `).join('');

  const statusColor   = STATUS_COLORS[cell.status] || COLORS.inactive;
  const statusLabel   = STATUS_LABELS[cell.status]  || cell.status || '—';
  const districtColor = DISTRICT_COLORS[cell.district] || COLORS.inactive;

  const leaderRow = (label, name, isActive) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid ${COLORS.border}">
      <span style="font-size:11px;color:${COLORS.textSub};font-weight:500;min-width:130px">${label}</span>
      <span style="font-size:11px;color:${COLORS.textMain};font-weight:600;flex:1;text-align:right">${name || '—'}</span>
      ${isActive === false
        ? `<span style="margin-left:10px;background:#fee2e2;color:#991b1b;font-size:10px;padding:2px 7px;border-radius:10px;white-space:nowrap">⚠ Inactivo</span>`
        : (isActive === true
          ? `<span style="margin-left:10px;background:#d1fae5;color:#065f46;font-size:10px;padding:2px 7px;border-radius:10px;white-space:nowrap">✓ Activo</span>`
          : '')
      }
    </div>
  `;

  const infoRow = (label, value) => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid ${COLORS.border}">
      <span style="font-size:11px;color:${COLORS.textSub};font-weight:500">${label}</span>
      <span style="font-size:11px;color:${COLORS.textMain};font-weight:600;text-align:right">${value || '—'}</span>
    </div>
  `;

  const occupancy      = cell.currentMemberCount || 0;
  const maxCap         = cell.maxCapacity || null;
  const occupancyPct   = maxCap ? Math.min(100, Math.round((occupancy / maxCap) * 100)) : 0;
  const occupancyColor = occupancyPct >= 90 ? COLORS.danger : occupancyPct >= 75 ? COLORS.warning : COLORS.success;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Célula ${cell.name || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: ${COLORS.white};
      color: ${COLORS.textMain};
      font-size: 12px;
    }
    @page { size: A4; margin: 18mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- ══ HEADER ══ -->
  <div style="background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.accent} 100%);border-radius:12px;padding:24px 28px;margin-bottom:20px;color:${COLORS.white}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:11px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Reporte de Célula</div>
        <div style="font-size:24px;font-weight:800;line-height:1.1;margin-bottom:8px">${cell.name || 'Sin nombre'}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <span style="background:${statusColor};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">${statusLabel}</span>
          ${cell.district ? `<span style="background:${districtColor};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">${cell.districtLabel || cell.district}</span>` : ''}
          ${cell.isMultiplying ? `<span style="background:#0d9488;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700">🌱 En Multiplicación</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:13px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</div>
        <div style="font-size:11px;margin-top:6px">ID: #${cell.id}</div>
      </div>
    </div>
  </div>

  <!-- ══ KPIs ══ -->
  <div style="display:flex;gap:12px;margin-bottom:20px">
    ${[
      { label: 'Miembros Activos', value: occupancy, sub: maxCap ? `/ ${maxCap} máximo` : 'Sin límite', color: COLORS.primary },
      { label: 'Multiplicaciones', value: cell.multiplicationCount || 0, sub: 'históricas', color: COLORS.success },
      { label: 'Ocupación', value: maxCap ? `${occupancyPct}%` : 'N/A', sub: 'del cupo total', color: occupancyColor },
      { label: 'Liderazgo', value: cell.hasAllLeadersActive ? '✓ Completo' : '⚠ Incompleto', sub: cell.hasAllLeadersActive ? 'Todos activos' : `${cell.missingOrInactiveLeaders?.length || 0} problema(s)`, color: cell.hasAllLeadersActive ? COLORS.success : COLORS.warning },
    ].map(k => `
      <div style="flex:1;background:${COLORS.light};border:1px solid ${COLORS.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color}">
        <div style="font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${k.label}</div>
        <div style="font-size:20px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
        <div style="font-size:10px;color:${COLORS.textSub};margin-top:3px">${k.sub}</div>
      </div>
    `).join('')}
  </div>

  <!-- ══ DOS COLUMNAS: LIDERAZGO + REUNIÓN ══ -->
  <div style="display:flex;gap:14px;margin-bottom:20px">

    <!-- Liderazgo -->
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:${COLORS.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${COLORS.accent}">
        👥 Equipo de Liderazgo
      </div>
      ${leaderRow('Líder Principal',  cell.mainLeaderName,  cell.mainLeaderIsActive)}
      ${leaderRow('Líder de Grupo',   cell.groupLeaderName, cell.groupLeaderIsActive)}
      ${leaderRow('Anfitrión/a',      cell.hostName,        cell.hostIsActive)}
      ${leaderRow('Timoteo',          cell.timoteoName,     cell.timoteoIsActive)}
    </div>

    <!-- Reunión + Estadísticas -->
    <div style="flex:1;display:flex;flex-direction:column;gap:14px">

      <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px">
        <div style="font-size:12px;font-weight:800;color:${COLORS.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${COLORS.accent}">
          📍 Información de Reunión
        </div>
        ${infoRow('Día',       cell.meetingDay || 'No definido')}
        ${infoRow('Hora',      cell.meetingTimeFormatted || 'No definida')}
        ${infoRow('Dirección', cell.meetingAddress || 'No definida')}
        ${infoRow('Distrito',  cell.districtLabel || cell.district || 'Sin distrito')}
      </div>

      <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px">
        <div style="font-size:12px;font-weight:800;color:${COLORS.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${COLORS.accent}">
          📊 Datos Generales
        </div>
        ${infoRow('Fecha de Creación',  cell.creationDateFormatted || '—')}
        ${infoRow('ID de Célula',       `#${cell.id}`)}
        ${infoRow('Capacidad Máxima',   maxCap ? `${maxCap} personas` : 'Sin límite')}
        ${infoRow('Estado Actual',      statusLabel)}
      </div>
    </div>
  </div>

  ${/* Barra de ocupación */ maxCap ? `
  <!-- Ocupación visual -->
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:16px;margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:${COLORS.textMain}">Nivel de Ocupación</span>
      <span style="font-size:11px;font-weight:700;color:${occupancyColor}">${occupancy} / ${maxCap} miembros (${occupancyPct}%)</span>
    </div>
    <div style="background:${COLORS.border};border-radius:6px;height:10px;overflow:hidden">
      <div style="width:${occupancyPct}%;height:100%;background:${occupancyColor};border-radius:6px;transition:width 0.3s"></div>
    </div>
  </div>
  ` : ''}

  ${/* Problemas de liderazgo */ (!cell.hasAllLeadersActive && cell.missingOrInactiveLeaders?.length > 0) ? `
  <!-- Alertas de liderazgo -->
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;margin-bottom:20px">
    <div style="font-size:12px;font-weight:800;color:#c2410c;margin-bottom:10px">⚠ Problemas de Liderazgo Detectados</div>
    ${cell.missingOrInactiveLeaders.map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #fed7aa;font-size:11px;color:#92400e">
        <span style="color:#f97316;font-size:14px">•</span> ${p}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${/* Notas */ cell.notes ? `
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;margin-bottom:20px">
    <div style="font-size:12px;font-weight:800;color:${COLORS.primary};margin-bottom:8px">📝 Notas</div>
    <p style="font-size:11px;color:#1e40af;line-height:1.6">${cell.notes}</p>
  </div>
  ` : ''}

  <!-- ══ LISTA DE MIEMBROS ══ -->
  <div style="background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:${COLORS.primary};padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:${COLORS.white};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px">👥 Miembros de la Célula</span>
      <span style="background:rgba(255,255,255,0.2);color:${COLORS.white};padding:3px 12px;border-radius:12px;font-size:11px;font-weight:700">${members.length} miembros</span>
    </div>
    ${members.length === 0 ? `
      <div style="padding:30px;text-align:center;color:${COLORS.textSub};font-size:12px">
        Esta célula aún no tiene miembros registrados.
      </div>
    ` : `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">#</th>
            <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Nombre</th>
            <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Documento</th>
            <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Teléfono</th>
            <th style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};text-transform:uppercase;letter-spacing:1px;text-align:left;font-weight:700;border-bottom:1px solid ${COLORS.border}">Email</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>
    `}
  </div>

  <!-- ══ FOOTER ══ -->
  <div style="margin-top:20px;padding-top:12px;border-top:1px solid ${COLORS.border};display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:10px;color:${COLORS.textSub}">Sistema de Gestión Pastoral • Reporte Confidencial</span>
    <span style="font-size:10px;color:${COLORS.textSub}">${new Date().toLocaleString('es-CO')}</span>
  </div>

</body>
</html>`;

  // ────────────────────────────────────────────
  // Abrir ventana e imprimir
  // ────────────────────────────────────────────
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }

  win.document.write(html);
  win.document.close();

  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 400);
  };
};