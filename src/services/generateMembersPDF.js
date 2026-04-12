/**
 * 📄 generateMembersPDF.js
 * Generador de PDF profesional para el listado de miembros usando jsPDF & AutoTable.
 * Elimina la dependencia de popups del navegador y garantiza una descarga directa y premium.
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

const GENDER_COLORS = {
  MASCULINO: [59, 130, 246], // Azul Indigo-500
  FEMENINO: [236, 72, 153],  // Rosa Rose-500
  M: [59, 130, 246],
  F: [236, 72, 153],
  OTRO: [139, 92, 246],      // Violet-500
};

const COLORS = {
  primary: [30, 64, 175],    // Indigo-800
  accent: [79, 70, 229],     // Indigo-600
  textMain: [30, 41, 59],    // Slate-800
  textLight: [100, 116, 139], // Slate-500
  border: [226, 232, 240],   // Slate-200
  white: [255, 255, 255],
  background: [248, 250, 252] // Slate-50
};

/**
 * Genera un PDF con el listado de miembros.
 */
export const generateMembersPDF = (
  members = [],
  filterSummary = [],
  filename = 'Reporte_Membresia'
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const totalMembers = members.length;
  const maleCount = members.filter(m => {
    const g = (m.gender || '').toUpperCase();
    return g.startsWith('M') || g.includes('HOMBRE');
  }).length;
  const femaleCount = members.filter(m => {
    const g = (m.gender || '').toUpperCase();
    return g.startsWith('F') || g.includes('MUJER');
  }).length;

  // --- HEADER: Fondo con Gradiente simulado ---
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 297, 45, 'F');
  
  // Decoración Header
  doc.setFillColor(255, 255, 255, 0.1);
  doc.circle(280, 0, 40, 'F');

  // Textos Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('REPORTE DE MEMBRESÍA', 15, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SISTEMA DE GESTIÓN PASTORAL • IGLESIA RAÍZ DE DAVID', 15, 30);

  // Fecha y Hora
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  doc.textAlign = 'right';
  doc.text(`Generado: ${dateStr}`, 282, 22, { align: 'right' });
  doc.text(`Hora: ${timeStr}`, 282, 28, { align: 'right' });
  doc.textAlign = 'left';

  // --- FILTROS ---
  if (filterSummary.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FILTROS ACTIVOS:', 15, 38);
    doc.setFont('helvetica', 'normal');
    const filtersStr = filterSummary.join('  |  ');
    doc.text(filtersStr, 48, 38);
  }

  // --- KPI CARDS ---
  const drawKPI = (x, y, label, value, color) => {
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(x, y, 65, 25, 3, 3, 'FD');
    
    doc.setFillColor(...color);
    doc.rect(x, y, 2, 25, 'F'); // Borde lateral color

    doc.setTextColor(...color);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), x + 32.5, y + 12, { align: 'center' });
    
    doc.setTextColor(...COLORS.textLight);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'black');
    doc.text(label.toUpperCase(), x + 32.5, y + 20, { align: 'center' });
  };

  drawKPI(15, 50, 'Total Integrantes', totalMembers, COLORS.accent);
  drawKPI(85, 50, 'Hombres (♂)', maleCount, GENDER_COLORS.MASCULINO);
  drawKPI(155, 50, 'Mujeres (♀)', femaleCount, GENDER_COLORS.FEMENINO);
  drawKPI(225, 50, 'Fecha Reporte', now.getDate() + '/' + (now.getMonth() + 1), [16, 185, 129]);

  // --- TABLA DE MIEMBROS ---
  const tableData = members.map((m, index) => [
    m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || '—',
    m.document || '—',
    m.email || '—',
    m.phone || '—',
    m.district || 'D1',
    (m.gender || '').toUpperCase().startsWith('F') ? 'Femenino' : 'Masculino',
    m.leader?.name || '—'
  ]);

  doc.autoTable({
    startY: 85,
    head: [['NOMBRE COMPLETO', 'DOCUMENTO', 'CORREO ELECTRÓNICO', 'TELÉFONO', 'DISTRITO', 'GÉNERO', 'LÍDER ASIGNADO']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.textMain,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [250, 251, 253]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 25 },
      5: { halign: 'center', cellWidth: 25 }
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Footer en cada página
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.text(
        `Página ${pageCount} | Generado por PastoreApp Cloud`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
  });

  // Guardar el PDF
  const timestamp = now.toISOString().split('T')[0];
  doc.save(`${filename}_${timestamp}.pdf`);
};

export const generateCompleteMembersPDF = (members = [], filename = 'Membresia_Completa') =>
  generateMembersPDF(members, [], filename);