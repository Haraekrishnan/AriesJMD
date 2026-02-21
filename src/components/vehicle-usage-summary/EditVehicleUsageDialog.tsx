'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { DatePickerInput } from '../ui/date-picker-input';
import { Checkbox } from '../ui/checkbox';
import { format, getDay, getDaysInMonth, parseISO, isValid } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Vehicle } from '@/lib/types';
import { Save } from 'lucide-react';

interface EditVehicleUsageDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  vehicle: Vehicle;
  currentMonth: Date;
}

export default function EditVehicleUsageDialog({ isOpen, setIsOpen, vehicle, currentMonth }: EditVehicleUsageDialogProps) {
    const { saveVehicleUsageRecord, vehicleUsageRecords } = useAppContext();
    const { toast } = useToast();
    
    const [cellStates, setCellStates] = useState<Record<string, any>>({});
    const [headerStates, setHeaderStates] = useState({
      jobNo: '', vehicleType: '', extraKm: 0, headerOvertime: '', extraNight: 0, extraDays: 0,
      verifiedByName: '', verifiedByDate: undefined as Date | undefined,
    });
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const monthKey = useMemo(() => format(currentMonth, 'yyyy-MM'), [currentMonth]);
    
    const dayHeaders = useMemo(() => Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1), [currentMonth]);

    useEffect(() => {
      if (isOpen) {
        const record = vehicleUsageRecords?.[monthKey];
        const vehicleRecord = record?.records?.[vehicle.id];

        if (vehicleRecord) {
            const newStates: Record<string, any> = {};
            if (vehicleRecord.days) {
              for (const day in vehicleRecord.days) {
                  newStates[`${day}-startKm`] = vehicleRecord.days[day].startKm || '';
                  newStates[`${day}-endKm`] = vehicleRecord.days[day].endKm || '';
                  newStates[`${day}-overtime`] = vehicleRecord.days[day].overtime || '';
                  newStates[`${day}-remarks`] = vehicleRecord.days[day].remarks || '';
                  newStates[`${day}-isHoliday`] = vehicleRecord.days[day].isHoliday || false;
              }
            }
            setCellStates(newStates);
            setHeaderStates({
                jobNo: vehicleRecord.jobNo || '',
                vehicleType: vehicleRecord.vehicleType || '',
                extraKm: vehicleRecord.extraKm || 0,
                headerOvertime: vehicleRecord.headerOvertime || '',
                extraNight: vehicleRecord.extraNight || 0,
                extraDays: vehicleRecord.extraDays || 0,
                verifiedByName: vehicleRecord.verifiedBy?.name || '',
                verifiedByDate: vehicleRecord.verifiedBy?.date ? parseISO(vehicleRecord.verifiedBy.date) : undefined,
            });
        } else {
            setCellStates({});
            setHeaderStates({ jobNo: '', vehicleType: '', extraKm: 0, headerOvertime: '', extraNight: 0, extraDays: 0, verifiedByName: '', verifiedByDate: undefined });
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, vehicle.id, monthKey]);

    const monthlyTotalKm = useMemo(() => {
        let total = 0;
        for (const day of dayHeaders) {
            const startKm = Number(cellStates[`${day}-startKm`] || 0);
            const endKm = Number(cellStates[`${day}-endKm`] || 0);
            if (endKm > startKm) total += endKm - startKm;
        }
        return total;
    }, [cellStates, dayHeaders]);

     const monthlyTotalOvertime = useMemo(() => {
        let totalMinutes = 0;
        for (const day of dayHeaders) {
            const overtimeValue = cellStates[`${day}-overtime`] || '';
            if (typeof overtimeValue === 'string' && overtimeValue.includes(':')) {
                const [hours, minutes] = overtimeValue.split(':').map(Number);
                totalMinutes += (hours * 60) + (minutes || 0);
            } else if (overtimeValue) {
                totalMinutes += Number(overtimeValue) * 60;
            }
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }, [cellStates, dayHeaders]);

    const saveData = useCallback(() => {
      if (!vehicle.id) return;
      const dataToSave: Partial<any> = {
          days: dayHeaders.reduce((acc, day) => {
              acc[day] = {
                  startKm: Number(cellStates[`${day}-startKm`] || 0),
                  endKm: Number(cellStates[`${day}-endKm`] || 0),
                  overtime: cellStates[`${day}-overtime`] || '',
                  remarks: cellStates[`${day}-remarks`] || '',
                  isHoliday: cellStates[`${day}-isHoliday`] || false,
              };
              return acc;
          }, {} as any),
          jobNo: headerStates.jobNo,
          vehicleType: headerStates.vehicleType,
          extraKm: monthlyTotalKm > 3000 ? monthlyTotalKm - 3000 : 0,
          headerOvertime: monthlyTotalOvertime,
          extraNight: Number(headerStates.extraNight || 0),
          extraDays: Number(headerStates.extraDays || 0),
          verifiedBy: {
              name: headerStates.verifiedByName || null,
              date: headerStates.verifiedByDate ? headerStates.verifiedByDate.toISOString() : null
          }
      };

      saveVehicleUsageRecord(monthKey, vehicle.id, dataToSave)
          .then(() => {
              setSaveState('saved');
              if(saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
              saveTimeoutRef.current = setTimeout(() => setSaveState('idle'), 2000);
          })
          .catch((error) => {
              setSaveState('idle');
              toast({ title: "Auto-save Failed", description: error.message, variant: 'destructive' });
          });
    }, [cellStates, headerStates, vehicle.id, monthKey, dayHeaders, monthlyTotalKm, monthlyTotalOvertime, saveVehicleUsageRecord, toast]);

    const debouncedSave = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaveState('saving');
        saveTimeoutRef.current = setTimeout(saveData, 1500);
    }, [saveData]);
    
    const handleInputChange = (day: number, field: string, value: string | number | boolean) => {
        const dayKey = `${day}-${field}`;
        const nextDayKey = `${day + 1}-startKm`;
    
        if ((field === 'startKm' || field === 'endKm') && Number(value) < 0) {
            return;
        }

        const newCellStates = { ...cellStates, [dayKey]: value };
        if (field === 'endKm' && day < getDaysInMonth(currentMonth)) {
            newCellStates[nextDayKey] = value;
        }
        setCellStates(newCellStates);
        debouncedSave();
    };
    
    const handleKmBlur = (day: number, field: 'startKm' | 'endKm') => {
        const startKmValue = Number(cellStates[`${day}-startKm`] || 0);
        const endKmValue = Number(cellStates[`${day}-endKm`] || 0);
    
        if (field === 'startKm' && day > 1) {
            const prevEndKm = Number(cellStates[`${day - 1}-endKm`] || 0);
            if (startKmValue !== prevEndKm) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Start KM',
                    description: `Start KM for day ${day} must match End KM of day ${day - 1}. Resetting value.`,
                });
                handleInputChange(day, 'startKm', prevEndKm);
            }
        }
    
        if (field === 'endKm') {
            if (endKmValue > 0 && !startKmValue) {
                toast({ variant: 'destructive', title: 'Invalid Entry', description: 'Please enter Start KM before entering End KM.' });
                handleInputChange(day, 'endKm', '');
            } else if (endKmValue > 0 && endKmValue < startKmValue) {
                toast({ variant: 'destructive', title: 'Invalid Kilometers', description: 'End KM cannot be less than Start KM. The value has been cleared.' });
                handleInputChange(day, 'endKm', '');
            }
        }
    };
    
    const handleHeaderChange = (field: keyof typeof headerStates, value: string | number | Date | undefined) => {
        setHeaderStates(prev => ({ ...prev, [field]: value }));
        debouncedSave();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-7xl h-[95vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Edit Vehicle Usage: {vehicle.vehicleNumber}</DialogTitle>
                    <DialogDescription>
                        Log daily usage for {format(currentMonth, 'MMMM yyyy')}. All changes are saved automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border rounded-md mb-4 bg-background grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2"><Label>Job No.</Label><Input value={headerStates.jobNo} onChange={e => handleHeaderChange('jobNo', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Vehicle Type</Label><Input value={headerStates.vehicleType} onChange={e => handleHeaderChange('vehicleType', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Over Time (Header)</Label><Input value={monthlyTotalOvertime} readOnly className="font-bold" /></div>
                        <div className="space-y-2"><Label>Extra Night</Label><Input type="number" value={headerStates.extraNight} onChange={e => handleHeaderChange('extraNight', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Extra Days</Label><Input type="number" value={headerStates.extraDays} onChange={e => handleHeaderChange('extraDays', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Total KM</Label><Input value={monthlyTotalKm} readOnly className="font-bold" /></div>
                        <div className="space-y-2"><Label>Extra KM</Label><Input type="number" value={monthlyTotalKm > 3000 ? monthlyTotalKm - 3000 : 0} readOnly className="font-bold" /></div>
                        <div className="space-y-2"><Label>Verified By</Label><Input value={headerStates.verifiedByName} onChange={e => handleHeaderChange('verifiedByName', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Verified Date</Label><DatePickerInput value={headerStates.verifiedByDate} onChange={date => handleHeaderChange('verifiedByDate', date)} /></div>
                    </div>
                     <ScrollArea className="flex-1">
                        <Table className="min-w-full border-separate border-spacing-0">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky top-0 z-30 bg-card shadow-sm border-r">Day</TableHead>
                                    <TableHead className="sticky top-0 z-20 bg-card shadow-sm">Start KM</TableHead>
                                    <TableHead className="sticky top-0 z-20 bg-card shadow-sm">End KM</TableHead>
                                    <TableHead className="sticky top-0 z-20 bg-card shadow-sm">Total KM</TableHead>
                                    <TableHead className="sticky top-0 z-20 bg-card shadow-sm">Overtime (Hrs)</TableHead>
                                    <TableHead className="sticky top-0 z-20 bg-card shadow-sm">Remarks</TableHead>
                                    <TableHead className="sticky top-0 z-20 bg-card shadow-sm w-[50px]">Holiday</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dayHeaders.map(day => {
                                    const dateForDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                    const isSunday = getDay(dateForDay) === 0;
                                    const startKm = Number(cellStates[`${day}-startKm`] || 0);
                                    const endKm = Number(cellStates[`${day}-endKm`] || 0);
                                    const totalKm = endKm > startKm ? endKm - startKm : 0;
                                    const isHoliday = cellStates[`${day}-isHoliday`];
                                    return (
                                        <TableRow key={day} className={cn((isHoliday || isSunday) && 'bg-yellow-100 dark:bg-yellow-900/30')}>
                                            <TableCell className={cn("sticky left-0 font-medium z-10 border-r", (isHoliday || isSunday) ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-card')}>{format(dateForDay, 'dd-MM-yyyy')}</TableCell>
                                            <TableCell><Input type="number" min="0" className="h-8" value={cellStates[`${day}-startKm`] || ''} onChange={(e) => handleInputChange(day, 'startKm', e.target.value)} onBlur={() => handleKmBlur(day, 'startKm')} /></TableCell>
                                            <TableCell><Input type="number" min="0" className="h-8" value={cellStates[`${day}-endKm`] || ''} onChange={(e) => handleInputChange(day, 'endKm', e.target.value)} onBlur={() => handleKmBlur(day, 'endKm')} /></TableCell>
                                            <TableCell className="font-medium text-center">{totalKm}</TableCell>
                                            <TableCell><Input className="h-8" value={cellStates[`${day}-overtime`] || ''} onChange={(e) => handleInputChange(day, 'overtime', e.target.value)} /></TableCell>
                                            <TableCell><Input className="h-8" value={cellStates[`${day}-remarks`] || ''} onChange={(e) => handleInputChange(day, 'remarks', e.target.value)} /></TableCell>
                                            <TableCell className="text-center"><Checkbox checked={isHoliday} onCheckedChange={(checked) => handleInputChange(day, 'isHoliday', !!checked)} /></TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                     </ScrollArea>
                </div>
                <DialogFooter>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {saveState === 'saving' && <><Save className="h-4 w-4 animate-spin" /> Saving...</>}
                        {saveState === 'saved' && <><Check className="h-4 w-4 text-green-500" /> All changes saved.</>}
                    </div>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
