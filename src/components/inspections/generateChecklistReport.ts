'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { InspectionChecklist, InventoryItem, User } from '@/lib/types';

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

export async function generateChecklistPdf(checklist: InspectionChecklist, item: InventoryItem, inspector: User, reviewer: User) {
  const doc = new jsPDF();
  
  const headerImg = await fetchImageAsBase64('/images/aries-header.png');
  doc.addImage(headerImg, 'PNG', 10, 10, 190, 30);

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

    // ... Excel generation logic will be implemented here in a future update ...
    // For now, we can show a placeholder message.
    alert("Excel export for inspection checklists is coming soon!");
}
