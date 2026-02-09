// 📄 financepdfgenerator.js - COMPLETO CON TODAS LAS FUNCIONES DE PDF
// ============================================
// Generador de PDF para reportes financieros
// VERSION: 2.2.0 - Tabla de Métodos de Pago + Columna REGISTRADO POR
// ============================================

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// 🎨 Colores para el PDF (igual a participantsPdfGenerator)
const COLORS = {
  primary: [5, 150, 105],     // Verde principal
  success: [16, 185, 129],    // Verde éxito
  danger: [239, 68, 68],      // Rojo
  warning: [245, 158, 11],    // Amarillo
  info: [59, 130, 246],       // Azul info
  dark: [107, 114, 128],      // Gris oscuro
  light: [243, 244, 246],     // Gris claro
  border: [229, 231, 235],    // Borde gris
  text: [17, 24, 39],         // Texto negro
  textSecondary: [75, 85, 99], // Texto gris
  textTertiary: [107, 114, 128], // Texto gris claro
};

// 🔐 Debug condicional
const DEBUG = process.env.REACT_APP_DEBUG === "true";

const log = (message, data) => {
  if (DEBUG) {
    console.log(`[PDF Generator] ${message}`, data || '');
  }
};

const logError = (message, error) => {
  console.error(`[PDF Generator] ${message}`, error);
};

// ✅ Validación de cantidad
const validateAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return 0;
  if (num < 0) return 0;
  if (num > 999999999) return 999999999;
  return num;
};

// ✅ Helper para formatear moneda (mejorado)
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "$ 0";
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ✅ Helper para formatear fecha (mejorado) - usado en reportes de estadísticas
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

// ✅ Helper para formato de fecha y hora (nuevo) - usado en timestamps de reportes
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

// ✅ Formatear fecha completa (para encabezados)
const formatDateFull = (date) => {
  try {
    if (!date) return 'Sin fecha';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return date;
    
    return dateObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return date || 'Sin fecha';
  }
};

// ✅ Mapa de conceptos
const CONCEPT_MAP = {
  'TITHE': 'Diezmo',
  'OFFERING': 'Ofrenda',
  'SEED_OFFERING': 'Ofrenda de Semilla',
  'BUILDING_FUND': 'Fondo de Construcción',
  'FIRST_FRUITS': 'Primicias',
  'CELL_GROUP_OFFERING': 'Ofrenda Grupo de Célula',
  'OTRO': 'Otro'
};

// ✅ Mapa de métodos
const METHOD_MAP = {
  'CASH': 'Efectivo',
  'BANK_TRANSFER': 'Transferencia Bancaria'
};

// ✅ Calcular estadísticas detalladas
const calculateDetailedStats = (financesData) => {
  try {
    if (!financesData || !Array.isArray(financesData)) {
      return {
        totalAmount: 0,
        byConcept: {},
        totalRecords: 0,
        verifiedCount: 0,
        pendingCount: 0,
        finances: []
      };
    }

    const stats = {
      totalAmount: 0,
      byConcept: {},
      totalRecords: financesData.length,
      verifiedCount: 0,
      pendingCount: 0,
      finances: financesData
    };

    financesData.forEach(finance => {
      try {
        const amount = validateAmount(finance.amount);
        stats.totalAmount += amount;

        // Contar verificados vs pendientes
        if (finance.isVerified === true) {
          stats.verifiedCount++;
        } else {
          stats.pendingCount++;
        }

        // Agrupar por concepto
        const concept = finance.concept || finance.incomeConcept || 'OTRO';
        if (!stats.byConcept[concept]) {
          stats.byConcept[concept] = {
            count: 0,
            total: 0,
            verified: 0,
            pending: 0
          };
        }
        
        stats.byConcept[concept].count++;
        stats.byConcept[concept].total += amount;
        
        if (finance.isVerified === true) {
          stats.byConcept[concept].verified++;
        } else {
          stats.byConcept[concept].pending++;
        }
      } catch (error) {
        logError('Error procesando registro:', error);
      }
    });

    log('Estadísticas calculadas', stats);
    return stats;
  } catch (error) {
    logError('Error calculando estadísticas:', error);
    return {
      totalAmount: 0,
      byConcept: {},
      totalRecords: 0,
      verifiedCount: 0,
      pendingCount: 0,
      finances: []
    };
  }
};

