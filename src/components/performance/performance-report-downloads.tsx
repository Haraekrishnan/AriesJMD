'use client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PerformanceReportDownloadsProps {
  data: any[];
}

export default function PerformanceReportDownloads({ data }: PerformanceReportDownloadsProps) {
  
  const handleDownloadExcel = () => {
    const dataToExport = data.map(user => ({
      'Employee': user.name,
      'Role': user.role,
      'To Do': user.todo,
      'In Progress': user.inProgress,
      'Completed': user.completed,
      'Overdue': user.overdue,
      'Planning Score': user.planningScore,
      'Total Assigned': user.total,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance Report');
    XLSX.writeFile(workbook, 'Performance_Report.xlsx');
  };

  const handleDownloadPdf = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    doc.text('Performance Analysis Report', 14, 16);
    
    (doc as any).autoTable({
      head: [['Employee', 'Role', 'To Do', 'In Progress', 'Completed', 'Overdue', 'Planning', 'Total']],
      body: data.map(user => [
        user.name,
        user.role,
        user.todo,
        user.inProgress,
        user.completed,
        user.overdue,
        user.planningScore,
        user.total,
      ]),
      startY: 20,
    });
    
    doc.save('Performance_Report.pdf');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={data.length === 0}>
        <FileDown className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button variant="outline" onClick={handleDownloadPdf} disabled={data.length === 0}>
        <FileDown className="mr-2 h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
