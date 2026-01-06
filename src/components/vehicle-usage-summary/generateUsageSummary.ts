
'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { Vehicle, Driver } from '@/lib/types';

async function fetchImageAsBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image for PDF:', error);
        return ''; // Return empty string on failure
    }
}

export async function exportToExcel(
    vehicle: Vehicle | undefined, 
    driver: Driver | undefined, 
    currentMonth: Date, 
    cellStates: any, 
    dayHeaders: number[],
    headerStates: any
) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vehicle Usage Summary');

    try {
        const logoBuffer = await (await fetch('/images/Aries_logo.png')).arrayBuffer();
        const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
        sheet.addImage(logoId, {
            tl: { col: 0.1, row: 0.2 },
            ext: { width: 160, height: 40 }
        });
    } catch (e) {
        console.error("Could not add logo to excel", e);
    }
    
    sheet.mergeCells('A1:F1');
    sheet.getRow(1).height = 35;

    sheet.getCell('B3').value = 'Job No:';
    sheet.getCell('C3').value = headerStates.jobNo || '';
    
    sheet.getCell('B4').value = 'Vehicle Type:';
    sheet.getCell('C4').value = headerStates.vehicleType || '';

    sheet.mergeCells('A5:F5');
    sheet.getCell('A5').value = `VEHICLE NO: ${vehicle?.vehicleNumber || ''}`;
    sheet.getCell('A5').font = { bold: true, size: 12 };
    
    const headerRow = sheet.addRow(['DATE', 'START KM.', 'END KM.', 'TOTAL KM', 'OVERTIME', 'REMARKS']);
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
            startKm || '',
            endKm || '',
            dayTotal || '',
            cellStates[`${day}-overtime`] || '',
            cellStates[`${day}-remarks`] || ''
        ]);
    });
    
    sheet.addRow(['TOTAL KILOMETER', '', '', totalKm]);

    sheet.columns.forEach(column => {
        column.width = 20;
    });

    const footerRowIndex = sheet.lastRow!.number + 2;
    sheet.getCell(`A${footerRowIndex}`).value = `Verified By:`;
    sheet.getCell(`A${footerRowIndex + 1}`).value = `Name: ${headerStates.verifiedByName || ''}`;
    sheet.getCell(`A${footerRowIndex + 2}`).value = `Designation: ${headerStates.verifiedByDesignation || ''}`;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `VehicleUsage_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.xlsx`);
}

export async function exportToPdf(
    vehicle: Vehicle | undefined,
    driver: Driver | undefined,
    currentMonth: Date,
    cellStates: any,
    dayHeaders: number[],
    headerStates: any
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    if(logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, margin, 120, 30);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const jobInfoX = pageWidth - margin;
    doc.text(`Job No: ${headerStates.jobNo || ''}`, jobInfoX, margin + 10, { align: 'right' });
    doc.text(`Vehicle Type: ${headerStates.vehicleType || ''}`, jobInfoX, margin + 25, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Vehicle No: ${vehicle?.vehicleNumber || ''}`, pageWidth / 2, margin + 50, { align: 'center' });
    
    let totalKm = 0;
    const body = dayHeaders.map(day => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const startKm = Number(cellStates[`${day}-startKm`] || 0);
        const endKm = Number(cellStates[`${day}-endKm`] || 0);
        const dayTotal = endKm > startKm ? endKm - startKm : 0;
        totalKm += dayTotal;

        return [
            format(date, 'dd-MMM-yy'),
            startKm || '',
            endKm || '',
            dayTotal || '',
            cellStates[`${day}-overtime`] || '',
            cellStates[`${day}-remarks`] || ''
        ];
    });

    (doc as any).autoTable({
        head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OVERTIME', 'REMARKS']],
        body,
        startY: margin + 60,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        headStyles: { fontSize: 9, fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0, 0, 0], halign: 'center' },
        columnStyles: {
            0: { cellWidth: 60, halign: 'center' },
            1: { cellWidth: 60, halign: 'center' },
            2: { cellWidth: 60, halign: 'center' },
            3: { cellWidth: 60, halign: 'center' },
            4: { cellWidth: 60, halign: 'center' },
            5: { cellWidth: 'auto' },
        },
        didParseCell: function (data: any) {
            if (data.row.section === 'body') {
                data.cell.styles.halign = 'center';
            }
        },
        didDrawPage: (data: any) => {
            let finalY = data.cursor.y + 15;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`TOTAL KILOMETER: ${totalKm}`, margin, finalY);
            
            finalY += 40;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Verified By:`, margin, finalY);
            finalY += 15;
            doc.text(`Name: ${headerStates.verifiedByName || ''}`, margin, finalY);
            finalY += 15;
            doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, margin, finalY);
        }
    });
    
    doc.save(`VehicleUsage_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
