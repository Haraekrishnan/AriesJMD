
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

  sheet.pageSetup.orientation = 'landscape';

  try {
    const logoBuffer = await (await fetch('/images/Aries_logo.png')).arrayBuffer();
    const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
    sheet.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 160, height: 50 },
    });
  } catch (e) {
    console.error("Could not add logo to Excel", e);
  }

  sheet.getRow(1).height = 40;

  const vehicleNumberRow = sheet.getRow(3);
  sheet.mergeCells('A3:C3');
  const vehicleNumberCell = vehicleNumberRow.getCell('A');
  vehicleNumberCell.value = vehicle?.vehicleNumber || '';
  vehicleNumberCell.font = { name: 'Calibri', size: 14, bold: true };
  vehicleNumberCell.alignment = { vertical: 'middle' };

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
    const cellLabel = row.getCell('E');
    const cellValue = row.getCell('F');
    
    cellLabel.value = r[0];
    cellValue.value = r[1];

    cellLabel.font = { name: 'Calibri', size: 11, bold: true };
    cellValue.font = { name: 'Calibri', size: 11 };
    cellLabel.alignment = { horizontal: 'left', vertical: 'middle' };
    cellValue.alignment = { horizontal: 'left', vertical: 'middle' };

    [cellLabel, cellValue].forEach(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  sheet.addRow([]);

  const headerRow = sheet.getRow(8);
  headerRow.values = ['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS'];
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

  const totalRow = sheet.addRow(['', '', 'TOTAL KILOMETER:', totalKm, '', '']);
  sheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
  totalRow.getCell('A').alignment = { horizontal: 'right' };
  totalRow.font = { bold: true, name: 'Calibri', size: 11 };
  totalRow.getCell('D').alignment = { horizontal: 'center' };
  totalRow.eachCell(c => {
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  sheet.addRow([]);
  const verifiedByRow = sheet.addRow(['Verified By:']);
  verifiedByRow.font = { name: 'Calibri', size: 11, bold: true };
  sheet.addRow(['Name:', headerStates.verifiedByName || '']);
  sheet.addRow(['Designation:', headerStates.verifiedByDesignation || '']);
  
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
  headerStates: any
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const logo = await fetchImageAsBase64('/images/Aries_logo.png');

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;

  if (logo) doc.addImage(logo, 'PNG', margin, 30, 120, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(vehicle?.vehicleNumber || '', margin, 85);
  doc.setLineWidth(0.5);
  doc.line(margin, 90, margin + 120, 90);
  
  const rightHeader = [
    ['JOB NO:', (headerStates.jobNo || '').toUpperCase()],
    ['VEHICLE TYPE:', (headerStates.vehicleType || '').toUpperCase()],
    ['EXTRA KM:', headerStates.extraKm || 0],
    ['OVER TIME:', headerStates.headerOvertime || ''],
    ['EXTRA NIGHT:', headerStates.extraNight || 0],
    ['EXTRA DAYS:', headerStates.extraDays || 0],
  ];

  (doc as any).autoTable({
    body: rightHeader,
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold' } },
    tableWidth: 200,
    margin: { left: pageWidth - margin - 200 },
  });

  const body = dayHeaders.map(day => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const s = Number(cellStates[`${day}-startKm`] || 0);
    const e = Number(cellStates[`${day}-endKm`] || 0);
    const t = e > s ? e - s : 0;
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
  
  let totalKm = 0;
  body.forEach(row => totalKm += Number(row[3]));

  body.push(['','','TOTAL KILOMETER:', totalKm, '', '', 'TOTAL_ROW']);


  (doc as any).autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: 120,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center', cellPadding: 4, font: 'helvetica', fontStyle: 'normal' },
    headStyles: { fillColor: [2, 179, 150], textColor: 255, fontStyle: 'bold' },
    didDrawCell: (data: any) => {
      if (data.row.raw[6] === 'HIGHLIGHT') {
        data.cell.styles.fillColor = [255, 255, 153];
      }
      if (data.row.raw[6] === 'TOTAL_ROW') {
          data.cell.styles.fontStyle = 'bold';
          if(data.column.index <= 2) {
             data.cell.styles.halign = 'right';
          }
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

  let y = (doc as any).lastAutoTable.finalY + 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Verified By:', 30, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${headerStates.verifiedByName || ''}`, 30, y + 15);
  doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, 30, y + 30);

  doc.save(`Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
