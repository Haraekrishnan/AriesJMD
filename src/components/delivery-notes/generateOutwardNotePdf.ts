
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
  doc.text(note.toAddress || '', 50, startY + 12, { maxWidth: 150 });

  // DRAW LINES (MISSING IN YOUR PDF)
  for (let i = 0; i < 4; i++) {
    doc.line(50, startY + 22 + i * 12, 200, startY + 22 + i * 12);
  }

  // FROM
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 250, startY);

  doc.setFont('helvetica', 'normal');
  doc.text(note.fromAddress || '', 250, startY + 12, { maxWidth: 150 });

  // DRAW LINES
  for (let i = 0; i < 4; i++) {
    doc.line(250, startY + 22 + i * 12, 400, startY + 22 + i * 12);
  }


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
  const tableLeft = 40;
  const tableWidth = 515;

  // Draw ONLY TOP LINE (not full box)
  doc.setLineWidth(0.8);
  doc.line(tableLeft, serviceY, tableLeft + tableWidth, serviceY);
  
  // TEXT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TYPE OF SERVICE:', 45, serviceY - 5);
  
  doc.setFont('helvetica', 'normal');
  doc.text(note.serviceType || '', 160, serviceY - 5);


  // ================= PERFECT STATIC TABLE =================

  const tableTop = serviceY;
  const tableHeight = 360;
  
  // Outer box
  doc.setLineWidth(0.8);
  doc.rect(tableLeft, tableTop, tableWidth, tableHeight);
  
  // Column positions (MATCH IMAGE EXACTLY)
  const col1 = tableLeft + 50;   // Sr No
  const col2 = tableLeft + 130;  // Quantity
  const col3 = tableLeft + 395;  // Description end
  
  // Vertical lines
  doc.line(col1, tableTop, col1, tableTop + tableHeight);
  doc.line(col2, tableTop, col2, tableTop + tableHeight);
  doc.line(col3, tableTop, col3, tableTop + tableHeight);
  
  // Header row
  const headerHeight = 20;
  // HEADER LINE (strong like form)
  doc.setLineWidth(1);
  doc.line(tableLeft, tableTop + headerHeight, tableLeft + tableWidth, tableTop + headerHeight);
  
  // Header text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  doc.text('Sr. No', tableLeft + 10, tableTop + 15);
  doc.text('QUANTITY', col1 + 10, tableTop + 15);
  doc.text('DESCRIPTION', col2 + 90, tableTop + 15);
  doc.text('REMARKS', col3 + 20, tableTop + 15);
  
  // FIRST DATA ROW (ONLY ONE LIKE YOUR IMAGE)
  const rowY = tableTop + headerHeight + 20;
  
  doc.setFont('helvetica', 'normal');
  
  if (note.items && note.items.length > 0) {
    const item = note.items[0];
  
    doc.text('1', tableLeft + 15, rowY);
    doc.text(String(item.quantity), col1 + 20, rowY);
    doc.text(item.description || '', col2 + 10, rowY);
    doc.text(item.remarks || '', col3 + 10, rowY);
  }

  // ✅ 8. FOOTER PERFECT ALIGNMENT
  const footerY = pageHeight - 120;

  // Move slightly LEFT (important)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Received the above Items', 330, footerY - 15);

  // LEFT
  doc.setFont('helvetica', 'bold');
  doc.text('Aries Representative', 60, footerY);

  doc.setFont('helvetica', 'normal');
  doc.text('Name:', 60, footerY + 20);
  doc.text('Signature:', 60, footerY + 40);
  doc.text('Date:', 60, footerY + 60);

  // RIGHT
  const rightFooterX = 320; // WAS TOO RIGHT

  doc.setFont('helvetica', 'bold');
  doc.text('Client Representative', rightFooterX, footerY);

  doc.setFont('helvetica', 'normal');
  doc.text('Name:', rightFooterX, footerY + 20);
  doc.text('Signature:', rightFooterX, footerY + 40);
  doc.text('Date:', rightFooterX, footerY + 60);

  // ✅ 9. BOTTOM TEXT EXACT POSITION
  doc.setFontSize(7);
  doc.setTextColor(120);

  doc.text('Ref.: QHSE/P 11/CL 03/Rev 06/01 Aug 2020', 40, pageHeight - 25);
  doc.text('Page 1 of 1', pageWidth - 40, pageHeight - 25, { align: 'right' });


  // ================= SAVE =================
  doc.save(`Delivery_Note_${note.deliveryNoteNumber}.pdf`);
}
