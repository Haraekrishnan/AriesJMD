
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import type { ManpowerProfile } from '@/lib/types';

interface IssuePpeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function IssuePpeDialog({ isOpen, setIsOpen }: IssuePpeDialogProps) {
  const { manpowerProfiles } = useAppContext();

  const { missingCoverall, missingShoes } = useMemo(() => {
    const missingCoverall: ManpowerProfile[] = [];
    const missingShoes: ManpowerProfile[] = [];
    
    const activeProfiles = manpowerProfiles.filter(p => p.status === 'Working');

    activeProfiles.forEach(p => {
        const historyArray = Array.isArray(p.ppeHistory) ? p.ppeHistory : Object.values(p.ppeHistory || {});
        if (!historyArray.some(h => h.ppeType === 'Coverall')) {
            missingCoverall.push(p);
        }
        if (!historyArray.some(h => h.ppeType === 'Safety Shoes')) {
            missingShoes.push(p);
        }
    });
    return { missingCoverall, missingShoes };
  }, [manpowerProfiles]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] grid grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>PPE Issuance Status</DialogTitle>
          <DialogDescription>A list of active employees with no recorded PPE history.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 p-1 overflow-y-auto">
            <div className="space-y-2">
                <Label className="font-semibold">Employees Missing Coverall History ({missingCoverall.length})</Label>
                <ScrollArea className="rounded-md border h-full">
                   <div className="p-2 space-y-1">
                        {missingCoverall.length > 0 ? (
                            missingCoverall.map(p => (
                               <div key={p.id} className="p-1.5 rounded-sm text-xs bg-muted/50 flex justify-between items-center">
                                  <span>{p.name}</span> <Badge variant="secondary">{p.trade}</Badge>
                               </div>
                            ))
                        ) : <p className="text-xs text-muted-foreground p-4 text-center">All active employees have coverall records.</p>}
                   </div>
                </ScrollArea>
            </div>
             <div className="space-y-2">
                <Label className="font-semibold">Employees Missing Safety Shoe History ({missingShoes.length})</Label>
                <ScrollArea className="rounded-md border h-full">
                   <div className="p-2 space-y-1">
                       {missingShoes.length > 0 ? (
                            missingShoes.map(p => (
                               <div key={p.id} className="p-1.5 rounded-sm text-xs bg-muted/50 flex justify-between items-center">
                                  <span>{p.name}</span> <Badge variant="secondary">{p.trade}</Badge>
                               </div>
                            ))
                        ) : <p className="text-xs text-muted-foreground p-4 text-center">All active employees have safety shoe records.</p>}
                   </div>
                </ScrollArea>
            </div>
        </div>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
