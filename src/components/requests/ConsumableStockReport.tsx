
'use client';
import type { InventoryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useConsumable } from '@/contexts/consumable-provider';

interface ConsumableStockReportProps {}

export default function ConsumableStockReport({}: ConsumableStockReportProps) {
  const { consumableItems } = useConsumable();
  
  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const dailySheet = workbook.addWorksheet('Daily Consumables');
    const jobSheet = workbook.addWorksheet('Job Consumables');

    const headers = [
      { header: 'Item Name', key: 'name', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 50 },
    ];

    dailySheet.columns = headers;
    jobSheet.columns = headers;

    consumableItems.forEach(item => {
        const sheet = item.category === 'Daily Consumable' ? dailySheet : jobSheet;
        sheet.addRow({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            remarks: item.remarks || '',
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Consumable_Stock_Report.xlsx');
  };

  const handleDownloadPdf = async () => {
    const doc = new jsPDF();
    
    const dailyConsumables = consumableItems.filter(item => item.category === 'Daily Consumable');
    const jobConsumables = consumableItems.filter(item => item.category === 'Job Consumable');

    doc.text('Daily Consumables', 14, 15);
    (doc as any).autoTable({
        startY: 20,
        head: [['Item Name', 'Quantity', 'Unit', 'Remarks']],
        body: dailyConsumables.map(item => [item.name, item.quantity, item.unit, item.remarks || '']),
    });

    if (jobConsumables.length > 0) {
        doc.addPage();
        doc.text('Job Consumables', 14, 15);
        (doc as any).autoTable({
            startY: 20,
            head: [['Item Name', 'Quantity', 'Unit', 'Remarks']],
            body: jobConsumables.map(item => [item.name, item.quantity, item.unit, item.remarks || '']),
        });
    }
    
    doc.save('Consumable_Stock_Report.pdf');
  };

  const isDisabled = consumableItems.length === 0;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4"/> Excel</Button>
      <Button variant="outline" onClick={handleDownloadPdf} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4"/> PDF</Button>
    </div>
  );
}
