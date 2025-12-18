
'use client';
import type { InventoryItem } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, isValid, parseISO } from 'date-fns';

interface InventoryReportDownloadsProps {
  items: InventoryItem[];
  isSummary?: boolean;
  summaryData?: any[];
}

export default function InventoryReportDownloads({ items, isSummary = false, summaryData = [] }: InventoryReportDownloadsProps) {
  const { projects } = useAppContext();

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Aries Marine';
    workbook.created = new Date();

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'dd-MM-yyyy') : 'N/A';
    }

    if (isSummary) {
      const worksheet = workbook.addWorksheet('Inventory Summary');
      
      const headerRow = ['Item Name', ...projects.map(p => p.name), 'Total'];
      worksheet.addRow(headerRow).eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } };
          cell.alignment = { horizontal: 'center' };
      });
      
      (summaryData || []).forEach(row => {
        const rowData: (string | number)[] = [row.name];
        projects.forEach(p => {
          rowData.push(row[p.id] || 0);
        });
        rowData.push(row.total);
        worksheet.addRow(rowData);
      });
      
      worksheet.columns.forEach(column => {
        let max_width = 15;
        if(column.values) {
          column.values.forEach(value => {
            if(value) {
                const column_width = String(value).length;
                if (column_width > max_width) {
                  max_width = column_width;
                }
            }
          });
        }
        column.width = max_width + 2;
      });

    } else {
      const groupedItems: { [key: string]: InventoryItem[] } = {};
      items.forEach(item => {
        if (!groupedItems[item.name]) {
          groupedItems[item.name] = [];
        }
        groupedItems[item.name].push(item);
      });

      for (const itemName in groupedItems) {
        const sheetName = itemName.replace(/[\\/*?:]/g, "").substring(0, 31);
        const worksheet = workbook.addWorksheet(sheetName);

        const headerRow = [
          'Item Name', 'Serial Number', 'Aries ID', 'ERP ID', 'Certification', 'Purchase Date', 'Chest Croll No',
          'Status', 'Location', 'Plant/Unit', 'Inspection Date', 'Inspection Due Date', 'TP Inspection Due Date',
          'Last Updated', 'TP Certificate Link', 'Inspection Certificate Link'
        ];
        
        worksheet.addRow(headerRow).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007BFF' } };
        });

        groupedItems[itemName].forEach(item => {
           worksheet.addRow([
              item.name,
              item.serialNumber,
              item.ariesId || 'N/A',
              item.erpId || 'N/A',
              item.certification || 'N/A',
              formatDate(item.purchaseDate),
              item.chestCrollNo || 'N/A',
              item.status,
              projects.find(p => p.id === item.projectId)?.name || 'N/A',
              item.plantUnit || 'N/A',
              formatDate(item.inspectionDate),
              formatDate(item.inspectionDueDate),
              formatDate(item.tpInspectionDueDate),
              formatDate(item.lastUpdated),
              item.certificateUrl || 'N/A',
              item.inspectionCertificateUrl || 'N/A',
           ]);
        });
        
        worksheet.columns.forEach(column => {
          let max_width = 15;
          if(column.values) {
            column.values.forEach(value => {
                if(value) {
                    const column_width = String(value).length;
                    if (column_width > max_width) {
                      max_width = column_width;
                    }
                }
            });
          }
          column.width = max_width < 15 ? 15 : max_width + 2;
        });
      }
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Inventory_Report.xlsx');
  };

  const handleDownloadPdf = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Inventory Report', 14, 16);

    if (isSummary) {
      const head = [['Item Name', ...projects.map(p => p.name), 'Total']];
      const body = (summaryData || []).map(row => {
          const rowData: (string | number)[] = [row.name];
          projects.forEach(p => {
            rowData.push(row[p.id] || 0);
          });
          rowData.push(row.total);
          return rowData;
      });
       (doc as any).autoTable({ head, body, startY: 20 });
    } else {
      (doc as any).autoTable({
        head: [['Item Name', 'Serial No.', 'Status', 'Location', 'Insp. Due', 'TP Insp. Due', 'Last Updated']],
        body: items.map(item => [
          item.name,
          item.serialNumber,
          item.status,
          projects.find(p => p.id === item.projectId)?.name || 'N/A',
          item.inspectionDueDate ? format(new Date(item.inspectionDueDate), 'dd-MM-yyyy') : 'N/A',
          item.tpInspectionDueDate ? format(new Date(item.tpInspectionDueDate), 'dd-MM-yyyy') : 'N/A',
          item.lastUpdated ? format(new Date(item.lastUpdated), 'dd-MM-yyyy') : 'N/A'
        ]),
        startY: 20,
      });
    }

    doc.save('Inventory_Report.pdf');
  };
  
  const isDisabled = isSummary ? (!summaryData || summaryData.length === 0) : (!items || items.length === 0);

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
      <Button variant="outline" onClick={handleDownloadPdf} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
    </div>
  );
}
