// generateTpCertReport.ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CertItem {
  materialName: string;
  manufacturerSrNo: string;
  newOrOld?: string;
}

// Helper: fetch image and return arrayBuffer and base64
async function fetchImageAsBufferAndBase64(imgPath: string): Promise<{ buffer: ArrayBuffer; base64: string }> {
  // imgPath should be public path e.g. "/images/aries-header.png"
  const resp = await fetch(imgPath);
  if (!resp.ok) throw new Error('Failed to fetch header image');
  const buffer = await resp.arrayBuffer();
  // convert to base64 for jsPDF
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = 'data:image/png;base64,' + btoa(binary);
  return { buffer, base64 };
}

export async function generateTpCertExcel(items: CertItem[], headerImagePath: string) {
  const { buffer: imageBuffer } = await fetchImageAsBufferAndBase64(headerImagePath);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('TP Certification List', { views: [{ showGridLines: false }] });

  // Add image to workbook
  const imageId = workbook.addImage({
    buffer: imageBuffer,
    extension: 'png',
  });

  // place image spanning columns A:H and rows 1:3 (adjust height as needed)
  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    br: { col: 8, row: 3 },
    editAs: 'oneCell',
  });

  // Leave a few empty rows after header image
  const startRow = 4;

  // Title / Subject row (merged)
  worksheet.mergeCells(startRow + 1, 1, startRow + 1, 8); // e.g. row 6 if startRow=4 => adjust visually
  const subjectCell = worksheet.getCell(startRow + 1, 1);
  subjectCell.value = 'Subject : Testing & Certification';
  subjectCell.alignment = { horizontal: 'left', vertical: 'middle' };
  subjectCell.font = { bold: true, size: 12 };

  // blank row
  worksheet.addRow([]);

  // Header row for the table
  const headerRowIndex = startRow + 3;
  const header = [
    'SR. No.',
    'Material Name',
    'Manufacturer Sr. No.',
    'Cap. in MT',
    'Qty in Nos',
    'New or Old',
    'Valid upto if Renewal',
    'Submit Last Testing Report (Form No.10/12/Any Other)',
  ];

  worksheet.columns = [
    { header: header[0], key: 'sr', width: 8 },
    { header: header[1], key: 'materialName', width: 40 },
    { header: header[2], key: 'mfgSr', width: 30 },
    { header: header[3], key: 'cap', width: 12 },
    { header: header[4], key: 'qty', width: 12 },
    { header: header[5], key: 'newold', width: 12 },
    { header: header[6], key: 'valid', width: 18 },
    { header: header[7], key: 'submit', width: 30 },
  ];

  // add the header row (ensure it lands at headerRowIndex)
  const hr = worksheet.getRow(headerRowIndex);
  hr.values = header;
  hr.font = { bold: true };
  hr.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  hr.height = 24;

  // fill body
  let rowIndex = headerRowIndex + 1;
  items.forEach((it, idx) => {
    const row = worksheet.getRow(rowIndex);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = it.materialName;
    row.getCell(3).value = it.manufacturerSrNo || '';
    row.getCell(4).value = ''; // Cap. in MT
    row.getCell(5).value = ''; // Qty in Nos
    row.getCell(6).value = it.newOrOld || 'OLD';
    row.getCell(7).value = ''; // Valid upto if Renewal
    row.getCell(8).value = ''; // Submit Last Testing Report
    rowIndex++;
  });

  // Footer block after data
  const footerStart = rowIndex + 1;
  worksheet.mergeCells(footerStart, 1, footerStart, 8);
  worksheet.getCell(footerStart, 1).value = 'Company Authorised Contact Person';
  worksheet.getCell(footerStart + 1, 1).value = 'Name : VIJAY SAI';
  worksheet.getCell(footerStart + 2, 1).value = 'Contact Number : 919662095558';
  worksheet.getCell(footerStart + 3, 1).value = 'Site : RELIANCE INDUSTRIES LTD';
  worksheet.getCell(footerStart + 4, 1).value = 'email id: ariesril@ariesmar.com';
  worksheet.getCell(footerStart + 5, 1).value = 'Note : For " New Materials only " Manufacturer Test Certificates submitted.';

  // styling for footer
  for (let i = 0; i <= 5; i++) {
    const c = worksheet.getCell(footerStart + i, 1);
    c.alignment = { horizontal: 'left' };
  }

  // Write workbook to buffer and trigger download
  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'TP_Certification_List.xlsx');
}

export async function generateTpCertPdf(items: CertItem[], headerImagePath: string) {
  const { base64: imgDataUrl } = await fetchImageAsBufferAndBase64(headerImagePath);

  // Create landscape PDF
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Add header image at the top left and top-right area sized to fit across
  // Using a width that spans across the page
  const pageWidth = doc.internal.pageSize.getWidth();
  // keep some margins
  const imgWidth = pageWidth - 40;
  // approximate height proportionally (we'll use 60pt height)
  const imgHeight = 60;
  doc.addImage(imgDataUrl, 'PNG', 20, 10, imgWidth, imgHeight);

  // Subject
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Subject : Testing & Certification', 20, 90);
  doc.setFont('helvetica', 'normal');

  // Prepare table columns and rows
  const tableColumn = [
    'SR. No.',
    'Material Name',
    'Manufacturer Sr. No.',
    'Cap. in MT',
    'Qty in Nos',
    'New or Old',
    'Valid upto if Renewal',
    'Submit Last Testing Report (Form No.10/12/Any Other)',
  ];
  const tableRows = items.map((item, idx) => [
    idx + 1,
    item.materialName,
    item.manufacturerSrNo || '',
    '',
    '',
    item.newOrOld || 'OLD',
    '',
    '',
  ]);

  // AutoTable for the main data
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 110,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20, halign: 'center' },
    columnStyles: {
      1: { cellWidth: 200 }, // material name wider
      7: { cellWidth: 120 },
      8: { cellWidth: 220 },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 110;

  // Footer block
  const footerX = pageWidth - 260;
  let footerY = finalY + 20;
  doc.setFontSize(10);
  doc.text('Company Authorised Contact Person', footerX, footerY);
  footerY += 15;
  doc.text('Name : VIJAY SAI', footerX, footerY);
  footerY += 15;
  doc.text('Contact Number : 919662095558', footerX, footerY);
  footerY += 15;
  doc.text('Site : RELIANCE INDUSTRIES LTD', footerX, footerY);
  footerY += 15;
  doc.text('email id: ariesril@ariesmar.com', footerX, footerY);
  footerY += 20;
  doc.text('Note : For " New Materials only " Manufacturer Test Certificates submitted.', 20, footerY);

  doc.save('TP_Certification_List.pdf');
}
