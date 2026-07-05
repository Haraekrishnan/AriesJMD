'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';
import type { JobSchedule, User } from '@/lib/types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

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
  // Constants for document layout
  const pageWidth = 595.28; // A4 point width
  const pageHeight = 841.89; // A4 point height
  
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

  let fontSize = 6;
  let tableResult: any;
  let doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // LOOP: Adaptive Font Size to fit on one page. 
  // We recreate the document inside the loop because AutoTable caches measurements on the doc instance.
  while (fontSize >= 4) {
    const currentDoc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const padding = fontSize > 5.5 ? 5 : fontSize > 5 ? 4 : fontSize > 4.5 ? 3 : 2;

    tableResult = currentDoc.autoTable({
        startY: tableStartY,
        tableWidth: usableWidth,
        margin: { left: margin, right: margin, top: tableStartY, bottom: 100 },
        head: [headRow],
        body: bodyRows,
        theme: 'grid',
        styles: {
            font: "times",
            fontSize,
            halign: "center",
            valign: "middle",
            cellPadding: { top: padding, bottom: padding, left: 3, right: 3 },
            overflow: "linebreak",
            lineWidth: 0.2,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
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
            1: { cellWidth: 175 }, 
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
            if (data.section === "body" && data.column.index === 1) {
                const raw = Array.isArray(data.cell.raw) ? data.cell.raw : [String(data.cell.raw)];
                const joined = raw.map((r: string) => r.replace(/\s*\(.*?\)/, "")).join(", ");
                // Provide wrapped text for height measurement
                data.cell.text = data.doc.splitTextToSize(joined, data.column.width - 8);
            }
        },

        willDrawCell: (data: any) => {
            if (data.section === "body" && data.column.index === 1) {
                // Remove default text to prevent overlap
                data.cell.text = [];
            }
        },

        didDrawCell: (data: any) => {
            if (data.section !== "body" || data.column.index !== 1) return;

            const cDoc = data.doc;
            const raw = Array.isArray(data.cell.raw) ? data.cell.raw : [String(data.cell.raw)];
            const fSize = fontSize;
            const lineHeight = cDoc.getLineHeightFactor() * fSize;

            const isL3 = (t: string) => /RA\s*Level\s*3/i.test(t);
            const isMgmt = (t: string) => /Supervisor|HSE|Safety|Manager|Coordinator|Admin/i.test(t);

            const people = raw.map((r: string) => {
                const m = r.match(/^(.*?)\s*\((.*?)\)$/);
                return {
                    name: m ? m[1].trim() : r,
                    trade: m ? m[2].trim() : ""
                };
            }).sort((a, b) => {
                if (isL3(a.trade) && !isL3(b.trade)) return -1;
                if (!isL3(a.trade) && isL3(b.trade)) return 1;
                if (isMgmt(a.trade) && !isMgmt(b.trade)) return 1;
                if (!isMgmt(a.trade) && isMgmt(b.trade)) return -1;
                return 0;
            });

            const left = data.cell.x + 4;
            const width = data.cell.width - 8;
            
            let x = left;
            let y = data.cell.y + lineHeight + 2;

            people.forEach((p, index) => {
                const suffix = index === people.length - 1 ? "" : ", ";
                const text = p.name + suffix;

                if (isL3(p.trade)) {
                    cDoc.setFont("times", "bold");
                    cDoc.setTextColor(0, 0, 0);
                } else if (isMgmt(p.trade)) {
                    cDoc.setFont("times", "bold");
                    cDoc.setTextColor(0, 102, 204);
                } else {
                    cDoc.setFont("times", "normal");
                    cDoc.setTextColor(0, 0, 0);
                }

                cDoc.setFontSize(fSize);
                const w = cDoc.getTextWidth(text);

                if (x + w > left + width) {
                    x = left;
                    y += lineHeight;
                }

                cDoc.text(text, x, y);
                x += w;
            });

            cDoc.setFont("times", "normal");
            cDoc.setTextColor(0, 0, 0);
        },

        didDrawPage: (data: any) => {
            const contentStartY = headerStartY + 2;
            const lineY = contentStartY + 20;
            currentDoc.setLineWidth(0.2).setDrawColor(0);
            currentDoc.rect(margin, headerStartY, usableWidth, headerBoxHeight); 
            currentDoc.line(margin, lineY, pageWidth - margin, lineY);

            if (logoBase64) {
                currentDoc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
            }

            currentDoc.setFont('times', 'bold').setFontSize(14);
            currentDoc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
            currentDoc.setFontSize(8).setFont('times', 'normal');
            currentDoc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
            currentDoc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
            currentDoc.text(formattedScheduleDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });

            currentDoc.setFontSize(7).setTextColor(0);
            currentDoc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, pageHeight - 15);
            currentDoc.text(`Page ${data.pageNumber}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
        }
    });

    const footerHeight = 60;
    if (tableResult.finalY + footerHeight <= pageHeight - 30) {
        doc = currentDoc;
        break;
    }
    
    fontSize -= 0.2;
    if (fontSize < 4) doc = currentDoc;
  }

  const finalTableY = tableResult.finalY;
  const footerHeight = 60;
  const bottomMargin = 30;
  let footerY = finalTableY;

  // Final footer placement check
  if (footerY + footerHeight + bottomMargin > pageHeight) {
    doc.addPage();
    const contentStartY = headerStartY + 2;
    const lineY = contentStartY + 20;
    doc.setLineWidth(0.2).setDrawColor(0);
    doc.rect(margin, headerStartY, usableWidth, headerBoxHeight); 
    doc.line(margin, lineY, pageWidth - margin, lineY);
    if (logoBase64) doc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
    doc.setFont('times', 'bold').setFontSize(14);
    doc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
    doc.setFontSize(8).setFont('times', 'normal');
    doc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
    doc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
    doc.text(formattedScheduleDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });
    
    footerY = headerBottomY + 15;
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
    const paddingVal = 4;
    const maxWidth = (usableWidth / 2) - labelWidth - paddingVal * 2;
    const maxHeight = (footerHeight / 2) - paddingVal * 2;
    try {
        const imgProps = doc.getImageProperties(userSignature);
        let imgW = imgProps.width;
        let imgH = imgProps.height;
        const scale = Math.min(maxWidth / imgW, maxHeight / imgH, 1);
        doc.addImage(userSignature, 'PNG', footerMidX + labelWidth + paddingVal, footerY + ((footerHeight/2) - (imgH * scale))/2, imgW * scale, imgH * scale);
    } catch (e) { console.error(e); }
  }

  doc.text(`Date: ${formattedReportDate}`, footerMidX + 6, footerY + footerHeight / 2 + 15);

  doc.save(`JobSchedule_${format(scheduleDate, 'yyyy-MM-dd')}.pdf`);
}
