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

  // === HEADER =========================================================
  const headerBoxHeight = 22; // Total height for the two-row header box
  doc.setLineWidth(0.5);
  doc.rect(margin, lastY, pageWidth - margin * 2, headerBoxHeight); // Main header box

  // --- Top Row of Header ---
  const topRowY = lastY + 10;
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, lastY + 2, 35, 12);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Job Schedule', pageWidth / 2 + 30, topRowY, { align: 'center' });
  
  // --- Divider Line ---
  const dividerY = lastY + 14;
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // --- Bottom Row of Header ---
  const bottomRowY = dividerY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  // Division/Branch
  doc.text('Division/Branch:', margin + 2, bottomRowY);
  doc.setFont('helvetica', 'normal');
  doc.text('I & M / Jamnagar', margin + 30, bottomRowY);

  // Sub-Div.
  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.:', pageWidth / 2 - 10, bottomRowY);
  doc.setFont('helvetica', 'normal');
  doc.text('R A', pageWidth / 2 + 5, bottomRowY);

  // Date
  doc.text(formattedDate, pageWidth - margin - 2, bottomRowY, { align: 'right' });
  
  lastY += headerBoxHeight + 2; // Set Y for table start

  // === TABLE ============================================================
  const headRow = [
    'Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name",
    'Location', 'Reporting Time', 'Client / Contact Person Number', 'vehicle', 'Special instruction/Remarks'
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
      1: { cellWidth: 35 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28 },
      5: { cellWidth: 20 },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 22 },
      8: { cellWidth: 15, halign: 'center' },
      9: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      // === FOOTER BLOCK ==============================================
      const footerTop = pageHeight - 35; 
      const bottomRowY = pageHeight - 12;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Row 1: Scheduled by | Signature (with image) | Date
      doc.text('Scheduled by Harikrishnan P S', margin, footerTop);

      const sigLabelX = pageWidth / 2 - 30;
      doc.text('Signature:', sigLabelX, footerTop);

      if (signatureBase64) {
        doc.addImage(signatureBase64, 'JPEG', sigLabelX + 25, footerTop - 12, 40, 16);
      }

      doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, { align: 'right' });

      // Row 2: bottom reference + page number
      doc.setFontSize(8);
      doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, bottomRowY);
      const totalPages = doc.internal.getNumberOfPages();
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, pageWidth - margin, bottomRowY, { align: 'right' });
    }
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
