
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

  // === LOAD IMAGES (logo + signature) ==================================
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER BLOCK ======================================================
  const headerBoxY = lastY;
  const headerHeight = 22; // Total height of the two-part header
  
  // Outer border for the header
  doc.setLineWidth(0.5);
  doc.rect(margin, headerBoxY, pageWidth - (margin * 2), headerHeight);

  // Line separating title row and info row
  const titleRowHeight = 12;
  doc.line(margin, headerBoxY + titleRowHeight, pageWidth - margin, headerBoxY + titleRowHeight);

  // --- Title Row Content ---
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, headerBoxY + 1, 30, 10);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Job Schedule', pageWidth / 2, headerBoxY + 8, { align: 'center' });

  // --- Info Row Content ---
  const infoRowY = headerBoxY + titleRowHeight + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Division/Branch:', margin + 2, infoRowY);
  doc.setFont('helvetica', 'normal');
  doc.text('I & M / Jamnagar', margin + 30, infoRowY);

  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.:', pageWidth / 2 - 15, infoRowY);
  doc.setFont('helvetica', 'normal');
  doc.text('R A', pageWidth / 2 - 5, infoRowY);
  
  doc.text(formattedDate, pageWidth - margin - 2, infoRowY, { align: 'right' });

  lastY += headerHeight + 5; // Set Y for table start, includes gap

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
        fillColor: [255, 255, 255], // White background
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 15 },
      3: { cellWidth: 15 },
      4: { cellWidth: 28 },
      5: { cellWidth: 15 },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 22 },
      8: { cellWidth: 15, halign: 'center' },
      9: { cellWidth: 'auto' },
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

      doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, {
        align: 'right',
      });

      doc.setFontSize(8);
      doc.text(
        'Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020',
        margin,
        bottomRowY
      );

      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.text(
        `Page ${data.pageNumber} of ${totalPages}`,
        pageWidth - margin,
        bottomRowY,
        { align: 'right' }
      );
    }
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
