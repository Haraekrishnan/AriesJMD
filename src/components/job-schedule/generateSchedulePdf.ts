
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
  const margin = 14;
  let lastY = 10; // Start position for drawing

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  // === LOAD IMAGES (logo + signature) ==================================
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  // NOTE: because file name has a space, encode it as %20:
  const signatureBase64 = await fetchImageAsBase64('/hari%20sign.jpg');

  // === HEADER BLOCK =======================================================
  // Outer box for the entire header
  doc.setLineWidth(0.5);
  doc.rect(margin, lastY, pageWidth - margin * 2, 40); // Main header box
  doc.line(margin, lastY + 15, pageWidth - margin, lastY + 15); // Line separating top and bottom of header

  // Top part of the header (Logo and Title)
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin + 2, lastY + 2, 40, 10);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Job Schedule', pageWidth / 2, lastY + 9, { align: 'center' });

  // Bottom part of the header (Division, Sub-Div, Date)
  doc.setFontSize(10);
  doc.text('Division/Branch: I & M/Jamnagar', margin + 2, lastY + 22);
  doc.text('Sub-Div.: R A', pageWidth / 2, lastY + 22, { align: 'center' });
  doc.text(formattedDate, pageWidth - margin - 2, lastY + 22, { align: 'right' });


  const headerVisualHeight = 42;
  const gap = 5;
  lastY += headerVisualHeight + gap;

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
    startY: lastY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0,0,0] },
    columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 'auto' },
        6: { cellWidth: 'auto' },
        7: { cellWidth: 'auto' },
        8: { cellWidth: 'auto' },
        9: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
        // === FOOTER BLOCK (matches your attached format) ==================
        const footerTopY = pageHeight - 35; 
        const bottomRowY = pageHeight - 12;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        doc.text('Scheduled by Harikrishnan P S', margin + 4, footerTopY);

        const sigLabelX = pageWidth / 2 - 40;
        doc.text('Signature:', sigLabelX, footerTopY);

        if (signatureBase64) {
            doc.addImage(
                signatureBase64,
                'JPEG',
                sigLabelX + 40,
                footerTopY - 14,
                60,
                24
            );
        }

        doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTopY, {
            align: 'right',
        });

        doc.setFontSize(8);
        doc.text(
            'Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020',
            margin,
            bottomRowY
        );
        const pageNumber = doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : (data as any).pageNumber;
        doc.text(
            `Page ${pageNumber}`,
            pageWidth - margin,
            bottomRowY,
            { align: 'right' }
        );
    },
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
