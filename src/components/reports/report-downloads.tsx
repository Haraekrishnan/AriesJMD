
'use client';
import type { Task } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ReportDownloadsProps {
  tasks: Task[];
}

export default function ReportDownloads({ tasks }: ReportDownloadsProps) {
  const { users } = useAppContext();

  const handleDownloadExcel = () => {
    const dataToExport = tasks.map(task => ({
      'Task Title': task.title,
      'Assignee': task.assigneeIds && task.assigneeIds.length > 0 ? users.find(u => u.id === task.assigneeIds[0])?.name || 'N/A' : 'N/A',
      'Status': task.status,
      'Priority': task.priority,
      'Due Date': task.dueDate ? format(new Date(task.dueDate), 'dd-MM-yyyy') : 'N/A',
      'Description': task.description,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks Report');
    XLSX.writeFile(workbook, 'AriesMarine_Report.xlsx');
  };

  const handleDownloadPdf = async () => {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');

    const doc = new jsPDF();
    
    doc.text('Aries Marine - Task Report', 14, 16);
    
    // This requires a type assertion because TypeScript doesn't know about the dynamically added method
    (doc as any).autoTable({
      head: [['Task Title', 'Assignee', 'Status', 'Priority', 'Due Date']],
      body: tasks.map(task => [
        task.title,
        task.assigneeIds && task.assigneeIds.length > 0 ? users.find(u => u.id === task.assigneeIds[0])?.name || 'N/A' : 'N/A',
        task.status,
        task.priority,
        task.dueDate ? format(new Date(task.dueDate), 'dd-MM-yyyy') : 'N/A',
      ]),
      startY: 20,
    });
    
    doc.save('AriesMarine_Report.pdf');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={tasks.length === 0}>
        <FileDown className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button variant="outline" onClick={handleDownloadPdf} disabled={tasks.length === 0}>
        <FileDown className="mr-2 h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}
