
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
    if (!response.ok) {
      console.error(`Failed to fetch image buffer: ${response.statusText} from ${url}`);
      return null;
    }
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error fetching image for Excel:', error);
    return null;
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
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
              dateKey = format(date, 'dd-MM-yyyy');
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

    // --- Header Logo ---
    try {
      const logoBuffer = await fetchImageAsBuffer('/images/Aries_logo.png');
      if (logoBuffer) {
        const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
        worksheet.addImage(logoId, {
          tl: { col: 0.2, row: 0.1 },
          ext: { width: 140, height: 35 },
        });
      }
    } catch (e) { console.error(e) }

    // --- Title ---
    worksheet.mergeCells('A1:L2');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'JOB MEASUREMENT SHEET';
    titleCell.font = { bold: true, size: 14, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    const infoData = [
        { label1: 'SITE', value1: 'RELIANCE INDUSTRIES LIMITED', label2: 'PLANT', value2: 'SEZ', label3: 'NAME OF THE CONTRACTOR:', value3: 'ARIES MARINE & ENGINEERING SERVICES Pvt. Ltd.' },
        { label1: 'DATE', value1: format(new Date(), 'dd.MM.yyyy'), label2: 'AREA', value2: 'VGO', label3: 'ARC/ OTC W.O.No.', value3: job.workOrderNo || '' },
        { label1: '', value1: '', label2: '', value2: '', label3: 'JMS NO.', value3: job.jmsNo || '' }
    ];
    
    infoData.forEach((d, i) => {
        const rowIndex = 4 + i;
        const row = worksheet.getRow(rowIndex);
        
        row.getCell(1).value = d.label1;
        row.getCell(2).value = d.value1;
        worksheet.mergeCells(rowIndex, 2, rowIndex, 3);
        
        row.getCell(4).value = d.label2;
        row.getCell(5).value = d.value2;
        
        row.getCell(6).value = d.label3;
        worksheet.mergeCells(rowIndex, 6, rowIndex, 9);
        
        row.getCell(10).value = d.value3;
        worksheet.mergeCells(rowIndex, 10, rowIndex, 12);
        
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = thinBorder;
            if ([1, 4, 6].includes(colNumber)) cell.font = boldFont;
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
    });

    // --- Details Subtitle ---
    const subtitleRowIndex = 7;
    worksheet.mergeCells(`A${subtitleRowIndex}:L${subtitleRowIndex}`);
    const subtitleCell = worksheet.getCell(`A${subtitleRowIndex}`);
    subtitleCell.value = 'DETAILS OF JOBS PERFORMED:';
    subtitleCell.font = boldFont;
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    subtitleCell.border = thinBorder;

    // --- Table Header ---
    const tableHeaderRowIndex = 8;
    worksheet.getRow(tableHeaderRowIndex).height = 25;
    const tableHeaderRow = worksheet.getRow(tableHeaderRowIndex);
    tableHeaderRow.values = ['Sr. No.', 'Service Code', 'Service Description', 'UOM', 'Qty Planned', 'Qty Executed', 'EIC Approved Qty', 'Work Permit No', 'PM Work Order No', 'Date Work Completed', 'Provision', 'Remarks (if any)'];
    tableHeaderRow.font = boldFont;
    tableHeaderRow.alignment = centerAlign;
    tableHeaderRow.eachCell(c => { 
        c.border = thinBorder; 
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } }; 
    });


    // --- Table Body ---
    const groupedItems = groupItemsForJms(data.sorItems || []);
    let currentRow = 9;
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
    let footerRowIndex = currentRow + 2;
    try {
      const footerImageBuffer = await fetchImageAsBuffer('/images/footer.png');
      if (footerImageBuffer) {
          const footerImageId = workbook.addImage({ buffer: footerImageBuffer, extension: 'png' });
          worksheet.addImage(footerImageId, {
              tl: { col: 0, row: footerRowIndex - 1 },
              ext: { width: 800, height: 100 }
          });
      }
    } catch (e) { console.error(e) }

    
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
            doc.addImage(headerImgDataUrl, 'PNG', margin, 15, pageWidth - (margin * 2), 65);
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('JOB MEASUREMENT SHEET', pageWidth / 2, 90, { align: 'center' });

        // FOOTER
        if (footerImgDataUrl) {
            const footerHeight = 100; 
            const footerY = pageHeight - margin - footerHeight;
            doc.addImage(footerImgDataUrl, 'PNG', margin, footerY, pageWidth - (margin * 2), footerHeight);
        }

        // Page number
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
    };

    // --- Info Body ---
    const infoBody = [
        [
            { content: 'SITE', styles: { fontStyle: 'bold' } }, 'RELIANCE INDUSTRIES LIMITED', 
            { content: 'PLANT', styles: { fontStyle: 'bold' } }, 'SEZ', 
            { content: 'NAME OF THE CONTRACTOR:', styles: { fontStyle: 'bold' } }, 'ARIES MARINE & ENGINEERING SERVICES Pvt. Ltd.'
        ],
        [
            { content: 'DATE', styles: { fontStyle: 'bold' } }, format(new Date(), 'dd.MM.yyyy'),
            { content: 'AREA', styles: { fontStyle: 'bold' } }, 'VGO',
            { content: 'ARC/ OTC W.O.No.', styles: { fontStyle: 'bold' } }, job.workOrderNo || ''
        ],
        [
            '', '', '', '', { content: 'JMS NO.', styles: { fontStyle: 'bold' } }, job.jmsNo || ''
        ]
    ];

    (doc as any).autoTable({
        body: infoBody,
        startY: 100,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.5, lineColor: [0, 0, 0], valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 140 },
            2: { cellWidth: 40 },
            3: { cellWidth: 60 },
            4: { cellWidth: 140 },
            5: { cellWidth: 'auto' },
        }
    });

    const jobDetailsY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DETAILS OF JOBS PERFORMED:", margin, jobDetailsY + 15);
    
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
            
            if (index === 0) {
                rowData.push({ content: srNo, rowSpan: groupSize });
            }
            
            rowData.push(
                item.serviceCode, 
                item.scopeDescription, 
                item.uom, 
                item.qtyPlanned, 
                item.qtyExecuted, 
                item.eicApprovedQty
            );

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
        startY: jobDetailsY + 20,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle', overflow: 'linebreak' },
        headStyles: { fontStyle: 'bold', fillColor: [217, 226, 243], textColor: 0, lineWidth: 0.5, lineColor: [0,0,0] },
        bodyStyles: { lineWidth: 0.5, lineColor: [0,0,0] },
        columnStyles: { 
          2: { halign: 'left', cellWidth: 'auto' },
        },
        margin: { bottom: 120 },
        didDrawPage: addPageLayout
    });
  
    doc.save(`JMS_${job.jmsNo || job.id.slice(-6)}.pdf`);
}
