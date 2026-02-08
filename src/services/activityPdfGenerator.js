// ============================================
// activityPdfGenerator.js
// Generador de PDF para reportes de actividades
// ============================================

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Colores para el PDF
const COLORS = {
  primary: [59, 130, 246],    // Azul
  success: [16, 185, 129],    // Verde
  danger: [239, 68, 68],      // Rojo
  warning: [245, 158, 11],    // Amarillo
  dark: [107, 114, 128],      // Gris oscuro
  light: [243, 244, 246],     // Gris claro
  border: [229, 231, 235],    // Borde gris
  text: [17, 24, 39],         // Texto negro
  textSecondary: [75, 85, 99], // Texto gris
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

// Obtener información financiera de cada actividad
const fetchActivityFinancialData = async (activity) => {
  try {
    const apiService = await import('../apiService').then(module => module.default);
    const balance = await apiService.request(`/activity/balance/${activity.id}`);
    
    return {
      totalCollected: balance?.totalPaid || 0,
      totalExpenses: balance?.totalCosts || 0,
      balance: (balance?.totalPaid || 0) - (balance?.totalCosts || 0), // Calculando balance
      totalCommitted: balance?.totalCommitted || 0,
      participantCount: balance?.participantCount || 0,
      compliancePercentage: balance?.compliancePercentage || 0,
      createdAt: activity.registrationDate
    };
  } catch (error) {
    console.warn(`⚠️ No se pudo obtener información financiera para la actividad ${activity.id}:`, error);
    return {
      totalCollected: 0,
      totalExpenses: 0,
      balance: 0,
      totalCommitted: 0,
      participantCount: 0,
      compliancePercentage: 0,
      createdAt: activity.registrationDate
    };
  }
};

// Calcular días restantes
const calculateDaysLeft = (endDate) => {
  if (!endDate) return null;
  try {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (e) {
    return null;
  }
};

// Obtener texto de estado
const getStatusText = (isActive, endDate) => {
  if (!isActive) return "Inactiva";
  
  const today = new Date();
  const end = new Date(endDate);
  
  if (isNaN(end.getTime())) return "Activa";
  
  if (end < today) return "Finalizada";
  if (end.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000) {
    return "Por finalizar";
  }
  
  return "Activa";
};

// Calcular capacidad utilizada y porcentaje
const calculateCapacityUsage = (participantCount, quantity) => {
  if (!quantity || quantity <= 0) return { used: participantCount, total: "Ilimitada", percentage: 0 };
  
  const percentage = quantity > 0 ? ((participantCount / quantity) * 100) : 0;
  return {
    used: participantCount,
    total: quantity,
    percentage: percentage.toFixed(1)
  };
};

// Calcular valor total (precio * cantidad)
const calculateTotalValue = (price, quantity) => {
  return (price || 0) * (quantity || 0);
};

// Helper para determinar color según balance
const getBalanceColor = (balance) => {
  return balance >= 0 ? COLORS.success : COLORS.danger;
};

/**
 * Genera un reporte PDF de actividades con la misma información que ModalActivityDetails
 */
export const generateActivityPDF = async (data, filename = 'activity-report') => {
  try {
    console.log('🔧 [generateActivityPDF] Iniciando generación de PDF...');
    
    // Obtener información financiera completa
    const activitiesWithFinance = await Promise.all(
      (data.activities || []).map(async (activity) => {
        const financeData = await fetchActivityFinancialData(activity);
        const daysLeft = calculateDaysLeft(activity.endDate);
        const statusText = getStatusText(activity.isActive, activity.endDate);
        const capacityUsage = calculateCapacityUsage(financeData.participantCount, activity.quantity);
        const totalValue = calculateTotalValue(activity.price, activity.quantity);
        
        return { 
          ...activity, 
          financeData,
          daysLeft,
          statusText,
          capacityUsage,
          totalValue
        };
      })
    );
    
    // Crear documento PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;
    
    // ========== ENCABEZADO ==========
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('REPORTE DE ACTIVIDADES', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(data.subtitle || 'Resumen general de actividades', pageWidth / 2, 22, { align: 'center' });
    
    yPos = 35;
    
    // ========== FECHA DE GENERACIÓN ==========
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, margin, yPos);
    
    yPos += 10;
    
    // ========== ESTADÍSTICAS GLOBALES ==========
    const totalCollected = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalCollected, 0);
    const totalExpenses = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalExpenses, 0);
    const overallBalance = totalCollected - totalExpenses;
    const totalCommitted = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.totalCommitted, 0);
    const totalParticipants = activitiesWithFinance.reduce((sum, a) => sum + a.financeData.participantCount, 0);
    const totalValue = activitiesWithFinance.reduce((sum, a) => sum + a.totalValue, 0);
    
    // Crear cajas de estadísticas (similar a ModalActivityDetails)
    const stats = [
      { label: 'Total Actividades', value: activitiesWithFinance.length, icon: '', color: COLORS.primary },
      { label: 'Participantes Totales', value: totalParticipants, icon: '', color: COLORS.success },
      { label: 'Valor Total', value: formatCurrency(totalValue), icon: '', color: COLORS.primary },
      { label: 'Comprometido', value: formatCurrency(totalCommitted), icon: '', color: COLORS.primary },
      { label: 'Recaudado', value: formatCurrency(totalCollected), icon: '', color: COLORS.success },
      { label: 'Gastos', value: formatCurrency(totalExpenses), icon: '', color: COLORS.danger },
      { label: 'Balance General', value: formatCurrency(overallBalance), icon: '', color: getBalanceColor(overallBalance) },
    ];
    
    // Organizar estadísticas en 2 filas
    const boxWidth = (pageWidth - (margin * 2) - 60) / 4; // 4 cajas por fila
    let xPos = margin;
    
    // Primera fila de estadísticas
    stats.slice(0, 4).forEach((stat) => {
      // Fondo de la caja
      doc.setFillColor(...stat.color);
      doc.roundedRect(xPos, yPos, boxWidth, 18, 3, 3, 'F');
      
      // Texto
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(stat.icon, xPos + 3, yPos + 6);
      
      doc.setFontSize(7);
      doc.text(stat.label, xPos + 10, yPos + 6);
      
      doc.setFontSize(9);
      doc.text(stat.value.toString(), xPos + boxWidth / 2, yPos + 13, { align: 'center' });
      
      xPos += boxWidth + 10;
    });
    
    yPos += 25;
    xPos = margin;
    
    // Segunda fila de estadísticas
    stats.slice(4, 7).forEach((stat) => {
      // Fondo de la caja
      doc.setFillColor(...stat.color);
      doc.roundedRect(xPos, yPos, boxWidth, 18, 3, 3, 'F');
      
      // Texto
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(stat.icon, xPos + 3, yPos + 6);
      
      doc.setFontSize(7);
      doc.text(stat.label, xPos + 10, yPos + 6);
      
      doc.setFontSize(9);
      doc.text(stat.value.toString(), xPos + boxWidth / 2, yPos + 13, { align: 'center' });
      
      xPos += boxWidth + 10;
    });
    
    yPos += 25;
    
    // ========== TABLA DETALLADA DE ACTIVIDADES ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('DETALLE DE ACTIVIDADES (Información General)', margin, yPos);
    yPos += 8;
    
    // Preparar datos para la tabla - MOSTRANDO LOS MISMOS CAMPOS QUE ModalActivityDetails
    const tableData = activitiesWithFinance.map(activity => {
      const daysLeftText = activity.daysLeft > 0 ? ` (${activity.daysLeft} días)` : '';
      
      return [
        activity.activityName || 'Sin nombre',
        activity.statusText || '',
        formatCurrency(activity.price || 0),
        activity.capacityUsage.total === "Ilimitada" ? 
          `${activity.capacityUsage.used} / ${activity.capacityUsage.total}` :
          `${activity.capacityUsage.used} / ${activity.capacityUsage.total} (${activity.capacityUsage.percentage}%)`,
        formatDate(activity.registrationDate),
        formatDate(activity.endDate) + daysLeftText,
        formatCurrency(activity.totalValue),
        formatCurrency(activity.financeData.totalCommitted),
        formatCurrency(activity.financeData.totalCollected),
        formatCurrency(activity.financeData.balance), // Pendiente (TotalPaid - TotalCommitted)
        formatCurrency(activity.financeData.totalExpenses), // GASTOS - NUEVO CAMPO
        formatCurrency(activity.financeData.balance), // BALANCE (Pagado - Gastos) - NUEVO CAMPO
        `${activity.financeData.compliancePercentage?.toFixed(1) || "0"}%`
      ];
    });
    
    // Crear la tabla con autoTable
    doc.autoTable({
      startY: yPos,
      head: [[
        'ACTIVIDAD', 
        'ESTADO', 
        'PRECIO', 
        'CAPACIDAD', 
        'CREACIÓN', 
        'FINALIZACIÓN', 
        'VALOR TOTAL',
        'COMPROMETIDO',
        'PAGADO',
        'PENDIENTE',
        'GASTOS', // NUEVA COLUMNA
        'BALANCE', // NUEVA COLUMNA
        'CUMPLIMIENTO'
      ]],
      body: tableData,
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
        fontSize: 7,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: COLORS.light,
      },
      styles: {
        lineWidth: 0.1,
        lineColor: COLORS.border,
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' }, // Nombre
        1: { cellWidth: 15, halign: 'center' },  // Estado
        2: { cellWidth: 18, halign: 'right' },   // Precio
        3: { cellWidth: 23, halign: 'center' },  // Capacidad
        4: { cellWidth: 20, halign: 'center' },  // Creación
        5: { cellWidth: 22, halign: 'center' },  // Finalización
        6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }, // Valor Total
        7: { 
          cellWidth: 28, 
          halign: 'right',
          fontStyle: 'bold',
          textColor: COLORS.primary // Azul para comprometido
        },
        8: { 
          cellWidth: 20, 
          halign: 'right',
          fontStyle: 'bold',
          textColor: COLORS.success // Verde para pagado
        },
        9: { 
          cellWidth: 20, 
          halign: 'right',
          fontStyle: 'bold',
          textColor: COLORS.warning // Amarillo para pendiente
        },
        10: { // GASTOS - NUEVA COLUMNA
          cellWidth: 20, 
          halign: 'right',
          fontStyle: 'bold',
          textColor: COLORS.danger // Rojo para gastos
        },
        11: { // BALANCE - NUEVA COLUMNA
          cellWidth: 20, 
          halign: 'right',
          fontStyle: 'bold',
          didParseCell: function(data) {
            const cellValue = data.cell.raw;
            if (cellValue) {
              // Extraer número del texto formateado
              const match = cellValue.match(/[\d,.]+/);
              if (match) {
                const amount = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
                data.cell.styles.textColor = amount >= 0 ? COLORS.success : COLORS.danger;
              }
            }
          }
        },
        12: { 
          cellWidth: 25, 
          halign: 'center',
          fontStyle: 'bold',
          didParseCell: function(data) {
            const cellValue = data.cell.raw;
            if (cellValue && cellValue !== "0%") {
              const percentage = parseFloat(cellValue.replace('%', ''));
              if (percentage >= 80) {
                data.cell.styles.textColor = COLORS.success;
              } else if (percentage >= 50) {
                data.cell.styles.textColor = COLORS.warning;
              } else {
                data.cell.styles.textColor = COLORS.danger;
              }
            }
          }
        },
      },
      didDrawPage: function(data) {
        // Número de página
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textSecondary);
        doc.text(
          `Página ${data.pageNumber} de ${data.pageCount}`,
          pageWidth - margin - 20,
          pageHeight - 10
        );
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // ========== RESUMEN FINANCIERO POR ACTIVIDAD ==========
    if (activitiesWithFinance.length > 0) {
      // Separador
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('ANÁLISIS FINANCIERO DETALLADO', margin, yPos);
      yPos += 8;
      
      // Tabla de análisis financiero simplificado
      const financialData = activitiesWithFinance.map(activity => [
        activity.activityName,
        formatCurrency(activity.financeData.totalCommitted),
        formatCurrency(activity.financeData.totalCollected),
        formatCurrency(activity.financeData.balance),
        formatCurrency(activity.financeData.totalExpenses),
        formatCurrency(activity.financeData.balance), // Balance calculado (Pagado - Gastos)
        activity.financeData.totalCommitted > 0 ? 
          `${Math.round((activity.financeData.totalCollected / activity.financeData.totalCommitted) * 100)}%` : '0%'
      ]);
      
      doc.autoTable({
        startY: yPos,
        head: [['Actividad', 'Comprometido', 'Pagado', 'Pendiente', 'Gastos', 'Balance (Utilidad)', '% Cobranza']],
        body: financialData,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: {
          fillColor: COLORS.dark,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30, halign: 'right', textColor: COLORS.primary },
          2: { cellWidth: 30, halign: 'right', textColor: COLORS.success },
          3: { cellWidth: 25, halign: 'right', textColor: COLORS.warning },
          4: { cellWidth: 25, halign: 'right', textColor: COLORS.danger },
          5: { 
            cellWidth: 30, 
            halign: 'right',
            fontStyle: 'bold',
            didParseCell: function(data) {
              const cellValue = data.cell.raw;
              if (cellValue) {
                const match = cellValue.match(/[\d,.]+/);
                if (match) {
                  const amount = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
                  data.cell.styles.textColor = amount >= 0 ? COLORS.success : COLORS.danger;
                }
              }
            }
          },
          6: { 
            cellWidth: 25, 
            halign: 'center',
            didParseCell: function(data) {
              const cellValue = data.cell.raw;
              if (cellValue && cellValue !== "0%") {
                const percentage = parseFloat(cellValue.replace('%', ''));
                if (percentage >= 80) {
                  data.cell.styles.textColor = COLORS.success;
                } else if (percentage >= 50) {
                  data.cell.styles.textColor = COLORS.warning;
                } else {
                  data.cell.styles.textColor = COLORS.danger;
                }
              }
            }
          },
        },
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // ========== LEYENDA Y NOTAS ==========
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    
    const legendY = pageHeight - 30;
    
    // Leyenda de colores
    doc.setFillColor(...COLORS.success);
    doc.rect(margin, legendY, 4, 4, 'F');
    doc.text('Balance positivo / Pagado', margin + 7, legendY + 3);
    
    doc.setFillColor(...COLORS.danger);
    doc.rect(margin + 60, legendY, 4, 4, 'F');
    doc.text('Balance negativo / Gastos', margin + 67, legendY + 3);
    
    doc.setFillColor(...COLORS.warning);
    doc.rect(margin + 120, legendY, 4, 4, 'F');
    doc.text('Pendiente', margin + 127, legendY + 3);
    
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin + 165, legendY, 4, 4, 'F');
    doc.text('Comprometido', margin + 172, legendY + 3);
    
    // Notas explicativas
    const notesY = legendY + 10;
    doc.text('Notas:', margin, notesY);
    doc.text('• Balance = Pagado - Gastos (utilidad de la actividad)', margin + 10, notesY + 5);
    doc.text('• Cumplimiento = (Pagado / Comprometido) × 100', margin + 10, notesY + 10);
    
    // ========== PIE DE PÁGINA ==========
    doc.setFillColor(...COLORS.light);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(
      'Sistema de Gestión de Actividades • Información equivalente a vista "Información General"',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    
    // ========== GUARDAR PDF ==========
    const finalFilename = `${filename}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(finalFilename);
    
    console.log('✅ PDF generado exitosamente:', finalFilename);
    return true;
    
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar el PDF. Por favor, intente nuevamente.');
    return false;
  }
};

/**
 * Genera un PDF detallado para una actividad específica
 * (Mantener función existente sin cambios)
 */
export const generateActivityDetailPDF = (data, filename = 'activity-detail') => {
  // ... (código existente)
};