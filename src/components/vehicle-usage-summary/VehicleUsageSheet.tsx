'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
      verifiedByName: '',
      verifiedByDesignation: '',
    });
    
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
                verifiedByName: vehicleRecord.verifiedBy?.name || '',
                verifiedByDesignation: vehicleRecord.verifiedBy?.designation || '',
            });
        } else {
            setCellStates({});
            setHeaderStates({ jobNo: '', vehicleType: '', verifiedByName: '', verifiedByDesignation: '' });
        }
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

    const handleHeaderChange = (field: keyof typeof headerStates, value: string) => {
        setHeaderStates(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSave = () => {
        if (!selectedVehicleId) return;
        saveVehicleUsageRecord(monthKey, selectedVehicleId, {
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
            verifiedBy: {
                name: headerStates.verifiedByName,
                designation: headerStates.verifiedByDesignation,
            }
        });
        toast({ title: "Record Saved", description: "Vehicle usage data has been saved."});
    };

    const dayHeaders = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);

    const isLocked = record?.isLocked;
    const canEdit = (can.manage_vehicle_usage) && !isLocked;
    
    const handleExport = (formatType: 'excel' | 'pdf') => {
        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        const driver = drivers.find(d => d.id === vehicle?.driverId);
        if (formatType === 'excel') {
            exportToExcel(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates);
        } else {
            exportToPdf(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates);
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
            <div className="overflow-auto flex-1 relative">
                {selectedVehicleId ? (
                <Table className="min-w-full border-collapse">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 bg-card z-10">Day</TableHead>
                            <TableHead>Start KM</TableHead>
                            <TableHead>End KM</TableHead>
                            <TableHead>Total KM</TableHead>
                            <TableHead>Overtime (Hrs)</TableHead>
                            <TableHead>Remarks</TableHead>
                        </TableRow>
                    </TableHeader>
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
            {selectedVehicleId && (
                <div className="p-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Job No.</Label>
                        <Input value={headerStates.jobNo} onChange={e => handleHeaderChange('jobNo', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                    <div className="space-y-2">
                        <Label>Vehicle Type</Label>
                        <Input value={headerStates.vehicleType} onChange={e => handleHeaderChange('vehicleType', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                    <div className="space-y-2">
                        <Label>Verified By - Name</Label>
                        <Input value={headerStates.verifiedByName} onChange={e => handleHeaderChange('verifiedByName', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                    <div className="space-y-2">
                        <Label>Verified By - Designation</Label>
                        <Input value={headerStates.verifiedByDesignation} onChange={e => handleHeaderChange('verifiedByDesignation', e.target.value)} onBlur={handleSave} readOnly={!canEdit} />
                    </div>
                </div>
            )}
        </div>
    );
}
