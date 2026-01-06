
'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, getDay, parseISO, isValid } from 'date-fns';
import type { Vehicle, Driver, User } from '@/lib/types';

async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Failed to fetch image: ${response.statusText} from ${url}`);
        return null;
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error fetching image for Excel:', error);
    return null;
  }
}

async function fetchImageAsBase64(imgPath: string): Promise<string> {
    const url = imgPath.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${imgPath}` : imgPath;
    try {
        const response = await fetch(url);
        if (!response.ok) {
             console.error(`Failed to fetch image: ${response.statusText} from ${url}`);
             return '';
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
        return '';
    }
}

const SIGNATURES: Record<string, string> = {
    'Harirkrishnan P S': '/images/hari_sign.jpg',
    'MANU M G': '/images/Manu_Sign.jpg',
};

export async function exportToExcel(
  vehicle: Vehicle | undefined,
  driver: Driver | undefined,
  currentMonth: Date,
  cellStates: any,
  dayHeaders: number[],
  headerStates: any,
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Vehicle Log');
  
  try {
    const logoBuffer = await fetchImageAsBuffer('/images/Aries_logo.png');
    if (logoBuffer) {
      const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
      sheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 160, height: 40 },
      });
    }
  } catch (e) { console.error(e)}

  sheet.mergeCells('A3:D3');
  const vehicleCell = sheet.getCell('A3');
  vehicleCell.value = vehicle?.vehicleNumber || '';
  vehicleCell.font = { size: 14, bold: true, name: 'Calibri' };
  vehicleCell.alignment = { horizontal: 'left', vertical: 'middle' };

  const rightHeaderData = [
    ['JOB NO', (headerStates.jobNo || '').toUpperCase()],
    ['VEHICLE TYPE', (headerStates.vehicleType || '').toUpperCase()],
    ['EXTRA KM', headerStates.extraKm || 0],
    ['OVER TIME', headerStates.headerOvertime || ''],
    ['EXTRA NIGHT', headerStates.extraNight || 0],
    ['EXTRA DAYS', headerStates.extraDays || 0],
  ];

  const greyBorder = {
    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
  };
  
  const startRow = 1;
  const startCol = 5;
  
  rightHeaderData.forEach((r, i) => {
    const row = sheet.getRow(startRow + i);
    const cellLabel = row.getCell(startCol);
    const cellValue = row.getCell(startCol + 1);
    
    cellLabel.value = r[0];
    cellValue.value = r[1];
    cellLabel.font = { name: 'Calibri', size: 11, bold: true };
    cellValue.font = { name: 'Calibri', size: 11 };
    
    [cellLabel, cellValue].forEach(cell => {
      cell.border = greyBorder;
      cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    });
  });

  sheet.addRow([]);

  const tableHeaderRowIndex = 8;
  const headerRow = sheet.getRow(tableHeaderRowIndex);
  headerRow.values = ['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OVER TIME', 'REMARKS'];
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF02B396' } };
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  let totalKm = 0;
  dayHeaders.forEach(day => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const startKm = Number(cellStates[`${day}-startKm`] || 0);
    const endKm = Number(cellStates[`${day}-endKm`] || 0);
    const total = endKm > startKm ? endKm - startKm : 0;
    totalKm += total;
    const isHoliday = cellStates[`${day}-isHoliday`] || getDay(date) === 0;

    const row = sheet.addRow([
      format(date, 'dd-MMM-yyyy'),
      startKm || '',
      endKm || '',
      total || '',
      cellStates[`${day}-overtime`] || '',
      cellStates[`${day}-remarks`] || '',
    ]);

    row.eachCell(c => {
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.font = { name: 'Calibri', size: 11 };
      if (isHoliday) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      }
    });
  });

  const totalRow = sheet.addRow(['', '', 'TOTAL KILOMETER:', totalKm, '', '']);
  sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.getCell('A').alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell('D').alignment = { horizontal: 'center', vertical: 'middle' };
  totalRow.font = { bold: true, name: 'Calibri', size: 11 };
  totalRow.eachCell(c => c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
  
  let footerRowIndex = sheet.lastRow!.number + 2;
  const verifiedRow = sheet.getRow(footerRowIndex);
  sheet.mergeCells(footerRowIndex, 1, footerRowIndex, 2);
  const verifiedCell = verifiedRow.getCell(1);
  verifiedCell.value = `Verified By:\n${headerStates.verifiedByName || ''}`;
  verifiedCell.border = greyBorder;
  verifiedCell.alignment = { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true };
  
  sheet.mergeCells(footerRowIndex, 3, footerRowIndex, 4);
  const dateCell = verifiedRow.getCell(3);
  dateCell.value = `Verified By Date:\n${headerStates.verifiedByDate ? format(headerStates.verifiedByDate, 'dd-MM-yyyy') : ''}`;
  dateCell.border = greyBorder;
  dateCell.alignment = { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true };
  
  sheet.mergeCells(footerRowIndex, 5, footerRowIndex, 6);
  const signCell = verifiedRow.getCell(5);
  signCell.value = 'Signature:\n';
  signCell.border = greyBorder;
  signCell.alignment = { vertical: 'top', horizontal: 'left', indent: 1, wrapText: true };

  const signaturePath = SIGNATURES[headerStates.verifiedByName];
  if (signaturePath) {
      try {
        const signatureBuffer = await fetchImageAsBuffer(signaturePath);
        if (signatureBuffer) {
          const signatureId = workbook.addImage({ buffer: signatureBuffer, extension: 'jpg' });
          sheet.addImage(signatureId, {
            tl: { col: 4.2, row: footerRowIndex - 0.2 },
            ext: { width: 80, height: 35 }
          });
        }
      } catch (e) { console.error('Signature could not be added to Excel', e); }
  }


  verifiedRow.height = 40;

  sheet.columns = [
    { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 30 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer]),
    `Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.xlsx`
  );
}

