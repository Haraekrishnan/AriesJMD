
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CertItem {
  materialName: string;
  manufacturerSrNo: string;
}

async function fetchImageAsBase64(imgPath: string): Promise<string> {
    const resp = await fetch(imgPath);
    if (!resp.ok) throw new Error('Failed to fetch header image');
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return 'data:image/png;base64,' + btoa(binary);
}


export async function generateTpCertExcel(items: CertItem[], headerImagePath: string, existingWorkbook?: ExcelJS.Workbook, sheetName?: string) {
  const workbook = existingWorkbook || new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName || "TP Certification List", {
    pageSetup: { paperSize: 9, orientation: "portrait" }, // A4 Portrait
  });

  const response = await fetch(headerImagePath);
  const imageBuffer = await response.arrayBuffer();
  
  const imageId = workbook.addImage({
    buffer: imageBuffer,
    extension: "png",
  });

  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    br: { col: 8, row: 3 },
    editAs: 'oneCell',
  });

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

  const headerRow = startRow + 5;
  const headers = [
    "SR. No.", "Material Name", "Manufacturer Sr. No.", "Cap. in MT",
    "Qty in Nos", "New or Old", "Valid upto if Renewal",
    "Submit Last Testing Report (Form No.10/12/Any Other)",
  ];

  worksheet.columns = headers.map(h => ({
    header: h,
    key: h.toLowerCase().replace(/ /g, '_'),
    width: 20
  }));
  
  const hr = worksheet.getRow(headerRow);
  hr.values = headers;
  hr.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" }, };
  });
  
  items.forEach((item, index) => {
    worksheet.addRow([
      index + 1, item.materialName, item.manufacturerSrNo, '', '', 'OLD', '', ''
    ]).eachCell(cell => {
      cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" }, };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
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


export async function generateTpCertPdf(items: CertItem[], headerImagePath: string) {
    const imgDataUrl = await fetchImageAsBase64(headerImagePath);

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.addImage(imgDataUrl, "PNG", 40, 20, pageWidth - 80, 60);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Trivedi & Associates Technical Services (P.) Ltd.", pageWidth / 2, 110, { align: 'center' });
    doc.text("Jamnagar.", pageWidth / 2, 125, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.text("Subject : Testing & Certification", 40, 155);

    const tableColumn = [
        "SR. No.", "Material Name", "Manufacturer Sr. No.", "Cap. in MT", "Qty in Nos", "New or Old",
        "Valid upto if Renewal", "Submit Last Testing Report (Form No.10/12/Any Other)",
    ];
    const tableRows = items.map((item, index) => [
        index + 1, item.materialName, item.manufacturerSrNo, "", "", "OLD", "", ""
    ]);

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 170,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
        columnStyles: { 1: { cellWidth: 100 }, 2: { cellWidth: 100 } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(10);
    doc.text("Company Authorised Contact Person", 40, finalY);
    doc.text("Name : VIJAY SAI", 40, finalY + 15);
    doc.text("Contact Number : 919662095558", 40, finalY + 30);
    doc.text("Site : RELIANCE INDUSTRIES LTD", 40, finalY + 45);
    doc.text("email id: ariesril@ariesmar.com", 40, finalY + 60);
    doc.text('Note : For "New Materials only" Manufacturer Test Certificates submitted.', 40, finalY + 80);

    doc.save("TP_Certification_List.pdf");
}
