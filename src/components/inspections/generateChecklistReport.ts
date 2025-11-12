'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { InspectionChecklist, InventoryItem, User } from '@/lib/types';

// Utility to fetch logo for PDF
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ===========================================
// PDF GENERATION
// ===========================================
export async function generateChecklistPdf(
  checklist: InspectionChecklist,
  item: InventoryItem,
  inspector: User,
  reviewer: User
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const blue = '#0070C0';
  const black = '#000000';

  // Add Aries logo
  const logo = await fetchImageAsBase64('/images/Aries_logo.png');
  doc.addImage(logo, 'PNG', 14, 12, 40, 20);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Rope Access Equipment Inspection Checklist', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Harness', 105, 27, { align: 'center' });

  let startY = 38;

  // Helper for table rows
  const addRow = (label1: string, value1: string, label2: string, value2: string) => {
    (doc as any).autoTable({
      startY,
      body: [
        [
          { content: label1, styles: { fillColor: '#E8F1FA', textColor: black, fontStyle: 'bold' } },
          value1,
          { content: label2, styles: { fillColor: '#E8F1FA', textColor: black, fontStyle: 'bold' } },
          value2,
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 45 },
        2: { cellWidth: 50 },
        3: { cellWidth: 45 },
      },
    });
    startY = (doc as any).lastAutoTable.finalY;
  };

  // Equipment info
  addRow('Aries ID:', item.ariesId || '', 'Model:', item.name || '');
  addRow('Manufacturer Serial No:', item.serialNumber || '', 'Year of manufacture:', '2024');
  if(item.inspectionDate){
    addRow('Date of purchase:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'), 'Date of first use:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'));
  }
  addRow('Procedure ref. No:', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL');

  // Known Product History
  (doc as any).autoTable({
    startY,
    body: [[{
      content:
        'Known product history: Usage conditions or exceptional event during use\n' +
        '(Examples: fall or fall arrest, use or storage at extreme temperatures, modification outside manufacturer’s facilities…)',
      colSpan: 4,
    }]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
  });
  startY = (doc as any).lastAutoTable.finalY + 4;

  // Section Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blue);
  doc.text('Inspection Criteria', 14, startY);
  startY += 2;

  // Inspection Criteria Table
  (doc as any).autoTable({
    startY,
    head: [
      [
        { content: 'Inspection Criteria', styles: { fillColor: '#E8F1FA', textColor: black } },
        { content: 'Inspection Findings', styles: { fillColor: '#E8F1FA', textColor: black } },
      ],
    ],
    body: [
      ['Preliminary Observation', checklist.preliminaryObservation || 'G'],
      ['Checking the condition of the straps', checklist.conditionSheath || 'G'],
      ['Checking the attachment points', checklist.conditionCore || 'G'],
      ['Checking the adjustment buckles', checklist.sheathsAndTerminations || 'G'],
      ['Checking the comfort parts', checklist.otherComponents || 'G'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fontStyle: 'bold', halign: 'center' },
    columnStyles: { 1: { halign: 'center', cellWidth: 45 } },
  });
  startY = (doc as any).lastAutoTable.finalY + 5;

  // Comments & Remarks
  const addSingle = (label: string, value: string) => {
    (doc as any).autoTable({
      startY,
      body: [[
        { content: label, styles: { fillColor: '#E8F1FA', textColor: black, fontStyle: 'bold' } },
        value,
      ]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { cellWidth: 155 } },
    });
    startY = (doc as any).lastAutoTable.finalY;
  };

  addSingle('Comments (if any):', checklist.comments || '');
  addSingle('Remarks:', checklist.remarks || '');
  addSingle('Verdict:', checklist.verdict || '');
  startY += 5;

  // Inspector/Reviewer Table
  (doc as any).autoTable({
    startY,
    head: [['', 'Inspected by:', 'Reviewed by:']],
    body: [
      ['Name', inspector.name, reviewer.name],
      ['Designation', inspector.role, reviewer.role],
      ['ID / Certificate No.', '3/135958', 'VAX015IND24096005'],
      [
        'Date',
        format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy'),
        format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy'),
      ],
      ['Signature', '', ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: '#E8F1FA', textColor: black, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 1: { cellWidth: 70 }, 2: { cellWidth: 70 } },
  });
  startY = (doc as any).lastAutoTable.finalY + 10;

  // Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Next Semi-Annual Inspection Due Date:', 14, startY);
  doc.text(format(new Date(checklist.nextDueDate), 'dd-MMM-yyyy'), 200 - 14, startY, { align: 'right' });
  startY += 6;

  (doc as any).autoTable({
    startY,
    body: [[
      'LEGEND: G: Good condition / TM: To Monitor / TR: To Repair / R: Do not use, retire / N/A: Not applicable',
    ]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      fillColor: '#E8F1FA',
      halign: 'center',
    },
  });

  doc.save(`Inspection_${item.ariesId || 'Harness'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// =======================================================
// 2️⃣ EXCEL GENERATION (Exact Layout Replica)
// =======================================================
export async function generateChecklistExcel(
  checklist: InspectionChecklist,
  item: InventoryItem,
  inspector: User,
  reviewer: User
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Harness Checklist');
  const blue = '0070C0';
  const border = { style: 'thin', color: { argb: '000000' } };

  // Logo
  try {
    const imgResponse = await fetch('/images/Aries_logo.png');
    const buffer = await imgResponse.arrayBuffer();
    const imageId = workbook.addImage({
      buffer: buffer,
      extension: 'png',
    });
    sheet.addImage(imageId, 'A1:B4');
  } catch {
    console.warn('Logo missing.');
  }

  // Title
  sheet.mergeCells('C1:F2');
  sheet.getCell('C1').value = 'Rope Access Equipment Inspection Checklist';
  sheet.getCell('C1').font = { bold: true, size: 14, color: { argb: blue } };
  sheet.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('C3:F3');
  sheet.getCell('C3').value = 'Harness';
  sheet.getCell('C3').font = { bold: true, size: 12 };
  sheet.getCell('C3').alignment = { horizontal: 'center' };

  let row = 6;
  const addRow = (l1: string, v1: string, l2: string, v2: string) => {
    sheet.getCell(`A${row}`).value = l1;
    sheet.getCell(`B${row}`).value = v1;
    sheet.getCell(`C${row}`).value = l2;
    sheet.getCell(`D${row}`).value = v2;
    sheet.getRow(row).eachCell((c) => {
      c.border = { top: border, left: border, bottom: border, right: border };
      c.font = { size: 10 };
    });
    sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F1FA' } };
    sheet.getCell(`C${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F1FA' } };
    row++;
  };

  addRow('Aries ID:', item.ariesId || '', 'Model:', item.name || '');
  addRow('Manufacturer Serial No:', item.serialNumber || '', 'Year of manufacture:', '2024');
  if(item.inspectionDate){
    addRow('Date of purchase:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'), 'Date of first use:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'));
  }
  addRow('Procedure ref. No', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL');

  // Known product history
  sheet.mergeCells(`A${row}:D${row + 2}`);
  sheet.getCell(`A${row}`).value =
    'Known product history: Usage conditions or exceptional event during use\n(Examples: fall or fall arrest, use or storage at extreme temperatures, modification outside manufacturer’s facilities…)';
  sheet.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' };
  sheet.getCell(`A${row}`).font = { size: 10 };
  sheet.getCell(`A${row}`).border = { top: border, left: border, bottom: border, right: border };
  row += 4;

  // Inspection table
  sheet.getCell(`A${row}`).value = 'Inspection Criteria';
  sheet.getCell(`B${row}`).value = 'Inspection Findings';
  sheet.getRow(row).eachCell((c) => {
    c.font = { bold: true, color: { argb: blue }, size: 10 };
    c.border = { top: border, left: border, bottom: border, right: border };
    c.alignment = { horizontal: 'center' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F1FA' } };
  });
  row++;

  const addCriteria = (criteria: string, finding: string) => {
    sheet.getCell(`A${row}`).value = criteria;
    sheet.getCell(`B${row}`).value = finding;
    sheet.getRow(row).eachCell((c) => {
      c.border = { top: border, left: border, bottom: border, right: border };
      c.font = { size: 10 };
    });
    sheet.getCell(`B${row}`).alignment = { horizontal: 'center' };
    row++;
  };

  addCriteria('Preliminary Observation', 'G');
  addCriteria('Checking the condition of the straps', 'G');
  addCriteria('Checking the attachment points', 'G');
  addCriteria('Checking the adjustment buckles', 'G');
  addCriteria('Checking the comfort parts', 'G');
  row += 2;

  // Comments/Remarks/Verdict
  const addSingle = (label: string, value: string) => {
    sheet.getCell(`A${row}`).value = label;
    sheet.mergeCells(`B${row}:D${row}`);
    sheet.getCell(`B${row}`).value = value;
    sheet.getRow(row).eachCell((c) => {
      c.border = { top: border, left: border, bottom: border, right: border };
    });
    sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F1FA' } };
    row++;
  };

  addSingle('Comments (if any):', '');
  addSingle('Remarks:', checklist.remarks || '');
  addSingle('Verdict:', checklist.verdict || '');
  row += 2;

  // Inspector details
  sheet.getCell(`B${row}`).value = 'Inspected by';
  sheet.getCell(`C${row}`).value = 'Reviewed by';
  sheet.getRow(row).eachCell((c) => {
    c.font = { bold: true, color: { argb: blue } };
    c.border = { top: border, left: border, bottom: border, right: border };
  });
  row++;

  const details = [
    ['Name', inspector.name, reviewer.name],
    ['Designation', inspector.role, reviewer.role],
    ['ID / Certificate No.', '3/135958', 'VAX015IND24096005'],
    ['Date', format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy'), format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy')],
    ['Signature', '', ''],
  ];

  details.forEach((r) => {
    sheet.getCell(`A${row}`).value = r[0];
    sheet.getCell(`B${row}`).value = r[1];
    sheet.getCell(`C${row}`).value = r[2];
    sheet.getRow(row).eachCell((c) => {
      c.border = { top: border, left: border, bottom: border, right: border };
      c.font = { size: 10 };
    });
    row++;
  });

  // Footer
  sheet.mergeCells(`A${row}:C${row}`);
  sheet.getCell(`A${row}`).value = `Next Semi-Annual Inspection Due Date: ${format(
    new Date(checklist.nextDueDate),
    'dd-MMM-yyyy'
  )}`;
  sheet.getCell(`A${row}`).font = { bold: true };
  row++;

  sheet.mergeCells(`A${row}:C${row}`);
  sheet.getCell(`A${row}`).value =
    'LEGEND: G: Good condition / TM: To Monitor / TR: To Repair / R: Do not use, retire / N/A: Not applicable';
  sheet.getCell(`A${row}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${row}`).font = { italic: true, size: 9 };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Inspection_${item.ariesId || 'Harness'}.xlsx`);
}