export async function exportToPdf(
  vehicle: Vehicle | undefined,
  driver: Driver | undefined,
  currentMonth: Date,
  cellStates: any,
  dayHeaders: number[],
  headerStates: any,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;
  
  let currentY = 25;

  if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, currentY, 160, 40);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(vehicle?.vehicleNumber || '', margin, currentY + 60);

  const rightHeaderData = [
    ['JOB NO', (headerStates.jobNo || '').toUpperCase()],
    ['VEHICLE TYPE', (headerStates.vehicleType || '').toUpperCase()],
    ['EXTRA KM', headerStates.extraKm || 0],
    ['OVER TIME', headerStates.headerOvertime || ''],
    ['EXTRA NIGHT', headerStates.extraNight || 0],
    ['EXTRA DAYS', headerStates.extraDays || 0],
  ];

  (doc as any).autoTable({
    body: rightHeaderData,
    startY: currentY,
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica', cellPadding: 4, lineColor: [180, 180, 180], lineWidth: 0.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { cellWidth: 90 } },
    tableWidth: 170,
    margin: { left: pageWidth - margin - 170 },
  });
  
  currentY = (doc as any).lastAutoTable.finalY + 20;
  
  let totalKm = 0;
  const body = dayHeaders.map(day => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    const t = e > s ? e - s : 0;
    totalKm += t;
    const isHoliday = cellStates[`${day}-isHoliday`] || getDay(d) === 0;

    return [
      { content: format(d, 'dd-MMM-yyyy'), styles: { fillColor: isHoliday ? [255, 255, 204] : undefined } },
      { content: s || '', styles: { fillColor: isHoliday ? [255, 255, 204] : undefined } },
      { content: e || '', styles: { fillColor: isHoliday ? [255, 255, 204] : undefined } },
      { content: t || '', styles: { fillColor: isHoliday ? [255, 255, 204] : undefined } },
      { content: cellStates[`${day}-overtime`] || '', styles: { fillColor: isHoliday ? [255, 255, 204] : undefined } },
      { content: cellStates[`${day}-remarks`] || '', styles: { fillColor: isHoliday ? [255, 255, 204] : undefined } },
    ];
  });
  
  body.push([{ content: 'TOTAL KILOMETER:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' }}, { content: totalKm, styles: { fontStyle: 'bold' } }, '', '']);

  (doc as any).autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: currentY,
    styles: { fontSize: 9, halign: 'center', font: 'helvetica', cellPadding: 4, minCellHeight: 20 },
    headStyles: { fillColor: [2, 179, 150], textColor: 255, fontStyle: 'bold' },
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 50 },
      5: { cellWidth: 'auto', halign: 'left' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 30;
  const signatureBlockWidth = (pageWidth - (margin * 2)) / 3;

  const footerLabels = [
    { content: 'Verified By:', styles: { fontStyle: 'bold', valign: 'top' } },
    { content: 'Verified By Date:', styles: { fontStyle: 'bold', valign: 'top' } },
    { content: 'Signature:', styles: { fontStyle: 'bold', valign: 'top' } },
  ];
  
  const footerValues = [
    headerStates.verifiedByName || '',
    headerStates.verifiedByDate ? format(headerStates.verifiedByDate, 'dd-MM-yyyy') : '',
    '' // Empty for signature
  ];

  (doc as any).autoTable({
    startY: finalY,
    body: [footerLabels, footerValues],
    theme: 'grid',
    styles: { fontSize: 9, font: 'helvetica', cellPadding: 5, minCellHeight: 20, valign: 'top' },
    bodyStyles: { minCellHeight: 30 },
    columnStyles: {
      0: { cellWidth: signatureBlockWidth },
      1: { cellWidth: signatureBlockWidth },
      2: { cellWidth: signatureBlockWidth },
    },
    didParseCell: (data: any) => {
        if (data.row.section === 'body' && data.row.index === 0) {
            data.cell.styles.minCellHeight = 10;
        }
    }
  });
  
  const signaturePath = SIGNATURES[headerStates.verifiedByName];
  if (signaturePath) {
    try {
      const signatureBase64 = await fetchImageAsBase64(signaturePath);
      if (signatureBase64) {
        const signY = (doc as any).lastAutoTable.finalY - 35; 
        const signX = margin + signatureBlockWidth * 2 + (signatureBlockWidth / 2) - (60 / 2); 
        doc.addImage(signatureBase64, 'JPEG', signX, signY, 60, 25);
      }
    } catch(e) { console.error(e) }
  }


  doc.save(
    `Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`
  );
}
