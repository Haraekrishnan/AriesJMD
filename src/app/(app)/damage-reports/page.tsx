
'use client';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer, PlusCircle, Trash2 } from 'lucide-react';
import NewDamageReportDialog from '@/components/damage-reports/NewDamageReportDialog';
import DamageReportList from '@/components/damage-reports/DamageReportList';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function DamageReportsPage() {
  const { user, damageReports, deleteAllDamageReportsAndFiles } = useAppContext();
  const [isNewReportOpen, setIsNewReportOpen] = useState(false);
  
  const isAdmin = user?.role === 'Admin';
  
  const reportsWithAttachments = useMemo(() => {
    return (damageReports || []).filter(r => r.attachmentUrl);
  }, [damageReports]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Hammer /> Damage Reports
          </h1>
          <p className="text-muted-foreground">Report and track damaged equipment.</p>
        </div>
        <Button onClick={() => setIsNewReportOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Damage Report
        </Button>
      </div>

      {isAdmin && (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle>Admin Zone - File Management</CardTitle>
                <CardDescription>Download or delete all report attachments.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={reportsWithAttachments.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete All Reports & Files
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete all {reportsWithAttachments.length} damage reports and their attachments from the database and storage. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={deleteAllDamageReportsAndFiles}>Yes, Delete Everything</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <ScrollArea className="h-64 mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Report ID</TableHead>
                                <TableHead>File Name</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportsWithAttachments.map(report => {
                                const url = report.attachmentUrl || '';
                                const fileName = url.split('/').pop()?.split('?')[0] || 'attachment';
                                return (
                                <TableRow key={report.id}>
                                    <TableCell>{report.id.slice(-6)}</TableCell>
                                    <TableCell className="truncate max-w-xs">{decodeURIComponent(fileName)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild size="sm">
                                            <a href={url} target="_blank" rel="noopener noreferrer" download>Download</a>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </ScrollArea>
                 {reportsWithAttachments.length === 0 && <p className="text-center text-muted-foreground pt-8">No reports with attachments found.</p>}
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submitted Reports</CardTitle>
          <CardDescription>A list of all submitted damage reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <DamageReportList />
        </CardContent>
      </Card>

      <NewDamageReportDialog isOpen={isNewReportOpen} setIsOpen={setIsNewReportOpen} />
    </div>
  );
}

    