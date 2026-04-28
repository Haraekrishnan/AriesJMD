'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { JobProgress, SorItem } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';

interface AbstractSheetData {
  plantRegNo?: string;
  arcOtcWoNo?: string;
  ariesJobId?: string;
  sorItems: SorItem[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error fetching image for Excel:', error);
      return null;
    }
}

async function fetchImageAsBase64(imgPath: string): Promise<string> {
    const url = imgPath.startsWith('/') ? `${window.location.origin}${imgPath}` : imgPath;
    try {
        const response = await fetch(url);
        if (!response.ok) {
             console.error(`Failed to fetch image: ${response.statusText} from ${url}`);
             return '';
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error fetching image for PDF:', error);
        return '';
    }
}

const formatDateValue = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return '';
    if (dateValue instanceof Date) {
        return isValid(dateValue) ? format(dateValue, 'dd MMMM yyyy') : '';
    }
    if (typeof dateValue === 'string') {
        const parsed = parseISO(dateValue);
        return isValid(parsed) ? format(parsed, 'dd MMMM yyyy') : '';
    }
    return '';
};

export async function generateAbstractSheetExcel(job: JobProgress, data: AbstractSheetData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Abstract Sheet');

    // --- Styles ---
    const centerAlign = { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true };
    const leftAlign = { vertical: 'middle' as const, horizontal: 'left' as const, wrapText: true, indent: 1 };
    const rightAlign = { vertical: 'middle' as const, horizontal: 'right' as const, wrapText: true };
    const thinBorder = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };

    // --- Logo and Header ---
    const logoBuffer = await fetchImageAsBuffer('/images/Aries_logo.png');
    if (logoBuffer) {
        const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
        worksheet.addImage(logoId, {
            tl: { col: 0.1, row: 0.2 },
            ext: { width: 180, height: 45 }
        });
    }

    const headerLines = [
        "CIN No: U74140KL2013PTC034674",
        "BCG Tower, Opp. CSEZ, Seaport Airport Road, Kakkanad, Cochin - 682037",
        "Ph: +91 484 4081555 Fax: +91 484 4055561",
        "Email: ariesindia@ariesmar.com Web: www.ariesmar.com"
    ];

    let currentHeaderRow = 1;
    headerLines.forEach(line => {
      worksheet.mergeCells(currentHeaderRow, 5, currentHeaderRow, 9);
      const cell = worksheet.getCell(currentHeaderRow, 5);
      cell.value = line;
      cell.font = { size: 8 };
      cell.alignment = rightAlign;
      currentHeaderRow++;
    });

    // --- Title ---
    let currentRow = 6;
    worksheet.mergeCells(currentRow, 1, currentRow, 9);
    const titleCell = worksheet.getCell(currentRow, 1);
    titleCell.value = 'ABSTRACT SHEET';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = centerAlign;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    titleCell.border = thinBorder;
    worksheet.getRow(currentRow).height = 20;

    // --- Info Blocks ---
    currentRow++;
    const duration = job.dateFrom ? formatDateValue(job.dateFrom) : '';
    const infoData = [
        ['Plant/Unit', job.plantUnit || '', 'Date', format(new Date(), 'dd.MM.yyyy')],
        ['Plant Reg No.', job.plantRegNo || '', 'ARC/ OTC W.O.No.', job.workOrderNo || ''],
        ['Duration of the job', duration, 'JMS#', job.jmsNo || ''],
        ['SOR Type', job.title || '']
    ];

    infoData.forEach(rowData => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = rowData[0];
        row.getCell(3).value = rowData[1];
        if (rowData[2]) {
            row.getCell(6).value = rowData[2];
            row.getCell(8).value = rowData[3];
        }
        
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber === 1 || colNumber === 6) cell.font = { bold: true };
            cell.border = thinBorder;
            cell.alignment = leftAlign;
        });
        
        worksheet.mergeCells(currentRow, 1, currentRow, 2);
        worksheet.mergeCells(currentRow, 3, currentRow, 5);
        if (rowData[2]) {
          worksheet.mergeCells(currentRow, 6, currentRow, 7);
          worksheet.mergeCells(currentRow, 8, currentRow, 9);
        } else {
          worksheet.mergeCells(currentRow, 6, currentRow, 9);
        }
        currentRow++;
    });
    
    // --- Table Header ---
    const tableHeaderRow = worksheet.getRow(currentRow);
    tableHeaderRow.values = ['Aries Job#', 'RIL Approved Quantity', 'Item Code', 'Scope Description', 'UOM', 'Unit Rate', 'Total Amount'];
    
    worksheet.mergeCells(currentRow, 1, currentRow, 2);
    worksheet.mergeCells(currentRow, 4, currentRow, 5);

    tableHeaderRow.eachCell({ includeEmpty: true }, cell => {
        cell.font = { bold: true };
        cell.alignment = centerAlign;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
        cell.border = thinBorder;
    });
    currentRow++;

    // --- Table Body ---
    let grandTotal = 0;
    (data.sorItems || []).forEach(item => {
        const totalAmount = (item.eicApprovedQty || 0) * (item.rate || 0);
        grandTotal += totalAmount;

        const itemRow = worksheet.getRow(currentRow);
        itemRow.values = [
            job.ariesJobId || '', '',
            item.serviceCode,
            item.scopeDescription, '',
            item.uom,
            item.rate,
            totalAmount
        ];
        worksheet.mergeCells(currentRow, 1, currentRow, 2);
        worksheet.mergeCells(currentRow, 4, currentRow, 5);
        worksheet.mergeCells(currentRow, 7, currentRow, 8); // Merge rate
        worksheet.mergeCells(currentRow, 9, currentRow, 9); // Total Amount now at I

        itemRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = thinBorder;
            cell.alignment = { ...leftAlign, wrapText: true };
        });

        itemRow.getCell(3).alignment = centerAlign;
        itemRow.getCell(6).alignment = centerAlign;
        itemRow.getCell(7).alignment = { ...rightAlign, wrapText: true };
        itemRow.getCell(7).numFmt = '"₹" #,##0.00';
        itemRow.getCell(9).alignment = { ...rightAlign, wrapText: true };
        itemRow.getCell(9).numFmt = '"₹" #,##0.00';
        itemRow.height = 40;
        currentRow++;
    });

    // --- Grand Total ---
    const grandTotalRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 8);
    const totalLabelCell = grandTotalRow.getCell(1);
    const totalValueCell = grandTotalRow.getCell(9);
    totalLabelCell.value = 'Grand Total';
    totalLabelCell.alignment = rightAlign;
    totalLabelCell.font = { bold: true };
    totalValueCell.value = grandTotal;
    totalValueCell.numFmt = '"₹" #,##0.00';
    totalValueCell.font = { bold: true };
    grandTotalRow.eachCell({ includeEmpty: true }, c => c.border = thinBorder);
    
    // --- Signature Footer ---
    currentRow += 2;
    const signatureRow = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    worksheet.mergeCells(currentRow, 5, currentRow, 9);
    signatureRow.getCell(1).value = 'Aries Rep. Sign/Stamp';
    signatureRow.getCell(5).value = 'RIL EIC / HOD. Sign/Stamp';
    signatureRow.eachCell({ includeEmpty: true }, cell => {
      cell.border = { top: { style: 'thin' } };
      cell.font = { bold: true };
    });
    signatureRow.height = 50;

    // --- Column Widths ---
    worksheet.columns = [
        { width: 10 }, { width: 10 }, { width: 15 }, 
        { width: 25 }, { width: 25 }, { width: 10 }, 
        { width: 15 }, { width: 15 }, { width: 15 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Abstract_Sheet_${job.jmsNo || job.id.slice(-6)}.xlsx`);
}

export async function generateAbstractSheetPdf(job: JobProgress, data: AbstractSheetData) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 30;

    // --- Logo and Header ---
    const headerImagePath = '/images/Aries_logo.png';
    const imgDataUrl = await fetchImageAsBase64(headerImagePath);
    if (imgDataUrl) {
      doc.addImage(imgDataUrl, 'PNG', margin, 20, 180, 45);
    }
  
    const headerLines = [
      "CIN No: U74140KL2013PTC034674",
      "BCG Tower, Opp. CSEZ, Seaport Airport Road, Kakkanad, Cochin - 682037",
      "Ph: +91 484 4081555 Fax: +91 484 4055561",
      "Email: ariesindia@ariesmar.com Web: www.ariesmar.com"
    ];
    doc.setFontSize(8);
    doc.text(headerLines, pageWidth - margin, 30, { align: 'right' });

    // --- Title ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(217, 217, 217);
    doc.rect(margin, 70, pageWidth - (margin * 2), 25, 'F');
    doc.text('ABSTRACT SHEET', pageWidth / 2, 85, { align: 'center' });

    // --- Info Blocks ---
    const duration = job.dateFrom ? formatDateValue(job.dateFrom) : '';
    const leftInfo = [
        { title: 'Plant/Unit', value: job.plantUnit || '' },
        { title: 'Plant Reg No.', value: job.plantRegNo || '' },
        { title: 'Duration of the job', value: duration },
        { title: 'SOR Type', value: job.title || '' }
    ];
    const rightInfo = [
        { title: 'Date', value: format(new Date(), 'dd.MM.yyyy') },
        { title: 'ARC/ OTC W.O.No.', value: job.workOrderNo || '' },
        { title: 'JMS#', value: job.jmsNo || '' }
    ];

    (doc as any).autoTable({
        startY: 100,
        body: [
            [{
                content: {
                    body: leftInfo.map(i => [i.title, i.value]),
                    styles: { cellPadding: 2, fontSize: 9 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { cellWidth: 200 } }
                },
                styles: { cellWidth: 300 }
            },
            {
                content: {
                    body: rightInfo.map(i => [i.title, i.value]),
                    styles: { cellPadding: 2, fontSize: 9 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { cellWidth: 150 } }
                },
                styles: { cellWidth: 250 }
            }]
        ],
        theme: 'plain',
        didDrawCell: (data: any) => {
          if (data.cell.section === 'body' && data.table.body.length) {
              data.cell.styles.lineWidth = 0.5;
              data.cell.styles.lineColor = [0,0,0];
          }
        }
    });

    // --- Main Table ---
    const grandTotal = (data.sorItems || []).reduce((acc, item) => acc + (item.eicApprovedQty || 0) * (item.rate || 0), 0);
    (doc as any).autoTable({
        head: [['Aries Job#', 'RIL Approved\nQuantity', 'Item Code', 'Scope Description', 'UOM', 'Unit Rate', 'Total Amount']],
        body: (data.sorItems || []).map(item => [
            job.ariesJobId || '',
            item.eicApprovedQty || 0,
            item.serviceCode,
            item.scopeDescription,
            item.uom,
            { content: formatCurrency(item.rate || 0), styles: { halign: 'right' } },
            { content: formatCurrency((item.eicApprovedQty || 0) * (item.rate || 0)), styles: { halign: 'right' } }
        ]),
        foot: [
            [{ content: 'Grand Total', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(grandTotal), styles: { halign: 'right', fontStyle: 'bold' } }]
        ],
        startY: (doc as any).lastAutoTable.finalY + 5,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        headStyles: { fontStyle: 'bold', fillColor: [217, 217, 217], textColor: 0, halign: 'center' },
        footStyles: { fontStyle: 'bold', fillColor: [217, 217, 217], textColor: 0 },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 70, halign: 'center' },
            2: { cellWidth: 70 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 40, halign: 'center' },
            5: { cellWidth: 70, halign: 'right' },
            6: { cellWidth: 70, halign: 'right' },
        }
    });

    // --- Signature Footer ---
    (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        body: [['Aries Rep. Sign/Stamp', 'RIL EIC / HOD. Sign/Stamp']],
        theme: 'grid',
        styles: { fontSize: 10, fontStyle: 'bold', cellPadding: 25, valign: 'bottom' }
    });

    doc.save(`Abstract_Sheet_${job.jmsNo || job.id.slice(-6)}.pdf`);
}
