

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { TpCertListItem } from '@/lib/types';
import { format } from 'date-fns';

interface CertItem {
  materialName: string;
  manufacturerSrNo: string;
  chestCrollNo?: string;
}

// Helper function to process items: group by name
const processItemsForMerging = (items: CertItem[]) => {
    const itemMap = new Map<string, { materialName: string; serialNumbers: string[]; chestCrollNos: (string | undefined)[] }>();

    items.forEach(item => {
        const key = item.materialName.toLowerCase();
        if (itemMap.has(key)) {
            itemMap.get(key)!.serialNumbers.push(item.manufacturerSrNo);
            itemMap.get(key)!.chestCrollNos.push(item.chestCrollNo);
        } else {
            itemMap.set(key, {
                materialName: item.materialName,
                serialNumbers: [item.manufacturerSrNo],
                chestCrollNos: [item.chestCrollNo],
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

export async function generateTpCertExcel(items: TpCertListItem[], existingWorkbook?: ExcelJS.Workbook, sheetName?: string) {
  const headerImagePath = '/images/aries-header.png';
  const { buffer: imageBuffer } = await fetchImageAsBufferAndBase64(headerImagePath);
  
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

  // Add Date Row
  const dateRow = worksheet.getRow(4);
  worksheet.mergeCells('A4:H4');
  dateRow.getCell('H').value = `Date: ${format(new Date(), 'dd-MM-yyyy')}`;
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
  
  const processedItems = processItemsForMerging(items);
  let currentRowIndex = headerRowIndex + 1;
  let srNo = 1;

  processedItems.forEach(group => {
    const groupStartRow = currentRowIndex;
    const groupSize = group.serialNumbers.length;
    
    group.serialNumbers.forEach((serial, index) => {
        const chestCrollNo = group.chestCrollNos[index];
        const rowData = [
            index === 0 ? srNo : '',
            index === 0 ? group.materialName : '',
            serial,
            chestCrollNo || '',
            '', // Cap in MT
            index === 0 ? groupSize : '',
            index === 0 ? 'OLD' : '',
            '', ''
        ];
        const row = worksheet.addRow(rowData);
        row.eachCell(cell => {
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" }, };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        });
        currentRowIndex++;
    });

    if (groupSize > 1) {
        const mergeCols = [1, 2, 5, 6, 7, 8, 9]; // Corresponds to A, B, E, F, G, H, I
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


export async function generateTpCertPdf(items: TpCertListItem[]) {
    const headerImagePath = '/images/aries-header.png';
    const { base64: imgDataUrl } = await fetchImageAsBufferAndBase64(headerImagePath);

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.addImage(imgDataUrl, "PNG", 40, 20, pageWidth - 80, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Date: ${format(new Date(), 'dd-MM-yyyy')}`, pageWidth - 40, 95, { align: 'right' });


    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Trivedi & Associates Technical Services (P.) Ltd.", pageWidth / 2, 110, { align: 'center' });
    doc.text("Jamnagar.", pageWidth / 2, 125, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.text("Subject : Testing & Certification", 40, 155);

    const tableColumn = [
        "SR. No.", "Material Name", "Manufacturer Sr. No.", "Chest Scroll No.", "Cap. in MT", "Qty in Nos", "New or Old",
        "Valid upto if Renewal", "Submit Last Testing Report (Form No.10/12/Any Other)",
    ];
    
    const processedItems = processItemsForMerging(items);
    const tableRows: any[][] = [];
    let srNo = 1;

    for (const group of processedItems) {
      for (let i = 0; i < group.serialNumbers.length; i++) {
        const serial = group.serialNumbers[i];
        const chestCrollNo = group.chestCrollNos[i];
        if (i === 0) {
          tableRows.push([
            { content: srNo, rowSpan: group.serialNumbers.length },
            { content: group.materialName, rowSpan: group.serialNumbers.length },
            serial,
            chestCrollNo || '',
            { content: '', rowSpan: group.serialNumbers.length },
            { content: group.serialNumbers.length, rowSpan: group.serialNumbers.length },
            { content: 'OLD', rowSpan: group.serialNumbers.length },
            { content: '', rowSpan: group.serialNumbers.length },
            { content: '', rowSpan: group.serialNumbers.length },
          ]);
        } else {
          tableRows.push([serial, chestCrollNo || '']);
        }
      }
      srNo++;
    }


    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 170,
        theme: "grid",
        styles: { fontSize: 8, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
        columnStyles: {
          1: { cellWidth: 80, halign: 'left' }, 
          2: { cellWidth: 80, halign: 'left' },
          3: { cellWidth: 80, halign: 'left' },
          7: { cellWidth: 60 },
          8: { cellWidth: 60 }
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
