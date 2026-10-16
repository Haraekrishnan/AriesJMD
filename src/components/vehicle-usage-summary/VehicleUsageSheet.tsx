'use client';
import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO, isValid, startOfMonth, addMonths } from 'date-fns';
import type { Vehicle, VehicleUsageRecord } from '@/lib/types';
import { Lock, Edit, Download, ChevronLeft, ChevronRight, MoreHorizontal, Truck, CheckCircle2, Clock3, CircleEllipsis } from 'lucide-react';
import EditVehicleUsageDialog from '../vehicle/EditVehicleUsageDialog';
import { exportToExcel, exportToPdf } from './generateUsageSummary';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { usageStatus, usageTotals, visibleMonthVehicles, type UsageEntry } from './usage-summary';
import styles from './vehicle-summary.module.css';

const dateLabel = (value: string | undefined, pattern: string) => {
  if (!value) return '';
  const date = parseISO(value);
  return isValid(date) ? format(date, pattern) : '';
};

export function VehicleDataRow({ vehicle, currentMonth, vehicleRecord }: { vehicle: Vehicle; currentMonth: Date; vehicleRecord?: UsageEntry }) {
    const { user, can, users } = useAuth();
    const { drivers } = useGeneral();
    const { lockVehicleUsageSheet, unlockVehicleUsageSheet } = usePlanner();
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [confirmLock, setConfirmLock] = useState(false);
    const monthKey = format(currentMonth, 'yyyy-MM');
    const isLocked = vehicleRecord?.isLocked;
    const canEdit = can.manage_vehicle_usage && !isLocked;
    const lastUpdatedBy = users.find(u => u.id === vehicleRecord?.lastUpdatedById);
    const status = usageStatus(vehicleRecord);
    const totals = usageTotals(vehicleRecord, currentMonth);
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


    return <>
      <tr className={styles.vehicleRow}>
        <td className={styles.identity}><strong>{vehicle.vehicleNumber}</strong><small>{vehicleRecord?.vehicleType || 'Vehicle'}</small></td>
        <td className={styles.statusCell}><span className={styles.status + ' ' + styles[status.key]}><i />{status.label}</span></td>
        <td className={styles.metric} data-label="Total km">{totals.hasDistance ? totals.km.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}</td>
        <td className={styles.metric} data-label="Overtime (h:mm)">{totals.hasOvertime ? totals.overtime : '—'}</td>
        <td className={styles.audit} data-label="Updated by">
          <span>{lastUpdatedBy?.name || (vehicleRecord?.lastUpdated ? 'Unknown user' : 'No updates')}</span>
          <small>{dateLabel(vehicleRecord?.lastUpdated, 'dd MMM yyyy, h:mm a')}</small>
        </td>
        <td className={styles.audit} data-label="Verified by">
          <span>{vehicleRecord?.verifiedBy?.name || 'Not verified'}</span>
          <small>{dateLabel(vehicleRecord?.verifiedBy?.date, 'dd MMM yyyy')}</small>
        </td>
        <td className={styles.actionsCell}>
          <div className={styles.actions}>
            {canEdit && <Button size="sm" onClick={() => setEditingVehicle(vehicle)} aria-label={'Edit log for ' + vehicle.vehicleNumber}><Edit size={15} /> <span>Edit<span className={styles.mobileOnly}> log</span></span></Button>}
            {isLocked && <span className={styles.locked}><Lock size={14} />Locked</span>}
            <Button variant="outline" size="sm" className={styles.mobileOnly} onClick={() => handleExport('excel')}><Download size={14} />Excel</Button>
            <Button variant="outline" size="sm" className={styles.mobileOnly} onClick={() => handleExport('pdf')}><Download size={14} />PDF</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={'Actions for ' + vehicle.vehicleNumber}><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleExport('excel')}>Download Excel</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport('pdf')}>Download PDF</DropdownMenuItem>
                {can.manage_vehicle_usage && !isLocked && <DropdownMenuItem onSelect={() => setConfirmLock(true)}>Lock monthly log</DropdownMenuItem>}
                {can.manage_vehicle_usage && isLocked && user?.role === 'Admin' && <DropdownMenuItem onSelect={() => unlockVehicleUsageSheet(monthKey, vehicle.id)}>Unlock monthly log</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <AlertDialog open={confirmLock} onOpenChange={setConfirmLock}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Lock Vehicle Log?</AlertDialogTitle><AlertDialogDescription>This will finalize the log for {vehicle.vehicleNumber} for {format(currentMonth, 'MMMM yyyy')}. Only an admin can unlock it for further editing.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => lockVehicleUsageSheet(monthKey, vehicle.id)}>Confirm Lock</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {editingVehicle && <EditVehicleUsageDialog isOpen setIsOpen={() => setEditingVehicle(null)} vehicle={editingVehicle} currentMonth={currentMonth} />}
        </td>
      </tr>
    </>;
}

