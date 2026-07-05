
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';
import type { JobSchedule, User } from '@/lib/types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Image not found at ${url}`);
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

const SIGNATURES: Record<string, string> = {
    'Harirkrishnan P S': '/images/hari_sign.jpg',
    'MANU M G': '/images/Manu_Sign.jpg',
};

export async function generateSchedulePdf(
  schedule: JobSchedule | undefined,
  scheduleDate: Date,
  reportDate: Date,
  schedulerName: string,
  userSignature?: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;

  // --- Header Helpers ---
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');

  const addPageHeader = (currentDoc: jsPDF) => {
    if (logoBase64) {
      currentDoc.addImage(logoBase64, 'PNG', margin, 20, 140, 35);
    }
    
    currentDoc.setFontSize(14);
    currentDoc.setFont('helvetica', 'bold');
    currentDoc.text('ARIES', pageWidth / 2, 40, { align: 'center' });
    
    currentDoc.setFontSize(10);
    currentDoc.setFont('helvetica', 'normal');
    currentDoc.text('Division/Branch: I & M / Jamnagar', margin, 75);
    currentDoc.text(`Project/ Vessel’s name: Daily Schedule for ${format(scheduleDate, 'dd-MM-yyyy')}`, margin, 90);
  };

  const drawFooter = (currentDoc: jsPDF, finalY: number) => {
    // Dock footer to table
    let footerY = finalY - 0.2;
    const footerHeight = 70;

    // Check if footer fits
    if (footerY + footerHeight > pageHeight - 20) {
      currentDoc.addPage();
      addPageHeader(currentDoc);
      footerY = 110;
    }

    currentDoc.setLineWidth(0.5);
    currentDoc.setDrawColor(180);

    // Main Footer Box
    currentDoc.rect(margin, footerY, pageWidth - margin * 2, 45);
    currentDoc.line(margin + 250, footerY, margin + 250, footerY + 45);
    currentDoc.line(pageWidth - margin - 200, footerY, pageWidth - margin - 200, footerY + 45);

    currentDoc.setFontSize(9);
    currentDoc.setFont('helvetica', 'normal');
    
    // Scheduled By
    currentDoc.text(`Scheduled by: ${schedulerName}`, margin + 10, footerY + 20);
    
    // Date
    currentDoc.text(`Date: ${format(reportDate, 'dd-MM-yyyy')}`, pageWidth - margin - 190, footerY + 20);

    // Signature Area
    currentDoc.text('Signature:', pageWidth - margin - 190, footerY + 40);
    if (userSignature) {
      try {
        currentDoc.addImage(userSignature, 'PNG', pageWidth - margin - 130, footerY + 15, 80, 25);
      } catch (e) {
        console.error("Signature error:", e);
      }
    }

    // Ref line
    currentDoc.setFontSize(7);
    currentDoc.setTextColor(100);
    currentDoc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, pageHeight - 20);
    currentDoc.text('Page 1 of 1', pageWidth - margin, pageHeight - 20, { align: 'right' });
  };

  addPageHeader(doc);

  const head = [
    ['Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name", 'Location', 'Reporting Time', 'Client / Contact Person Number', 'Vehicle', 'Special instruction/Remarks']
  ];

  const body = (schedule?.items || []).map((item, index) => [
    index + 1,
    item.manpowerIds || [], // Passing array for custom rendering
    item.jobType || '',
    item.jobNo || '',
    item.projectVesselName || '',
    item.location || '',
    item.reportingTime || '',
    item.clientContact || '',
    item.vehicleId || '',
    item.remarks || ''
  ]);

  doc.autoTable({
    head: head,
    body: body,
    startY: 105,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      valign: 'middle',
      halign: 'center',
      lineColor: [180, 180, 180],
      lineWidth: 0.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: 0,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 135, halign: 'left' },
      2: { cellWidth: 60 },
      3: { cellWidth: 60 },
      4: { cellWidth: 100 },
      5: { cellWidth: 80 },
      6: { cellWidth: 55 },
      7: { cellWidth: 90 },
      8: { cellWidth: 50 },
      9: { cellWidth: 'auto', halign: 'left' },
    },
    margin: { left: margin, right: margin, bottom: 70 },
    didDrawCell: (data: any) => {
      // Logic for multi-colored comma separated names in column index 1
      if (data.section === 'body' && data.column.index === 1) {
        const currentDoc = data.doc;
        const rawNames = data.cell.raw;
        if (!Array.isArray(rawNames)) return;

        // Clear AutoTable's default text by painting over it
        currentDoc.setFillColor(255, 255, 255);
        currentDoc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');

        // Parse and Sort Names
        const parsed = rawNames.map(str => {
          const m = str.match(/^(.*?)\s*\((.*?)\)$/);
          return {
            name: m ? m[1].trim() : str,
            role: m ? m[2].trim() : ''
          };
        }).sort((a, b) => {
          const isMgmt = (r: string) => /Supervisor|HSE|Safety|Coordinator/i.test(r);
          const isL3 = (r: string) => /RA\s*Level\s*3/i.test(r);

          if (isL3(a.role) && !isL3(b.role)) return -1;
          if (!isL3(a.role) && isL3(b.role)) return 1;
          if (isMgmt(a.role) && !isMgmt(b.role)) return 1;
          if (!isMgmt(a.role) && isMgmt(b.role)) return -1;
          return a.name.localeCompare(b.name);
        });

        const fSize = data.cell.styles.fontSize;
        const lHeight = fSize * 1.55;
        const paddingLeft = data.cell.padding('left');
        const paddingRight = data.cell.padding('right');
        const paddingTop = data.cell.padding('top');
        const maxWidth = data.cell.width - paddingLeft - paddingRight;

        let cursorX = data.cell.x + paddingLeft;
        let cursorY = data.cell.y + paddingTop + fSize;
        const separator = ", ";

        parsed.forEach((item, i) => {
          const isLast = i === parsed.length - 1;
          
          // Style detection
          if (/RA\s*Level\s*3/i.test(item.role)) {
            currentDoc.setFont('helvetica', 'bold');
            currentDoc.setTextColor(0, 0, 0);
          } else if (/Supervisor|HSE|Safety|Coordinator/i.test(item.role)) {
            currentDoc.setFont('helvetica', 'bold');
            currentDoc.setTextColor(0, 102, 204);
          } else {
            currentDoc.setFont('helvetica', 'normal');
            currentDoc.setTextColor(0, 0, 0);
          }

          const textToDraw = item.name + (isLast ? "" : separator);
          const textWidth = currentDoc.getTextWidth(textToDraw);

          // Wrap logic
          if (cursorX + textWidth > data.cell.x + paddingLeft + maxWidth && cursorX > data.cell.x + paddingLeft) {
            cursorX = data.cell.x + paddingLeft;
            cursorY += lHeight;
          }

          currentDoc.text(textToDraw, cursorX, cursorY);
          cursorX += textWidth;
        });

        // Reset styles for other cells
        currentDoc.setFont('helvetica', 'normal');
        currentDoc.setTextColor(0, 0, 0);
      }
    },
    didDrawPage: (data: any) => {
      // Footer only drawn at the end, handled outside AutoTable logic
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  drawFooter(doc, finalY);

  doc.save(`JobSchedule_${format(scheduleDate, 'yyyy-MM-dd')}.pdf`);
}
