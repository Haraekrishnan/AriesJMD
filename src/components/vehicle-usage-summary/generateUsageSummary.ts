
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
  const sheet = workbook.addWorksheet('Vehicle Log');

  /* ---------------- LOGO ---------------- */
  try {
    const logoBuffer = await (await fetch('/images/Aries_logo.png')).arrayBuffer();
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

  /* ---------------- TABLE HEADER ---------------- */
  const headerRow = sheet.addRow([
    'DATE',
    'START KM',
    'END KM',
    'TOTAL KM',
    'OVER TIME',
    'REMARKS',
  ]);

  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.eachCell(c => {
    c.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
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
      c.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      c.alignment = { horizontal: 'center' };
    });

    /* Highlight Sundays & Remarks */
    if (date.getDay() === 0 || remark) {
      row.eachCell(c => {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFF99' },
        };
      });
    }
  });

  /* ---------------- FOOTER ---------------- */
  sheet.addRow([]);
  const totalRow = sheet.addRow(['TOTAL KILOMETER', '', '', totalKm]);
  totalRow.font = { bold: true };

  sheet.addRow([]);
  sheet.addRow(['Verified By:']);
  sheet.addRow(['Name:', headerStates.verifiedByName || '']);
  sheet.addRow(['Designation:', headerStates.verifiedByDesignation || '']);

  sheet.columns = [
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 30 },
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

  /* LOGO */
  if (logo) doc.addImage(logo, 'PNG', 30, 30, 120, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(vehicle?.vehicleNumber || '', 30, 85);

  /* TOTAL KM */
  let totalKm = 0;
  dayHeaders.forEach(d => {
    const s = Number(cellStates[`${d}-startKm`] || 0);
    const e = Number(cellStates[`${d}-endKm`] || 0);
    totalKm += e > s ? e - s : 0;
  });

  doc.setFontSize(10);
  doc.text('TOTAL KM:', 30, 105);
  doc.text(String(totalKm), 100, 105);

  /* RIGHT HEADER */
  const rx = 560;
  let ry = 40;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  [
    `Job No : ${headerStates.jobNo}`,
    `Vehicle Type : ${headerStates.vehicleType}`,
    `EXTRA KM : ${headerStates.extraKm || 0}`,
    `OVER TIME : ${headerStates.headerOvertime || ''}`,
    `EXTRA NIGHT : ${headerStates.extraNight || 0}`,
    `EXTRA DAYS : ${headerStates.extraDays || 0}`,
  ].forEach(t => {
    doc.text(t, rx, ry, { align: 'right' });
    ry += 12;
  });

  /* TABLE DATA */
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
      d.getDay() === 0 || cellStates[`${day}-remarks`] ? 'HIGHLIGHT' : '',
    ];
  });

  (doc as any).autoTable({
    head: [['DATE', 'START KM', 'END KM', 'TOTAL KM', 'OT', 'REMARKS']],
    body,
    startY: 120,
    styles: { fontSize: 8, halign: 'center' },
    theme: 'grid',
    didParseCell: (data: any) => {
      if (data.row.raw[6] === 'HIGHLIGHT') {
        data.cell.styles.fillColor = [255, 255, 153];
      }
    },
    columnStyles: {
      5: { halign: 'left' },
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 30;

  doc.setFont('helvetica', 'bold');
  doc.text('Verified By:', 30, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${headerStates.verifiedByName || ''}`, 30, y + 15);
  doc.text(`Designation: ${headerStates.verifiedByDesignation || ''}`, 30, y + 30);

  doc.save(`Vehicle_Log_${vehicle?.vehicleNumber}_${format(currentMonth, 'yyyy-MM')}.pdf`);
}
