// services/generateCohortAttendanceFullPDF.js
// Genera un PDF con la asistencia consolidada de TODAS las lecciones de una cohorte

export const generateCohortAttendanceFullPDF = (enrollment, lessons, students, attendanceMatrix) => {
  /**
   * attendanceMatrix: Map<lessonId, Set<memberId>>
   *   → Para cada lección, el conjunto de memberIds que marcaron present: true
   *
   * students: array de estudiantes activos (status !== 'CANCELLED'), enriquecidos con leaderName
   * lessons:  array de lecciones ordenadas por lessonNumber (solo las que tienen al menos 1 registro)
   */

  const COLORS = {
    primary:      '#1e40af',
    primaryLight: '#dbeafe',
    success:      '#10b981',
    successLight: '#d1fae5',
    danger:       '#ef4444',
    dangerLight:  '#fee2e2',
    border:       '#e2e8f0',
    textMain:     '#1e293b',
    textSub:      '#64748b',
    light:        '#f8fafc',
    white:        '#ffffff',
    headerRow:    '#f1f5f9',
  };

  // ── 1. Métricas globales ──────────────────────────────────────────────────
  const totalStudents  = students.length;
  const totalLessons   = lessons.length;

  // Asistencias totales esperadas
  const totalExpected  = totalStudents * totalLessons;

  // Contar cuántas asistencias reales hay en toda la cohorte
  let totalAttended = 0;
  students.forEach(s => {
    lessons.forEach(l => {
      if (attendanceMatrix.get(l.id)?.has(Number(s.memberId))) totalAttended++;
    });
  });

  const globalPercentage = totalExpected > 0
    ? ((totalAttended / totalExpected) * 100).toFixed(1)
    : '0.0';

  // ── 2. Asistencia por lección (para fila de resumen) ─────────────────────
  const lessonAttendanceCounts = lessons.map(l => ({
    ...l,
    count: attendanceMatrix.get(l.id)?.size ?? 0,
    pct: totalStudents > 0
      ? (((attendanceMatrix.get(l.id)?.size ?? 0) / totalStudents) * 100).toFixed(0)
      : '0',
  }));

  // ── 3. Asistencia por estudiante (para columna de resumen) ────────────────
  const studentStats = students.map(s => {
    const attended = lessons.filter(l =>
      attendanceMatrix.get(l.id)?.has(Number(s.memberId))
    ).length;
    const pct = totalLessons > 0 ? ((attended / totalLessons) * 100).toFixed(0) : '0';
    return { ...s, attended, pct };
  });

  // ── 4. Agrupamiento por líder ─────────────────────────────────────────────
  const groupedByLeader = studentStats.reduce((acc, s) => {
    const leader = s.leaderName || 'Sin Líder Asignado';
    if (!acc[leader]) acc[leader] = [];
    acc[leader].push(s);
    return acc;
  }, {});
  const leadersSorted = Object.keys(groupedByLeader).sort();

  // ── 5. Helpers de renderizado ─────────────────────────────────────────────
  const cellStyle = (base = '') =>
    `padding:5px 4px; border:1px solid ${COLORS.border}; text-align:center; font-size:10px; ${base}`;

  const headerCellStyle = (base = '') =>
    `padding:6px 4px; border:1px solid ${COLORS.border}; text-align:center;
     font-size:9px; font-weight:700; text-transform:uppercase;
     color:${COLORS.textSub}; background:${COLORS.headerRow}; ${base}`;

  const pctColor = (pct) => {
    const n = Number(pct);
    if (n >= 80) return COLORS.success;
    if (n >= 60) return '#f59e0b';
    return COLORS.danger;
  };

  // Columnas de lecciones: máximo 12 por página (si hay más, se encogen)
  const colWidth = Math.max(28, Math.min(50, Math.floor(420 / totalLessons)));

  // ── 6. Cabecera de lecciones ──────────────────────────────────────────────
  const lessonHeaders = lessons.map(l => `
    <th style="${headerCellStyle(`width:${colWidth}px`)}">
      L${l.lessonNumber}
    </th>
  `).join('');

  // ── 7. Fila de totales por lección ────────────────────────────────────────
  const lessonTotalRow = lessonAttendanceCounts.map(l => `
    <td style="${cellStyle(`background:${COLORS.primaryLight}; font-weight:700; color:${COLORS.primary}`)}">
      ${l.count}<br/>
      <span style="font-size:9px; color:${pctColor(l.pct)}">${l.pct}%</span>
    </td>
  `).join('');

  // ── 8. Filas de estudiantes agrupadas por líder ───────────────────────────
  const renderStudentRows = () => {
    let html = '';

    leadersSorted.forEach(leader => {
      const groupStudents = groupedByLeader[leader];

      // Fila de encabezado del grupo
      html += `
        <tr>
          <td colspan="${totalLessons + 3}"
              style="background:${COLORS.primaryLight}; color:${COLORS.primary};
                     padding:7px 10px; font-weight:800; font-size:11px;
                     border:1px solid ${COLORS.border}">
            👤 LÍDER: ${leader.toUpperCase()} &nbsp;·&nbsp; ${groupStudents.length} estudiante${groupStudents.length !== 1 ? 's' : ''}
          </td>
        </tr>
      `;

      groupStudents.forEach((s, idx) => {
        const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.light;

        // Celdas de asistencia por lección
        const lessonCells = lessons.map(l => {
          const attended = attendanceMatrix.get(l.id)?.has(Number(s.memberId));
          return `
            <td style="${cellStyle(`background:${attended ? COLORS.successLight : COLORS.dangerLight}`)}">
              <span style="color:${attended ? COLORS.success : COLORS.danger}; font-size:13px; font-weight:900">
                ${attended ? '✓' : '✗'}
              </span>
            </td>
          `;
        }).join('');

        // Celda de resumen del estudiante
        //const pctNum = Number(s.pct);
        html += `
          <tr style="background:${rowBg}">
            <td style="${cellStyle(`text-align:left; padding-left:10px; font-weight:600;
                         color:${COLORS.textMain}; min-width:140px; max-width:180px`)}">
              ${s.memberName || `Miembro ${s.memberId}`}
            </td>
            ${lessonCells}
            <td style="${cellStyle(`font-weight:700`)}">
              ${s.attended}/${totalLessons}
            </td>
            <td style="${cellStyle(`font-weight:800; color:${pctColor(s.pct)}`)}">
              ${s.pct}%
            </td>
          </tr>
        `;
      });
    });

    return html;
  };

  // ── 9. Leyenda de lecciones ───────────────────────────────────────────────
  const lessonLegend = lessons.map(l => `
    <div style="display:flex; align-items:flex-start; gap:6px; margin-bottom:4px">
      <span style="background:${COLORS.primary}; color:white; border-radius:3px;
                   padding:1px 6px; font-size:10px; font-weight:700; white-space:nowrap">
        L${l.lessonNumber}
      </span>
      <span style="font-size:10px; color:${COLORS.textSub}">
        ${l.lessonName}
        <span style="color:${COLORS.textSub}; font-size:9px">
          · ${new Date(l.lessonDate).toLocaleDateString('es-CO', { day:'numeric', month:'short' })}
          · ${l.count} presentes
        </span>
      </span>
    </div>
  `).join('');

  // ── 10. HTML final ────────────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Asistencia Consolidada · ${enrollment.cohortName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { padding:24px; color:${COLORS.textMain}; background:#fff; font-size:12px; }

    .page-header {
      background: linear-gradient(135deg, ${COLORS.primary} 0%, #3b82f6 100%);
      color: white; padding: 22px 25px; border-radius: 12px; margin-bottom: 18px;
    }
    .badge { font-size:9px; opacity:.8; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px; }
    .title  { font-size:22px; font-weight:800; margin-bottom:4px; }
    .sub    { font-size:13px; opacity:.9; }
    .meta   { font-size:10px; margin-top:10px; opacity:.8; }

    .stats { display:flex; gap:12px; margin-bottom:18px; }
    .stat  {
      flex:1; padding:12px; border:1px solid ${COLORS.border};
      border-radius:8px; text-align:center; border-top:4px solid ${COLORS.primary};
      background:${COLORS.light};
    }
    .stat-val   { font-size:20px; font-weight:800; margin-bottom:2px; }
    .stat-lbl   { font-size:9px; text-transform:uppercase; color:${COLORS.textSub}; letter-spacing:1px; }

    table { width:100%; border-collapse:collapse; font-size:11px; }

    .legend { margin-top:20px; padding:14px; background:${COLORS.light};
              border:1px solid ${COLORS.border}; border-radius:8px; }
    .legend-title { font-weight:700; font-size:11px; margin-bottom:8px; color:${COLORS.primary}; }

    .footer { margin-top:28px; border-top:1px solid ${COLORS.border}; padding-top:12px;
              display:flex; justify-content:space-between; font-size:9px; color:${COLORS.textSub}; }

    @media print {
      body { padding: 10px; }
      .page-header { border-radius:6px; }
    }
  </style>
</head>
<body>

  <!-- Encabezado -->
  <div class="page-header">
    <div class="badge">REPORTE DE ASISTENCIA CONSOLIDADA · TODAS LAS LECCIONES</div>
    <div class="title">${enrollment.cohortName}</div>
    <div class="sub">${enrollment.levelDisplayName || enrollment.levelCode || ''}</div>
    <div class="meta">
      📅 ${new Date(enrollment.startDate).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}
      &nbsp;→&nbsp;
      ${new Date(enrollment.endDate).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}
      &nbsp;&nbsp;|&nbsp;&nbsp;
      ${totalLessons} lección${totalLessons !== 1 ? 'es' : ''} con registros
      &nbsp;&nbsp;|&nbsp;&nbsp;
      ${totalStudents} estudiante${totalStudents !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- Métricas -->
  <div class="stats">
    <div class="stat">
      <div class="stat-val" style="color:${COLORS.primary}">${totalStudents}</div>
      <div class="stat-lbl">Estudiantes</div>
    </div>
    <div class="stat">
      <div class="stat-val" style="color:${COLORS.primary}">${totalLessons}</div>
      <div class="stat-lbl">Lecciones</div>
    </div>
    <div class="stat" style="border-top-color:${COLORS.success}">
      <div class="stat-val" style="color:${COLORS.success}">${totalAttended}</div>
      <div class="stat-lbl">Asistencias totales</div>
    </div>
    <div class="stat" style="border-top-color:${pctColor(globalPercentage)}">
      <div class="stat-val" style="color:${pctColor(globalPercentage)}">${globalPercentage}%</div>
      <div class="stat-lbl">% Asistencia global</div>
    </div>
  </div>

  <!-- Matriz de asistencia -->
  <table>
    <thead>
      <tr>
        <th style="${headerCellStyle('text-align:left; padding-left:10px; min-width:140px')}">
          Estudiante
        </th>
        ${lessonHeaders}
        <th style="${headerCellStyle()}">Asist.</th>
        <th style="${headerCellStyle()}">%</th>
      </tr>
    </thead>
    <tbody>
      <!-- Fila de totales por lección -->
      <tr>
        <td style="${cellStyle(`background:${COLORS.primaryLight}; font-weight:700;
                     color:${COLORS.primary}; text-align:left; padding-left:10px`)}">
          TOTAL POR LECCIÓN
        </td>
        ${lessonTotalRow}
        <td style="${cellStyle(`background:${COLORS.primaryLight}; font-weight:800; color:${COLORS.primary}`)}">
          ${totalAttended}
        </td>
        <td style="${cellStyle(`background:${COLORS.primaryLight}; font-weight:800; color:${pctColor(globalPercentage)}`)}">
          ${globalPercentage}%
        </td>
      </tr>
      <!-- Filas de estudiantes agrupadas por líder -->
      ${renderStudentRows()}
    </tbody>
  </table>

  <!-- Leyenda de lecciones -->
  <div class="legend">
    <div class="legend-title">📚 Detalle de Lecciones</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px 20px">
      ${lessonLegend}
    </div>
  </div>

  <!-- Pie de página -->
  <div class="footer">
    <div>PastoreApp · Módulo de Formación Educativa · Reporte generado automáticamente</div>
    <div>${new Date().toLocaleString('es-CO')}</div>
  </div>

</body>
</html>`;

  // ── 11. Abrir e imprimir ──────────────────────────────────────────────────
  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor permite las ventanas emergentes para ver el reporte.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 600);
};