// ============================================
// cohortPdfGenerator.js
// Generador de PDF para el detalle de una cohorte (lista de estudiantes)
// Uso: import { generateCohortPDF } from './cohortPdfGenerator';
// ============================================

const GENDER_COLORS = {
  Masculino: '#3b82f6',
  Femenino:  '#ec4899',
  'N/A':     '#6b7280',
};

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

const DISTRICT_COLORS = {
  NORTE:  '#3b82f6',
  SUR:    '#10b981',
  ESTE:   '#f59e0b',
  OESTE:  '#8b5cf6',
  CENTRO: '#ec4899',
};

// ─── Helpers ────────────────────────────────────────────────

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

// ─── Exportación principal ──────────────────────────────────

/**
 * Genera un PDF con el detalle de una cohorte y su lista de estudiantes.
 *
 * @param {Object}  enrollment   - Objeto de la cohorte (normalizado de EnrollmentsPage)
 * @param {Array}   students     - Lista de estudiantes { memberName, memberId, gender/sex, leader, district, status, ... }
 *                                  Los objetos deben estar ya enriquecidos con los datos del miembro.
 * @param {Object}  helpers      - { getLevelLabel, getStatusLabel, getTeacherName, getDisplayName }
 */
export const generateCohortPDF = (enrollment, students = [], helpers = {}) => {

  const { getLevelLabel, getStatusLabel, getTeacherName, getDisplayName } = helpers;

  // ── Datos generales ──────────────────────────────────────
  const cohortTitle =
    enrollment.cohortName ||
    (getLevelLabel ? getLevelLabel(enrollment.levelCode) : enrollment.levelCode) ||
    `Cohorte ${enrollment.id}`;

  const levelLabel  = getLevelLabel  ? getLevelLabel(enrollment.levelCode)           : (enrollment.levelDisplayName || enrollment.levelCode || '—');
  const statusLabel = getStatusLabel ? getStatusLabel(enrollment.status)              : (STATUS_LABELS[enrollment.status] || enrollment.status || '—');
  const statusColor = STATUS_COLORS[enrollment.status] || '#6b7280';

  const teacherRaw  = getTeacherName ? getTeacherName(enrollment.teacher) : null;
  const teacherName = (getDisplayName && teacherRaw) ? getDisplayName(teacherRaw) : (teacherRaw || '—');

  const activeStudents = students.filter(s => s.status !== 'CANCELLED');
  const menCount       = activeStudents.filter(s => normalizeGender(s.gender ?? s.sex ?? s.genero ?? '') === 'Masculino').length;
  const womenCount     = activeStudents.filter(s => normalizeGender(s.gender ?? s.sex ?? s.genero ?? '') === 'Femenino').length;
  const noDataCount    = activeStudents.length - menCount - womenCount;

  // ── Paleta ────────────────────────────────────────────────
  const C = {
    primary:  '#1e40af',
    accent:   '#3b82f6',
    success:  '#10b981',
    warning:  '#f59e0b',
    danger:   '#ef4444',
    pink:     '#ec4899',
    dark:     '#1e293b',
    light:    '#f8fafc',
    border:   '#e2e8f0',
    textMain: '#1e293b',
    textSub:  '#64748b',
    white:    '#ffffff',
  };

  // ── KPI boxes ─────────────────────────────────────────────
  const kpis = [
    { label: 'Total Inscritos',  value: activeStudents.length, color: C.primary },
    { label: 'Hombres',          value: menCount,              color: C.accent  },
    { label: 'Mujeres',          value: womenCount,            color: C.pink    },
    { label: 'Sin dato género',  value: noDataCount,           color: C.textSub },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${C.white};border:1px solid ${C.border};border-radius:10px;padding:14px;border-top:3px solid ${k.color};text-align:center">
      <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:10px;color:${C.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ── Mini barras de género ──────────────────────────────────
  const total = activeStudents.length || 1;
  const genderBars = [
    { label: 'Hombres',         count: menCount,   color: C.accent  },
    { label: 'Mujeres',         count: womenCount, color: C.pink    },
    { label: 'Sin dato',        count: noDataCount,color: C.textSub },
  ].filter(g => g.count > 0).map(g => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;color:${C.textSub};min-width:80px">${g.label}</span>
      <div style="flex:1;background:${C.border};border-radius:4px;height:8px">
        <div style="width:${Math.round((g.count / total) * 100)}%;height:100%;background:${g.color};border-radius:4px"></div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${g.color};min-width:30px;text-align:right">${g.count}</span>
    </div>
  `).join('');

  // ── Distribución por distrito ──────────────────────────────
  const districtMap = {};
  activeStudents.forEach(s => {
    const d = s.district || s.distrito || '—';
    districtMap[d] = (districtMap[d] || 0) + 1;
  });
  const districtRows = Object.entries(districtMap).map(([d, count]) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:10px;height:10px;border-radius:50%;background:${DISTRICT_COLORS[d] || C.textSub};flex-shrink:0"></div>
      <span style="font-size:10px;color:${C.textSub};flex:1">${d}</span>
      <span style="font-size:10px;font-weight:700;color:${DISTRICT_COLORS[d] || C.textSub}">${count}</span>
    </div>
  `).join('') || `<p style="font-size:11px;color:#94a3b8">Sin datos de distrito</p>`;

  // ── Ordenar y agrupar: Distrito → Líder ───────────────────
  //
  // Orden de distritos: primero D1, D2, D3 (numérico/alfanumérico),
  // luego el resto alfabético, y '—' al final.
  const districtOrder = (d) => {
    if (!d || d === '—') return 9999;
    const m = d.match(/(\d+)/);          // extrae el primer número del distrito
    return m ? parseInt(m[1], 10) : 500; // D1→1, D2→2, D3→3; sin número→500
  };

  // Normalizar campo district en cada estudiante
  const withFields = activeStudents.map(s => ({
    ...s,
    _district: s.district ?? s.distrito ?? s.cell?.district ?? '—',
    _leader:   s.leader   ?? s.leaderName ?? s.cell?.groupLeaderName ?? '—',
    _gender:   normalizeGender(s.gender ?? s.sex ?? s.genero ?? ''),
  }));

  // Ordenar primero por distrito (numérico), luego por líder, luego por nombre
  const sorted = [...withFields].sort((a, b) => {
    const dA = districtOrder(a._district);
    const dB = districtOrder(b._district);
    if (dA !== dB) return dA - dB;
    return a._leader.localeCompare(b._leader, 'es') ||
           (a.memberName || '').localeCompare(b.memberName || '', 'es');
  });

  // Agrupar: { [district]: { [leader]: [students] } }
  const grouped = {};
  sorted.forEach(s => {
    if (!grouped[s._district]) grouped[s._district] = {};
    if (!grouped[s._district][s._leader]) grouped[s._district][s._leader] = [];
    grouped[s._district][s._leader].push(s);
  });

  // Ordenar las claves de distrito por su orden numérico
  const orderedDistricts = Object.keys(grouped).sort(
    (a, b) => districtOrder(a) - districtOrder(b)
  );

  // ── Construir filas agrupadas ──────────────────────────────
  let rowNum = 0; // numeración correlativa global

  const tableRows = orderedDistricts.map(district => {
    const dc = DISTRICT_COLORS[district] || C.textSub;

    // Totales del distrito
    const distStudents = Object.values(grouped[district]).flat();
    const distMen    = distStudents.filter(s => s._gender === 'Masculino').length;
    const distWomen  = distStudents.filter(s => s._gender === 'Femenino').length;

    // ── Fila de cabecera de Distrito ──
    const districtHeader = `
      <tr>
        <td colspan="5" style="
          padding: 9px 14px;
          background: linear-gradient(90deg, ${dc} 0%, ${dc}cc 100%);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          border-bottom: 2px solid ${dc};
        ">
          🏘️ &nbsp;${district}
          <span style="float:right;font-size:10px;font-weight:600;opacity:0.9">
            ${distStudents.length} estudiantes &nbsp;·&nbsp; ${distMen} H &nbsp;·&nbsp; ${distWomen} M
          </span>
        </td>
      </tr>
    `;

    // ── Filas por cada líder dentro del distrito ──
    const leaderBlocks = Object.keys(grouped[district])
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map(leader => {
        const leaderStudents = grouped[district][leader];
        //const lMen   = leaderStudents.filter(s => s._gender === 'Masculino').length;
        //const lWomen = leaderStudents.filter(s => s._gender === 'Femenino').length;

        // Filas de estudiantes de este líder
        const studentRows = leaderStudents.map(student => {
          rowNum += 1;
          const genderColor = GENDER_COLORS[student._gender] || C.textSub;
          const rowBg = rowNum % 2 === 0 ? C.light : C.white;

          return `
            <tr style="background:${rowBg}">
              <td style="padding:6px 10px;font-size:11px;font-weight:700;color:${C.textSub};text-align:center;border-bottom:1px solid ${C.border};border-left:3px solid ${dc}44">${rowNum}</td>
              <td style="padding:6px 10px;font-size:11px;font-weight:600;color:${C.textMain};border-bottom:1px solid ${C.border}">${student.memberName || `Miembro ${student.memberId}`}</td>
              <td style="padding:6px 10px;font-size:11px;color:${C.textSub};border-bottom:1px solid ${C.border}">${student._leader}</td>
              <td style="padding:6px 10px;border-bottom:1px solid ${C.border}">
                <span style="background:${dc}22;color:${dc};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${student._district}</span>
              </td>
              <td style="padding:6px 10px;border-bottom:1px solid ${C.border};text-align:center">
                <span style="background:${genderColor}22;color:${genderColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${student._gender}</span>
              </td>
            </tr>
          `;
        }).join('');

        return studentRows;
      }).join('');

    return districtHeader + leaderBlocks;
  }).join('');

  // ── Info panel de la cohorte ──────────────────────────────
  const infoItems = [
    { label: 'Nivel',            value: levelLabel  },
    { label: 'Estado',           value: `<span style="background:${statusColor}22;color:${statusColor};font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">${statusLabel}</span>` },
    { label: 'Maestro',          value: teacherName },
    { label: 'Fecha inicio',     value: fmtDate(enrollment.startDate) },
    { label: 'Fecha fin',        value: fmtDate(enrollment.endDate)   },
    { label: 'Cupos',            value: `${activeStudents.length} / ${enrollment.maxStudents || '—'}` },
    { label: '% Asistencia mín.',value: `${enrollment.minAttendancePercentage ?? '—'}%` },
    { label: 'Calificación mín.',value: enrollment.minAverageScore != null ? Number(enrollment.minAverageScore).toFixed(1) : '—' },
  ];

  const infoGrid = infoItems.map(item => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid ${C.border};font-size:11px">
      <span style="color:${C.textSub}">${item.label}</span>
      <span style="font-weight:700;color:${C.textMain};text-align:right">${item.value}</span>
    </div>
  `).join('');

  // ── HTML completo ──────────────────────────────────────────
  const now = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const nowTime = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const nowFull = new Date().toLocaleString('es-CO');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Cohorte — ${cohortTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #1e293b; font-size: 12px; }
    @page { size: A4 portrait; margin: 14mm 16mm; }
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
          Sistema de Gestión Pastoral
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:4px">
          📋 Reporte de Cohorte
        </div>
        <div style="font-size:15px;opacity:0.9;font-weight:600">${cohortTitle}</div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${now}</div>
        <div style="font-size:10px;margin-top:4px">${nowTime}</div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div style="display:flex;gap:12px;margin-bottom:16px" class="no-break">
    ${kpiBoxes}
  </div>

  <!-- DISTRIBUCIONES + INFO COHORTE -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">

    <!-- Distribución género -->
    <div style="flex:1;background:${C.white};border:1px solid ${C.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:${C.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid ${C.accent}">
        Distribución por Género
      </div>
      ${genderBars || `<p style="font-size:11px;color:#94a3b8">Sin datos</p>`}
    </div>

    <!-- Distribución distrito -->
    <div style="flex:1;background:${C.white};border:1px solid ${C.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:${C.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid ${C.accent}">
        Distribución por Distrito
      </div>
      ${districtRows}
    </div>

    <!-- Info de la cohorte -->
    <div style="flex:1;background:${C.white};border:1px solid ${C.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:${C.primary};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid ${C.accent}">
        Datos de la Cohorte
      </div>
      ${infoGrid}
    </div>

  </div>

  <!-- TABLA DE ESTUDIANTES -->
  <div style="background:${C.white};border:1px solid ${C.border};border-radius:10px;overflow:hidden">
    <div style="background:${C.primary};padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado de Estudiantes Inscritos</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${activeStudents.length} registros</span>
    </div>
    ${activeStudents.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay estudiantes inscritos en esta cohorte.
      </div>
    ` : `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          ${['#', 'Nombre del Estudiante', 'Líder', 'Distrito', 'Género'].map(h =>
            `<th style="padding:8px 10px;font-size:9px;color:${C.textSub};text-transform:uppercase;letter-spacing:0.8px;text-align:left;font-weight:700;border-bottom:1px solid ${C.border}">${h}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    `}
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:9px;color:#94a3b8">Sistema de Gestión Pastoral • Reporte Confidencial • ${cohortTitle}</span>
    <span style="font-size:9px;color:#94a3b8">${nowFull}</span>
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