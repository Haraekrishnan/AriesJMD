
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Shield, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';
import { ObservationReport } from '@/lib/types';
import ViewObservationReportDialog from './ViewObservationReportDialog';

export default function ObservationReportList() {
  const { observationReports, users } = useAppContext();
  const [viewingReport, setViewingReport] = useState<ObservationReport | null>(null);

  const sortedReports = useMemo(() => {
    return [...observationReports].sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [observationReports]);

  if (sortedReports.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No observation reports found.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Site & Location</TableHead>
            <TableHead>Reported By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedReports.map(report => {
            const reporter = users.find(u => u.id === report.reporterId);
            return (
              <TableRow key={report.id}>
                <TableCell>
                  <p className="font-medium">{format(parseISO(report.visitDate), 'dd MMM, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{report.visitTime}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{report.siteName}</p>
                  <p className="text-xs text-muted-foreground">{report.location}</p>
                </TableCell>
                <TableCell>{reporter?.name || 'Unknown'}</TableCell>
                <TableCell><Badge variant={report.status === 'Open' ? 'destructive' : 'success'}>{report.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setViewingReport(report)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {viewingReport && (
        <ViewObservationReportDialog
          isOpen={!!viewingReport}
          setIsOpen={() => setViewingReport(null)}
          report={viewingReport}
        />
      )}
    </>
  );
}

    