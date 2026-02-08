// services/participantsGeneralPdfGenerator.js
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Colores para el PDF
const COLORS = {
  primary: [59, 130, 246],    // Azul
  success: [16, 185, 129],    // Verde
  danger: [239, 68, 68],      // Rojo
  warning: [245, 158, 11],    // Amarillo
  info: [8, 145, 178],        // Azul info
  dark: [107, 114, 128],      // Gris oscuro
  light: [243, 244, 246],     // Gris claro
  border: [229, 231, 235],    // Borde gris
  text: [17, 24, 39],         // Texto negro
  textSecondary: [75, 85, 99], // Texto gris
  textTertiary: [107, 114, 128], // Texto gris claro
};

// Helper para formatear moneda
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "$ 0";
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper para formatear fecha
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '-';
  }
};

// Helper para calcular estadísticas
const calculateStatistics = (participants) => {
  const stats = {
    total: participants.length,
    fullyPaid: participants.filter(p => p.isFullyPaid).length,
    partiallyPaid: participants.filter(p => (p.totalPaid || 0) > 0 && !p.isFullyPaid).length,
    pending: participants.filter(p => (p.totalPaid || 0) === 0).length,
    totalPaid: participants.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    totalPending: participants.reduce((sum, p) => sum + (p.pendingBalance || 0), 0),
  };
  
  stats.percentagePaid = stats.totalPaid + stats.totalPending > 0 
    ? (stats.totalPaid / (stats.totalPaid + stats.totalPending) * 100).toFixed(1)
    : 0;
    
  return stats;
};

/**
 * Genera un PDF general de todos los participantes de una actividad
 * @param {Object} data - Datos para el reporte general
 * @param {string} filename - Nombre del archivo
 */
