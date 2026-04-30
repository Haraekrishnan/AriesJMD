'use client';

import { useState, useMemo } from 'react';
import { useManpower } from '@/contexts/manpower-provider';
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
import { Search, Save, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ManpowerProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EmployeeCodeRegisterDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function EmployeeCodeRegisterDialog({ isOpen, setIsOpen }: EmployeeCodeRegisterDialogProps) {
  const { manpowerProfiles, updateManpowerProfile } = useManpower();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [localCodes, setLocalCodes] = useState<Record<string, string>>({});

  // Initialize local codes when dialog opens or profiles change
  useMemo(() => {
    const codes: Record<string, string> = {};
    manpowerProfiles.forEach((p) => {
      codes[p.id] = p.employeeCode || '';
    });
    setLocalCodes(codes);
  }, [manpowerProfiles]);

  const filteredProfiles = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return manpowerProfiles
      .filter((p) => p.name.toLowerCase().includes(lowercasedTerm))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [manpowerProfiles, searchTerm]);

  const handleCodeChange = (id: string, value: string) => {
    setLocalCodes((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async (profile: ManpowerProfile) => {
    const newCode = localCodes[profile.id];
    if (newCode === profile.employeeCode) return;

    try {
      await updateManpowerProfile({
        ...profile,
        employeeCode: newCode.trim(),
      });
      toast({
        title: 'Code Updated',
        description: `Updated code for ${profile.name}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update employee code.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Employee Code Register</DialogTitle>
          <DialogDescription>
            Update and manage official employee codes for all manpower.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md visible-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Employee Name</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead className="w-[200px]">Employee Code</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{profile.trade}</TableCell>
                    <TableCell>
                      <Input
                        value={localCodes[profile.id] || ''}
                        onChange={(e) => handleCodeChange(profile.id, e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Enter code..."
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={localCodes[profile.id] === profile.employeeCode ? "ghost" : "default"}
                        className="h-8 w-8 p-0"
                        onClick={() => handleSave(profile)}
                        disabled={localCodes[profile.id] === profile.employeeCode}
                      >
                        {localCodes[profile.id] === profile.employeeCode ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No employees found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
