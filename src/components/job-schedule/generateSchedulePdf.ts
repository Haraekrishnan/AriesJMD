
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
  const margin = 28;

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');

  const headRow = [
    'Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name",
    'Location', 'Reporting Time', 'Client / Contact Person Number', 'Vehicle', 'Special instruction/Remarks',
  ];

  const bodyRows = (schedule?.items || []).map((item, i) => [
    i + 1,
    Array.isArray(item.manpowerIds) ? item.manpowerIds.join(',\n') : '',
    item.jobType || '',
    item.jobNo || '',
    item.projectVesselName || '',
    item.location || '',
    item.reportingTime || '',
    item.clientContact || '',
    item.vehicleId && item.vehicleId !== 'none' ? item.vehicleId : 'N/A',
    item.remarks || '',
  ]);

  const headerBoxHeight = 42;
  const tableStartY = margin + headerBoxHeight + 5; // Fixed start position for the table

  doc.autoTable({
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    margin: { top: tableStartY },
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
        0: { cellWidth: 25 },
        1: { cellWidth: 65 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 70 },
        5: { cellWidth: 50 },
        6: { cellWidth: 35, halign: 'center' },
        7: { cellWidth: 55 },
        8: { cellWidth: 30, halign: 'center' },
        9: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      // === HEADER SECTION ======================================================
      const headerStartY = margin;
      const contentStartY = headerStartY + 2;
      
      doc.setLineWidth(0.2);
      doc.setDrawColor(0);

      // Outer box
      doc.rect(margin, headerStartY, pageWidth - margin * 2, headerBoxHeight); 
      
      // Divider line
      const lineY = contentStartY + 20;
      doc.line(margin, lineY, pageWidth - margin, lineY);

      // Logo
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin + 5, contentStartY, 80, 18);
      }

      // "Job Schedule" Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Job Schedule', pageWidth / 2, contentStartY + 12, { align: 'center' });
      
      // Sub-header text
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Division/Branch: I & M / Jamnagar', margin + 5, lineY + 12);
      doc.text('Sub-Div.: R.A', pageWidth / 2, lineY + 12, { align: 'center' });
      doc.text(formattedDate, pageWidth - margin - 5, lineY + 12, { align: 'right' });
      
      // === FOOTER SECTION =======================================================
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerTop = pageHeight - 40;
      const bottomRowY = pageHeight - 20;
      doc.setLineWidth(0.2);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Scheduled by:', margin, footerTop);

      doc.text('Signature:', pageWidth / 2 - 20, footerTop);
      doc.line(pageWidth / 2 + 20, footerTop, pageWidth / 2 + 80, footerTop);

      doc.text(`Date: ${formattedDate}`, pageWidth - margin, footerTop, { align: 'right' });

      doc.setFontSize(8);
      doc.line(margin, bottomRowY - 5, pageWidth - margin, bottomRowY - 5);
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
