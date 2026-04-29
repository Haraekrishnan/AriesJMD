'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { JobProgress, SorItem } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';

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

const groupItemsForJms = (items: SorItem[]) => {
    const groupedByDate = new Map<string, SorItem[]>();
  
    items.forEach(item => {
      const dateKey = item.dateWorkCompleted ? format(parseISO(item.dateWorkCompleted as string), 'dd-MM-yyyy') : 'Unscheduled';
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(item);
    });
  
    return Array.from(groupedByDate.values());
};

export async function generateJmsSheetExcel(job: JobProgress, data: { sorItems?: SorItem[] }) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('JMS');

    // --- Page Setup ---
    worksheet.pageSetup.orientation = 'landscape';
    worksheet.pageSetup.paperSize = 9; // A4
    worksheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };
    
    // --- Styles ---
    const thinBorder = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };
    const centerAlign = { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true };
    const leftAlign = { vertical: 'middle' as const, horizontal: 'left' as const, wrapText: true };
    const boldFont = { bold: true, name: 'Calibri', size: 10 };

    // --- Header ---
    worksheet.mergeCells('D1:I1');
    const titleCell = worksheet.getCell('D1');
    titleCell.value = 'RELIANCE INDUSTRIES LIMITED';
    titleCell.font = { bold: true, size: 14, underline: true, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('D2:I2');
    const subtitleCell = worksheet.getCell('D2');
    subtitleCell.value = 'JOB MEASUREMENT SHEET';
    subtitleCell.font = { bold: true, size: 12, name: 'Calibri' };
    subtitleCell.alignment = { horizontal: 'center' };
    
    const infoData = [
        { A: 'SITE', B: 'RELIANCE INDUSTRIES LIMITED', D: 'PLANT', E: 'SEZ', F: 'NAME OF THE CONTRACTOR:', J: 'ARIES MARINE & ENGINEERING SERVICES Pvt. Ltd.' },
        { A: 'DATE', B: format(new Date(), 'dd.MM.yyyy'), D: 'AREA', E: 'VGO', F: 'ARC/ OTC W.O.No.', J: job.workOrderNo || '' },
        { A: '', B: '', D: '', E: '', F: '', J: job.jmsNo || '' }
    ];
    
    infoData.forEach((d, i) => {
        const row = worksheet.getRow(4 + i);
        row.getCell('A').value = d.A;
        row.getCell('A').font = boldFont;
        row.getCell('B').value = d.B;
        worksheet.mergeCells(4 + i, 2, 4 + i, 3);
        row.getCell('D').value = d.D;
        row.getCell('D').font = boldFont;
        row.getCell('E').value = d.E;
        row.getCell('F').value = d.F;
        row.getCell('F').font = boldFont;
        worksheet.mergeCells(4 + i, 6, 4 + i, 9);
        row.getCell('J').value = d.J;
        worksheet.mergeCells(4 + i, 10, 4 + i, 12);
        
        row.eachCell(c => { c.border = thinBorder; });
    });

    worksheet.mergeCells('A7:L7');
    worksheet.getCell('A7').value = 'DETAILS OF JOBS PERFORMED:';
    worksheet.getCell('A7').font = boldFont;


    // --- Table Header ---
    worksheet.getRow(8).height = 20;
    const tableHeaderRow = worksheet.getRow(9);
    tableHeaderRow.values = ['Sr. No.', 'Service Code', 'Service Description', 'UOM', 'Qty Planned', 'Qty Executed', 'EIC Approved Qty', 'Work Permit No', 'PM Work Order No', 'Date Work Completed', 'Provision', 'Remarks (if any)'];
    tableHeaderRow.font = boldFont;
    tableHeaderRow.alignment = centerAlign;
    tableHeaderRow.eachCell(c => { c.border = thinBorder; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } }; });


    // --- Table Body ---
    const groupedItems = groupItemsForJms(data.sorItems || []);
    let currentRow = 10;
    let srNo = 1;
    groupedItems.forEach(group => {
        const groupStartRow = currentRow;
        group.forEach(item => {
            const row = worksheet.getRow(currentRow);
            row.values = [
                srNo++,
                item.serviceCode,
                item.scopeDescription,
                item.uom,
                item.qtyPlanned,
                item.qtyExecuted,
                item.eicApprovedQty,
                item.workPermitNo,
                item.pmWorkOrderNo,
                item.dateWorkCompleted ? format(parseISO(item.dateWorkCompleted as string), 'dd-MM-yyyy') : '',
                item.provision,
                item.remarks
            ];
            row.eachCell(c => { c.border = thinBorder; c.alignment = centerAlign; });
            row.getCell(3).alignment = leftAlign;
            currentRow++;
        });

        const groupSize = group.length;
        if (groupSize > 1) {
            worksheet.mergeCells(groupStartRow, 8, groupStartRow + groupSize - 1, 8); // Work Permit
            worksheet.mergeCells(groupStartRow, 9, groupStartRow + groupSize - 1, 9); // PM Work Order
            worksheet.mergeCells(groupStartRow, 10, groupStartRow + groupSize - 1, 10); // Date
        }
        worksheet.getCell(groupStartRow, 8).value = group[0].workPermitNo || '';
        worksheet.getCell(groupStartRow, 9).value = group[0].pmWorkOrderNo || '';
        worksheet.getCell(groupStartRow, 10).value = group[0].dateWorkCompleted ? format(parseISO(group[0].dateWorkCompleted as string), 'dd-MM-yyyy') : '';
    });
    
    // --- Footer ---
    currentRow += 2;
    const footerHeader = worksheet.getRow(currentRow);
    footerHeader.getCell(1).value = 'Cont. Supervisor Name & Sign:';
    footerHeader.getCell(1).font = boldFont;
    worksheet.mergeCells(currentRow, 2, currentRow, 4);
    worksheet.getCell(2).border = thinBorder;
    
    currentRow += 2;
    const perfHeader = worksheet.getRow(currentRow);
    worksheet.mergeCells(currentRow, 1, currentRow, 12);
    perfHeader.getCell(1).value = 'JOB EXECUTION PERFORMANCE RECORD (EIC to kindly tick on relevant box):';
    perfHeader.getCell(1).font = boldFont;

    const perfItems = [
        '1. The safety awareness and demonstrated by the persons deployed by the contractor',
        '2. The jobs performed by the above contractor as detailed above is',
        '3. The training/skill levis of the persons deployed by the contractor for the above jobs',
        '4. The time taken by the contractor for the above jobs',
        '5. The tools/tackles provided & used by the persons deployed by the contractor'
    ];
    
    perfItems.forEach((item) => {
        currentRow++;
        const row = worksheet.getRow(currentRow);
        worksheet.mergeCells(currentRow, 1, currentRow, 7);
        row.getCell(1).value = item;
        worksheet.mergeCells(currentRow, 8, currentRow, 9);
        row.getCell(8).value = 'Satisfactory';
        row.getCell(8).border = thinBorder;
        worksheet.mergeCells(currentRow, 10, currentRow, 11);
        row.getCell(10).value = 'Not Satisfactory';
        row.getCell(10).border = thinBorder;
    });

    currentRow += 2;
    const eicSignRow = worksheet.getRow(currentRow);
    eicSignRow.getCell(1).value = 'RIL EIC Name, Sign & Date';
    eicSignRow.getCell(1).font = boldFont;
    worksheet.mergeCells(currentRow, 2, currentRow, 4);
    eicSignRow.getCell(2).border = thinBorder;
    
    // --- Column Widths ---
    worksheet.columns = [
        { width: 8 }, { width: 15 }, { width: 50 }, { width: 8 }, { width: 12 }, { width: 12 },
        { width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 25 }, { width: 25 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JMS_${job.jmsNo || job.id.slice(-6)}.xlsx`);
}

export async function generateJmsSheetPdf(job: JobProgress, data: { sorItems?: SorItem[] }) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // --- Header ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RELIANCE INDUSTRIES LIMITED', pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.setLineHeightFactor(1.5);
    doc.text('JOB MEASUREMENT SHEET', pageWidth / 2, 45, { align: 'center' });

    // --- Info Boxes ---
    const infoStartY = 60;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('SITE', margin, infoStartY);
    doc.text('DATE', margin, infoStartY + 15);
    doc.text(': RELIANCE INDUSTRIES LIMITED', margin + 30, infoStartY);
    doc.text(`: ${format(new Date(), 'dd.MM.yyyy')}`, margin + 30, infoStartY + 15);

    doc.text('PLANT', margin + 200, infoStartY);
    doc.text('AREA', margin + 200, infoStartY + 15);
    doc.text(': SEZ', margin + 230, infoStartY);
    doc.text(': VGO', margin + 230, infoStartY + 15);
    
    doc.text('NAME OF THE CONTRACTOR:', margin + 350, infoStartY);
    doc.text('ARC/ OTC W.O.No.', margin + 350, infoStartY + 15);
    doc.text(': ARIES MARINE & ENGINEERING SERVICES Pvt. Ltd.', margin + 490, infoStartY);
    doc.text(`: ${job.workOrderNo || ''}`, margin + 490, infoStartY + 15);
    doc.text(`: ${job.jmsNo || ''}`, margin + 490, infoStartY + 30);


    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILS OF JOBS PERFORMED:', margin, infoStartY + 50);

    // --- Table ---
    const head = [['Sr. No.', 'Service Code', 'Service Description', 'UOM', 'Qty Planned', 'Qty Executed', 'EIC Approved Qty', 'Work Permit No', 'PM Work Order No', 'Date Work Completed', 'Provision', 'Remarks']];
    
    const body: any[] = [];
    let srNo = 1;
    const groupedItems = groupItemsForJms(data.sorItems || []);
    
    for (const group of groupedItems) {
        group.forEach((item, index) => {
            const rowData: (string | { content: string | number, rowSpan: number } )[] = [];
            if (index === 0) {
                rowData.push({ content: srNo, rowSpan: group.length });
            }
            rowData.push(
                item.serviceCode,
                item.scopeDescription,
                item.uom,
                String(item.qtyPlanned || 0),
                String(item.qtyExecuted || 0),
                String(item.eicApprovedQty || 0)
            );
            if (index === 0) {
                rowData.push({ content: item.workPermitNo || '', rowSpan: group.length });
                rowData.push({ content: item.pmWorkOrderNo || '', rowSpan: group.length });
                rowData.push({ content: item.dateWorkCompleted ? format(parseISO(item.dateWorkCompleted as string), 'dd-MM-yyyy') : '', rowSpan: group.length });
            }
            rowData.push(item.provision || '');
            rowData.push(item.remarks || '');
            body.push(rowData);
        });
        srNo++;
    }

    doc.autoTable({
        head: head,
        body: body,
        startY: infoStartY + 60,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [217, 226, 243] },
        columnStyles: { 2: { halign: 'left' } }
    });

    // --- Footer ---
    let finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(9);
    doc.text('Cont. Supervisor Name & Sign:', margin, finalY);
    doc.rect(margin + 150, finalY - 8, 200, 15);

    finalY += 30;
    doc.setFont('helvetica', 'bold');
    doc.text('JOB EXECUTION PERFORMANCE RECORD (EIC to kindly tick on relevant box):', margin, finalY);

    const perfItems = [
        '1. The safety awareness and demonstrated by the persons deployed by the contractor',
        '2. The jobs performed by the above contractor as detailed above is',
        '3. The training/skill levis of the persons deployed by the contractor for the above jobs',
        '4. The time taken by the contractor for the above jobs',
        '5. The tools/tackles provided & used by the persons deployed by the contractor'
    ];

    perfItems.forEach((item, index) => {
        finalY += 20;
        doc.setFont('helvetica', 'normal');
        doc.text(item, margin, finalY);
        doc.rect(margin + 450, finalY - 8, 100, 15);
        doc.text('Satisfactory', margin + 455, finalY - 1);
        doc.rect(margin + 560, finalY - 8, 100, 15);
        doc.text('Not Satisfactory', margin + 565, finalY - 1);
    });

    finalY += 30;
    doc.setFont('helvetica', 'bold');
    doc.text('RIL EIC Name, Sign & Date', margin, finalY);
    doc.rect(margin + 150, finalY - 8, 200, 15);

    doc.save(`JMS_${job.jmsNo || job.id.slice(-6)}.pdf`);
}
