
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');
  
  // === HEADER (Rebuilt to match template) =================================
  const headerY = 20;
  const headerHeight = 50;
  const subHeaderHeight = 20;

  // Outer Box
  doc.setLineWidth(1);
  doc.rect(margin, headerY, pageWidth - (margin * 2), headerHeight + subHeaderHeight);

  // Line dividing top and bottom sections of the header
  doc.line(margin, headerY + headerHeight, pageWidth - margin, headerY + headerHeight);

  // Top Section
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 10, headerY + 10, 100, 30);
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Schedule', pageWidth - margin - 10, headerY + 30, { align: 'right' });

  // Bottom Section
  const subHeaderY = headerY + headerHeight + 12; // Y position for the text inside the sub-header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  const col1X = margin + 5;
  const col2X = margin + 200;
  const col3X = pageWidth - margin - 5;
  
  doc.text('Division/Branch:', col1X, subHeaderY);
  doc.setFont('helvetica', 'normal');
  doc.text('I & M/Jamnagar', col1X + 70, subHeaderY);

  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.:', col2X, subHeaderY);
  doc.setFont('helvetica', 'normal');
  doc.text('R A', col2X + 45, subHeaderY);

  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, col3X, subHeaderY, { align: 'right' });


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
    startY: headerY + headerHeight + subHeaderHeight + 2, // Start table right after header box
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4, halign: 'center' },
    headStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
    didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const footerTop = pageHeight - 40;
        const bottomRowY = pageHeight - 12;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        doc.text('Scheduled by Harikrishnan P S', margin + 4, footerTop);

        const sigLabelX = pageWidth / 2 - 40;
        doc.text('Signature:', sigLabelX, footerTop);
        if (signatureBase64) {
            doc.addImage(signatureBase64, 'JPEG', sigLabelX + 40, footerTop - 14, 60, 24);
        }

        doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, { align: 'right' });

        doc.setFontSize(8);
        doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, bottomRowY);

        const totalPages = doc.getNumberOfPages();
        doc.text(`Page ${data.pageNumber} of ${totalPages}`, pageWidth - margin, bottomRowY, { align: 'right' });
    },
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