export const generateGeneralParticipantsPDF = (data, filename = 'participantes-general') => {
  try {
    console.log('📄 [generateGeneralParticipantsPDF] Generando PDF general de participantes...');
    
    const { activity, participants, filters, statistics: providedStats } = data;
    
    if (!participants || participants.length === 0) {
      console.error('❌ No hay participantes para generar el PDF');
      alert('No hay participantes para generar el reporte');
      return false;
    }
    
    // Calcular estadísticas si no se proporcionan
    const stats = providedStats || calculateStatistics(participants);
    
    // Crear documento PDF en orientación horizontal para mejor visualización de tablas
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;
    
    // ========== ENCABEZADO PRINCIPAL ==========
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Título principal
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('REPORTE GENERAL DE PARTICIPANTES', pageWidth / 2, 12, { align: 'center' });
    
    // Nombre de la actividad
    doc.setFontSize(14);
    doc.text(activity?.name || 'Actividad sin nombre', pageWidth / 2, 20, { align: 'center' });
    
    yPos = 30;
    
    // ========== METADATOS DEL REPORTE ==========
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    
    const fechaGeneracion = new Date().toLocaleDateString('es-CO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    doc.text(`Generado: ${fechaGeneracion}`, margin, yPos);
    
    // Información de filtros aplicados
    if (filters) {
      const appliedFilters = [];
      if (filters.searchText) appliedFilters.push(`Búsqueda: "${filters.searchText}"`);
      if (filters.leaderFilter) appliedFilters.push(`Líder: ${filters.leaderFilter}`);
      if (filters.districtFilter) appliedFilters.push(`Distrito: ${filters.districtFilter}`);
      
      if (appliedFilters.length > 0) {
        doc.text(`Filtros aplicados: ${appliedFilters.join(', ')}`, pageWidth - margin, yPos, { align: 'right' });
      }
    }
    
    yPos += 8;
    
    // ========== RESUMEN DE LA ACTIVIDAD ==========
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('RESUMEN DE LA ACTIVIDAD', margin, yPos);
    yPos += 7;
    
    const activitySummary = [
      ['Nombre:', activity?.name || 'No disponible'],
      ['Precio por participante:', formatCurrency(activity?.price || 0)],
      ['Cantidad máxima:', activity?.quantity || 'Sin límite'],
      ['Fecha fin:', activity?.endDate ? formatDate(activity.endDate) : 'No definida'],
      ['Estado:', activity?.isActive ? 'Activa' : 'Inactiva'],
    ];
    
    doc.autoTable({
      startY: yPos,
      body: activitySummary,
      margin: { left: margin, right: margin },
      theme: 'plain',
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: COLORS.text,
        lineColor: [255, 255, 255],
      },
      columnStyles: {
        0: { 
          cellWidth: 40,
          fontStyle: 'bold',
          textColor: COLORS.textSecondary
        },
        1: { 
          cellWidth: pageWidth - margin * 2 - 40,
        },
      },
      styles: {
        lineWidth: 0,
      },
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // ========== ESTADÍSTICAS GENERALES ==========
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('ESTADÍSTICAS GENERALES', margin + 5, yPos + 7);
    
    const statsX = margin + 5;
    const statsY = yPos + 15;
    const statsWidth = (pageWidth - margin * 2 - 20) / 6;
    
    // Total participantes
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Total:', statsX, statsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(stats.total.toString(), statsX, statsY + 5);
    
    // Completamente pagado
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Completado:', statsX + statsWidth, statsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.success);
    doc.text(stats.fullyPaid.toString(), statsX + statsWidth, statsY + 5);
    
    // Parcialmente pagado
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Parcial:', statsX + statsWidth * 2, statsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.warning);
    doc.text(stats.partiallyPaid.toString(), statsX + statsWidth * 2, statsY + 5);
    
    // Pendiente
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Pendiente:', statsX + statsWidth * 3, statsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text(stats.pending.toString(), statsX + statsWidth * 3, statsY + 5);
    
    // Total recaudado
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Recaudado:', statsX + statsWidth * 4, statsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.success);
    doc.text(formatCurrency(stats.totalPaid), statsX + statsWidth * 4, statsY + 5);
    
    // Por cobrar
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Por cobrar:', statsX + statsWidth * 5, statsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text(formatCurrency(stats.totalPending), statsX + statsWidth * 5, statsY + 5);
    
    yPos += 30;
    
    // ========== TABLA DE PARTICIPANTES ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('LISTADO DE PARTICIPANTES', margin, yPos);
    yPos += 8;
    
    // Preparar datos para la tabla
    const participantsData = participants.map((p, index) => [
      (index + 1).toString(),
      p.memberName || 'Sin nombre',
      p.leaderName || 'Sin líder',
      p.districtDescription || 'Sin distrito',
      formatCurrency(p.totalPaid || 0),
      formatCurrency(p.pendingBalance || 0),
      p.isFullyPaid ? 'COMPLETO' : (p.totalPaid || 0) > 0 ? 'PARCIAL' : 'PENDIENTE',
      p.registrationDate ? formatDate(p.registrationDate) : '-',
    ]);
    
    // Crear la tabla principal
    doc.autoTable({
      startY: yPos,
      head: [['#', 'NOMBRE', 'LÍDER', 'DISTRITO', 'PAGADO', 'PENDIENTE', 'ESTADO', 'INSCRIPCIÓN']],
      body: participantsData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      bodyStyles: {
        textColor: COLORS.text,
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: COLORS.light,
      },
      styles: {
        lineWidth: 0.1,
        lineColor: COLORS.border,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, // #
        1: { cellWidth: 60 }, // Nombre
        2: { cellWidth: 30 }, // Líder
        3: { cellWidth: 25 }, // Distrito
        4: { 
          cellWidth: 25, 
          halign: 'right',
          fontStyle: 'bold',
        }, // Pagado
        5: { 
          cellWidth: 25, 
          halign: 'right',
          fontStyle: 'bold',
        }, // Pendiente
        6: { 
          cellWidth:35,
          halign: 'center',
          fontStyle: 'bold',
          textColor: function(row) {
            const estado = participantsData[row.index][6];
            return estado === 'COMPLETO' ? COLORS.success :
                   estado === 'PARCIAL' ? COLORS.warning : COLORS.danger;
          }
        }, // Estado
        7: { cellWidth: 35, halign: 'center' }, // Inscripción
      },
      didDrawPage: function(data) {
        // Número de página
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textSecondary);
        doc.text(
          `Página ${data.pageNumber} de ${data.pageCount} • Total participantes: ${participants.length}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // ========== RESUMEN FINAL ==========
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    
    const porcentajeRecaudado = stats.totalPaid + stats.totalPending > 0 
      ? ((stats.totalPaid / (stats.totalPaid + stats.totalPending)) * 100).toFixed(1)
      : 0;
    
    const resumenFinal = `Total recaudado: ${formatCurrency(stats.totalPaid)} (${porcentajeRecaudado}%) • Por cobrar: ${formatCurrency(stats.totalPending)}`;
    
    doc.text(resumenFinal, pageWidth / 2, yPos, { align: 'center' });
    
    // ========== PIE DE PÁGINA ==========
    doc.setFillColor(...COLORS.light);
    doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(
      'Sistema de Gestión de Actividades • Reporte General de Participantes • Documento generado automáticamente',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
    
    // ========== GUARDAR PDF ==========
    const activityNameSlug = activity?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'actividad';
    const finalFilename = `${filename}-${activityNameSlug}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(finalFilename);
    
    console.log('✅ PDF general de participantes generado exitosamente:', finalFilename);
    return true;
    
  } catch (error) {
    console.error('❌ Error generando PDF general de participantes:', error);
    alert('Error al generar el PDF. Por favor, intente nuevamente.');
    return false;
  }
};