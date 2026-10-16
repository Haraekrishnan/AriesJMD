'use client';
import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import type { Vehicle, Driver } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Car, Users, Wrench, FileWarning, ChevronDown, ChevronRight, MoreHorizontal, FileText, Edit, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { dueDocuments, expiryInfo, vehicleDocuments, driverDocuments, reportGroups } from './fleet-data';
import ExpiringDocumentsReport from './ExpiringDocumentsReport';
import styles from './fleet-workspace.module.css';

type Props = {
  initialTab?: string | null;
  onAddVehicle: () => void; onEditVehicle: (vehicle: Vehicle) => void;
  onLogs: (vehicle: Vehicle) => void; onAddDriver: () => void; onEditDriver: (driver: Driver) => void;
};
function DateValue({ value }: {value?: string}) {
  const info = expiryInfo(value);
  return <span className={styles.date + ' ' + styles[info.tone]}>{info.label}
    {info.tone === 'expired' && <small>Expired</small>}
    {info.tone === 'soon' && <small>{info.days === 0 ? 'Due today' : 'Due soon'}</small>}
  </span>;
}
export default function FleetWorkspace(props: Props) {
  const { can } = useAuth();
  const { vehicles, drivers, deleteVehicle, deleteDriver } = useGeneral();
  const { toast } = useToast();
  const normalizeTab = (value?: string | null) => ['vehicles', 'drivers', 'documents'].includes(value || '') && (value !== 'documents' || can.manage_vehicles) ? value! : 'vehicles';
  const [tab, setTab] = useState(normalizeTab(props.initialTab));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [ownerType, setOwnerType] = useState('all');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<{type:'Vehicle'|'Driver';id:string;name:string} | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTab(normalizeTab(props.initialTab)); setSearch(''); setPage(1); }, [props.initialTab]);
  const activeTab = tab === 'documents' && !can.manage_vehicles ? 'vehicles' : tab;
  const switchTab = (value: string) => { setTab(value); setSearch(''); setStatus('all'); setDueFilter('all'); setOwnerType('all'); setPage(1); };
  const documents = can.manage_vehicles ? dueDocuments(vehicles, drivers) : [];
  const expiredCount = documents.filter(row => expiryInfo(row.expiry).tone === 'expired').length;
  const needle = search.trim().toLowerCase();
  const driverName = (id: string) => drivers.find(driver => driver.id === id)?.name || 'Unassigned';
  const filteredVehicles = vehicles.filter(vehicle =>
    [vehicle.vehicleNumber, vehicle.vapNumber, vehicle.vendorName, driverName(vehicle.driverId)].join(' ').toLowerCase().includes(needle) &&
    (status === 'all' || (vehicle.status || 'Active') === status));
  const filteredDrivers = drivers.filter(driver => [driver.name, driver.licenseNumber].join(' ').toLowerCase().includes(needle));
  const filteredDocuments = documents.filter(row =>
    [row.owner, row.document, row.type].join(' ').toLowerCase().includes(needle) &&
    (ownerType === 'all' || row.type === ownerType) &&
    (dueFilter === 'all' || expiryInfo(row.expiry).tone === dueFilter));
  const total = activeTab === 'vehicles' ? filteredVehicles.length : activeTab === 'drivers' ? filteredDrivers.length : filteredDocuments.length;
  const pageSize = 8, pages = Math.max(1, Math.ceil(total / pageSize)), currentPage = Math.min(page, pages);
  const slice = <T,>(items: T[]) => items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetFilters = () => { setSearch(''); setStatus('all'); setDueFilter('all'); setOwnerType('all'); setPage(1); };
  const toggle = (id: string) => setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const report = reportGroups(filteredDocuments);
  const remove = async () => {
    if (!deleting || !can.manage_vehicles) return;
    setBusy(true);
    try {
      const result = await (deleting.type === 'Vehicle' ? deleteVehicle(deleting.id) : deleteDriver(deleting.id));
      if ((result as unknown) === false) throw new Error('The record could not be deleted.');
      toast({variant:'destructive', title: deleting.type + ' Deleted'}); setDeleting(null);
    } catch(error) { toast({variant:'destructive', title:'Delete failed', description:error instanceof Error ? error.message : 'Please try again.'}); }
    finally { setBusy(false); }
  };
  const stats = [
    {label:'Active vehicles', value:vehicles.filter(v => v.status === 'Active').length, icon:Car, tone:'blue'},
    {label:'Drivers', value:drivers.length, icon:Users, tone:'green'},
    {label:'In maintenance', value:vehicles.filter(v => v.status === 'In Maintenance').length, icon:Wrench, tone:'amber'},
    ...(can.manage_vehicles ? [{label:'Documents due', value:documents.length, icon:FileWarning, tone:'red'}] : []),
  ];
  const tabs = [{value:'vehicles',label:'Vehicles',count:vehicles.length},{value:'drivers',label:'Drivers',count:drivers.length},...(can.manage_vehicles ? [{value:'documents',label:'Documents due',count:documents.length}] : [])];
  const menu = (type:'Vehicle'|'Driver', id:string, name:string) => can.manage_vehicles && <DropdownMenu>
    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={'More actions for ' + name}><MoreHorizontal size={18}/></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onSelect={() => setDeleting({type,id,name})}>Delete {type.toLowerCase()}</DropdownMenuItem></DropdownMenuContent>
  </DropdownMenu>;
  return <div className={styles.page}>
    <header className={styles.header}><div><h1>Fleet Management</h1><p>Vehicles, drivers and document renewals.</p></div><Button asChild variant="outline"><Link href="/vehicle-usage-summary">Vehicle usage summary</Link></Button></header>
    <div className={styles.stats}>{stats.map(stat => <div key={stat.label} className={styles.stat + ' ' + styles[stat.tone]}><stat.icon size={28}/><div><span>{stat.label}</span><strong>{stat.value}</strong></div></div>)}</div>
    {expiredCount > 0 && <div className={styles.alert}><span><AlertTriangle size={18}/>{expiredCount} expired document{expiredCount === 1 ? '' : 's'} need attention</span><Button variant="ghost" onClick={() => {switchTab('documents');setDueFilter('expired');}}>Review documents →</Button></div>}
    <nav className={styles.tabs} aria-label="Fleet sections">{tabs.map(item => <button type="button" key={item.value} aria-pressed={activeTab === item.value} onClick={() => switchTab(item.value)}>{item.label}<span>{item.count}</span></button>)}</nav>
    <section className={styles.register} aria-label={activeTab === 'documents' ? 'Renewal register' : activeTab === 'drivers' ? 'Driver directory' : 'Vehicle fleet'}>
      <div className={styles.sectionTitle}><h2>{activeTab === 'documents' ? 'Renewal register' : activeTab === 'drivers' ? 'Driver directory' : 'Vehicle fleet'}</h2>
        {activeTab === 'documents' ? <ExpiringDocumentsReport {...report}/> : can.manage_vehicles && <Button onClick={activeTab === 'vehicles' ? props.onAddVehicle : props.onAddDriver}><Plus size={16}/>{activeTab === 'vehicles' ? 'Add vehicle' : 'Add driver'}</Button>}
      </div>
      {activeTab === 'documents' && <div className={styles.dueTabs}>{[{value:'all',label:'All',count:documents.length},{value:'expired',label:'Expired',count:expiredCount},{value:'soon',label:'Due within 30 days',count:documents.length-expiredCount}].map(item => <button key={item.value} type="button" aria-pressed={dueFilter===item.value} onClick={() => {setDueFilter(item.value);setPage(1);}}>{item.label} <span>{item.count}</span></button>)}</div>}
      <div className={styles.filters}>
        <Input aria-label="Search fleet records" placeholder={activeTab === 'vehicles' ? 'Search vehicle, driver or vendor...' : activeTab === 'drivers' ? 'Search driver or license number...' : 'Search vehicle, driver or document...'} value={search} onChange={e => {setSearch(e.target.value);setPage(1);}}/>
        {activeTab === 'vehicles' && <select aria-label="Filter vehicle status" value={status} onChange={e => {setStatus(e.target.value);setPage(1);}}><option value="all">All statuses</option><option>Active</option><option>In Maintenance</option><option>Left the Project</option></select>}
        {activeTab === 'documents' && <select aria-label="Filter document owner" value={ownerType} onChange={e => {setOwnerType(e.target.value);setPage(1);}}><option value="all">All types</option><option>Vehicle</option><option>Driver</option></select>}
        <Button variant="outline" onClick={resetFilters}>Clear</Button>
      </div>
      {activeTab === 'vehicles' && <table className={styles.table + ' ' + styles.vehicleTable}><thead><tr><th>Vehicle / VAP no.</th><th>Status</th><th>Driver</th><th>Vendor</th><th>Next document due</th><th>Actions</th></tr></thead><tbody>
        {slice(filteredVehicles).map(vehicle => {
          const dates = vehicleDocuments.map(([key, label]) => ({label,value:vehicle[key],info:expiryInfo(vehicle[key])})).filter(item => item.info.date).sort((a,b) => a.info.date!.getTime()-b.info.date!.getTime());
          const next=dates[0], isExpanded=expanded.has(vehicle.id);
          return <Fragment key={vehicle.id}><tr>
            <td data-label="Vehicle" className={styles.identity}><button type="button" aria-label={'Details for '+vehicle.vehicleNumber} aria-expanded={isExpanded} aria-controls={'vehicle-details-'+vehicle.id} onClick={() => toggle(vehicle.id)}>{isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}<span><strong>{vehicle.vehicleNumber}</strong><small>{vehicle.vapNumber || 'No VAP number'}</small></span></button></td>
            <td data-label="Status"><span className={styles.badge+' '+styles[vehicle.status === 'Active' ? 'green' : vehicle.status === 'In Maintenance' ? 'amber' : 'neutral']}>{vehicle.status || 'Active'}</span></td>
            <td data-label="Driver">{driverName(vehicle.driverId)}</td><td data-label="Vendor">{vehicle.vendorName || 'Not entered'}</td>
            <td data-label="Next document due">{next ? <><small>{next.label}</small><DateValue value={next.value}/></> : 'Not entered'}</td>
            <td data-label="Actions"><div className={styles.actions}><Button size="sm" variant="outline" onClick={() => props.onLogs(vehicle)}><FileText size={14}/>Logs</Button>{can.manage_vehicles && <Button size="sm" variant="outline" onClick={() => props.onEditVehicle(vehicle)}><Edit size={14}/>Edit</Button>}{menu('Vehicle',vehicle.id,vehicle.vehicleNumber)}</div></td>
          </tr>
          {isExpanded && <tr className={styles.detailRow} id={'vehicle-details-'+vehicle.id}><td colSpan={6}><div className={styles.details}><h3>Vehicle documents &amp; access</h3><div className={styles.info}><div><small>VAP number</small>{vehicle.vapNumber || 'Not entered'}</div><div><small>Seating capacity</small>{vehicle.seatingCapacity ?? 'Not entered'}</div><div><small>VAP access</small>{vehicle.vapAccess?.length ? vehicle.vapAccess.join(', ') : 'Not entered'}</div></div><div className={styles.documents}>{vehicleDocuments.map(([key,label]) => <div key={key}><small>{label}</small><DateValue value={vehicle[key]}/></div>)}</div></div></td></tr>}
          </Fragment>;
        })}
      </tbody></table>}
      {activeTab === 'drivers' && <table className={styles.table + ' ' + styles.driverTable}><thead><tr><th>Driver</th><th>License no.</th>{driverDocuments.map(([,label]) => <th key={label}>{label} expiry</th>)}{can.manage_vehicles && <th>Actions</th>}</tr></thead><tbody>{slice(filteredDrivers).map(driver => <tr key={driver.id}>
        <td data-label="Driver" className={styles.driver}><span className={styles.avatar}>{driver.photo ? <img src={driver.photo} alt=""/> : driver.name.charAt(0)}</span><strong>{driver.name}</strong></td>
        <td data-label="License no.">{driver.licenseNumber || 'Not entered'}</td>{driverDocuments.map(([key,label]) => <td key={key} data-label={label+' expiry'}><DateValue value={driver[key]}/></td>)}
        {can.manage_vehicles && <td data-label="Actions"><div className={styles.actions}><Button size="sm" variant="outline" onClick={() => props.onEditDriver(driver)}><Edit size={14}/>Edit</Button>{menu('Driver',driver.id,driver.name)}</div></td>}
      </tr>)}</tbody></table>}
      {activeTab === 'documents' && <><p className={styles.hint}>Expired and due within 30 days. Exports include all matching records across pages.</p><table className={styles.table + ' ' + styles.renewalTable}><thead><tr><th>Owner</th><th>Document</th><th>Expiry date</th><th>Due status</th><th>Actions</th></tr></thead><tbody>{slice(filteredDocuments).map(row => {
        const info=expiryInfo(row.expiry), days=info.days!;
        return <tr key={row.id}><td data-label="Owner"><strong>{row.owner}</strong><small>{row.type}</small></td><td data-label="Document">{row.document}</td><td data-label="Expiry date">{info.label}</td><td data-label="Due status"><span className={styles.badge+' '+styles[days<0?'red':'amber']}>{days<0 ? 'Expired '+Math.abs(days)+' days ago' : days===0 ? 'Due today' : 'Due in '+days+' days'}</span></td><td data-label="Actions"><Button variant="outline" size="sm" onClick={() => row.vehicle ? props.onEditVehicle(row.vehicle) : row.driver && props.onEditDriver(row.driver)}>Review</Button></td></tr>;
      })}</tbody></table></>}
      {!total && <div className={styles.empty}><p>No matching {activeTab === 'documents' ? 'documents' : activeTab} found.</p><Button variant="outline" onClick={resetFilters}>Clear filters</Button></div>}
      <footer className={styles.pagination}><span>{total ? 'Showing '+((currentPage-1)*pageSize+1)+'–'+Math.min(currentPage*pageSize,total)+' of '+total : '0 records'}</span><div><Button variant="outline" disabled={currentPage===1} onClick={() => setPage(currentPage-1)}>Previous</Button><span aria-live="polite">{currentPage} / {pages}</span><Button variant="outline" disabled={currentPage===pages} onClick={() => setPage(currentPage+1)}>Next</Button></div></footer>
    </section>
    <AlertDialog open={!!deleting} onOpenChange={open => {if(!open&&!busy)setDeleting(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleting?.type.toLowerCase()}?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {deleting?.name}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => {event.preventDefault();void remove();}}>{busy?'Deleting...':'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
