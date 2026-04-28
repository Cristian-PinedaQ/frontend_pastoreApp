// services/generateCohortPDF.js
// Reporte de lista de estudiantes de una cohorte — agrupado por jerarquía G12
// Estructura: Pastor → Líder de Red (G12) → Líder Directo → Estudiantes

const STATUS_LABELS = {
  ACTIVE:    'Activa',
  SUSPENDED: 'Inactiva',
  PENDING:   'Programada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS = {
  ACTIVE:    '#10b981',
  SUSPENDED: '#f59e0b',
  PENDING:   '#3b82f6',
  COMPLETED: '#8b5cf6',
  CANCELLED: '#ef4444',
};

const COLORS = {
  primary:     '#0f172a',
  primaryBlue: '#1e40af',
  gold:        '#d97706',
  goldLight:   '#fef3c7',
  border:      '#cbd5e1',
  textMain:    '#334155',
  textSub:     '#64748b',
  white:       '#ffffff',
  bgLight:     '#f8fafc',
  accent:      '#3b82f6',
  pink:        '#ec4899',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const normalizeGender = (value) => {
  if (!value) return 'N/A';
  const v = value.toString().toUpperCase().trim();
  if (['M', 'MALE', 'MASCULINO', 'HOMBRE', 'H'].includes(v)) return 'Masculino';
  if (['F', 'FEMALE', 'FEMENINO', 'MUJER'].includes(v))       return 'Femenino';
  return 'N/A';
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getTeacherName = (teacher) => {
  if (!teacher) return null;
  if (teacher.member?.name) return teacher.member.name;
  if (teacher.memberName)   return teacher.memberName;
  if (teacher.name)         return teacher.name;
  return null;
};

/**
 * Genera un PDF con la lista de estudiantes agrupada por jerarquía G12.
 *
 * @param {Object} enrollment   - Objeto cohorte normalizado
 * @param {Array}  students     - Estudiantes ya enriquecidos con:
 *                                  { memberName, memberId, gender/sex,
 *                                    pastor, networkLeader, directLeader,
 *                                    status, enrollmentDate, ... }
 * @param {Object} helpers      - { getLevelLabel, getStatusLabel, getTeacherName, getDisplayName }
 */
export const generateCohortPDF = (enrollment, students = [], helpers = {}) => {
  const { getLevelLabel, getStatusLabel, getDisplayName } = helpers;
  const display = getDisplayName || ((n) => n);

  // ── Datos generales ────────────────────────────────────────────────────────
  const cohortTitle =
    enrollment.cohortName ||
    (getLevelLabel ? getLevelLabel(enrollment.levelCode) : enrollment.levelCode) ||
    `Cohorte ${enrollment.id}`;

  const levelLabel  = getLevelLabel  ? getLevelLabel(enrollment.levelCode)
                                     : (enrollment.levelDisplayName || enrollment.levelCode || '—');
  const statusLabel = getStatusLabel ? getStatusLabel(enrollment.status)
                                     : (STATUS_LABELS[enrollment.status] || enrollment.status || '—');
  const statusColor = STATUS_COLORS[enrollment.status] || '#6b7280';

  const teacherRaw  = getTeacherName(enrollment.teacher);
  const teacherName = (teacherRaw && display) ? display(teacherRaw) : (teacherRaw || '—');

  const activeStudents = students.filter(s => s.status !== 'CANCELLED');
  const menCount    = activeStudents.filter(s => normalizeGender(s.gender ?? s.sex ?? s.genero ?? '') === 'Masculino').length;
  const womenCount  = activeStudents.filter(s => normalizeGender(s.gender ?? s.sex ?? s.genero ?? '') === 'Femenino').length;
  const noDataCount = activeStudents.length - menCount - womenCount;

  // ── 1. Agrupación jerárquica G12 ───────────────────────────────────────────
  // Pastor → Líder de Red → Líder Directo → [estudiantes]
  const hierarchy = {};

  activeStudents.forEach(student => {
    const p   = student.pastor        || 'Ministerio General';
    const net = student.networkLeader || 'Sin Líder de Red';
    const dir = student.directLeader  || 'Sin Líder Directo';

    if (!hierarchy[p])         hierarchy[p]         = {};
    if (!hierarchy[p][net])    hierarchy[p][net]     = {};
    if (!hierarchy[p][net][dir]) hierarchy[p][net][dir] = [];

    hierarchy[p][net][dir].push(student);
  });

  const pastorsSorted = Object.keys(hierarchy).sort();

  // ── 2. Construir filas de la tabla ─────────────────────────────────────────
  let tableRowsHtml = '';
  let globalCounter = 1;

  pastorsSorted.forEach(pastor => {
    // Fila: RAMA PASTORAL (nivel 1 — fondo oscuro)
    tableRowsHtml += `
      <tr>
        <td colspan="5" style="background:${COLORS.primary}; color:${COLORS.white};
            padding:11px 15px; font-weight:900; font-size:11.5px;
            letter-spacing:1px; text-transform:uppercase; border-bottom:2px solid #334155;">
          👑 RAMA PASTORAL: ${display(pastor)}
        </td>
      </tr>
    `;

    const nets = Object.keys(hierarchy[pastor]).sort();
    nets.forEach(net => {
      const netStudents = Object.values(hierarchy[pastor][net]).flat();

      // Fila: LÍDER DE RED / G12 (nivel 2 — azul)
      tableRowsHtml += `
        <tr>
          <td colspan="5" style="background:${COLORS.primaryBlue}; color:${COLORS.white};
              padding:8px 15px; font-weight:800; font-size:10.5px;
              letter-spacing:0.8px; text-transform:uppercase; border-bottom:1px solid #93c5fd;">
            💎 LÍDER DE RED (G12): ${display(net)}
            <span style="float:right; font-size:9.5px; font-weight:600; opacity:.85;">
              ${netStudents.length} estudiante${netStudents.length !== 1 ? 's' : ''}
            </span>
          </td>
        </tr>
      `;

      const dirs = Object.keys(hierarchy[pastor][net]).sort();
      dirs.forEach(dir => {
        const dirStudents = hierarchy[pastor][net][dir];
        const isSameasNet = (net === dir || dir === 'Sin Líder Directo' || dir === 'Red Pastoral Directa');
        const dirLabel = isSameasNet
          ? '👤 DISCÍPULOS DIRECTOS DE LA RED'
          : `👤 LÍDER DIRECTO: ${display(dir)}`;

        // Fila: LÍDER DIRECTO (nivel 3 — dorado)
        tableRowsHtml += `
          <tr>
            <td colspan="5" style="background:${COLORS.goldLight}; color:${COLORS.gold};
                padding:5px 15px; font-weight:700; font-size:10px;
                text-transform:uppercase; border-bottom:1px solid ${COLORS.gold};">
              ${dirLabel}
              <span style="float:right; color:${COLORS.textSub}; font-size:9px;">
                (${dirStudents.length})
              </span>
            </td>
          </tr>
        `;

        // Filas de estudiantes
        dirStudents.forEach((student, idx) => {
          const rowBg  = idx % 2 === 0 ? COLORS.white : COLORS.bgLight;
          const gender = normalizeGender(student.gender ?? student.sex ?? student.genero ?? '');
          const gColor = gender === 'Masculino' ? COLORS.accent
                        : gender === 'Femenino'  ? COLORS.pink
                        : COLORS.textSub;
          const pct    = student.finalAttendancePercentage !== undefined
                          ? Number(student.finalAttendancePercentage).toFixed(0) + '%'
                          : '—';
          const score  = (student.averageScore !== undefined && student.averageScore !== null)
                          ? Number(student.averageScore).toFixed(2)
                          : '—';

          tableRowsHtml += `
            <tr style="background:${rowBg}; border-bottom:1px solid ${COLORS.border};">
              <td style="padding:6px 10px; text-align:center; width:4%; color:${COLORS.textSub};
                  font-weight:600; font-size:10px;">${globalCounter++}</td>
              <td style="padding:6px 10px; text-align:left; font-weight:800;
                  color:${COLORS.textMain}; text-transform:uppercase; font-size:10px;">
                ${display(student.memberName || `Miembro ${student.memberId}`)}
              </td>
              <td style="padding:6px 10px; text-align:center; font-size:10px;">
                <span style="background:${gColor}22; color:${gColor};
                    font-size:9px; padding:1px 7px; border-radius:10px; font-weight:700;">
                  ${gender}
                </span>
              </td>
              <td style="padding:6px 10px; text-align:center; font-weight:700;
                  color:${COLORS.primaryBlue}; font-size:10px;">${pct}</td>
              <td style="padding:6px 10px; text-align:center; font-weight:700;
                  color:${COLORS.textSub}; font-size:10px;">${score}</td>
            </tr>
          `;
        });
      });
    });
  });

  // ── 3. KPI boxes ───────────────────────────────────────────────────────────
  const kpis = [
    { label: 'Total Inscritos',  value: activeStudents.length, color: COLORS.primaryBlue },
    { label: 'Hombres',          value: menCount,              color: COLORS.accent      },
    { label: 'Mujeres',          value: womenCount,            color: COLORS.pink        },
    { label: 'Sin dato género',  value: noDataCount,           color: COLORS.textSub     },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1; background:${COLORS.white}; border:1px solid ${COLORS.border};
        border-top:3px solid ${k.color}; border-radius:8px; padding:12px; text-align:center;">
      <div style="font-size:24px; font-weight:800; color:${k.color}; line-height:1;">${k.value}</div>
      <div style="font-size:9px; color:${COLORS.textSub}; margin-top:4px;
          text-transform:uppercase; letter-spacing:0.5px;">${k.label}</div>
    </div>
  `).join('');

  // ── 4. Info panel de la cohorte ────────────────────────────────────────────
  const infoItems = [
    { label: 'Nivel',             value: levelLabel },
    { label: 'Estado',            value: `<span style="background:${statusColor}22;color:${statusColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${statusLabel}</span>` },
    { label: 'Maestro',           value: teacherName },
    { label: 'Fecha inicio',      value: fmtDate(enrollment.startDate) },
    { label: 'Fecha fin',         value: fmtDate(enrollment.endDate)   },
    { label: 'Cupos',             value: `${activeStudents.length} / ${enrollment.maxStudents || '—'}` },
    { label: '% Asistencia mín.', value: `${enrollment.minAttendancePercentage ?? '—'}%` },
    { label: 'Calificación mín.', value: enrollment.minAverageScore != null ? Number(enrollment.minAverageScore).toFixed(1) : '—' },
  ];

  const infoGrid = infoItems.map(item => `
    <div style="display:flex; justify-content:space-between; padding:5px 0;
        border-bottom:1px solid ${COLORS.border}; font-size:10.5px;">
      <span style="color:${COLORS.textSub};">${item.label}</span>
      <span style="font-weight:700; color:${COLORS.textMain}; text-align:right;">${item.value}</span>
    </div>
  `).join('');

  // ── 5. Mini barras de género ───────────────────────────────────────────────
  const total = activeStudents.length || 1;
  const genderBars = [
    { label: 'Hombres',   count: menCount,   color: COLORS.accent   },
    { label: 'Mujeres',   count: womenCount, color: COLORS.pink     },
    { label: 'Sin dato',  count: noDataCount,color: COLORS.textSub  },
  ].filter(g => g.count > 0).map(g => `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:7px;">
      <span style="font-size:9.5px; color:${COLORS.textSub}; min-width:70px;">${g.label}</span>
      <div style="flex:1; background:${COLORS.border}; border-radius:4px; height:7px;">
        <div style="width:${Math.round((g.count / total) * 100)}%; height:100%;
            background:${g.color}; border-radius:4px;"></div>
      </div>
      <span style="font-size:9.5px; font-weight:700; color:${g.color}; min-width:20px; text-align:right;">${g.count}</span>
    </div>
  `).join('');

  // ── 6. HTML completo ───────────────────────────────────────────────────────
  const now = new Date().toLocaleString('es-CO');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Cohorte · ${cohortTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Inter:wght@400;600;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { padding:36px; color:${COLORS.textMain}; background:#fff;
           font-family:'Inter', sans-serif; font-size:12px; }
    @page { size: A4 portrait; margin: 14mm 16mm; }
    @media print {
      body { -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:0; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);
      border-radius:12px; padding:20px 24px; margin-bottom:18px; color:#fff;">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div style="font-size:9px; opacity:.75; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px;">
          Sistema de Gestión Pastoral
        </div>
        <div style="font-size:22px; font-weight:800; margin-bottom:4px;">
          📋 Reporte de Cohorte
        </div>
        <div style="font-size:14px; opacity:.9; font-weight:600;">${cohortTitle}</div>
      </div>
      <div style="text-align:right; opacity:.85;">
        <div style="font-size:10px;">Generado</div>
        <div style="font-size:12px; font-weight:700;">${now}</div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div style="display:flex; gap:12px; margin-bottom:16px;">
    ${kpiBoxes}
  </div>

  <!-- DISTRIBUCIÓN GÉNERO + INFO COHORTE -->
  <div style="display:flex; gap:14px; margin-bottom:18px;">

    <div style="flex:1.2; background:${COLORS.white}; border:1px solid ${COLORS.border};
        border-radius:10px; padding:14px;">
      <div style="font-size:10px; font-weight:800; color:${COLORS.primaryBlue};
          text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;
          padding-bottom:5px; border-bottom:2px solid ${COLORS.accent};">
        Distribución por Género
      </div>
      ${genderBars || `<p style="font-size:10px;color:#94a3b8">Sin datos</p>`}
    </div>

    <div style="flex:2; background:${COLORS.white}; border:1px solid ${COLORS.border};
        border-radius:10px; padding:14px;">
      <div style="font-size:10px; font-weight:800; color:${COLORS.primaryBlue};
          text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;
          padding-bottom:5px; border-bottom:2px solid ${COLORS.accent};">
        Datos de la Cohorte
      </div>
      ${infoGrid}
    </div>

  </div>

  <!-- TABLA DE ESTUDIANTES POR JERARQUÍA G12 -->
  <div style="background:${COLORS.white}; border:1px solid ${COLORS.border};
      border-radius:10px; overflow:hidden; margin-bottom:24px;">
    <div style="background:${COLORS.primary}; padding:12px 16px;
        display:flex; justify-content:space-between; align-items:center;">
      <span style="color:#fff; font-size:12px; font-weight:800;
          text-transform:uppercase; letter-spacing:1px;">
        Listado por Línea Ministerial (G12)
      </span>
      <span style="background:rgba(255,255,255,.2); color:#fff;
          padding:3px 12px; border-radius:12px; font-size:9px; font-weight:700;">
        ${activeStudents.length} inscritos
      </span>
    </div>
    ${activeStudents.length === 0
      ? `<div style="padding:30px; text-align:center; color:#94a3b8; font-size:12px;">
           No hay estudiantes inscritos en esta cohorte.
         </div>`
      : `<table style="width:100%; border-collapse:collapse;">
           <thead>
             <tr style="background:${COLORS.bgLight};">
               <th style="padding:8px 10px; font-size:9px; color:${COLORS.textSub};
                   text-transform:uppercase; letter-spacing:.8px; text-align:center;
                   border-bottom:1px solid ${COLORS.border}; width:4%;">#</th>
               <th style="padding:8px 10px; font-size:9px; color:${COLORS.textSub};
                   text-transform:uppercase; letter-spacing:.8px; text-align:left;
                   border-bottom:1px solid ${COLORS.border};">Nombre del Estudiante</th>
               <th style="padding:8px 10px; font-size:9px; color:${COLORS.textSub};
                   text-transform:uppercase; letter-spacing:.8px; text-align:center;
                   border-bottom:1px solid ${COLORS.border}; width:10%;">Género</th>
               <th style="padding:8px 10px; font-size:9px; color:${COLORS.textSub};
                   text-transform:uppercase; letter-spacing:.8px; text-align:center;
                   border-bottom:1px solid ${COLORS.border}; width:12%;">Asistencia</th>
               <th style="padding:8px 10px; font-size:9px; color:${COLORS.textSub};
                   text-transform:uppercase; letter-spacing:.8px; text-align:center;
                   border-bottom:1px solid ${COLORS.border}; width:12%;">Promedio</th>
             </tr>
           </thead>
           <tbody>${tableRowsHtml}</tbody>
         </table>`
    }
  </div>

  <!-- LEYENDA DE JERARQUÍA -->
  <div style="background:${COLORS.bgLight}; border:1px solid ${COLORS.border};
      border-radius:8px; padding:12px 16px; margin-bottom:20px;">
    <div style="font-size:9.5px; font-weight:800; color:${COLORS.primaryBlue};
        margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">
      Leyenda de Jerarquía Ministerial
    </div>
    <div style="display:flex; gap:16px; font-size:9.5px; flex-wrap:wrap;">
      <span>👑 <strong>Rama Pastoral</strong> — Pastor o Pastora responsable</span>
      <span>💎 <strong>Líder de Red (G12)</strong> — Líder de 12</span>
      <span>👤 <strong>Líder Directo</strong> — Discipulador inmediato</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid ${COLORS.border}; padding-top:10px;
      display:flex; justify-content:space-between; font-size:9px; color:#94a3b8;">
    <span>Sistema de Gestión Pastoral · Reporte Confidencial · ${cohortTitle}</span>
    <span>${now}</span>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
};