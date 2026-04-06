// services/attendancePdfGenerator.js

export const generateAttendancePDF = (enrollment, lesson, students, attendanceData = []) => {
  const COLORS = {
    primary: '#1e40af',
    primaryLight: '#dbeafe',
    success: '#10b981',
    danger: '#ef4444',
    border: '#e2e8f0',
    textMain: '#1e293b',
    textSub: '#64748b',
    light: '#f8fafc',
    white: '#ffffff',
  };

  // 1. Cálculos de Resumen
  const totalStudents = students.length;
  const attendedCount = attendanceData.length;
  const missingCount = totalStudents - attendedCount;
  const attendancePercentage = totalStudents > 0 ? (attendedCount / totalStudents) * 100 : 0;

  // 2. AGRUPAMIENTO POR LÍDER
  const groupedByLeader = students.reduce((acc, student) => {
    const leader = student.leaderName || 'Sin Líder Asignado';
    if (!acc[leader]) acc[leader] = [];
    acc[leader].push(student);
    return acc;
  }, {});

  // 3. GENERACIÓN DE FILAS (Con encabezados de grupo)
  const renderTableRows = () => {
    let htmlRows = '';
    
    // Ordenar líderes alfabéticamente
    const leaders = Object.keys(groupedByLeader).sort();

    leaders.forEach(leader => {
      // Fila de encabezado del Grupo de Líder
      htmlRows += `
        <tr>
          <td colspan="3" style="background:${COLORS.primaryLight}; color:${COLORS.primary}; padding:8px 12px; font-weight:800; font-size:12px; border-bottom:1px solid ${COLORS.border}">
            👤 LÍDER: ${leader.toUpperCase()} (${groupedByLeader[leader].length} estudiantes)
          </td>
        </tr>
      `;

      // Estudiantes de ese líder
      groupedByLeader[leader].forEach((student, index) => {
        const hasAttended = attendanceData.includes(student.memberId);
        htmlRows += `
          <tr style="background:${COLORS.white}">
            <td style="padding:8px 25px; border-bottom:1px solid ${COLORS.border}; font-weight:500; color:${COLORS.textMain}">
              ${student.memberName}
            </td>
            <td style="padding:8px 10px; border-bottom:1px solid ${COLORS.border}; color:${COLORS.textSub}; font-size:11px">
              ${leader}
            </td>
            <td style="padding:8px 10px; border-bottom:1px solid ${COLORS.border}; text-align:center">
              <span style="color:${hasAttended ? COLORS.success : COLORS.danger}; font-weight:bold; font-size:14px">
                ${hasAttended ? '✓ ASISTIÓ' : '✗ FALTÓ'}
              </span>
            </td>
          </tr>
        `;
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
    body { padding: 30px; color: ${COLORS.textMain}; background-color: white; }
    .header { background: linear-gradient(135deg, ${COLORS.primary} 0%, #3b82f6 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; }
    .stats-container { display: flex; gap: 15px; margin-bottom: 20px; }
    .stat-card { flex: 1; padding: 15px; border: 1px solid ${COLORS.border}; border-radius: 10px; text-align: center; border-top: 4px solid ${COLORS.primary}; }
    .stat-value { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .stat-label { font-size: 10px; text-transform: uppercase; color: ${COLORS.textSub}; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid ${COLORS.border}; }
    th { background: #f1f5f9; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: ${COLORS.textSub}; border-bottom: 2px solid ${COLORS.border}; }
  </style>
</head>
<body>

  <div class="header">
    <div style="font-size:10px; opacity:0.8; letter-spacing:2px; margin-bottom:5px">REPORTE DE ASISTENCIA POR LIDERAZGO</div>
    <div style="font-size:24px; font-weight:800; margin-bottom:5px">${lesson.lessonName}</div>
    <div style="font-size:14px; opacity:0.9">${enrollment.levelDisplayName} • ${enrollment.cohortName}</div>
    <div style="font-size:11px; margin-top:10px">📅 Fecha: ${new Date(lesson.lessonDate).toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
  </div>

  <div class="stats-container">
    <div class="stat-card">
      <div class="stat-value" style="color:${COLORS.primary}">${totalStudents}</div>
      <div class="stat-label">Total Estudiantes</div>
    </div>
    <div class="stat-card" style="border-top-color:${COLORS.success}">
      <div class="stat-value" style="color:${COLORS.success}">${attendedCount}</div>
      <div class="stat-label">Presentes</div>
    </div>
    <div class="stat-card" style="border-top-color:${COLORS.danger}">
      <div class="stat-value" style="color:${COLORS.danger}">${missingCount}</div>
      <div class="stat-label">Ausentes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${attendancePercentage.toFixed(1)}%</div>
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

  <div style="margin-top:40px; border-top:1px solid ${COLORS.border}; padding-top:15px; display:flex; justify-content:space-between; font-size:10px; color:${COLORS.textSub}">
    <div>Generado por PastoreApp • Módulo de Formación Educativa</div>
    <div style="text-align:right">Fecha de reporte: ${new Date().toLocaleString('es-CO')}</div>
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
  win.onload = () => setTimeout(() => win.print(), 500);
};