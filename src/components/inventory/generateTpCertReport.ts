
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CertItem {
    materialName: string;
    manufacturerSrNo: string;
}

export function generateTpCertExcel(items: CertItem[]) {
    const header = [
        "SR. No.", 
        "Material Name", 
        "Manufacturer Sr. No.", 
        "Cap. in MT", 
        "Qty in Nos", 
        "New or Old", 
        "Valid upto if Renewal", 
        "Submit Last Testing Report (Form No.10/12/Any Other)"
    ];

    const body = items.map((item, index) => [
        index + 1,
        item.materialName,
        item.manufacturerSrNo,
        "", // Cap. in MT
        "", // Qty in Nos
        "OLD", // New or Old
        "", // Valid upto if Renewal
        ""  // Submit Last Testing Report
    ]);

    const ws_data = [
        ["Trivedi & Associates Tecknical Services (P.) Ltd."],
        ["Jamnagar."],
        [],
        ["Subject : Testing & Certification"],
        [],
        header,
        ...body
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Merging cells for headers
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TP Certification List");
    XLSX.writeFile(wb, "TP_Certification_List.xlsx");
}

export function generateTpCertPdf(items: CertItem[]) {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Header section
    doc.setFontSize(10);
    doc.text("Trivedi & Associates Tecknical Services (P.) Ltd.", 14, 20);
    doc.text("Jamnagar.", 14, 25);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Subject : Testing & Certification", 14, 35);
    doc.setFont("helvetica", "normal");
    
    // Table
    const tableColumn = ["SR. No.", "Material Name", "Manufacturer Sr. No.", "Cap. in MT", "Qty in Nos", "New or Old", "Valid upto if Renewal", "Submit Last Testing Report (Form No.10/12/Any Other)"];
    const tableRows = items.map((item, index) => [
        index + 1,
        item.materialName,
        item.manufacturerSrNo,
        "",
        "",
        "OLD",
        "",
        ""
    ]);

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid'
    });

    // Footer section
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text("Company Authorised Contact Person", 200, finalY + 10);
    doc.text("Name : VIJAY SAI", 200, finalY + 15);
    doc.text("Contact Number : 919662095558", 200, finalY + 20);
    doc.text("Site : RELIANCE INDUSTRIES LTD", 200, finalY + 25);
    doc.text("email id: ariesril@ariesmar.com", 200, finalY + 30);
    doc.text('Note : For " New Materials only " Manufacturer Test Certificates submitted.', 14, finalY + 35);

    doc.save("TP_Certification_List.pdf");
}
