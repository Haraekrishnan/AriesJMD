

'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, CheckCircle, X, FileDown, ChevronsUpDown } from 'lucide-react';
import UTMachineTable from '@/components/ut-machine/UTMachineTable';
import AddUTMachineDialog from '@/components/ut-machine/AddUTMachineDialog';
import type { UTMachine, DftMachine, MobileSim, LaptopDesktop, CertificateRequest, Role, DigitalCamera, Anemometer, OtherEquipment } from '@/lib/types';
import EditUTMachineDialog from '@/components/ut-machine/EditUTMachineDialog';
import { addDays, isBefore, format, formatDistanceToNow, eachDayOfInterval, isSameDay, isAfter } from 'date-fns';
import UTMachineLogManagerDialog from '@/components/ut-machine/UTMachineLogManagerDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AddDftMachineDialog from '@/components/dft-machine/AddDftMachineDialog';
import DftMachineTable from '@/components/dft-machine/DftMachineTable';
import EditDftMachineDialog from '@/components/dft-machine/EditDftMachineDialog';
import DftMachineLogManagerDialog from '@/components/dft-machine/DftMachineLogManagerDialog';
import AddLaptopDesktopDialog from '@/components/laptops-desktops/AddLaptopDesktopDialog';
import LaptopDesktopTable from '@/components/laptops-desktops/LaptopDesktopTable';
import EditLaptopDesktopDialog from '@/components/laptops-desktops/EditLaptopDesktopDialog';
import AddMobileSimDialog from '@/components/mobile-sim/AddMobileSimDialog';
import EditMobileSimDialog from '@/components/mobile-sim/EditMobileSimDialog';
import MobileSimTable from '@/components/mobile-sim/MobileSimTable';
import ViewCertificateRequestDialog from '@/components/inventory/ViewCertificateRequestDialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddDigitalCameraDialog from '@/components/digital-camera/AddDigitalCameraDialog';
import EditDigitalCameraDialog from '@/components/digital-camera/EditDigitalCameraDialog';
import DigitalCameraTable from '@/components/digital-camera/DigitalCameraTable';
import AddAnemometerDialog from '@/components/anemometer/AddAnemometerDialog';
import EditAnemometerDialog from '@/components/anemometer/EditAnemometerDialog';
import AnemometerTable from '@/components/anemometer/AnemometerTable';
import AddOtherEquipmentDialog from '@/components/other-equipment/AddOtherEquipmentDialog';
import EditOtherEquipmentDialog from '@/components/other-equipment/EditOtherEquipmentDialog';
import OtherEquipmentTable from '@/components/other-equipment/OtherEquipmentTable';


