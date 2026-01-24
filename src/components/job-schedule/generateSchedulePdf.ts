'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
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
  reportDate: Date
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
    Array.isArray(item.manpowerIds) ? item.manpowerIds.join(', ') : '',
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

  // ---------- SMART AUTO-FIT TABLE SCALING ----------
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const footerReserve = 90;
  const headerReserve = headerBoxHeight + margin + 10;
  
  const availableTableHeight =
    pageHeight - headerReserve - footerReserve;
  
  // Font limits (professional range)
  const MAX_FONT = 8;      // looks good when few rows
  const MIN_FONT = 4.5;    // still readable
  
  let fontSize = MAX_FONT;
  let cellPadding = 2;
  
  // Row height estimation
  const estimateRowHeight = (font: number, padding: number) =>
    font * 1.35 + padding * 2;
  
  const totalRows = bodyRows.length;
  
  let headerHeight = estimateRowHeight(fontSize + 0.5, cellPadding);
  let rowHeight = estimateRowHeight(fontSize, cellPadding);
  
  let estimatedTableHeight =
    headerHeight + totalRows * rowHeight;
  
  // 🔁 Reduce only if overflow
  while (estimatedTableHeight > availableTableHeight && fontSize > MIN_FONT) {
    fontSize -= 0.2;
    cellPadding = Math.max(1, cellPadding - 0.1);
  
    headerHeight = estimateRowHeight(fontSize + 0.5, cellPadding);
    rowHeight = estimateRowHeight(fontSize, cellPadding);
  
    estimatedTableHeight =
      headerHeight + totalRows * rowHeight;
  }

  doc.autoTable({
    startY: tableStartY,
    tableWidth: usableWidth,
    margin: {
        left: margin,
        right: margin,
        top: tableStartY,
    },

    pageBreak: 'avoid',   // 🚫 NEVER go to next page
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
        1: { cellWidth: 120 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 75 },
        5: { cellWidth: 50 },
        6: { cellWidth: 40, halign: 'center' },
        7: { cellWidth: 60 },
        8: { cellWidth: 35, halign: 'center' },
        9: { cellWidth: usableWidth - 470 },
    },

    didDrawPage: (data) => {
      // === HEADER SECTION ======================================================
      const contentStartY = headerStartY + 2;
      const lineY = contentStartY + 20;
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(0);

      // Outer box
      doc.rect(margin, headerStartY, usableWidth, headerBoxHeight); 
      
      // Divider line
      doc.line(margin, lineY, pageWidth - margin, lineY);

      // Logo
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
      }

      // "Job Schedule" Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
      
      // Sub-header text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
      doc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
      doc.text(formattedScheduleDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });
      
      // === FOOTER SECTION =======================================================
      const footerHeight = 50;
      const footerMidX = margin + usableWidth / 2;

      // Start footer immediately after table
      let footerStartY = data.cursor.y;

      // Page overflow check
      const pageHeight = doc.internal.pageSize.getHeight();
      if (footerStartY + footerHeight + 20 > pageHeight) {
        doc.addPage();
        footerStartY = margin;
      }

      doc.setLineWidth(0.2);
      doc.setDrawColor(0);

      // Outer footer box
      doc.rect(margin, footerStartY, usableWidth, footerHeight);

      // Vertical divider (between columns)
      doc.line(footerMidX, footerStartY, footerMidX, footerStartY + footerHeight);

      // Horizontal divider ONLY on right column
      doc.line(
        footerMidX,
        footerStartY + footerHeight / 2,
        margin + usableWidth,
        footerStartY + footerHeight / 2
      );

      // ---- LEFT COLUMN (merged cell) ----
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Scheduled by Rakhi Raj',
        margin + 6,
        footerStartY + footerHeight / 2 + 3
      );

      // ---- RIGHT COLUMN TOP ----
      doc.text(
        'Signature:',
        footerMidX + 6,
        footerStartY + 15
      );

      // ---- RIGHT COLUMN BOTTOM ----
      doc.text(
        `Date: ${formattedReportDate}`,
        footerMidX + 6,
        footerStartY + footerHeight / 2 + 15
      );

      // ---- REFERENCE (OUTSIDE BOX, TOUCHING FOOTER) ----
      doc.setFontSize(7);
      doc.text(
        'Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020',
        margin,
        footerStartY + footerHeight + 10
      );

      // ---- PAGE NUMBER (RIGHT SIDE, SAME LINE AS REF) ----
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - margin,
        footerStartY + footerHeight + 10,
        { align: 'right' }
      );
    }
  });

  doc.save(`JobSchedule_${format(scheduleDate, 'yyyy-MM-dd')}.pdf`);
}
