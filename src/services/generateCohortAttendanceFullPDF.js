// services/generateCohortAttendanceFullPDF.js
// PDF de asistencia consolidada — agrupado por jerarquía G12
// Estructura: Pastor → Líder de Red (G12) → Líder Directo → Estudiantes

export const generateCohortAttendanceFullPDF = (enrollment, lessons, students, attendanceMatrix) => {
  const COLORS = {
    primary:      '#0f172a',
    primaryBlue:  '#1e40af',
    accentBlue:   '#3b82f6',
    primaryLight: '#dbeafe',
    gold:         '#d97706',
    goldLight:    '#fef3c7',
    success:      '#10b981',
    successLight: '#d1fae5',
    danger:       '#ef4444',
    dangerLight:  '#fee2e2',
    border:       '#cbd5e1',
    textMain:     '#334155',
    textSub:      '#64748b',
    light:        '#f8fafc',
    white:        '#ffffff',
    headerRow:    '#f1f5f9',
  };

  // ── 1. Métricas globales ────────────────────────────────────────────────────
  const totalStudents = students.length;
  const totalLessons  = lessons.length;
  const totalExpected = totalStudents * totalLessons;

  let totalAttended = 0;
  students.forEach(s => {
    lessons.forEach(l => {
      if (attendanceMatrix.get(l.id)?.has(Number(s.memberId))) totalAttended++;
    });
  });

  const globalPercentage = totalExpected > 0
    ? ((totalAttended / totalExpected) * 100).toFixed(1)
    : '0.0';

  // ── 2. Asistencia por lección ───────────────────────────────────────────────
  const lessonAttendanceCounts = lessons.map(l => ({
    ...l,
    count: attendanceMatrix.get(l.id)?.size ?? 0,
    pct:   totalStudents > 0
      ? (((attendanceMatrix.get(l.id)?.size ?? 0) / totalStudents) * 100).toFixed(0)
      : '0',
  }));

  // ── 3. Estadísticas por estudiante ─────────────────────────────────────────
  const studentStats = students.map(s => {
    const attended = lessons.filter(l =>
      attendanceMatrix.get(l.id)?.has(Number(s.memberId))
    ).length;
    const pct = totalLessons > 0 ? ((attended / totalLessons) * 100).toFixed(0) : '0';
    return { ...s, attended, pct };
  });

  // ── 4. Agrupación jerárquica G12 ───────────────────────────────────────────
  // Pastor → Líder de Red → Líder Directo → [estudiantes]
  const hierarchy = {};

  studentStats.forEach(s => {
    const p   = s.pastor        || 'Ministerio General';
    const net = s.networkLeader || 'Sin Líder de Red';
    const dir = s.directLeader  || 'Sin Líder Directo';

    if (!hierarchy[p])           hierarchy[p]           = {};
    if (!hierarchy[p][net])      hierarchy[p][net]       = {};
    if (!hierarchy[p][net][dir]) hierarchy[p][net][dir]  = [];

    hierarchy[p][net][dir].push(s);
  });

  const pastorsSorted = Object.keys(hierarchy).sort();

  // ── 5. Helpers de renderizado ──────────────────────────────────────────────
  const pctColor = (pct) => {
    const n = Number(pct);
    if (n >= 80) return COLORS.success;
    if (n >= 60) return '#f59e0b';
    return COLORS.danger;
  };

  const colWidth = Math.max(26, Math.min(46, Math.floor(400 / (totalLessons || 1))));

  const cellStyle = (base = '') =>
    `padding:5px 3px; border:1px solid ${COLORS.border}; text-align:center; font-size:9.5px; ${base}`;

  const headerCellStyle = (base = '') =>
    `padding:6px 3px; border:1px solid ${COLORS.border}; text-align:center;
     font-size:8.5px; font-weight:700; text-transform:uppercase;
     color:${COLORS.textSub}; background:${COLORS.headerRow}; ${base}`;

  // ── 6. Cabecera de lecciones ───────────────────────────────────────────────
  const lessonHeaders = lessons.map(l => `
    <th style="${headerCellStyle(`width:${colWidth}px`)}">L${l.lessonNumber}</th>
  `).join('');

  // ── 7. Fila de totales por lección ─────────────────────────────────────────
  const lessonTotalRow = lessonAttendanceCounts.map(l => `
    <td style="${cellStyle(`background:${COLORS.primaryLight}; font-weight:700; color:${COLORS.primaryBlue}`)}">
      ${l.count}<br/>
      <span style="font-size:8px; color:${pctColor(l.pct)}">${l.pct}%</span>
    </td>
  `).join('');

  // ── 8. Filas de estudiantes agrupadas por jerarquía G12 ────────────────────
  const renderStudentRows = () => {
    let html = '';

    pastorsSorted.forEach(pastor => {
      // Nivel 1: RAMA PASTORAL (fondo oscuro)
      html += `
        <tr>
          <td colspan="${totalLessons + 3}"
              style="background:${COLORS.primary}; color:${COLORS.white};
                     padding:9px 12px; font-weight:900; font-size:10.5px;
                     letter-spacing:1px; text-transform:uppercase;
                     border:1px solid ${COLORS.border};">
            👑 RAMA PASTORAL: ${pastor}
          </td>
        </tr>
      `;

      const nets = Object.keys(hierarchy[pastor]).sort();
      nets.forEach(net => {
        const netStudents = Object.values(hierarchy[pastor][net]).flat();

        // Nivel 2: LÍDER DE RED / G12 (azul)
        html += `
          <tr>
            <td colspan="${totalLessons + 3}"
                style="background:${COLORS.primaryBlue}; color:${COLORS.white};
                       padding:7px 12px; font-weight:800; font-size:10px;
                       letter-spacing:.5px; text-transform:uppercase;
                       border:1px solid #93c5fd;">
              💎 LÍDER DE RED (G12): ${net}
              <span style="float:right; font-size:9px; font-weight:600; opacity:.85;">
                ${netStudents.length} estudiante${netStudents.length !== 1 ? 's' : ''}
              </span>
            </td>
          </tr>
        `;

        const dirs = Object.keys(hierarchy[pastor][net]).sort();
        dirs.forEach(dir => {
          const dirStudents = hierarchy[pastor][net][dir];
          const isSameAsNet = (net === dir || dir === 'Sin Líder Directo' || dir === 'Red Pastoral Directa');
          const dirLabel = isSameAsNet
            ? '👤 DISCÍPULOS DIRECTOS DE LA RED'
            : `👤 LÍDER DIRECTO: ${dir}`;

          // Nivel 3: LÍDER DIRECTO (dorado)
          html += `
            <tr>
              <td colspan="${totalLessons + 3}"
                  style="background:${COLORS.goldLight}; color:${COLORS.gold};
                         padding:5px 12px; font-weight:700; font-size:9.5px;
                         text-transform:uppercase; border:1px solid ${COLORS.gold};">
                ${dirLabel}
                <span style="float:right; color:${COLORS.textSub}; font-size:9px;">
                  (${dirStudents.length})
                </span>
              </td>
            </tr>
          `;

          // Estudiantes de este subgrupo
          dirStudents.forEach((s, idx) => {
            const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.light;

            const lessonCells = lessons.map(l => {
              const attended = attendanceMatrix.get(l.id)?.has(Number(s.memberId));
              return `
                <td style="${cellStyle(`background:${attended ? COLORS.successLight : COLORS.dangerLight}`)}">
                  <span style="color:${attended ? COLORS.success : COLORS.danger};
                      font-size:12px; font-weight:900; line-height:1;">
                    ${attended ? '✓' : '✗'}
                  </span>
                </td>
              `;
            }).join('');

            html += `
              <tr style="background:${rowBg};">
                <td style="${cellStyle(`text-align:left; padding-left:10px; font-weight:700;
                    color:${COLORS.textMain}; min-width:130px; max-width:170px; white-space:nowrap;
                    overflow:hidden; text-overflow:ellipsis; font-size:9.5px;`)}">
                  ${s.memberName || `Miembro ${s.memberId}`}
                </td>
                ${lessonCells}
                <td style="${cellStyle(`font-weight:700; font-size:9.5px;`)}">
                  ${s.attended}/${totalLessons}
                </td>
                <td style="${cellStyle(`font-weight:800; color:${pctColor(s.pct)};`)}">
                  ${s.pct}%
                </td>
              </tr>
            `;
          });
        });
      });
    });

    return html;
  };

  // ── 9. Leyenda de lecciones ────────────────────────────────────────────────
  const lessonLegend = lessonAttendanceCounts.map(l => `
    <div style="display:flex; align-items:flex-start; gap:6px; margin-bottom:4px;">
      <span style="background:${COLORS.primaryBlue}; color:white; border-radius:3px;
          padding:1px 5px; font-size:9px; font-weight:700; white-space:nowrap;">
        L${l.lessonNumber}
      </span>
      <span style="font-size:9.5px; color:${COLORS.textSub};">
        ${l.lessonName}
        <span style="color:${COLORS.textSub}; font-size:8.5px;">
          · ${new Date(l.lessonDate).toLocaleDateString('es-CO', { day:'numeric', month:'short' })}
          · ${l.count} presentes
        </span>
      </span>
    </div>
  `).join('');

  // ── 10. HTML final ─────────────────────────────────────────────────────────
  const now = new Date().toLocaleString('es-CO');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Asistencia Consolidada · ${enrollment.cohortName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box;
        font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { padding:24px; color:${COLORS.textMain}; background:#fff; font-size:11px; }
    @page { size: A4 landscape; margin: 10mm 12mm; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:0; }
    }
    table { width:100%; border-collapse:collapse; margin-bottom:18px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.accentBlue} 100%);
      color:white; padding:20px 24px; border-radius:10px; margin-bottom:16px;">
    <div style="font-size:9px; opacity:.8; letter-spacing:2px; text-transform:uppercase; margin-bottom:3px;">
      REPORTE DE ASISTENCIA CONSOLIDADA · TODAS LAS LECCIONES
    </div>
    <div style="font-size:20px; font-weight:800; margin-bottom:3px;">${enrollment.cohortName}</div>
    <div style="font-size:12px; opacity:.9;">${enrollment.levelDisplayName || enrollment.levelCode || ''}</div>
    <div style="font-size:10px; margin-top:8px; opacity:.8;">
      📅 ${new Date(enrollment.startDate).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}
      &nbsp;→&nbsp;
      ${new Date(enrollment.endDate).toLocaleDateString('es-CO', { day:'numeric', month:'long', year:'numeric' })}
      &nbsp;&nbsp;|&nbsp;&nbsp;
      ${totalLessons} lección${totalLessons !== 1 ? 'es' : ''}
      &nbsp;&nbsp;|&nbsp;&nbsp;
      ${totalStudents} estudiante${totalStudents !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- STATS -->
  <div style="display:flex; gap:10px; margin-bottom:16px;">
    <div style="flex:1; padding:10px; border:1px solid ${COLORS.border};
        border-radius:8px; text-align:center; border-top:4px solid ${COLORS.primaryBlue};
        background:${COLORS.light};">
      <div style="font-size:18px; font-weight:800; color:${COLORS.primaryBlue};">${totalStudents}</div>
      <div style="font-size:8.5px; text-transform:uppercase; color:${COLORS.textSub}; letter-spacing:1px;">Estudiantes</div>
    </div>
    <div style="flex:1; padding:10px; border:1px solid ${COLORS.border};
        border-radius:8px; text-align:center; border-top:4px solid ${COLORS.primaryBlue};
        background:${COLORS.light};">
      <div style="font-size:18px; font-weight:800; color:${COLORS.primaryBlue};">${totalLessons}</div>
      <div style="font-size:8.5px; text-transform:uppercase; color:${COLORS.textSub}; letter-spacing:1px;">Lecciones</div>
    </div>
    <div style="flex:1; padding:10px; border:1px solid ${COLORS.border};
        border-radius:8px; text-align:center; border-top:4px solid ${COLORS.success};
        background:${COLORS.light};">
      <div style="font-size:18px; font-weight:800; color:${COLORS.success};">${totalAttended}</div>
      <div style="font-size:8.5px; text-transform:uppercase; color:${COLORS.textSub}; letter-spacing:1px;">Asistencias totales</div>
    </div>
    <div style="flex:1; padding:10px; border:1px solid ${COLORS.border};
        border-radius:8px; text-align:center; border-top:4px solid ${pctColor(globalPercentage)};
        background:${COLORS.light};">
      <div style="font-size:18px; font-weight:800; color:${pctColor(globalPercentage)};">${globalPercentage}%</div>
      <div style="font-size:8.5px; text-transform:uppercase; color:${COLORS.textSub}; letter-spacing:1px;">% Global</div>
    </div>
  </div>

  <!-- TABLA PRINCIPAL -->
  <table>
    <thead>
      <tr>
        <th style="${headerCellStyle('text-align:left; padding-left:10px; min-width:130px;')}">
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
            color:${COLORS.primaryBlue}; text-align:left; padding-left:10px; font-size:9.5px;`)}">
          TOTAL POR LECCIÓN
        </td>
        ${lessonTotalRow}
        <td style="${cellStyle(`background:${COLORS.primaryLight}; font-weight:800; color:${COLORS.primaryBlue}`)}">
          ${totalAttended}
        </td>
        <td style="${cellStyle(`background:${COLORS.primaryLight}; font-weight:800; color:${pctColor(globalPercentage)}`)}">
          ${globalPercentage}%
        </td>
      </tr>
      ${renderStudentRows()}
    </tbody>
  </table>

  <!-- LEYENDA DE LECCIONES + JERARQUÍA -->
  <div style="display:flex; gap:14px; margin-bottom:16px;">

    <div style="flex:1; padding:12px; background:${COLORS.light};
        border:1px solid ${COLORS.border}; border-radius:8px;">
      <div style="font-weight:800; font-size:10px; margin-bottom:8px;
          color:${COLORS.primaryBlue}; text-transform:uppercase; letter-spacing:1px;">
        📚 Detalle de Lecciones
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px 16px;">
        ${lessonLegend}
      </div>
    </div>

    <div style="flex:1; padding:12px; background:${COLORS.light};
        border:1px solid ${COLORS.border}; border-radius:8px;">
      <div style="font-weight:800; font-size:10px; margin-bottom:8px;
          color:${COLORS.primaryBlue}; text-transform:uppercase; letter-spacing:1px;">
        Jerarquía Ministerial G12
      </div>
      <div style="font-size:9.5px; color:${COLORS.textSub}; line-height:1.9;">
        <div>👑 <strong style="color:${COLORS.primary}">Rama Pastoral</strong> — Pastor/a responsable</div>
        <div>💎 <strong style="color:${COLORS.primaryBlue}">Líder de Red (G12)</strong> — Líder de 12</div>
        <div>👤 <strong style="color:${COLORS.gold}">Líder Directo</strong> — Discipulador inmediato</div>
        <div style="margin-top:8px;">
          <span style="background:${COLORS.successLight}; color:${COLORS.success};
              padding:1px 6px; border-radius:3px; font-weight:700; font-size:9px;">✓ Presente</span>
          &nbsp;
          <span style="background:${COLORS.dangerLight}; color:${COLORS.danger};
              padding:1px 6px; border-radius:3px; font-weight:700; font-size:9px;">✗ Ausente</span>
        </div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid ${COLORS.border}; padding-top:10px;
      display:flex; justify-content:space-between; font-size:9px; color:#94a3b8;">
    <div>PastoreApp · Módulo de Formación Educativa · Reporte generado automáticamente</div>
    <div>${now}</div>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor permite las ventanas emergentes para ver el reporte.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 600);
};