'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { DeliveryNote } from '@/lib/types';

export function generateOutwardNotePdf(note: DeliveryNote) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVERY NOTE', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  // Company Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ARIES MARINE & ENGINEERING SERVICES', 40, 60);
  doc.text('P.O.Box: 24428, Sharjah, U.A.E', 40, 70);
  doc.text('Tel: +971 6 5503300, Fax: +971 6 5503100', 40, 80);
  doc.text('Email: info@ariesmar.com', 40, 90);
  
  // Note Details
  doc.autoTable({
    startY: 110,
    body: [
      [{ content: `Delivery Note No: ${note.deliveryNoteNumber}`, styles: { fontStyle: 'bold' } }],
      [{ content: `Aries Ref. No: ${note.ariesRefNo || 'N/A'}` }],
      [{ content: `Date: ${format(new Date(note.deliveryDate), 'dd-MM-yyyy')}` }],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // To/From Address
  doc.autoTable({
    startY: finalY,
    body: [
      [
        { content: `To:\n${note.toAddress}`, styles: { fontStyle: 'bold' } },
        { content: `From:\n${note.fromAddress}`, styles: { fontStyle: 'bold' } }
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 5, minCellHeight: 50, valign: 'top' },
  });
  finalY = (doc as any).lastAutoTable.finalY + 20;

  // Items Table
  doc.autoTable({
    startY: finalY,
    head: [['Sr. No.', 'Description of Goods', 'Qty', 'Remarks']],
    body: note.items?.map((item, index) => [
      index + 1,
      item.description,
      item.quantity,
      item.remarks || ''
    ]),
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fontStyle: 'bold', fillColor: [230,230,230] },
    columnStyles: {
        0: { halign: 'center', cellWidth: 40 },
        1: { cellWidth: 250 },
        2: { halign: 'center', cellWidth: 50 },
    }
  });
  finalY = (doc as any).lastAutoTable.finalY;

  // Footer
  finalY += 40;
  doc.text('For ARIES MARINE & ENGG SERVICES', 40, finalY);
  finalY += 60;
  doc.line(40, finalY, 180, finalY);
  doc.text('Authorized Signatory', 40, finalY + 10);
  
  doc.line(pageWidth - 180, finalY, pageWidth - 40, finalY);
  doc.text('Received By', pageWidth - 110, finalY + 10, { align: 'center' });

  doc.save(`Delivery_Note_${note.deliveryNoteNumber}.pdf`);
}
