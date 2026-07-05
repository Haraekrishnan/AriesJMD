'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';
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
  // Use Times font family as base
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  doc.setFont("times", "normal");
  
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
  const fontSize = 6;

  doc.autoTable({
    startY: tableStartY,
    tableWidth: usableWidth,
    margin: { left: margin, right: margin, top: tableStartY, bottom: 70 },

    head: [headRow],
    body: bodyRows,

    theme: 'grid',
    styles: {
        font: "times",
        fontSize: fontSize,
        halign: "center", 
        valign: "middle", 
        cellPadding: {
            top: 5,
            bottom: 5,
            left: 4,
            right: 4
        },
        overflow: "linebreak",
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
    },
    headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: fontSize + 0.5,
    },
    columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 140 }, 
        2: { cellWidth: 28 },
        3: { cellWidth: 30 },
        4: { cellWidth: 64 },
        5: { cellWidth: 50 },
        6: { cellWidth: 42 },
        7: { cellWidth: 58 },
        8: { cellWidth: 38 },
        9: { cellWidth: 'auto' },
    },

    didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
            const raw = data.cell.raw;
            const names = Array.isArray(raw) ? raw : [String(raw)];
            const namesOnly = names.map(n => {
                const m = n.match(/^(.*?)\s*\((.*?)\)$/);
                return m ? m[1].trim() : n;
            });
            const joined = namesOnly.join(", ");
            // Set text for measurement so AutoTable calculates correct height automatically
            data.cell.text = data.doc.splitTextToSize(joined, data.column.width - 8);
        }
    },

    willDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
            // Hide the default text by drawing it in white.
            // This ensures row height is reserved correctly without manual math.
            data.cell.styles.textColor = [255, 255, 255];
        }
    },

    didDrawCell: (data: any) => {
        if (data.section !== "body" || data.column.index !== 1) return;
    
        const currentDoc = data.doc;
        const cell = data.cell;

        // Hide AutoTable's invisible text by painting over it
        currentDoc.setFillColor(255, 255, 255);
        currentDoc.rect(cell.x + 0.5, cell.y + 0.5, cell.width - 1, cell.height - 1, "F");
    
        const paddingLeft = cell.padding("left");
        const paddingRight = cell.padding("right");
        const startX = cell.x + paddingLeft;
        const maxWidth = cell.width - paddingLeft - paddingRight;
    
        const fSize = cell.styles.fontSize;
        const lHeight = fSize * 2.0; // Increased spacing for names
        const separator = ", ";

        const rawNames = Array.isArray(cell.raw) ? cell.raw : [String(cell.raw)];
        const parsed = rawNames.map((raw: string) => {
            const m = raw.match(/^(.*?)\s*\((.*?)\)$/);
            return {
                name: m ? m[1].trim() : raw,
                trade: m ? m[2].trim() : ""
            };
        }).sort((a, b) => {
            const l3 = (t: string) => /RA\s*Level\s*3/i.test(t);
            const mg = (t: string) => /Supervisor|HSE|Safety|Admin|Manager|Coordinator/i.test(t);

            if (l3(a.trade) && !l3(b.trade)) return -1;
            if (!l3(a.trade) && l3(b.trade)) return 1;

            if (mg(a.trade) && !mg(b.trade)) return 1;
            if (!mg(a.trade) && mg(b.trade)) return -1;

            return 0;
        });

        // 1. Group segments into lines manually for centered rendering
        let lines: { text: string, color: number[], isBold: boolean }[][] = [[]];
        let currentLineWidth = 0;
        let lineIdx = 0;

        parsed.forEach((item, idx) => {
            const isLast = idx === parsed.length - 1;
            const textToMeasure = item.name + (isLast ? "" : separator);
            
            const isL3 = /RA\s*Level\s*3/i.test(item.trade);
            const isMgmt = /Supervisor|HSE|Safety|Admin|Manager|Coordinator/i.test(item.trade);
            
            currentDoc.setFont("times", (isL3 || isMgmt) ? "bold" : "normal");
            const wordWidth = currentDoc.getTextWidth(textToMeasure);

            if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
                lineIdx++;
                lines[lineIdx] = [];
                currentLineWidth = 0;
            }

            const color = isMgmt ? [0, 102, 204] : [0, 0, 0];
            
            lines[lineIdx].push({ 
                text: textToMeasure, 
                color, 
                isBold: (isL3 || isMgmt)
            });
            currentLineWidth += wordWidth;
        });

        // 2. Render centered lines vertically and horizontally
        const totalTextHeight = lines.length * lHeight;
        let cursorY = cell.y + (cell.height - totalTextHeight) / 2 + fSize;

        lines.forEach(line => {
            // Horizontal centering for the whole line
            const lineWidth = line.reduce((acc, segment) => {
                currentDoc.setFont("times", segment.isBold ? "bold" : "normal");
                return acc + currentDoc.getTextWidth(segment.text);
            }, 0);
            
            let cursorX = cell.x + (cell.width - lineWidth) / 2;

            line.forEach(segment => {
                currentDoc.setFont("times", segment.isBold ? "bold" : "normal");
                currentDoc.setTextColor(segment.color[0], segment.color[1], segment.color[2]);
                currentDoc.text(segment.text, cursorX, cursorY);
                cursorX += currentDoc.getTextWidth(segment.text);
            });
            cursorY += lHeight;
        });
    
        currentDoc.setFont("times", "normal");
        currentDoc.setTextColor(0, 0, 0);
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

      doc.setFont('times', 'bold').setFontSize(14);
      doc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
      doc.setFontSize(8).setFont('times', 'normal');
      doc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
      doc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
      doc.text(formattedScheduleDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });
    }
  });

  const finalTable = (doc as any).lastAutoTable;
  const footerHeight = 60;
  // Dock footer directly to the bottom border of the table
  let footerY = finalTable.finalY - 0.2;

  // Page overflow protection for footer
  if (footerY + footerHeight > pageHeight - 15) {
    doc.addPage();
    footerY = margin;
  }

  const footerMidX = margin + usableWidth / 2;
  doc.setLineWidth(0.2).setDrawColor(0);
  doc.rect(margin, footerY, usableWidth, footerHeight);
  doc.line(footerMidX, footerY, footerMidX, footerY + footerHeight);
  doc.line(footerMidX, footerY + footerHeight / 2, margin + usableWidth, footerY + footerHeight / 2);

  doc.setFontSize(8).setFont('times', 'normal').setTextColor(0);
  doc.text(`Scheduled by ${schedulerName}`, margin + 6, footerY + footerHeight / 2 + 15);
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
