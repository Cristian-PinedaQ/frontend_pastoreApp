// services/generateCohortExcel.js
// Exportación de estudiantes de cohorte en formato CSV optimizado para Microsoft Excel (delimitado por punto y coma y con BOM UTF-8)

const normalizeGender = (value) => {
  if (!value) return 'N/A';
  const v = value.toString().toUpperCase().trim();
  if (['M', 'MALE', 'MASCULINO', 'HOMBRE', 'H'].includes(v)) return 'Masculino';
  if (['F', 'FEMALE', 'FEMENINO', 'MUJER'].includes(v))       return 'Femenino';
  return 'N/A';
};

/**
 * Genera y descarga un archivo CSV compatible con Excel con la lista de estudiantes
 * y su respectiva jerarquía de liderazgo.
 *
 * @param {Object} enrollment - Objeto cohorte
 * @param {Object} reportData - HierarchyReportDTO del backend
 */
export const generateCohortExcel = (enrollment, reportData = {}) => {
  const cohortTitle = reportData.cohortName || enrollment.cohortName || `Cohorte ${enrollment.id}`;

  const headers = [
    'N°',
    'Estudiante',
    'Género',
    'Asistencia (%)',
    'Promedio',
    'Estado',
    'Aprobado',
    'Pastor / Pastora',
    'Líder 12 (Red)',
    'Líder 144 (Rama)',
    'Líder Directo'
  ];

  const rows = [];

  const extractStudents = (node, pastorName, l12Name, l144Name) => {
    if (!node) return;

    let currentPastor = pastorName;
    let currentL12 = l12Name;
    let currentL144 = l144Name;

    if (node.type === 'PASTOR') {
      currentPastor = node.name;
    } else if (node.type === 'LEADER_12') {
      currentL12 = node.name;
    } else if (node.type === 'LEADER_144') {
      currentL144 = node.name;
    } else if (node.type === 'UNASSIGNED') {
      currentL12 = 'Sin Red Definida';
    }

    // Agregar estudiantes
    if (node.students) {
      node.students.forEach(s => {
        rows.push([
          s.name,
          normalizeGender(s.gender),
          s.attendancePercentage !== undefined && s.attendancePercentage !== null
            ? `${s.attendancePercentage.toFixed(0)}%`
            : '—',
          s.averageScore !== undefined && s.averageScore !== null
            ? s.averageScore.toFixed(2)
            : '—',
          s.status || '—',
          s.passed ? 'SÍ' : 'NO',
          currentPastor || '—',
          currentL12 || '—',
          currentL144 || '—',
          s.directLeaderName || '—'
        ]);
      });
    }

    // Procesar recursivamente los hijos
    if (node.children) {
      node.children.forEach(child => {
        extractStudents(child, currentPastor, currentL12, currentL144);
      });
    }
  };

  // Extraer de ambas redes
  extractStudents(reportData.maleNetwork, '', '', '');
  extractStudents(reportData.femaleNetwork, '', '', '');

  // Construir CSV delimitado por punto y coma
  let csvContent = headers.join(';') + '\r\n';

  rows.forEach((row, idx) => {
    const formattedRow = [
      idx + 1,
      ...row.map(val => {
        const text = String(val).replace(/"/g, '""');
        // Si contiene caracteres conflictivos, envolver en comillas dobles
        return text.includes(';') || text.includes('\n') || text.includes('"')
          ? `"${text}"`
          : text;
      })
    ];
    csvContent += formattedRow.join(';') + '\r\n';
  });

  // UTF-8 BOM
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Reporte_${cohortTitle.replace(/\s+/g, '_')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
