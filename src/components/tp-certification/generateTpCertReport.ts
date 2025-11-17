

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { TpCertListItem } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';

interface CertItem {
  itemId: string;
  itemType: string;
  materialName: string;
  manufacturerSrNo: string;
  chestCrollNo?: string | null;
  ariesId?: string | null;
}

// Helper to get capacity from material name
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

    return ''; // Default empty string if no match
};

// Helper function to process items: group by name
const processItemsForMerging = (items: CertItem[]) => {
    const itemMap = new Map<string, { materialName: string; serialNumbers: string[]; chestCrollNos: (string | undefined | null)[]; capacity: string }>();

    items.forEach(item => {
        const key = item.materialName.toLowerCase();
        
        const mergedSerial = item.manufacturerSrNo;

        if (itemMap.has(key)) {
            itemMap.get(key)!.serialNumbers.push(mergedSerial);
            itemMap.get(key)!.chestCrollNos.push(item.chestCrollNo);
        } else {
            itemMap.set(key, {
                materialName: item.materialName,
                serialNumbers: [mergedSerial],
                chestCrollNos: [item.chestCrollNo],
                capacity: getCapacity(item.materialName),
            });
        }
    });

    return Array.from(itemMap.values()).sort((a, b) => a.materialName.localeCompare(b.materialName));
};

async function fetchImageAsBufferAndBase64(imgPath: string): Promise<{ buffer: ArrayBuffer; base64: string }> {
  // Construct the full URL if it's a relative path
  const url = imgPath.startsWith('/') ? `${window.location.origin}${imgPath}` : imgPath;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch header image');
  const buffer = await resp.arrayBuffer();
  // convert to base64 for jsPDF
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = 'data:image/png;base64,' + btoa(binary);
  return { buffer, base64 };
}

export async function generateTpCertExcel(items: TpCertListItem[], existingWorkbook?: ExcelJS.Workbook, sheetName?: string, listDate?: Date | string) {
  const headerImagePath = '/images/aries-header.png';
  const { buffer: imageBuffer } = await fetchImageAsBufferAndBase64(headerImagePath);
  
  const certItems: CertItem[] = items.map(it => ({
    itemId: it.itemId,
    itemType: it.itemType,
    materialName: it.materialName,
    manufacturerSrNo: it.manufacturerSrNo || (it as any).serialNumber,
    chestCrollNo: it.chestCrollNo,
    ariesId: it.ariesId
  }));
  
  const workbook = existingWorkbook || new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName || "TP Certification List", {
    pageSetup: { paperSize: 9, orientation: "portrait" }, // A4 Portrait
  });

  const imageId = workbook.addImage({
    buffer: imageBuffer,
    extension: "png",
  });

  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    br: { col: 8, row: 3 },
    editAs: 'oneCell',
  });

  const dateToUse = listDate ? (typeof listDate === 'string' ? parseISO(listDate) : listDate) : new Date();

  // Add Date Row
  const dateRow = worksheet.getRow(4);
  worksheet.mergeCells('A4:H4');
  dateRow.getCell('H').value = `Date: ${format(dateToUse, 'dd-MM-yyyy')}`;
  dateRow.getCell('H').alignment = { horizontal: 'right' };
  dateRow.getCell('H').font = { bold: true };


  const startRow = 5; 

  worksheet.mergeCells(`A${startRow}:H${startRow}`);
  worksheet.getCell(`A${startRow}`).value = "Trivedi & Associates Technical Services (P.) Ltd.";
  worksheet.getCell(`A${startRow}`).font = { bold: true, size: 12 };
  worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`A${startRow + 1}:H${startRow + 1}`);
  worksheet.getCell(`A${startRow + 1}`).value = "Jamnagar.";
  worksheet.getCell(`A${startRow + 1}`).font = { bold: true, size: 12 };
  worksheet.getCell(`A${startRow + 1}`).alignment = { horizontal: 'center' };
  
  worksheet.mergeCells(`A${startRow + 3}:H${startRow + 3}`);
  worksheet.getCell(`A${startRow + 3}`).value = "Subject : Testing & Certification";
  worksheet.getCell(`A${startRow + 3}`).font = { bold: true, size: 12 };
  worksheet.getCell(`A${startRow + 3}`).alignment = { horizontal: 'left' };

  const headerRowIndex = startRow + 5;
  const headers = [
    "SR. No.", "Material Name", "Manufacturer Sr. No.", "Chest Scroll No.", "Cap. in MT",
    "Qty in Nos", "New or Old", "Valid upto if Renewal",
    "Submit Last Testing Report (Form No.10/12/Any Other)",
  ];

  const hr = worksheet.getRow(headerRowIndex);
  hr.values = headers;
  hr.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" }, };
  });
  
  const processedItems = processItemsForMerging(certItems);
  let currentRowIndex = headerRowIndex + 1;
  let srNo = 1;

  processedItems.forEach(group => {
    const groupStartRow = currentRowIndex;
    const groupSize = group.serialNumbers.length;
    const isHarness = group.materialName.toLowerCase() === 'harness';
    
    group.serialNumbers.forEach((serial, index) => {
        const chestCrollNo = group.chestCrollNos[index];
        const manufacturerSrNo = serial;
        
        const rowData = [
            index === 0 ? srNo : '',
            index === 0 ? group.materialName : '',
            manufacturerSrNo,
            isHarness ? (chestCrollNo || '') : '',
            index === 0 ? group.capacity : '',
            index === 0 ? groupSize : '',
            index === 0 ? 'OLD' : '',
            '', ''
        ];
        const row = worksheet.addRow(rowData);
        
        if (!isHarness) {
            worksheet.mergeCells(row.number, 3, row.number, 4);
        }

        row.eachCell(cell => {
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" }, };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        currentRowIndex++;
    });

    if (groupSize > 1) {
        const mergeCols = [1, 2, 5, 6, 7, 8, 9]; 
        if(!isHarness) {
            mergeCols.push(4); // also merge chest croll no. if not harness
        }
        mergeCols.forEach(col => {
            worksheet.mergeCells(groupStartRow, col, groupStartRow + groupSize - 1, col);
        });
    }
    srNo++;
  });


  const footerStart = worksheet.lastRow!.number + 2;
  const footerLines = [
    "Company Authorised Contact Person", "Name : VIJAY SAI", "Contact Number : 919662095558",
    "Site : RELIANCE INDUSTRIES LTD", "email id: ariesril@ariesmar.com",
    'Note : For "New Materials only" Manufacturer Test Certificates submitted.',
  ];

  footerLines.forEach((text, i) => {
    const cell = worksheet.getCell(`A${footerStart + i}`);
    cell.value = text;
    cell.font = { size: 11, bold: i === 0 };
    worksheet.mergeCells(`A${footerStart + i}:H${footerStart + i}`);
  });

  if (!existingWorkbook) {
    const bufferExcel = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([bufferExcel]), "TP_Certification_List.xlsx");
  }
}


