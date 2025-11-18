

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

    // UNIVERSAL serial number resolver
    const serial =
      (original as any)?.serialNumber ||
      (original as any)?.model ||
      (original as any)?.makeModel ||
      (original as any)?.number ||
      it.manufacturerSrNo ||
      "N/A";

    // UNIVERSAL Aries ID resolver
    const ariesId =
      (original as any)?.ariesId ||
      it.ariesId ||
      null;

    // FINAL formatted serial string (UI & Export match)
    const finalSerial =
      ariesId && ariesId.trim() !== ""
        ? `${serial} (${ariesId})`
        : serial;

    // Material name resolver
    const materialName =
      it.materialName ||
      (original as any)?.name ||
      (original as any)?.machineName ||
      (original as any)?.equipmentName ||
      (original as any)?.model ||
      "Unknown";

    // Chest croll resolver
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
  worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, br: { col: 8, row: 3 }, editAs: 'oneCell' });

  const dateToUse = listDate && typeof listDate === 'string' ? parseISO(listDate) : listDate || new Date();

  const dateRow = worksheet.getRow(4);
  worksheet.mergeCells('A4:H4');
  dateRow.getCell('H').value = `Date: ${format(dateToUse, 'dd-MM-yyyy')}`;
  dateRow.getCell('H').alignment = { horizontal: 'right' };
  dateRow.getCell('H').font = { bold: true };

  const startRow = 5;
  worksheet.mergeCells(`A${startRow}:H${startRow}`).value = "Trivedi & Associates Technical Services (P.) Ltd.";
  worksheet.getCell(`A${startRow}`).font = { bold: true, size: 12 };
  worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };
  worksheet.mergeCells(`A${startRow + 1}:H${startRow + 1}`).value = "Jamnagar.";
  worksheet.getCell(`A${startRow + 1}`).font = { bold: true, size: 12 };
  worksheet.getCell(`A${startRow + 1}`).alignment = { horizontal: 'center' };
  worksheet.mergeCells(`A${startRow + 3}:H${startRow + 3}`).value = "Subject : Testing & Certification";
  worksheet.getCell(`A${startRow + 3}`).font = { bold: true, size: 12 };
  worksheet.getCell(`A${startRow + 3}`).alignment = { horizontal: 'left' };

  const headerRowIndex = startRow + 5;
  const headers = [ "SR. No.", "Material Name", "Manufacturer Sr. No.", "Chest Scroll No.", "Cap. in MT", "Qty in Nos", "New or Old", "Valid upto if Renewal", "Submit Last Testing Report" ];
  const hr = worksheet.getRow(headerRowIndex);
  hr.values = headers;
  hr.eachCell(cell => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  });
  
  // Set column widths
  worksheet.columns = [
    { width: 8 },   // SR. No.
    { width: 25 },  // Material Name
    { width: 45 },  // Manufacturer Sr. No.
    { width: 35 },  // Chest Scroll No.
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
    const groupSize = group.length;
    const isHarness = group[0].materialName.toLowerCase() === 'harness';

    group.forEach((item, index) => {
      const rowData = [
        srNo,
        item.materialName,
        item.manufacturerSrNo,
        isHarness ? item.chestCrollNo || '' : '',
        getCapacity(item.materialName),
        groupSize,
        'OLD',
        '',
        ''
      ];
      const row = worksheet.addRow(rowData);
      
      if (!isHarness) {
        worksheet.mergeCells(row.number, 3, row.number, 4);
      }

      row.eachCell((cell, colNumber) => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        
        // Don't merge the first item of a group that will be merged
        if (index > 0 && [1, 2, 5, 6, 7, 8, 9].includes(colNumber)) return;
        
        if (index === 0 && groupSize > 1) {
            worksheet.mergeCells(groupStartRow, colNumber, groupStartRow + groupSize - 1, colNumber);
        }
      });
      currentRowIndex++;
    });

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
    const bufferExcel = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([bufferExcel]), "TP_Certification_List.xlsx");
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

  const tableColumn = [ "SR. No.", "Material Name", "Manufacturer Sr. No.", "Chest Scroll No.", "Cap. in MT", "Qty in Nos", "New or Old", "Valid upto if Renewal", "Submit Last Testing Report" ];
  
  const groupedItems = groupItemsForExport(certItems);
  const tableRows: any[][] = [];
  let srNo = 1;

  groupedItems.forEach(group => {
    const groupSize = group.length;
    const isHarness = group[0].materialName.toLowerCase() === 'harness';

    group.forEach((item, index) => {
        const rowData = [
            { content: index === 0 ? srNo : '', rowSpan: index === 0 ? groupSize : 1 },
            { content: index === 0 ? item.materialName : '', rowSpan: index === 0 ? groupSize : 1 },
            item.manufacturerSrNo || '',
            isHarness ? (item.chestCrollNo || '') : '',
            { content: index === 0 ? getCapacity(item.materialName) : '', rowSpan: index === 0 ? groupSize : 1 },
            { content: index === 0 ? groupSize : '', rowSpan: index === 0 ? groupSize : 1 },
            { content: index === 0 ? 'OLD' : '', rowSpan: index === 0 ? groupSize : 1 },
            { content: '', rowSpan: index === 0 ? groupSize : 1 },
            { content: '', rowSpan: index === 0 ? groupSize : 1 }
        ];

        if (!isHarness) {
            rowData.splice(3, 1);
            const serialCell = rowData[2] as any;
            if(typeof serialCell === 'object' && serialCell !== null) serialCell.colSpan = 2;
            else rowData[2] = { content: serialCell, colSpan: 2 };
        }

        const filteredRow = rowData.filter((_, cellIndex) => {
            if (index > 0) {
                const serialIndex = 2;
                const chestCrollIndex = 3;
                if (isHarness) return cellIndex === serialIndex || cellIndex === chestCrollIndex;
                else return cellIndex === serialIndex;
            }
            return true;
        });
        tableRows.push(filteredRow);
    });
    srNo++;
  });
  
  const isAnyHarness = items.some(i => i.materialName.toLowerCase() === 'harness');
  const finalTableColumns = isAnyHarness ? tableColumn : tableColumn.filter(header => header !== "Chest Scroll No.");
  const columnStyles = {
    0: { cellWidth: 25 },
    1: { cellWidth: 60 },
    2: { cellWidth: 120 }, // Manufacturer Sr. No.
    3: { cellWidth: 80 }, // Chest Scroll No.
    4: { cellWidth: 40 }, // Cap
    5: { cellWidth: 30 }, // Qty
    6: { cellWidth: 35 }, // New/Old
    7: { cellWidth: 50 }, // Valid
    8: { cellWidth: 'auto' }, // Last column
  };

  if(!isAnyHarness) {
    columnStyles[2].cellWidth = 200; // Merge manufacturer and chest croll widths
    delete (columnStyles as any)[3];
    // Shift subsequent column styles
    const keys = Object.keys(columnStyles).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < keys.length; i++) {
        if(keys[i] > 2) {
            (columnStyles as any)[keys[i] - 1] = (columnStyles as any)[keys[i]];
            delete (columnStyles as any)[keys[i]];
        }
    }
  }


  (doc as any).autoTable({
      head: [finalTableColumns],
      body: tableRows,
      startY: 170,
      theme: "grid",
      styles: { fontSize: 7, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
      columnStyles: columnStyles,
      didParseCell: (data: any) => {
        if (typeof data.cell.raw === 'object' && data.cell.raw !== null) {
            if (data.cell.raw.rowSpan > 1) data.cell.rowSpan = data.cell.raw.rowSpan;
            if (data.cell.raw.colSpan > 1) data.cell.colSpan = data.cell.raw.colSpan;
            if (data.cell.raw.content !== undefined) data.cell.content = data.cell.raw.content;
        }
      }
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
  // Implementation for checklist PDF generation
}

export async function generateChecklistExcel(
  checklist: any,
  item: any,
  inspector: any,
  reviewer: any
) {
  // Implementation for checklist Excel generation
}
