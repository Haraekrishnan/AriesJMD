
'use client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { JobProgress, SorItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface AbstractSheetData {
  plantRegNo?: string;
  arcOtcWoNo?: string;
  sorItems: SorItem[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error fetching image for Excel:', error);
      return null;
    }
}

export async function generateAbstractSheetExcel(job: JobProgress, data: AbstractSheetData) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Abstract Sheet');
    
    // Header section logic here (merging cells, adding titles, images)
    
    // ...

    // For now, a simple structure
    worksheet.columns = [
        { header: 'Aries Job#', key: 'ariesJobId', width: 15 },
        { header: 'RIL Approved Quantity', key: 'rilApprovedQuantity', width: 15 },
        { header: 'Item Code', key: 'itemCode', width: 15 },
        { header: 'Scope Description', key: 'scopeDescription', width: 50 },
        { header: 'UOM', key: 'uom', width: 10 },
        { header: 'Unit Rate', key: 'unitRate', width: 15 },
        { header: 'Total Amount', key: 'total', width: 15 },
    ];
    
    data.sorItems.forEach(item => {
        worksheet.addRow({
            ...item,
            total: item.rilApprovedQuantity * item.unitRate
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Abstract_Sheet_${job.jmsNo || job.id.slice(-6)}.xlsx`);
}


export async function generateAbstractSheetPdf(job: JobProgress, data: AbstractSheetData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  
  // Header and styling logic here
  
  // ...
  
  (doc as any).autoTable({
    head: [['Aries Job#', 'Qty', 'Item Code', 'Scope Description', 'UOM', 'Unit Rate', 'Total Amount']],
    body: data.sorItems.map(item => [
      item.ariesJobId,
      item.rilApprovedQuantity,
      item.itemCode,
      item.scopeDescription,
      item.uom,
      formatCurrency(item.unitRate),
      formatCurrency(item.rilApprovedQuantity * item.unitRate)
    ]),
  });
  
  doc.save(`Abstract_Sheet_${job.jmsNo || job.id.slice(-6)}.pdf`);
}
