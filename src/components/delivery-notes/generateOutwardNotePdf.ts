
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { DeliveryNote } from '@/lib/types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Logo not found at ${url}`);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error fetching image for PDF:', error);
      return '';
    }
}


export async function generateOutwardNotePdf(note: DeliveryNote) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 40;

  // ================= HEADER =================
  const logo = await fetchImageAsBase64('/images/Aries_logo.png');
  if (logo) {
    doc.addImage(logo, 'PNG', margin, 30, 90, 25);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(120);
  doc.text('Delivery Note', pageWidth - margin, 45, { align: 'right' });

  // ================= TO / FROM SECTION =================
  doc.setFontSize(9);
  doc.setTextColor(0);

  const topY = 90;

  // To
  doc.setFont('helvetica', 'bold');
  doc.text('To:', margin, topY);

  for (let i = 0; i < 4; i++) {
    doc.line(margin, topY + 10 + i * 12, margin + 180, topY + 10 + i * 12);
  }

  // From
  doc.text('From:', margin + 220, topY);

  for (let i = 0; i < 4; i++) {
    doc.line(margin + 220, topY + 10 + i * 12, margin + 380, topY + 10 + i * 12);
  }

  // Details (Right side)
  const dx = pageWidth - 200;

  doc.text('Delivery Note No.:', dx, topY + 10);
  doc.text('Aries Ref No.:', dx, topY + 25);
  doc.text('Delivery Date:', dx, topY + 40);

  doc.setFont('helvetica', 'normal');
  doc.text(note.deliveryNoteNumber, dx + 100, topY + 10);
  doc.text(note.ariesRefNo || '-', dx + 100, topY + 25);
  doc.text(format(new Date(note.deliveryDate), 'dd-MM-yyyy'), dx + 100, topY + 40);

  // ================= TYPE OF SERVICE =================
  const serviceY = 150;

  doc.setFont('helvetica', 'bold');
  doc.rect(margin, serviceY, pageWidth - 2 * margin, 20);
  doc.text(
    `TYPE OF SERVICE: ${note.serviceType || ''}`,
    margin + 5,
    serviceY + 14
  );

  // ================= TABLE =================
  const tableStartY = serviceY + 20;

  const tableHeight = pageHeight - 300; // FIXED HEIGHT LIKE FORM

  const head = [['Sr. No', 'QUANTITY', 'DESCRIPTION', 'REMARKS']];
  const body = (note.items || []).map((item, i) => [
    i + 1,
    item.quantity,
    item.description,
    item.remarks || '',
  ]);

  (doc as any).autoTable({
    head,
    body,
    startY: tableStartY,
    theme: 'grid',
    tableWidth: pageWidth - 2 * margin,
    margin: { left: margin, right: margin },

    styles: {
      fontSize: 9,
      lineWidth: 0.5,
      lineColor: 0,
      cellPadding: 4,
    },

    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 0,
      halign: 'center',
      fontStyle: 'bold',
    },

    columnStyles: {
      0: { cellWidth: 50, halign: 'center' },
      1: { cellWidth: 80, halign: 'center' },
      2: { cellWidth: 250 },
      3: { cellWidth: 'auto' },
    },

    didDrawPage: (data: any) => {
      // FORCE OUTER BOX (IMPORTANT)
      doc.rect(
        margin,
        tableStartY,
        pageWidth - 2 * margin,
        tableHeight
      );
    },
  });

  // ================= FOOTER =================
  const footerY = pageHeight - 130;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text('Received the above Items', pageWidth - 220, footerY - 10);

  // Left
  doc.setFont('helvetica', 'bold');
  doc.text('Aries Representative', margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.text('Name:', margin, footerY + 20);
  doc.text('Signature:', margin, footerY + 40);
  doc.text('Date:', margin, footerY + 60);

  // Right
  const rightX = pageWidth / 2 + 60;

  doc.setFont('helvetica', 'bold');
  doc.text('Client Representative', rightX, footerY);

  doc.setFont('helvetica', 'normal');
  doc.text('Name:', rightX, footerY + 20);
  doc.text('Signature:', rightX, footerY + 40);
  doc.text('Date:', rightX, footerY + 60);

  // ================= BOTTOM LINE =================
  doc.setFontSize(8);
  doc.setTextColor(120);

  doc.text(
    'Ref.: QHSE/P 11/CL 03/Rev 06/01 Aug 2020',
    margin,
    pageHeight - 20
  );

  doc.text(
    'Page 1 of 1',
    pageWidth - margin,
    pageHeight - 20,
    { align: 'right' }
  );

  // ================= SAVE =================
  doc.save(`Delivery_Note_${note.deliveryNoteNumber}.pdf`);
}
