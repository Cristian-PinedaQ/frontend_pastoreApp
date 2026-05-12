// services/attendancePdfGenerator.js

export const generateAttendancePDF = (enrollment, lesson, students, attendanceData = []) => {
  const COLORS = {
    primary: '#0f172a',
    primaryBlue: '#1e40af',
    accentBlue: '#3b82f6',
    primaryLight: '#dbeafe',
    gold: '#d97706',
    goldLight: '#fef3c7',
    success: '#10b981',
    successLight: '#d1fae5',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    border: '#cbd5e1',
    textMain: '#334155',
    textSub: '#64748b',
    light: '#f8fafc',
    white: '#ffffff',
    headerRow: '#f1f5f9',
  };

  // 1. Cálculos de Resumen
  const totalStudents = students.length;
  const attendedCount = attendanceData.length;
  const missingCount = totalStudents - attendedCount;
  const attendancePercentage = totalStudents > 0 ? (attendedCount / totalStudents) * 100 : 0;

  // 2. AGRUPAMIENTO JERÁRQUICO G12 (Pastor → Líder de Red → Líder Directo)
  const hierarchy = {};

  students.forEach(student => {
    const p   = student.pastor        || 'Ministerio General';
    const net = student.networkLeader || 'Sin Líder de Red';
    const dir = student.directLeader  || 'Sin Líder Directo';

    if (!hierarchy[p])           hierarchy[p]           = {};
    if (!hierarchy[p][net])      hierarchy[p][net]       = {};
    if (!hierarchy[p][net][dir]) hierarchy[p][net][dir]  = [];

    hierarchy[p][net][dir].push(student);
  });

  const pastorsSorted = Object.keys(hierarchy).sort();

  // 3. GENERACIÓN DE FILAS (Con encabezados de jerarquía)
  const renderTableRows = () => {
    let htmlRows = '';

    pastorsSorted.forEach(pastor => {
      htmlRows += `
        <tr>
          <td colspan="3" style="background:${COLORS.primary}; color:${COLORS.white}; padding:8px 12px; font-weight:900; font-size:10.5px; border-bottom:1px solid ${COLORS.border}; letter-spacing:1px; text-transform:uppercase;">
            👑 RAMA PASTORAL: ${pastor}
          </td>
        </tr>
      `;

      const nets = Object.keys(hierarchy[pastor]).sort();
      nets.forEach(net => {
        const netStudents = Object.values(hierarchy[pastor][net]).flat();

        htmlRows += `
          <tr>
            <td colspan="3" style="background:${COLORS.primaryBlue}; color:${COLORS.white}; padding:6px 12px; font-weight:800; font-size:10px; border-bottom:1px solid #93c5fd; letter-spacing:.5px; text-transform:uppercase;">
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

          htmlRows += `
            <tr>
              <td colspan="3" style="background:${COLORS.goldLight}; color:${COLORS.gold}; padding:4px 12px; font-weight:700; font-size:9.5px; text-transform:uppercase; border-bottom:1px solid ${COLORS.gold};">
                ${dirLabel}
                <span style="float:right; color:${COLORS.textSub}; font-size:9px;">
                  (${dirStudents.length})
                </span>
              </td>
            </tr>
          `;

          dirStudents.forEach((student) => {
            const hasAttended = attendanceData.includes(student.memberId);
            htmlRows += `
              <tr style="background:${COLORS.white}">
                <td style="padding:5px 25px; border-bottom:1px solid ${COLORS.border}; font-weight:500; font-size:11px; color:${COLORS.textMain}; text-transform:uppercase;">
                  ${student.memberName}
                </td>
                <td style="padding:5px 10px; border-bottom:1px solid ${COLORS.border}; color:${COLORS.textSub}; font-size:10px;">
                  ${dir}
                </td>
                <td style="padding:5px 10px; border-bottom:1px solid ${COLORS.border}; text-align:center;">
                  <span style="color:${hasAttended ? COLORS.success : COLORS.danger}; font-weight:bold; font-size:12px">
                    ${hasAttended ? '✓ ASISTIÓ' : '✗ FALTÓ'}
                  </span>
                </td>
              </tr>
            `;
          });
        });
      });
    });
    return htmlRows;
  };

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Asistencia - ${lesson.lessonName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { padding: 24px; color: ${COLORS.textMain}; background-color: white; }
    .header { background: linear-gradient(135deg, ${COLORS.primaryBlue} 0%, ${COLORS.accentBlue} 100%); color: white; padding: 20px 24px; border-radius: 10px; margin-bottom: 16px; }
    .stats-container { display: flex; gap: 12px; margin-bottom: 18px; }
    .stat-card { flex: 1; padding: 12px; border: 1px solid ${COLORS.border}; border-radius: 8px; text-align: center; border-top: 4px solid ${COLORS.primaryBlue}; background: ${COLORS.light}; }
    .stat-value { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    .stat-label { font-size: 8.5px; text-transform: uppercase; color: ${COLORS.textSub}; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid ${COLORS.border}; }
    th { background: ${COLORS.headerRow}; padding: 10px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: ${COLORS.textSub}; border-bottom: 2px solid ${COLORS.border}; }
    .footer { margin-top: 30px; border-top: 1px solid ${COLORS.border}; padding-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: ${COLORS.textSub}; }
    @media print {
      body { padding: 10px; }
      .header { border-radius: 6px; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div style="font-size:9px; opacity:0.8; letter-spacing:2px; margin-bottom:3px;">REPORTE DE ASISTENCIA DETALLADO</div>
    <div style="font-size:20px; font-weight:800; margin-bottom:3px;">${lesson.lessonName}</div>
    <div style="font-size:13px; opacity:0.9;">${enrollment.levelDisplayName} • ${enrollment.cohortName}</div>
    <div style="font-size:11px; margin-top:8px;">📅 Fecha: ${new Date(lesson.lessonDate).toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
  </div>

  <div class="stats-container">
    <div class="stat-card">
      <div class="stat-value" style="color:${COLORS.primaryBlue};">${totalStudents}</div>
      <div class="stat-label">Total Estudiantes</div>
    </div>
    <div class="stat-card" style="border-top-color:${COLORS.success};">
      <div class="stat-value" style="color:${COLORS.success};">${attendedCount}</div>
      <div class="stat-label">Presentes</div>
    </div>
    <div class="stat-card" style="border-top-color:${COLORS.danger};">
      <div class="stat-value" style="color:${COLORS.danger};">${missingCount}</div>
      <div class="stat-label">Ausentes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:${attendancePercentage >= 80 ? COLORS.success : attendancePercentage >= 60 ? '#f59e0b' : COLORS.danger};">${attendancePercentage.toFixed(1)}%</div>
      <div class="stat-label">% Asistencia</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 45%">Estudiante</th>
        <th style="width: 35%">Líder</th>
        <th style="width: 20%; text-align:center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${renderTableRows()}
    </tbody>
  </table>

  <div class="footer">
    <div>PastoreApp • Módulo de Formación Educativa • Reporte generado automáticamente</div>
    <div>${new Date().toLocaleString('es-CO')}</div>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Por favor permite las ventanas emergentes para ver el reporte');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 800);
};