// ✅ Generar PDF con todos los datos del modal (MEJORADO CON NUEVOS ESTILOS)
export const generateFinancePdf = ({
  financesData = [],
  reportType = 'summary',
  selectedDate = null,
  dateRange = null,
  includeCharts = false,
  title = 'Reporte Financiero'
}) => {
  try {
    log('Iniciando generación de PDF', {
      reportType,
      selectedDate,
      dateRange,
      totalRecords: financesData?.length || 0
    });

    if (!financesData || !Array.isArray(financesData)) {
      throw new Error('Datos financieros no válidos');
    }

    // Crear documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // ========== CALCULAR ESTADÍSTICAS DETALLADAS ==========
    const stats = calculateDetailedStats(financesData);
    const isRangeReport = !!(dateRange && typeof dateRange === 'string');
    const currentDate = new Date();
    
    // ========== ENCABEZADO MEJORADO ==========
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Título principal
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      isRangeReport ? 'REPORTE DE INGRESOS' : 'REPORTE DIARIO DE INGRESOS',
      pageWidth / 2,
      15,
      { align: 'center' }
    );
    
    // Subtítulo
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestión Financiera - Iglesia', pageWidth / 2, 22, { align: 'center' });

    yPos = 35;

    // ========== FECHA DE GENERACIÓN ==========
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    const fechaGeneracion = currentDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generado: ${fechaGeneracion}`, margin, yPos);
    yPos += 8;

    // ========== INFORMACIÓN DEL REPORTE ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('INFORMACIÓN DEL REPORTE', margin, yPos);
    yPos += 10;
    
    // Datos del reporte
    const reportInfo = [];
    if (dateRange) {
      reportInfo.push(['Período:', dateRange]);
    } else if (selectedDate) {
      reportInfo.push(['Fecha:', formatDateFull(selectedDate)]);
    }
    reportInfo.push(['Tipo de Reporte:', reportType === 'summary' ? 'Resumen' : 'Detallado con Miembros']);

    doc.autoTable({
      startY: yPos,
      body: reportInfo,
      margin: { left: margin, right: margin },
      theme: 'plain',
      bodyStyles: {
        fontSize: 10,
        cellPadding: 5,
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
          cellWidth: contentWidth - 40,
        },
      },
      styles: {
        lineWidth: 0,
      },
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // ========== RESUMEN FINANCIERO ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text('RESUMEN FINANCIERO', margin, yPos);
    yPos += 10;

    // Datos del resumen
    const summaryData = [
      ['Total de Registros:', stats.totalRecords.toString()],
      ['Monto Total:', formatCurrency(stats.totalAmount)],
      ['Verificados:', `${stats.verifiedCount} registros`],
      ['Pendientes:', `${stats.pendingCount} registros`]
    ];

    doc.autoTable({
      startY: yPos,
      body: summaryData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      bodyStyles: {
        fontSize: 10,
        cellPadding: 6,
        textColor: COLORS.text,
        lineColor: [255, 255, 255],
      },
      columnStyles: {
        0: {
          cellWidth: 50,
          fontStyle: 'bold',
          textColor: COLORS.textSecondary
        },
        1: {
          cellWidth: contentWidth - 50,
          halign: 'right',
          fontStyle: 'bold',
          textColor: COLORS.success
        },
      },
      styles: {
        lineWidth: 0,
      },
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // ========== DESGLOSE POR CONCEPTO ==========
    if (Object.keys(stats.byConcept).length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('DESGLOSE POR CONCEPTO', margin, yPos);
      yPos += 10;

      const conceptData = Object.entries(stats.byConcept)
        .filter(([_, data]) => data && typeof data === 'object')
        .map(([concept, data]) => [
          CONCEPT_MAP[concept] || concept,
          (data?.count || 0).toString(),
          formatCurrency(data?.total || 0),
          (data?.verified || 0).toString(),
          (data?.pending || 0).toString()
        ]);

      doc.autoTable({
        startY: yPos,
        head: [['CONCEPTO', 'REGISTROS', 'MONTO TOTAL', 'VERIFICADOS', 'PENDIENTES']],
        body: conceptData,
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
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' },
          2: { 
            cellWidth: 40, 
            halign: 'right',
            fontStyle: 'bold',
            textColor: COLORS.success 
          },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' }
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

      yPos = doc.lastAutoTable.finalY + 65;
    }

    // ========== DESGLOSE POR MÉTODO DE PAGO ==========
    // Calcular totales por método
    const methodStats = {
      CASH: { count: 0, total: 0 },
      BANK_TRANSFER: { count: 0, total: 0 }
    };

    stats.finances.forEach(finance => {
      try {
        const amount = validateAmount(finance.amount);
        const method = finance.method || finance.incomeMethod || 'CASH';
        
        if (method === 'CASH' || method === 'BANK_TRANSFER') {
          methodStats[method].count++;
          methodStats[method].total += amount;
        }
      } catch (error) {
        logError('Error procesando método de pago:', error);
      }
    });

    // Mostrar tabla si hay datos
    if (methodStats.CASH.count > 0 || methodStats.BANK_TRANSFER.count > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('DESGLOSE POR MÉTODO DE PAGO', margin, yPos);
      yPos += 10;

      const methodData = [
        [
          METHOD_MAP.CASH || 'Efectivo',
          methodStats.CASH.count.toString(),
          formatCurrency(methodStats.CASH.total)
        ],
        [
          METHOD_MAP.BANK_TRANSFER || 'Transferencia Bancaria',
          methodStats.BANK_TRANSFER.count.toString(),
          formatCurrency(methodStats.BANK_TRANSFER.total)
        ]
      ];

      doc.autoTable({
        startY: yPos,
        head: [['MÉTODO DE PAGO', 'REGISTROS', 'MONTO TOTAL']],
        body: methodData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.info,
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
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 40, halign: 'center' },
          2: { 
            cellWidth: 50, 
            halign: 'right',
            fontStyle: 'bold',
            textColor: COLORS.info 
          }
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
    }

    // ========== LISTA DETALLADA DE MIEMBROS ==========
    if (reportType === 'members' && stats.finances.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('LISTA DETALLADA DE APORTES', margin, yPos);
      yPos += 10;

      const memberData = stats.finances.map((finance, index) => [
        (index + 1).toString(),
        finance.memberName || 'Sin nombre',
        CONCEPT_MAP[finance.concept] || finance.concept || 'OTRO',
        finance.isVerified ? 'Verificado' : 'Pendiente',
        formatCurrency(validateAmount(finance.amount)),
        finance.recordedBy || '-'
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['#', 'MIEMBRO', 'CONCEPTO', 'ESTADO', 'MONTO', 'REGISTRADO POR']],
        body: memberData,
        margin: { left: margin, right: margin },
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.info,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          textColor: COLORS.text,
          fontSize: 8,
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
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25, halign: 'center' },
          4: { 
            cellWidth: 28, 
            halign: 'right',
            fontStyle: 'bold',
            textColor: COLORS.success
          },
          5: { cellWidth: 34 }
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
    }

    // ========== RESUMEN FINAL ==========
    // Separador
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(
      `TOTAL PROCESADO: ${formatCurrency(stats.totalAmount)}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );

    // ========== PIE DE PÁGINA ==========
    doc.setFillColor(...COLORS.light);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(
      'Sistema de Gestión Financiera • Reporte de Ingresos • Documento válido para auditoría',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    // ========== GUARDAR PDF ==========
    let fileName = 'reporte_financiero';
    if (dateRange) {
      fileName = `reporte_${dateRange.replace(/[/ ]/g, '_')}`;
    } else if (selectedDate) {
      const dateStr = new Date(selectedDate).toISOString().split('T')[0];
      fileName = `reporte_diario_${dateStr}`;
    }

    doc.save(`${fileName}.pdf`);
    
    log('PDF generado exitosamente', { fileName, pages: doc.internal.getNumberOfPages() });
    return true;

  } catch (error) {
    logError('Error generando PDF:', error);
    throw error;
  }
};

