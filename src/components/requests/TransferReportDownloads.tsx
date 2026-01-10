
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
  request: InventoryTransferRequest;
}

export default function TransferReportDownloads({ request }: TransferReportDownloadsProps) {
  const { projects, users } = useAppContext();
  const { toast } = useToast();

  const handleExportExcel = async () => {
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
    
    const fromProject = projects.find(p => p.id === request.fromProjectId)?.name || 'N/A';
    const toProject = projects.find(p => p.id === request.toProjectId)?.name || 'N/A';
    const requester = users.find(u => u.id === request.requesterId)?.name || 'N/A';
    const approver = request.approverId ? users.find(u => u.id === request.approverId)?.name : 'N/A';

    request.items.forEach(item => {
        worksheet.addRow({
            requestDate: format(parseISO(request.requestDate), 'dd-MM-yyyy'),
            fromProject,
            toProject,
            reason: request.reason,
            itemName: item.name,
            serialNumber: item.serialNumber,
            ariesId: item.ariesId || 'N/A',
            status: request.status,
            requester,
            approver,
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Transfer_${request.id.slice(-6)}.xlsx`);
  };

  const handleExportPdf = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text(`Inventory Transfer Report (ID: ...${request.id.slice(-6)})`, 14, 15);
    
    const fromProject = projects.find(p => p.id === request.fromProjectId)?.name || 'N/A';
    const toProject = projects.find(p => p.id === request.toProjectId)?.name || 'N/A';
    const requester = users.find(u => u.id === request.requesterId)?.name || 'N/A';
    
    const body = request.items.map(item => [
        format(parseISO(request.requestDate), 'dd-MM-yy'),
        fromProject,
        toProject,
        request.reason,
        item.name,
        item.serialNumber,
        request.status,
        requester,
    ]);

    (doc as any).autoTable({
        head: [['Date', 'From', 'To', 'Reason', 'Item', 'Serial No.', 'Status', 'Requested By']],
        body,
        startY: 20,
    });
    
    doc.save(`Transfer_${request.id.slice(-6)}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4"/>Excel</Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4"/>PDF</Button>
    </div>
  );
}
