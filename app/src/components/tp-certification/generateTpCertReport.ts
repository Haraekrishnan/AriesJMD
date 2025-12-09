
'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type {
  TpCertListItem,
  InventoryItem,
  UTMachine,
  DftMachine,
  DigitalCamera,
  Anemometer,
  OtherEquipment,
  LaptopDesktop,
  MobileSim,
  InspectionChecklist,
  User,
} from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';

type FullItem =
  | InventoryItem
  | UTMachine
  | DftMachine
  | DigitalCamera
  | Anemometer
  | OtherEquipment
  | LaptopDesktop
  | MobileSim;

interface CertItem {
  itemId: string;
  itemType: string;
  materialName: string;
  manufacturerSrNo: string;
  chestCrollNo?: string | null;
  ariesId?: string | null;
}

const buildCertItems = (items: TpCertListItem[], allItems: FullItem[]): CertItem[] => {
  return items.map(it => {
    const original = allItems.find(i => i.id === it.itemId);

    const serial =
      (original as any)?.serialNumber ||
      (original as any)?.model ||
      (original as any)?.makeModel ||
      (original as any)?.number ||
      it.manufacturerSrNo ||
      "N/A";

    const ariesId =
      (original as any)?.ariesId ||
      it.ariesId ||
      null;

    const finalSerial = serial;

    const materialName =
      it.materialName ||
      (original as any)?.name ||
      (original as any)?.machineName ||
      (original as any)?.equipmentName ||
      (original as any)?.model ||
      "Unknown";

    const chest =
      (original as any)?.chestCrollNo ||
      it.chestCrollNo ||
      null;

    return {
      itemId: it.itemId,
      itemType: it.itemType,
      materialName,
      manufacturerSrNo: finalSerial,
      chestCrollNo: chest,
      ariesId,
    };
  });
};

const getCapacity = (materialName: string): string => {
  const name = materialName.toLowerCase();
  if (name.includes('tape sling')) return '220KG X 1.5 MTR';
  if (name.includes('asap lock')) return '130KG';
  if (name.includes('asap')) return '130 KG';
  if (name.includes('id')) return '150 KG';
  if (name.includes('hand jammer')) return '150 KG';
  if (name.includes('wire sling')) return '0.5 T X 2M';
  if (name.includes('fixe pulley')) return '23 KN';
  if (name.includes('rescue pulley')) return '36 KN';
  if (name.includes('double pulley')) return '36 KN';
  if (name.includes('twin pulley')) return '36 KN';
  if (name.includes('swivel pulley')) return '36 KN';
  if (name.includes('dee shackle')) return '3.25MT';
  if (name.includes('harness')) return '140 KG';

  const liftingMagnetMatch = name.match(/lifting magnet (\d+)\s?kg/);
  if (liftingMagnetMatch) return `${liftingMagnetMatch[1]} kg`;

  const webSlingMatch = name.match(/web sling.*?(\d+t)/);
  if (webSlingMatch) return webSlingMatch[1].toUpperCase();

  const chainBlockMatch = name.match(/chain block.*?(\d+t)/);
  if (chainBlockMatch) return chainBlockMatch[1].toUpperCase();

  return '';
};

