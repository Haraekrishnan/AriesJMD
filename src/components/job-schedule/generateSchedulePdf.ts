
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
    const absoluteUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    const response = await fetch(absoluteUrl);
    if (!response.ok) throw new Error(`Logo not found at ${absoluteUrl}`);
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40; // A common margin in points

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  // === LOAD IMAGES ==================================
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER ======================================================
  doc.setFillColor(221, 233, 255); // Light blue background
  doc.rect(0, 0, pageWidth, 70, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 20, 120, 30);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Job Schedule', pageWidth / 2, 45, { align: 'center' });

  // === SUB-HEADER ===============================================
  const subHeaderY = 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Division/Branch:', margin, subHeaderY);
  doc.setFont('helvetica', 'normal');
  doc.text('I & M / Jamnagar', margin + 80, subHeaderY);

  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.:', pageWidth / 2, subHeaderY);
  doc.setFont('helvetica', 'normal');
  doc.text('R A', pageWidth / 2 + 50, subHeaderY);

  doc.text(formattedDate, pageWidth - margin, subHeaderY, { align: 'right' });

  doc.setLineWidth(0.5);
  doc.line(margin, subHeaderY + 10, pageWidth - margin, subHeaderY + 10);

  // === TABLE ============================================================
  const headRow = [
    'Sr. No',
    'Name',
    'Job Type',
    'Job No.',
    "Project/Vessel's name",
    'Location',
    'Reporting Time',
    'Client / Contact',
    'Vehicle',
    'Remarks',
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
    startY: subHeaderY + 20,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
    headStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
    didDrawPage: (data) => {
      // === FOOTER BLOCK ==================
      const footerTop = pageHeight - 80;
      const bottomRowY = pageHeight - 30;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Scheduled by
      doc.text('Scheduled by Harikrishnan P S', margin, footerTop);

      // Signature
      const sigLabelX = pageWidth / 2;
      doc.text('Signature:', sigLabelX - 30, footerTop, { align: 'right' });
      if (signatureBase64) {
        doc.addImage(signatureBase64, 'JPEG', sigLabelX - 20, footerTop - 25, 90, 36);
      }

      // Date
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, { align: 'right' });

      // Bottom reference and page number
      doc.setFontSize(8);
      doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, bottomRowY);

      const totalPages = doc.getNumberOfPages();
      doc.text(`Page ${data.pageNumber} of ${totalPages}`, pageWidth - margin, bottomRowY, { align: 'right' });
    },
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
