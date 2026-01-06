
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
  } catch(e) {
    console.error("Could not add logo to excel", e)
  }

  /* ---------------- HEADER LEFT ---------------- */
  sheet.getCell('A3').value = vehicle?.vehicleNumber || '';
  sheet.getCell('A3').font = { size: 14, bold: true };

  /* ---------------- HEADER RIGHT BLOCK ---------------- */
  const rightHeader = [
    ['Job No', headerStates.jobNo],
    ['Vehicle Type', headerStates.vehicleType],
    ['EXTRA KM', headerStates.extraKm || 0],
    ['OVER TIME', headerStates.headerOvertime || ''],
    ['EXTRA NIGHT', headerStates.extraNight || 0],
    ['EXTRA DAYS', headerStates.extraDays || 0],
  ];

  rightHeader.forEach((r, i) => {
    sheet.getCell(`E${i + 1}`).value = r[0];
    sheet.getCell(`F${i + 1}`).value = r[1];
    sheet.getCell(`E${i + 1}`).font = { bold: true };
  });
  
  sheet.getRow(6).height = 10;

  /* ---------------- TABLE HEADER ---------------- */
  const headerRow = sheet.addRow([
    'DATE',
    'START KM',
    'END KM',
    'TOTAL KM',
    'OT',
    'REMARKS',
  ]);
  
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell(c => {
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF02B396' } 
    };
    c.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });

  /* ---------------- TABLE BODY ---------------- */
  let totalKm = 0;
  dayHeaders.forEach(day => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const startKm = Number(cellStates[`${day}-startKm`] || 0);
    const endKm = Number(cellStates[`${day}-endKm`] || 0);
    const total = endKm > startKm ? endKm - startKm : 0;
    totalKm += total;
    const remark = cellStates[`${day}-remarks`] || '';

    const row = sheet.addRow([
      format(date, 'dd-MMM-yyyy'),
      startKm || '',
      endKm || '',
      total || '',
      cellStates[`${day}-overtime`] || '',
      remark,
    ]);

    row.eachCell(c => {
      c.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    if (date.getDay() === 0) {
      row.eachCell(c => {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' }, // Yellow
        };
      });
    }
  });

  /* ---------------- FOOTER ---------------- */
  const totalRow = sheet.addRow(['TOTAL KILOMETER', '', '', totalKm]);
  totalRow.font = { bold: true };
  sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.getCell('A').alignment = { horizontal: 'right' };
  totalRow.getCell('D').alignment = { horizontal: 'center' };

  sheet.addRow([]);
  const verifiedByRow = sheet.addRow([]);
  sheet.mergeCells(`A${verifiedByRow.number}:F${verifiedByRow.number}`);
  const verifiedCell = sheet.getCell(`A${verifiedByRow.number}`);
  verifiedCell.value = `Verified By: ${headerStates.verifiedByName || ''} (${headerStates.verifiedByDesignation || ''})`;
  verifiedCell.font = { bold: true };

  sheet.columns = [
    { width: 18 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 }, { width: 30 },
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
  headerStates: any
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');

  let totalKm = 0;
  const body = dayHeaders.map(day => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    const t = e > s ? e - s : 0;
    totalKm += t;
    return [
      format(d, 'dd-MMM-yyyy'),
      s || '',
      e || '',
      t || '',
      cellStates[`${day}-overtime`] || '',
      cellStates[`${day}-remarks`] || '',
      d.getDay() === 0 ? 'HIGHLIGHT' : '',
    ];
  });
  
  // Add total row to body
  body.push([{ content: 'TOTAL KILOMETER', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalKm, styles: { halign: 'center', fontStyle: 'bold' } }, '', '']);

  (doc as any).autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: 120,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center', cellPadding: 4 },
    headStyles: { 
      fillColor: [2, 179, 150], // #02B396
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    didParseCell: (data: any) => {
      if (data.row.raw[6] === 'HIGHLIGHT') {
        data.cell.styles.fillColor = [255, 255, 153]; // Yellow
      }
    },
    columnStyles: {
      0: { cellWidth: 70 }, // Date
      1: { cellWidth: 70 }, // Start KM
      2: { cellWidth: 70 }, // End KM
      3: { cellWidth: 70 }, // Total KM
      4: { cellWidth: 40 }, // OT
      5: { cellWidth: 'auto', halign: 'left' }, // Remarks
    },
    didDrawPage: (data: any) => {
      // Draw header
      if (logoBase64) doc.addImage(logoBase64, 'PNG', 30, 20, 120, 30);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(vehicle?.vehicleNumber || '', 30, 75);

      const headerRightX = doc.internal.pageSize.width - 30;
      let headerRightY = 30;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      [
        `Job No: ${headerStates.jobNo || ''}`,
        `Vehicle Type: ${headerStates.vehicleType || ''}`,
        `EXTRA KM: ${headerStates.extraKm || 0}`,
        `OVER TIME: ${headerStates.headerOvertime || ''}`,
        `EXTRA NIGHT: ${headerStates.extraNight || 0}`,
        `EXTRA DAYS: ${headerStates.extraDays || 0}`,
      ].forEach(t => {
        doc.text(t, headerRightX, headerRightY, { align: 'right' });
        headerRightY += 10;
      });

      // Draw footer
      const pageHeight = doc.internal.pageSize.getHeight();
      let footerY = pageHeight - 50;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Verified By:', 30, footerY);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${headerStates.verifiedByName || ''}`, 30, footerY + 15);
      doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, 30, footerY + 30);
    }
  });

  doc.save(`Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
