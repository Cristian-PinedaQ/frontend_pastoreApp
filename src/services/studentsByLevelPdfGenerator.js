// ============================================
// studentsByLevelPdfGenerator.js
// Generador de PDF para listado de estudiantes por nivel
// Versión mejorada con estadísticas detalladas
// ============================================

const LEVEL_COLORS = {
  PREENCUENTRO: '#3b82f6',
  ENCUENTRO: '#8b5cf6',
  POST_ENCUENTRO: '#ec4899',
  BAUTIZOS: '#10b981',
  ESENCIA_1: '#f59e0b',
  ESENCIA_2: '#ef4444',
  ESENCIA_3: '#6366f1',
  SANIDAD_INTEGRAL_RAICES: '#14b8a6',
  ESENCIA_4: '#f97316',
  ADIESTRAMIENTO: '#6b7280',
  GRADUACION: '#fbbf24',
};

const LEVEL_LABELS = {
  PREENCUENTRO: 'Pre-encuentro',
  ENCUENTRO: 'Encuentro',
  POST_ENCUENTRO: 'Post-encuentro',
  BAUTIZOS: 'Bautizos',
  ESENCIA_1: 'ESENCIA 1',
  ESENCIA_2: 'ESENCIA 2',
  ESENCIA_3: 'ESENCIA 3',
  SANIDAD_INTEGRAL_RAICES: 'Sanidad Integral Raíces',
  ESENCIA_4: 'ESENCIA 4',
  ADIESTRAMIENTO: 'Adiestramiento',
  GRADUACION: 'Graduación',
};

const STATUS_COLORS = {
  ACTIVE: '#10b981',
  COMPLETED: '#3b82f6',
  FAILED: '#ef4444',
  PENDING: '#f59e0b',
  CANCELLED: '#6b7280',
};

/**
 * Genera un PDF con el listado de estudiantes por nivel
 * @param {Object} data - Datos para el PDF
 * @param {Array} data.students - Lista completa de estudiantes
 * @param {Array} data.currentlyStudying - Estudiantes activos
 * @param {Array} data.completed - Estudiantes que completaron y aprobaron
 * @param {Array} data.failed - Estudiantes que reprobaron
 * @param {string} data.level - Nivel seleccionado
 * @param {string} data.levelLabel - Etiqueta del nivel
 * @param {number} data.totalStudents - Total de estudiantes
 * @param {number} data.passedCount - Total de aprobados
 * @param {number} data.averageAttendance - Promedio de asistencia
 * @param {number} data.averageScore - Promedio de notas
 * @param {Object} data.stats - Estadísticas adicionales
 */
