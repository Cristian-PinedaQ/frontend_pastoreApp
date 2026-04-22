// services/generateApprovedStudentsPDF.js

export const generateApprovedStudentsPDF = (enrollment, approvedStudents) => {
    const COLORS = {
        primary: '#0f172a',     // Azul marino oscuro muy elegante
        gold: '#d97706',        // Dorado profesional
        goldLight: '#fef3c7',   // Fondo sutil dorado
        border: '#cbd5e1',
        textMain: '#334155',
        textSub: '#64748b',
        white: '#ffffff',
        bgLight: '#f8fafc'
    };

    // ── 1. Agrupación Jerárquica (Líder Principal -> Líder Directo) ─────────
    const hierarchy = {};

    approvedStudents.forEach(student => {
        const main = student.mainLeader || 'RED GENERAL';
        const direct = student.directLeader || 'Sin Líder Directo';

        if (!hierarchy[main]) hierarchy[main] = {};
        if (!hierarchy[main][direct]) hierarchy[main][direct] = [];

        hierarchy[main][direct].push(student);
    });

    const mainLeadersSorted = Object.keys(hierarchy).sort();

    // ── 2. Renderizado de las filas de la tabla ─────────────────────────────
    let tableRowsHtml = '';
    let globalCounter = 1;

    mainLeadersSorted.forEach(mainLeader => {
        // Fila del Líder Principal (Nivel 1)
        tableRowsHtml += `
      <tr>
        <td colspan="4" style="background:${COLORS.primary}; color:${COLORS.white}; padding:10px 15px; font-weight:800; font-size:12px; letter-spacing:1px; text-transform:uppercase;">
          👑 LÍDER DE RED / PASTOR: ${mainLeader}
        </td>
      </tr>
    `;

        const directLeaders = Object.keys(hierarchy[mainLeader]).sort();

        directLeaders.forEach(directLeader => {
            const students = hierarchy[mainLeader][directLeader];

            // Fila del Líder Directo (Nivel 2)
            tableRowsHtml += `
        <tr>
          <td colspan="4" style="background:${COLORS.goldLight}; color:${COLORS.gold}; padding:8px 15px; font-weight:700; font-size:11px; border-bottom:1px solid ${COLORS.gold}; text-transform:uppercase;">
            👤 LÍDER DIRECTO: ${directLeader} <span style="float:right; color:${COLORS.textSub}; font-size:9px;">(${students.length} Aprobados)</span>
          </td>
        </tr>
      `;

            // Estudiantes de este líder
            students.forEach((s, idx) => {
                const bg = idx % 2 === 0 ? COLORS.white : COLORS.bgLight;
                const pct = s.finalAttendancePercentage !== undefined ? Number(s.finalAttendancePercentage).toFixed(0) : '100';
                // Validamos explícitamente que no sea undefined para que el 0.0 sí se imprima
                const score = (s.averageScore !== undefined && s.averageScore !== null)
                    ? Number(s.averageScore).toFixed(2)
                    : '—';

                tableRowsHtml += `
          <tr style="background:${bg}; border-bottom: 1px solid ${COLORS.border};">
            <td style="padding:8px 15px; text-align:center; width:5%; color:${COLORS.textSub}; font-weight:600;">${globalCounter++}</td>
            <td style="padding:8px 15px; text-align:left; font-weight:700; color:${COLORS.textMain}; text-transform:uppercase;">${s.memberName}</td>
            <td style="padding:8px 15px; text-align:center; font-weight:600; color:${COLORS.primary};">${pct}%</td>
            <td style="padding:8px 15px; text-align:center; font-weight:600; color:${COLORS.textSub};">${score}</td>
          </tr>
        `;
            });
        });
    });

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
      body { 
        padding:40px; 
        color:${COLORS.textMain}; 
        background:#fff; 
        font-family:'Inter', sans-serif; 
      }

      /* Cabecera elegante */
      .header {
        text-align: center;
        border-bottom: 3px double ${COLORS.gold};
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header-eyebrow {
        font-family: 'Inter', sans-serif;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 3px;
        color: ${COLORS.textSub};
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      .header-title {
        font-family: 'Merriweather', serif;
        font-size: 28px;
        font-weight: 900;
        color: ${COLORS.primary};
        margin-bottom: 8px;
        text-transform: uppercase;
      }
      .header-subtitle {
        font-size: 14px;
        font-weight: 600;
        color: ${COLORS.gold};
        letter-spacing: 1px;
      }

      /* Datos de la cohorte */
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        background: ${COLORS.bgLight};
        border: 1px solid ${COLORS.border};
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 30px;
      }
      .meta-item { text-align: center; }
      .meta-lbl { font-size: 9px; text-transform: uppercase; color: ${COLORS.textSub}; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
      .meta-val { font-size: 14px; font-weight: 800; color: ${COLORS.primary}; }

      /* Tabla principal */
      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      th {
        background: ${COLORS.bgLight};
        color: ${COLORS.textSub};
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 12px 15px;
        border-bottom: 2px solid ${COLORS.border};
      }
      
      /* Firmas al final */
      .signatures {
        display: flex;
        justify-content: space-around;
        margin-top: 60px;
        page-break-inside: avoid;
      }
      .sig-box {
        text-align: center;
        width: 30%;
      }
      .sig-line {
        border-top: 1px solid ${COLORS.textMain};
        padding-top: 8px;
        font-weight: 700;
        font-size: 12px;
        color: ${COLORS.primary};
      }
      .sig-role {
        font-size: 10px;
        color: ${COLORS.textSub};
        text-transform: uppercase;
        margin-top: 3px;
      }

      .footer {
        margin-top: 40px;
        text-align: center;
        font-size: 9px;
        color: ${COLORS.border};
      }

      @media print {
        body { padding: 20px; }
        .page-break { page-break-before: always; }
      }
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
        <div class="meta-val">${new Date(enrollment.endDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
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
        <div class="sig-line">${enrollment.teacher?.name || '_________________________'}</div>
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