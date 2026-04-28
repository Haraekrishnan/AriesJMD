
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
  ariesJobId?: string;
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
    
    worksheet.addRow([`Aries Job#: ${data.ariesJobId || 'N/A'}`]);
    worksheet.mergeCells('A1:G1');
    worksheet.getCell('A1').font = { bold: true };
    worksheet.addRow([]);


    // For now, a simple structure
    worksheet.columns = [
        { header: 'Qty Planned', key: 'qtyPlanned', width: 15 },
        { header: 'Qty Executed', key: 'qtyExecuted', width: 15 },
        { header: 'EIC Approved Qty', key: 'eicApprovedQty', width: 18 },
        { header: 'Service Code', key: 'serviceCode', width: 15 },
        { header: 'Service Description', key: 'serviceDescription', width: 50 },
        { header: 'UOM', key: 'uom', width: 10 },
        { header: 'Rate', key: 'rate', width: 15 },
        { header: 'Total Amount', key: 'total', width: 15 },
        { header: 'Work Permit No', key: 'workPermitNo', width: 20 },
        { header: 'PM Work Order No', key: 'pmWorkOrderNo', width: 20 },
        { header: 'Date Work Completed', key: 'dateWorkCompleted', width: 20 },
        { header: 'Provision', key: 'provision', width: 20 },
        { header: 'Remarks', key: 'remarks', width: 30 },
    ];
    
    data.sorItems.forEach(item => {
        worksheet.addRow({
            ...item,
            total: (item.qtyExecuted || 0) * (item.rate || 0),
            dateWorkCompleted: item.dateWorkCompleted ? format(parseISO(item.dateWorkCompleted), 'dd-MM-yyyy') : '',
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Abstract_Sheet_${job.jmsNo || job.id.slice(-6)}.xlsx`);
}


export async function generateAbstractSheetPdf(job: JobProgress, data: AbstractSheetData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  
  doc.text(`Aries Job #: ${data.ariesJobId || 'N/A'}`, 14, 15);
  
  (doc as any).autoTable({
    head: [['Code', 'Description', 'UOM', 'Rate', 'Planned Qty', 'Executed Qty', 'Total']],
    body: data.sorItems.map(item => [
      item.serviceCode,
      item.serviceDescription,
      item.uom,
      formatCurrency(item.rate),
      item.qtyPlanned || 0,
      item.qtyExecuted || 0,
      formatCurrency((item.qtyExecuted || 0) * (item.rate || 0))
    ]),
    startY: 25,
  });
  
  doc.save(`Abstract_Sheet_${job.jmsNo || job.id.slice(-6)}.pdf`);
}
