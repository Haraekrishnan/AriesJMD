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
  
  /* -------- COMMON BORDER STYLE -------- */
  const greyBorder = {
    top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  };
  
  /* -------- PRE-CALCULATE TOTAL KM (ONCE) -------- */
  let totalKm = 0;
  
  dayHeaders.forEach(day => {
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    if (e > s) totalKm += (e - s);
  });
  

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

  /* =====================================================
   VEHICLE NO BOX (EXCEL – MATCH PDF)
===================================================== */
sheet.mergeCells('A3:B3');
sheet.mergeCells('C3:D3');

const vehicleLabelCell = sheet.getCell('A3');
const vehicleValueCell = sheet.getCell('C3');

vehicleLabelCell.value = 'VEHICLE NO';
vehicleValueCell.value = vehicle?.vehicleNumber || '';

vehicleLabelCell.font = { bold: true, name: 'Calibri', size: 11 };
vehicleValueCell.font = { bold: true, name: 'Calibri', size: 11 };

vehicleLabelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
vehicleValueCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

vehicleLabelCell.border = greyBorder;
vehicleValueCell.border = greyBorder;

/* =====================================================
   TOTAL KM BOX (EXCEL – MATCH PDF)
===================================================== */
sheet.mergeCells('A4:B4');
sheet.mergeCells('C4:D4');

const totalKmLabelCell = sheet.getCell('A4');
const totalKmValueCell = sheet.getCell('C4');

totalKmLabelCell.value = 'TOTAL KM';
totalKmValueCell.value = totalKm;

totalKmLabelCell.font = { bold: true, name: 'Calibri', size: 11 };
totalKmValueCell.font = { bold: true, name: 'Calibri', size: 11 };

totalKmLabelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
totalKmValueCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

totalKmLabelCell.border = greyBorder;
totalKmValueCell.border = greyBorder;

