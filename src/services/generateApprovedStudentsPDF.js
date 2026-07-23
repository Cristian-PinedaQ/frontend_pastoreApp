// services/generateApprovedStudentsPDF.js
// Acta de Aprobación de Cohorte — Agrupado por jerarquía G12 en árbol desde el backend

const COLORS = {
  primary:     '#1e3a8a', // Azul noble de acta
  border:      '#cbd5e1',
  textMain:    '#1e293b',
  textSub:     '#475569',
  white:       '#ffffff',
  bgLight:     '#f8fafc',
  accent:      '#3b82f6',
  pink:        '#ec4899',
  gold:        '#b45309',
  goldLight:   '#fef3c7',
};

const display = (n) => n || '';

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Cuenta cuántos estudiantes aprobados hay en un sub-árbol
 */
const countApprovedStudents = (node) => {
  let count = 0;
  if (node.students) {
    count += node.students.filter(s => s.passed === true).length;
  }
  if (node.children) {
    node.children.forEach(child => {
      count += countApprovedStudents(child);
    });
  }
  return count;
};

/**
 * Genera el PDF del Acta de Aprobación agrupada por jerarquía G12.
 *
 * @param {Object} enrollment   - Objeto de la cohorte
 * @param {Object} reportData   - HierarchyReportDTO del backend
 * @param {Object} helpers      - { getDisplayName }
 */
