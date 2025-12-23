
'use client';

import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import type { DamageReport, DamageReportStatus } from '@/lib/types';

const statusVariant: { [key in DamageReportStatus]: 'secondary' | 'destructive' | 'success' } = {
  'Pending': 'secondary',
  'Under Review': 'secondary',
  'Approved': 'success',
  'Rejected': 'destructive',
};

export default function DamageReportList() {
  const { damageReports = [], inventoryItems, users } = useAppContext();

  const reportsWithDetails = useMemo(() => {
    return damageReports.map(report => {
      const item = inventoryItems.find(i => i.id === report.itemId);
      const reporter = users.find(u => u.id === report.reporterId);
      return {
        ...report,
        itemName: item?.name || report.otherItemName || 'N/A',
        serialNumber: item?.serialNumber || 'N/A',
        reporterName: reporter?.name || 'Unknown',
      };
    }).sort((a, b) => parseISO(b.reportDate).getTime() - parseISO(a.reportDate).getTime());
  }, [damageReports, inventoryItems, users]);

  if (reportsWithDetails.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No damage reports have been submitted.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Reported By</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reportsWithDetails.map(report => (
          <TableRow key={report.id}>
            <TableCell>
              <p className="font-medium">{report.itemName}</p>
              <p className="text-xs text-muted-foreground">{report.serialNumber}</p>
            </TableCell>
            <TableCell>{report.reporterName}</TableCell>
            <TableCell>{format(parseISO(report.reportDate), 'dd MMM, yyyy')}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[report.status]}>{report.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm">View</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
