'use client';

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Edit, Lock, Unlock } from 'lucide-react';
import { format, startOfMonth, addMonths, subMonths, isAfter, isBefore, startOfToday, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ScrollArea } from '../ui/scroll-area';
import { exportToExcel, exportToPdf } from './generateUsageSummary';
import EditVehicleUsageDialog from './EditVehicleUsageDialog';
import type { Vehicle, User } from '@/lib/types';
import { Badge } from '../ui/badge';

const implementationStartDate = new Date(2026, 0, 1); // January 2026 (Month is 0-indexed)

const VehicleDataRow = React.memo(({ vehicleId, currentMonth, slNo }: { vehicleId: string; currentMonth: Date; slNo: number }) => {
    const { user, can, lockVehicleUsageSheet, unlockVehicleUsageSheet, vehicles, drivers, vehicleUsageRecords, users } = useAppContext();
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    const vehicle = useMemo(() => vehicles.find(v => v.id === vehicleId), [vehicles, vehicleId]);

    const monthKey = format(currentMonth, 'yyyy-MM');
    const record = vehicleUsageRecords?.[monthKey];
    const vehicleRecord = record?.records?.[vehicleId];

    const getStatusBadge = () => {
        if (!vehicleRecord) {
            return <Badge variant="destructive">Not Yet Started</Badge>;
        }
        if (vehicleRecord.isLocked) {
            return <Badge variant="success">Completed</Badge>;
        }
        const hasData = Object.values(vehicleRecord.days || {}).some(dayData => 
            dayData.startKm || dayData.endKm || dayData.overtime || dayData.remarks
        );
        if (hasData) {
            return <Badge variant="yellow">On Going</Badge>;
        }
        return <Badge variant="destructive">Not Yet Started</Badge>;
    };

    const lastUpdatedBy = useMemo(() => {
        if (!vehicleRecord?.lastUpdatedById) return null;
        return users.find((u: User) => u.id === vehicleRecord.lastUpdatedById);
    }, [vehicleRecord, users]);

    const handleExport = (formatType: 'excel' | 'pdf') => {
        if (!vehicle) return;
        const dayHeaders = Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
        const driver = drivers.find(d => d.id === vehicle.driverId);
        
        const cellStates: Record<string, any> = {};
        if (vehicleRecord?.days) {
            for(const day in vehicleRecord.days) {
                cellStates[`${day}-startKm`] = vehicleRecord.days[day].startKm || '';
                cellStates[`${day}-endKm`] = vehicleRecord.days[day].endKm || '';
                cellStates[`${day}-overtime`] = vehicleRecord.days[day].overtime || '';
                cellStates[`${day}-remarks`] = vehicleRecord.days[day].remarks || '';
                cellStates[`${day}-isHoliday`] = vehicleRecord.days[day].isHoliday || false;
            }
        }
        
        const headerStates = {
            jobNo: vehicleRecord?.jobNo || '',
            vehicleType: vehicleRecord?.vehicleType || '',
            extraKm: vehicleRecord?.extraKm || 0,
            headerOvertime: vehicleRecord?.headerOvertime || '',
            extraNight: vehicleRecord?.extraNight || 0,
            extraDays: vehicleRecord?.extraDays || 0,
            verifiedByName: vehicleRecord?.verifiedBy?.name || '',
            verifiedByDate: vehicleRecord?.verifiedBy?.date ? new Date(vehicleRecord.verifiedBy.date) : undefined,
        };

        if (formatType === 'excel') exportToExcel(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates);
        else exportToPdf(vehicle, driver, currentMonth, cellStates, dayHeaders, headerStates);
    };

    if (!vehicle) return null;
    
    const canEdit = can.manage_vehicle_usage && !vehicleRecord?.isLocked;
    const canLockSheet = can.manage_vehicle_usage;
    
    return (
        <>
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)] items-center p-2 border-b">
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm w-8 text-center">{slNo}.</span>
                    <div className="flex items-center justify-between flex-1 min-w-0">
                         <p className="font-semibold truncate">{vehicle.vehicleNumber}</p>
                         <div className="ml-4">{getStatusBadge()}</div>
                    </div>
                </div>

                <div className="flex justify-center items-center text-xs text-muted-foreground gap-6">
                    <div>
                        <span className="font-semibold">Updated by:</span> {lastUpdatedBy?.name || 'N/A'}
                        {vehicleRecord?.lastUpdated && <span className="ml-1">({format(parseISO(vehicleRecord.lastUpdated), 'dd-MM-yy, h:mm a')})</span>}
                    </div>
                    <div>
                        <span className="font-semibold">Verified By:</span> {vehicleRecord?.verifiedBy?.name || 'N/A'}
                        {vehicleRecord?.verifiedBy?.date && ` on ${format(parseISO(vehicleRecord.verifiedBy.date), 'dd-MM-yy')}`}
                    </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="mr-2 h-4 w-4"/>Excel</Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><Download className="mr-2 h-4 w-4"/>PDF</Button>
                    {canEdit && <Button size="sm" onClick={() => setEditingVehicle(vehicle)}><Edit className="mr-2 h-4 w-4"/>Edit</Button>}
                    {canLockSheet && (
                        vehicleRecord?.isLocked
                        ? (user?.role === 'Admin' && <Button variant="secondary" size="sm" onClick={() => unlockVehicleUsageSheet(monthKey, vehicle.id)}>Unlock</Button>)
                        : (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Lock className="mr-2 h-4 w-4" /> Lock</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Lock Vehicle Log?</AlertDialogTitle><AlertDialogDescription>This will finalize the log for this vehicle and prevent further edits by non-admins.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => lockVehicleUsageSheet(monthKey, vehicle.id)}>Confirm Lock</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )
                    )}
                </div>
            </div>
            {editingVehicle && (
                <EditVehicleUsageDialog 
                    isOpen={!!editingVehicle} 
                    setIsOpen={() => setEditingVehicle(null)} 
                    vehicle={editingVehicle}
                    currentMonth={currentMonth}
                />
            )}
        </>
    )
});


export default function VehicleUsageSheet() {
    const { vehicles } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    
    const sortedVehicleIds = useMemo(() => {
        return [...vehicles]
            .filter(v => v.status === 'Active' || v.status === 'In Maintenance')
            .sort((a,b) => a.vehicleNumber.localeCompare(b.vehicleNumber))
            .map(v => v.id);
    }, [vehicles]);

    const canGoToPreviousMonth = useMemo(() => {
        const firstDayOfCurrentMonth = startOfMonth(currentMonth);
        return isAfter(firstDayOfCurrentMonth, implementationStartDate);
      }, [currentMonth]);
      
    const canGoToNextMonth = useMemo(() => {
        const firstDayOfCurrentMonth = startOfMonth(currentMonth);
        return isBefore(firstDayOfCurrentMonth, startOfToday());
    }, [currentMonth]);
  
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
                 {sortedVehicleIds.map((vehicleId, index) => (
                    <VehicleDataRow key={vehicleId} vehicleId={vehicleId} currentMonth={currentMonth} slNo={index + 1} />
                ))}
            </ScrollArea>
        </div>
    );
}
