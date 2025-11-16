
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
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  // === LOAD IMAGES (logo + signature) ==================================
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  // NOTE: because file name has a space, encode it as %20:
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER BAR ======================================================
  doc.setFillColor(221, 233, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // === LOGO =============================================================
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 8, 40, 20);
  }

  // === TITLE ============================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Job Schedule', pageWidth / 2, 26, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(margin, 38, pageWidth - margin, 38);

  // === SECOND HEADER ROW ===============================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Division/Branch:', margin, 52);
  doc.setFont('helvetica', 'normal');
  doc.text('I & M / Jamnagar', margin + 80, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.:', pageWidth / 2 - 30, 52);
  doc.setFont('helvetica', 'normal');
  doc.text('R A', pageWidth / 2 + 10, 52);

  doc.text(formattedDate, pageWidth - margin, 52, { align: 'right' });

  doc.line(margin, 58, pageWidth - margin, 58);

  // === TABLE ============================================================
  const headRow = [
    'Sr. No',
    'Name',
    'Job Type',
    'Job No.',
    "Project/Vessel's name",
    'Location',
    'Reporting Time',
    'Client / Contact Person Number',
    'Vehicle',
    'Special instruction/Remarks',
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
    item.vehicleId || '',
    item.remarks || '',
  ]);

  doc.autoTable({
    head: [headRow],
    body: bodyRows,
    startY: 62,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 100 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 100 },
      5: { cellWidth: 60 },
      6: { cellWidth: 50 },
      7: { cellWidth: 100 },
      8: { cellWidth: 50 },
      9: { cellWidth: 70 },
    },
    didDrawPage: (data) => {
      // === FOOTER BLOCK (matches your attached format) ==================
      const footerTop = pageHeight - 40; // top of "Scheduled by / Signature / Date" row
      const bottomRowY = pageHeight - 12; // ref + page row

      // Row 1: Scheduled by | Signature (with image) | Date
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // "Scheduled by ..." (left)
      doc.text('Scheduled by Harikrishnan P S', margin + 4, footerTop);

      // "Signature:" (centre) + signature image
      const sigLabelX = pageWidth / 2 - 40;
      doc.text('Signature:', sigLabelX, footerTop);

      if (signatureBase64) {
        // small signature image to the right of label
        doc.addImage(
          signatureBase64,
          'JPEG',
          sigLabelX + 40,
          footerTop - 14,
          60,
          24
        );
      }

      // "Date: dd-mm-yyyy" (right)
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, {
        align: 'right',
      });

      // Row 2: bottom reference + page number
      doc.setFontSize(8);
      doc.text(
        'Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020',
        margin,
        bottomRowY
      );

      const totalPages = doc.getNumberOfPages();
      doc.text(
        `Page ${data.pageNumber} of ${totalPages}`,
        pageWidth - margin,
        bottomRowY,
        { align: 'right' }
      );
    },
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
