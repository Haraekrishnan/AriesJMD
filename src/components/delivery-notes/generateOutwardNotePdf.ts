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

  // ✅ 1. ADD FULL PAGE BORDER (VERY IMPORTANT)
  doc.setLineWidth(1);
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

  // ✅ 2. FIX HEADER ALIGNMENT
  const logo = await fetchImageAsBase64('/images/Aries_logo.png');
  if (logo) {
    doc.addImage(logo, 'PNG', 30, 30, 100, 30);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(120);
  doc.text('Delivery Note', pageWidth - 60, 45, { align: 'right' });


  // ✅ 3. FIX TO / FROM PERFECTLY
  const startY = 90;
  doc.setFontSize(9);
  doc.setTextColor(0);

  // TO
  doc.setFont('helvetica', 'bold');
  doc.text('To:', 50, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(note.toAddress, 50, startY + 12, { maxWidth: 150 });


  // FROM
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 250, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(note.fromAddress, 250, startY + 12, { maxWidth: 150 });


  // ✅ 4. FIX RIGHT DETAILS (CRITICAL ALIGNMENT)
  const rightX = 420;

  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Note No.:', rightX, startY + 12);
  doc.text('Aries Ref No.:', rightX, startY + 26);
  doc.text('Delivery Date:', rightX, startY + 40);

  doc.setFont('helvetica', 'normal');
  doc.text(note.deliveryNoteNumber, rightX + 110, startY + 12);
  doc.text(note.ariesRefNo || '-', rightX + 110, startY + 26);
  doc.text(format(new Date(note.deliveryDate), 'dd-MM-yyyy'), rightX + 110, startY + 40);

  // ✅ 5. TYPE OF SERVICE (MATCH BOX STYLE)
  const serviceY = 150;

  doc.setLineWidth(0.8);
  doc.rect(40, serviceY, pageWidth - 80, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TYPE OF SERVICE:', 45, serviceY + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(note.serviceType || '', 160, serviceY + 12);


  // ================= TABLE =================
  const tableStartY = serviceY + 18;

  (doc as any).autoTable({
    startY: tableStartY,
  
    // ✅ FORCE TABLE POSITION (VERY IMPORTANT)
    margin: { left: 40 },
  
    tableWidth: 515, // EXACT WIDTH (A4 - margins)
  
    head: [['Sr. No', 'QUANTITY', 'DESCRIPTION', 'REMARKS']],
  
    body: (note.items || []).map((item, i) => [
      i + 1,
      item.quantity,
      item.description || '',
      item.remarks || '',
    ]),
  
    theme: 'grid',
  
    styles: {
      fontSize: 9,
      lineWidth: 0.5,
      lineColor: [0, 0, 0],
      cellPadding: 3,
      valign: 'middle',
      overflow: 'linebreak',
    },
  
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: 0,
      halign: 'center',
      valign: 'middle',
      fontStyle: 'bold',
    },
  
    // 🔥 LOCK COLUMN WIDTHS (THIS FIXES YOUR ISSUE)
    columnStyles: {
      0: { cellWidth: 50, halign: 'center' },   // Sr No
      1: { cellWidth: 80, halign: 'center' },   // Quantity
      2: { cellWidth: 275, halign: 'left' },    // Description
      3: { cellWidth: 110, halign: 'left' },    // Remarks
    },
  
    didDrawPage: () => {
      // OUTER BOX EXACT MATCH
      doc.setLineWidth(0.8);
      doc.rect(40, tableStartY, 515, 360);
    }
  });
  

  // ✅ 8. FOOTER PERFECT ALIGNMENT
  const footerY = pageHeight - 120;

  // Received text (slightly right)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Received the above Items', 360, footerY - 10);

  // LEFT
  doc.setFont('helvetica', 'bold');
  doc.text('Aries Representative', 60, footerY);

  doc.setFont('helvetica', 'normal');
  doc.text('Name:', 60, footerY + 20);
  doc.text('Signature:', 60, footerY + 40);
  doc.text('Date:', 60, footerY + 60);

  // RIGHT
  doc.setFont('helvetica', 'bold');
  doc.text('Client Representative', 330, footerY);

  doc.setFont('helvetica', 'normal');
  doc.text('Name:', 330, footerY + 20);
  doc.text('Signature:', 330, footerY + 40);
  doc.text('Date:', 330, footerY + 60);

  // ✅ 9. BOTTOM TEXT EXACT POSITION
  doc.setFontSize(7);
  doc.setTextColor(120);

  doc.text('Ref.: QHSE/P 11/CL 03/Rev 06/01 Aug 2020', 40, pageHeight - 25);
  doc.text('Page 1 of 1', pageWidth - 40, pageHeight - 25, { align: 'right' });


  // ================= SAVE =================
  doc.save(`Delivery_Note_${note.deliveryNoteNumber}.pdf`);
}
