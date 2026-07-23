'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Checkbox } from '@/components/ui/checkbox';
import { format, getDay, getDaysInMonth, parseISO, isSameMonth, isAfter, isBefore, startOfToday, startOfMonth, addMonths, subMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Vehicle, User } from '@/lib/types';
import { Save, Lock, Unlock, Edit, Download, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import EditVehicleUsageDialog from '../vehicle/EditVehicleUsageDialog';
import { exportToExcel, exportToPdf } from './generateUsageSummary';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const implementationStartDate = new Date(2026, 0, 1); // January 2026

const VehicleDataRow = ({ vehicle, currentMonth, slNo }: { vehicle: any, currentMonth: Date, slNo: number }) => {
    const { user, can } = useAuth();
    const { users } = useAuth();
    const { drivers } = useGeneral();
    const { lockVehicleUsageSheet, unlockVehicleUsageSheet, vehicleUsageRecords } = usePlanner();
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
        const variant: 'success' | 'yellow' | 'destructive' = status.label === 'Completed' ? 'success' : status.label === 'On Going' ? 'yellow' : 'destructive';
        return <Badge variant={variant} className="text-[10px] sm:text-xs h-5 sm:h-6">{status.label}</Badge>;
    }

    return (
        <>
            <div className="flex flex-col sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,2fr)] items-start sm:items-center p-4 sm:p-4 border-b gap-4 sm:gap-0 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className="font-black text-xs w-8 text-center text-muted-foreground bg-muted p-1 rounded-md">{slNo}.</span>
                    <div className="flex items-center justify-between flex-1 min-w-0">
                         <p className="font-black sm:font-bold truncate text-base sm:text-lg tracking-tight">{vehicle.vehicleNumber}</p>
                         <div className="ml-4">{getStatusBadge()}</div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-start sm:justify-center items-center text-xs text-muted-foreground gap-x-6 gap-y-1 w-full sm:w-auto px-4">
                    <div className="flex items-center gap-1.5">
                        <span className="font-black uppercase tracking-tighter text-muted-foreground/60">Updated:</span> 
                        <span className="font-bold text-foreground/80">{lastUpdatedBy?.name || 'N/A'}</span>
                        {vehicleRecord?.lastUpdated && <span className="hidden lg:inline opacity-60">({format(parseISO(vehicleRecord.lastUpdated), 'dd MMM, p')})</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="font-black uppercase tracking-tighter text-muted-foreground/60">Verified:</span> 
                        <span className="font-bold text-foreground/80">{vehicleRecord?.verifiedBy?.name || 'N/A'}</span>
                        {vehicleRecord?.verifiedBy?.date && <span className="hidden lg:inline opacity-60">on {format(parseISO(vehicleRecord.verifiedBy.date), 'dd-MM-yy')}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2 justify-end w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-bold uppercase tracking-wider border-2 flex-1 sm:flex-initial" onClick={() => handleExport('excel')}><Download className="mr-1.5 h-3.5 w-3.5"/>Excel</Button>
                    <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-bold uppercase tracking-wider border-2 flex-1 sm:flex-initial" onClick={() => handleExport('pdf')}><Download className="mr-1.5 h-3.5 w-3.5"/>PDF</Button>
                    {canEdit && <Button size="sm" className="h-9 px-4 text-xs font-black uppercase tracking-widest flex-1 sm:flex-initial" onClick={() => setEditingVehicle(vehicle)}><Edit className="mr-1.5 h-3.5 w-3.5"/>Edit</Button>}
                    {canLockSheet && (
                        isLocked
                        ? (user?.role === 'Admin' && <Button variant="secondary" size="sm" className="h-9 px-4 text-xs font-black uppercase tracking-widest flex-1 sm:flex-initial" onClick={() => unlockVehicleUsageSheet(monthKey, vehicle.id)}>Unlock</Button>)
                        : (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="h-9 px-4 text-xs font-black uppercase tracking-widest flex-1 sm:flex-initial"><Lock className="mr-1.5 h-3.5 w-3.5" /> Lock</Button>
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
    const { can } = useAuth();
    const { vehicles } = useGeneral();
    const { vehicleUsageRecords } = usePlanner();
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
        if (!vehicles || !Array.isArray(vehicles)) return [];
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
        <div className="flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b shrink-0 bg-muted/20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-10 w-10 border-2" onClick={() => changeMonth(-1)} disabled={!canGoToPreviousMonth}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-xl font-black uppercase tracking-widest px-4">{format(currentMonth, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" className="h-10 w-10 border-2" onClick={() => changeMonth(1)} disabled={!canGoToNextMonth}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
            <ScrollArea className="flex-1">
                 {sortedVehicles.map((vehicle, index) => (
                    <VehicleDataRow key={vehicle.id} vehicle={vehicle} currentMonth={currentMonth} slNo={index + 1} />
                ))}
                {sortedVehicles.length === 0 && (
                    <div className="p-20 text-center text-muted-foreground italic font-medium flex flex-col items-center gap-4">
                        <Car className="h-12 w-12 opacity-10" />
                        <p>No active vehicles found in fleet.</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
