// 📄 financePdfGenerator.js - v7 CON SOPORTE COMPLETO PARA FILTROS
// ✅ generateFilteredFinancePDF: Genera PDF con filtros por mes/año
// ✅ Soporta comparativa mes a mes para filtro anual
// ✅ Título dinámico según filtro seleccionado

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ========== FUNCIÓN AUXILIAR: Obtener fecha sin problemas de zona horaria ==========
const getDateWithoutTimezone = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * ✅ NUEVO: Generar PDF CON FILTROS (mes, año, comparativa)
 * @param {Object} filterInfo - Información del filtro
 * @param {string} filterInfo.filterType - 'all', 'month', 'year'
 * @param {number} filterInfo.selectedMonth - Mes seleccionado (1-12)
 * @param {number} filterInfo.selectedYear - Año seleccionado
 * @param {Array} filterInfo.filteredFinances - Finanzas filtradas
 * @param {Object} filterInfo.totalStats - Estadísticas totales
 * @param {Array} filterInfo.conceptChartData - Datos de concepto para gráfico
 * @param {Array} filterInfo.methodChartData - Datos de método para gráfico
 * @param {Array} filterInfo.verificationData - Datos de verificación
 * @param {Array} filterInfo.monthlyComparison - Comparativa mes a mes (opcional)
 */
