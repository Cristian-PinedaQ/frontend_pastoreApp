// 📄 pdfGenerator.js - Generador de PDF para reportes de estudiantes
// Usa jsPDF y autoTable para crear PDFs profesionales

// Asegúrate de instalar:
// npm install jspdf autotable

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generar PDF de listado de estudiantes
 * @param {Object} data - Datos para el PDF
 * @param {string} filename - Nombre del archivo sin extensión
 */
export const generatePDF = (data, filename = 'reporte') => {
  try {
    console.log('📄 Iniciando generación de PDF...');

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
    doc.text('📚 REPORTE DE ESTUDIANTES', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`, pageWidth / 2, 20, { align: 'center' });

    yPosition = 35;

    // ========== INFORMACIÓN GENERAL ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Reporte', 15, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Título: ${data.title || 'Listado de Estudiantes'}`, 15, yPosition);
    yPosition += 6;
    doc.text(`Nivel: ${data.level || 'Todos los Niveles'}`, 15, yPosition);
    yPosition += 6;
    doc.text(`Fecha: ${data.date}`, 15, yPosition);
    yPosition += 10;

    // ========== TABLA DE ESTUDIANTES ==========
    if (data.students && data.students.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Listado de Estudiantes', 15, yPosition);
      yPosition += 8;

      const tableColumns = [
        { header: 'Estudiante', dataKey: 'studentName' },
        { header: 'Nivel', dataKey: 'levelEnrollment' },
        { header: 'Estado', dataKey: 'status' },
        { header: 'Asistencia %', dataKey: 'attendancePercentage' },
        { header: 'Resultado', dataKey: 'passed' },
      ];

      const tableData = data.students.map(student => ({
        studentName: student.studentName || '',
        levelEnrollment: student.levelEnrollment || '',
        status: getStatusLabel(student.status) || '',
        attendancePercentage: `${(student.attendancePercentage || 0).toFixed(1)}%`,
        passed: student.passed === true ? '✅ Aprobado' : student.passed === false ? '❌ Reprobado' : '⏳ Pendiente',
      }));

      autoTable(doc, {
        columns: tableColumns,
        body: tableData,
        startY: yPosition,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 9,
          cellPadding: 4,
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
          0: { cellWidth: 50 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== ESTADÍSTICAS ==========
    if (data.statistics && Object.keys(data.statistics).length > 0) {
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
        { header: '% Aprobación', dataKey: 'passPercentage' },
      ];

      const statsData = Object.entries(data.statistics).map(([key, stat]) => ({
        label: stat.label || key,
        total: stat.total || 0,
        passed: stat.passed || 0,
        failed: stat.failed || 0,
        passPercentage: `${stat.passPercentage || 0}%`,
      }));

      autoTable(doc, {
        columns: statsColumns,
        body: statsData,
        startY: yPosition,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 9,
          cellPadding: 4,
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
          4: { cellWidth: 35 },
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== RESUMEN GENERAL ==========
    if (data.statistics) {
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

      const totalStudents = Object.values(data.statistics).reduce((sum, s) => sum + (s.total || 0), 0);
      const totalPassed = Object.values(data.statistics).reduce((sum, s) => sum + (s.passed || 0), 0);
      const totalFailed = Object.values(data.statistics).reduce((sum, s) => sum + (s.failed || 0), 0);
      const overallPercentage = totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0;

      doc.text(`Total de Estudiantes: ${totalStudents}`, 15, yPosition);
      yPosition += 7;
      doc.text(`Estudiantes Aprobados: ${totalPassed}`, 15, yPosition);
      yPosition += 7;
      doc.text(`Estudiantes Reprobados: ${totalFailed}`, 15, yPosition);
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
    const fullFilename = `${filename}_${timestamp}.pdf`;

    doc.save(fullFilename);
    console.log('✅ PDF generado exitosamente:', fullFilename);

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar PDF: ' + error.message);
    throw error;
  }
};

/**
 * Generar PDF de estadísticas con tablas
 * @param {Object} statistics - Datos de estadísticas
 * @param {string} filename - Nombre del archivo
 */
export const generateStatisticsPDF = (statistics, filename = 'estadisticas') => {
  try {
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
    doc.text('📊 ESTADÍSTICAS DE ESTUDIANTES', pageWidth / 2, 12, { align: 'center' });

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

    const columns = [
      { header: 'Nivel', dataKey: 'label' },
      { header: 'Total', dataKey: 'total' },
      { header: 'Aprobados', dataKey: 'passed' },
      { header: 'Reprobados', dataKey: 'failed' },
      { header: '% Aprobación', dataKey: 'passPercentage' },
    ];

    const rows = Object.entries(statistics).map(([key, stat]) => ({
      label: stat.label,
      total: stat.total,
      passed: stat.passed,
      failed: stat.failed,
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
        0: { cellWidth: 60 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
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
    const overallPercentage = totalStudents > 0 ? ((totalPassed / totalStudents) * 100).toFixed(1) : 0;

    const summaryData = [
      { label: 'Total de Estudiantes', value: totalStudents },
      { label: 'Estudiantes Aprobados', value: totalPassed },
      { label: 'Estudiantes Reprobados', value: totalFailed },
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
    const fullFilename = `${filename}_${timestamp}.pdf`;

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