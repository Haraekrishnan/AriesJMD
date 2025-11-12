
'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
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

  // Add Aries logo
  const logo = await fetchImageAsBase64('/images/Aries_logo.png');
  doc.addImage(logo, 'PNG', 10, 10, 40, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Rope Access Equipment Inspection Checklist', 105, 25, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Harness', 105, 33, { align: 'center' });

  let startY = 45;

  // Two-column detail rows
  const addRow = (label1: string, value1: string, label2: string, value2: string) => {
    (doc as any).autoTable({
        startY: startY,
        body: [[
        { content: label1, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } },
        value1,
        { content: label2, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } },
        value2,
      ]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { cellWidth: 50 }, 3: { cellWidth: 50 } },
    });
    startY = (doc as any).lastAutoTable.finalY;
  };
  
  addRow('Aries ID:', item.ariesId || '', 'Model:', item.name || '');
  addRow('Manufacturer Serial No:', item.serialNumber || '', 'Year of manufacture:', '2024');
  if(item.inspectionDate) {
    addRow('Date of purchase:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'), 'Date of first use:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'));
  }
  addRow('Procedure ref. No:', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL');

  (doc as any).autoTable({
    startY,
    body: [[{ content: 'Known product history: ' + (checklist.knownHistory || ''), colSpan: 4 }]],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
  });
  startY = (doc as any).lastAutoTable.finalY + 5;

  // Inspection Criteria Table
  (doc as any).autoTable({
    startY,
    head: [['Inspection Criteria', 'Inspection Findings']],
    body: [
      ['Preliminary Observation', checklist.preliminaryObservation || ''],
      ['Checking the condition of the straps', checklist.conditionSheath || ''],
      ['Checking the condition of the buckles', checklist.conditionCore || ''],
      ['Checking the condition of the stitching', checklist.sheathsAndTerminations || ''],
      ['Check of the other components', checklist.otherComponents || ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: '#d9d9d9', textColor: 0, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
  });
  startY = (doc as any).lastAutoTable.finalY + 5;

  // Comments and Verdict Section
  const addSingle = (label: string, value: string) => {
    (doc as any).autoTable({
      startY,
      body: [[{ content: label, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }, value]],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { cellWidth: 130 } },
    });
    startY = (doc as any).lastAutoTable.finalY;
  };

  addSingle('Comments (if any):', checklist.comments || '');
  addSingle('Remarks:', checklist.remarks || '');
  addSingle('Verdict:', checklist.verdict || '');
  startY += 5;

  // Inspector / Reviewer Info
  (doc as any).autoTable({
    startY,
    head: [['', 'Inspected by', 'Reviewed by']],
    body: [
      ['Name', inspector.name, reviewer.name],
      ['Designation', inspector.role, reviewer.role],
      ['ID/Certificate No.', '3/135958', 'VAX015IND24096005'],
      ['Date', format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy'), format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy')],
      ['Signature', '', ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: '#d9d9d9', textColor: 0, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
  });
  startY = (doc as any).lastAutoTable.finalY + 8;

  // Footer Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Next Semi-Annual Inspection Due Date:', 14, startY);
  doc.text(format(new Date(checklist.nextDueDate), 'dd-MMM-yyyy'), 210 - 14, startY, { align: 'right' });
  startY += 8;

  (doc as any).autoTable({
    startY,
    body: [['G: Good condition / TM: To Monitor / TR: To Repair / R: Do not use, retire / N/A: Not applicable']],
    theme: 'grid',
    styles: { fontSize: 8, fillColor: '#f0f0f0', halign: 'center' },
  });

  doc.save(`Inspection_${item.ariesId || 'Harness'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ===========================================
// EXCEL GENERATION (MATCHES HARNESS FORMAT)
// ===========================================
export async function generateChecklistExcel(
  checklist: InspectionChecklist,
  item: InventoryItem,
  inspector: User,
  reviewer: User
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('E01-Harness');

  // Merge header
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = 'Rope Access Equipment Inspection Checklist - Harness';
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  // Logo (top-left)
  try {
    const imgResponse = await fetch('/images/Aries_logo.png');
    const buffer = await imgResponse.arrayBuffer();
    const imageId = workbook.addImage({
      buffer: buffer,
      extension: 'png',
    });
    sheet.addImage(imageId, 'A2:B4');
  } catch (e) {
    console.warn('Logo could not be loaded:', e);
  }

  let row = 6;
  const addRow = (label1: string, value1: string, label2: string, value2: string) => {
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.mergeCells(`C${row}:D${row}`);
    sheet.getCell(`A${row}`).value = label1;
    sheet.getCell(`B${row}`).value = value1;
    sheet.getCell(`C${row}`).value = label2;
    sheet.getCell(`D${row}`).value = value2;
    sheet.getRow(row).eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.font = { size: 10 };
    });
    row++;
  };

  if(item.inspectionDate) {
    addRow('Aries ID:', item.ariesId || '', 'Model:', item.name || '');
    addRow('Manufacturer Serial No:', item.serialNumber || '', 'Year of manufacture:', '2024');
    addRow('Date of purchase:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'), 'Date of first use:', format(new Date(item.inspectionDate), 'dd-MMM-yyyy'));
  }
  addRow('Procedure ref. No:', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL');

  // Known history
  sheet.mergeCells(`A${row}:D${row}`);
  sheet.getCell(`A${row}`).value = 'Known product history: ' + (checklist.knownHistory || '');
  sheet.getRow(row).eachCell(cell => {
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    cell.font = { size: 10 };
  });
  row += 2;

  // Inspection Table Header
  sheet.getCell(`A${row}`).value = 'Inspection Criteria';
  sheet.getCell(`B${row}`).value = 'Inspection Findings';
  sheet.getRow(row).eachCell(cell => {
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });
  row++;

  const addCriteria = (criteria: string, finding: string) => {
    sheet.getCell(`A${row}`).value = criteria;
    sheet.getCell(`B${row}`).value = finding;
    sheet.getRow(row).eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.font = { size: 10 };
    });
    row++;
  };

  addCriteria('Preliminary Observation', checklist.preliminaryObservation || '');
  addCriteria('Checking the condition of the straps', checklist.conditionSheath || '');
  addCriteria('Checking the condition of the buckles', checklist.conditionCore || '');
  addCriteria('Checking the condition of the stitching', checklist.sheathsAndTerminations || '');
  addCriteria('Check of the other components', checklist.otherComponents || '');
  row += 2;

  // Remarks Section
  const addSingle = (label: string, value: string) => {
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.mergeCells(`C${row}:D${row}`);
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = value;
    sheet.getRow(row).eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    row++;
  };

  addSingle('Comments (if any):', checklist.comments || '');
  addSingle('Remarks:', checklist.remarks || '');
  addSingle('Verdict:', checklist.verdict || '');
  row += 2;

  // Inspector / Reviewer Details
  sheet.mergeCells(`A${row}:A${row + 5}`);
  sheet.getCell(`A${row}`).value = '';
  sheet.getCell(`B${row}`).value = 'Inspected by';
  sheet.getCell(`C${row}`).value = 'Reviewed by';
  sheet.getRow(row).eachCell(cell => (cell.font = { bold: true }));

  const details = [
    ['Name', inspector.name, reviewer.name],
    ['Designation', inspector.role, reviewer.role],
    ['ID / Certificate No.', '3/135958', 'VAX015IND24096005'],
    ['Date', format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy'), format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy')],
    ['Signature', '', ''],
  ];
  row++;

  details.forEach(r => {
    sheet.getCell(`A${row}`).value = r[0];
    sheet.getCell(`B${row}`).value = r[1];
    sheet.getCell(`C${row}`).value = r[2];
    sheet.getRow(row).eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.font = { size: 10 };
    });
    row++;
  });

  // Footer
  sheet.mergeCells(`A${row}:D${row}`);
  sheet.getCell(`A${row}`).value =
    'G: Good / TM: To Monitor / TR: To Repair / R: Retire / N/A: Not applicable';
  sheet.getCell(`A${row}`).font = { italic: true, size: 9 };
  sheet.getCell(`A${row}`).alignment = { horizontal: 'center' };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Inspection_${item.ariesId || 'Harness'}.xlsx`);
}
