
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
    console.error("Could not add logo to Excel", e);
  }
  
  sheet.getRow(1).height = 40;

  /* ---------------- HEADER LEFT ---------------- */
  sheet.getCell('A3').value = vehicle?.vehicleNumber || '';
  sheet.getCell('A3').font = { name: 'Calibri', size: 14, bold: true };

  /* ---------------- HEADER RIGHT BLOCK (Job Details) ---------------- */
  const rightHeader = [
    ['JOB NO:', (headerStates.jobNo || '').toUpperCase()],
    ['VEHICLE TYPE:', (headerStates.vehicleType || '').toUpperCase()],
    ['EXTRA KM:', headerStates.extraKm || 0],
    ['OVER TIME:', headerStates.headerOvertime || ''],
    ['EXTRA NIGHT:', headerStates.extraNight || 0],
    ['EXTRA DAYS:', headerStates.extraDays || 0],
  ];

  rightHeader.forEach((r, i) => {
    const row = sheet.getRow(i + 1);
    const cellLabel = row.getCell('D');
    const cellValue = row.getCell('E');
    
    cellLabel.value = r[0];
    cellValue.value = r[1];

    cellLabel.font = { name: 'Calibri', size: 11, bold: true };
    cellValue.font = { name: 'Calibri', size: 11, bold: true }; // Value is also bold as per image
    cellLabel.alignment = { horizontal: 'left' };
    cellValue.alignment = { horizontal: 'left' };

    // Apply individual borders
    [cellLabel, cellValue].forEach(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    })
  });

  // Add a blank row for spacing
  sheet.addRow([]);

  /* ---------------- TABLE HEADER ---------------- */
  const startRow = 8;
  const headerRow = sheet.getRow(startRow);
  headerRow.values = ['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS'];
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
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

    const row = sheet.addRow([
      format(date, 'dd-MMM-yyyy'),
      startKm || '',
      endKm || '',
      total || '',
      cellStates[`${day}-overtime`] || '',
      remark,
    ]);

    row.eachCell(c => {
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.font = { name: 'Calibri', size: 11 };
    });

    if (date.getDay() === 0) {
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; });
    }
  });

  /* ---------------- FOOTER ---------------- */
  sheet.addRow([]);
  const totalKmValue = dayHeaders.reduce((acc, day) => {
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    return acc + (e > s ? e - s : 0);
  }, 0);
  
  const totalRow = sheet.addRow(['', '', 'TOTAL KILOMETER', totalKmValue]);
  totalRow.font = { name: 'Calibri', size: 11, bold: true };
  sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.getCell('A').alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell('D').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.addRow([]);
  const verifiedByRow = sheet.addRow(['Verified By:']);
  verifiedByRow.font = { name: 'Calibri', size: 11, bold: true };
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

  /* LOGO */
  if (logo) doc.addImage(logo, 'PNG', margin, 30, 120, 35);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(vehicle?.vehicleNumber || '', margin, 85);
  
  /* RIGHT HEADER (Job Details) with borders */
  const rightHeaderX = 350;
  const rightHeaderY = 30;
  const cellHeight = 15;
  const labelWidth = 80;
  const valueWidth = 100;
  
  doc.setFontSize(8);
  
  const headerContent = [
    ['JOB NO:', (headerStates.jobNo || '').toUpperCase()],
    ['VEHICLE TYPE:', (headerStates.vehicleType || '').toUpperCase()],
    ['EXTRA KM:', `${headerStates.extraKm || 0}`],
    ['OVER TIME:', `${headerStates.headerOvertime || ''}`],
    ['EXTRA NIGHT:', `${headerStates.extraNight || 0}`],
    ['EXTRA DAYS:', `${headerStates.extraDays || 0}`]
  ];
  
  headerContent.forEach((row, i) => {
    const currentY = rightHeaderY + (i * cellHeight);
    doc.rect(rightHeaderX, currentY, labelWidth + valueWidth, cellHeight);
    doc.text(row[0], rightHeaderX + 5, currentY + 10);
    doc.text(row[1], rightHeaderX + labelWidth + 5, currentY + 10);
  });
  
  /* SPACER */
  const tableStartY = rightHeaderY + (headerContent.length * cellHeight) + 20;

  /* TABLE DATA */
  const body = dayHeaders.map(day => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    const t = e > s ? e - s : 0;
    return [
      format(d, 'dd-MMM-yyyy'), s || '', e || '', t || '',
      cellStates[`${day}-overtime`] || '',
      cellStates[`${day}-remarks`] || '',
      d.getDay() === 0 ? 'HIGHLIGHT' : ''
    ];
  });
  
  (doc as any).autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: tableStartY,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center', cellPadding: 4, font: 'helvetica', fontStyle: 'normal' },
    headStyles: { fillColor: [2, 179, 150], textColor: 255, fontStyle: 'bold' },
    didDrawCell: (data: any) => {
      if (data.row.raw[6] === 'HIGHLIGHT') {
        data.cell.styles.fillColor = [255, 255, 153];
      }
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 70 },
      2: { cellWidth: 70 },
      3: { cellWidth: 70 },
      4: { cellWidth: 50 },
      5: { cellWidth: 'auto', halign: 'left' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  const totalKmValue = dayHeaders.reduce((acc, day) => {
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    return acc + (e > s ? e - s : 0);
  }, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL KILOMETER:', 280, finalY);
  doc.text(String(totalKmValue), 380, finalY);

  let verifiedY = finalY + 30;
  doc.text('Verified By:', margin, verifiedY);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${headerStates.verifiedByName || ''}`, margin, verifiedY + 15);
  doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, margin, verifiedY + 30);

  doc.save(`Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
