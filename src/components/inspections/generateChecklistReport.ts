
'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { InspectionChecklist, InventoryItem, User } from '@/lib/types';

async function fetchImageAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

export async function generateChecklistPdf(checklist: InspectionChecklist, item: InventoryItem, inspector: User, reviewer: User) {
  const doc = new jsPDF();
  
  const headerImgBuffer = await fetchImageAsArrayBuffer('/images/aries-header.png');
  const headerImgBase64 = Buffer.from(headerImgBuffer).toString('base64');
  doc.addImage(`data:image/png;base64,${headerImgBase64}`, 'PNG', 10, 10, 190, 30);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Rope Access Equipment Inspection Checklist', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Rope', doc.internal.pageSize.getWidth() / 2, 58, { align: 'center' });

  let startY = 70;
  
  const addTwoColumnRow = (label1: string, value1: string, label2: string, value2: string) => {
    doc.autoTable({
        startY: startY,
        body: [[{content: label1, styles: {fontStyle: 'bold', fillColor: '#f0f0f0'}}, value1, {content: label2, styles: {fontStyle: 'bold', fillColor: '#f0f0f0'}}, value2]],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
    });
    startY = (doc as any).lastAutoTable.finalY;
  };
  
  addTwoColumnRow('Aries ID:', item.ariesId || 'N/A', 'Model:', item.name);
  addTwoColumnRow('Manufacturer Serial No:', item.serialNumber, 'Year of manufacture:', '2024'); // Placeholder
  addTwoColumnRow('Date of purchase:', item.inspectionDate ? format(new Date(item.inspectionDate), 'dd-MMM-yyyy') : 'N/A', 'Date of first use:', item.inspectionDate ? format(new Date(item.inspectionDate), 'dd-MMM-yyyy') : 'N/A');
  addTwoColumnRow('Procedure ref. No:', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL'); // Placeholder

  doc.autoTable({
    startY: startY,
    body: [[{content: 'Known product history: ' + (checklist.knownHistory || ''), colSpan: 4}]],
    theme: 'grid', styles: { fontSize: 9, cellPadding: 2 }
  });
  startY = (doc as any).lastAutoTable.finalY + 5;
  
  doc.autoTable({
      startY: startY,
      head: [['Inspection Criteria', 'Inspection Findings']],
      body: [
          ['Preliminary Observation', checklist.preliminaryObservation],
          ['Checking the condition of the sheath', checklist.conditionSheath],
          ['Checking the condition of the core', checklist.conditionCore],
          ['Checking plastic sheaths and sewn Terminations', checklist.sheathsAndTerminations],
          ['Check of the other components', checklist.otherComponents],
      ],
      theme: 'grid',
      headStyles: { fillColor: '#cccccc', textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { halign: 'center' } }
  });
  startY = (doc as any).lastAutoTable.finalY + 5;

  const addSingleColumnRow = (label: string, value: string) => {
    doc.autoTable({
        startY: startY,
        body: [[{content: label, styles: {fontStyle: 'bold', fillColor: '#f0f0f0'}}, value]],
        theme: 'grid', styles: { fontSize: 9, cellPadding: 2 }
    });
    startY = (doc as any).lastAutoTable.finalY;
  };

  addSingleColumnRow('Comments (if any):', checklist.comments || 'N/A');
  addSingleColumnRow('Remarks:', checklist.remarks || 'N/A');
  addSingleColumnRow('Verdict:', checklist.verdict);
  startY += 5;

  doc.autoTable({
      startY: startY,
      head: [['', 'Inspected by:', 'Reviewed by:']],
      body: [
          ['Name', inspector.name, reviewer.name],
          ['Designation', inspector.role, reviewer.role],
          ['ID/ Certificate No.', '3/135958', 'VAX015IND24096005'], // Placeholder
          ['Date', format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy'), format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy')],
          ['Signature', '', ''] // Placeholder for signature image
      ],
      theme: 'grid',
      headStyles: { fillColor: '#cccccc', textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
  });
  startY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Next Semi-Annual Inspection Due Date:', 14, startY);
  doc.text(format(new Date(checklist.nextDueDate), 'dd-MMM-yyyy'), doc.internal.pageSize.getWidth() - 14, startY, { align: 'right' });
  startY += 8;

  doc.autoTable({
      startY: startY,
      body: [['G: Good condition / TM: To Monitor / TR: To Repair / R: Do not use, retire / N/A: Not applicable']],
      theme: 'grid', styles: { fontSize: 8, cellPadding: 2, fillColor: '#f0f0f0', halign: 'center' }
  });

  doc.save(`Inspection_${item.serialNumber}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function generateChecklistExcel(checklist: InspectionChecklist, item: InventoryItem, inspector: User, reviewer: User) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inspection Checklist');
  sheet.properties.defaultRowHeight = 20;

  // Add and position header image
  const headerImgBuffer = await fetchImageAsArrayBuffer('/images/aries-header.png');
  const headerImgId = workbook.addImage({ buffer: headerImgBuffer, extension: 'png' });
  sheet.addImage(headerImgId, {
    tl: { col: 0, row: 0 },
    ext: { width: 750, height: 110 }
  });
  sheet.getRow(1).height = 85; 

  // Titles
  sheet.mergeCells('A5:H5');
  const titleCell = sheet.getCell('A5');
  titleCell.value = 'Rope Access Equipment Inspection Checklist';
  titleCell.font = { name: 'Calibri', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A6:H6');
  const subtitleCell = sheet.getCell('A6');
  subtitleCell.value = 'Rope';
  subtitleCell.font = { name: 'Calibri', size: 12, bold: true };
  subtitleCell.alignment = { horizontal: 'center' };

  // Helper for borders
  const addBorder = (cell: ExcelJS.Cell) => {
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  };

  // Item Details Section
  let currentRow = 8;
  const itemDetails = [
    ['Aries ID:', item.ariesId || 'N/A', 'Model:', item.name],
    ['Manufacturer Serial No:', item.serialNumber, 'Year of manufacture:', '2024'],
    ['Date of purchase:', item.inspectionDate ? format(new Date(item.inspectionDate), 'dd-MMM-yyyy') : 'N/A', 'Date of first use:', item.inspectionDate ? format(new Date(item.inspectionDate), 'dd-MMM-yyyy') : 'N/A'],
    ['Procedure ref. No:', 'ARIES-RAOP-001 [Rev 07]', 'User:', 'PETZL']
  ];

  itemDetails.forEach(detailRow => {
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = detailRow[0];
    sheet.mergeCells(`C${currentRow}:D${currentRow}`);
    sheet.getCell(`C${currentRow}`).value = detailRow[1];
    sheet.mergeCells(`E${currentRow}:F${currentRow}`);
    sheet.getCell(`E${currentRow}`).value = detailRow[2];
    sheet.mergeCells(`G${currentRow}:H${currentRow}`);
    sheet.getCell(`G${currentRow}`).value = detailRow[3];

    [`A${currentRow}`, `C${currentRow}`, `E${currentRow}`, `G${currentRow}`].forEach(c => {
        addBorder(sheet.getCell(c));
        if(c === `A${currentRow}` || c === `E${currentRow}`) sheet.getCell(c).font = { bold: true };
    });
    currentRow++;
  });
  sheet.mergeCells(`A${currentRow}:H${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = `Known product history: ${checklist.knownHistory || ''}`;
  addBorder(sheet.getCell(`A${currentRow}`));
  currentRow += 2;
  
  // Inspection Findings
  const findings = [
      ['Inspection Criteria', 'Inspection Findings'],
      ['Preliminary Observation', checklist.preliminaryObservation],
      ['Checking the condition of the sheath', checklist.conditionSheath],
      ['Checking the condition of the core', checklist.conditionCore],
      ['Checking plastic sheaths and sewn Terminations', checklist.sheathsAndTerminations],
      ['Check of the other components', checklist.otherComponents],
  ];

  findings.forEach((row, index) => {
    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = row[0];
    sheet.mergeCells(`G${currentRow}:H${currentRow}`);
    sheet.getCell(`G${currentRow}`).value = row[1];
    addBorder(sheet.getCell(`A${currentRow}`));
    addBorder(sheet.getCell(`G${currentRow}`));
    if (index === 0) {
        sheet.getRow(currentRow).font = { bold: true };
        sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
    }
    sheet.getCell(`G${currentRow}`).alignment = { horizontal: 'center' };
    currentRow++;
  });
  currentRow++;

  // Comments, Remarks, Verdict
  const textSections = [
    ['Comments (if any):', checklist.comments || 'N/A'],
    ['Remarks:', checklist.remarks || 'N/A'],
    ['Verdict:', checklist.verdict]
  ];
  textSections.forEach(section => {
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = section[0];
    sheet.getCell(`A${currentRow}`).font = { bold: true };
    sheet.mergeCells(`C${currentRow}:H${currentRow}`);
    sheet.getCell(`C${currentRow}`).value = section[1];
    addBorder(sheet.getCell(`A${currentRow}`));
    addBorder(sheet.getCell(`C${currentRow}`));
    currentRow++;
  });
  currentRow++;

  // Signatures
  sheet.mergeCells(`B${currentRow}:D${currentRow}`);
  sheet.getCell(`B${currentRow}`).value = 'Inspected by:';
  sheet.mergeCells(`F${currentRow}:H${currentRow}`);
  sheet.getCell(`F${currentRow}`).value = 'Reviewed by:';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.getCell(`F${currentRow}`).font = { bold: true };
  currentRow++;

  const signatureDetails = [
      ['Name', inspector.name, reviewer.name],
      ['Designation', inspector.role, reviewer.role],
      ['ID/ Certificate No.', '3/135958', 'VAX015IND24096005'],
      ['Date', format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy'), format(new Date(checklist.inspectionDate), 'dd-MMM-yyyy')],
      ['Signature', '', '']
  ];
  signatureDetails.forEach(detail => {
    sheet.getCell(`A${currentRow}`).value = detail[0];
    sheet.mergeCells(`B${currentRow}:D${currentRow}`);
    sheet.getCell(`B${currentRow}`).value = detail[1];
    sheet.mergeCells(`F${currentRow}:H${currentRow}`);
    sheet.getCell(`F${currentRow}`).value = detail[2];
    currentRow++;
  });
  currentRow++;

  // Next Due Date
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = 'Next Semi-Annual Inspection Due Date:';
  sheet.getCell(`A${currentRow}`).font = { bold: true };
  sheet.mergeCells(`E${currentRow}:H${currentRow}`);
  sheet.getCell(`E${currentRow}`).value = format(new Date(checklist.nextDueDate), 'dd-MMM-yyyy');
  sheet.getCell(`E${currentRow}`).font = { bold: true };
  sheet.getCell(`E${currentRow}`).alignment = { horizontal: 'right' };
  currentRow += 2;

  // Footer
  sheet.mergeCells(`A${currentRow}:H${currentRow}`);
  const footerCell = sheet.getCell(`A${currentRow}`);
  footerCell.value = 'G: Good condition / TM: To Monitor / TR: To Repair / R: Do not use, retire / N/A: Not applicable';
  footerCell.alignment = { horizontal: 'center' };
  footerCell.font = { size: 9, italic: true };

  // Final styling and saving
  sheet.columns.forEach(col => {
    col.width = 12;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Inspection_${item.serialNumber}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

