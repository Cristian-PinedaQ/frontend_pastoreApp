// services/participantsPdfGenerator.js
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

// Helper para formato de fecha y hora
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '-';
  }
};

/**
 * Genera un PDF con información detallada de un participante específico
 * @param {Object} data - Datos para el reporte
 * @param {string} filename - Nombre del archivo
 */
export const generateParticipantsPDF = (data, filename = 'detalle-participante') => {
  try {
    console.log('📄 [generateParticipantsPDF] Generando PDF de detalle de participante...');
    
    // Obtener el primer participante (ya que solo debería haber uno)
    const participant = data.participants && data.participants.length > 0 
      ? data.participants[0] 
      : null;
    
    if (!participant) {
      console.error('❌ No hay datos de participante para generar el PDF');
      alert('No hay información del participante para generar el PDF');
      return false;
    }
    
    // Crear documento PDF en orientación vertical para mejor legibilidad de detalles
    const doc = new jsPDF({
      orientation: 'portrait',
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
    
    // Título principal
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ESTADO DE CUENTA - PARTICIPANTE', pageWidth / 2, 15, { align: 'center' });
    
    // Nombre del participante
    doc.setFontSize(12);
    doc.text(participant.memberName || 'Participante sin nombre', pageWidth / 2, 22, { align: 'center' });
    
    yPos = 35;
    
    // ========== FECHA DE GENERACIÓN ==========
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
    yPos += 8;
    
    // ========== INFORMACIÓN DE LA ACTIVIDAD ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('INFORMACIÓN DE LA ACTIVIDAD', margin, yPos);
    yPos += 10;
    
    // Datos de la actividad
    const activityInfo = [
      ['Actividad:', data.activity?.name || 'No disponible'],
      ['Precio:', formatCurrency(data.activity?.price || 0)],
      ['Estado:', data.activity?.isActive ? 'Activa' : 'Inactiva'],
      ['Fecha fin:', data.activity?.endDate ? formatDate(data.activity.endDate) : 'No definida'],
    ];
    
    doc.autoTable({
      startY: yPos,
      body: activityInfo,
      margin: { left: margin, right: margin },
      theme: 'plain',
      bodyStyles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: COLORS.text,
        lineColor: [255, 255, 255], // Sin bordes
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
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // ========== INFORMACIÓN DEL PARTICIPANTE ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('INFORMACIÓN DEL PARTICIPANTE', margin, yPos);
    yPos += 10;
    
    // Datos del participante
    const participantInfo = [
      ['Nombre:', participant.memberName || 'No disponible'],
      ['Líder:', participant.leaderName || 'Sin líder asignado'],
      ['Distrito:', participant.districtDescription || participant.districtName || 'Sin distrito'],
      ['Fecha de inscripción:', participant.registrationDate ? formatDateTime(participant.registrationDate) : 'No disponible'],
      ['Estado inscripción:', participant.enrollmentStatus === 'COMPLETED' ? 'Completado' : 
                             participant.enrollmentStatus === 'ACTIVE' ? 'Activo' : 'Pendiente'],
    ];
    
    doc.autoTable({
      startY: yPos,
      body: participantInfo,
      margin: { left: margin, right: margin },
      theme: 'plain',
      bodyStyles: {
        fontSize: 10,
        cellPadding: 5,
        textColor: COLORS.text,
        lineColor: [255, 255, 255], // Sin bordes
      },
      columnStyles: {
        0: { 
          cellWidth: 50,
          fontStyle: 'bold',
          textColor: COLORS.textSecondary
        },
        1: { 
          cellWidth: pageWidth - margin * 2 - 50,
        },
      },
      styles: {
        lineWidth: 0,
      },
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // ========== ESTADO DE CUENTA ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('ESTADO DE CUENTA', margin, yPos);
    yPos += 10;
    
    // Calcular valores si no están disponibles
    const totalPrice = data.activity?.price || 0;
    const totalPaid = participant.totalPaid || 0;
    const pendingBalance = participant.pendingBalance || 0;
    const compliancePercentage = totalPrice > 0 ? (totalPaid / totalPrice) * 100 : 0;
    const isFullyPaid = participant.isFullyPaid || pendingBalance <= 0;
    
    // Datos del estado de cuenta
    const accountStatus = [
      ['Precio total:', formatCurrency(totalPrice)],
      ['Total pagado:', {
        content: formatCurrency(totalPaid),
        styles: { 
          textColor: COLORS.success,
          fontStyle: 'bold'
        }
      }],
      ['Saldo pendiente:', {
        content: formatCurrency(pendingBalance),
        styles: { 
          textColor: isFullyPaid ? COLORS.success : COLORS.danger,
          fontStyle: 'bold'
        }
      }],
      ['Porcentaje pagado:', {
        content: `${compliancePercentage.toFixed(1)}%`,
        styles: { 
          textColor: compliancePercentage >= 100 ? COLORS.success : 
                    compliancePercentage >= 50 ? COLORS.warning : COLORS.danger,
          fontStyle: 'bold'
        }
      }],
      ['Estado de pago:', {
        content: isFullyPaid ? 'COMPLETADO' : 'PENDIENTE',
        styles: { 
          textColor: isFullyPaid ? COLORS.success : COLORS.danger,
          fontStyle: 'bold',
          fontSize: 11
        }
      }],
    ];
    
    doc.autoTable({
      startY: yPos,
      body: accountStatus,
      margin: { left: margin, right: margin },
      theme: 'plain',
      bodyStyles: {
        fontSize: 10,
        cellPadding: 6,
        lineColor: [255, 255, 255], // Sin bordes
      },
      columnStyles: {
        0: { 
          cellWidth: 50,
          fontStyle: 'bold',
          textColor: COLORS.textSecondary
        },
        1: { 
          cellWidth: pageWidth - margin * 2 - 50,
          halign: 'right'
        },
      },
      styles: {
        lineWidth: 0,
      },
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
    
    // ========== BARRA DE PROGRESO VISUAL ==========
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text('Progreso de pago:', margin, yPos);
    
    // Dibujar barra de progreso
    const barWidth = 100;
    const barHeight = 8;
    const barX = margin + 35;
    const barY = yPos - 3;
    
    // Fondo de la barra
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');
    
    // Barra de progreso
    const progressWidth = Math.min(barWidth, (compliancePercentage / 100) * barWidth);
    const progressColor = compliancePercentage >= 100 ? COLORS.success : 
                         compliancePercentage >= 50 ? COLORS.warning : COLORS.danger;
    
    doc.setFillColor(...progressColor);
    doc.roundedRect(barX, barY, progressWidth, barHeight, 2, 2, 'F');
    
    // Texto del porcentaje
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...progressColor);
    doc.text(`${compliancePercentage.toFixed(1)}%`, barX + barWidth + 5, yPos);
    
    yPos += 20;
    
    // ========== HISTORIAL DE PAGOS ==========
    const paymentHistory = participant.paymentHistory || [];
    
    if (paymentHistory.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('HISTORIAL DE PAGOS', margin, yPos);
      yPos += 10;
      
      // Preparar datos para la tabla
      const paymentsData = paymentHistory.map((payment, index) => [
        (index + 1).toString(),
        payment.date || payment.registrationDate ? formatDateTime(payment.date || payment.registrationDate) : '-',
        formatCurrency(payment.amount || 0),
        payment.incomeMethod === 'BANK_TRANSFER' ? 'Transferencia' : 'Efectivo',
        payment.recordedBy || 'Sistema',
      ]);
      
      // Crear la tabla
      doc.autoTable({
        startY: yPos,
        head: [['#', 'FECHA', 'MONTO', 'MÉTODO', 'REGISTRADO POR']],
        body: paymentsData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          textColor: COLORS.text,
          fontSize: 9,
          cellPadding: 4,
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
          1: { cellWidth: 35, halign: 'center' }, // Fecha
          2: { 
            cellWidth: 25, 
            halign: 'right',
            fontStyle: 'bold',
            textColor: COLORS.success
          }, // Monto
          3: { 
            cellWidth: 25, 
            halign: 'center',
          }, // Método
          4: { cellWidth: pageWidth - margin * 2 - 95 }, // Registrado por
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
      
      yPos = doc.lastAutoTable.finalY + 10;
      
      // Resumen del historial
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(`Total de pagos registrados: ${paymentHistory.length}`, margin, yPos);
      yPos += 8;
      
    } else {
      // Si no hay historial de pagos
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('HISTORIAL DE PAGOS', margin, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textSecondary);
      doc.text('No se han registrado pagos para este participante.', margin, yPos);
      yPos += 15;
    }
    
    // ========== RESUMEN FINAL ==========
    // Separador
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    
    const estadoFinal = isFullyPaid 
      ? ' CUENTA COMPLETA - Sin saldo pendiente'
      : ` CUENTA PENDIENTE - Saldo: ${formatCurrency(pendingBalance)}`;
    
    doc.text(estadoFinal, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // ========== PIE DE PÁGINA ==========
    doc.setFillColor(...COLORS.light);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(
      'Sistema de Gestión de Actividades • Estado de Cuenta Individual • Documento válido para constancia',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    
    // ========== GUARDAR PDF ==========
    const finalFilename = `${filename}-${participant.memberName?.toLowerCase().replace(/\s+/g, '-') || 'participante'}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(finalFilename);
    
    console.log('✅ PDF de detalle de participante generado exitosamente:', finalFilename);
    return true;
    
  } catch (error) {
    console.error('❌ Error generando PDF de detalle de participante:', error);
    alert('Error al generar el PDF. Por favor, intente nuevamente.');
    return false;
  }
};