export default function EquipmentStatusPage() {
    const { can, user, users, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, myFulfilledEquipmentCertRequests, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, certificateRequests, inventoryItems, machineLogs } = useAppContext();
    
    // UT Machine State
    const [isAddUTMachineOpen, setIsAddUTMachineOpen] = useState(false);
    const [isEditUTMachineOpen, setIsEditUTMachineOpen] = useState(false);
    const [isUTLogManagerOpen, setIsUTLogManagerOpen] = useState(false);
    const [selectedUTMachine, setSelectedUTMachine] = useState<UTMachine | null>(null);

    // DFT Machine State
    const [isAddDftMachineOpen, setIsAddDftMachineOpen] = useState(false);
    const [isEditDftMachineOpen, setIsEditDftMachineOpen] = useState(false);
    const [isDftLogManagerOpen, setIsDftLogManagerOpen] = useState(false);
    const [selectedDftMachine, setSelectedDftMachine] = useState<DftMachine | null>(null);
    
    // Mobile/SIM State
    const [isAddMobileSimOpen, setIsAddMobileSimOpen] = useState(false);
    const [isEditMobileSimOpen, setIsEditMobileSimOpen] = useState(false);
    const [selectedMobileSim, setSelectedMobileSim] = useState<MobileSim | null>(null);
    
    // Laptop/Desktop State
    const [isAddLaptopDesktopOpen, setIsAddLaptopDesktopOpen] = useState(false);
    const [isEditLaptopDesktopOpen, setIsEditLaptopDesktopOpen] = useState(false);
    const [selectedLaptopDesktop, setSelectedLaptopDesktop] = useState<LaptopDesktop | null>(null);

    // Digital Camera State
    const [isAddDigitalCameraOpen, setIsAddDigitalCameraOpen] = useState(false);
    const [isEditDigitalCameraOpen, setIsEditDigitalCameraOpen] = useState(false);
    const [selectedDigitalCamera, setSelectedDigitalCamera] = useState<DigitalCamera | null>(null);

    // Anemometer State
    const [isAddAnemometerOpen, setIsAddAnemometerOpen] = useState(false);
    const [isEditAnemometerOpen, setIsEditAnemometerOpen] = useState(false);
    const [selectedAnemometer, setSelectedAnemometer] = useState<Anemometer | null>(null);

    // Other Equipment State
    const [isAddOtherEquipmentOpen, setIsAddOtherEquipmentOpen] = useState(false);
    const [isEditOtherEquipmentOpen, setIsEditOtherEquipmentOpen] = useState(false);
    const [selectedOtherEquipment, setSelectedOtherEquipment] = useState<OtherEquipment | null>(null);

    const [viewingCertRequest, setViewingCertRequest] = useState<CertificateRequest | null>(null);
    
    // Report State
    const [activeDaysDateRange, setActiveDaysDateRange] = useState<DateRange | undefined>();
    const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

    const allMachines = useMemo(() => [...utMachines, ...dftMachines], [utMachines, dftMachines]);

    const canManageStore = useMemo(() => {
        if(!user) return false;
        const storeRoles: Role[] = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Manager'];
        return storeRoles.includes(user.role);
    }, [user]);

    const myEquipmentCertRequests = useMemo(() => {
        if (!user) return [];
        return certificateRequests.filter(req => req.requesterId === user.id && (req.utMachineId || req.dftMachineId));
    }, [certificateRequests, user]);
    
    const pendingCertRequestsForMe = useMemo(() => {
        if (!canManageStore) return [];
        return certificateRequests.filter(req => req.status === 'Pending' && (req.utMachineId || req.dftMachineId));
    }, [certificateRequests, canManageStore]);


    useEffect(() => {
        if (myFulfilledEquipmentCertRequests.some(req => !req.viewedByRequester)) {
            markFulfilledRequestsAsViewed('equipment');
        }
    }, [myFulfilledEquipmentCertRequests, markFulfilledRequestsAsViewed]);

    const expiringMachines = useMemo(() => {
        const thirtyDaysFromNow = addDays(new Date(), 30);
        return utMachines.filter(m => isBefore(new Date(m.calibrationDueDate), thirtyDaysFromNow));
    }, [utMachines]);

    // UT Handlers
    const handleEditUT = (machine: UTMachine) => { setSelectedUTMachine(machine); setIsEditUTMachineOpen(true); };
    const handleAddUT = () => { setSelectedUTMachine(null); setIsAddUTMachineOpen(true); };
    const handleLogManagerUT = (machine: UTMachine) => { setSelectedUTMachine(machine); setIsUTLogManagerOpen(true); };
    
    // DFT Handlers
    const handleEditDft = (machine: DftMachine) => { setSelectedDftMachine(machine); setIsEditDftMachineOpen(true); };
    const handleAddDft = () => { setSelectedDftMachine(null); setIsAddDftMachineOpen(true); };
    const handleLogManagerDft = (machine: DftMachine) => { setSelectedDftMachine(machine); setIsDftLogManagerOpen(true); };

    // Mobile/SIM Handlers
    const handleEditMobileSim = (item: MobileSim) => { setSelectedMobileSim(item); setIsEditMobileSimOpen(true); };
    const handleAddMobileSim = () => { setSelectedMobileSim(null); setIsAddMobileSimOpen(true); };


    // Laptop/Desktop Handlers
    const handleEditLaptopDesktop = (item: LaptopDesktop) => { setSelectedLaptopDesktop(item); setIsEditLaptopDesktopOpen(true); };
    const handleAddLaptopDesktop = () => { setSelectedLaptopDesktop(null); setIsAddLaptopDesktopOpen(true); };

    // Digital Camera Handlers
    const handleEditDigitalCamera = (item: DigitalCamera) => { setSelectedDigitalCamera(item); setIsEditDigitalCameraOpen(true); };
    const handleAddDigitalCamera = () => { setSelectedDigitalCamera(null); setIsAddDigitalCameraOpen(true); };

    // Anemometer Handlers
    const handleEditAnemometer = (item: Anemometer) => { setSelectedAnemometer(item); setIsEditAnemometerOpen(true); };
    const handleAddAnemometer = () => { setSelectedAnemometer(null); setIsAddAnemometerOpen(true); };

    // Other Equipment Handlers
    const handleEditOtherEquipment = (item: OtherEquipment) => { setSelectedOtherEquipment(item); setIsEditOtherEquipmentOpen(true); };
    const handleAddOtherEquipment = () => { setSelectedOtherEquipment(null); setIsAddOtherEquipmentOpen(true); };
    
    const detailedUsageData = useMemo(() => {
        if (!activeDaysDateRange?.from) {
            return { dates: [], machineData: [] };
        }

        const machinesToReport = selectedMachineIds.length > 0 
            ? allMachines.filter(m => selectedMachineIds.includes(m.id))
            : allMachines;

        if (machinesToReport.length === 0) {
            return { dates: [], machineData: [] };
        }
            
        const { from, to = from } = activeDaysDateRange;
        const daysInRange = eachDayOfInterval({ start: from, end: to });

        const data: Record<string, { machine: any; statuses: Record<string, string> }> = {};

        machinesToReport.forEach(machine => {
            data[machine.id] = { machine, statuses: {} };
        });

        daysInRange.forEach(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            machinesToReport.forEach(machine => {
                const dayLog = machineLogs.find(log => 
                    log.machineId === machine.id && isSameDay(new Date(log.date), day)
                );
                data[machine.id].statuses[dayStr] = dayLog ? dayLog.status : 'Idle';
            });
        });

        return {
            dates: daysInRange.map(d => format(d, 'yyyy-MM-dd')),
            machineData: Object.values(data)
        };
    }, [activeDaysDateRange, selectedMachineIds, allMachines, machineLogs]);

    const activeDaysSummary = useMemo(() => {
        if (!detailedUsageData || !detailedUsageData.machineData || detailedUsageData.machineData.length === 0) return [];
        return detailedUsageData.machineData.map(data => {
            const activeDays = Object.values(data.statuses).filter(s => s === 'Active').length;
            return {
                id: data.machine.id,
                name: data.machine.machineName,
                serialNumber: data.machine.serialNumber,
                activeDays,
            };
        });
    }, [detailedUsageData]);

    const handleExportActiveDays = () => {
        if (!detailedUsageData || !activeDaysSummary || activeDaysSummary.length === 0 || !activeDaysDateRange?.from) return;
    
        // Summary Sheet
        const summaryToExport = activeDaysSummary.map(item => ({
          'Machine Name': item.name,
          'Serial Number': item.serialNumber,
          'Total Active Days': item.activeDays,
        }));
        const summaryWorksheet = XLSX.utils.json_to_sheet(summaryToExport);
    
        // Detailed Log Sheet
        const machinesToReport = selectedMachineIds.length > 0
            ? allMachines.filter(m => selectedMachineIds.includes(m.id))
            : allMachines;
        
        const { from, to = from } = activeDaysDateRange;
        
        const logsInRange = machineLogs.filter(log => {
            const logDate = new Date(log.date);
            return machinesToReport.some(m => m.id === log.machineId) && isSameDay(logDate, from) || (isAfter(logDate, from) && isBefore(logDate, to));
        });

        const detailedLogData = logsInRange.map(log => {
            const machine = machinesToReport.find(m => m.id === log.machineId);
            if (!machine) return null;
            return {
                'Date': format(new Date(log.date), 'dd-MM-yyyy'),
                'Machine Name': machine.machineName,
                'Serial Number': machine.serialNumber,
                'Status': log.status,
                'Time (From-To)': `${log.fromTime} - ${log.toTime}`,
                'Used By': log.userName,
                'Location': log.location,
                'Job Description': log.jobDescription,
                'Reason for Idle': log.status === 'Idle' ? log.reason : 'N/A',
                'Probe Details': machine.probeDetails,
                'Cable Details': machine.cableDetails,
                'Calibration Due Date': format(new Date(machine.calibrationDueDate), 'dd-MM-yyyy')
            }
        }).filter(Boolean);

        const detailedWorksheet = XLSX.utils.json_to_sheet(detailedLogData);
    
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary Report');
        XLSX.utils.book_append_sheet(workbook, detailedWorksheet, 'Detailed Log Report');
    
        XLSX.writeFile(workbook, 'Machine_Usage_Report.xlsx');
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
                    <p className="text-muted-foreground">Manage and track all company equipment and assets.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Usage Report</CardTitle>
                    <CardDescription>Count active usage days for machines within a date range.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                    <DateRangePicker date={activeDaysDateRange} onDateChange={setActiveDaysDateRange} />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[260px] justify-between">
                                {selectedMachineIds.length > 0 ? `${selectedMachineIds.length} machine(s) selected` : "Select machines..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[260px] p-0">
                            <Command>
                                <CommandInput placeholder="Search machines..." />
                                <CommandEmpty>No machines found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandList>
                                        {allMachines.map((machine) => (
                                        <CommandItem
                                            key={machine.id}
                                            value={machine.machineName}
                                            onSelect={() => {
                                                const selected = new Set(selectedMachineIds);
                                                if (selected.has(machine.id)) {
                                                    selected.delete(machine.id);
                                                } else {
                                                    selected.add(machine.id);
                                                }
                                                setSelectedMachineIds(Array.from(selected));
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", selectedMachineIds.includes(machine.id) ? "opacity-100" : "opacity-0")}/>
                                            {machine.machineName} (SN: {machine.serialNumber})
                                        </CommandItem>
                                        ))}
                                    </CommandList>
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleExportActiveDays} disabled={!activeDaysDateRange?.from || activeDaysSummary.length === 0}>
                        <FileDown className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                </CardContent>
                {activeDaysDateRange?.from && (
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Machine Name</TableHead>
                                    <TableHead>Serial Number</TableHead>
                                    <TableHead className="text-right">Total Active Days</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeDaysSummary.length > 0 ? (
                                    activeDaysSummary.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.serialNumber}</TableCell>
                                            <TableCell className="text-right font-bold">{item.activeDays}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No active days recorded for selected machines in this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                )}
            </Card>

            <Tabs defaultValue="ut-machines" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="ut-machines">UT Machines</TabsTrigger>
                    <TabsTrigger value="dft-machines">DFT Machines</TabsTrigger>
                    <TabsTrigger value="digital-camera">Digital Camera</TabsTrigger>
                    <TabsTrigger value="anemometer">Anemometer</TabsTrigger>
                    <TabsTrigger value="mobile-sim">Mobile &amp; SIM</TabsTrigger>
                    <TabsTrigger value="laptops-desktops">Laptops &amp; Desktops</TabsTrigger>
                    <TabsTrigger value="other-equipments">Other Equipments</TabsTrigger>
                </TabsList>
                <TabsContent value="ut-machines" className="mt-4 space-y-4">
                    <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddUT}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add UT Machine
                            </Button>
                        )}
                    </div>
                    {can.manage_equipment_status && expiringMachines.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Expiring Calibrations</CardTitle>
                                <CardDescription>The following machines have calibrations expiring within 30 days.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {expiringMachines.map((m, i) => (
                                        <div key={i} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                            <span className="font-semibold">{m.machineName} (SN: {m.serialNumber})</span>: Calibration expires on {format(new Date(m.calibrationDueDate), 'dd-MM-yyyy')}.
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {canManageStore && pendingCertRequestsForMe.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Certificate Requests</CardTitle>
                                <CardDescription>Review and action these certificate requests.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pendingCertRequestsForMe.map(req => {
                                    const requester = users.find(u => u.id === req.requesterId);
                                    const machine = utMachines.find(m => m.id === req.utMachineId) || dftMachines.find(m => m.id === req.dftMachineId);
                                    const subject = machine ? `${machine.machineName} (SN: ${machine.serialNumber})` : 'Unknown';

                                    return (
                                        <div key={req.id} className="p-4 border rounded-lg flex justify-between items-center">
                                            <div><p><span className="font-semibold">{requester?.name}</span> requests a <span className="font-semibold">{req.requestType}</span></p><p className="text-sm text-muted-foreground">For: {subject}</p></div>
                                            <Button size="sm" onClick={() => setViewingCertRequest(req)}>Review Request</Button>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}
                    {myEquipmentCertRequests.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>My Certificate Requests</CardTitle>
                                <CardDescription>Status of your submitted certificate requests for equipment.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {myEquipmentCertRequests.map(req => {
                                    const machine = utMachines.find(m => m.id === req.utMachineId) || dftMachines.find(m => m.id === req.dftMachineId);
                                    const subject = machine ? `${machine.machineName} (SN: ${machine.serialNumber})` : 'Unknown';
                                    const commentsArray = Array.isArray(req.comments) ? req.comments : Object.values(req.comments || {});
                                    return (
                                        <div key={req.id} className="p-3 border rounded-lg bg-muted/50">
                                            <Accordion type="single" collapsible>
                                                <AccordionItem value="item-1" className="border-b-0">
                                                    <div className="flex justify-between items-start">
                                                        <AccordionTrigger className="p-0 hover:no-underline flex-1 text-left">
                                                            <div>
                                                                <p className="font-semibold">{req.requestType} for {subject}</p>
                                                                <p className="text-sm text-muted-foreground">Submitted {formatDistanceToNow(new Date(req.requestDate), { addSuffix: true })}</p>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <div className="flex items-center gap-2 pl-4">
                                                          <Badge variant={req.status === 'Completed' ? 'default' : req.status === 'Rejected' ? 'destructive' : 'secondary'}>{req.status}</Badge>
                                                          {req.status === 'Completed' && (
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => acknowledgeFulfilledRequest(req.id)}><X className="h-4 w-4"/></Button>
                                                          )}
                                                        </div>
                                                    </div>
                                                    <AccordionContent className="pt-2">
                                                        <div className="space-y-2 mt-2 pt-2 border-t">
                                                            {commentsArray.length > 0 ? commentsArray.map((c, i) => {
                                                                const commentUser = users.find(u => u.id === c.userId);
                                                                return (
                                                                    <div key={i} className="flex items-start gap-2">
                                                                        <Avatar className="h-6 w-6"><AvatarImage src={commentUser?.avatar} /><AvatarFallback>{commentUser?.name.charAt(0)}</AvatarFallback></Avatar>
                                                                        <div className="text-xs bg-background p-2 rounded-md w-full">
                                                                            <div className="flex justify-between items-baseline"><p className="font-semibold">{commentUser?.name}</p><p className="text-muted-foreground">{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</p></div>
                                                                            <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }) : <p className="text-xs text-muted-foreground">No comments yet.</p>}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader><CardTitle>UT Machine List</CardTitle><CardDescription>A comprehensive list of all UT machines.</CardDescription></CardHeader>
                        <CardContent><UTMachineTable onEdit={handleEditUT} onLogManager={handleLogManagerUT} /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="dft-machines" className="mt-4 space-y-4">
                     <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddDft}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add DFT Machine
                            </Button>
                        )}
                    </div>
                    <Card>
                        <CardHeader><CardTitle>DFT Machine List</CardTitle><CardDescription>A comprehensive list of all DFT machines.</CardDescription></CardHeader>
                        <CardContent><DftMachineTable onEdit={handleEditDft} onLogManager={handleLogManagerDft} /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="digital-camera" className="mt-4 space-y-4">
                     <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddDigitalCamera}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Digital Camera
                            </Button>
                        )}
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Digital Cameras</CardTitle><CardDescription>List of all company-provided digital cameras.</CardDescription></CardHeader>
                        <CardContent><DigitalCameraTable onEdit={handleEditDigitalCamera} /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="anemometer" className="mt-4 space-y-4">
                     <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddAnemometer}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Anemometer
                            </Button>
                        )}
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Anemometers</CardTitle><CardDescription>List of all company-provided anemometers.</CardDescription></CardHeader>
                        <CardContent><AnemometerTable onEdit={handleEditAnemometer} /></CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="mobile-sim" className="mt-4 space-y-4">
                     <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddMobileSim}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Mobile/SIM
                            </Button>
                        )}
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Mobile &amp; SIM Allotment</CardTitle><CardDescription>List of all company-provided mobiles and SIM cards.</CardDescription></CardHeader>
                        <CardContent><MobileSimTable onEdit={handleEditMobileSim} /></CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="laptops-desktops" className="mt-4 space-y-4">
                     <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddLaptopDesktop}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Laptop/Desktop
                            </Button>
                        )}
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Laptops &amp; Desktops</CardTitle><CardDescription>List of all company-provided laptops and desktops.</CardDescription></CardHeader>
                        <CardContent><LaptopDesktopTable onEdit={handleEditLaptopDesktop} /></CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="other-equipments" className="mt-4 space-y-4">
                     <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddOtherEquipment}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Other Equipment
                            </Button>
                        )}
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Other Equipments</CardTitle><CardDescription>List of all other company-provided equipments.</CardDescription></CardHeader>
                        <CardContent><OtherEquipmentTable onEdit={handleEditOtherEquipment} /></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {can.manage_equipment_status && <AddUTMachineDialog isOpen={isAddUTMachineOpen} setIsOpen={setIsAddUTMachineOpen} />}
            {selectedUTMachine && can.manage_equipment_status && (<EditUTMachineDialog isOpen={isEditUTMachineOpen} setIsOpen={setIsEditUTMachineOpen} machine={selectedUTMachine}/>)}
            {selectedUTMachine && (<UTMachineLogManagerDialog isOpen={isUTLogManagerOpen} setIsOpen={setIsUTLogManagerOpen} machine={selectedUTMachine}/>)}

            {can.manage_equipment_status && <AddDftMachineDialog isOpen={isAddDftMachineOpen} setIsOpen={setIsAddDftMachineOpen} />}
            {selectedDftMachine && can.manage_equipment_status && (<EditDftMachineDialog isOpen={isEditDftMachineOpen} setIsOpen={setIsEditDftMachineOpen} machine={selectedDftMachine} />)}
            {selectedDftMachine && (<DftMachineLogManagerDialog isOpen={isDftLogManagerOpen} setIsOpen={setIsDftLogManagerOpen} machine={selectedDftMachine} />)}

            {can.manage_equipment_status && <AddMobileSimDialog isOpen={isAddMobileSimOpen} setIsOpen={setIsAddMobileSimOpen} />}
            {selectedMobileSim && can.manage_equipment_status && (<EditMobileSimDialog isOpen={isEditMobileSimOpen} setIsOpen={setIsEditMobileSimOpen} item={selectedMobileSim} />)}
        
            {can.manage_equipment_status && <AddLaptopDesktopDialog isOpen={isAddLaptopDesktopOpen} setIsOpen={setIsAddLaptopDesktopOpen} />}
            {selectedLaptopDesktop && can.manage_equipment_status && (<EditLaptopDesktopDialog isOpen={isEditLaptopDesktopOpen} setIsOpen={setIsEditLaptopDesktopOpen} item={selectedLaptopDesktop} />)}
            
            {can.manage_equipment_status && <AddDigitalCameraDialog isOpen={isAddDigitalCameraOpen} setIsOpen={setIsAddDigitalCameraOpen} />}
            {selectedDigitalCamera && can.manage_equipment_status && <EditDigitalCameraDialog isOpen={isEditDigitalCameraOpen} setIsOpen={setIsEditDigitalCameraOpen} item={selectedDigitalCamera} />}

            {can.manage_equipment_status && <AddAnemometerDialog isOpen={isAddAnemometerOpen} setIsOpen={setIsAddAnemometerOpen} />}
            {selectedAnemometer && can.manage_equipment_status && <EditAnemometerDialog isOpen={isEditAnemometerOpen} setIsOpen={setIsEditAnemometerOpen} item={selectedAnemometer} />}

            {can.manage_equipment_status && <AddOtherEquipmentDialog isOpen={isAddOtherEquipmentOpen} setIsOpen={setIsAddOtherEquipmentOpen} />}
            {selectedOtherEquipment && can.manage_equipment_status && <EditOtherEquipmentDialog isOpen={isEditOtherEquipmentOpen} setIsOpen={setIsEditOtherEquipmentOpen} item={selectedOtherEquipment} />}

            {viewingCertRequest && ( <ViewCertificateRequestDialog request={viewingCertRequest} isOpen={!!viewingCertRequest} setIsOpen={() => setViewingCertRequest(null)} /> )}
        </div>
    );
}
