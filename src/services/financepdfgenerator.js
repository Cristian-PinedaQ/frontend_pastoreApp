// 📄 financePdfGenerator.js - Generador de PDF para reportes financieros v5.5 FINAL
// ✅ ZONA HORARIA: CORREGIDA - Usa getDateWithoutTimezone SIEMPRE
// ✅ Sin desfases - Muestra las fechas correctas en el PDF
// ✅ Reportes completos con desglose por concepto y método
// ✅ NUEVO: FIRST_FRUITS (Primicias) agregado al mapeo

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ========== FUNCIÓN AUXILIAR: Obtener fecha sin problemas de zona horaria ==========
const getDateWithoutTimezone = (dateString) => {
  // dateString es formato "2024-03-26"
  // Retorna un Date objeto que representa esa fecha a las 00:00:00 sin problemas de timezone
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Generar PDF de reporte diario o por rango de fechas
 * @param {Object} data - Datos para el PDF
 * @param {string} data.dateRange - Rango de fechas formateado (ej: "01/01/2024 - 31/12/2024")
 * @param {string} data.startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} data.endDate - Fecha final (YYYY-MM-DD)
 * @param {Array} data.finances - Array de registros financieros
 * @param {string} data.reportType - 'summary' o 'members'
 * @param {string} filename - Nombre del archivo sin extensión
 */
