
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
    
    // Header section
    sheet.mergeCells('A1:F1');
    sheet.getRow(1).height = 35;
    
    const headerDetails = [
        { label: 'Job No:', value: headerStates.jobNo || '' },
        { label: 'Vehicle Type', value: headerStates.vehicleType || '' },
        { label: 'EXTRA KM', value: headerStates.extraKm || 0 },
        { label: 'OVER TIME', value: headerStates.headerOvertime || '' },
        { label: 'EXTRA NIGHT', value: headerStates.extraNight || 0 },
        { label: 'EXTRA DAYS', value: headerStates.extraDays || 0 },
    ];
    
    headerDetails.forEach((detail, index) => {
        sheet.getCell(`E${index + 1}`).value = detail.label;
        sheet.getCell(`F${index + 1}`).value = detail.value;
    });

    sheet.getCell('A2').value = vehicle?.vehicleNumber || '';
    sheet.getCell('A2').font = { bold: true, size: 14 };

    let totalKm = 0;
    dayHeaders.forEach(day => {
        const startKm = Number(cellStates[`${day}-startKm`] || 0);
        const endKm = Number(cellStates[`${day}-endKm`] || 0);
        totalKm += endKm > startKm ? endKm - startKm : 0;
    });
    sheet.getCell('A3').value = 'TOTAL KM';
    sheet.getCell('B3').value = totalKm;
    sheet.getCell('A3').font = { bold: true };
    sheet.getCell('B3').font = { bold: true };

    
    const headerRow = sheet.addRow(['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OVERTIME', 'REMARKS']);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    dayHeaders.forEach(day => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const startKm = Number(cellStates[`${day}-startKm`] || 0);
        const endKm = Number(cellStates[`${day}-endKm`] || 0);
        const dayTotal = endKm > startKm ? endKm - startKm : 0;

        sheet.addRow([
            format(date, 'dd-MM-yyyy'),
            startKm || '',
            endKm || '',
            dayTotal || '',
            cellStates[`${day}-overtime`] || '',
            cellStates[`${day}-remarks`] || ''
        ]);
    });

    sheet.columns = [
        { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 30 }
    ];

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
    const margin = 30;

    // --- HEADER ---
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 30, 100, 25);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(vehicle?.vehicleNumber || '', margin, 75);

    let totalKm = 0;
    dayHeaders.forEach(day => {
        const startKm = Number(cellStates[`${day}-startKm`] || 0);
        const endKm = Number(cellStates[`${day}-endKm`] || 0);
        totalKm += endKm > startKm ? endKm - startKm : 0;
    });

    doc.setFontSize(10);
    doc.text('TOTAL KM', margin, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(String(totalKm), margin + 60, 90);

    const headerRightX = pageWidth - margin;
    doc.setFontSize(8);
    const headerDetails = [
      `Job No: ${headerStates.jobNo || ''}`,
      `Vehicle Type: ${headerStates.vehicleType || ''}`,
      `EXTRA KM: ${headerStates.extraKm || 0}`,
      `OVER TIME: ${headerStates.headerOvertime || ''}`,
      `EXTRA NIGHT: ${headerStates.extraNight || 0}`,
      `EXTRA DAYS: ${headerStates.extraDays || 0}`,
    ];

    let headerY = 40;
    headerDetails.forEach(line => {
      doc.text(line, headerRightX, headerY, { align: 'right' });
      headerY += 10;
    });

    // --- TABLE ---
    const body = dayHeaders.map(day => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const startKm = Number(cellStates[`${day}-startKm`] || 0);
        const endKm = Number(cellStates[`${day}-endKm`] || 0);
        const dayTotal = endKm > startKm ? endKm - startKm : 0;

        return [
            format(date, 'dd-MM-yy'),
            startKm || '',
            endKm || '',
            dayTotal || '',
            cellStates[`${day}-overtime`] || '',
            cellStates[`${day}-remarks`] || ''
        ];
    });
    
    const totalRow = ['Total', '', '', totalKm, '', ''];
    body.push(totalRow);

    (doc as any).autoTable({
        head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OVERTIME', 'REMARKS']],
        body,
        startY: 110,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
        headStyles: { fontSize: 9, fontStyle: 'bold', fillColor: [230, 230, 230], textColor: [0, 0, 0], halign: 'center' },
        columnStyles: {
            0: { cellWidth: 60, halign: 'center' },
            1: { cellWidth: 55, halign: 'center' },
            2: { cellWidth: 55, halign: 'center' },
            3: { cellWidth: 55, halign: 'center' },
            4: { cellWidth: 55, halign: 'center' },
            5: { cellWidth: 'auto' },
        },
        didParseCell: (data: any) => {
            if (data.row.raw[0] === 'Total') {
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });
    
    // --- FOOTER ---
    let finalY = (doc as any).lastAutoTable.finalY + 30;
    const pageHeight = doc.internal.pageSize.getHeight();
    if(finalY > pageHeight - 50) {
        doc.addPage();
        finalY = margin;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Verified By:', margin, finalY);
    finalY += 15;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${headerStates.verifiedByName || ''}`, margin, finalY);
    finalY += 15;
    doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, margin, finalY);

    doc.save(`VehicleUsage_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
