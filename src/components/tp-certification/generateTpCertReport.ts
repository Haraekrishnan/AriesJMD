'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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

async function fetchImageAsArrayBuffer(imgPath: string): Promise<ArrayBuffer> {
  const url = imgPath.startsWith('/') ? `${window.location.origin}${imgPath}` : imgPath;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch header image');
  return resp.arrayBuffer();
}

async function generateExcelWorkbook(
  items: TpCertListItem[],
  allItems: FullItem[],
  existingWorkbook?: ExcelJS.Workbook,
  sheetName?: string,
  listDate?: Date | string
): Promise<ExcelJS.Workbook> {
  const headerImagePath = '/images/aries-header.png';
  const imageBuffer = await fetchImageAsArrayBuffer(headerImagePath);
  
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

  return workbook;
}

export async function generateTpCertExcel(
  items: TpCertListItem[],
  allItems: FullItem[],
  existingWorkbook?: ExcelJS.Workbook,
  sheetName?: string,
  listDate?: Date | string
) {
  const workbook = await generateExcelWorkbook(items, allItems, existingWorkbook, sheetName, listDate);

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
  // 1. Generate the Excel workbook in memory
  const workbook = await generateExcelWorkbook(items, allItems, undefined, "Sheet1", listDate);
  const excelBuffer = await workbook.xlsx.writeBuffer();

  // 2. Prepare the form data to send to the backend
  const formData = new FormData();
  formData.append("file", new Blob([excelBuffer]), "tp_cert_list.xlsx");

  // 3. IMPORTANT: Replace with your actual Cloud Run URL
  const converterUrl = "https://YOUR_CLOUD_RUN_SERVICE_URL/convert";
  
  try {
    const response = await fetch(converterUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF conversion failed: ${response.statusText} - ${errorText}`);
    }

    // 4. Handle the PDF blob response
    const pdfBlob = await response.blob();
    
    const dateToUse = listDate && typeof listDate === 'string' ? parseISO(listDate) : listDate || new Date();
    saveAs(pdfBlob, `TP_Certification_List_${format(dateToUse, 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error("Failed to convert Excel to PDF:", error);
    throw error; // Re-throw to be caught by the calling component
  }
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
