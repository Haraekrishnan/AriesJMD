
'use client';
import type { InventoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ConsumableReportDownloadsProps {
  dailyConsumables: InventoryItem[];
  jobConsumables: InventoryItem[];
}

export default function ConsumableReportDownloads({ dailyConsumables, jobConsumables }: ConsumableReportDownloadsProps) {

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    const addSheet = (sheetName: string, data: InventoryItem[]) => {
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.columns = [
        { header: 'Item Name', key: 'name', width: 40 },
        { header: 'Quantity', key: 'quantity', width: 15 },
        { header: 'Unit', key: 'unit', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 50 },
      ];
      worksheet.addRows(data);
    };

    addSheet('Daily Consumables', dailyConsumables);
    addSheet('Job Consumables', jobConsumables);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Consumables_Report.xlsx');
  };

  const handleDownloadPdf = async () => {
    const doc = new jsPDF();
    
    const addTableToPdf = (title: string, data: InventoryItem[], startY: number) => {
        doc.text(title, 14, startY);
        (doc as any).autoTable({
            startY: startY + 5,
            head: [['Item Name', 'Quantity', 'Unit', 'Remarks']],
            body: data.map(item => [item.name, item.quantity, item.unit, item.remarks]),
        });
        return (doc as any).lastAutoTable.finalY;
    }
    
    const dailyFinalY = addTableToPdf('Daily Consumables', dailyConsumables, 20);
    addTableToPdf('Job Consumables', jobConsumables, dailyFinalY + 15);
    
    doc.save('Consumables_Report.pdf');
  };

  const isDisabled = dailyConsumables.length === 0 && jobConsumables.length === 0;

  return (
    <>
      <Button variant="outline" onClick={handleDownloadExcel} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4"/> Excel</Button>
      <Button variant="outline" onClick={handleDownloadPdf} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4"/> PDF</Button>
    </>
  );
}
