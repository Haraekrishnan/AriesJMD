

'use client';
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download, Save } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import type { VehicleUsageRecord } from '@/lib/types';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


async function fetchImageAsArrayBuffer(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.arrayBuffer();
}

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
        setCellStates(prev => ({
            ...prev,
            [`${day}-${field}`]: value
        }));
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

    const handleExport = async (formatType: 'excel' | 'pdf') => {
        if (!selectedVehicleId) {
            toast({ variant: 'destructive', title: 'No Vehicle Selected' });
            return;
        }

        const vehicle = vehicles.find(v => v.id === selectedVehicleId);
        const driver = drivers.find(d => d.id === vehicle?.driverId);

        if (formatType === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Vehicle Usage Summary');

            // TODO: Add company logo and header styling
            sheet.addRow(['Vehicle Usage Summary']);
            sheet.addRow([`Month: ${format(currentMonth, 'MMMM yyyy')}`]);
            sheet.addRow([`Vehicle No: ${vehicle?.vehicleNumber}`, `Driver: ${driver?.name}`]);
            sheet.addRow([]);

            const headers = ['Day', 'Start KM', 'End KM', 'Total KM', 'Overtime (Hrs)', 'Remarks'];
            sheet.addRow(headers);
            
            let totalKm = 0;
            dayHeaders.forEach(day => {
                const startKm = Number(cellStates[`${day}-startKm`] || 0);
                const endKm = Number(cellStates[`${day}-endKm`] || 0);
                const dayTotal = endKm > startKm ? endKm - startKm : 0;
                totalKm += dayTotal;
                sheet.addRow([
                    day,
                    startKm || '',
                    endKm || '',
                    dayTotal || '',
                    cellStates[`${day}-overtime`] || '',
                    cellStates[`${day}-remarks`] || ''
                ]);
            });

            sheet.addRow(['Total', '', '', totalKm]);

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `VehicleUsage_${vehicle?.vehicleNumber}_${monthKey}.xlsx`);
        } else {
            const doc = new jsPDF();
            doc.text(`Vehicle Usage Summary - ${format(currentMonth, 'MMMM yyyy')}`, 14, 20);
            doc.text(`Vehicle: ${vehicle?.vehicleNumber} | Driver: ${driver?.name}`, 14, 30);
            
            let totalKm = 0;
            const body = dayHeaders.map(day => {
                const startKm = Number(cellStates[`${day}-startKm`] || 0);
                const endKm = Number(cellStates[`${day}-endKm`] || 0);
                const dayTotal = endKm > startKm ? endKm - startKm : 0;
                totalKm += dayTotal;
                return [
                    day,
                    startKm || '',
                    endKm || '',
                    dayTotal || '',
                    cellStates[`${day}-overtime`] || '',
                    cellStates[`${day}-remarks`] || ''
                ]
            });
            body.push(['Total', '', '', totalKm, '', '']);
            
            (doc as any).autoTable({
                head: [['Day', 'Start KM', 'End KM', 'Total KM', 'Overtime (Hrs)', 'Remarks']],
                body,
                startY: 40
            });
            doc.save(`VehicleUsage_${vehicle?.vehicleNumber}_${monthKey}.pdf`);
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
                            const startKm = Number(cellStates[`${day}-startKm`] || 0);
                            const endKm = Number(cellStates[`${day}-endKm`] || 0);
                            const totalKm = endKm > startKm ? endKm - startKm : 0;
                            return (
                                <TableRow key={day}>
                                    <TableCell className="sticky left-0 bg-card z-10 font-medium">{day}</TableCell>
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