const groupItemsForExport = (items: CertItem[]) => {
  const grouped = new Map<string, CertItem[]>();
  items.forEach(item => {
      const key = item.materialName.toLowerCase();
      if (!grouped.has(key)) {
          grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
  });
  return Array.from(grouped.values()).sort((a,b) => a[0].materialName.localeCompare(b[0].materialName));
};


async function fetchImageAsBufferAndBase64(
  imgPath: string,
): Promise<{ buffer: ArrayBuffer; base64: string }> {
  const url = imgPath.startsWith('/') ? `${window.location.origin}${imgPath}` : imgPath;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch header image');
  const buffer = await resp.arrayBuffer();

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = 'data:image/png;base64,' + btoa(binary);

  return { buffer, base64 };
}

export async function generateTpCertExcel(
  items: TpCertListItem[],
  allItems: FullItem[],
  existingWorkbook?: ExcelJS.Workbook,
  sheetName?: string,
  listDate?: Date | string
) {
  const headerImagePath = '/images/aries-header.png';
  const { buffer: imageBuffer } = await fetchImageAsBufferAndBase64(headerImagePath);
  
  const certItems = buildCertItems(items, allItems);
  
  const workbook = existingWorkbook || new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName || "TP Certification List", {
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  const imageId = workbook.addImage({ buffer: imageBuffer, extension: "png" });
  worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, br: { col: 9, row: 3 }, editAs: 'oneCell' });

  const dateToUse = listDate && typeof listDate === 'string' ? parseISO(listDate) : listDate || new Date();

  const dateRow = worksheet.getRow(4);
  worksheet.mergeCells('A4:I4');
  const dateCell = dateRow.getCell('A');
  dateCell.value = `Date: ${format(dateToUse, 'dd-MM-yyyy')}`;
  dateCell.alignment = { horizontal: 'right' };
  dateCell.font = { bold: true };
  
  const startRow = 5;

  worksheet.mergeCells(`A${startRow}:I${startRow}`);
  const titleCell1 = worksheet.getCell(`A${startRow}`);
  titleCell1.value = "Trivedi & Associates Technical Services (P.) Ltd.";
  titleCell1.font = { bold: true, size: 12 };
  titleCell1.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`A${startRow + 1}:I${startRow + 1}`);
  const titleCell2 = worksheet.getCell(`A${startRow + 1}`);
  titleCell2.value = "Jamnagar.";
  titleCell2.font = { bold: true, size: 12 };
  titleCell2.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`A${startRow + 3}:I${startRow + 3}`);
  const subjectCell = worksheet.getCell(`A${startRow + 3}`);
  subjectCell.value = "Subject : Testing & Certification";
  subjectCell.font = { bold: true, size: 12 };
  subjectCell.alignment = { horizontal: 'left' };

  const headerRowIndex = startRow + 5;
  const headers = [ "SR. No.", "Material Name", "Manufacturer Sr. No.", "Chest Croll No.", "Cap. in MT", "Qty in Nos", "New or Old", "Valid upto if Renewal", "Submit Last Testing Report" ];
  const hr = worksheet.getRow(headerRowIndex);
  hr.values = headers;
  hr.eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  
  worksheet.columns = [
    { width: 8 },   // SR. No.
    { width: 25 },  // Material Name
    { width: 45 },  // Manufacturer Sr. No.
    { width: 35 },  // Chest Croll No.
    { width: 15 },  // Cap. in MT
    { width: 10 },  // Qty in Nos
    { width: 15 },  // New or Old
    { width: 20 },  // Valid upto if Renewal
    { width: 15 },  // Submit Last Testing Report
  ];

  const groupedItems = groupItemsForExport(certItems);
  let currentRowIndex = headerRowIndex + 1;
  let srNo = 1;

  groupedItems.forEach(group => {
    const groupStartRow = currentRowIndex;
    group.forEach(item => {
        const isHarness = item.materialName.toLowerCase().includes('harness');
        const row = worksheet.addRow([
            '', // SR NO
            '', // Material Name
            item.manufacturerSrNo,
            isHarness ? (item.chestCrollNo || '') : '',
            '', // Cap
            '', // Qty
            '', // New/Old
            '', // Valid
            '' // Report
        ]);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        currentRowIndex++;
    });

    const groupSize = group.length;
    worksheet.getCell(groupStartRow, 1).value = srNo;
    worksheet.getCell(groupStartRow, 2).value = group[0].materialName;
    worksheet.getCell(groupStartRow, 5).value = getCapacity(group[0].materialName);
    worksheet.getCell(groupStartRow, 6).value = groupSize;
    worksheet.getCell(groupStartRow, 7).value = 'OLD';

    if (groupSize > 1) {
        [1, 2, 5, 6, 7, 8, 9].forEach(col => {
            worksheet.mergeCells(groupStartRow, col, groupStartRow + groupSize - 1, col);
        });
    }

    srNo++;
  });


  const footerStart = worksheet.lastRow!.number + 2;
  const footerLines = [ "Company Authorised Contact Person", "Name : VIJAY SAI", "Contact Number : 919662095558", "Site : RELIANCE INDUSTRIES LTD", "email id: ariesril@ariesmar.com", 'Note : For "New Materials only" Manufacturer Test Certificates submitted.' ];
  footerLines.forEach((text, i) => {
    const rowIndex = footerStart + i;
    worksheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = text;
    worksheet.getCell(`A${rowIndex}`).font = { size: 11, bold: i === 0 };
  });

  if (!existingWorkbook) {
    const excelBuffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([excelBuffer]), "TP_Certification_List.xlsx");
  }
}

