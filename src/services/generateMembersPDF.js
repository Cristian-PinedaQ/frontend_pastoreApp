// 📄 membersPdfGenerator.js - Generador de PDF para reportes de miembros
// Usa jsPDF y autoTable para crear PDFs profesionales con los resultados filtrados

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generar PDF de miembros filtrados
 * @param {Array} members - Lista de miembros a exportar
 * @param {Array} filterSummary - Array con resumen de filtros aplicados
 * @param {string} filename - Nombre del archivo sin extensión
 */
export const generateMembersPDF = (members = [], filterSummary = [], filename = 'reporte_miembros') => {
  try {
    console.log('📄 Iniciando generación de PDF de miembros...');
    console.log(`   Total de miembros: ${members.length}`);
    console.log(`   Filtros aplicados: ${filterSummary.length}`);

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
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE MIEMBROS', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO');
    const timeStr = now.toLocaleTimeString('es-CO');
    doc.text(
      `Generado: ${dateStr} ${timeStr}`,
      pageWidth / 2,
      22,
      { align: 'center' }
    );

    yPosition = 40;

    // ========== INFORMACIÓN DEL REPORTE ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Reporte', 15, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total de Miembros: ${members.length}`, 15, yPosition);
    yPosition += 6;

    // ========== FILTROS APLICADOS ==========
    if (filterSummary && filterSummary.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(102, 126, 234);
      doc.text('Filtros Aplicados:', 15, yPosition);
      yPosition += 6;

      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      filterSummary.forEach((filter) => {
        doc.text(`• ${filter}`, 20, yPosition);
        yPosition += 5;
      });

      yPosition += 2;
    }

    // ========== TABLA DE MIEMBROS ==========
    if (members && members.length > 0) {
      // Nueva página si es necesario
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Listado de Miembros', 15, yPosition);
      yPosition += 8;

      const tableColumns = [
        { header: 'Nombre', dataKey: 'name' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Teléfono', dataKey: 'phone' },
        { header: 'Género', dataKey: 'gender' },
        { header: 'Distrito', dataKey: 'district' },
        { header: 'Líder', dataKey: 'leader' },
      ];

      const tableData = members.map((member) => ({
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '-',
        gender: member.gender === 'MASCULINO' ? 'Masculino' : member.gender === 'FEMENINO' ? 'Femenino' : '-',
        district: member.district || '-',
        leader: member.leader?.name || '-',
      }));

      autoTable(doc, {
        columns: tableColumns,
        body: tableData,
        startY: yPosition,
        margin: { left: 12, right: 12 },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 45 },
          2: { cellWidth: 25 },
          3: { cellWidth: 18 },
          4: { cellWidth: 20 },
          5: { cellWidth: 35 },
        },
        didDrawPage: (data) => {
          // Footer en cada página
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.getHeight();
          const pageNumber = doc.internal.pages.length - 1;

          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${pageNumber} de ${doc.internal.pages.length - 1}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
          );
        },
      });

      yPosition = doc.lastAutoTable.finalY + 12;
    }

    // ========== ESTADÍSTICAS GENERALES ==========
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(102, 126, 234);
    doc.text('Estadísticas Generales', 15, yPosition);
    yPosition += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    // Calcular estadísticas
    const totalMembers = members.length;
    const maleCount = members.filter((m) => m.gender === 'MASCULINO').length;
    const femaleCount = members.filter((m) => m.gender === 'FEMENINO').length;
    const withLeaderCount = members.filter((m) => m.leader).length;
    const withoutLeaderCount = members.filter((m) => !m.leader).length;

    // Contar por distrito
    const districtCounts = {};
    members.forEach((member) => {
      const district = member.district || 'Sin Asignar';
      districtCounts[district] = (districtCounts[district] || 0) + 1;
    });

    // Mostrar estadísticas
    doc.text(`Total de Miembros: ${totalMembers}`, 15, yPosition);
    yPosition += 7;
    doc.text(`Hombres: ${maleCount} (${totalMembers > 0 ? ((maleCount / totalMembers) * 100).toFixed(1) : 0}%)`, 15, yPosition);
    yPosition += 7;
    doc.text(`Mujeres: ${femaleCount} (${totalMembers > 0 ? ((femaleCount / totalMembers) * 100).toFixed(1) : 0}%)`, 15, yPosition);
    yPosition += 7;

    // Tabla de distritos
    if (Object.keys(districtCounts).length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(102, 126, 234);
      doc.text('Distribución por Distrito', 15, yPosition);
      yPosition += 8;

      const districtColumns = [
        { header: 'Distrito', dataKey: 'district' },
        { header: 'Cantidad', dataKey: 'count' },
        { header: 'Porcentaje', dataKey: 'percentage' },
      ];

      const districtData = Object.entries(districtCounts).map(([district, count]) => ({
        district: district,
        count: count,
        percentage: `${((count / totalMembers) * 100).toFixed(1)}%`,
      }));

      autoTable(doc, {
        columns: districtColumns,
        body: districtData,
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
          0: { cellWidth: 80 },
          1: { cellWidth: 30 },
          2: { cellWidth: 40 },
        },
      });
    }

    // ========== FOOTER FINAL ==========
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const currentPageHeight = doc.internal.pageSize.getHeight();
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        currentPageHeight - 8,
        { align: 'center' }
      );

      // Línea divisora
      doc.setDrawColor(200, 200, 200);
      doc.line(12, currentPageHeight - 12, pageWidth - 12, currentPageHeight - 12);
    }

    // ========== GUARDAR ==========
    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${timestamp}.pdf`;

    doc.save(fullFilename);
    console.log('✅ PDF de miembros generado exitosamente:', fullFilename);

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar PDF: ' + error.message);
    throw error;
  }
};

/**
 * Generar PDF de miembros sin filtros (completo)
 * @param {Array} members - Lista de miembros
 * @param {string} filename - Nombre del archivo
 */
export const generateCompleteMembersPDF = (members = [], filename = 'miembros_completo') => {
  return generateMembersPDF(members, [], filename);
};