export const generateStudentsByLevelPDF = (data) => {
  const COLORS = {
    primary: '#1e40af',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    inactive: '#6b7280',
    dark: '#1e293b',
    light: '#f8fafc',
    border: '#e2e8f0',
    textMain: '#1e293b',
    textSub: '#64748b',
    white: '#ffffff',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1',
    teal: '#14b8a6',
    orange: '#f97316',
    yellow: '#fbbf24',
  };

  const {
    students = [],
    currentlyStudying = [],
    completed = [],
    failed = [],
    level = '',
    levelLabel = '',
    totalStudents = 0,
    passedCount = 0,
    averageAttendance = 0,
    averageScore = 0,
    stats = {
      maleCount: 0,
      femaleCount: 0,
      withEmail: 0,
      withPhone: 0,
      withDocument: 0,
      districts: []
    }
  } = data;

  const levelColor = LEVEL_COLORS[level] || COLORS.accent;
  const displayLevel = levelLabel || LEVEL_LABELS[level] || level;
  const total = students.length || totalStudents || 1;

  // ========== KPIs MEJORADOS ==========
  const kpis = [
    { 
      label: 'Total Estudiantes', 
      value: total, 
      color: levelColor, 
      icon: '👥',
      description: 'Total en el nivel'
    },
    { 
      label: 'Activos', 
      value: currentlyStudying.length, 
      color: STATUS_COLORS.ACTIVE, 
      icon: '✅',
      description: 'Cursando actualmente'
    },
    { 
      label: 'Completados', 
      value: completed.length, 
      color: STATUS_COLORS.COMPLETED, 
      icon: '🎓',
      description: 'Aprobaron el nivel'
    },
    { 
      label: 'Reprobados', 
      value: failed.length, 
      color: STATUS_COLORS.FAILED, 
      icon: '❌',
      description: 'No aprobaron'
    },
    { 
      label: 'Aprobados', 
      value: passedCount, 
      color: COLORS.success, 
      icon: '⭐',
      description: 'Total que aprobaron'
    },
  ];

  const kpiBoxes = kpis.map(k => `
    <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:12px;border-top:3px solid ${k.color};text-align:center;min-width:100px" title="${k.description || ''}">
      <div style="font-size:20px;margin-bottom:4px">${k.icon}</div>
      <div style="font-size:22px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
      <div style="font-size:9px;color:${COLORS.textSub};margin-top:4px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
    </div>
  `).join('');

  // ========== MÉTRICAS DE RENDIMIENTO ==========
  const performanceMetrics = `
    <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">
      <div style="flex:1;background:${COLORS.white};border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:800;color:${levelColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid ${levelColor}">
          📊 Métricas de Rendimiento
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="text-align:center">
            <div style="font-size:24px;font-weight:800;color:${COLORS.accent}">${(averageAttendance * 100).toFixed(1)}%</div>
            <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px">Asistencia Promedio</div>
            <div style="width:100%;background:${COLORS.border};border-radius:4px;height:6px;margin-top:8px">
              <div style="width:${averageAttendance * 100}%;height:100%;background:${COLORS.accent};border-radius:4px"></div>
            </div>
          </div>
          <div style="text-align:center">
            <div style="font-size:24px;font-weight:800;color:${COLORS.success}">${averageScore.toFixed(1)}</div>
            <div style="font-size:10px;color:${COLORS.textSub};margin-top:4px">Nota Promedio</div>
            <div style="width:100%;background:${COLORS.border};border-radius:4px;height:6px;margin-top:8px">
              <div style="width:${(averageScore/3)*100}%;height:100%;background:${COLORS.success};border-radius:4px"></div>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-around;margin-top:16px;padding-top:12px;border-top:1px solid ${COLORS.border}">
          <div style="text-align:center">
            <span style="display:inline-block;width:10px;height:10px;background:${STATUS_COLORS.ACTIVE};border-radius:50%;margin-right:4px"></span>
            <span style="font-size:10px;color:${COLORS.textSub}">Activos: ${currentlyStudying.length}</span>
          </div>
          <div style="text-align:center">
            <span style="display:inline-block;width:10px;height:10px;background:${STATUS_COLORS.COMPLETED};border-radius:50%;margin-right:4px"></span>
            <span style="font-size:10px;color:${COLORS.textSub}">Completados: ${completed.length}</span>
          </div>
          <div style="text-align:center">
            <span style="display:inline-block;width:10px;height:10px;background:${STATUS_COLORS.FAILED};border-radius:50%;margin-right:4px"></span>
            <span style="font-size:10px;color:${COLORS.textSub}">Reprobados: ${failed.length}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // ========== DISTRIBUCIÓN POR GÉNERO ==========
  const maleCount = stats.maleCount || students.filter(s => s.gender === 'MASCULINO').length;
  const femaleCount = stats.femaleCount || students.filter(s => s.gender === 'FEMENINO').length;

  const genderBars = [];
  if (maleCount > 0) {
    genderBars.push(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:10px;color:${COLORS.textSub};min-width:100px">♂ Masculino</span>
        <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
          <div style="width:${Math.round((maleCount/total)*100)}%;height:100%;background:${COLORS.primary};border-radius:4px"></div>
        </div>
        <span style="font-size:10px;font-weight:700;color:${COLORS.primary};min-width:40px;text-align:right">${maleCount} (${Math.round((maleCount/total)*100)}%)</span>
      </div>
    `);
  }
  if (femaleCount > 0) {
    genderBars.push(`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:10px;color:${COLORS.textSub};min-width:100px">♀ Femenino</span>
        <div style="flex:1;background:${COLORS.border};border-radius:4px;height:8px">
          <div style="width:${Math.round((femaleCount/total)*100)}%;height:100%;background:${COLORS.pink};border-radius:4px"></div>
        </div>
        <span style="font-size:10px;font-weight:700;color:${COLORS.pink};min-width:40px;text-align:right">${femaleCount} (${Math.round((femaleCount/total)*100)}%)</span>
      </div>
    `);
  }

  // ========== DISTRIBUCIÓN POR DISTRITO ==========
  const districtMap = {};
  students.forEach(s => {
    const district = s.districtDescription || s.district || 'SIN DISTRITO';
    districtMap[district] = (districtMap[district] || 0) + 1;
  });

  const districtData = Object.entries(districtMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const districtBars = districtData.map((d, idx) => {
    const colors = [COLORS.accent, COLORS.purple, COLORS.teal, COLORS.orange, COLORS.success, COLORS.warning];
    const color = colors[idx % colors.length];
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:9px;color:${COLORS.textSub};min-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${d.name}">${d.name}</span>
        <div style="flex:1;background:${COLORS.border};border-radius:4px;height:6px">
          <div style="width:${Math.round((d.count/total)*100)}%;height:100%;background:${color};border-radius:4px"></div>
        </div>
        <span style="font-size:9px;font-weight:600;color:${color};min-width:30px;text-align:right">${d.count}</span>
      </div>
    `;
  }).join('');

  // ========== TABLA DE ESTUDIANTES MEJORADA ==========
  const tableRows = students.map((student, i) => {
    const genderIcon = student.gender === 'MASCULINO' ? '♂' : student.gender === 'FEMENINO' ? '♀' : '?';
    const genderColor = student.gender === 'MASCULINO' ? COLORS.primary : student.gender === 'FEMENINO' ? COLORS.pink : COLORS.textSub;
    
    const statusColor = student.statusCategory === 'Cursando' ? STATUS_COLORS.ACTIVE :
                        student.statusCategory === 'Completado' ? STATUS_COLORS.COMPLETED :
                        student.statusCategory === 'Reprobado' ? STATUS_COLORS.FAILED : COLORS.inactive;

    const attendanceValue = student.attendancePercentage ? (student.attendancePercentage * 100).toFixed(1) + '%' : '—';
    const scoreValue = student.averageScore ? student.averageScore.toFixed(1) : '—';

    return `
      <tr style="background:${i % 2 === 0 ? COLORS.white : COLORS.light}">
        <td style="padding:8px 10px;font-size:11px;border-bottom:1px solid ${COLORS.border}">
          <div style="font-weight:600;color:${COLORS.textMain}">${student.memberName || student.name || 'Sin nombre'}</div>
          <div style="font-size:9px;color:${COLORS.textSub};margin-top:2px">${student.document || 'Sin documento'}</div>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border};text-align:center">
          <span style="color:${genderColor};font-size:14px;font-weight:700">${genderIcon}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid ${COLORS.border}">
          <span style="background:${statusColor}15;color:${statusColor};padding:4px 8px;border-radius:12px;font-size:9px;font-weight:600;display:inline-block">
            ${student.statusCategory || '—'}
          </span>
        </td>
        <td style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${student.email || '—'}</td>
        <td style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${student.phone || '—'}</td>
        <td style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${student.districtDescription || student.district || '—'}</td>
        <td style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${attendanceValue}</td>
        <td style="padding:8px 10px;font-size:10px;color:${COLORS.textSub};border-bottom:1px solid ${COLORS.border}">${scoreValue}</td>
      </tr>
    `;
  }).join('');

  // ========== HTML COMPLETO ==========
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte ${displayLevel} - Estudiantes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #1e293b; font-size: 12px; }
    @page { size: A4 landscape; margin: 12mm 14mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-break { break-inside: avoid; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg, ${levelColor} 0%, ${COLORS.accent} 100%);border-radius:12px;padding:20px 24px;margin-bottom:18px;color:#fff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:10px;opacity:0.75;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">
          Sistema de Gestión de Miembros
        </div>
        <div style="font-size:22px;font-weight:800;margin-bottom:8px">
          📚 Reporte de Estudiantes - ${displayLevel}
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 12px;border-radius:12px">
            🎓 ${displayLevel}
          </span>
          <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 12px;border-radius:12px">
            📊 Total: ${total} estudiantes
          </span>
          <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;font-size:10px;padding:3px 12px;border-radius:12px">
            ✅ Aprobados: ${passedCount}
          </span>
        </div>
      </div>
      <div style="text-align:right;opacity:0.85">
        <div style="font-size:11px">Generado</div>
        <div style="font-size:14px;font-weight:700">${new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })}</div>
        <div style="font-size:10px;margin-top:4px">${new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}</div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px" class="no-break">
    ${kpiBoxes}
  </div>

  <!-- MÉTRICAS DE RENDIMIENTO -->
  ${performanceMetrics}

  <!-- DISTRIBUCIONES -->
  <div style="display:flex;gap:14px;margin-bottom:18px" class="no-break">
    <div style="flex:1;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:${levelColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid ${levelColor}">
        Distribución por Género
      </div>
      ${genderBars.length ? genderBars.join('') : '<p style="font-size:11px;color:#94a3b8">Sin datos de género</p>'}
    </div>
    <div style="flex:2;background:#fff;border:1px solid ${COLORS.border};border-radius:10px;padding:14px">
      <div style="font-size:11px;font-weight:800;color:${levelColor};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid ${levelColor}">
        Distribución por Distrito
      </div>
      ${districtBars || '<p style="font-size:11px;color:#94a3b8">Sin datos de distritos</p>'}
    </div>
  </div>

  <!-- TABLA DE ESTUDIANTES -->
  <div style="background:#fff;border:1px solid ${COLORS.border};border-radius:10px;overflow:hidden">
    <div style="background:${levelColor};padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
      <span style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Listado Detallado de Estudiantes</span>
      <span style="background:rgba(255,255,255,0.2);color:#fff;padding:3px 12px;border-radius:12px;font-size:10px;font-weight:700">${students.length} registros</span>
    </div>
    ${students.length === 0 ? `
      <div style="padding:30px;text-align:center;color:#94a3b8;font-size:12px">
        No hay estudiantes en este nivel.
      </div>
    ` : `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;min-width:1200px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:1px solid ${COLORS.border}">Nombre / Documento</th>
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:center;border-bottom:1px solid ${COLORS.border}">G</th>
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:1px solid ${COLORS.border}">Estado</th>
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:1px solid ${COLORS.border}">Email</th>
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:1px solid ${COLORS.border}">Teléfono</th>
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:1px solid ${COLORS.border}">Distrito</th>
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:1px solid ${COLORS.border}">Asistencia</th>
            <th style="padding:8px 10px;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;text-align:left;border-bottom:1px solid ${COLORS.border}">Nota Prom.</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    `}
  </div>

  <!-- FOOTER CON RESUMEN -->
  <div style="margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:9px;color:#94a3b8">
      Sistema de Gestión de Miembros • Reporte por Nivel • ${displayLevel}
    </div>
    <div style="display:flex;gap:20px;font-size:9px;color:#94a3b8">
      <span>📊 Total: ${total}</span>
      <span>✅ Aprobados: ${passedCount}</span>
      <span>📈 Asistencia: ${(averageAttendance * 100).toFixed(1)}%</span>
      <span>📝 Nota Prom: ${averageScore.toFixed(1)}</span>
    </div>
    <div style="font-size:9px;color:#94a3b8">
      Página 1 de 1
    </div>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=1400,height=850');
  if (!win) {
    alert('Por favor permite ventanas emergentes para generar el PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 400);
};