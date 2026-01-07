
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download, Save, Lock, Unlock, Edit } from 'lucide-react';
import { format, startOfMonth, addMonths, subMonths, isSameMonth, isAfter, isBefore, startOfToday, parseISO } from 'date-fns';
import { saveAs } from "file-saver";
import { Accordion } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ScrollArea } from '../ui/scroll-area';
import { exportToExcel, exportToPdf } from './generateUsageSummary';
import EditVehicleUsageDialog from './EditVehicleUsageDialog';
import type { Vehicle, User } from '@/lib/types';
import { Badge } from '../ui/badge';


const implementationStartDate = new Date(2026, 0, 1); // January 2026 (Month is 0-indexed)

const VehicleDataRow = ({ vehicle, currentMonth, slNo }: { vehicle: any, currentMonth: Date, slNo: number }) => {
    const { user, can, lockVehicleUsageSheet, unlockVehicleUsageSheet, drivers, vehicleUsageRecords, users } = useAppContext();
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    const monthKey = format(currentMonth, 'yyyy-MM');
    const record = vehicleUsageRecords?.[monthKey];
    const vehicleRecord = record?.records?.[vehicle.id];

    const isLocked = vehicleRecord?.isLocked;
    const canEdit = can.manage_vehicle_usage && !isLocked;
    const canLockSheet = can.manage_vehicle_usage;

    const lastUpdatedBy = useMemo(() => {
        if (!vehicleRecord?.lastUpdatedById) return null;
        return users.find((u: User) => u.id === vehicleRecord.lastUpdatedById);
    }, [vehicleRecord, users]);

    const handleExport = (formatType: 'excel' | 'pdf') => {
        const dayHeaders = Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
        const driver = drivers.find(d => d.id === vehicle?.driverId);
        
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

    const getStatusBadge = () => {
        const status = vehicle.status;
        const variant: 'success' | 'warning' | 'destructive' = status.label === 'Completed' ? 'success' : status.label === 'On Going' ? 'warning' : 'destructive';
        return <Badge variant={variant}>{status.label}</Badge>;
    }

    return (
        <>
            <div className="flex justify-between items-center p-2 border-b">
                <div className="flex items-center gap-4 flex-1">
                    <span className="font-semibold text-sm w-8 text-center">{slNo}.</span>
                    <div className="flex justify-between items-center w-48">
                        <p className="font-semibold truncate">{vehicle.vehicleNumber}</p>
                        {getStatusBadge()}
                    </div>
                </div>

                <div className="flex-1 flex justify-center items-center text-xs text-muted-foreground gap-6">
                    <div>
                        <span className="font-semibold">Updated by:</span> {lastUpdatedBy?.name || 'N/A'}
                        {vehicleRecord?.lastUpdated && <span className="ml-1">({format(parseISO(vehicleRecord.lastUpdated), 'dd-MM-yy, h:mm a')})</span>}
                    </div>
                    <div>
                        <span className="font-semibold">Verified By:</span> {vehicleRecord?.verifiedBy?.name || 'N/A'}
                        {vehicleRecord?.verifiedBy?.date && ` on ${format(parseISO(vehicleRecord.verifiedBy.date), 'dd-MM-yy')}`}
                    </div>
                </div>

                <div className="flex items-center gap-2 pr-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="mr-2 h-4 w-4"/>Excel</Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><Download className="mr-2 h-4 w-4"/>PDF</Button>
                    {canEdit && <Button size="sm" onClick={() => setEditingVehicle(vehicle)}><Edit className="mr-2 h-4 w-4"/>Edit</Button>}
                    {canLockSheet && (
                        isLocked
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
};


export default function VehicleUsageSheet() {
    const { vehicles, vehicleUsageRecords, can } = useAppContext();
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
        return { label: 'Not Yet Started', color: 'bg-red-500' };
    };
    

    const sortedVehicles = useMemo(() => {
        return [...vehicles]
            .filter(v => v.status === 'Active' || v.status === 'In Maintenance')
            .map(v => ({ ...v, status: getVehicleStatus(v.id) }))
            .sort((a,b) => a.vehicleNumber.localeCompare(b.vehicleNumber));
    }, [vehicles, currentMonth, vehicleUsageRecords]);

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
                 {sortedVehicles.map((vehicle, index) => (
                    <VehicleDataRow key={vehicle.id} vehicle={vehicle} currentMonth={currentMonth} slNo={index + 1} />
                ))}
            </ScrollArea>
        </div>
    );
}
