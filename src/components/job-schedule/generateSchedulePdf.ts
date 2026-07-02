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
    return ''; 
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
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const formattedScheduleDate = format(scheduleDate, 'dd-MM-yyyy');
  const formattedReportDate = format(reportDate, 'dd-MM-yyyy');
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');

  const headRow = [
    'Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name",
    'Location', 'Reporting Time', 'Client / Contact Person Number', 'Vehicle', 'Special instruction/Remarks',
  ];

  const bodyRows = (schedule?.items || []).map((item, i) => [
    i + 1,
    item.manpowerIds, // Array of strings: "Name (Trade)"
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

  // ---------- DYNAMIC FONT SCALING ----------
  let fontSize = 6.5;
  let cellPadding = 2.5;

  doc.autoTable({
    startY: tableStartY,
    tableWidth: usableWidth,
    margin: { left: margin, right: margin, top: tableStartY },
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
        1: { cellWidth: 120 }, 
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 70 },
        5: { cellWidth: 50 },
        6: { cellWidth: 40, halign: 'center' },
        7: { cellWidth: 60 },
        8: { cellWidth: 35, halign: 'center' },
        9: { cellWidth: 'auto' },
    },

    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        const rawNames = Array.isArray(data.cell.raw) ? data.cell.raw : [String(data.cell.raw)];
        const namesOnly = rawNames.map(rn => {
           const match = rn.match(/^(.*)\s\((.*)\)$/);
           return match ? match[1].trim() : rn.trim();
        });
        
        const fullString = namesOnly.join(', ');
        const padding = data.cell.padding('left') + data.cell.padding('right');
        const maxWidth = data.column.width - padding;
        
        data.doc.setFontSize(data.cell.styles.fontSize);
        const splitText = data.doc.splitTextToSize(fullString, maxWidth);
        const lineCount = splitText.length;
        
        const lineHeight = data.cell.styles.fontSize * 1.3;
        const cellPaddingY = data.cell.padding('top') + data.cell.padding('bottom');
        const requiredHeight = lineCount * lineHeight + cellPaddingY;
        
        if (data.row.height < requiredHeight) {
          data.row.height = requiredHeight;
        }
      }
    },

    willDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 1) {
        data.cell.text = []; // Clear for custom drawing
      }
    },

    didDrawCell: (data: any) => {
      if (data.section !== 'body' || data.column.index !== 1) return;

      const rawNames = Array.isArray(data.cell.raw) ? data.cell.raw : [String(data.cell.raw)];
        
      const parsed = rawNames.map(rn => {
          const match = rn.match(/^(.*)\s\((.*)\)$/);
          return match ? { name: match[1].trim(), trade: match[2].trim() } : { name: rn.trim(), trade: '' };
      });

      // SORT: Level 3 first, Supervisors/HSE last
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
      const fSize = data.cell.styles.fontSize;
      const lHeight = fSize * 1.3;
      const separator = ", ";

      currentDoc.setFontSize(fSize);

      parsed.forEach((item, idx) => {
        const isLast = idx === parsed.length - 1;
        const isRA3 = /RA\s*Level\s*3/i.test(item.trade);
        const isMgt = /Supervisor|HSE|Safety|Admin|Manager|Coordinator/i.test(item.trade);

        if (isRA3 || isMgt) currentDoc.setFont('helvetica', 'bold');
        else currentDoc.setFont('helvetica', 'normal');

        if (isMgt) currentDoc.setTextColor(0, 102, 204);
        else currentDoc.setTextColor(0, 0, 0);

        const nameWithSep = item.name + (isLast ? "" : separator);
        const nameWidth = currentDoc.getTextWidth(item.name);
        const sepWidth = isLast ? 0 : currentDoc.getTextWidth(separator);

        // Word wrap check
        if (cursorX + nameWidth > startX + maxWidth && cursorX > startX) {
            cursorX = startX;
            cursorY += lHeight;
        }

        currentDoc.text(item.name, cursorX, cursorY);
        cursorX += nameWidth;

        if (!isLast) {
            currentDoc.setFont('helvetica', 'normal');
            currentDoc.setTextColor(0, 0, 0);
            if (cursorX + sepWidth > startX + maxWidth) {
                 cursorX = startX;
                 cursorY += lHeight;
            }
            currentDoc.text(separator, cursorX, cursorY);
            cursorX += sepWidth;
        }
      });

      currentDoc.setFont('helvetica', 'normal').setTextColor(0, 0, 0);
    },

    didDrawPage: (data) => {
      const contentStartY = headerStartY + 2;
      const lineY = contentStartY + 20;
      doc.setLineWidth(0.2).setDrawColor(0);
      doc.rect(margin, headerStartY, usableWidth, headerBoxHeight); 
      doc.line(margin, lineY, pageWidth - margin, lineY);

      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
      }

      doc.setFont('helvetica', 'bold').setFontSize(14);
      doc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
      doc.setFontSize(8).setFont('helvetica', 'normal');
      doc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
      doc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
      doc.text(formattedScheduleDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });
    }
  });

  // ---------- DRAW FOOTER AFTER TABLE ----------
  const finalTableY = (doc as any).lastAutoTable.finalY;
  const footerHeight = 60;
  let footerY = finalTableY + 20;

  if (footerY + footerHeight + 20 > pageHeight) {
    doc.addPage();
    footerY = margin;
  }

  const footerMidX = margin + usableWidth / 2;
  doc.setLineWidth(0.2).setDrawColor(0);
  doc.rect(margin, footerY, usableWidth, footerHeight);
  doc.line(footerMidX, footerY, footerMidX, footerY + footerHeight);
  doc.line(footerMidX, footerY + footerHeight / 2, margin + usableWidth, footerY + footerHeight / 2);

  doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(0);
  doc.text(`Scheduled by ${schedulerName}`, margin + 6, footerY + footerHeight / 2 + 3);
  doc.text('Signature:', footerMidX + 6, footerY + 15);

  if (userSignature) {
    const labelWidth = 52;
    const padding = 4;
    const maxWidth = (usableWidth / 2) - labelWidth - padding * 2;
    const maxHeight = (footerHeight / 2) - padding * 2;

    try {
        const imgProps = doc.getImageProperties(userSignature);
        let imgW = imgProps.width;
        let imgH = imgProps.height;
        const scale = Math.min(maxWidth / imgW, maxHeight / imgH, 1);
        imgW *= scale;
        imgH *= scale;
        doc.addImage(userSignature, 'PNG', footerMidX + labelWidth + padding, footerY + ((footerHeight/2) - imgH)/2, imgW, imgH);
    } catch (e) { console.error(e); }
  }

  doc.text(`Date: ${formattedReportDate}`, footerMidX + 6, footerY + footerHeight / 2 + 15);
  doc.setFontSize(7);
  doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, pageHeight - 15);
  doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 15, { align: 'right' });

  doc.save(`JobSchedule_${format(scheduleDate, 'yyyy-MM-dd')}.pdf`);
}