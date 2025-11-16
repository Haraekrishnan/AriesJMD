
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
    // For client-side fetching, ensure the URL is absolute
    const fetchUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Logo not found at ${url}`);
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let lastY = margin;

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER BOX ======================================================
  doc.setLineWidth(0.5);
  doc.rect(margin, lastY, pageWidth - margin * 2, 28); // Main header box
  doc.line(margin, lastY + 14, pageWidth - margin, lastY + 14); // Middle line

  // === HEADER CONTENT =================================================
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, lastY + 1, 35, 12);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Job Schedule', pageWidth / 2, lastY + 10, { align: 'center' });

  doc.setFontSize(9);
  doc.text('Division/Branch: I & M / Jamnagar', margin + 2, lastY + 22);
  doc.text('Sub-Div.: R A', pageWidth / 2 - 10, lastY + 22);
  doc.text(formattedDate, pageWidth - margin - 2, lastY + 22, { align: 'right' });

  lastY += 28; // Set Y for the table to start exactly where the header ends

  // === TABLE ============================================================
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
    head: [headRow],
    body: bodyRows,
    startY: lastY,
    theme: 'grid',
    styles: {
        fontSize: 7,
        lineWidth: 0.2,
        textColor: [0, 0, 0],
        valign: 'middle',
        cellPadding: 2,
    },
    headStyles: {
        fillColor: [255, 255, 255], // White background for header
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 15 },  // Sr. No
      1: { cellWidth: 40 },  // Name
      2: { cellWidth: 20 },  // Job Type
      3: { cellWidth: 20 },  // Job No.
      4: { cellWidth: 40 },  // Project/Vessel
      5: { cellWidth: 25 },  // Location
      6: { cellWidth: 20, halign: 'center' },  // Reporting Time
      7: { cellWidth: 35 },  // Client/Contact
      8: { cellWidth: 20, halign: 'center' },  // Vehicle
      9: { cellWidth: 'auto' }, // Remarks
    },
    didDrawPage: (data) => {
      // === FOOTER BLOCK ==============================================
      const footerTop = pageHeight - 30;
      const bottomRowY = pageHeight - 10;

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
      doc.text(
        'Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020',
        margin,
        bottomRowY
      );

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
