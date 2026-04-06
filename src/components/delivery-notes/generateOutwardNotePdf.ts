'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { DeliveryNote } from '@/lib/types';

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
  let currentY = margin;

  // 1. Header
  const logoBase64 = await fetchImageAsBase64('/images/Aries_logo.png');
  if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', margin, currentY - 10, 100, 25);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(128, 128, 128); // Grey color
  doc.text('Delivery Note', pageWidth - margin, currentY + 5, { align: 'right' });
  
  currentY += 60;

  // 2. To/From and Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // To Address
  doc.setFont('helvetica', 'bold');
  doc.text('To:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  const toLines = doc.splitTextToSize(note.toAddress, 200);
  doc.text(toLines, margin + 5, currentY + 15);
  // Draw lines under "To:"
  for (let i = 0; i < 4; i++) {
    doc.line(margin, currentY + 28 + (i * 12), margin + 200, currentY + 28 + (i * 12));
  }
  
  const toSectionHeight = toLines.length * 12 + 4 * 12;

  // From Address
  doc.setFont('helvetica', 'bold');
  doc.text('From:', margin + 240, currentY);
  doc.setFont('helvetica', 'normal');
  const fromLines = doc.splitTextToSize(note.fromAddress, 150);
  doc.text(fromLines, margin + 240 + 5, currentY + 15);
   // Draw lines under "From:"
  for (let i = 0; i < 4; i++) {
    doc.line(margin + 240, currentY + 28 + (i * 12), margin + 240 + 150, currentY + 28 + (i * 12));
  }

  // Delivery Details (right of From)
  const detailsX = margin + 420;
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Note No.:', detailsX, currentY + 15);
  doc.text('Aries Ref No.:', detailsX, currentY + 30);
  doc.text('Delivery Date:', detailsX, currentY + 45);

  doc.setFont('helvetica', 'normal');
  doc.text(note.deliveryNoteNumber, detailsX + 95, currentY + 15);
  doc.text(note.ariesRefNo || 'N/A', detailsX + 95, currentY + 30);
  doc.text(format(new Date(note.deliveryDate), 'dd-MM-yyyy'), detailsX + 95, currentY + 45);


  currentY += toSectionHeight + 25;

  // 3. Type of Service
  doc.autoTable({
    startY: currentY,
    body: [[{ content: `TYPE OF SERVICE: ${note.serviceType || 'N/A'}`, styles: { fontStyle: 'bold' } }]],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2, lineWidth: 0.5, lineColor: 0 },
    didDrawCell: (data) => {
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height)
    }
  });


  currentY = (doc as any).lastAutoTable.finalY;

  // 4. Items Table
  const head = [['Sr. No', 'QUANTITY', 'DESCRIPTION', 'REMARKS']];
  const body = (note.items || []).map((item, index) => [
    index + 1,
    item.quantity,
    item.description,
    item.remarks || ''
  ]);
  
  const footerAndRefHeight = 150;
  const tableBottomY = pageHeight - footerAndRefHeight;
  const tableHeight = tableBottomY - currentY;
  
  doc.autoTable({
      head: head,
      body: body,
      startY: currentY,
      theme: 'grid',
      headStyles: {
          fillColor: [220, 220, 220],
          textColor: 0,
          fontStyle: 'bold',
          halign: 'center'
      },
      styles: {
          fontSize: 9,
          cellPadding: 4,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          valign: 'top',
      },
      columnStyles: {
          0: { cellWidth: 40, halign: 'center' }, 
          1: { cellWidth: 60, halign: 'center' },
          2: { cellWidth: 250 }, 
          3: { cellWidth: 'auto' }, 
      },
      didDrawPage: (data) => {
          // Draw a box to represent the full height of the table area
          doc.setDrawColor(0);
          doc.rect(data.settings.margin.left, currentY, data.table.getWidth(), tableHeight);
      }
  });

  // 5. Footer
  const footerY = pageHeight - 110;
  const leftX = margin;
  const rightX = pageWidth / 2 + 60;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text('Received the above Items', rightX, footerY - 15);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Aries Representative', leftX, footerY);
  doc.text('Client Representative', rightX, footerY);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Name:', leftX, footerY + 20);
  doc.text('Signature:', leftX, footerY + 40);
  doc.text('Date:', leftX, footerY + 60);
  
  doc.text('Name:', rightX, footerY + 20);
  doc.text('Signature:', rightX, footerY + 40);
  doc.text('Date:', rightX, footerY + 60);

  // 6. Page bottom
  const bottomY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Ref.: QHSE/P 11/CL 03/Rev 06/01 Aug 2020', margin, bottomY);
  doc.text(`Page 1 of 1`, pageWidth - margin, bottomY, { align: 'right' });

  doc.save(`Delivery_Note_${note.deliveryNoteNumber}.pdf`);
}
