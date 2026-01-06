
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Save, Lock, Unlock, Edit } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSameMonth, getDay, isAfter, isBefore, startOfToday, parseISO, isValid, parse, sub } from 'date-fns';
import { saveAs } from "file-saver";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { JobCode, ManpowerProfile, JobRecordPlant } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { DatePickerInput } from '../ui/date-picker-input';
import { Checkbox } from '../ui/checkbox';
import { exportToExcel, exportToPdf } from './generateUsageSummary';

const implementationStartDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed)

const VehicleDataRow = ({ vehicle, currentMonth }: { vehicle: any, currentMonth: Date }) => {
    const { user, drivers, vehicleUsageRecords, saveVehicleUsageRecord, lockVehicleUsageSheet, unlockVehicleUsageSheet, can } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const { toast } = useToast();
    
    const monthKey = format(currentMonth, 'yyyy-MM');
    const record = vehicleUsageRecords?.[monthKey];
    const vehicleRecord = record?.records?.[vehicle.id];

    const [cellStates, setCellStates] = useState<Record<string, any>>({});
    const [headerStates, setHeaderStates] = useState({
      jobNo: '', vehicleType: '', extraKm: 0, headerOvertime: '', extraNight: 0, extraDays: 0,
      verifiedByName: '', verifiedByDate: undefined as Date | undefined,
    });

    const dayHeaders = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);

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

    useEffect(() => {
        const extra = monthlyTotalKm > 3000 ? monthlyTotalKm - 3000 : 0;
        setHeaderStates(prev => ({ ...prev, extraKm: extra, headerOvertime: monthlyTotalOvertime }));
    }, [monthlyTotalKm, monthlyTotalOvertime]);

    useEffect(() => {
        if (vehicleRecord) {
            const newStates: Record<string, any> = {};
            for (const day in vehicleRecord.days) {
                newStates[`${day}-startKm`] = vehicleRecord.days[day].startKm || '';
                newStates[`${day}-endKm`] = vehicleRecord.days[day].endKm || '';
                newStates[`${day}-overtime`] = vehicleRecord.days[day].overtime || '';
                newStates[`${day}-remarks`] = vehicleRecord.days[day].remarks || '';
                newStates[`${day}-isHoliday`] = vehicleRecord.days[day].isHoliday || false;
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
    }, [vehicleRecord, vehicle.id, currentMonth]);

    const handleInputChange = (day: number, field: string, value: string | number | boolean) => {
        const dayKey = `${day}-${field}`;
        const nextDayKey = `${day + 1}-startKm`;
        setCellStates(prev => {
            const newStates = { ...prev, [dayKey]: value };
            if (field === 'endKm' && day < getDaysInMonth(currentMonth)) {
                newStates[nextDayKey] = value;
            }
            return newStates;
        });
    };

    const handleHeaderChange = (field: keyof typeof headerStates, value: string | number | Date | undefined) => {
        setHeaderStates(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!vehicle.id || !user) return;
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
            ...headerStates,
            verifiedByDate: headerStates.verifiedByDate ? headerStates.verifiedByDate.toISOString() : '',
        };
        saveVehicleUsageRecord(monthKey, vehicle.id, dataToSave);
        toast({ title: "Record Saved", description: "Vehicle usage data has been saved." });
    };

    const handleExport = (formatType: 'excel' | 'pdf') => {
        const driver = drivers.find(d => d.id === vehicle?.driverId);
        if (formatType === 'excel') exportToExcel(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates);
        else exportToPdf(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates);
    };

    const isLocked = vehicleRecord?.isLocked;
    const canEdit = can.manage_vehicle_usage && !isLocked;
    const canLockSheet = can.manage_vehicle_usage;
    
    return (
        <AccordionItem value={vehicle.id}>
            <div className="flex justify-between items-center p-2 border-b">
                 <AccordionTrigger className="p-2 flex-1 hover:no-underline">
                    <div className="flex items-center gap-3">
                        <div className={cn("h-2.5 w-2.5 rounded-full", vehicle.status.color)}></div>
                        <div>
                            <p className="font-semibold">{vehicle.vehicleNumber}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.status.label}</p>
                        </div>
                    </div>
                </AccordionTrigger>
                 <div className="flex items-center gap-2 pr-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="mr-2 h-4 w-4"/>Excel</Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><Download className="mr-2 h-4 w-4"/>PDF</Button>
                    {canEdit && <Button size="sm" onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Save</Button>}
                    {canEdit && <Button size="sm" variant={isEditing ? "secondary" : "default"} onClick={() => setIsEditing(!isEditing)}><Edit className="mr-2 h-4 w-4"/>{isEditing ? "Close" : "Edit"}</Button>}
                    {canLockSheet && (
                        isLocked
                        ? (user?.role === 'Admin' && <Button variant="secondary" size="sm" onClick={() => unlockVehicleUsageSheet(monthKey, vehicle.id)}>Unlock</Button>)
                        : <Button variant="destructive" size="sm" onClick={() => lockVehicleUsageSheet(monthKey, vehicle.id)}>Lock</Button>
                    )}
                </div>
            </div>
           
            <AccordionContent>
                <div className="p-4 border-t bg-muted/30">
                    {isEditing ? (
                        <>
                        <div className="p-4 border rounded-md mb-4 bg-background grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-2"><Label>Job No.</Label><Input value={headerStates.jobNo} onChange={e => handleHeaderChange('jobNo', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></div>
                            <div className="space-y-2"><Label>Vehicle Type</Label><Input value={headerStates.vehicleType} onChange={e => handleHeaderChange('vehicleType', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></div>
                            <div className="space-y-2"><Label>Over Time (Header)</Label><Input value={headerStates.headerOvertime} readOnly className="font-bold" /></div>
                            <div className="space-y-2"><Label>Extra Night</Label><Input type="number" value={headerStates.extraNight} onChange={e => handleHeaderChange('extraNight', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></div>
                            <div className="space-y-2"><Label>Extra Days</Label><Input type="number" value={headerStates.extraDays} onChange={e => handleHeaderChange('extraDays', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></div>
                            <div className="space-y-2"><Label>Total KM</Label><Input value={monthlyTotalKm} readOnly className="font-bold" /></div>
                            <div className="space-y-2"><Label>Extra KM</Label><Input type="number" value={headerStates.extraKm} readOnly className="font-bold" /></div>
                            <div className="space-y-2"><Label>Verified By</Label><Input value={headerStates.verifiedByName} onChange={e => handleHeaderChange('verifiedByName', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></div>
                            <div className="space-y-2"><Label>Verified Date</Label><DatePickerInput value={headerStates.verifiedByDate} onChange={date => handleHeaderChange('verifiedByDate', date)} disabled={!canEdit} /></div>
                        </div>
                        <Table className="min-w-full border-separate border-spacing-0 bg-background">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky top-0 z-20 bg-card shadow-sm">Day</TableHead>
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
                                            <TableCell><Input type="number" className="h-8" value={cellStates[`${day}-startKm`] || ''} onChange={(e) => handleInputChange(day, 'startKm', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></TableCell>
                                            <TableCell><Input type="number" className="h-8" value={cellStates[`${day}-endKm`] || ''} onChange={(e) => handleInputChange(day, 'endKm', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></TableCell>
                                            <TableCell className="font-medium text-center">{totalKm}</TableCell>
                                            <TableCell><Input className="h-8" value={cellStates[`${day}-overtime`] || ''} onChange={(e) => handleInputChange(day, 'overtime', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></TableCell>
                                            <TableCell><Input className="h-8" value={cellStates[`${day}-remarks`] || ''} onChange={(e) => handleInputChange(day, 'remarks', e.target.value)} onBlur={handleSave} readOnly={!canEdit} /></TableCell>
                                            <TableCell className="text-center"><Checkbox checked={isHoliday} onCheckedChange={(checked) => { handleInputChange(day, 'isHoliday', !!checked); handleSave(); }} disabled={!canEdit}/></TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Click "Edit" to view and modify the log.</p>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    )
};


export default function VehicleUsageSheet() {
    const { vehicles, vehicleUsageRecords } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    
    const getVehicleStatus = (vehicleId: string) => {
        const record = vehicleUsageRecords?.[format(currentMonth, 'yyyy-MM')];
        const vehicleRecord = record?.records?.[vehicleId];
        if (vehicleRecord?.isLocked) {
            return { label: 'Completed', color: 'bg-green-500' };
        }
        if (vehicleRecord) {
            const hasData = Object.values(vehicleRecord.days || {}).some(dayData => 
                dayData.startKm || dayData.endKm || dayData.overtime || dayData.remarks
            );
            if (hasData) {
                return { label: 'On Going', color: 'bg-yellow-500' };
            }
        }
        return { label: 'Not Yet Started', color: 'bg-gray-400' };
    };
    

    const sortedVehicles = useMemo(() => {
        return [...vehicles]
            .map(v => ({ ...v, status: getVehicleStatus(v.id) }))
            .sort((a,b) => a.vehicleNumber.localeCompare(b.vehicleNumber));
    }, [vehicles, currentMonth, vehicleUsageRecords]);

    const canGoToPreviousMonth = useMemo(() => {
        const firstDayOfCurrentMonth = startOfMonth(currentMonth);
        return isAfter(firstDayOfCurrentMonth, implementationStartDate);
      }, [currentMonth]);
      
    const canGoToNextMonth = useMemo(() => isBefore(currentMonth, startOfToday()), [currentMonth]);
  
    const changeMonth = (amount: number) => {
        setCurrentMonth(prev => addMonths(prev, amount));
    };

    return (
        <div className="flex flex-col h-full bg-card border rounded-lg">
            <div className="p-4 border-b shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} disabled={!canGoToPreviousMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" onClick={() => changeMonth(1)} disabled={!canGoToNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <Accordion type="single" collapsible>
                    {sortedVehicles.map(vehicle => (
                        <VehicleDataRow key={vehicle.id} vehicle={vehicle} currentMonth={currentMonth} />
                    ))}
                </Accordion>
            </ScrollArea>
        </div>
    );
}
