'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO, isValid } from 'date-fns';
import type { JobSchedule, Project } from '@/lib/types';

declare module 'jsPDF' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
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
  projects: Project[],
  userSignature?: string
) {
  if (!schedule || !schedule.items || schedule.items.length === 0) {
    return;
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 28;
  const usableWidth = pageWidth - margin * 2;
  const headerBoxHeight = 42;
  const headerStartY = margin;
  const headerBottomY = headerStartY + headerBoxHeight;
  const tableStartY = headerBottomY;
  const footerHeight = 60;
  const bottomMarginSpace = 40;

  const formattedScheduleDate = format(scheduleDate, 'dd-MM-yyyy');
  const formattedReportDate = format(reportDate, 'dd-MM-yyyy');
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');

  const headRow = [
    'Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name",
    'Location', 'Reporting Time', 'Client / Contact Person Number', 'Vehicle', 'Special instruction/Remarks',
  ];

  const bodyRows = schedule.items.map((item, i) => {
      const project = projects.find(p => p.id === item.projectId);
      const locationText = [project?.name, item.location].filter(Boolean).join(' - ');
      return [
        i + 1,
        item.manpowerIds,
        item.jobType || '',
        item.jobNo || '',
        item.projectVesselName || '',
        locationText || '',
        item.reportingTime || '',
        item.clientContact || '',
        item.vehicleId && item.vehicleId !== 'none' ? item.vehicleId : 'N/A',
        item.remarks || '',
      ];
  });

  let fontSize = 6;
  let finalDoc: jsPDF | null = null;
  let finalTableY = 0;

  // Adaptive sizing loop
  while (fontSize >= 4) {
    const currentDoc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const padding = fontSize > 5.5 ? 5 : fontSize > 5 ? 4 : fontSize > 4.5 ? 3 : 2;
    const fSize = fontSize;
    const lineHeight = currentDoc.getLineHeightFactor() * fSize;

    currentDoc.autoTable({
      startY: tableStartY,
      tableWidth: usableWidth,
      margin: { left: margin, right: margin, top: tableStartY, bottom: 100 },
      head: [headRow],
      body: bodyRows,
      theme: 'grid',
      styles: {
        font: "times",
        fontSize: fSize,
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
        fontSize: fSize + 0.5,
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
      pageBreak: 'avoid',
      rowPageBreak: 'avoid',
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1) {
            const raw = Array.isArray(data.cell.raw) ? data.cell.raw : [String(data.cell.raw)];
            const names = raw.map((r: string) => r.replace(/\s*\(.*?\)/, "")).join(", ");
            data.cell.text = data.doc.splitTextToSize(names, 167); 
        }
      },
      willDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1) {
            data.cell.text = []; 
        }
      },
      didDrawCell: (data: any) => {
        if (data.section !== "body" || data.column.index !== 1) return;

        const cDoc = data.doc;
        const raw = Array.isArray(data.cell.raw) ? data.cell.raw : [String(data.cell.raw)];
        
        const people = raw.map((r: string) => {
          const m = r.match(/^(.*?)\s*\((.*?)\)$/);
          return { name: m ? m[1].trim() : r, trade: m ? m[2].trim() : "" };
        }).sort((a, b) => {
          const isL3 = (t: string) => /RA\s*Level\s*3/i.test(t);
          const isMgmt = (t: string) => /Supervisor|HSE|Safety|Manager|Coordinator|Admin/i.test(t);
          if (isL3(a.trade) && !isL3(b.trade)) return -1;
          if (!isL3(a.trade) && isL3(b.trade)) return 1;
          if (isMgmt(a.trade) && !isMgmt(b.trade)) return 1;
          if (!isMgmt(a.trade) && isMgmt(b.trade)) return -1;
          return 0;
        });

        const left = data.cell.x + 4;
        const width = data.cell.width - 8;
        
        let x = left;
        let y = data.cell.y + padding + (lineHeight * 0.8);

        people.forEach((p, idx) => {
          const suffix = idx === people.length - 1 ? "" : ", ";
          const text = p.name + suffix;

          if (/RA\s*Level\s*3/i.test(p.trade)) {
            cDoc.setFont("times", "bold");
            cDoc.setTextColor(0, 0, 0);
          } else if (/Supervisor|HSE|Safety|Manager|Coordinator|Admin/i.test(p.trade)) {
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
      },
      didDrawPage: (data: any) => {
        const cDoc = data.doc;
        const contentStartY = headerStartY + 2;
        const lineY = contentStartY + 20;
        
        cDoc.setLineWidth(0.2).setDrawColor(0);
        cDoc.rect(margin, headerStartY, usableWidth, headerBoxHeight); 
        cDoc.line(margin, lineY, pageWidth - margin, lineY);

        if (logoBase64) {
          cDoc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
        }

        cDoc.setFont('times', 'bold').setFontSize(14);
        cDoc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
        cDoc.setFontSize(8).setFont('times', 'normal');
        cDoc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
        cDoc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
        cDoc.text(formattedScheduleDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });

        cDoc.setFontSize(7).setTextColor(0);
        cDoc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, pageHeight - 15);
        cDoc.text(`Page ${data.pageNumber}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
      }
    });

    const lastY = (currentDoc as any).lastAutoTable?.finalY || 0;
    if (lastY + footerHeight + bottomMarginSpace <= pageHeight) {
      finalDoc = currentDoc;
      finalTableY = lastY;
      break;
    }
    
    fontSize -= 0.2;
    if (fontSize < 4) {
        finalDoc = currentDoc;
        finalTableY = lastY;
    }
  }

  if (!finalDoc) return;

  let footerY = finalTableY;
  if (footerY + footerHeight + bottomMarginSpace > pageHeight) {
    finalDoc.addPage();
    footerY = headerBottomY + 15;
    
    const cDoc = finalDoc;
    const contentStartY = headerStartY + 2;
    const lineY = contentStartY + 20;
    cDoc.setLineWidth(0.2).setDrawColor(0);
    cDoc.rect(margin, headerStartY, usableWidth, headerBoxHeight); 
    cDoc.line(margin, lineY, pageWidth - margin, lineY);
    if (logoBase64) cDoc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
    cDoc.setFont('times', 'bold').setFontSize(14);
    cDoc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
  }

  const footerMidX = margin + usableWidth / 2;
  finalDoc.setLineWidth(0.2).setDrawColor(0);
  finalDoc.rect(margin, footerY, usableWidth, footerHeight);
  finalDoc.line(footerMidX, footerY, footerMidX, footerY + footerHeight);
  finalDoc.line(footerMidX, footerY + footerHeight / 2, margin + usableWidth, footerY + footerHeight / 2);

  finalDoc.setFontSize(8).setFont('times', 'normal').setTextColor(0);
  finalDoc.text(`Scheduled by ${schedulerName}`, margin + 6, footerY + footerHeight / 2 + 15);
  finalDoc.text('Signature:', footerMidX + 6, footerY + 15);

  if (userSignature) {
    const labelWidth = 52;
    try {
        const imgProps = finalDoc.getImageProperties(userSignature);
        const imgRatio = imgProps.width / imgProps.height;
        const targetHeight = 32;
        const targetWidth = targetHeight * imgRatio;
        const signatureX = footerMidX + labelWidth + 8;
        const signatureY = footerY + (footerHeight / 2 - targetHeight) / 2;
        finalDoc.addImage(userSignature, "PNG", signatureX, signatureY, targetWidth, targetHeight);
    } catch (e) {
        console.error("Signature add failed:", e);
    }
  }

  finalDoc.text(`Date: ${formattedReportDate}`, footerMidX + 6, footerY + footerHeight / 2 + 15);
  finalDoc.save(`JobSchedule_${format(scheduleDate, 'yyyy-MM-dd')}.pdf`);
}