export default function VehicleUsageSheet() {
    const { vehicles } = useGeneral();
    const { vehicleUsageRecords } = usePlanner();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const pageSize = 8;
    // The provider annotation has an extra month index; persisted records use the shared type.
    const monthRecords = (vehicleUsageRecords as unknown as VehicleUsageRecord)?.[format(currentMonth, 'yyyy-MM')]?.records;
    const monthVehicles = useMemo(() => visibleMonthVehicles(vehicles, monthRecords), [vehicles, monthRecords]);
    const counts = monthVehicles.reduce((acc, vehicle) => { acc[usageStatus(monthRecords?.[vehicle.id]).key]++; return acc; }, { completed: 0, ongoing: 0, notStarted: 0 });
    const filtered = monthVehicles.filter(vehicle => vehicle.vehicleNumber.toLowerCase().includes(search.trim().toLowerCase()) &&
      (statusFilter === 'all' || usageStatus(monthRecords?.[vehicle.id]).key === statusFilter));
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pageCount);
    const pageVehicles = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const changeMonth = (amount: number) => { setCurrentMonth(prev => addMonths(prev, amount)); setPage(1); };
    const clear = () => { setSearch(''); setStatusFilter('all'); setPage(1); };
    const stats = [
      { label: 'Vehicles', count: monthVehicles.length, icon: Truck, tone: 'allVehicles' },
      { label: 'Completed', count: counts.completed, icon: CheckCircle2, tone: 'completed' },
      { label: 'On going', count: counts.ongoing, icon: Clock3, tone: 'ongoing' },
      { label: 'Not started', count: counts.notStarted, icon: CircleEllipsis, tone: 'notStarted' },
    ];
    return <div className={styles.page}>
      <header className={styles.header}>
        <div><h1>Vehicle Usage Summary</h1><p>Monthly logs, kilometres and overtime in one place.</p></div>
        <div className={styles.month}>
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => changeMonth(-1)} disabled={currentMonth <= new Date(2026, 0, 1)}><ChevronLeft size={16} /></Button>
          <span aria-live="polite">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="outline" size="icon" aria-label="Next month" onClick={() => changeMonth(1)} disabled={currentMonth >= startOfMonth(new Date())}><ChevronRight size={16} /></Button>
        </div>
      </header>
      <div className={styles.summary} aria-label="Selected month totals">
        {stats.map(stat => <div key={stat.label} className={styles.stat + ' ' + styles[stat.tone]}><stat.icon size={24} /><div><span>{stat.label}</span><strong>{stat.count}</strong></div></div>)}
      </div>
      <section className={styles.register} aria-label="Monthly vehicle register">
        <div className={styles.filters}>
          <Input aria-label="Search vehicle number" placeholder="Search vehicle number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <select aria-label="Filter usage status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option><option value="completed">Completed</option><option value="ongoing">On going</option><option value="notStarted">Not started</option>
          </select>
          <Button variant="outline" onClick={clear}>Clear</Button>
        </div>
        <table className={styles.table}>
          <thead><tr><th>Vehicle</th><th>Usage status</th><th>Total km</th><th>Overtime<br /><small>h:mm</small></th><th>Updated by</th><th>Verified by</th><th>Actions</th></tr></thead>
          <tbody>{pageVehicles.map(vehicle => <VehicleDataRow key={vehicle.id + format(currentMonth, 'yyyy-MM')} vehicle={vehicle} currentMonth={currentMonth} vehicleRecord={monthRecords?.[vehicle.id]} />)}</tbody>
        </table>
        {!filtered.length && <div className={styles.empty}><p>{monthVehicles.length ? 'No vehicles match your search or status filter.' : 'No vehicles available for this month.'}</p>{monthVehicles.length > 0 && <Button variant="outline" onClick={clear}>Clear filters</Button>}</div>}
        <footer className={styles.pagination}>
          <span>{filtered.length ? 'Showing ' + ((currentPage - 1) * pageSize + 1) + '–' + Math.min(currentPage * pageSize, filtered.length) + ' of ' + filtered.length + ' vehicles' : '0 vehicles'}</span>
          <div><Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span aria-live="polite">{currentPage} / {pageCount}</span><Button variant="outline" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button></div>
        </footer>
      </section>
      <p className={styles.note}><Lock size={15} />Completed logs are locked. Only an admin can unlock them.</p>
    </div>;
}
