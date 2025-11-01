// generateTpCertReport.ts
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CertItem {
  materialName: string;
  manufacturerSrNo: string;
}

export async function generateTpCertExcel(items: CertItem[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("TP Certification List", {
    pageSetup: { paperSize: 9, orientation: "portrait" }, // A4 Portrait
  });

  // Header image
  const image = await fetch("/aries-header.png").then((r) => r.blob());
  const buffer = await image.arrayBuffer();
  const imageId = workbook.addImage({
    buffer,
    extension: "png",
  });

  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: 620, height: 100 },
  });

  // Add spacing after image
  const startRow = 6;

  worksheet.getCell(`A${startRow}`).value =
    "Trivedi & Associates Technical Services (P.) Ltd.";
  worksheet.getCell(`A${startRow + 1}`).value = "Jamnagar.";
  worksheet.getCell(`A${startRow + 3}`).value = "Subject : Testing & Certification";

  // Bold and center title
  [startRow, startRow + 1, startRow + 3].forEach((r) => {
    const row = worksheet.getRow(r);
    row.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    worksheet.mergeCells(`A${r}:H${r}`);
  });

  // Table headers
  const headerRow = startRow + 5;
  const headers = [
    "SR. No.",
    "Material Name",
    "Manufacturer Sr. No.",
    "Cap. in MT",
    "Qty in Nos",
    "New or Old",
    "Valid upto if Renewal",
    "Submit Last Testing Report (Form No.10/12/Any Other)",
  ];

  worksheet.addRow(headers);

  const header = worksheet.getRow(headerRow);
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Body rows
  items.forEach((item, index) => {
    const rowValues = [
      index + 1,
      item.materialName,
      item.manufacturerSrNo,
      "",
      "",
      "OLD",
      "",
      "",
    ];
    const row = worksheet.addRow(rowValues);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { wrapText: true, vertical: "middle" };
    });
  });

  // Footer section
  const footerStart = worksheet.lastRow!.number + 2;
  const footerLines = [
    "Company Authorised Contact Person",
    "Name : VIJAY SAI",
    "Contact Number : 919662095558",
    "Site : RELIANCE INDUSTRIES LTD",
    "Email id: ariesril@ariesmar.com",
    'Note : For "New Materials only" Manufacturer Test Certificates submitted.',
  ];

  footerLines.forEach((text, i) => {
    const cell = worksheet.getCell(`A${footerStart + i}`);
    cell.value = text;
    cell.font = { size: 11 };
    if (i === 0) cell.font = { bold: true, size: 11 };
    worksheet.mergeCells(`A${footerStart + i}:H${footerStart + i}`);
  });

  // Auto-fit columns
  worksheet.columns.forEach((col) => {
    let maxLength = 0;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? cell.value.toString().length : 10;
      if (len > maxLength) maxLength = len;
    });
    col.width = maxLength < 15 ? 15 : maxLength;
  });

  const bufferExcel = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([bufferExcel]), "TP_Certification_List.xlsx");
}

export async function generateTpCertPdf(items: CertItem[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  // Header image
  const img = new Image();
  img.src = "/aries-header.png";
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  doc.addImage(img, "PNG", 40, 20, 520, 80);

  doc.setFontSize(12);
  doc.text("Trivedi & Associates Technical Services (P.) Ltd.", 40, 130);
  doc.text("Jamnagar.", 40, 145);
  doc.text("Subject : Testing & Certification", 40, 170);

  const tableColumn = [
    "SR. No.",
    "Material Name",
    "Manufacturer Sr. No.",
    "Cap. in MT",
    "Qty in Nos",
    "New or Old",
    "Valid upto if Renewal",
    "Submit Last Testing Report (Form No.10/12/Any Other)",
  ];

  const tableRows = items.map((item, index) => [
    index + 1,
    item.materialName,
    item.manufacturerSrNo,
    "",
    "",
    "OLD",
    "",
    "",
  ]);

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 190,
    styles: { fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.3 },
    headStyles: { fillColor: [240, 240, 240], textColor: 0 },
    theme: "grid",
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.text("Company Authorised Contact Person", 300, finalY);
  doc.text("Name : VIJAY SAI", 300, finalY + 15);
  doc.text("Contact Number : 919662095558", 300, finalY + 30);
  doc.text("Site : RELIANCE INDUSTRIES LTD", 300, finalY + 45);
  doc.text("email id: ariesril@ariesmar.com", 300, finalY + 60);
  doc.text(
    'Note : For "New Materials only" Manufacturer Test Certificates submitted.',
    40,
    finalY + 85
  );

  doc.save("TP_Certification_List.pdf");
}
