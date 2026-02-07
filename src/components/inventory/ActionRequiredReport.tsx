

'use client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAppContext } from '@/contexts/app-provider';
import type { InventoryItem } from '@/lib/types';

interface ActionRequiredReportProps {
  notifications: { message: string, item: InventoryItem }[];
}

export default function ActionRequiredReport({ notifications }: ActionRequiredReportProps) {
  const { projects } = useAppContext();

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    const groupedByItemName: { [key: string]: typeof notifications } = {};
    notifications.forEach(n => {
      const itemName = n.item.name;
      if (!groupedByItemName[itemName]) {
        groupedByItemName[itemName] = [];
      }
      groupedByItemName[itemName].push(n);
    });

    for (const itemName in groupedByItemName) {
      const sheet = workbook.addWorksheet(itemName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 31));
      
      const columns = [
        { header: 'Serial Number', key: 'serial', width: 25 },
        { header: 'Aries ID', key: 'ariesId', width: 20 },
      ];

      if (itemName.toLowerCase() === 'harness') {
        columns.push({ header: 'Chest Croll No.', key: 'croll', width: 20 });
      }

      columns.push(
        { header: 'Project Location', key: 'location', width: 30 },
        { header: 'Action Required', key: 'action', width: 50 },
      );
      
      sheet.columns = columns;

      groupedByItemName[itemName].forEach(({ item, message }) => {
        const rowData: any = {
          serial: item.serialNumber,
          ariesId: item.ariesId || 'N/A',
          location: projects.find(p => p.id === item.projectId)?.name || 'N/A',
          action: message,
        };
        if (itemName.toLowerCase() === 'harness') {
          rowData.croll = item.chestCrollNo || 'N/A';
        }
        sheet.addRow(rowData);
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Inventory_Action_Required_Report.xlsx');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text('Inventory - Action Required Report', 14, 15);
    
    (doc as any).autoTable({
        head: [['Item Name', 'Serial No.', 'Croll No.', 'Project', 'Action']],
        body: notifications.map(({ item, message }) => [
            item.name,
            item.serialNumber,
            item.name.toLowerCase() === 'harness' ? item.chestCrollNo || 'N/A' : 'N/A',
            projects.find(p => p.id === item.projectId)?.name || 'N/A',
            message,
        ]),
        startY: 20,
    });
    
    doc.save('Inventory_Action_Required_Report.pdf');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4"/>Excel</Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4"/>PDF</Button>
    </div>
  );
}