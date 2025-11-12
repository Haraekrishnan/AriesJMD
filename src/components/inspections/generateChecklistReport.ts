'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';
import type { InspectionChecklist, InventoryItem, User } from '@/lib/types';
import { HARNESS_INSPECTION_CRITERIA } from '@/lib/inspection-criteria';

// Helper: fetch logo as Base64 for PDF
async function fetchImageAsBase64(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Logo not found at ' + url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image for PDF:", error);
        return ''; // Return empty string on failure
    }
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
  const lightBlue = '#E8F1FA';

  // Add Aries logo
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  if(logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, 12, 40, 20);
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Rope Access Equipment Inspection Checklist', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(item.name || 'Equipment', 105, 27, { align: 'center' });

  let startY = 38;

  // Helper for table rows
  const addRow = (label1: string, value1: string, label2: string, value2: string) => {
    (doc as any).autoTable({
      startY,
      body: [
        [
          { content: label1, styles: { fillColor: lightBlue, textColor: black, fontStyle: 'bold' } },
          value1,
          { content: label2, styles: { fillColor: lightBlue, textColor: black, fontStyle: 'bold' } },
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
  addRow('Manufacturer Serial No:', item.serialNumber || '', 'Year of manufacture:', checklist.yearOfManufacture || 'N/A');
  addRow('Date of purchase:', checklist.purchaseDate ? format(parseISO(checklist.purchaseDate), 'dd-MMM-yyyy') : 'N/A', 'Date of first use:', checklist.firstUseDate ? format(parseISO(checklist.firstUseDate), 'dd-MMM-yyyy') : 'N/A');
  addRow('Procedure ref. No:', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL');

  // Known Product History
  (doc as any).autoTable({
    startY,
    body: [[{
      content: 'Known product history: ' + (checklist.knownHistory || ''),
      colSpan: 4,
      styles: { cellPadding: 3 }
    }]],
    theme: 'grid',
    styles: { fontSize: 9 },
  });
  startY = (doc as any).lastAutoTable.finalY + 4;

  // Section Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blue);
  doc.text('Inspection Criteria', 14, startY);
  startY += 2;
  
  const criteriaBody = HARNESS_INSPECTION_CRITERIA.map(criterion => {
    const pointsText = criterion.points.map(p => `* ${p}`).join('\n');
    return [
      { content: `${criterion.label}\n${pointsText}`, styles: { cellPadding: 2 } },
      { content: checklist.findings?.[criterion.id] || 'N/A', styles: { halign: 'center' } },
    ];
  });


  // Inspection Criteria Table
  (doc as any).autoTable({
    startY,
    head: [
      [
        { content: 'Inspection Criteria', styles: { fillColor: lightBlue, textColor: black } },
        { content: 'Inspection Findings', styles: { fillColor: lightBlue, textColor: black } },
      ],
    ],
    body: criteriaBody,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
    headStyles: { fontStyle: 'bold', halign: 'center' },
    columnStyles: { 1: { cellWidth: 45 } },
  });
  startY = (doc as any).lastAutoTable.finalY + 5;

  // Comments & Remarks
  const addSingle = (label: string, value: string) => {
    (doc as any).autoTable({
      startY,
      body: [[
        { content: label, styles: { fillColor: lightBlue, textColor: black, fontStyle: 'bold' } },
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
        checklist.inspectionDate ? format(parseISO(checklist.inspectionDate), 'dd-MMM-yyyy') : '',
        checklist.inspectionDate ? format(parseISO(checklist.inspectionDate), 'dd-MMM-yyyy') : '',
      ],
      ['Signature', '', ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: lightBlue, textColor: black, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 1: { cellWidth: 70 }, 2: { cellWidth: 70 } },
  });
  startY = (doc as any).lastAutoTable.finalY + 10;

  // Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Next Semi-Annual Inspection Due Date:', 14, startY);
  doc.text(checklist.nextDueDate ? format(parseISO(checklist.nextDueDate), 'dd-MMM-yyyy') : '', 200 - 14, startY, { align: 'right' });
  startY += 6;

  (doc as any).autoTable({
    startY,
    body: [[
      'LEGEND: G: Good condition / TM: To Monitor / TR: To Repair / R: Do not use, retire / N/A: Not applicable',
    ]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      fillColor: lightBlue,
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
  const blue = 'FF0070C0'; // ARGB format for blue
  const lightBlue = 'FFE8F1FA'; // ARGB format for light blue
  const border = { style: 'thin' as const, color: { argb: 'FF000000' } };

  // Helper to apply borders to a range
  const applyBorders = (startRow: number, startCol: number, endRow: number, endCol: number) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        sheet.getCell(r, c).border = {
          top: border, left: border, bottom: border, right: border
        };
      }
    }
  };

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
  sheet.getCell('C3').value = item.name || 'Harness';
  sheet.getCell('C3').font = { bold: true, size: 12 };
  sheet.getCell('C3').alignment = { horizontal: 'center' };

  let rowIdx = 6;
  const addRow = (label1: string, value1: string, label2: string, value2: string) => {
    sheet.getCell(`A${rowIdx}`).value = label1;
    sheet.getCell(`B${rowIdx}`).value = value1;
    sheet.getCell(`C${rowIdx}`).value = label2;
    sheet.getCell(`D${rowIdx}`).value = value2;
    sheet.getRow(rowIdx).eachCell({ includeEmpty: true }, (c, colNumber) => {
      c.font = { size: 10 };
      if (colNumber === 1 || colNumber === 3) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
      }
    });
    applyBorders(rowIdx, 1, rowIdx, 4);
    rowIdx++;
  };

  addRow('Aries ID:', item.ariesId || '', 'Model:', item.name || '');
  addRow('Manufacturer Serial No:', item.serialNumber || '', 'Year of manufacture:', checklist.yearOfManufacture || 'N/A');
  addRow('Date of purchase:', checklist.purchaseDate ? format(parseISO(checklist.purchaseDate), 'dd-MMM-yyyy') : 'N/A', 'Date of first use:', checklist.firstUseDate ? format(parseISO(checklist.firstUseDate), 'dd-MMM-yyyy') : 'N/A');
  addRow('Procedure ref. No', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL');

  rowIdx++;

  // Known product history
  sheet.mergeCells(`A${rowIdx}:D${rowIdx+1}`);
  sheet.getCell(`A${rowIdx}`).value =
    'Known product history: Usage conditions or exceptional event during use\n(Examples: fall or fall arrest, use or storage at extreme temperatures, modification outside manufacturer’s facilities…)';
  sheet.getCell(`A${rowIdx}`).alignment = { wrapText: true, vertical: 'top' };
  sheet.getCell(`A${rowIdx}`).font = { size: 10 };
  applyBorders(rowIdx, 1, rowIdx+1, 4);
  rowIdx += 3;

  // Inspection table header
  sheet.getCell(`A${rowIdx}`).value = 'Inspection Criteria';
  sheet.getCell(`B${rowIdx}`).value = 'Inspection Findings';
  sheet.getRow(rowIdx).eachCell((c) => {
    c.font = { bold: true, color: { argb: blue }, size: 10 };
    c.alignment = { horizontal: 'center' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
  });
  applyBorders(rowIdx, 1, rowIdx, 2);
  rowIdx++;
  
  HARNESS_INSPECTION_CRITERIA.forEach(criterion => {
    const pointsText = criterion.points.map(p => `* ${p}`).join('\n');
    sheet.getCell(`A${rowIdx}`).value = `${criterion.label}\n${pointsText}`;
    sheet.getCell(`B${rowIdx}`).value = checklist.findings?.[criterion.id] || 'N/A';
    sheet.getCell(`B${rowIdx}`).alignment = { horizontal: 'center' };
    sheet.getRow(rowIdx).eachCell({ includeEmpty: true }, c => c.font = { size: 10 });
    sheet.getRow(rowIdx).alignment = { wrapText: true, vertical: 'middle' };
    applyBorders(rowIdx, 1, rowIdx, 2);
    rowIdx++;
  });
  rowIdx++;

  // Comments/Remarks/Verdict
  const addSingle = (label: string, value: string) => {
    sheet.getCell(`A${rowIdx}`).value = label;
    sheet.mergeCells(`B${rowIdx}:D${rowIdx}`);
    sheet.getCell(`B${rowIdx}`).value = value;
    sheet.getCell(`A${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
    applyBorders(rowIdx, 1, rowIdx, 4);
    rowIdx++;
  };

  addSingle('Comments (if any):', checklist.comments || '');
  addSingle('Remarks:', checklist.remarks || '');
  addSingle('Verdict:', checklist.verdict || '');
  rowIdx += 2;

  // Inspector details
  sheet.getCell(`B${rowIdx}`).value = 'Inspected by';
  sheet.getCell(`C${rowIdx}`).value = 'Reviewed by';
  sheet.getRow(rowIdx).eachCell((c, colNum) => {
    if (colNum > 1) {
        c.font = { bold: true, color: { argb: blue } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightBlue } };
    }
  });
  applyBorders(rowIdx, 1, rowIdx, 3);
  rowIdx++;

  const details = [
    ['Name', inspector.name, reviewer.name],
    ['Designation', inspector.role, reviewer.role],
    ['ID / Certificate No.', '3/135958', 'VAX015IND24096005'],
    ['Date', checklist.inspectionDate ? format(parseISO(checklist.inspectionDate), 'dd-MMM-yyyy') : '', checklist.inspectionDate ? format(parseISO(checklist.inspectionDate), 'dd-MMM-yyyy') : ''],
    ['Signature', '', ''],
  ];

  details.forEach((r) => {
    sheet.getCell(`A${rowIdx}`).value = r[0];
    sheet.getCell(`B${rowIdx}`).value = r[1];
    sheet.getCell(`C${rowIdx}`).value = r[2];
    applyBorders(rowIdx, 1, rowIdx, 3);
    rowIdx++;
  });

  rowIdx++;

  // Footer
  sheet.mergeCells(`A${rowIdx}:D${rowIdx}`);
  sheet.getCell(`A${rowIdx}`).value = `Next Semi-Annual Inspection Due Date: ${checklist.nextDueDate ? format(parseISO(checklist.nextDueDate), 'dd-MMM-yyyy') : ''}`;
  sheet.getCell(`A${rowIdx}`).font = { bold: true };
  rowIdx++;

  sheet.mergeCells(`A${rowIdx}:D${rowIdx}`);
  sheet.getCell(`A${rowIdx}`).value =
    'LEGEND: G: Good condition / TM: To Monitor / TR: To Repair / R: Do not use, retire / N/A: Not applicable';
  sheet.getCell(`A${rowIdx}`).alignment = { horizontal: 'center' };
  sheet.getCell(`A${rowIdx}`).font = { italic: true, size: 9 };
  applyBorders(rowIdx, 1, rowIdx, 4);

  // Set column widths
  sheet.getColumn('A').width = 40;
  sheet.getColumn('B').width = 25;
  sheet.getColumn('C').width = 25;
  sheet.getColumn('D').width = 25;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Inspection_${item.ariesId || 'Harness'}.xlsx`);
}
