
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
    const url = imgPath.startsWith('/') ? `${window.location.origin}${imgPath}` : imgPath;
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // --- HEADER ---
  try {
    const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
    if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, currentY, 130, 32);
  } catch (e) {
    console.error("Could not add logo to PDF:", e);
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(vehicle?.vehicleNumber || '', margin, currentY + 45);
  currentY += 50;

  const rightHeaderX = pageWidth - margin - 200;
  (doc as any).autoTable({
    body: [
      ['JOB NO', (headerStates.jobNo || '').toUpperCase()],
      ['VEHICLE TYPE', (headerStates.vehicleType || '').toUpperCase()],
      ['EXTRA KM', headerStates.extraKm || 0],
      ['OVER TIME', headerStates.headerOvertime || ''],
      ['EXTRA NIGHT', headerStates.extraNight || 0],
      ['EXTRA DAYS', headerStates.extraDays || 0],
    ],
    startY: margin,
    theme: 'plain',
    styles: { fontSize: 8.5, font: 'helvetica', cellPadding: 2, lineWidth: 0.5, lineColor: [180, 180, 180] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 }, 1: { cellWidth: 130 } },
    tableWidth: 200,
    margin: { left: rightHeaderX },
    didDrawCell: (data: any) => {
        if (data.column.index <= 1) {
            doc.setDrawColor(180, 180, 180);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        }
    }
  });

  // --- MAIN TABLE ---
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
      { content: cellStates[`${day}-remarks`] || '', styles: { fillColor: isHoliday ? [255, 255, 204] : undefined, halign: 'left' } },
    ];
  });

  body.push([{ content: 'TOTAL KILOMETER:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalKm, styles: { fontStyle: 'bold' } }, '', '']);

  const tableHeaderHeight = 20; // Estimated height of header
  const tableFooterHeight = 20; // Estimated height of "TOTAL" row
  const footerHeight = 70; // Height for the bottom verified/signature block
  const availableTableHeight = pageHeight - currentY - footerHeight - tableHeaderHeight - tableFooterHeight - (margin * 2);
  const rowCount = body.length;
  const rowHeight = availableTableHeight / rowCount;

  (doc as any).autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: currentY,
    theme: 'grid',
    styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        halign: 'center',
        valign: 'middle',
        minCellHeight: Math.max(14, rowHeight), 
        overflow: 'linebreak',
    },
    headStyles: {
        fillColor: [2, 179, 150],
        textColor: 255,
        fontStyle: 'bold',
        minCellHeight: 16,
    },
    columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 48 },
        2: { cellWidth: 48 },
        3: { cellWidth: 48 },
        4: { cellWidth: 40 },
        5: { cellWidth: 'auto', halign: 'left' },
    },
    margin: { left: margin, right: margin, bottom: footerHeight + 10 },
    pageBreak: 'avoid',   // Prevent page breaks within the table
    rowPageBreak: 'avoid'
  });
  
  // --- FOOTER ---
  const footerY = (doc as any).lastAutoTable.finalY + 15 > pageHeight - footerHeight ? pageHeight - footerHeight : (doc as any).lastAutoTable.finalY + 15;

  (doc as any).autoTable({
    startY: footerY,
    body: [
      ['Verified By:', 'Verified By Date:', 'Signature:'],
      [
        headerStates.verifiedByName || '',
        headerStates.verifiedByDate ? format(headerStates.verifiedByDate, 'dd-MM-yyyy') : '',
        '',
      ],
    ],
    theme: 'grid',
    styles: {
        fontSize: 9,
        cellPadding: 4,
        valign: 'top',
        minCellHeight: 25,
    },
    columnStyles: {
        0: { cellWidth: (contentWidth) / 3 },
        1: { cellWidth: (contentWidth) / 3 },
        2: { cellWidth: (contentWidth) / 3 },
    },
    margin: { left: margin, right: margin },
  });

  const signaturePath = SIGNATURES[headerStates.verifiedByName];
  if (signaturePath) {
      try {
          const signatureBase64 = await fetchImageAsBase64(signaturePath);
          if (signatureBase64) {
              doc.addImage(
                  signatureBase64,
                  'JPEG',
                  margin + ((contentWidth) * 2) / 3 + 15,
                  footerY + 22,
                  70,
                  28
              );
          }
      } catch (e) { console.error(e); }
  }

  doc.save(
    `Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`
  );
}
