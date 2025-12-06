
'use client';
import type { InventoryItem } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, isValid, parseISO } from 'date-fns';

interface InventoryReportDownloadsProps {
  items: InventoryItem[];
  isSummary?: boolean;
  summaryData?: any[];
}

export default function InventoryReportDownloads({ items, isSummary = false, summaryData = [] }: InventoryReportDownloadsProps) {
  const { projects } = useAppContext();

  const handleDownloadExcel = () => {
    let dataToExport;
    let worksheet;
    
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'dd-MM-yyyy') : 'N/A';
    }

    if (isSummary) {
      dataToExport = (summaryData || []).map(row => {
        const newRow: {[key: string]: any} = { 'Item Name': row.name };
        projects.forEach(p => {
          newRow[p.name] = row[p.id] || 0;
        });
        newRow['Total'] = row.total;
        return newRow;
      });
      worksheet = XLSX.utils.json_to_sheet(dataToExport);
    } else {
      dataToExport = items.map(item => ({
        'Item Name': item.name,
        'Serial Number': item.serialNumber,
        'Aries ID': item.ariesId || 'N/A',
        'Chest Croll No': item.chestCrollNo || 'N/A',
        'Status': item.status,
        'Location': projects.find(p => p.id === item.projectId)?.name || 'N/A',
        'Plant/Unit': item.plantUnit || 'N/A',
        'Inspection Date': formatDate(item.inspectionDate),
        'Inspection Due Date': formatDate(item.inspectionDueDate),
        'TP Inspection Due Date': formatDate(item.tpInspectionDueDate),
        'Last Updated': formatDate(item.lastUpdated),
        'TP Certificate Link': item.certificateUrl || 'N/A',
        'Inspection Certificate Link': item.inspectionCertificateUrl || 'N/A',
      }));
       worksheet = XLSX.utils.json_to_sheet(dataToExport);
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');
    XLSX.writeFile(workbook, 'Inventory_Report.xlsx');
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
