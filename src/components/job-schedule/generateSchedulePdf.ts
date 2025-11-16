
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
    if (!response.ok) throw new Error('Image not found at ' + url);
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

  // === LOAD IMAGES (logo + signature) ==================================
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER BOX ======================================================
  const headerHeight = 28; // The total height of the header area
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0); // Black border
  doc.rect(margin, lastY, pageWidth - margin * 2, headerHeight); // Main header box
  doc.line(margin, lastY + 14, pageWidth - margin, lastY + 14); // Middle dividing line

  // === HEADER CONTENT =================================================
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, lastY + 1, 35, 12);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Job Schedule', pageWidth / 2, lastY + 10, { align: 'center' });

  lastY += 16; // Move to the second row of the header

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Division/Branch: I & M / Jamnagar', margin + 2, lastY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.: R A', pageWidth / 2, lastY + 5, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, pageWidth - margin - 2, lastY + 5, { align: 'right' });

  lastY += 12; // Position Y at the exact bottom of the header box

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
    startY: lastY, // Start table exactly where the header ends
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
        fillColor: [255, 255, 255], // White background for header
        textColor: [0, 0, 0], // Black text
        fontStyle: 'bold',
        halign: 'center'
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
      9: { cellWidth: 'auto' }, // Remarks column takes remaining space
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
