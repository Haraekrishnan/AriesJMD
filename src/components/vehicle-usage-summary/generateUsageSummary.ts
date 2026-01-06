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
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image for PDF:', error);
        return '';
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
  const sheet = workbook.addWorksheet('Vehicle Log');

  /* ---------------- LOGO ---------------- */
  try {
    const response = await fetch('/images/Aries_logo.png');
    const logoBuffer = await response.arrayBuffer();
    const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
    sheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 160, height: 50 },
    });
  } catch {}

  /* ---------------- HEADER LEFT ---------------- */
  sheet.getCell('A3').value = vehicle?.vehicleNumber || '';
  sheet.getCell('A3').font = { size: 14, bold: true };

  /* TOTAL KM */
  let totalKm = 0;
  dayHeaders.forEach(day => {
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    totalKm += e > s ? e - s : 0;
  });

  sheet.getCell('A4').value = 'TOTAL KM';
  sheet.getCell('B4').value = totalKm;
  sheet.getCell('A4').font = sheet.getCell('B4').font = { bold: true };

  /* ---------------- HEADER CENTER/RIGHT BLOCK ---------------- */
  const centerHeader = [
    ['Job No:', headerStates.jobNo],
    ['Vehicle Type:', headerStates.vehicleType],
    ['EXTRA KM:', headerStates.extraKm || 0],
    ['OVER TIME:', headerStates.headerOvertime || ''],
    ['EXTRA NIGHT:', headerStates.extraNight || 0],
    ['EXTRA DAYS:', headerStates.extraDays || 0],
  ];

  centerHeader.forEach((r, i) => {
    const row = sheet.getRow(i + 1);
    const cellLabel = row.getCell('D');
    const cellValue = row.getCell('E');
    
    cellLabel.value = r[0];
    cellValue.value = r[1];

    cellLabel.font = { bold: true };
    cellLabel.alignment = { horizontal: 'right' };
    cellValue.alignment = { horizontal: 'left' };

    ['D', 'E'].forEach(col => {
      row.getCell(col).border = {
        top: i === 0 ? {style:'thin'} : undefined,
        left: col === 'D' ? {style:'thin'} : undefined,
        bottom: i === centerHeader.length - 1 ? {style:'thin'} : undefined,
        right: col === 'E' ? {style:'thin'} : undefined,
      };
    });
  });
  
  const startRow = 8;
  const headerRow = sheet.getRow(startRow);
  headerRow.values = ['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF02B396' } };
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  /* ---------------- TABLE BODY ---------------- */
  dayHeaders.forEach(day => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const startKm = Number(cellStates[`${day}-startKm`] || 0);
    const endKm = Number(cellStates[`${day}-endKm`] || 0);
    const total = endKm > startKm ? endKm - startKm : 0;
    const remark = cellStates[`${day}-remarks`] || '';

    const row = sheet.addRow([format(date, 'dd-MMM-yyyy'), startKm || '', endKm || '', total || '', cellStates[`${day}-overtime`] || '', remark]);
    row.eachCell(c => {
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    if (date.getDay() === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; });
    }
  });

  sheet.addRow([]);
  const totalRow = sheet.addRow(['', '', 'TOTAL KILOMETER', totalKm]);
  totalRow.font = { bold: true };
  sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.getCell('A').alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell('D').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.addRow([]);
  sheet.addRow(['Verified By:']);
  sheet.addRow(['Name:', headerStates.verifiedByName || '']);
  sheet.addRow(['Designation:', headerStates.verifiedByDesignation || '']);

  sheet.columns = [ { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 30 } ];

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.xlsx`);
}


export async function exportToPdf(
  vehicle: Vehicle | undefined,
  driver: Driver | undefined,
  currentMonth: Date,
  cellStates: any,
  dayHeaders: number[],
  headerStates: any
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logo = await fetchImageAsBase64('/images/Aries_logo.png');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;

  if (logo) doc.addImage(logo, 'PNG', margin, 30, 120, 35);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(vehicle?.vehicleNumber || '', margin, 85);

  let totalKmValue = 0;
  dayHeaders.forEach(d => {
    const s = Number(cellStates[`${d}-startKm`] || 0);
    const e = Number(cellStates[`${d}-endKm`] || 0);
    totalKmValue += e > s ? e - s : 0;
  });
  
  const rightHeaderContent = [
    [`Job No:`, `${headerStates.jobNo || ''}`],
    [`Vehicle Type:`, `${headerStates.vehicleType || ''}`],
    [`EXTRA KM:`, `${headerStates.extraKm || 0}`],
    [`OVER TIME:`, `${headerStates.headerOvertime || ''}`],
    [`EXTRA NIGHT:`, `${headerStates.extraNight || 0}`],
    [`EXTRA DAYS:`, `${headerStates.extraDays || 0}`],
  ];

  doc.autoTable({
    body: rightHeaderContent,
    startY: 30,
    theme: 'plain',
    tableWidth: 180,
    margin: { left: pageWidth - margin - 180 },
    styles: { fontSize: 8, cellPadding: 1, halign: 'left' },
    columnStyles: { 0: { fontStyle: 'bold' } },
    didDrawCell: data => {
        data.cell.styles.lineWidth = 0.5;
        data.cell.styles.strokeColor = [0,0,0];
    }
  });


  const body = dayHeaders.map(day => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    const t = e > s ? e - s : 0;
    return [
      format(d, 'dd-MMM-yyyy'), s || '', e || '', t || '',
      cellStates[`${day}-overtime`] || '',
      cellStates[`${day}-remarks`] || '',
      d.getDay() === 0 ? 'HIGHLIGHT' : '',
    ];
  });
  
  body.push([
    { content: 'TOTAL KILOMETER', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, 
    { content: totalKmValue, styles: { halign: 'center', fontStyle: 'bold' } }, 
    '', ''
  ]);

  doc.autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: (doc as any).lastAutoTable.finalY + 15,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center', cellPadding: 4 },
    headStyles: { fillColor: [2, 179, 150], textColor: 255, fontStyle: 'bold' },
    didParseCell: (data: any) => {
      if (data.row.raw[6] === 'HIGHLIGHT') data.cell.styles.fillColor = [255, 255, 153];
    },
    columnStyles: {
      0: { cellWidth: 70 }, 1: { cellWidth: 70 }, 2: { cellWidth: 70 },
      3: { cellWidth: 70 }, 4: { cellWidth: 50 }, 5: { cellWidth: 'auto', halign: 'left' },
    },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 30;
  doc.setFont('helvetica', 'bold');
  doc.text('Verified By:', margin, finalY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${headerStates.verifiedByName || ''}`, margin, finalY + 15);
  doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, margin, finalY + 30);

  doc.save(`Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