// ✅ Función para integrar con FinancesPage
export const handlePdfExport = async ({
  financesData,
  selectedDate,
  dateRange,
  reportType = 'summary',
  onSuccess,
  onError
}) => {
  try {
    log('Iniciando exportación PDF desde FinancesPage', {
      selectedDate,
      dateRange,
      reportType,
      dataCount: financesData?.length || 0
    });

    if (!financesData || financesData.length === 0) {
      throw new Error('No hay datos financieros para exportar');
    }

    // Generar PDF
    await generateFinancePdf({
      financesData,
      reportType,
      selectedDate,
      dateRange,
      title: dateRange ? 'Reporte de Ingresos por Rango' : 'Reporte Diario de Ingresos'
    });

    if (onSuccess && typeof onSuccess === 'function') {
      onSuccess();
    }

    return true;
  } catch (error) {
    logError('Error en exportación PDF:', error);
    
    if (onError && typeof onError === 'function') {
      onError(error.message || 'Error al generar PDF');
    }
    
    return false;
  }
};

// ✅ Función para generar PDF de reporte diario (COMPATIBLE CON CÓDIGO EXISTENTE)
export const generateDailyFinancePDF = (data, filename = 'reporte-ingresos') => {
  try {
    log('Generando PDF diario', { 
      recordCount: data.finances?.length || 0,
      reportType: data.reportType 
    });

    // Usar la nueva función generateFinancePdf con los datos convertidos
    return generateFinancePdf({
      financesData: data.finances || [],
      reportType: data.reportType || 'summary',
      selectedDate: data.date,
      dateRange: data.dateRange,
      title: data.config?.title || 'Reporte de Ingresos'
    });

  } catch (error) {
    logError('Error generando PDF diario:', error);
    throw error;
  }
};

