
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
    const url = imgPath;
    try {
        const response = await fetch(url);
        if (!response.ok) {
             console.error(`Failed to fetch image: ${response.status} ${response.statusText} from ${url}`);
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
      let dateKey = 'Unscheduled';
      if (item.dateWorkCompleted) {
          const date = item.dateWorkCompleted instanceof Date ? item.dateWorkCompleted : parseISO(item.dateWorkCompleted as string);
          if (isValid(date)) {
              dateKey = format(date as Date, 'dd-MM-yyyy');
          }
      }
      
      const workPermitKey = item.workPermitNo || 'N/A';
      const pmWorkOrderKey = item.pmWorkOrderNo || 'N/A';
      const combinedKey = `${dateKey}|${workPermitKey}|${pmWorkOrderKey}`;

      if (!groupedByDate.has(combinedKey)) {
        groupedByDate.set(combinedKey, []);
      }
      groupedByDate.get(combinedKey)!.push(item);
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
    const leftAlign = { vertical: 'middle' as const, horizontal: 'left' as const, wrapText: true, indent: 1 };
    const boldFont = { bold: true, name: 'Calibri', size: 10 };

    // --- Header ---
    const headerBuffer = await fetchImageAsBuffer('/images/aries-header.png');
    if (headerBuffer) {
        const headerId = workbook.addImage({ buffer: headerBuffer, extension: 'png' });
        worksheet.mergeCells('A1:L3');
        worksheet.addImage(headerId, {
            tl: { col: 0, row: 0 },
            br: { col: 12, row: 3 }
        });
    }

    worksheet.mergeCells('A4:L4');
    const titleCell = worksheet.getCell('A4');
    titleCell.value = 'JOB MEASUREMENT SHEET';
    titleCell.font = { bold: true, size: 12, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center' };
    
    const infoData = [
        { A: 'SITE', B: 'RELIANCE INDUSTRIES LIMITED', D: 'PLANT', E: 'SEZ', F: 'NAME OF THE CONTRACTOR:', J: 'ARIES MARINE & ENGINEERING SERVICES Pvt. Ltd.' },
        { A: 'DATE', B: format(new Date(), 'dd.MM.yyyy'), D: 'AREA', E: 'VGO', F: 'ARC/ OTC W.O.No.', J: job.workOrderNo || '' },
        { A: '', B: '', D: '', E: '', F: '', J: job.jmsNo || '' }
    ];
    
    infoData.forEach((d, i) => {
        const row = worksheet.getRow(5 + i);
        row.getCell('A').value = d.A;
        row.getCell('A').font = boldFont;
        row.getCell('B').value = d.B;
        worksheet.mergeCells(5 + i, 2, 5 + i, 3);
        row.getCell('D').value = d.D;
        row.getCell('D').font = boldFont;
        row.getCell('E').value = d.E;
        row.getCell('F').value = d.F;
        row.getCell('F').font = boldFont;
        worksheet.mergeCells(5 + i, 6, 5 + i, 9);
        row.getCell('J').value = d.J;
        worksheet.mergeCells(5 + i, 10, 5 + i, 12);
        
        row.eachCell(c => { c.border = thinBorder; });
    });

    worksheet.mergeCells('A8:L8');
    worksheet.getCell('A8').value = 'DETAILS OF JOBS PERFORMED:';
    worksheet.getCell('A8').font = boldFont;


    // --- Table Header ---
    worksheet.getRow(9).height = 20;
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
            const dateWorkCompleted = item.dateWorkCompleted
            ? (item.dateWorkCompleted instanceof Date ? item.dateWorkCompleted : parseISO(item.dateWorkCompleted as string))
            : null;
            const row = worksheet.getRow(currentRow);
            row.values = [
                srNo,
                item.serviceCode,
                item.scopeDescription,
                item.uom,
                item.qtyPlanned,
                item.qtyExecuted,
                item.eicApprovedQty,
                item.workPermitNo,
                item.pmWorkOrderNo,
                dateWorkCompleted && isValid(dateWorkCompleted) ? format(dateWorkCompleted, 'dd-MM-yyyy') : '',
                item.provision,
                item.remarks
            ];
            row.eachCell(c => { c.border = thinBorder; c.alignment = centerAlign; });
            row.getCell(3).alignment = leftAlign;
            currentRow++;
        });
        
        const groupSize = group.length;
        if (groupSize > 1) {
            worksheet.mergeCells(groupStartRow, 1, groupStartRow + groupSize - 1, 1); // Sr No
            worksheet.mergeCells(groupStartRow, 8, groupStartRow + groupSize - 1, 8); // Work Permit
            worksheet.mergeCells(groupStartRow, 9, groupStartRow + groupSize - 1, 9); // PM Work Order
            worksheet.mergeCells(groupStartRow, 10, groupStartRow + groupSize - 1, 10); // Date
        }
        worksheet.getCell(groupStartRow, 1).value = srNo;
        worksheet.getCell(groupStartRow, 8).value = group[0].workPermitNo || '';
        worksheet.getCell(groupStartRow, 9).value = group[0].pmWorkOrderNo || '';
        const groupDate = group[0].dateWorkCompleted ? (group[0].dateWorkCompleted instanceof Date ? group[0].dateWorkCompleted : parseISO(group[0].dateWorkCompleted as string)) : null;
        worksheet.getCell(groupStartRow, 10).value = groupDate && isValid(groupDate) ? format(groupDate, 'dd-MM-yyyy') : '';
        srNo++;
    });
    
    // --- Footer ---
    let footerRowIndex = worksheet.lastRow ? worksheet.lastRow.number + 2 : currentRow + 2;

    const footerImageBuffer = await fetchImageAsBuffer('/images/footer.png');
    if (footerImageBuffer) {
        const footerImageId = workbook.addImage({ buffer: footerImageBuffer, extension: 'png' });
        worksheet.mergeCells(footerRowIndex, 1, footerRowIndex + 5, 12);
        worksheet.addImage(footerImageId, {
            tl: { col: 0, row: footerRowIndex - 1 },
            br: { col: 12, row: footerRowIndex + 5 }
        });
    }

    
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    const headerImagePath = '/images/aries-header.png';
    const footerImagePath = '/images/footer.png';

    const headerImgDataUrl = await fetchImageAsBase64(headerImagePath);
    const footerImgDataUrl = await fetchImageAsBase64(footerImagePath);

    const addPageLayout = (data: any) => {
        // HEADER
        if (headerImgDataUrl) {
            doc.addImage(headerImgDataUrl, 'PNG', margin, 20, pageWidth - (margin * 2), 60);
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('JOB MEASUREMENT SHEET', pageWidth / 2, 95, { align: 'center' });

        // FOOTER
        if (footerImgDataUrl) {
            const footerHeight = 110; 
            const footerY = pageHeight - margin - footerHeight;
             if (data.pageNumber > 1 && data.cursor.y > footerY) {
                // If content overflows, footer might be drawn on top.
                // This is a basic check.
            } else {
                doc.addImage(footerImgDataUrl, 'PNG', margin, footerY, pageWidth - (margin * 2), footerHeight);
            }
        }

        // Page number
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
    };

    // --- Info Boxes ---
    const infoStartY = 110;
    
    (doc as any).autoTable({
        startY: infoStartY,
        body: [
            [
                { content: `SITE: RELIANCE INDUSTRIES LIMITED\nDATE: ${format(new Date(), 'dd.MM.yyyy')}`, styles: { cellWidth: 200 } },
                { content: `PLANT: SEZ\nAREA: VGO`, styles: { cellWidth: 150 } },
                { content: `NAME OF THE CONTRACTOR: ARIES MARINE & ENGINEERING SERVICES Pvt. Ltd.\nARC/ OTC W.O.No.: ${job.workOrderNo || ''}\nJMS# ${job.jmsNo || ''}`, styles: { cellWidth: 'auto' } }
            ]
        ],
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 2, lineWidth: 0.5, lineColor: [100,100,100] },
        didDrawCell: (data: any) => doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height)
    });

    const jobDetailsY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAILS OF JOBS PERFORMED:', margin, jobDetailsY);
    
    // --- Table ---
    const head = [
      ["SR. No.", "Service Code", "Service Description", "UOM", "Qty Planned", "Qty Executed", "EIC Approved Qty", "Work Permit No", "PM Work Order No", "Date Work Completed", "Provision", "Remarks (if any)"]
    ];
    
    const body: any[] = [];
    let srNo = 1;
    const groupedItems = groupItemsForJms(data.sorItems || []);
    
    groupedItems.forEach(group => {
        const groupSize = group.length;
        group.forEach((item, index) => {
            const dateWorkCompleted = item.dateWorkCompleted ? (item.dateWorkCompleted instanceof Date ? item.dateWorkCompleted : parseISO(item.dateWorkCompleted as string)) : null;

            const rowData: any[] = [];
            
            if (index === 0) rowData.push({ content: srNo, rowSpan: groupSize });
            rowData.push(item.serviceCode, item.scopeDescription, item.uom, item.qtyPlanned, item.qtyExecuted, item.eicApprovedQty);
            if (index === 0) {
                rowData.push({ content: item.workPermitNo || '', rowSpan: groupSize });
                rowData.push({ content: item.pmWorkOrderNo || '', rowSpan: groupSize });
                rowData.push({ content: dateWorkCompleted && isValid(dateWorkCompleted) ? format(dateWorkCompleted, 'dd-MM-yyyy') : '', rowSpan: groupSize });
            }
            rowData.push(item.provision || '');
            rowData.push(item.remarks || '');
            
            body.push(rowData);
        });
        srNo++;
    });

    (doc as any).autoTable({
        head: head,
        body: body,
        startY: jobDetailsY + 10,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle', overflow: 'linebreak' },
        headStyles: { fontStyle: 'bold', fillColor: [217, 226, 243], textColor: 0, lineWidth: 0.5, lineColor: [0,0,0] },
        bodyStyles: { lineWidth: 0.5, lineColor: [0,0,0] },
        columnStyles: { 
          2: { halign: 'left', cellWidth: 'auto' },
        },
        didDrawPage: addPageLayout
    });
  
    doc.save(`JMS_${job.jmsNo || job.id.slice(-6)}.pdf`);
}
