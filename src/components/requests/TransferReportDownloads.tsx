
'use client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAppContext } from '@/contexts/app-provider';
import type { InventoryTransferRequest } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface TransferReportDownloadsProps {
  requests: InventoryTransferRequest[];
}

export default function TransferReportDownloads({ requests }: TransferReportDownloadsProps) {
  const { projects, users } = useAppContext();
  const { toast } = useToast();

  const handleExportExcel = async () => {
    if (requests.length === 0) {
      toast({ variant: 'destructive', title: 'No Data to Export' });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transfer Report');
    
    worksheet.columns = [
        { header: 'Request Date', key: 'requestDate', width: 15 },
        { header: 'From Project', key: 'fromProject', width: 20 },
        { header: 'To Project', key: 'toProject', width: 20 },
        { header: 'Reason', key: 'reason', width: 30 },
        { header: 'Item Name', key: 'itemName', width: 30 },
        { header: 'Serial Number', key: 'serialNumber', width: 25 },
        { header: 'Aries ID', key: 'ariesId', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Requested By', key: 'requester', width: 20 },
        { header: 'Approved By', key: 'approver', width: 20 },
    ];
    
    requests.forEach(req => {
        const fromProject = projects.find(p => p.id === req.fromProjectId)?.name || 'N/A';
        const toProject = projects.find(p => p.id === req.toProjectId)?.name || 'N/A';
        const requester = users.find(u => u.id === req.requesterId)?.name || 'N/A';
        const approver = req.approverId ? users.find(u => u.id === req.approverId)?.name : 'N/A';

        req.items.forEach(item => {
            worksheet.addRow({
                requestDate: format(parseISO(req.requestDate), 'dd-MM-yyyy'),
                fromProject,
                toProject,
                reason: req.reason,
                itemName: item.name,
                serialNumber: item.serialNumber,
                ariesId: item.ariesId || 'N/A',
                status: req.status,
                requester,
                approver,
            });
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Inventory_Transfer_Report.xlsx');
  };

  const handleExportPdf = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text('Inventory Transfer Report', 14, 15);
    
    const body = requests.flatMap(req => {
        const fromProject = projects.find(p => p.id === req.fromProjectId)?.name || 'N/A';
        const toProject = projects.find(p => p.id === req.toProjectId)?.name || 'N/A';
        const requester = users.find(u => u.id === req.requesterId)?.name || 'N/A';
        
        return req.items.map(item => [
            format(parseISO(req.requestDate), 'dd-MM-yy'),
            fromProject,
            toProject,
            req.reason,
            item.name,
            item.serialNumber,
            req.status,
            requester,
        ]);
    });

    (doc as any).autoTable({
        head: [['Date', 'From', 'To', 'Reason', 'Item', 'Serial No.', 'Status', 'Requested By']],
        body,
        startY: 20,
    });
    
    doc.save('Inventory_Transfer_Report.pdf');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4"/>Excel</Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4"/>PDF</Button>
    </div>
  );
}
