'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

async function fetchImageAsArrayBuffer(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.arrayBuffer();
}

export async function exportToExcel(
    vehicle: any, 
    driver: any, 
    currentMonth: Date, 
    cellStates: any, 
    dayHeaders: number[],
    headerStates: any
) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vehicle Usage Summary');

    const logoBuffer = await fetchImageAsArrayBuffer('/images/Aries_logo.png');
    const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });

    sheet.addImage(logoId, {
        tl: { col: 0.1, row: 0.2 },
        ext: { width: 160, height: 40 }
    });

    sheet.mergeCells('A1:H1');
    sheet.getRow(1).height = 35;

    sheet.mergeCells('B3:C3');
    sheet.getCell('B3').value = 'Job No:';
    sheet.getCell('D3').value = headerStates.jobNo || '';
    
    sheet.mergeCells('B4:C4');
    sheet.getCell('B4').value = 'Vehicle Type:';
    sheet.getCell('D4').value = headerStates.vehicleType || '';

    sheet.mergeCells('A5:B5');
    sheet.getCell('A5').value = vehicle?.vehicleNumber || '';
    sheet.getCell('A5').font = { bold: true, size: 14 };

    const headerRow = sheet.addRow(['DATE', 'START KM.', 'END KM.', 'TOTAL KM', 'OVER TIME', 'REMARKS']);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    let totalKm = 0;
    dayHeaders.forEach(day => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const startKm = Number(cellStates[`${day}-startKm`] || 0);
        const endKm = Number(cellStates[`${day}-endKm`] || 0);
        const dayTotal = endKm > startKm ? endKm - startKm : 0;
        totalKm += dayTotal;

        sheet.addRow([
            format(date, 'dd-MMM-yyyy'),
            startKm,
            endKm,
            dayTotal,
            cellStates[`${day}-overtime`] || '',
            cellStates[`${day}-remarks`] || ''
        ]);
    });
    
    sheet.addRow(['TOTAL KILOMETER', '', '', totalKm]);

    sheet.columns.forEach(column => {
        column.width = 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `VehicleUsage_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.xlsx`);
}

export async function exportToPdf(
    vehicle: any,
    driver: any,
    currentMonth: Date,
    cellStates: any,
    dayHeaders: number[],
    headerStates: any
) {
    const doc = new jsPDF();
    const logoBase64 = await fetchImageAsArrayBuffer('/images/Aries_logo.png');

    doc.addImage(logoBase64, 'PNG', 15, 10, 80, 20);

    doc.setFontSize(10);
    doc.text(`Job No: ${headerStates.jobNo || ''}`, 150, 20);
    doc.text(`Vehicle Type: ${headerStates.vehicleType || ''}`, 150, 30);
    
    doc.setFontSize(12);
    doc.text(`Vehicle No: ${vehicle?.vehicleNumber || ''}`, 15, 45);
    doc.text(`Driver: ${driver?.name || ''}`, 15, 55);

    let totalKm = 0;
    const body = dayHeaders.map(day => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const startKm = Number(cellStates[`${day}-startKm`] || 0);
        const endKm = Number(cellStates[`${day}-endKm`] || 0);
        const dayTotal = endKm > startKm ? endKm - startKm : 0;
        totalKm += dayTotal;

        return [
            format(date, 'dd-MMM-yyyy'),
            startKm || '',
            endKm || '',
            dayTotal || '',
            cellStates[`${day}-overtime`] || '',
            cellStates[`${day}-remarks`] || ''
        ];
    });

    (doc as any).autoTable({
        head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OVER TIME', 'REMARKS']],
        body,
        startY: 65,
    });
    
    let finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text(`TOTAL KILOMETER: ${totalKm}`, 15, finalY);
    
    finalY += 30;
    doc.text(`Verified By -`, 15, finalY);
    doc.text(`Name: ${headerStates.verifiedByName || ''}`, 15, finalY + 15);
    doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, 15, finalY + 30);
    
    doc.save(`VehicleUsage_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
