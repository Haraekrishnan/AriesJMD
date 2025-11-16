
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

async function fetchImageAsBase64(url: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  } catch (error) {
    console.error("Error fetching image for PDF:", error);
    return "";
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

  // === LOGO =============================================================
  try {
    const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 10, 8, 25, 12);
    }
  } catch (error) {
    console.error("PDF logo error:", error);
  }

  // === HEADER ===========================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ARIES', 40, 18);

  doc.setFontSize(16);
  doc.text('Job Schedule', pageWidth - 10, 18, { align: 'right' });

  doc.setDrawColor(0);
  doc.line(10, 22, pageWidth - 10, 22);

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Division/Branch: I & M / Jamnagar', 10, 28);
  doc.text(`Sub-Div.: R A ${formattedDate}`, 120, 28);

  doc.text(`Project/ Vessel’s name: ${projectName}`, 10, 34);
  doc.text(`Date: ${formattedDate}`, pageWidth - 10, 34, { align: 'right' });

  doc.setLineWidth(0.2);
  doc.line(10, 38, pageWidth - 10, 38);

  // === TABLE COLUMNS ====================================================
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

  const bodyRows = (schedule?.items || []).map((item, index) => [
    index + 1,
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
    startY: 42,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.5,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: 0,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 40 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 35 },
      5: { cellWidth: 25 },
      6: { cellWidth: 20 },
      7: { cellWidth: 30 },
      8: { cellWidth: 18 },
      9: { cellWidth: 40 },
    },
  });

  // === FOOTER ===========================================================
  const finalY = (doc as any).lastAutoTable.finalY || pageHeight - 20;

  const footerY = pageHeight - 10;
  
  doc.setFontSize(8);
  doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', 10, footerY);
  doc.text('Page 1 of 1', pageWidth - 10, footerY, { align: 'right' });

  const schedY = footerY - 6;

  doc.setFontSize(9);
  doc.text('Scheduled by: ____________________', 10, schedY);
  doc.text('Signature: ____________________', pageWidth / 2, schedY);
  doc.text(`Date: ${formattedDate}`, pageWidth - 10, schedY, { align: 'right' });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
