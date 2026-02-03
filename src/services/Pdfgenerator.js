// 📄 pdfGenerator.js - Generador de PDF para reportes de estudiantes (v3 - MEJORADO)
// ✅ Usa jsPDF y autoTable para crear PDFs profesionales con soporte para filtros
// ✅ Muestra fecha correctamente: "Año 2025 - Fecha del reporte: 31/01/2025"
// ✅ Compatible con ambas formas de llamada (desde StudentsPage y ModalStatistics)

// Asegúrate de instalar:
// npm install jspdf autotable

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generar PDF de listado de estudiantes con filtros
 * @param {Object} config - Configuración del PDF
 * @param {string} filenameParam - Nombre del archivo (segundo parámetro, opcional)
 */
export const generatePDF = (config, filenameParam = 'reporte') => {
  try {
    // ✅ ARREGLADO: Eliminadas variables no usadas (hasFilters, filtersInfo)
    // Destructurar con flexibilidad para ambas estructuras de datos
    const {
      title,
      level,
      year,
      date,
      students = [],
      statistics = {},
      // Compatibilidad con estructura anterior
      data,
      filteredStudents,
      filteredStatistics,
      filterLevel = null,
      filterYear = null,
      filterStatus = null,
      filename: configFilename = null,
    } = config;

    // Determinar valores correctos según estructura de datos
    const studentsData = students || filteredStudents || data?.students || [];
    const statsData = statistics || filteredStatistics || data?.statistics || {};
    const titleData = title || data?.title || 'Listado de Estudiantes';
    const levelData = level || filterLevel || data?.level || 'Todos los Niveles';
    const yearData = year || filterYear || data?.year || 'Todos los Años';
    const filename = filenameParam || configFilename || 'reporte';
    const statusFilter = filterStatus;

    // ========== GENERAR FECHA CORRECTAMENTE ==========
    // Si hay filtro de año: "Año 2025 - Fecha del reporte: 31/01/2025"
    // Sin filtro de año: "Fecha del reporte: 31/01/2025"
    let dateStringValue = '';
    if (yearData !== 'Todos los Años' && yearData !== 'ALL') {
      const reportDate = new Date().toLocaleDateString('es-CO');
      dateStringValue = `Año ${yearData} - Fecha del reporte: ${reportDate}`;
    } else {
      const reportDate = date || new Date().toLocaleDateString('es-CO');
      dateStringValue = `Fecha del reporte: ${reportDate}`;
    }

    console.log('📄 Iniciando generación de PDF con filtros...');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // ========== HEADER ==========
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE ESTUDIANTES', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 20, { align: 'center' });

    yPosition = 35;

    // ========== INFORMACIÓN GENERAL CON FILTROS ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Reporte', 15, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Título: ${titleData}`, 15, yPosition);
    yPosition += 6;
    doc.text(`Nivel: ${levelData}`, 15, yPosition);
    yPosition += 6;
    doc.text(`${dateStringValue}`, 15, yPosition);
    yPosition += 10;

    // ========== TABLA DE ESTUDIANTES FILTRADA ==========
    const studentsToDisplay = studentsData.length > 0 ? studentsData : [];
    
    if (studentsToDisplay.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Listado de Estudiantes${yearData !== 'Todos los Años' && yearData !== 'ALL' ? ` - Año ${yearData}` : ''}`, 15, yPosition);
      yPosition += 8;

      const tableColumns = [
        { header: 'Estudiante', dataKey: 'studentName' },
        { header: 'Nivel', dataKey: 'levelEnrollment' },
        { header: 'Año', dataKey: 'year' },
        { header: 'Estado', dataKey: 'status' },
        { header: 'Asistencia %', dataKey: 'attendancePercentage' },
        { header: 'Resultado', dataKey: 'passed' },
      ];

      const tableData = studentsToDisplay.map(student => {
        // Extraer año de la fecha de inscripción
        let enrollYear = '-';
        if (student.enrollmentDate) {
          try {
            enrollYear = new Date(student.enrollmentDate).getFullYear().toString();
          } catch (e) {
            enrollYear = '-';
          }
        }

        return {
          studentName: student.studentName || '',
          levelEnrollment: student.levelEnrollment || '',
          year: enrollYear,
          status: getStatusLabel(student.status) || '',
          attendancePercentage: `${(student.attendancePercentage || 0).toFixed(1)}%`,
          passed: student.passed === true ? '✅ Aprobado' : student.passed === false ? '❌ Reprobado' : '⏳ Pendiente',
        };
      });

      autoTable(doc, {
        columns: tableColumns,
        body: tableData,
        startY: yPosition,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 30 },
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.text('No hay estudiantes que mostrar con los filtros seleccionados.', 15, yPosition);
      yPosition += 10;
    }

    // ========== ESTADÍSTICAS FILTRADAS ==========
    const statsToDisplay = statsData && Object.keys(statsData).length > 0 ? statsData : {};
    
    if (Object.keys(statsToDisplay).length > 0) {
      // Nueva página si es necesario
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(102, 126, 234);
      doc.text('Estadísticas por Nivel', 15, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);

      const statsColumns = [
        { header: 'Nivel', dataKey: 'label' },
        { header: 'Total', dataKey: 'total' },
        { header: 'Aprobados', dataKey: 'passed' },
        { header: 'Reprobados', dataKey: 'failed' },
        { header: 'Pendientes', dataKey: 'pending' },
        { header: '% Aprobación', dataKey: 'passPercentage' },
      ];

      const statsDataArray = Object.entries(statsToDisplay).map(([key, stat]) => ({
        label: stat.label || key,
        total: stat.total || 0,
        passed: stat.passed || 0,
        failed: stat.failed || 0,
        pending: stat.pending || 0,
        passPercentage: `${stat.passPercentage || 0}%`,
      }));

      autoTable(doc, {
        columns: statsColumns,
        body: statsDataArray,
        startY: yPosition,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [240, 147, 251],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [255, 251, 235],
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 30 },
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== RESUMEN GENERAL ==========
    if (Object.keys(statsToDisplay).length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(102, 126, 234);
      doc.text('Resumen General', 15, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      const totalStudents = Object.values(statsToDisplay).reduce((sum, s) => sum + (s.total || 0), 0);
      const totalPassed = Object.values(statsToDisplay).reduce((sum, s) => sum + (s.passed || 0), 0);
      const totalFailed = Object.values(statsToDisplay).reduce((sum, s) => sum + (s.failed || 0), 0);
      const totalPending = Object.values(statsToDisplay).reduce((sum, s) => sum + (s.pending || 0), 0);
      const overallPercentage = totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0;

      doc.text(`Total de Estudiantes: ${totalStudents}`, 15, yPosition);
      yPosition += 7;
      doc.text(`Estudiantes Aprobados: ${totalPassed}`, 15, yPosition);
      yPosition += 7;
      doc.text(`Estudiantes Reprobados: ${totalFailed}`, 15, yPosition);
      yPosition += 7;
      doc.text(`Estudiantes Pendientes: ${totalPending}`, 15, yPosition);
      yPosition += 7;
      doc.text(`Tasa de Aprobación General: ${overallPercentage}%`, 15, yPosition);
    }

    // ========== FOOTER ==========
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // ========== GUARDAR ==========
    const timestamp = new Date().toISOString().split('T')[0];
    const filterParts = [];
    
    if (yearData !== 'Todos los Años' && yearData !== 'ALL') {
      filterParts.push(yearData);
    }
    if (levelData !== 'Todos los Niveles' && levelData !== 'ALL') {
      filterParts.push(levelData.replace(/\s+/g, '_'));
    }
    if (statusFilter) {
      filterParts.push(statusFilter);
    }
    
    const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : '';
    const fullFilename = `${filename}${filterSuffix}_${timestamp}.pdf`;

    doc.save(fullFilename);
    console.log('✅ PDF generado exitosamente:', fullFilename);

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar PDF: ' + error.message);
    throw error;
  }
};

/**
 * Generar PDF de estadísticas con tablas (versión filtrada)
 * @param {Object} config - Configuración del PDF
 * @param {string} filenameParam - Nombre del archivo (segundo parámetro, opcional)
 */
export const generateStatisticsPDF = (config, filenameParam = 'estadisticas') => {
  try {
    // ✅ ARREGLADO: Eliminadas variables no usadas (title, date)
    const {
      statistics,
      filteredStatistics = null,
      filename: configFilename,
      filterYear = null,
      filterLevel = null,
      year,
    } = config;

    const filename = filenameParam || configFilename || 'estadisticas';
    const yearData = year || filterYear;

    console.log('📊 Iniciando generación de PDF de estadísticas...');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // ========== HEADER ==========
    doc.setFillColor(240, 147, 251);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const pdfTitle = yearData && yearData !== 'Todos los Años' && yearData !== 'ALL'
      ? `📊 ESTADÍSTICAS - AÑO ${yearData}`
      : '📊 ESTADÍSTICAS DE ESTUDIANTES';
    doc.text(pdfTitle, pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 20, { align: 'center' });

    yPosition = 35;

    // ========== TABLA PRINCIPAL ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Desempeño por Nivel', 15, yPosition);
    yPosition += 8;

    const statsToDisplay = filteredStatistics || statistics;
    const columns = [
      { header: 'Nivel', dataKey: 'label' },
      { header: 'Total', dataKey: 'total' },
      { header: 'Aprobados', dataKey: 'passed' },
      { header: 'Reprobados', dataKey: 'failed' },
      { header: 'Pendientes', dataKey: 'pending' },
      { header: '% Aprobación', dataKey: 'passPercentage' },
    ];

    const rows = Object.entries(statsToDisplay).map(([key, stat]) => ({
      label: stat.label,
      total: stat.total,
      passed: stat.passed,
      failed: stat.failed,
      pending: stat.pending || 0,
      passPercentage: `${stat.passPercentage}%`,
    }));

    autoTable(doc, {
      columns,
      body: rows,
      startY: yPosition,
      margin: { left: 15, right: 15 },
      styles: {
        fontSize: 10,
        cellPadding: 5,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [240, 147, 251],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [255, 251, 235],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 40 },
      },
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // ========== TOTALES ==========
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(240, 147, 251);
    doc.text('Totales Generales', 15, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    const totalStudents = rows.reduce((sum, row) => sum + row.total, 0);
    const totalPassed = rows.reduce((sum, row) => sum + row.passed, 0);
    const totalFailed = rows.reduce((sum, row) => sum + row.failed, 0);
    const totalPending = rows.reduce((sum, row) => sum + row.pending, 0);
    const overallPercentage = totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0;

    const summaryData = [
      { label: 'Total de Estudiantes', value: totalStudents },
      { label: 'Estudiantes Aprobados', value: totalPassed },
      { label: 'Estudiantes Reprobados', value: totalFailed },
      { label: 'Estudiantes Pendientes', value: totalPending },
      { label: 'Tasa de Aprobación', value: `${overallPercentage}%` },
    ];

    summaryData.forEach((item, index) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 15;
      }
      doc.text(`${item.label}: ${item.value}`, 15, yPosition);
      yPosition += 8;
    });

    // ========== FOOTER ==========
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const currentPageHeight = doc.internal.pageSize.getHeight();
      doc.text(
        `Página ${i} de ${totalPages}`,
        doc.internal.pageSize.getWidth() / 2,
        currentPageHeight - 10,
        { align: 'center' }
      );
    }

    // ========== GUARDAR ==========
    const timestamp = new Date().toISOString().split('T')[0];
    const filterParts = [];
    
    if (yearData && yearData !== 'Todos los Años' && yearData !== 'ALL') {
      filterParts.push(yearData);
    }
    if (filterLevel && filterLevel !== 'ALL') {
      filterParts.push(filterLevel.replace(/\s+/g, '_'));
    }
    
    const filterSuffix = filterParts.length > 0 ? `_${filterParts.join('_')}` : '';
    const fullFilename = `${filename}${filterSuffix}_${timestamp}.pdf`;

    doc.save(fullFilename);
    console.log('✅ PDF de estadísticas generado:', fullFilename);

  } catch (error) {
    console.error('❌ Error generando PDF de estadísticas:', error);
    alert('Error al generar PDF: ' + error.message);
    throw error;
  }
};

// Helper para obtener etiqueta de estado
const getStatusLabel = (status) => {
  const statusMap = {
    ACTIVE: 'Activo',
    COMPLETED: 'Completado',
    FAILED: 'Reprobado',
    CANCELLED: 'Cancelado',
    PENDING: 'Pendiente',
    SUSPENDED: 'Suspendido',
  };

  return statusMap[status] || status;
};