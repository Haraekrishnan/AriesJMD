
'use client';
import type { InternalRequest, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { useConsumable } from '@/contexts/consumable-provider';
import { format, parseISO, isValid } from 'date-fns';

interface ConsumableReportDownloadsProps {}

export default function ConsumableReportDownloads({}: ConsumableReportDownloadsProps) {
  const { internalRequests, users } = useAppContext();
  const { consumableItems } = useConsumable();
  
  const consumableItemIds = useMemo(() => new Set(consumableItems.map(item => item.id)), [consumableItems]);

  const issuedItems = useMemo(() => {
    const items: any[] = [];
    internalRequests.forEach(req => {
        const isConsumableReq = req.items?.some(item => item.inventoryItemId && consumableItemIds.has(item.inventoryItemId));
        if (!isConsumableReq) return;

        const requester = users.find(u => u.id === req.requesterId);
        
        (req.items || []).forEach(item => {
            if (item.status === 'Issued') {
                const issuedDate = (item as any).issuedDate;
                if (issuedDate) {
                    items.push({
                        ...item,
                        requesterName: requester?.name || 'Unknown',
                        requestDate: req.date,
                        issuedDate: issuedDate,
                    });
                }
            }
        });
    });
    return items.sort((a,b) => {
        const dateA = a.issuedDate ? parseISO(a.issuedDate) : null;
        const dateB = b.issuedDate ? parseISO(b.issuedDate) : null;
        if (dateA && dateB) return dateB.getTime() - dateA.getTime();
        return 0;
    });
  }, [internalRequests, users, consumableItemIds]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd MMM, yyyy') : 'N/A';
  };

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Consumption Report');

    worksheet.columns = [
      { header: 'Issued Date', key: 'issuedDate', width: 20 },
      { header: 'Item Name', key: 'description', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Unit', key: 'unit', width: 15 },
      { header: 'Requested By', key: 'requesterName', width: 25 },
      { header: 'Request Date', key: 'requestDate', width: 20 },
      { header: 'Remarks', key: 'remarks', width: 50 },
    ];
    
    issuedItems.forEach(item => {
        worksheet.addRow({
            issuedDate: formatDate(item.issuedDate),
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            requesterName: item.requesterName,
            requestDate: formatDate(item.requestDate),
            remarks: item.remarks || '',
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Consumable_Consumption_Report.xlsx');
  };

  const handleDownloadPdf = async () => {
    const doc = new jsPDF();
    doc.text('Consumable Consumption Report', 14, 15);

    (doc as any).autoTable({
        startY: 20,
        head: [['Issued Date', 'Item', 'Qty', 'Unit', 'Requester', 'Remarks']],
        body: issuedItems.map(item => [
            formatDate(item.issuedDate),
            item.description,
            item.quantity,
            item.unit,
            item.requesterName,
            item.remarks || '',
        ]),
    });
    
    doc.save('Consumable_Consumption_Report.pdf');
  };

  const isDisabled = issuedItems.length === 0;

  return (
    <>
      <Button variant="outline" onClick={handleDownloadExcel} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4"/> Excel Report</Button>
      <Button variant="outline" onClick={handleDownloadPdf} disabled={isDisabled}><FileDown className="mr-2 h-4 w-4"/> PDF Report</Button>
    </>
  );
}
