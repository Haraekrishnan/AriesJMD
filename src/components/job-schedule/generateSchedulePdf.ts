
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let lastY = margin;

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER ======================================================
  const headerHeight = 20;
  doc.setLineWidth(0.5);
  doc.rect(margin, lastY, pageWidth - margin * 2, headerHeight);
  doc.line(margin, lastY + 10, pageWidth - margin, lastY + 10); // Horizontal divider

  // -- Top Row --
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, lastY + 1, 35, 8);
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Schedule', pageWidth / 2, lastY + 7, { align: 'center' });

  // -- Bottom Row --
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Division/Branch
  doc.text('Division/Branch:', margin + 2, lastY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text('I & M / Jamnagar', margin + 32, lastY + 16);

  // Sub-Div.
  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.:', pageWidth / 2 - 10, lastY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text('R A', pageWidth / 2 + 5, lastY + 16);

  // Date
  doc.text(formattedDate, pageWidth - margin - 2, lastY + 16, { align: 'right' });

  lastY += headerHeight + 10; // Position for the start of the table

  // === TABLE ============================================================
  const headRow = [
    'Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name",
    'Location', 'Reporting Time', 'Client / Contact Person Number', 'Vehicle', 'Remarks'
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
    head: [headRow],
    body: bodyRows,
    startY: lastY,
    theme: 'grid',
    styles: {
        fontSize: 8,
        lineWidth: 0.2,
        textColor: [0, 0, 0],
        valign: 'middle',
        cellPadding: 1.5,
    },
    headStyles: {
        fillColor: [230, 230, 230],
        fontStyle: 'bold',
        halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28 },
      5: { cellWidth: 20 },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 20 },
      8: { cellWidth: 15, halign: 'center' },
      9: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      // === FOOTER ==================================================
      const footerTop = pageHeight - 35;
      const bottomRowY = pageHeight - 12;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      doc.text('Scheduled by Harikrishnan P S', margin, footerTop);
      doc.text('Signature:', pageWidth / 2 - 30, footerTop);
      if (signatureBase64) {
        doc.addImage(signatureBase64, 'JPEG', pageWidth / 2 - 5, footerTop - 12, 45, 18);
      }
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, { align: 'right' });

      doc.setFontSize(8);
      doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, bottomRowY);
      const totalPages = doc.internal.getNumberOfPages();
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, pageWidth - margin, bottomRowY, { align: 'right' });
    }
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
