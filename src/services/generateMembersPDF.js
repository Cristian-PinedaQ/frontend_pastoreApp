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
export const generateMembersPDF = (
  members = [],
  filterSummary = [],
  filename = 'reporte_miembros'
) => {
  try {
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

    const now = new Date();
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(
      `Generado: ${now.toLocaleDateString('es-CO')} ${now.toLocaleTimeString(
        'es-CO'
      )}`,
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
    if (filterSummary.length > 0) {
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

      yPosition += 3;
    }

    // ========== TABLA DE MIEMBROS ==========
    if (members.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
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

      const tableData = members.map((m) => ({
        name: m.name || '',
        email: m.email || '',
        phone: m.phone || '-',
        gender:
          m.gender === 'MASCULINO'
            ? 'Masculino'
            : m.gender === 'FEMENINO'
            ? 'Femenino'
            : '-',
        district: m.district || '-',
        leader: m.leader?.name || '-',
      }));

      autoTable(doc, {
        columns: tableColumns,
        body: tableData,
        startY: yPosition,
        margin: { left: 12, right: 12 },
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
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

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const totalMembers = members.length;
    const maleCount = members.filter((m) => m.gender === 'MASCULINO').length;
    const femaleCount = members.filter((m) => m.gender === 'FEMENINO').length;
    const withLeaderCount = members.filter((m) => m.leader).length;
    const withoutLeaderCount = members.filter((m) => !m.leader).length;

    doc.text(`Total de Miembros: ${totalMembers}`, 15, yPosition);
    yPosition += 7;

    doc.text(
      `Hombres: ${maleCount} (${totalMembers ? (
        (maleCount / totalMembers) *
        100
      ).toFixed(1) : 0}%)`,
      15,
      yPosition
    );
    yPosition += 7;

    doc.text(
      `Mujeres: ${femaleCount} (${totalMembers ? (
        (femaleCount / totalMembers) *
        100
      ).toFixed(1) : 0}%)`,
      15,
      yPosition
    );
    yPosition += 7;

    doc.text(
      `Con Líder: ${withLeaderCount} (${totalMembers ? (
        (withLeaderCount / totalMembers) *
        100
      ).toFixed(1) : 0}%)`,
      15,
      yPosition
    );
    yPosition += 7;

    doc.text(
      `Sin Líder: ${withoutLeaderCount} (${totalMembers ? (
        (withoutLeaderCount / totalMembers) *
        100
      ).toFixed(1) : 0}%)`,
      15,
      yPosition
    );
    yPosition += 10;

    // ========== FOOTER ==========
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    // ========== GUARDAR ==========
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`${filename}_${timestamp}.pdf`);
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar PDF: ' + error.message);
    throw error;
  }
};

/**
 * Generar PDF completo sin filtros
 */
export const generateCompleteMembersPDF = (members = [], filename = 'miembros_completo') =>
  generateMembersPDF(members, [], filename);