export async function generateTpCertPdf(
  items: TpCertListItem[],
  allItems: FullItem[],
  listDate?: Date | string
) {
  const headerImagePath = '/images/aries-header.png';
  const { base64: imgDataUrl } = await fetchImageAsBufferAndBase64(headerImagePath);

  const certItems = buildCertItems(items, allItems);
  const groupedItems = groupItemsForExport(certItems);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const dateToUse = listDate && typeof listDate === 'string' ? parseISO(listDate) : listDate || new Date();

  doc.addImage(imgDataUrl, "PNG", 40, 20, pageWidth - 80, 60);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Date: ${format(dateToUse, 'dd-MM-yyyy')}`, pageWidth - 40, 95, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text('Trivedi & Associates Technical Services (P.) Ltd.', pageWidth / 2, 110, { align: 'center' });
  doc.text('Jamnagar.', pageWidth / 2, 125, { align: 'center' });
  doc.setFont("helvetica", "normal");
  doc.text("Subject : Testing & Certification", 40, 155);

  const headers = ["SR. No.", "Material Name", "Manufacturer Sr. No.", "Chest Croll No.", "Cap. in MT", "Qty in Nos", "New or Old", "Valid upto if Renewal", "Submit Last Testing Report"];
  const columnStyles = {
    0: { cellWidth: 25, halign: 'center', valign: 'middle' },
    1: { cellWidth: 60, halign: 'center', valign: 'middle' },
    2: { cellWidth: 150, halign: 'center', valign: 'middle' },
    3: { cellWidth: 70, halign: 'center', valign: 'middle' },
    4: { cellWidth: 40, halign: 'center', valign: 'middle' },
    5: { cellWidth: 30, halign: 'center', valign: 'middle' },
    6: { cellWidth: 35, halign: 'center', valign: 'middle' },
    7: { cellWidth: 50, halign: 'center', valign: 'middle' },
    8: { cellWidth: 'auto', halign: 'center', valign: 'middle' },
  };

  const bodyRows: any[][] = [];
  let srNo = 1;

  groupedItems.forEach(group => {
    group.forEach((item, index) => {
      const isHarness = item.materialName.toLowerCase().includes('harness');
      if (index === 0) {
        bodyRows.push([
          { content: srNo, rowSpan: group.length, styles: { valign: 'middle', halign: 'center' } },
          { content: item.materialName, rowSpan: group.length, styles: { valign: 'middle', halign: 'center' } },
          item.manufacturerSrNo,
          isHarness ? (item.chestCrollNo || '') : '',
          { content: getCapacity(item.materialName), rowSpan: group.length, styles: { valign: 'middle', halign: 'center' } },
          { content: group.length, rowSpan: group.length, styles: { valign: 'middle', halign: 'center' } },
          { content: 'OLD', rowSpan: group.length, styles: { valign: 'middle', halign: 'center' } },
          { content: '', rowSpan: group.length, styles: { valign: 'middle' } },
          { content: '', rowSpan: group.length, styles: { valign: 'middle' } }
        ]);
      } else {
        bodyRows.push([
          item.manufacturerSrNo,
          isHarness ? (item.chestCrollNo || '') : ''
        ]);
      }
    });
    srNo++;
  });
  
  (doc as any).autoTable({
      head: [headers],
      body: bodyRows,
      startY: 170,
      theme: "grid",
      styles: { fontSize: 7, valign: 'middle' },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', halign: 'center' },
      columnStyles: columnStyles,
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  const footerX = 40;
  let footerY = finalY;

  doc.text("Company Authorised Contact Person", footerX, footerY);
  footerY += 15;
  doc.text("Name : VIJAY SAI", footerX, footerY);
  footerY += 15;
  doc.text("Contact Number : 919662095558", footerX, footerY);
  footerY += 15;
  doc.text("Site : RELIANCE INDUSTRIES LTD", footerX, footerY);
  footerY += 15;
  doc.text("email id: ariesril@ariesmar.com", footerX, footerY);
  footerY += 20;
  doc.text('Note : For "New Materials only" Manufacturer Test Certificates submitted.', footerX, footerY);

  doc.save("TP_Certification_List.pdf");
}


export async function generateChecklistPdf(
  checklist: any,
  item: any,
  inspector: any,
  reviewer: any
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  
  // Header
  const headerImagePath = '/images/aries-header.png';
  const { base64: imgDataUrl } = await fetchImageAsBufferAndBase64(headerImagePath);
  doc.addImage(imgDataUrl, "PNG", margin, 20, contentWidth, 60);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('HARNESS INSPECTION CHECKLIST', pageWidth / 2, 100, { align: 'center' });

  // Details Table
  const detailsBody = [
    ['Product Name', item.name, 'Date of Purchase', checklist.purchaseDate ? format(parseISO(checklist.purchaseDate), 'dd-MM-yyyy') : ''],
    ['Model', item.name, 'Date of First Use', checklist.firstUseDate ? format(parseISO(checklist.firstUseDate), 'dd-MM-yyyy') : ''],
    ['Serial No.', item.serialNumber, 'Year of Manufacture', checklist.yearOfManufacture || ''],
    ['ARIES ID', item.ariesId || '', 'Procedure Ref. No', 'ARIES-RAOP-001 [Rev 07]'],
    ['Known Product History', { content: checklist.knownHistory || '', colSpan: 3 }],
  ];
  doc.autoTable({
    startY: 120,
    body: detailsBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
    didDrawCell: (data) => {
      if (data.row.index > 3) data.cell.styles.fontStyle = 'bold';
    }
  });

  // Inspection Criteria Table
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("Inspection Result", margin, finalY);
  finalY += 5;

  const inspectionBody = [
      ['Preliminary Observation', checklist.findings?.preliminaryObservation || 'N/A'],
      ['Condition of the straps', checklist.findings?.straps || 'N/A'],
      ['Condition of Core', checklist.findings?.conditionCore || 'N/A'],
      ['Checking the attachment points', checklist.findings?.attachmentPoints || 'N/A'],
      ['Checking the condition of the adjustment buckles', checklist.findings?.adjustmentBuckles || 'N/A'],
      ['Checking the condition of the comfort parts', checklist.findings?.comfortParts || 'N/A'],
      ['Checking the condition of the chest/seat harness connector (if any)', checklist.findings?.harnessConnector || 'N/A'],
      ['Checking the condition of the CROLL rope clamp (if any)', checklist.findings?.crollClamp || 'N/A'],
      ['Checking the condition of the frame', checklist.findings?.frame || 'N/A'],
      ['Checking the cam', checklist.findings?.cam || 'N/A'],
      ['Checking the safety catch', checklist.findings?.safetyCatch || 'N/A'],
      ['Function check', checklist.findings?.functionCheck || 'N/A'],
  ];

  doc.autoTable({
      head: [['Points to be checked', 'Condition (G/TM/TR/R/NA)']],
      body: inspectionBody,
      startY: finalY,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fontStyle: 'bold', fillColor: [230, 230, 230] },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' } },
  });
  finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.text('Comments (if any):', margin, finalY);
  finalY += 5;
  doc.setDrawColor(0);
  doc.rect(margin, finalY, contentWidth, 30);
  doc.text(checklist.comments || '', margin + 5, finalY + 10, { maxWidth: contentWidth - 10 });
  finalY += 40;

  doc.text('Remarks:', margin, finalY);
  finalY += 5;
  doc.rect(margin, finalY, contentWidth, 30);
  doc.text(checklist.remarks || '', margin + 5, finalY + 10, { maxWidth: contentWidth - 10 });
  finalY += 40;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Verdict:', margin, finalY);
  finalY += 5;
  doc.rect(margin, finalY, contentWidth, 30);
  doc.text(checklist.verdict || '', margin + 5, finalY + 10, { maxWidth: contentWidth - 10 });
  finalY += 45;

  doc.autoTable({
    startY: finalY,
    body: [
      [
        `Inspected by:\nName: ${inspector.name}\nDesignation: ${inspector.role}`,
        `Reviewed by:\nName: ${reviewer.name}\nDesignation: ${reviewer.role}`
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 10 },
  });
  finalY = (doc as any).lastAutoTable.finalY + 15;

  doc.text('Next Semi-Annual Inspection Due Date:', margin, finalY);
  doc.text(format(parseISO(checklist.nextDueDate), 'dd-MM-yyyy'), margin + 200, finalY);

  doc.save(`Inspection_Checklist_${item.serialNumber}.pdf`);
}

export async function generateChecklistExcel(
  checklist: any,
  item: any,
  inspector: any,
  reviewer: any
) {
  // Implementation for checklist Excel generation
}
