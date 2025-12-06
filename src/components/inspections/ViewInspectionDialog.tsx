'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import type { InspectionChecklist } from '@/lib/types';
import { format } from 'date-fns';
import { generateChecklistPdf, generateChecklistExcel } from '@/components/tp-certification/generateTpCertReport';
import { Download } from 'lucide-react';

interface ViewInspectionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  checklist: InspectionChecklist;
}

const FindingDisplay = ({ label, value }: { label: string, value?: string }) => (
    <div className="grid grid-cols-2 items-center border-b py-2">
        <p className="text-sm">{label}</p>
        <p className="text-sm font-bold text-center">{value || 'N/A'}</p>
    </div>
);

export default function ViewInspectionDialog({ isOpen, setIsOpen, checklist }: ViewInspectionDialogProps) {
  const { inventoryItems, users } = useAppContext();
  
  const item = useMemo(() => inventoryItems.find(i => i.id === checklist.itemId), [checklist, inventoryItems]);
  const inspector = useMemo(() => users.find(u => u.id === checklist.inspectedById), [checklist, users]);
  const reviewer = useMemo(() => users.find(u => u.id === checklist.reviewedById), [checklist, users]);

  const handleDownload = (format: 'pdf' | 'excel') => {
    if (!item || !inspector || !reviewer) return;
    if (format === 'pdf') {
        generateChecklistPdf(checklist, item, inspector, reviewer);
    } else {
        generateChecklistExcel(checklist, item, inspector, reviewer);
    }
  };

  if (!item || !inspector || !reviewer) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Error</DialogTitle></DialogHeader>
            <p>Could not load all necessary data for this checklist. The associated item, inspector, or reviewer may have been deleted.</p>
            <DialogFooter><Button onClick={() => setIsOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-full flex flex-col">
        <DialogHeader>
          <DialogTitle>Inspection Checklist</DialogTitle>
          <DialogDescription>
            Inspection for {item.name} (SN: {item.serialNumber}) on {format(new Date(checklist.inspectionDate), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-6 -mr-6">
           <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm p-4 border rounded-md">
                    <div><span className="font-semibold">Aries ID:</span> {item.ariesId || 'N/A'}</div>
                    <div><span className="font-semibold">Serial No:</span> {item.serialNumber}</div>
                    <div><span className="font-semibold">Model:</span> {item.name}</div>
                    <div><span className="font-semibold">Date of Purchase:</span> {checklist.purchaseDate ? format(new Date(checklist.purchaseDate), 'dd-MMM-yyyy') : 'N/A'}</div>
                    <div className="lg:col-span-2"><span className="font-semibold">Known History:</span> {checklist.knownHistory || 'None'}</div>
                    <div className="lg:col-span-2"><span className="font-semibold">Procedure Ref:</span> ARIES-RAOP-001 [Rev 07]</div>
                </div>

                <div className="p-4 border rounded-md space-y-2">
                    <h3 className="font-semibold border-b pb-2">Inspection Findings</h3>
                    <FindingDisplay label="Preliminary Observation" value={checklist.findings?.preliminaryObservation} />
                    <FindingDisplay label="Condition of Sheath" value={checklist.findings?.straps} />
                    <FindingDisplay label="Condition of Core" value={checklist.findings?.conditionCore} />
                    <FindingDisplay label="Sheaths & Terminations" value={checklist.findings?.sheathsAndTerminations} />
                    <FindingDisplay label="Other Components" value={checklist.findings?.otherComponents} />
                </div>

                 <div className="space-y-1 text-sm">
                    <p className="font-semibold">Comments:</p>
                    <p className="p-2 border rounded-md bg-muted/50 min-h-[4rem]">{checklist.comments || 'N/A'}</p>
                </div>
                 <div className="space-y-1 text-sm">
                    <p className="font-semibold">Remarks:</p>
                    <p className="p-2 border rounded-md bg-muted/50">{checklist.remarks}</p>
                </div>
                 <div className="space-y-1 text-sm">
                    <p className="font-semibold">Verdict:</p>
                    <p className="p-2 border rounded-md bg-muted/50 font-bold">{checklist.verdict}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 border rounded-md space-y-2 text-sm">
                        <h3 className="font-semibold">Inspected by:</h3>
                        <p>Name: {inspector.name}</p>
                        <p>Designation: {inspector.role}</p>
                     </div>
                      <div className="p-4 border rounded-md space-y-2 text-sm">
                        <h3 className="font-semibold">Reviewed by:</h3>
                        <p>Name: {reviewer.name}</p>
                        <p>Designation: {reviewer.role}</p>
                     </div>
                </div>
                 <div className="p-2 border rounded-md text-center">
                    <p className="text-sm font-semibold">Next Semi-Annual Inspection Due Date</p>
                    <p className="font-bold text-lg">{format(new Date(checklist.nextDueDate), 'dd-MMM-yyyy')}</p>
                 </div>
           </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleDownload('excel')}><Download className="mr-2 h-4 w-4"/>Excel</Button>
                <Button onClick={() => handleDownload('pdf')}><Download className="mr-2 h-4 w-4"/>PDF</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
