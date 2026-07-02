'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Helper to fetch image as Base64 for PDF
async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Logo not found at ' + url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image for PDF:', error);
    return ''; // Return empty string on failure
  }
}

export async function generateSchedulePdf(
  schedule: JobSchedule | undefined,
  scheduleDate: Date,
  reportDate: Date,
  schedulerName: string,
  userSignature?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const formattedScheduleDate = format(scheduleDate, 'dd-MM-yyyy');
  const formattedReportDate = format(reportDate, 'dd-MM-yyyy');
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');

  const headRow = [
    'Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name",
    'Location', 'Reporting Time', 'Client / Contact Person Number', 'Vehicle', 'Special instruction/Remarks',
  ];

  const bodyRows = (schedule?.items || []).map((item, i) => [
    i + 1,
    item.manpowerIds, // Array of "Name (Trade)" strings
    item.jobType || '',
    item.jobNo || '',
    item.projectVesselName || '',
    item.location || '',
    item.reportingTime || '',
    item.clientContact || '',
    item.vehicleId && item.vehicleId !== 'none' ? item.vehicleId : 'N/A',
    item.remarks || '',
  ]);

  const margin = 28;
  const usableWidth = pageWidth - margin * 2;
  const headerBoxHeight = 42;
  const headerStartY = margin;
  const headerBottomY = headerStartY + headerBoxHeight;
  const tableStartY = headerBottomY;

  // ---------- DYNAMIC TABLE SCALING ----------
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const footerReserve = 100;
  const headerReserve = headerBoxHeight + margin + 10;
  
  const availableTableHeight =
    pageHeight - headerReserve - footerReserve;
  
  // Base values for scaling
  let fontSize = 6;
  let cellPadding = 2;
  
  // Estimate height based on total line count (approximate for wrapping)
  const estimateTableHeight = (font: number, padding: number) => {
    const headerH = font * 1.5 + padding * 2;
    // We estimate each row needs about 1-2 lines on average with commas
    return headerH + (bodyRows.length * (font * 2.5 + padding * 2));
  };
  
  let estimatedTableHeight = estimateTableHeight(fontSize, cellPadding);
  
  while (estimatedTableHeight > availableTableHeight && fontSize > 4.2) {
    fontSize -= 0.1;
    cellPadding = Math.max(0.8, cellPadding - 0.1);
    estimatedTableHeight = estimateTableHeight(fontSize, cellPadding);
  }

  doc.autoTable({
    startY: tableStartY,
    tableWidth: usableWidth,
    margin: {
        left: margin,
        right: margin,
        top: tableStartY,
    },

    pageBreak: 'auto',
    rowPageBreak: 'avoid',

    head: [headRow],
    body: bodyRows,

    theme: 'grid',

    styles: {
        fontSize,
        cellPadding,
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'middle',
    },

    headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: fontSize + 0.5,
    },

    columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 120 }, // Name column
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 75 },
        5: { cellWidth: 50 },
        6: { cellWidth: 40, halign: 'center' },
        7: { cellWidth: 60 },
        8: { cellWidth: 35, halign: 'center' },
        9: { cellWidth: usableWidth - 470 },
    },

    // 1. Calculate required height for the wrapped names
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        const rawNames = Array.isArray(data.cell.raw) ? data.cell.raw : [String(data.cell.raw)];
        
        // Build the full string to estimate wrapped line count
        const namesOnly = rawNames.map(rn => {
           const match = rn.match(/^(.*)\s\((.*)\)$/);
           return match ? match[1].trim() : rn.trim();
        });
        
        const fullString = namesOnly.join(', ');
        const padding = data.cell.padding('left') + data.cell.padding('right');
        const maxWidth = data.column.width - padding;
        
        const currentDoc = data.doc;
        currentDoc.setFontSize(data.cell.styles.fontSize);
        const splitText = currentDoc.splitTextToSize(fullString, maxWidth);
        const lineCount = splitText.length;
        
        const lineHeight = data.cell.styles.fontSize * 1.4;
        const cellPaddingY = data.cell.padding('top') + data.cell.padding('bottom');
        const minHeight = lineCount * lineHeight + cellPaddingY;
        
        if (data.row.height < minHeight) {
          data.row.height = minHeight;
        }
      }
    },

    // 2. Prevent default text drawing for Name column
    willDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        data.cell.text = [];
      }
    },

    // 3. Draw custom formatted text with inline wrapping and role-based styling
    didDrawCell: (data: any) => {
      if (data.section !== 'body' || data.column.index !== 1) return;

      const rawNames = Array.isArray(data.cell.raw)
        ? data.cell.raw
        : [String(data.cell.raw)];
        
      // Parse and sort
      const parsed = rawNames.map(rn => {
          const match = rn.match(/^(.*)\s\((.*)\)$/);
          if (match) {
              return { name: match[1].trim(), trade: match[2].trim() };
          }
          return { name: rn.trim(), trade: '' };
      });

      parsed.sort((a, b) => {
          const getRank = (trade: string) => {
              if (/RA\s*Level\s*3/i.test(trade)) return 0;
              if (/Supervisor|HSE|Safety|Admin|Manager|Coordinator/i.test(trade)) return 2;
              return 1;
          };
          return getRank(a.trade) - getRank(b.trade);
      });

      const currentDoc = data.doc;
      const paddingLeft = data.cell.padding('left');
      const paddingTop = data.cell.padding('top');
      const startX = data.cell.x + paddingLeft;
      const startY = data.cell.y + paddingTop + data.cell.styles.fontSize;
      const maxWidth = data.cell.width - paddingLeft - data.cell.padding('right');

      let cursorX = startX;
      let cursorY = startY;
      const fontSize = data.cell.styles.fontSize;
      const lineHeight = fontSize * 1.2;
      const separator = ", ";

      currentDoc.setFontSize(fontSize);

      parsed.forEach((item, idx) => {
        const isLast = idx === parsed.length - 1;
        const isRA3 = /RA\s*Level\s*3/i.test(item.trade);
        const isSupervisor = /Supervisor|HSE|Safety|Admin|Manager|Coordinator/i.test(item.trade);

        // Set font for measurement
        if (isRA3 || isSupervisor) currentDoc.setFont('helvetica', 'bold');
        else currentDoc.setFont('helvetica', 'normal');

        const displayText = item.name + (isLast ? "" : separator);
        let textWidth = currentDoc.getTextWidth(displayText);

        // Check for wrapping
        if (cursorX + textWidth > startX + maxWidth && cursorX > startX) {
            cursorX = startX;
            cursorY += lineHeight;
        }

        // Draw Name
        if (isRA3) {
          currentDoc.setTextColor(0, 0, 0); // Bold Black
        } else if (isSupervisor) {
          currentDoc.setTextColor(0, 102, 204); // Bold Blue
        } else {
          currentDoc.setTextColor(0, 0, 0); // Normal Black
        }
        
        currentDoc.text(item.name, cursorX, cursorY);
        cursorX += currentDoc.getTextWidth(item.name);

        // Draw Separator
        if (!isLast) {
            currentDoc.setFont('helvetica', 'normal');
            currentDoc.setTextColor(0, 0, 0);
            currentDoc.text(separator, cursorX, cursorY);
            cursorX += currentDoc.getTextWidth(separator);
        }
      });

      // Reset styles for next cells
      currentDoc.setFont('helvetica', 'normal');
      currentDoc.setTextColor(0, 0, 0);
    },

    didDrawPage: (data) => {
      // === HEADER SECTION ===
      const contentStartY = headerStartY + 2;
      const lineY = contentStartY + 20;
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(0);
      doc.rect(margin, headerStartY, usableWidth, headerBoxHeight); 
      doc.line(margin, lineY, pageWidth - margin, lineY);

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
      doc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
      doc.text(formattedScheduleDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });
      
      // === FOOTER SECTION ===
      const footerHeight = 60;
      const footerMidX = margin + usableWidth / 2;
      let footerStartY = data.cursor.y;

      const pageHeight = doc.internal.pageSize.getHeight();
      if (footerStartY + footerHeight + 20 > pageHeight) {
        doc.addPage();
        footerStartY = margin;
      }

      doc.setLineWidth(0.2);
      doc.setDrawColor(0);
      doc.rect(margin, footerStartY, usableWidth, footerHeight);
      doc.line(footerMidX, footerStartY, footerMidX, footerStartY + footerHeight);
      doc.line(footerMidX, footerStartY + footerHeight / 2, margin + usableWidth, footerStartY + footerHeight / 2);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      doc.text(`Scheduled by ${schedulerName}`, margin + 6, footerStartY + footerHeight / 2 + 3);
      doc.text('Signature:', footerMidX + 6, footerStartY + 15);

      if (userSignature) {
        const cellX = footerMidX;
        const cellY = footerStartY;
        const cellWidth = usableWidth / 2;
        const cellHeight = footerHeight / 2;
        const labelWidth = 52;
        const padding = 4;
        const maxWidth = cellWidth - labelWidth - padding * 2;
        const maxHeight = cellHeight - padding * 2;

        try {
            const imgProps = doc.getImageProperties(userSignature);
            let imgWidth = imgProps.width;
            let imgHeight = imgProps.height;
            const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
            imgWidth *= scale;
            imgHeight *= scale;
            const imgX = cellX + labelWidth + padding;
            const imgY = cellY + (cellHeight - imgHeight) / 2;

            doc.addImage(userSignature, 'PNG', imgX, imgY, imgWidth, imgHeight);
        } catch (e) {
            console.error("Failed to add signature image:", e);
        }
      }

      doc.text(`Date: ${formattedReportDate}`, footerMidX + 6, footerStartY + footerHeight / 2 + 15);
      doc.setFontSize(7);
      doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, footerStartY + footerHeight + 10);
      const totalPages = doc.getNumberOfPages();
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, pageWidth - margin, footerStartY + footerHeight + 10, { align: 'right' });
    }
  });

  doc.save(`JobSchedule_${format(scheduleDate, 'yyyy-MM-dd')}.pdf`);
}