/* 🔴 Grey fill ONLY for value cell (like PDF) */
totalKmValueCell.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE6E6E6' },
};


  const rightHeaderData = [
    ['JOB NO', (headerStates.jobNo || '').toUpperCase()],
    ['VEHICLE TYPE', (headerStates.vehicleType || '').toUpperCase()],
    ['EXTRA KM', headerStates.extraKm || 0],
    ['OVER TIME', headerStates.headerOvertime || ''],
    ['EXTRA NIGHT', headerStates.extraNight || 0],
    ['EXTRA DAYS', headerStates.extraDays || 0],
  ];

   
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


  dayHeaders.forEach(day => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
  
    const startKm = Number(cellStates[`${day}-startKm`] || 0);
    const endKm = Number(cellStates[`${day}-endKm`] || 0);
    const total = endKm > startKm ? endKm - startKm : 0;
  
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
      c.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.font = { name: 'Calibri', size: 11 };
  
      if (isHoliday) {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' },
        };
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
  let currentY = margin;
/* -------- PRE-CALCULATE TOTAL KM (ONCE) -------- */
let totalKm = 0;

dayHeaders.forEach(day => {
  const s = Number(cellStates[`${day}-startKm`] || 0);
  const e = Number(cellStates[`${day}-endKm`] || 0);
  if (e > s) totalKm += (e - s);
});

  /* ---------------- HEADER ---------------- */
  try {
    const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, currentY, 130, 32);
    }
  } catch (e) {
    console.error(e);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  /* -------- VEHICLE NUMBER BOX -------- */
(doc as any).autoTable({
  startY: currentY + 40,
  body: [
    [
      { content: 'VEHICLE NO', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: vehicle?.vehicleNumber || '', styles: { fontStyle: 'bold', halign: 'left' } },
    ],
  ],
  theme: 'grid',
  styles: {
    fontSize: 11,
    cellPadding: 5,
    valign: 'middle',
  },
  columnStyles: {
    0: { cellWidth: 90 },
    1: { cellWidth: 140 },
  },
  margin: { left: margin },
});
  
/* -------- TOTAL KM BOX (TOP) -------- */
(doc as any).autoTable({
  startY: (doc as any).lastAutoTable.finalY + 6,
  body: [
    [
      {
        content: 'TOTAL KM',
        styles: {
          fontStyle: 'bold',
          textColor: 0,
          halign: 'right',      // ❌ NO fill here
        },
      },
      {
        content: String(totalKm),
        styles: {
          fontStyle: 'bold',
          textColor: 0,
          fillColor: [230, 230, 230], // ✅ grey ONLY here
          halign: 'center',
        },
      },
    ],
  ],
  theme: 'grid',
  styles: {
    fontSize: 10,
    cellPadding: 5,
    valign: 'middle',
  },
  columnStyles: {
    0: { cellWidth: 90 },
    1: { cellWidth: 60 },
  },
  margin: { left: margin },
});


  
  /* 🔴 MUST BE IMMEDIATELY AFTER THE BOX */
  currentY = (doc as any).lastAutoTable.finalY + 10;
  
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
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      lineWidth: 0.5,
      lineColor: [180, 180, 180],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 130 },
    },
    tableWidth: 200,
    margin: { left: rightHeaderX },
    didDrawCell: (data: any) => {
      doc.setDrawColor(180);
      doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

   const body = dayHeaders.map(day => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    const t = e > s ? e - s : 0;
   
    const isHoliday = cellStates[`${day}-isHoliday`] || getDay(d) === 0;
    const fill = isHoliday ? [255, 255, 204] : undefined;

    return [
      { content: format(d, 'dd-MMM-yyyy'), styles: { fillColor: fill } },
      { content: s || '', styles: { fillColor: fill } },
      { content: e || '', styles: { fillColor: fill } },
      { content: t || '', styles: { fillColor: fill } },
      { content: cellStates[`${day}-overtime`] || '', styles: { fillColor: fill } },
      { content: cellStates[`${day}-remarks`] || '', styles: { fillColor: fill, halign: 'left' } },
    ];
  });

  body.push([
    { content: 'TOTAL KILOMETER:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: totalKm, styles: { fontStyle: 'bold' } },
    '',
    '',
  ]);

  /* -------- FOOTER POSITION (MOVED UP) -------- */
  const footerY = pageHeight - 110; // 🔴 KEY FIX

  (doc as any).autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: currentY,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,        // ⬅ increased from 2
      minCellHeight: 18,     // ⬅ KEY: increases row height
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [2, 179, 150],
      textColor: 255,
      fontStyle: 'bold',
      minCellHeight: 20,     // ⬅ taller header
    },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 48 },
      2: { cellWidth: 48 },
      3: { cellWidth: 48 },
      4: { cellWidth: 40 },
      5: { cellWidth: 'auto', halign: 'left' },
    },
    margin: {
      left: margin,
      right: margin,
      bottom: 115,          // keep footer safe
    },
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
  });
  

  /* ---------------- FOOTER ---------------- */
 /* ---------------- FOOTER ---------------- */
 (doc as any).autoTable({
  startY: footerY,
  body: [
    [
      { content: 'Verified By:', styles: { fontStyle: 'bold' } },
      { content: 'Verified By Date:', styles: { fontStyle: 'bold' } },
      { content: 'Signature:', styles: { fontStyle: 'bold' } },
    ],
    [
      {
        content: headerStates.verifiedByName || '',
        styles: { minCellHeight: 42 },   // ⬅ KEY change
      },
      {
        content: headerStates.verifiedByDate
          ? format(headerStates.verifiedByDate, 'dd-MM-yyyy')
          : '',
        styles: { minCellHeight: 42 },   // ⬅ KEY change
      },
      {
        content: '',
        styles: { minCellHeight: 42 },   // ⬅ KEY change
      },
    ],
  ],
  theme: 'grid',
  styles: {
    fontSize: 9,
    cellPadding: 5,
    valign: 'top',
  },
  columnStyles: {
    0: { cellWidth: (pageWidth - margin * 2) / 3 },
    1: { cellWidth: (pageWidth - margin * 2) / 3 },
    2: { cellWidth: (pageWidth - margin * 2) / 3 },
  },
  margin: { left: margin, right: margin },
});


  /* -------- SIGNATURE -------- */
  const signaturePath = SIGNATURES[headerStates.verifiedByName];
  if (signaturePath) {
    try {
      const signatureBase64 = await fetchImageAsBase64(signaturePath);
      if (signatureBase64) {
        doc.addImage(
          signatureBase64,
          'JPEG',
          margin + ((pageWidth - margin * 2) * 2) / 3 + 18,
          footerY + 30,
          70,
          28
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  doc.save(
    `Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`
  );
}
