
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
  projectName: string,
  selectedDate: Date
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let lastY = margin;

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER SECTION ======================================================
  const headerBoxHeight = 42;
  const contentStartY = lastY + 2;

  // Outer box
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  doc.rect(margin, lastY, pageWidth - margin * 2, headerBoxHeight); 

  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, contentStartY, 35, 12);
  }

  // "Job Schedule" Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Job Schedule', pageWidth / 2, contentStartY + 7, { align: 'center' });
  
  // Divider line
  const lineY = contentStartY + 12;
  doc.setLineWidth(0.2);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  // Sub-header text
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Division/Branch: I & M / Jamnagar', margin + 2, lineY + 7);
  doc.text('Sub-Div.: R A', pageWidth / 2, lineY + 7, { align: 'center' });
  doc.text(formattedDate, pageWidth - margin - 2, lineY + 7, { align: 'right' });
  
  const tableStartY = lastY + headerBoxHeight;

  // === TABLE SECTION ============================================================
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

  doc.autoTable({
    margin: { top: tableStartY },
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    styles: {
        fontSize: 7,
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'middle',
        cellPadding: 2,
    },
    headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 40 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 35 },
      8: { cellWidth: 20, halign: 'center' },
      9: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerTop = pageHeight - 30;
      const bottomRowY = pageHeight - 12;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Scheduled by Harikrishnan P S', margin, footerTop);

      const sigLabelX = pageWidth / 2 - 20;
      doc.text('Signature:', sigLabelX, footerTop);
      if (signatureBase64) {
        doc.addImage(signatureBase64, 'JPEG', sigLabelX + 20, footerTop - 10, 30, 12);
      }

      doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, { align: 'right' });

      doc.setFontSize(8);
      doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, bottomRowY);
      
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - margin,
        bottomRowY,
        { align: 'right' }
      );
    }
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