// ✅ Función para generar PDF de estadísticas (COMPATIBLE CON CÓDIGO EXISTENTE - MEJORADO)
export const generateFinancePDF = (data, filename = 'financial-report') => {
  try {
    log('Generando PDF de finanzas', { 
      recordCount: data.finances?.length || 0 
    });

    // Si data.statistics existe, es un reporte de estadísticas
    if (data.statistics) {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // ========== ENCABEZADO ==========
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADÍSTICAS FINANCIERAS', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Resumen General de Ingresos', pageWidth / 2, 22, { align: 'center' });

      yPos = 35;

      // Fecha de generación
      doc.setFontSize(9);
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
      yPos += 15;

      // ========== ESTADÍSTICAS PRINCIPALES ==========
      const stats = data.statistics;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text('RESUMEN GENERAL', margin, yPos);
      yPos += 10;

      const summaryData = [
        ['Total de Registros:', stats.totalRecords.toString()],
        ['Monto Total:', formatCurrency(stats.totalAmount)],
        ['Verificados:', `${stats.verifiedCount || 0} registros`],
        ['Pendientes:', `${stats.unverifiedCount || 0} registros`],
        ['Monto Verificado:', formatCurrency(stats.verifiedAmount || 0)],
        ['Monto Pendiente:', formatCurrency(stats.unverifiedAmount || 0)]
      ];

      doc.autoTable({
        startY: yPos,
        body: summaryData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        bodyStyles: {
          fontSize: 10,
          cellPadding: 6,
          textColor: COLORS.text,
          lineColor: [255, 255, 255],
        },
        columnStyles: {
          0: {
            cellWidth: 60,
            fontStyle: 'bold',
            textColor: COLORS.textSecondary
          },
          1: {
            cellWidth: pageWidth - margin * 2 - 60,
            halign: 'right',
            fontStyle: 'bold',
            textColor: COLORS.success
          },
        },
        styles: {
          lineWidth: 0,
        },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // ========== POR CONCEPTO ==========
      if (stats.byConcept && Object.keys(stats.byConcept).length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text);
        doc.text('DISTRIBUCIÓN POR CONCEPTO', margin, yPos);
        yPos += 10;

        const conceptData = Object.entries(stats.byConcept)
          .filter(([_, data]) => data && typeof data === 'object')
          .map(([concept, data]) => [
            CONCEPT_MAP[concept] || concept,
            (data?.count || 0).toString(),
            formatCurrency(data?.total || 0)
          ]);

        doc.autoTable({
          startY: yPos,
          head: [['CONCEPTO', 'REGISTROS', 'MONTO TOTAL']],
          body: conceptData,
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
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { 
              halign: 'right',
              fontStyle: 'bold',
              textColor: COLORS.success 
            }
          }
        });

        yPos = doc.lastAutoTable.finalY + 15;
      }

      // ========== POR MÉTODO ==========
      if (stats.byMethod && Object.keys(stats.byMethod).length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.text);
        doc.text('DISTRIBUCIÓN POR MÉTODO DE PAGO', margin, yPos);
        yPos += 10;

        const methodData = Object.entries(stats.byMethod)
          .filter(([_, data]) => data && typeof data === 'object')
          .map(([method, data]) => [
            METHOD_MAP[method] || method,
            (data?.count || 0).toString(),
            formatCurrency(data?.total || 0)
          ]);

        doc.autoTable({
          startY: yPos,
          head: [['MÉTODO', 'REGISTROS', 'MONTO TOTAL']],
          body: methodData,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: {
            fillColor: COLORS.info,
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
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { 
              halign: 'right',
              fontStyle: 'bold',
              textColor: COLORS.success 
            }
          }
        });
      }

      // ========== PIE DE PÁGINA ==========
      doc.setFillColor(...COLORS.light);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLORS.textSecondary);
      doc.text(
        'Sistema de Gestión Financiera • Estadísticas Generales • Documento válido para análisis',
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      doc.save(`${filename}.pdf`);
      log('PDF de estadísticas generado exitosamente');
      return true;
    }

    // Si no hay statistics, es un reporte normal
    return generateFinancePdf({
      financesData: data.finances || [],
      reportType: 'summary',
      title: data.title || 'Reporte Financiero'
    });

  } catch (error) {
    logError('Error generando PDF de finanzas:', error);
    throw error;
  }
};

// ✅ Función para generar PDF con filtros (COMPATIBILIDAD)
export const generateFilteredFinancePDF = (data, filename = 'filtered-finance-report') => {
  try {
    log('Generando PDF filtrado', { 
      recordCount: data.finances?.length || 0 
    });

    return generateFinancePdf({
      financesData: data.finances || [],
      reportType: data.reportType || 'summary',
      dateRange: data.dateRange,
      title: data.title || 'Reporte Filtrado'
    });

  } catch (error) {
    logError('Error generando PDF filtrado:', error);
    throw error;
  }
};

// Exportar todas las funciones necesarias
const pdfGenerator = {
  generateFinancePdf,
  handlePdfExport,
  generateDailyFinancePDF,
  generateFinancePDF,
  generateFilteredFinancePDF,
  // Exportar helpers para uso externo
  formatDate,
  formatDateTime,
  formatCurrency
};

export default pdfGenerator;