export const generateFilteredFinancePDF = (filterInfo) => {
  try {
    console.log('📄 Iniciando generación de PDF con filtros...');
    console.log('   Tipo de filtro:', filterInfo.filterType);
    console.log('   Registros a incluir:', filterInfo.filteredFinances?.length || 0);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // ========== DETERMINAR TÍTULO SEGÚN FILTRO ==========
    let reportTitle = 'REPORTE DE INGRESOS FINANCIEROS';
    let subtitleText = '';
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    if (filterInfo.filterType === 'month') {
      subtitleText = `${monthNames[filterInfo.selectedMonth - 1]} de ${filterInfo.selectedYear}`;
    } else if (filterInfo.filterType === 'year') {
      subtitleText = `Año ${filterInfo.selectedYear}`;
    } else {
      subtitleText = 'Datos Completos';
    }

    // ========== HEADER ==========
    doc.setFillColor(5, 150, 105); // Verde
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(reportTitle, pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(subtitleText, pageWidth / 2, 24, { align: 'center' });

    yPosition = 40;

    // ========== INFORMACIÓN DEL REPORTE ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Reporte', 15, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    if (filterInfo.filterType === 'month') {
      doc.text(`Período: ${monthNames[filterInfo.selectedMonth - 1]} ${filterInfo.selectedYear}`, 15, yPosition);
    } else if (filterInfo.filterType === 'year') {
      doc.text(`Período: Año ${filterInfo.selectedYear}`, 15, yPosition);
    } else {
      doc.text('Período: Datos Completos', 15, yPosition);
    }
    yPosition += 5;

    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`, 15, yPosition);
    yPosition += 10;

    // ========== RESUMEN DE TOTALES ==========
    const stats = filterInfo.totalStats;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('Resumen Financiero', 15, yPosition);
    yPosition += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total de Registros: ${stats.totalRecords || 0}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Monto Total Recaudado: $ ${(stats.totalAmount || 0).toLocaleString('es-CO')}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Verificados: ${stats.verifiedCount || 0} registros - $ ${(stats.verifiedAmount || 0).toLocaleString('es-CO')}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Pendientes: ${stats.unverifiedCount || 0} registros - $ ${(stats.unverifiedAmount || 0).toLocaleString('es-CO')}`, 15, yPosition);
    yPosition += 10;

    // ========== TABLA POR CONCEPTO ==========
    if (filterInfo.conceptChartData && filterInfo.conceptChartData.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Desglose por Concepto', 15, yPosition);
      yPosition += 6;

      const conceptColumns = [
        { header: 'Concepto', dataKey: 'name' },
        { header: 'Registros', dataKey: 'cantidad' },
        { header: 'Monto Total', dataKey: 'monto' },
      ];

      const conceptData = filterInfo.conceptChartData.map(item => ({
        name: item.name,
        cantidad: item.cantidad,
        monto: `$ ${(item.monto * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
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
    if (filterInfo.methodChartData && filterInfo.methodChartData.length > 0) {
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
        { header: 'Método', dataKey: 'name' },
        { header: 'Registros', dataKey: 'cantidad' },
        { header: 'Monto Total', dataKey: 'monto' },
      ];

      const methodData = filterInfo.methodChartData.map(item => ({
        name: item.name,
        cantidad: item.cantidad,
        monto: `$ ${(item.monto * 1000).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
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

    // ========== COMPARATIVA MES A MES (SI ES FILTRO ANUAL) ==========
    if (filterInfo.filterType === 'year' && filterInfo.monthlyComparison && filterInfo.monthlyComparison.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`Comparativa Mensual - Año ${filterInfo.selectedYear}`, 15, yPosition);
      yPosition += 8;

      const monthColumns = [
        { header: 'Mes', dataKey: 'month' },
        { header: 'Registros', dataKey: 'count' },
        { header: 'Total Mensual', dataKey: 'total' },
      ];

      const monthData = filterInfo.monthlyComparison.map(month => ({
        month: month.month,
        count: month.count,
        total: `$ ${(month.total || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
      }));

      autoTable(doc, {
        columns: monthColumns,
        body: monthData,
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

    // ========== LISTA DETALLADA DE REGISTROS ==========
    if (filterInfo.filteredFinances && filterInfo.filteredFinances.length > 0) {
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text('Detalle de Registros', 15, yPosition);
      yPosition += 8;

      const detailColumns = [
        { header: 'Miembro', dataKey: 'memberName' },
        { header: 'Concepto', dataKey: 'concept' },
        { header: 'Monto', dataKey: 'amount' },
        { header: 'Método', dataKey: 'method' },
        { header: 'Estado', dataKey: 'status' },
        { header: 'Fecha', dataKey: 'date' },
      ];

      const detailData = filterInfo.filteredFinances.map(f => ({
        memberName: f.memberName || 'Sin nombre',
        concept: getConceptLabel(f.concept || f.incomeConcept),
        amount: `$ ${(f.amount || 0).toLocaleString('es-CO')}`,
        method: getMethodLabel(f.method || f.incomeMethod),
        status: f.isVerified ? 'Verificado' : 'Pendiente',
        date: f.registrationDate 
          ? new Date(f.registrationDate).toLocaleDateString('es-CO')
          : '-',
      }));

      autoTable(doc, {
        columns: detailColumns,
        body: detailData,
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
          0: { cellWidth: 35 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
        },
      });

      yPosition = doc.lastAutoTable.finalY + 10;
    }

    // ========== NOTA AL PIE ==========
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporte generado automáticamente • ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // ========== GUARDAR ==========
    let filename = 'reporte-financiero';

    if (filterInfo.filterType === 'month') {
      const monthName = monthNames[filterInfo.selectedMonth - 1].toLowerCase();
      filename = `reporte-${monthName}-${filterInfo.selectedYear}`;
    } else if (filterInfo.filterType === 'year') {
      filename = `reporte-anual-${filterInfo.selectedYear}`;
    }

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
 * Generador de PDF original (mantenido para compatibilidad)
 */
export const generateDailyFinancePDF = (data, filename = 'reporte-diario') => {
  try {
    console.log('📄 Iniciando generación de PDF diario...');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;

    // ========== HEADER ==========
    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE INGRESOS FINANCIEROS', pageWidth / 2, 12, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(
      data.dateRange || new Date().toLocaleDateString('es-CO'),
      pageWidth / 2,
      20,
      { align: 'center' }
    );

    yPosition = 35;

    // ========== INFORMACIÓN GENERAL ==========
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Información del Reporte', 15, yPosition);
    yPosition += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${data.dateRange || 'Sin especificar'}`, 15, yPosition);
    yPosition += 4;
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString()}`, 15, yPosition);
    yPosition += 10;

    // ========== RESUMEN DE TOTALES ==========
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('Resumen Financiero', 15, yPosition);
    yPosition += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total de Registros: ${data.totalRecords || 0}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Monto Total: $ ${(data.totalAmount || 0).toLocaleString('es-CO')}`, 15, yPosition);
    yPosition += 10;

    // ========== NOTA AL PIE ==========
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Reporte generado automáticamente • ${new Date().toLocaleDateString('es-CO')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${timestamp}.pdf`;

    doc.save(fullFilename);
    console.log('✅ PDF generado:', fullFilename);

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    alert('Error al generar PDF: ' + error.message);
    throw error;
  }
};

/**
 * Generador de PDF original (mantenido para compatibilidad)
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

    // HEADER
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE INGRESOS FINANCIEROS', pageWidth / 2, 12, { align: 'center' });

    yPosition = 35;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 15, yPosition);
    yPosition += 10;

    doc.text(`Total de Registros: ${data.totalRecords || 0}`, 15, yPosition);
    yPosition += 5;
    doc.text(`Monto Total: $ ${(data.totalAmount || 0).toLocaleString('es-CO')}`, 15, yPosition);

    const timestamp = new Date().toISOString().split('T')[0];
    const fullFilename = `${filename}_${timestamp}.pdf`;

    doc.save(fullFilename);
    console.log('✅ PDF generado:', fullFilename);

  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    throw error;
  }
};

// ========== FUNCIONES AUXILIARES ==========

const getConceptLabel = (concept) => {
  const map = {
    'TITHE': 'Diezmo',
    'OFFERING': 'Ofrenda',
    'SEED_OFFERING': 'Ofrenda de Semilla',
    'BUILDING_FUND': 'Fondo de Construcción',
    'FIRST_FRUITS': 'Primicias',
    'CELL_GROUP_OFFERING': 'Ofrenda Grupo de Célula',
  };
  return map[concept] || concept;
};

const getMethodLabel = (method) => {
  const map = {
    'CASH': 'Efectivo',
    'BANK_TRANSFER': 'Transferencia Bancaria',
  };
  return map[method] || method;
};