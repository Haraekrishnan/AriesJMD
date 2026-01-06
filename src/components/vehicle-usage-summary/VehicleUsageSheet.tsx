
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download, Save, Lock, Unlock } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import type { VehicleUsageRecord } from '@/lib/types';
import { exportToExcel, exportToPdf } from './generateUsageSummary';
import { DatePickerInput } from '../ui/date-picker-input';

export default function VehicleUsageSheet() {
    const { 
        user,
        vehicles, 
        drivers,
        vehicleUsageRecords,
        saveVehicleUsageRecord,
        lockVehicleUsageSheet,
        unlockVehicleUsageSheet,
        can
    } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const { toast } = useToast();
    
    const monthKey = format(currentMonth, 'yyyy-MM');
    const record = vehicleUsageRecords?.[monthKey];
    const vehicleRecord = record?.records?.[selectedVehicleId];

    const [cellStates, setCellStates] = useState<Record<string, any>>({});
    const [headerStates, setHeaderStates] = useState({
      jobNo: '',
      vehicleType: '',
      extraKm: 0,
      headerOvertime: '',
      extraNight: 0,
      extraDays: 0,
    });
    const [verifiedByName, setVerifiedByName] = useState('');
    const [verifiedByDate, setVerifiedByDate] = useState<Date | undefined>();
    
    useEffect(() => {
        if (vehicleRecord) {
            const newStates: Record<string, any> = {};
            for (const day in vehicleRecord.days) {
                newStates[`${day}-startKm`] = vehicleRecord.days[day].startKm || '';
                newStates[`${day}-endKm`] = vehicleRecord.days[day].endKm || '';
                newStates[`${day}-overtime`] = vehicleRecord.days[day].overtime || '';
                newStates[`${day}-remarks`] = vehicleRecord.days[day].remarks || '';
            }
            setCellStates(newStates);
            setHeaderStates({
                jobNo: vehicleRecord.jobNo || '',
                vehicleType: vehicleRecord.vehicleType || '',
                extraKm: vehicleRecord.extraKm || 0,
                headerOvertime: vehicleRecord.headerOvertime || '',
                extraNight: vehicleRecord.extraNight || 0,
                extraDays: vehicleRecord.extraDays || 0,
            });
        } else {
            setCellStates({});
            setHeaderStates({ jobNo: '', vehicleType: '', extraKm: 0, headerOvertime: '', extraNight: 0, extraDays: 0 });
        }
        setVerifiedByName('');
        setVerifiedByDate(undefined);
    }, [vehicleRecord, selectedVehicleId, currentMonth]);

    const handleInputChange = (day: number, field: string, value: string | number) => {
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

    const handleHeaderChange = (field: keyof typeof headerStates, value: string | number) => {
        setHeaderStates(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSave = () => {
        if (!selectedVehicleId || !user) return;
        
        const dataToSave: Partial<VehicleUsageRecord['records'][string]> = {
            days: dayHeaders.reduce((acc, day) => {
                acc[day] = {
                    startKm: Number(cellStates[`${day}-startKm`] || 0),
                    endKm: Number(cellStates[`${day}-endKm`] || 0),
                    overtime: cellStates[`${day}-overtime`] || '',
                    remarks: cellStates[`${day}-remarks`] || '',
                };
                return acc;
            }, {} as VehicleUsageRecord['records'][string]['days']),
            jobNo: headerStates.jobNo,
            vehicleType: headerStates.vehicleType,
            extraKm: Number(headerStates.extraKm),
            headerOvertime: headerStates.headerOvertime,
            extraNight: Number(headerStates.extraNight),
            extraDays: Number(headerStates.extraDays),
        };

        saveVehicleUsageRecord(monthKey, selectedVehicleId, dataToSave);
        toast({ title: "Record Saved", description: "Vehicle usage data has been saved."});
    };

    const dayHeaders = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);

    const isLocked = record?.isLocked;
    const canEdit = (can.manage_vehicle_usage) && !isLocked;
    
    const handleExport = (formatType: 'excel' | 'pdf') => {
        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        const driver = drivers.find(d => d.id === vehicle?.driverId);
        
        if (!verifiedByName || !verifiedByDate) {
            toast({
                title: "Verification Details Required",
                description: "Please enter the 'Verified By' name and date before exporting.",
                variant: 'destructive',
            });
            return;
        }

        if (formatType === 'excel') {
            exportToExcel(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates, verifiedByName, verifiedByDate);
        } else {
            exportToPdf(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates, verifiedByName, verifiedByDate);
        }
    };
    
    const canLockSheet = can.manage_vehicle_usage;

    return (
        <div className="flex flex-col h-full bg-card border rounded-lg">
            <div className="p-4 border-b shrink-0 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} disabled={isSameMonth(currentMonth, new Date())}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger className="w-full md:w-[250px]">
                            <SelectValue placeholder="Select a vehicle..." />
                        </SelectTrigger>
                        <SelectContent>
                            {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => handleExport('excel')}><Download className="mr-2 h-4 w-4"/>Excel</Button>
                        <Button onClick={() => handleExport('pdf')}><Download className="mr-2 h-4 w-4"/>PDF</Button>
                        {canEdit && <Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Save</Button>}
                        {canLockSheet && (
                            isLocked
                            ? <Button variant="secondary" onClick={() => unlockVehicleUsageSheet(monthKey)}>Unlock</Button>
                            : <Button variant="destructive" onClick={() => lockVehicleUsageSheet(monthKey)}>Lock</Button>
                        )}
                    </div>
                </div>
            </div>
             {selectedVehicleId && (
                <div className="p-4 border-b grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="space-y-2">
                        <Label>Job No.</Label>
                        <Input value={headerStates.jobNo} onChange={e => handleHeaderChange('jobNo', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                    <div className="space-y-2">
                        <Label>Vehicle Type</Label>
                        <Input value={headerStates.vehicleType} onChange={e => handleHeaderChange('vehicleType', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                    <div className="space-y-2">
                        <Label>Extra KM</Label>
                        <Input type="number" value={headerStates.extraKm} onChange={e => handleHeaderChange('extraKm', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                    <div className="space-y-2">
                        <Label>Over Time (Header)</Label>
                        <Input value={headerStates.headerOvertime} onChange={e => handleHeaderChange('headerOvertime', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                     <div className="space-y-2">
                        <Label>Extra Night</Label>
                        <Input type="number" value={headerStates.extraNight} onChange={e => handleHeaderChange('extraNight', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                    <div className="space-y-2">
                        <Label>Extra Days</Label>
                        <Input type="number" value={headerStates.extraDays} onChange={e => handleHeaderChange('extraDays', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                     <div className="space-y-2">
                        <Label>Verified By</Label>
                        <Input placeholder="Enter verifier's name..." value={verifiedByName} onChange={(e) => setVerifiedByName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Verified By Date</Label>
                        <DatePickerInput value={verifiedByDate} onChange={setVerifiedByDate} />
                    </div>
                </div>
            )}
            <div className="overflow-auto flex-1 relative">
                {selectedVehicleId ? (
                <Table className="min-w-full border-collapse">
                    <thead className="sticky top-0 z-10 bg-card">
                        <TableRow>
                            <TableHead className="sticky left-0 bg-card z-10">Day</TableHead>
                            <TableHead>Start KM</TableHead>
                            <TableHead>End KM</TableHead>
                            <TableHead>Total KM</TableHead>
                            <TableHead>Overtime (Hrs)</TableHead>
                            <TableHead>Remarks</TableHead>
                        </TableRow>
                    </thead>
                    <TableBody>
                        {dayHeaders.map(day => {
                            const dateForDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            const startKm = Number(cellStates[`${day}-startKm`] || 0);
                            const endKm = Number(cellStates[`${day}-endKm`] || 0);
                            const totalKm = endKm > startKm ? endKm - startKm : 0;
                            return (
                                <TableRow key={day}>
                                    <TableCell className="sticky left-0 bg-card z-10 font-medium">{format(dateForDay, 'dd-MM-yyyy')}</TableCell>
                                    <TableCell><Input type="number" className="h-8" value={cellStates[`${day}-startKm`] || ''} onChange={(e) => handleInputChange(day, 'startKm', e.target.value)} onBlur={() => handleSave()} readOnly={!canEdit} /></TableCell>
                                    <TableCell><Input type="number" className="h-8" value={cellStates[`${day}-endKm`] || ''} onChange={(e) => handleInputChange(day, 'endKm', e.target.value)} onBlur={() => handleSave()} readOnly={!canEdit} /></TableCell>
                                    <TableCell className="font-medium text-center">{totalKm}</TableCell>
                                    <TableCell><Input className="h-8" value={cellStates[`${day}-overtime`] || ''} onChange={(e) => handleInputChange(day, 'overtime', e.target.value)} onBlur={() => handleSave()} readOnly={!canEdit} /></TableCell>
                                    <TableCell><Input className="h-8" value={cellStates[`${day}-remarks`] || ''} onChange={(e) => handleInputChange(day, 'remarks', e.target.value)} onBlur={() => handleSave()} readOnly={!canEdit} /></TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Please select a vehicle to view its usage summary.
                    </div>
                )}
            </div>
           
        </div>
    );
}
