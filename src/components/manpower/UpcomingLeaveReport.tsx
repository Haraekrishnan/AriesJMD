
'use client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAppContext } from '@/contexts/app-provider';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface UpcomingLeaveReportProps {
  leaves: any[];
  title: string;
  reportType: 'upcoming' | 'overdue';
}

export default function UpcomingLeaveReport({ leaves, title, reportType }: UpcomingLeaveReportProps) {
  const { projects } = useAppContext();

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title);

    sheet.columns = [
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Trade', key: 'trade', width: 20 },
      { header: 'Project Location', key: 'project', width: 25 },
      { header: 'Leave Type', key: 'leaveType', width: 15 },
      { header: 'Leave Start Date', key: 'startDate', width: 20 },
      { header: 'Planned End Date', key: 'endDate', width: 20 },
    ];
    
    leaves.forEach(({ profile, leave }) => {
        sheet.addRow({
            name: profile.name,
            trade: profile.trade,
            project: projects.find(p => p.id === profile.eic)?.name || 'N/A',
            leaveType: leave.leaveType,
            startDate: leave.leaveStartDate ? format(parseISO(leave.leaveStartDate), 'dd-MM-yyyy') : 'N/A',
            endDate: leave.plannedEndDate ? format(parseISO(leave.plannedEndDate), 'dd-MM-yyyy') : 'N/A',
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${title.replace(/\s+/g, '_')}_Report.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    
    (doc as any).autoTable({
        head: [['Employee', 'Trade', 'Project', 'Leave Type', 'Start Date', 'End Date']],
        body: leaves.map(({ profile, leave }) => [
            profile.name,
            profile.trade,
            projects.find(p => p.id === profile.eic)?.name || 'N/A',
            leave.leaveType,
            leave.leaveStartDate ? format(parseISO(leave.leaveStartDate), 'dd-MM-yyyy') : 'N/A',
            leave.plannedEndDate ? format(parseISO(leave.plannedEndDate), 'dd-MM-yyyy') : 'N/A',
        ]),
        startY: 20,
    });
    
    doc.save(`${title.replace(/\s+/g, '_')}_Report.pdf`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4"/>Excel</Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4"/>PDF</Button>
    </div>
  );
}
