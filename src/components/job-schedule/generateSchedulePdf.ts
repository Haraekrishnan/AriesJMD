
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
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.statusText}`);
      return "";
    }
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;

  // --- Header ---
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  // Top blue bar
  doc.setFillColor(221, 233, 255); // A light blue color similar to the image
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Logo
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 12, 100, 25);
  }

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Schedule', pageWidth / 2, 35, { align: 'center' });

  // Second header row
  doc.setLineWidth(1);
  doc.line(margin, 52, pageWidth - margin, 52);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Division/Branch:', margin, 62);
  doc.setFont('helvetica', 'normal');
  doc.text('I & M / Jamnagar', margin + 75, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Div.:', pageWidth / 2 - 50, 62, { align: 'left'});
  doc.setFont('helvetica', 'normal');
  doc.text('R A', pageWidth / 2 - 15, 62);
  
  doc.setFont('helvetica', 'normal');
  doc.text(formattedDate, pageWidth - margin, 62, { align: 'right' });
  
  doc.line(margin, 68, pageWidth - margin, 68);


  // --- Table ---
  const headRow = [
    'Sr. No', 'Name', 'Job Type', 'Job No.', "Project/Vessel's name",
    'Location', 'Reporting Time', 'Client / Contact Person Number', 'Vehicle', 'Special instruction/Remarks',
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
    startY: 72,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 100 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 100 },
        5: { cellWidth: 80 },
        6: { cellWidth: 60 },
        7: { cellWidth: 100 },
        8: { cellWidth: 50 },
        9: { cellWidth: 'auto' },
    },
    didDrawPage: function (data) {
        // --- Footer ---
        const footerY = pageHeight - 20;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020', margin, footerY);
        doc.text(`Page ${data.pageNumber}`, pageWidth - margin, footerY, { align: 'right' });
        
        const sigY = footerY - 15;
        doc.text('Scheduled by: ____________________', margin, sigY);
        doc.text('Signature: ____________________', pageWidth / 2 - 50, sigY);
        doc.text(`Date: ${formattedDate}`, pageWidth - margin, sigY, { align: 'right' });
    }
  });

  doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
