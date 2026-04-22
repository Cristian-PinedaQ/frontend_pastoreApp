// services/generateApprovedStudentsPDF.js

export const generateApprovedStudentsPDF = (enrollment, approvedStudents, options = {}) => {
  // 🚀 Extraemos el helper (si no lo envían, usamos una función que devuelve el texto original)
  const getDisplayName = options.getDisplayName || ((name) => name);

  const COLORS = {
    primary: '#0f172a',     
    primaryBlue: '#1e40af', 
    gold: '#d97706',        
    goldLight: '#fef3c7',   
    border: '#cbd5e1',
    textMain: '#334155',
    textSub: '#64748b',
    white: '#ffffff',
    bgLight: '#f8fafc'
  };

  // ── 1. Agrupación en 3 Niveles (Pastor -> Red -> Directo) ─────────
  const hierarchy = {};
  
  approvedStudents.forEach(student => {
    const p = student.pastor || 'Ministerio General';
    const net = student.networkLeader || 'Sin Líder de Red';
    const dir = student.directLeader || 'Sin Líder Directo';

    if (!hierarchy[p]) hierarchy[p] = {};
    if (!hierarchy[p][net]) hierarchy[p][net] = {};
    if (!hierarchy[p][net][dir]) hierarchy[p][net][dir] = [];
    
    hierarchy[p][net][dir].push(student);
  });

  const pastorsSorted = Object.keys(hierarchy).sort();

  // ── 2. Renderizado de las filas ─────────────────────────────
  let tableRowsHtml = '';
  let globalCounter = 1;

  pastorsSorted.forEach(pastor => {
    // 🚀 Aplicamos el helper al Nivel 1 (Aquí cambiará el nombre por "PASTOR" o "PASTORA")
    tableRowsHtml += `
      <tr>
        <td colspan="4" style="background:${COLORS.primary}; color:${COLORS.white}; padding:12px 15px; font-weight:900; font-size:12px; letter-spacing:1px; text-transform:uppercase;">
          👑 RAMA PASTORAL: ${getDisplayName(pastor)}
        </td>
      </tr>
    `;

    const nets = Object.keys(hierarchy[pastor]).sort();
    nets.forEach(net => {
      // 🚀 Aplicamos el helper al Nivel 2
      tableRowsHtml += `
        <tr>
          <td colspan="4" style="background:${COLORS.primaryBlue}; color:${COLORS.white}; padding:9px 15px; font-weight:800; font-size:11px; border-bottom:1px solid #93c5fd; text-transform:uppercase;">
            💎 LÍDER DE RED (G12): ${getDisplayName(net)}
          </td>
        </tr>
      `;

      const dirs = Object.keys(hierarchy[pastor][net]).sort();
      dirs.forEach(dir => {
        const students = hierarchy[pastor][net][dir];
        
        const isSameAsNet = (net === dir || dir === 'Sin Líder Directo' || dir === 'Red Pastoral Directa');
        
        // 🚀 Aplicamos el helper al Nivel 3
        const dirLabel = isSameAsNet 
              ? "👤 DISCÍPULOS DIRECTOS DE LA RED" 
              : `👤 LÍDER DIRECTO: ${getDisplayName(dir)}`;

        tableRowsHtml += `
          <tr>
            <td colspan="4" style="background:${COLORS.goldLight}; color:${COLORS.gold}; padding:6px 15px; font-weight:700; font-size:10px; border-bottom:1px solid ${COLORS.gold}; text-transform:uppercase;">
              ${dirLabel} <span style="float:right; color:${COLORS.textSub}; font-size:9px;">(${students.length} Aprobados)</span>
            </td>
          </tr>
        `;

        // Estudiantes de este líder directo
        students.forEach((s, idx) => {
          const bg = idx % 2 === 0 ? COLORS.white : COLORS.bgLight;
          const pct = s.finalAttendancePercentage !== undefined ? Number(s.finalAttendancePercentage).toFixed(0) : '100';
          const score = (s.averageScore !== undefined && s.averageScore !== null) ? Number(s.averageScore).toFixed(2) : '—';

          // 🚀 Aplicamos el helper al nombre del estudiante por si acaso
          tableRowsHtml += `
            <tr style="background:${bg}; border-bottom: 1px solid ${COLORS.border};">
              <td style="padding:6px 15px; text-align:center; width:5%; color:${COLORS.textSub}; font-weight:600; font-size:10px;">${globalCounter++}</td>
              <td style="padding:6px 15px; text-align:left; font-weight:800; color:${COLORS.textMain}; text-transform:uppercase; font-size:10px;">${getDisplayName(s.memberName)}</td>
              <td style="padding:6px 15px; text-align:center; font-weight:700; color:${COLORS.primaryBlue}; font-size:10px;">${pct}%</td>
              <td style="padding:6px 15px; text-align:center; font-weight:700; color:${COLORS.textSub}; font-size:10px;">${score}</td>
            </tr>
          `;
        });
      });
    });
  });

  // 🚀 Aplicamos el helper a la firma del Maestro Titular
  const teacherRawName = enrollment.teacher?.name || enrollment.teacher?.memberName || '_________________________';
  const teacherDisplayName = getDisplayName(teacherRawName);

  // ── 3. Estructura HTML del Documento ─────────────────────────────────────
  const html = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"/>
    <title>Acta de Aprobación · ${enrollment.cohortName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Inter:wght@400;600;800&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { padding:40px; color:${COLORS.textMain}; background:#fff; font-family:'Inter', sans-serif; }
      .header { text-align: center; border-bottom: 3px double ${COLORS.gold}; padding-bottom: 20px; margin-bottom: 30px; }
      .header-eyebrow { font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 3px; color: ${COLORS.textSub}; text-transform: uppercase; margin-bottom: 10px; }
      .header-title { font-family: 'Merriweather', serif; font-size: 28px; font-weight: 900; color: ${COLORS.primary}; margin-bottom: 8px; text-transform: uppercase; }
      .header-subtitle { font-size: 14px; font-weight: 600; color: ${COLORS.gold}; letter-spacing: 1px; text-transform: uppercase;}
      .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: ${COLORS.bgLight}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 15px; margin-bottom: 30px; }
      .meta-item { text-align: center; }
      .meta-lbl { font-size: 9px; text-transform: uppercase; color: ${COLORS.textSub}; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
      .meta-val { font-size: 14px; font-weight: 800; color: ${COLORS.primary}; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      th { background: ${COLORS.bgLight}; color: ${COLORS.textSub}; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 12px 15px; border-bottom: 2px solid ${COLORS.border}; }
      .signatures { display: flex; justify-content: space-around; margin-top: 60px; page-break-inside: avoid; }
      .sig-box { text-align: center; width: 30%; }
      .sig-line { border-top: 1px solid ${COLORS.textMain}; padding-top: 8px; font-weight: 700; font-size: 12px; color: ${COLORS.primary}; text-transform: uppercase;}
      .sig-role { font-size: 10px; color: ${COLORS.textSub}; text-transform: uppercase; margin-top: 3px; }
      .footer { margin-top: 40px; text-align: center; font-size: 9px; color: ${COLORS.border}; }
      @media print { body { padding: 20px; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="header-eyebrow">Documento Oficial de Certificación</div>
      <div class="header-title">Acta de Aprobación</div>
      <div class="header-subtitle">NIVEL: ${enrollment.levelDisplayName || enrollment.levelCode}</div>
    </div>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-lbl">Cohorte</div>
        <div class="meta-val">${enrollment.cohortName}</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">Fecha de Cierre</div>
        <div class="meta-val">${new Date(enrollment.endDate).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' })}</div>
      </div>
      <div class="meta-item">
        <div class="meta-lbl">Estudiantes Aprobados</div>
        <div class="meta-val" style="color:${COLORS.gold}">${approvedStudents.length}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:5%; text-align:center;">#</th>
          <th style="text-align:left;">Nombre del Estudiante</th>
          <th style="width:15%; text-align:center;">Asistencia</th>
          <th style="width:15%; text-align:center;">Promedio</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line">${teacherDisplayName}</div>
        <div class="sig-role">Maestro Titular</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">_________________________</div>
        <div class="sig-role">Dirección Académica</div>
      </div>
    </div>
    <div class="footer">
      Generado por PastoreApp el ${new Date().toLocaleString('es-CO')}
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