export const generateApprovedStudentsPDF = (enrollment, reportData = {}, helpers = {}) => {
  const displayHelper = helpers.getDisplayName || display;

  const cohortTitle = reportData.cohortName || enrollment.cohortName || `Cohorte ${enrollment.id}`;
  const levelLabel  = reportData.levelName || enrollment.levelCode || '—';

  // ── 1. Construir filas de estudiantes aprobados de forma jerárquica ─────────
  let tableRowsHtml = '';
  let globalCounter = 1;

  const renderStudentRow = (student, idx) => {
    if (student.passed !== true) return ''; // Solo listamos aprobados en el acta

    const rowBg  = idx % 2 === 0 ? COLORS.white : COLORS.bgLight;
    const score  = (student.averageScore !== undefined && student.averageScore !== null)
                    ? Number(student.averageScore).toFixed(2)
                    : '—';

    return `
      <tr style="background:${rowBg}; border-bottom:1px solid ${COLORS.border};">
        <td style="padding:8px 12px; text-align:center; width:6%; color:${COLORS.textSub};
            font-weight:600; font-size:10.5px;">${globalCounter++}</td>
        <td style="padding:8px 12px; text-align:left; font-weight:800;
            color:${COLORS.textMain}; text-transform:uppercase; font-size:10.5px;">
          ${displayHelper(student.name)}
          <span style="font-size:9px; font-weight:normal; color:${COLORS.textSub}; text-transform:none; margin-left:8px;">
            (Líder: ${displayHelper(student.directLeaderName)})
          </span>
        </td>
        <td style="padding:8px 12px; text-align:center; font-weight:700;
            color:${COLORS.primary}; font-size:10.5px;">${score}</td>
        <td style="padding:8px 12px; text-align:center; font-size:9.5px; font-weight:700; color:#10b981;">
          APROBADO
        </td>
      </tr>
    `;
  };

  const renderNetworkNode = (networkNode, networkLabel) => {
    if (!networkNode) return;

    // Verificar si esta red contiene algún aprobado para evitar pintar ramas vacías
    const approvedCount = countApprovedStudents(networkNode);
    if (approvedCount === 0) return;

    // Fila: Pastor Principal (Nivel 1)
    tableRowsHtml += `
      <tr>
        <td colspan="4" style="background:${COLORS.primary}; color:${COLORS.white};
            padding:12px 16px; font-weight:900; font-size:12px;
            letter-spacing:1px; text-transform:uppercase; border-bottom:2px solid #172554;">
          👑 RAMA PASTORAL (${networkLabel}): ${displayHelper(networkNode.name)}
        </td>
      </tr>
    `;

    // Discípulos Directos del Pastor/Pastora (Líderes 12 en formación u otros)
    if (networkNode.students && networkNode.students.length > 0) {
      const directApproved = networkNode.students.filter(s => s.passed === true);
      if (directApproved.length > 0) {
        tableRowsHtml += `
          <tr>
            <td colspan="4" style="background:${COLORS.goldLight}; color:${COLORS.gold};
                padding:7px 16px; font-weight:900; font-size:11.5px;
                text-transform:uppercase; border-bottom:1px solid ${COLORS.gold};">
              👤 DISCÍPULOS DIRECTOS DE LA RAMA PASTORAL
              <span style="float:right; color:${COLORS.textSub}; font-size:9.5px;">
                (${directApproved.length})
              </span>
            </td>
          </tr>
        `;
        networkNode.students.forEach((student, idx) => {
          tableRowsHtml += renderStudentRow(student, idx);
        });
      }
    }

    if (networkNode.children) {
      networkNode.children.forEach(l12Node => {
        const nodeApprovedCount = countApprovedStudents(l12Node);
        if (nodeApprovedCount === 0) return;

        const isUnassigned = l12Node.type === 'UNASSIGNED';
        const l12Label = isUnassigned ? '⚠️ SIN RED DEFINIDA' : `💎 LÍDER DE RED (G12): ${displayHelper(l12Node.name)}`;
        const l12Bg = isUnassigned ? '#475569' : '#1e40af';

        // Fila: Líder 12 (Nivel 2)
        tableRowsHtml += `
          <tr>
            <td colspan="4" style="background:${l12Bg}; color:${COLORS.white};
                padding:9px 16px; font-weight:800; font-size:11px;
                letter-spacing:0.8px; text-transform:uppercase; border-bottom:1px solid #93c5fd;">
              ${l12Label}
              <span style="float:right; font-size:9.5px; font-weight:600; opacity:.85;">
                ${nodeApprovedCount} aprobado${nodeApprovedCount !== 1 ? 's' : ''}
              </span>
            </td>
          </tr>
        `;

        // Estudiantes Aprobados Directos del Líder 12
        if (l12Node.students && l12Node.students.length > 0) {
          const directApproved = l12Node.students.filter(s => s.passed === true);
          if (directApproved.length > 0) {
            tableRowsHtml += `
              <tr>
                <td colspan="4" style="background:${COLORS.goldLight}; color:${COLORS.gold};
                    padding:6px 16px; font-weight:700; font-size:10px;
                    text-transform:uppercase; border-bottom:1px solid ${COLORS.gold};">
                  👤 DISCÍPULOS DIRECTOS DE LA RED
                  <span style="float:right; color:${COLORS.textSub}; font-size:9.5px;">
                    (${directApproved.length})
                  </span>
                </td>
              </tr>
            `;
            l12Node.students.forEach((student, idx) => {
              tableRowsHtml += renderStudentRow(student, idx);
            });
          }
        }

        // Líderes 144
        if (l12Node.children) {
          l12Node.children.forEach(l144Node => {
            const l144ApprovedCount = countApprovedStudents(l144Node);
            if (l144ApprovedCount === 0) return;

            tableRowsHtml += `
              <tr>
                <td colspan="4" style="background:${COLORS.goldLight}; color:${COLORS.gold};
                    padding:6px 16px; font-weight:700; font-size:10px;
                    text-transform:uppercase; border-bottom:1px solid ${COLORS.gold};">
                  👤 LÍDER DE RAMA (144): ${displayHelper(l144Node.name)}
                  <span style="float:right; color:${COLORS.textSub}; font-size:9.5px;">
                    (${l144ApprovedCount})
                  </span>
                </td>
              </tr>
            `;
            l144Node.students.forEach((student, idx) => {
              tableRowsHtml += renderStudentRow(student, idx);
            });
          });
        }
      });
    }
  };

  // Renderizar ambas redes
  renderNetworkNode(reportData.maleNetwork, 'RED DE HOMBRES');
  renderNetworkNode(reportData.femaleNetwork, 'RED DE MUJERES');

  const totalApproved = (globalCounter - 1);
  const now = new Date().toLocaleString('es-CO');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Acta de Aprobación · ${cohortTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Inter:wght@400;600;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { padding:45px; color:${COLORS.textMain}; background:#fff;
           font-family:'Inter', sans-serif; font-size:12px; }
    @page { size: A4 portrait; margin: 15mm 18mm; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:0; }
    }
    .cinzel { font-family:'Cinzel', serif; }
  </style>
</head>
<body>

  <!-- BORDE ORNAMENTAL PARA ACTA -->
  <div style="border:4px double ${COLORS.primary}; padding:30px; min-height:92vh; display:flex; flex-direction:column; justify-content:space-between;">
    
    <div>
      <!-- ENCABEZADO SOLEMNE -->
      <div style="text-align:center; margin-bottom:24px;">
        <div class="cinzel" style="font-size:24px; font-weight:900; color:${COLORS.primary}; letter-spacing:2px; text-transform:uppercase; margin-bottom:5px;">
          ACTA OFICIAL DE APROBACIÓN
        </div>
        <div style="width:100px; height:2px; background:${COLORS.gold}; margin:10px auto;"></div>
        <div style="font-size:11px; color:${COLORS.textSub}; text-transform:uppercase; letter-spacing:1.5px; margin-top:5px;">
          COHORTE DE FORMACIÓN: <strong>${cohortTitle}</strong>
        </div>
        <div style="font-size:12px; color:${COLORS.textMain}; margin-top:4px;">
          Nivel Académico: <strong>${levelLabel}</strong>
        </div>
      </div>

      <!-- TEXTO DECLARATORIO -->
      <div style="font-size:11.5px; text-align:justify; line-height:1.7; color:${COLORS.textMain}; margin-bottom:25px; border-bottom:1px solid ${COLORS.border}; padding-bottom:15px;">
        Por medio de la presente se certifica y hace constar formalmente que los estudiantes listados a continuación,
        pertenecientes a la cohorte <strong>${cohortTitle}</strong>, han completado satisfactoriamente los requisitos
        académicos y de asistencia exigidos por el programa institucional. En constancia de su esfuerzo y fidelidad
        pastoral, se expide esta acta oficial de aprobados agrupada por su respectiva <strong>Línea de Liderazgo (G12)</strong>.
      </div>

      <!-- TABLA DE APROBADOS -->
      <div style="background:${COLORS.white}; border:1px solid ${COLORS.border}; border-radius:8px; overflow:hidden; margin-bottom:30px;">
        <div style="background:${COLORS.primary}; padding:10px 16px; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#fff; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">
            Estudiantes que Aprobaron el Nivel
          </span>
          <span style="background:${COLORS.gold}; color:#fff; padding:2px 10px; border-radius:10px; font-size:9.5px; font-weight:800;">
            ${totalApproved} aprobados
          </span>
        </div>
        ${totalApproved === 0
          ? `<div style="padding:30px; text-align:center; color:${COLORS.textSub}; font-size:12px;">
               No se registraron estudiantes aprobados en esta cohorte.
             </div>`
          : `<table style="width:100%; border-collapse:collapse;">
               <thead>
                 <tr style="background:${COLORS.bgLight};">
                   <th style="padding:8px 12px; font-size:9.5px; color:${COLORS.textSub}; text-transform:uppercase; letter-spacing:.8px; text-align:center; border-bottom:1px solid ${COLORS.border}; width:6%;">#</th>
                   <th style="padding:8px 12px; font-size:9.5px; color:${COLORS.textSub}; text-transform:uppercase; letter-spacing:.8px; text-align:left; border-bottom:1px solid ${COLORS.border};">Nombre Completo del Estudiante</th>
                   <th style="padding:8px 12px; font-size:9.5px; color:${COLORS.textSub}; text-transform:uppercase; letter-spacing:.8px; text-align:center; border-bottom:1px solid ${COLORS.border}; width:16%;">Promedio Final</th>
                   <th style="padding:8px 12px; font-size:9.5px; color:${COLORS.textSub}; text-transform:uppercase; letter-spacing:.8px; text-align:center; border-bottom:1px solid ${COLORS.border}; width:16%;">Estado</th>
                 </tr>
               </thead>
               <tbody>${tableRowsHtml}</tbody>
             </table>`
        }
      </div>
    </div>

    <!-- SECCIÓN DE FIRMAS Y CIERRE -->
    <div>
      <div style="font-size:10px; color:${COLORS.textSub}; text-align:center; margin-bottom:40px;">
        Expedido el día ${fmtDate(new Date().toISOString().split('T')[0])} a las ${new Date().toLocaleTimeString('es-CO')}.
      </div>

      <div style="display:flex; justify-content:space-around; margin-top:30px;">
        <div style="text-align:center; width:200px;">
          <div style="border-top:1px solid ${COLORS.textMain}; padding-top:8px; font-weight:700; font-size:11px; color:${COLORS.textMain};">
            Firma del Maestro(a)
          </div>
          <div style="font-size:9.5px; color:${COLORS.textSub}; margin-top:2px;">Docente Encargado</div>
        </div>
        <div style="text-align:center; width:200px;">
          <div style="border-top:1px solid ${COLORS.textMain}; padding-top:8px; font-weight:700; font-size:11px; color:${COLORS.textMain};">
            Firma Coordinación
          </div>
          <div style="font-size:9.5px; color:${COLORS.textSub}; margin-top:2px;">Coordinador del Nivel</div>
        </div>
      </div>
    </div>

  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el Acta.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
};