
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { format, parseISO } from 'date-fns';
import type { ObservationReport } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { useState } from 'react';

const Section = ({ title, content }: { title: string, content?: string }) => {
    if (!content) return null;
    return (
        <div className="space-y-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-sm p-3 border rounded-md bg-muted min-h-[4rem] whitespace-pre-wrap">{content}</p>
        </div>
    );
};

interface ViewObservationReportDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  report: ObservationReport;
}

export default function ViewObservationReportDialog({ isOpen, setIsOpen, report }: ViewObservationReportDialogProps) {
  const { users, user, updateObservationReport } = useAppContext();
  const reporter = users.find(u => u.id === report.reporterId);
  const [correctiveActions, setCorrectiveActions] = useState(report.correctiveActions || '');
  
  const canUpdate = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';

  const handleSave = () => {
    const updates: Partial<ObservationReport> = { correctiveActions };
    if (report.status === 'Open' && correctiveActions.trim()) {
        updates.status = 'Closed';
    }
    updateObservationReport(report.id, updates);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Observation Report</DialogTitle>
          <div className="flex justify-between items-start pt-2">
            <DialogDescription>
              Report by {reporter?.name} on {format(parseISO(report.visitDate), 'PPP')} at {report.visitTime}
            </DialogDescription>
            <Badge variant={report.status === 'Open' ? 'destructive' : 'success'}>{report.status}</Badge>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-6">
          <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm p-4 border rounded-md">
                <div><span className="font-semibold">Site:</span> {report.siteName}</div>
                <div><span className="font-semibold">Location:</span> {report.location}</div>
                <div className="col-span-2"><span className="font-semibold">Job:</span> {report.jobDescription}</div>
              </div>
              <Section title="Good Practices Observed" content={report.goodPractices} />
              <Section title="Unsafe Acts Observed" content={report.unsafeActs} />
              <Section title="Unsafe Conditions Observed" content={report.unsafeConditions} />
              
              <div className="space-y-2">
                  <Label htmlFor="correctiveActions">Corrective/Preventive Actions Taken</Label>
                  <Textarea 
                      id="correctiveActions"
                      value={correctiveActions}
                      onChange={(e) => setCorrectiveActions(e.target.value)}
                      rows={4}
                      disabled={!canUpdate}
                  />
              </div>

              {report.photos && report.photos.length > 0 && (
                <div className="space-y-2">
                    <Label>Attached Photos</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {report.photos.map((url, index) => (
                            <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Photo ${index + 1}`} className="rounded-md object-cover aspect-video"/>
                            </a>
                        ))}
                    </div>
                </div>
              )}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          {canUpdate && <Button type="button" onClick={handleSave}>Save & Close Report</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    