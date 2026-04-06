'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
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

  // 1. ADD FULL PAGE BORDER
  doc.setLineWidth(1);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  // 2. HEADER
  const logo = await fetchImageAsBase64('/images/Aries_logo.png');
  if (logo) {
    doc.addImage(logo, 'PNG', 30, 30, 100, 30);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(120);
  doc.text('Delivery Note', pageWidth - 60, 45, { align: 'right' });

  // 3. TO / FROM SECTION
  const startY = 90;
  doc.setFontSize(9);
  doc.setTextColor(0);

  // TO
  doc.setFont('helvetica', 'bold');
  doc.text('To:', 50, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(note.toAddress || '', 50, startY + 12, { maxWidth: 150 });

  // FROM
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 250, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(note.fromAddress || '', 250, startY + 12, { maxWidth: 150 });

  // TO/FROM LINES
  const lineStartY = startY + 25;
  for (let i = 0; i < 5; i++) {
    doc.line(50, lineStartY + i * 12, 210, lineStartY + i * 12);
  }
  for (let i = 0; i < 5; i++) {
    doc.line(250, lineStartY + i * 12, 410, lineStartY + i * 12);
  }
  
  // RIGHT SIDE DETAILS
  const rightX = 400;
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Note No.:', rightX, startY + 10);
  doc.text('Aries Ref No.:', rightX, startY + 25);
  doc.text('Delivery Date:', rightX, startY + 40);
  
  doc.setFont('helvetica', 'normal');
  doc.text(note.deliveryNoteNumber, rightX + 120, startY + 10);
  doc.text(note.ariesRefNo || '-', rightX + 120, startY + 25);
  doc.text(format(new Date(note.deliveryDate), 'dd-MM-yyyy'), rightX + 120, startY + 40);


  // 4. TYPE OF SERVICE (SEPARATE BOX)
  const serviceY = 155;
  doc.setLineWidth(0.8);
  doc.rect(40, serviceY, 515, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TYPE OF SERVICE:', 45, serviceY + 14);

  doc.setFont('helvetica', 'normal');
  doc.text(note.serviceType || '', 160, serviceY + 14);
  
  // 5. MANUAL TABLE DRAWING
  const tableTop = serviceY + 22;
  const tableLeft = 40;
  const tableWidth = 515;
  const headerHeight = 25;
  const tableHeight = 360;

  // Header Box
  doc.setLineWidth(0.8);
  doc.rect(tableLeft, tableTop, tableWidth, headerHeight);

  // Column positions
  const col1 = tableLeft + 60;
  const col2 = tableLeft + 170;
  const col3 = tableLeft + 430;

  // Vertical header lines
  doc.line(col1, tableTop, col1, tableTop + headerHeight);
  doc.line(col2, tableTop, col2, tableTop + headerHeight);
  doc.line(col3, tableTop, col3, tableTop + headerHeight);
  
  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Sr. No', tableLeft + 10, tableTop + 17);
  doc.text('QUANTITY', col1 + 10, tableTop + 17);
  doc.text('DESCRIPTION', col2 + 90, tableTop + 17);
  doc.text('REMARKS', col3 + 15, tableTop + 17);

  // Main Table Body Box
  doc.rect(tableLeft, tableTop + headerHeight, tableWidth, tableHeight);

  // Vertical body lines
  doc.line(col1, tableTop + headerHeight, col1, tableTop + headerHeight + tableHeight);
  doc.line(col2, tableTop + headerHeight, col2, tableTop + headerHeight + tableHeight);
  doc.line(col3, tableTop + headerHeight, col3, tableTop + headerHeight + tableHeight);

  // First Row Data
  const rowY = tableTop + headerHeight + 20;
  if (note.items?.length) {
      const item = note.items[0];
      doc.setFont('helvetica', 'normal');
      doc.text('1', tableLeft + 20, rowY);
      doc.text(String(item.quantity), col1 + 20, rowY);
      doc.text(item.description || '', col2 + 10, rowY);
      doc.text(item.remarks || '', col3 + 10, rowY);
  }

  // 6. FOOTER
  const footerY = pageHeight - 120;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Received the above Items', 330, footerY - 15);

  // Left
  doc.setFont('helvetica', 'bold');
  doc.text('Aries Representative', 60, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text('Name:', 60, footerY + 20);
  doc.text('Signature:', 60, footerY + 40);
  doc.text('Date:', 60, footerY + 60);

  // Right
  const rightFooterX = 320;
  doc.setFont('helvetica', 'bold');
  doc.text('Client Representative', rightFooterX, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text('Name:', rightFooterX, footerY + 20);
  doc.text('Signature:', rightFooterX, footerY + 40);
  doc.text('Date:', rightFooterX, footerY + 60);

  // 7. BOTTOM LINE
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Ref.: QHSE/P 11/CL 03/Rev 06/01 Aug 2020', 40, pageHeight - 25);
  doc.text('Page 1 of 1', pageWidth - 40, pageHeight - 25, { align: 'right' });

  // 8. SAVE
  doc.save(`Delivery_Note_${note.deliveryNoteNumber}.pdf`);
}