export async function generateTpCertPdf(items: TpCertListItem[], listDate?: Date | string) {
  const headerImagePath = '/images/aries-header.png';
  const { base64: imgDataUrl } = await fetchImageAsBufferAndBase64(headerImagePath);
  
  const certItems: CertItem[] = items.map(it => ({
    itemId: it.itemId,
    itemType: it.itemType,
    materialName: it.materialName,
    manufacturerSrNo: it.manufacturerSrNo || (it as any).serialNumber,
    chestCrollNo: it.chestCrollNo,
    ariesId: it.ariesId
  }));

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const dateToUse = listDate ? (typeof listDate === 'string' ? parseISO(listDate) : listDate) : new Date();

  doc.addImage(imgDataUrl, "PNG", 40, 20, pageWidth - 80, 60);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Date: ${format(dateToUse, 'dd-MM-yyyy')}`, pageWidth - 40, 95, { align: 'right' });


  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Trivedi & Associates Technical Services (P.) Ltd.", pageWidth / 2, 110, { align: 'center' });
  doc.text("Jamnagar.", pageWidth / 2, 125, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.text("Subject : Testing & Certification", 40, 155);

  const tableColumn = [
      "SR. No.", "Material Name", "Manufacturer Sr. No.", "Chest Scroll No.", "Cap. in MT", "Qty in Nos", "New or Old",
      "Valid upto if Renewal", "Submit Last Testing Report",
  ];
  
  const processedItems = processItemsForMerging(certItems);
  const tableRows: any[][] = [];
  let srNo = 1;

  processedItems.forEach(group => {
    const groupSize = group.serialNumbers.length;
    const isHarness = group.materialName.toLowerCase() === 'harness';

    group.serialNumbers.forEach((serial, index) => {
      const chestCrollNo = group.chestCrollNos[index];
      const manufacturerSrNo = serial;
      
      const rowData = [
        { content: index === 0 ? srNo : '', rowSpan: index === 0 ? groupSize : 1 },
        { content: index === 0 ? group.materialName : '', rowSpan: index === 0 ? groupSize : 1 },
        manufacturerSrNo || '',
        isHarness ? (chestCrollNo || '') : '',
        { content: index === 0 ? group.capacity : '', rowSpan: index === 0 ? groupSize : 1 },
        { content: index === 0 ? groupSize : '', rowSpan: index === 0 ? groupSize : 1 },
        { content: index === 0 ? 'OLD' : '', rowSpan: index === 0 ? groupSize : 1 },
        { content: '', rowSpan: index === 0 ? groupSize : 1 },
        { content: '', rowSpan: index === 0 ? groupSize : 1 }
      ];

      if (!isHarness) {
        rowData.splice(3, 1);
        const serialCell = rowData[2] as any;
        if(typeof serialCell === 'object' && serialCell !== null) {
          serialCell.colSpan = 2;
        } else {
            rowData[2] = { content: serialCell, colSpan: 2 };
        }
      }

      const filteredRow = rowData.filter((_, cellIndex) => {
        if (index > 0) {
            const serialIndex = 2; 
            const chestCrollIndex = 3;
            if (isHarness) {
                return cellIndex === serialIndex || cellIndex === chestCrollIndex;
            } else {
                return cellIndex === serialIndex;
            }
        }
        return true;
      });

      tableRows.push(filteredRow);
    });
    srNo++;
  });
  
  const isAnyHarness = items.some(i => i.materialName.toLowerCase() === 'harness');
  const finalTableColumns = isAnyHarness 
    ? tableColumn 
    : tableColumn.filter(header => header !== "Chest Scroll No.");

  (doc as any).autoTable({
      head: [finalTableColumns],
      body: tableRows,
      startY: 170,
      theme: "grid",
      styles: { fontSize: 8, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
      didParseCell: (data: any) => {
        const cell = data.cell;
        const raw = cell.raw;
        if (typeof raw === 'object' && raw !== null) {
            if (raw.rowSpan > 1) cell.rowSpan = raw.rowSpan;
            if (raw.colSpan > 1) cell.colSpan = raw.colSpan;
            if (raw.content !== undefined) cell.content = raw.content;
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
  doc.text(
    'Note : For "New Materials only" Manufacturer Test Certificates submitted.',
    footerX,
    footerY
  );

  doc.save("TP_Certification_List.pdf");
}