export const generateDailyFinancePDF = (data, filename = 'reporte-diario') => {
  try {
    console.log('📄 Iniciando generación de PDF diario/rango...');
    console.log('📊 Datos recibidos:', { 
      dateRange: data.dateRange, 
      startDate: data.startDate, 
      endDate: data.endDate,
      recordCount: data.finances?.length 
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // ========== HEADER ==========
    doc.setFillColor(5, 150, 105); // Verde
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE INGRESOS FINANCIEROS', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // 🔧 CORRECCIÓN v5.5: Usar dateRange que ya viene formateado CORRECTAMENTE
    let headerText = '';
    if (data.dateRange) {
      // ✅ Usar el rango que viene ya formateado correctamente desde FinancesPage
      headerText = data.dateRange;
      console.log('✅ Usando dateRange ya formateado:', headerText);
    } else if (data.startDate && data.endDate) {
      // Fallback: construir el rango aquí usando getDateWithoutTimezone
      const startDateObj = getDateWithoutTimezone(data.startDate);
      const endDateObj = getDateWithoutTimezone(data.endDate);
      const startFormatted = startDateObj.toLocaleDateString('es-CO');
      const endFormatted = endDateObj.toLocaleDateString('es-CO');
      headerText = `${startFormatted} - ${endFormatted}`;
      console.log('✅ Construido de startDate/endDate:', headerText);
    } else if (data.startDate) {
      const startDateObj = getDateWithoutTimezone(data.startDate);
      headerText = startDateObj.toLocaleDateString('es-CO');
    } else if (data.endDate) {
      const endDateObj = getDateWithoutTimezone(data.endDate);
      headerText = endDateObj.toLocaleDateString('es-CO');
    } else {
      headerText = 'Sin especificar';
    }
    
    // ✅ Mostrar el rango completo en el encabezado SIN DESFASE
    doc.text(headerText, pageWidth / 2, 20, { align: 'center' });

    yPosition = 35;

    // ========== INFORMACIÓN GENERAL ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Reporte', 15, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    // ✅ Mostrar el rango de fechas completo SIN DESFASE
    doc.text(`Período: ${headerText}`, 15, yPosition);
    yPosition += 4;
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`, 15, yPosition);
    yPosition += 10;

    // ========== RESUMEN DE TOTALES ==========
    const stats = calculateDailyStats(data.finances);

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('Resumen Financiero', 15, yPosition);
    yPosition += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total de Registros: ${stats.totalRecords}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Monto Total Recaudado: $ ${(stats.totalAmount || 0).toLocaleString('es-CO')}`, 15, yPosition);
    yPosition += 8;

    // ========== TABLA POR CONCEPTO ==========
    if (Object.keys(stats.byConcept).length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Desglose por Concepto', 15, yPosition);
      yPosition += 6;

      const conceptColumns = [
        { header: 'Concepto', dataKey: 'label' },
        { header: 'Registros', dataKey: 'count' },
        { header: 'Monto Total', dataKey: 'total' },
      ];

      const conceptData = Object.entries(stats.byConcept).map(([key, value]) => ({
        label: getConceptLabel(key),
        count: value.count,
        total: `$ ${(value.total || 0).toLocaleString('es-CO')}`,
      }));

      autoTable(doc, {
        columns: conceptColumns,
        body: conceptData,
        startY: yPosition,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244],
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== TABLA POR MÉTODO ==========
    if (Object.keys(stats.byMethod).length > 0) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('Desglose por Método de Pago', 15, yPosition);
      yPosition += 6;

      const methodColumns = [
        { header: 'Método', dataKey: 'label' },
        { header: 'Registros', dataKey: 'count' },
        { header: 'Monto Total', dataKey: 'total' },
      ];

      const methodData = Object.entries(stats.byMethod).map(([key, value]) => ({
        label: getMethodLabel(key),
        count: value.count,
        total: `$ ${(value.total || 0).toLocaleString('es-CO')}`,
      }));

      autoTable(doc, {
        columns: methodColumns,
        body: methodData,
        startY: yPosition,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244],
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== LISTA DE MIEMBROS (SI APLICA) ==========
    if (data.reportType === 'members' && data.finances && data.finances.length > 0) {
      // Nueva página si es necesario
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('Detalle de Aportes por Miembro', 15, yPosition);
      yPosition += 8;

      const membersColumns = [
        { header: 'Miembro', dataKey: 'memberName' },
        { header: 'Concepto', dataKey: 'concept' },
        { header: 'Método', dataKey: 'method' },
        { header: 'Monto', dataKey: 'amount' },
      ];

      const membersData = data.finances.map(finance => ({
        memberName: finance.memberName || 'Sin nombre',
        concept: getConceptLabel(finance.concept),
        method: getMethodLabel(finance.method),
        amount: `$ ${(finance.amount || 0).toLocaleString('es-CO')}`,
      }));

      autoTable(doc, {
        columns: membersColumns,
        body: membersData,
        startY: yPosition,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244],
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== NOTA AL PIE ==========
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporte generado automáticamente • ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

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
 * Generar PDF de registro de ingresos (función original mejorada)
 * @param {Object} data - Datos para el PDF
 * @param {string} filename - Nombre del archivo sin extensión
 */
export const generateFinancePDF = (data, filename = 'reporte-financiero') => {
  try {
    console.log('📄 Iniciando generación de PDF financiero...');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // ========== HEADER ==========
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE INGRESOS FINANCIEROS', pageWidth / 2, 12, { align: 'center' });

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
    doc.text(`Título: ${data.title || 'Registro de Ingresos'}`, 15, yPosition);
    yPosition += 6;
    doc.text(`Fecha: ${data.date}`, 15, yPosition);
    yPosition += 10;

    // ========== TABLA DE INGRESOS ==========
    if (data.finances && data.finances.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Listado de Ingresos', 15, yPosition);
      yPosition += 8;

      const tableColumns = [
        { header: 'Miembro', dataKey: 'memberName' },
        { header: 'Monto', dataKey: 'amount' },
        { header: 'Concepto', dataKey: 'concept' },
        { header: 'Método', dataKey: 'method' },
        { header: 'Estado', dataKey: 'status' },
        { header: 'Fecha', dataKey: 'date' },
      ];

      const tableData = data.finances.map(finance => ({
        memberName: finance.memberName || '',
        amount: `$ ${(finance.amount || 0).toLocaleString('es-CO')}`,
        concept: getConceptLabel(finance.concept),
        method: getMethodLabel(finance.method),
        status: finance.isVerified ? ' Verificado' : ' Pendiente',
        date: finance.registrationDate
          ? new Date(finance.registrationDate).toLocaleDateString('es-CO')
          : '-',
      }));

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
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== ESTADÍSTICAS ==========
    if (data.statistics && Object.keys(data.statistics).length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Estadísticas Financieras', 15, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      const stats = data.statistics;
      doc.text(`Total de Registros: ${stats.totalRecords || 0}`, 15, yPosition);
      yPosition += 6;
      doc.text(`Monto Total: $ ${(stats.totalAmount || 0).toLocaleString('es-CO')}`, 15, yPosition);
      yPosition += 6;
      doc.text(
        `Registros Verificados: ${stats.verifiedCount || 0} ($ ${(stats.verifiedAmount || 0).toLocaleString('es-CO')})`,
        15,
        yPosition
      );
      yPosition += 6;
      doc.text(
        `Registros Pendientes: ${stats.unverifiedCount || 0} ($ ${(stats.unverifiedAmount || 0).toLocaleString('es-CO')})`,
        15,
        yPosition
      );
      yPosition += 10;

      if (stats.byConcept && Object.keys(stats.byConcept).length > 0) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 15;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Detalle por Concepto', 15, yPosition);
        yPosition += 8;

        const conceptColumns = [
          { header: 'Concepto', dataKey: 'label' },
          { header: 'Registros', dataKey: 'count' },
          { header: 'Monto Total', dataKey: 'total' },
        ];

        const conceptData = Object.entries(stats.byConcept).map(([key, value]) => ({
          label: getConceptLabel(key),
          count: value.count,
          total: `$ ${(value.total || 0).toLocaleString('es-CO')}`,
        }));

        autoTable(doc, {
          columns: conceptColumns,
          body: conceptData,
          startY: yPosition,
          margin: { left: 15, right: 15 },
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          headStyles: {
            fillColor: [8, 145, 178],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
        });

        yPosition = doc.lastAutoTable.finalY + 10;
      }

      if (stats.byMethod && Object.keys(stats.byMethod).length > 0) {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = 15;
        }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Detalle por Método de Pago', 15, yPosition);
        yPosition += 8;

        const methodColumns = [
          { header: 'Método', dataKey: 'label' },
          { header: 'Registros', dataKey: 'count' },
          { header: 'Monto Total', dataKey: 'total' },
        ];

        const methodData = Object.entries(stats.byMethod).map(([key, value]) => ({
          label: getMethodLabel(key),
          count: value.count,
          total: `$ ${(value.total || 0).toLocaleString('es-CO')}`,
        }));

        autoTable(doc, {
          columns: methodColumns,
          body: methodData,
          startY: yPosition,
          margin: { left: 15, right: 15 },
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          headStyles: {
            fillColor: [8, 145, 178],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
        });
      }
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

// ========== FUNCIONES AUXILIARES ==========

/**
 * Calcular estadísticas de un rango de fechas
 */
const calculateDailyStats = (finances) => {
  const stats = {
    totalRecords: finances.length,
    totalAmount: 0,
    byConcept: {},
    byMethod: {},
  };

  finances.forEach(finance => {
    stats.totalAmount += finance.amount || 0;

    if (!stats.byConcept[finance.concept]) {
      stats.byConcept[finance.concept] = { count: 0, total: 0 };
    }
    stats.byConcept[finance.concept].count += 1;
    stats.byConcept[finance.concept].total += finance.amount || 0;

    if (!stats.byMethod[finance.method]) {
      stats.byMethod[finance.method] = { count: 0, total: 0 };
    }
    stats.byMethod[finance.method].count += 1;
    stats.byMethod[finance.method].total += finance.amount || 0;
  });

  return stats;
};

/**
 * Helper para obtener etiqueta de concepto
 */
const getConceptLabel = (concept) => {
  const map = {
    'TITHE': 'Diezmo',
    'OFFERING': 'Ofrenda',
    'SEED_OFFERING': 'Ofrenda de Semilla',
    'BUILDING_FUND': 'Fondo de Construcción',
    'FIRST_FRUITS': 'Primicias',
    'CELL_GROUP_OFFERING': 'Ofrenda Grupo de Célula',  // ✅ NUEVO: Ofrenda de Grupo de Célula
  };
  return map[concept] || concept;
};

/**
 * Helper para obtener etiqueta de método
 */
const getMethodLabel = (method) => {
  const map = {
    'CASH': 'Efectivo',
    'BANK_TRANSFER': 'Transferencia Bancaria',
  };
  return map[method] || method;
};