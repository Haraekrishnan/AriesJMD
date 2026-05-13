'use client';
import { useState, useMemo } from 'react';
import { useManpower } from '@/contexts/manpower-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserMinus, UserCheck, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ManpowerProfile } from '@/lib/types';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { format, parseISO } from 'date-fns';

interface ReportLeaveDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function ReportLeaveDialog({ isOpen, setIsOpen }: ReportLeaveDialogProps) {
  const { manpowerProfiles, reportLeaveFromAccommodation, clearReportedLeave } = useManpower();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProfiles = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return manpowerProfiles
      .filter((p) => p.name.toLowerCase().includes(term) || p.employeeCode?.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [manpowerProfiles, searchTerm]);

  const handleToggleLeave = (profile: ManpowerProfile) => {
    if (profile.reportedOnLeave) {
      clearReportedLeave(profile.id);
      toast({ title: "Status Updated", description: `${profile.name} is marked as returned.` });
    } else {
      reportLeaveFromAccommodation(profile.id);
      toast({ title: "Reported Away", description: `${profile.name} marked as on leave.` });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Report Employee Leave</DialogTitle>
          <DialogDescription>
            Flag an employee as away. This will grey out their attendance in the Job Record Sheet to prevent errors.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee by name or code..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-hidden border rounded-md">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Plant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((p) => {
                    const plantName = projects.find(proj => proj.id === p.projectId)?.name || 'N/A';
                    const isAway = !!p.reportedOnLeave;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.employeeCode}</div>
                        </TableCell>
                        <TableCell className="text-xs">{plantName}</TableCell>
                        <TableCell>
                          {isAway ? (
                            <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Away Since {format(parseISO(p.reportedOnLeave!.date), 'dd MMM')}
                            </Badge>
                          ) : (
                            <Badge variant="success">At Work</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isAway ? "outline" : "destructive"}
                            onClick={() => handleToggleLeave(p)}
                          >
                            {isAway ? (
                              <><UserCheck className="mr-2 h-4 w-4" /> Mark Returned</>
                            ) : (
                              <><UserMinus className="mr-2 h-4 w-4" /> Report Away</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
