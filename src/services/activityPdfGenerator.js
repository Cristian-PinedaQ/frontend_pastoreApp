// ============================================
// activityPdfGenerator.js
// Generador de PDF para reportes de actividades
// ============================================

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Colores para el PDF
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#0891b2',
  dark: '#6b7280',
  light: '#f3f4f6',
  border: '#e5e7eb',
  text: '#111827',
  textSecondary: '#4b5563',
  textTertiary: '#6b7280',
};

/**
 * Genera un reporte PDF de actividades
 * @param {Object} data - Datos para el reporte
 * @param {string} filename - Nombre del archivo
 */
export const generateActivityPDF = (data, filename = 'activity-report') => {
  try {
    // Crear documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // TÍTULO
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.primary);
    doc.text(data.title || 'Reporte de Actividades', margin, 30);
    
    // SUBTÍTULO
    if (data.subtitle) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.textSecondary);
      doc.text(data.subtitle, margin, 40);
    }
    
    // FECHA
    doc.setFontSize(10);
    doc.setTextColor(COLORS.textTertiary);
    const dateText = `Generado el: ${data.date || new Date().toLocaleDateString('es-CO')}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - margin - dateWidth, 30);
    
    // LÍNEA SEPARADORA
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, 45, pageWidth - margin, 45);
    
    let yPos = 55;
    
    // ESTADÍSTICAS GENERALES
    if (data.statistics) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text);
      doc.text('📊 Estadísticas Generales', margin, yPos);
      yPos += 10;
      
      // Tabla de estadísticas
      const statsTable = [
        ['Total de Actividades', data.statistics.totalActivities?.toString() || '0'],
        ['Actividades Activas', data.statistics.totalActive?.toString() || '0'],
        ['Total de Participantes', data.statistics.totalParticipants?.toString() || '0'],
        ['Valor Total Estimado', `$ ${(data.statistics.totalValue || 0).toLocaleString('es-CO')}`],
      ];
      
      doc.autoTable({
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: statsTable,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: '#ffffff',
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: COLORS.text,
        },
        alternateRowStyles: {
          fillColor: COLORS.light,
        },
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // DETALLE DE ACTIVIDADES
    if (data.activities && data.activities.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text);
      doc.text('📋 Detalle de Actividades', margin, yPos);
      yPos += 10;
      
      // Preparar datos para la tabla
      const activitiesData = data.activities.map(activity => {
        const status = getStatusText(activity);
        const endDate = activity.endDate ? new Date(activity.endDate).toLocaleDateString('es-CO') : '-';
        const participants = activity.quantity || 'Ilimitada';
        const price = `$ ${(activity.price || 0).toLocaleString('es-CO')}`;
        
        return [
          activity.activityName || 'Sin nombre',
          price,
          participants,
          status,
          endDate,
        ];
      });
      
      doc.autoTable({
        startY: yPos,
        head: [['Actividad', 'Precio', 'Participantes', 'Estado', 'Fecha Fin']],
        body: activitiesData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: '#ffffff',
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: COLORS.text,
        },
        alternateRowStyles: {
          fillColor: COLORS.light,
        },
        columnStyles: {
          0: { cellWidth: 50 }, // Nombre
          1: { cellWidth: 30 }, // Precio
          2: { cellWidth: 30 }, // Participantes
          3: { cellWidth: 30 }, // Estado
          4: { cellWidth: 30 }, // Fecha
        },
        didDrawCell: (data) => {
          // Colorear celdas de estado
          if (data.section === 'body' && data.column.index === 3) {
            const cellText = data.cell.text[0];
            let fillColor;
            
            if (cellText.includes('🟢') || cellText.includes('Activa')) {
              fillColor = [16, 185, 129, 10]; // Verde claro
            } else if (cellText.includes('🔴') || cellText.includes('Inactiva')) {
              fillColor = [239, 68, 68, 10]; // Rojo claro
            } else if (cellText.includes('🟠') || cellText.includes('Por finalizar')) {
              fillColor = [245, 158, 11, 10]; // Naranja claro
            } else if (cellText.includes('⚫') || cellText.includes('Finalizada')) {
              fillColor = [107, 114, 128, 10]; // Gris claro
            }
            
            if (fillColor) {
              doc.setFillColor(...fillColor);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            }
          }
        },
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // RESUMEN POR ESTADO
    if (data.activities && data.activities.length > 0) {
      const statusSummary = {
        active: data.activities.filter(a => a.isActive && !isActivityFinished(a)).length,
        ending: data.activities.filter(a => a.isActive && isActivityEndingSoon(a)).length,
        finished: data.activities.filter(a => isActivityFinished(a)).length,
        inactive: data.activities.filter(a => !a.isActive).length,
      };
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text);
      doc.text('📈 Resumen por Estado', margin, yPos);
      yPos += 10;
      
      const summaryData = [
        ['🟢 Activas', statusSummary.active.toString()],
        ['🟠 Por Finalizar', statusSummary.ending.toString()],
        ['⚫ Finalizadas', statusSummary.finished.toString()],
        ['🔴 Inactivas', statusSummary.inactive.toString()],
        ['📊 Total', data.activities.length.toString()],
      ];
      
      doc.autoTable({
        startY: yPos,
        body: summaryData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        bodyStyles: {
          textColor: COLORS.text,
        },
        alternateRowStyles: {
          fillColor: COLORS.light,
        },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.7, fontStyle: 'bold' },
          1: { cellWidth: contentWidth * 0.3, halign: 'center' },
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const cellText = data.cell.text[0];
            if (cellText.includes('🟢')) {
              doc.setTextColor(COLORS.secondary);
            } else if (cellText.includes('🟠')) {
              doc.setTextColor(COLORS.warning);
            } else if (cellText.includes('⚫')) {
              doc.setTextColor(COLORS.dark);
            } else if (cellText.includes('🔴')) {
              doc.setTextColor(COLORS.danger);
            } else if (cellText.includes('📊')) {
              doc.setTextColor(COLORS.primary);
              doc.setFontStyle('bold');
            }
            
            doc.text(cellText, data.cell.x + 2, data.cell.y + 7);
            doc.setTextColor(COLORS.text);
            doc.setFontStyle('normal');
          }
        },
      });
    }
    
    // PIE DE PÁGINA
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Número de página
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.textTertiary);
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - margin - pageTextWidth, 290);
      
      // Línea superior
      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.5);
      doc.line(margin, 285, pageWidth - margin, 285);
      
      // Información del sistema
      doc.setFontSize(9);
      const footerText = `Sistema de Gestión de Actividades - ${new Date().getFullYear()}`;
      doc.text(footerText, margin, 295);
    }
    
    // GUARDAR PDF
    doc.save(`${filename}.pdf`);
    
    console.log('✅ PDF generado exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar el PDF. Por favor, intente nuevamente.');
    return false;
  }
};

/**
 * Genera un PDF detallado para una actividad específica
 * @param {Object} data - Datos de la actividad
 * @param {string} filename - Nombre del archivo
 */
export const generateActivityDetailPDF = (data, filename = 'activity-detail') => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // LOGO O ENCABEZADO
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.primary);
    doc.text('📋 REPORTE DE ACTIVIDAD', pageWidth / 2, 30, { align: 'center' });
    
    // INFORMACIÓN DE LA ACTIVIDAD
    doc.setFontSize(16);
    doc.setTextColor(COLORS.text);
    doc.text(data.activity.activityName || 'Sin nombre', margin, 50);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textSecondary);
    
    let yPos = 60;
    
    // DETALLES BÁSICOS
    const details = [
      ['💰 Precio:', `$ ${(data.activity.price || 0).toLocaleString('es-CO')}`],
      ['👥 Capacidad:', data.activity.quantity || 'Ilimitada'],
      ['📅 Fecha de Creación:', new Date(data.activity.registrationDate).toLocaleDateString('es-CO')],
      ['📅 Fecha de Finalización:', new Date(data.activity.endDate).toLocaleDateString('es-CO')],
      ['📊 Estado:', getStatusText(data.activity)],
    ];
    
    details.forEach(([label, value], index) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text);
      doc.text(label, margin, yPos + (index * 8));
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.textSecondary);
      const labelWidth = doc.getTextWidth(label);
      doc.text(value, margin + labelWidth + 5, yPos + (index * 8));
    });
    
    yPos += (details.length * 8) + 15;
    
    // INFORMACIÓN FINANCIERA
    if (data.balance) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text);
      doc.text('💰 Información Financiera', margin, yPos);
      yPos += 10;
      
      const financeData = [
        ['Ingresos Comprometidos', `$ ${(data.balance.totalCommitted || 0).toLocaleString('es-CO')}`],
        ['Ingresos Recibidos', `$ ${(data.balance.totalPaid || 0).toLocaleString('es-CO')}`],
        ['Costos Totales', `$ ${(data.balance.totalCosts || 0).toLocaleString('es-CO')}`],
        ['Balance Actual', `$ ${(data.balance.balance || 0).toLocaleString('es-CO')}`],
        ['Tasa de Cumplimiento', `${(data.balance.compliancePercentage || 0).toFixed(1)}%`],
      ];
      
      doc.autoTable({
        startY: yPos,
        body: financeData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: '#ffffff',
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: COLORS.text,
        },
        alternateRowStyles: {
          fillColor: COLORS.light,
        },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.6, fontStyle: 'bold' },
          1: { cellWidth: contentWidth * 0.4, halign: 'right' },
        },
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // PARTICIPANTES
    if (data.participants && data.participants.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text);
      doc.text('👥 Lista de Participantes', margin, yPos);
      yPos += 10;
      
      const participantsData = data.participants.map(participant => [
        participant.memberName || 'Sin nombre',
        `$ ${(participant.totalPaid || 0).toLocaleString('es-CO')}`,
        `$ ${(participant.pendingBalance || 0).toLocaleString('es-CO')}`,
        `${Math.round(participant.compliancePercentage || 0)}%`,
        participant.enrollmentStatus === 'COMPLETED' ? '✅ Pagado' : 
        participant.enrollmentStatus === 'ACTIVE' ? '🟡 Parcial' : '⏳ Pendiente',
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Nombre', 'Pagado', 'Pendiente', 'Cumplimiento', 'Estado']],
        body: participantsData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: '#ffffff',
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: COLORS.text,
        },
        alternateRowStyles: {
          fillColor: COLORS.light,
        },
      });
    }
    
    // FIRMA Y FECHA
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textTertiary);
    doc.text('______________________________', pageWidth - margin - 50, 250);
    doc.text('Firma y Sello', pageWidth - margin - 40, 255);
    doc.text(new Date().toLocaleDateString('es-CO'), pageWidth - margin - 35, 260);
    
    // GUARDAR PDF
    doc.save(`${filename}.pdf`);
    
    console.log('✅ PDF detallado generado exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error generando PDF detallado:', error);
    return false;
  }
};

/**
 * Helper: Obtener texto de estado
 */
const getStatusText = (activity) => {
  if (!activity.isActive) return '🔴 Inactiva';
  
  const endDate = new Date(activity.endDate);
  const today = new Date();
  
  if (isNaN(endDate.getTime())) return '🟡 Activa';
  if (endDate < today) return '⚫ Finalizada';
  if (endDate.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000) {
    return '🟠 Por finalizar';
  }
  
  return '🟢 Activa';
};

/**
 * Helper: Verificar si actividad está por finalizar
 */
const isActivityEndingSoon = (activity) => {
  if (!activity.isActive || !activity.endDate) return false;
  
  const endDate = new Date(activity.endDate);
  const today = new Date();
  
  return endDate.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000;
};

/**
 * Helper: Verificar si actividad está finalizada
 */
const isActivityFinished = (activity) => {
  if (!activity.endDate) return false;
  
  const endDate = new Date(activity.endDate);
  const today = new Date();
  
  return endDate < today;
};