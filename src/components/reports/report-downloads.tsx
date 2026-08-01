'use client';

import * as React from 'react';
import type { Task, Comment } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportDownloadsProps {
  tasks: Task[];
}

export default function ReportDownloads({ tasks }: ReportDownloadsProps) {
  const { users } = useAuth();

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    const date = parseISO(isoString);
    return isValid(date) ? format(date, 'dd-MM-yyyy HH:mm:ss') : 'N/A';
  };

  const getStartedDate = (task: Task) => {
    const comments = Array.isArray(task.comments) ? task.comments : Object.values(task.comments || {});
    // Find the date when status first changed to In Progress
    const startAction = comments.find(c => 
      c.text.toLowerCase().includes('status changed to in progress') || 
      c.text.toLowerCase().includes('task started')
    );
    return startAction ? startAction.date : null;
  };

  const processTaskData = (task: Task) => {
    const creator = users.find(u => u.id === task.creatorId)?.name || 'Unknown';
    const assigneeNames = task.assigneeIds?.map(id => users.find(u => u.id === id)?.name || id).join(', ') || 'Unassigned';
    
    const comments = Array.isArray(task.comments) ? task.comments : Object.values(task.comments || {});
    const interactionHistory = comments
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(c => {
        const author = users.find(u => u.id === c.userId)?.name || 'Unknown';
        return `[${formatDateTime(c.date)}] ${author}: ${c.text}`;
      })
      .join('\n');

    // Milestones
    const createdDate = task.createdAt || null;
    const startedDate = getStartedDate(task);
    const reviewDate = task.statusRequest?.date || null;
    const completedDate = task.completionDate || null;

    // Calculation logic for number of days
    const calcDuration = (start?: string | null, end?: string | null) => {
        if (!start || !end) return 'N/A';
        const s = parseISO(start);
        const e = parseISO(end);
        if (!isValid(s) || !isValid(e)) return 'N/A';
        
        // differenceInDays returns 0 for same day, which is correct
        const diff = differenceInDays(e, s);
        return diff >= 0 ? diff : 0;
    };

    return {
      'Task ID': (task.id || '').slice(-6).toUpperCase(),
      'Title': task.title,
      'Creator': creator,
      'Assignees': assigneeNames,
      'Priority': task.priority,
      'Status': task.status,
      'Created At': formatDateTime(createdDate),
      'Started At': formatDateTime(startedDate),
      'Sent for Review At': formatDateTime(reviewDate),
      'Approved/Completed At': formatDateTime(completedDate),
      'Days to Start': calcDuration(createdDate, startedDate),
      'Days in Work': calcDuration(startedDate, reviewDate),
      'Days to Finalize': calcDuration(reviewDate, completedDate),
      'Total Days': calcDuration(createdDate, completedDate),
      'Description': task.description,
      'Interaction History': interactionHistory
    };
  };

  const handleDownloadExcel = async () => {
    if (tasks.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Task Workflow Report');

    worksheet.columns = [
      { header: 'TASK ID', key: 'Task ID', width: 12 },
      { header: 'TITLE', key: 'Title', width: 40 },
      { header: 'CREATOR', key: 'Creator', width: 25 },
      { header: 'ASSIGNEES', key: 'Assignees', width: 35 },
      { header: 'PRIORITY', key: 'Priority', width: 12 },
      { header: 'STATUS', key: 'Status', width: 20 },
      { header: 'CREATED DATE/TIME', key: 'Created At', width: 22 },
      { header: 'STARTED DATE/TIME', key: 'Started At', width: 22 },
      { header: 'REVIEW SENT DATE/TIME', key: 'Sent for Review At', width: 22 },
      { header: 'COMPLETED DATE/TIME', key: 'Approved/Completed At', width: 22 },
      { header: 'DAYS TO START', key: 'Days to Start', width: 15 },
      { header: 'DAYS IN WORK', key: 'Days in Work', width: 15 },
      { header: 'DAYS TO FINALIZE', key: 'Days to Finalize', width: 15 },
      { header: 'TOTAL DAYS', key: 'Total Days', width: 15 },
      { header: 'DESCRIPTION', key: 'Description', width: 50 },
      { header: 'INTERACTION HISTORY', key: 'Interaction History', width: 80 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 10
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
      };
    });

    tasks.forEach(task => {
      const rowData = processTaskData(task);
      const row = worksheet.addRow(rowData);
      row.alignment = { vertical: 'top', wrapText: true };
      row.eachCell((cell) => {
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
        if (cell.value === 'N/A') {
            cell.font = { color: { argb: 'FF94A3B8' } };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Aries_Task_Analytics_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const handleDownloadPdf = async () => {
    if (tasks.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Task Management Analytics Report', 40, 40);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 40, 60);

    const tableData = tasks.map(task => {
        const data = processTaskData(task);
        return [
            data['Task ID'],
            data['Title'],
            data['Status'],
            data['Created At'],
            data['Started At'],
            data['Total Days'],
            data['Interaction History']
        ];
    });

    (doc as any).autoTable({
      head: [['ID', 'TITLE', 'STATUS', 'CREATED', 'STARTED', 'TOTAL DAYS', 'HISTORY']],
      body: tableData,
      startY: 80,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 5, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 140 },
        2: { cellWidth: 60 },
        3: { cellWidth: 90 },
        4: { cellWidth: 90 },
        5: { cellWidth: 40 },
        6: { cellWidth: 'auto' }
      },
      margin: { left: 40, right: 40, bottom: 60 },
      didDrawPage: (data: any) => {
          doc.setFontSize(8);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 60, doc.internal.pageSize.getHeight() - 30);
      }
    });
    
    doc.save(`Aries_Task_Analytics_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleDownloadExcel} disabled={tasks.length === 0} className="font-bold text-xs h-9">
        <FileDown className="mr-2 h-4 w-4 text-green-600" />
        Detailed Excel
      </Button>
      <Button variant="outline" onClick={handleDownloadPdf} disabled={tasks.length === 0} className="font-bold text-xs h-9">
        <FileDown className="mr-2 h-4 w-4 text-rose-600" />
        Detailed PDF
      </Button>
    </div>
  );
}
