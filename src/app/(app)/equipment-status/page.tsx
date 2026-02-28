
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useInventory } from '@/contexts/inventory-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, CheckCircle, X, FileDown, ChevronsUpDown, FilePlus, Search, FilePen } from 'lucide-react';
import UTMachineTable from '@/components/ut-machine/UTMachineTable';
import AddUTMachineDialog from '@/components/ut-machine/AddUTMachineDialog';
import type { UTMachine, DftMachine, MobileSim, LaptopDesktop, CertificateRequest, Role, DigitalCamera, Anemometer, OtherEquipment, PneumaticDrillingMachine, PneumaticAngleGrinder, WiredDrillingMachine, CordlessDrillingMachine, WiredAngleGrinder, CordlessAngleGrinder, CordlessReciprocatingSaw, WeldingMachine, WalkieTalkie } from '@/lib/types';
import EditUTMachineDialog from '@/components/ut-machine/EditUTMachineDialog';
import { addDays, isBefore, format, formatDistanceToNow, eachDayOfInterval, isSameDay, isAfter, parseISO } from 'date-fns';
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
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
import EquipmentSummary from '@/components/equipment/EquipmentSummary';
import GenerateTpCertDialog from '@/components/inventory/GenerateTpCertDialog';
import PendingTransfers from '@/components/requests/PendingTransfers';
import { useToast } from '@/hooks/use-toast';
import EquipmentFilters, { type EquipmentFilterValues } from '@/components/equipment/EquipmentFilters';
import ExpiringCalibrationsReport from '@/components/equipment/ExpiringCalibrationsReport';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/app-provider';
import UpdateItemsDialog from '@/components/inventory/UpdateItemsDialog';
import AddPneumaticDrillingMachineDialog from '@/components/pneumatic-drilling-machine/AddPneumaticDrillingMachineDialog';
import EditPneumaticDrillingMachineDialog from '@/components/pneumatic-drilling-machine/EditPneumaticDrillingMachineDialog';
import PneumaticDrillingMachineTable from '@/components/pneumatic-drilling-machine/PneumaticDrillingMachineTable';
import AddPneumaticAngleGrinderDialog from '@/components/pneumatic-angle-grinder/AddPneumaticAngleGrinderDialog';
import EditPneumaticAngleGrinderDialog from '@/components/pneumatic-angle-grinder/EditPneumaticAngleGrinderDialog';
import PneumaticAngleGrinderTable from '@/components/pneumatic-angle-grinder/PneumaticAngleGrinderTable';
import AddWiredDrillingMachineDialog from '@/components/wired-drilling-machine/AddWiredDrillingMachineDialog';
import EditWiredDrillingMachineDialog from '@/components/wired-drilling-machine/EditWiredDrillingMachineDialog';
import WiredDrillingMachineTable from '@/components/wired-drilling-machine/WiredDrillingMachineTable';
import AddCordlessDrillingMachineDialog from '@/components/cordless-drilling-machine/AddCordlessDrillingMachineDialog';
import EditCordlessDrillingMachineDialog from '@/components/cordless-drilling-machine/EditCordlessDrillingMachineDialog';
import CordlessDrillingMachineTable from '@/components/cordless-drilling-machine/CordlessDrillingMachineTable';
import AddWiredAngleGrinderDialog from '@/components/wired-angle-grinder/AddWiredAngleGrinderDialog';
import EditWiredAngleGrinderDialog from '@/components/wired-angle-grinder/EditWiredAngleGrinderDialog';
import WiredAngleGrinderTable from '@/components/wired-angle-grinder/WiredAngleGrinderTable';
import AddCordlessAngleGrinderDialog from '@/components/cordless-angle-grinder/AddCordlessAngleGrinderDialog';
import EditCordlessAngleGrinderDialog from '@/components/cordless-angle-grinder/EditCordlessAngleGrinderDialog';
import CordlessAngleGrinderTable from '@/components/cordless-angle-grinder/CordlessAngleGrinderTable';
import AddCordlessReciprocatingSawDialog from '@/components/cordless-reciprocating-saw/AddCordlessReciprocatingSawDialog';
import EditCordlessReciprocatingSawDialog from '@/components/cordless-reciprocating-saw/EditCordlessReciprocatingSawDialog';
import CordlessReciprocatingSawTable from '@/components/cordless-reciprocating-saw/CordlessReciprocatingSawTable';
import AddWeldingMachineDialog from '@/components/welding-machine/AddWeldingMachineDialog';
import EditWeldingMachineDialog from '@/components/welding-machine/EditWeldingMachineDialog';
import WeldingMachineTable from '@/components/welding-machine/WeldingMachineTable';
import AddWalkieTalkieDialog from '@/components/walkie-talkie/AddWalkieTalkieDialog';
import EditWalkieTalkieDialog from '@/components/walkie-talkie/EditWalkieTalkieDialog';
import WalkieTalkieTable from '@/components/walkie-talkie/WalkieTalkieTable';

export default function EquipmentStatusPage() {
    const { user, users, can } = useAuth();
    const { projects } = useGeneral();
    const { 
        utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, 
        pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, cordlessDrillingMachines,
        wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws, weldingMachines, walkieTalkies,
        certificateRequests, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, machineLogs, inventoryItems 
    } = useInventory();
    const { toast } = useToast();
    const { manpowerProfiles } = useAppContext();
    const [activeTab, setActiveTab] = useState('ut-machines');
    
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

    // Pneumatic Drilling Machine State
    const [isAddPneumaticDrillingMachineOpen, setIsAddPneumaticDrillingMachineOpen] = useState(false);
    const [editingPneumaticDrillingMachine, setEditingPneumaticDrillingMachine] = useState<PneumaticDrillingMachine | null>(null);

    // Pneumatic Angle Grinder State
    const [isAddPneumaticAngleGrinderOpen, setIsAddPneumaticAngleGrinderOpen] = useState(false);
    const [editingPneumaticAngleGrinder, setEditingPneumaticAngleGrinder] = useState<PneumaticAngleGrinder | null>(null);

    // Wired Drilling Machine State
    const [isAddWiredDrillingMachineOpen, setIsAddWiredDrillingMachineOpen] = useState(false);
    const [editingWiredDrillingMachine, setEditingWiredDrillingMachine] = useState<WiredDrillingMachine | null>(null);

    // Cordless Drilling Machine State
    const [isAddCordlessDrillingMachineOpen, setIsAddCordlessDrillingMachineOpen] = useState(false);
    const [editingCordlessDrillingMachine, setEditingCordlessDrillingMachine] = useState<CordlessDrillingMachine | null>(null);

    // Wired Angle Grinder State
    const [isAddWiredAngleGrinderOpen, setIsAddWiredAngleGrinderOpen] = useState(false);
    const [editingWiredAngleGrinder, setEditingWiredAngleGrinder] = useState<WiredAngleGrinder | null>(null);

    // Cordless Angle Grinder State
    const [isAddCordlessAngleGrinderOpen, setIsAddCordlessAngleGrinderOpen] = useState(false);
    const [editingCordlessAngleGrinder, setEditingCordlessAngleGrinder] = useState<CordlessAngleGrinder | null>(null);

    // Cordless Reciprocating Saw State
    const [isAddCordlessReciprocatingSawOpen, setIsAddCordlessReciprocatingSawOpen] = useState(false);
    const [editingCordlessReciprocatingSaw, setEditingCordlessReciprocatingSaw] = useState<CordlessReciprocatingSaw | null>(null);

    // Welding Machine State
    const [isAddWeldingMachineOpen, setIsAddWeldingMachineOpen] = useState(false);
    const [editingWeldingMachine, setEditingWeldingMachine] = useState<WeldingMachine | null>(null);

    // Walkie Talkie State
    const [isAddWalkieTalkieOpen, setIsAddWalkieTalkieOpen] = useState(false);
    const [editingWalkieTalkie, setEditingWalkieTalkie] = useState<WalkieTalkie | null>(null);

    const [isUpdateItemsOpen, setIsUpdateItemsOpen] = useState(false);


    const [viewingCertRequest, setViewingCertRequest] = useState<CertificateRequest | null>(null);
    const [isGenerateCertOpen, setIsGenerateCertOpen] = useState(false);
    
    // Report State
    const [activeDaysDateRange, setActiveDaysDateRange] = useState<DateRange | undefined>();
    const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

    const [filters, setFilters] = useState<EquipmentFilterValues>({
        projectId: 'all',
        status: 'all',
    });
    
    const [mobileSearchTerm, setMobileSearchTerm] = useState('');

    const applyFilters = (items: any[]) => {
        if (!items) return [];
        return items.filter(item => {
            const { projectId, status } = filters;
            const projectMatch = projectId === 'all' || ('projectId' in item && item.projectId === projectId) || ('allottedTo' in item && users.find(u => u.id === item.allottedTo)?.projectIds?.includes(projectId));
            const statusMatch = status === 'all' || item.status === status;
            return projectMatch && statusMatch;
        });
    };

    const filteredUtMachines = useMemo(() => applyFilters(utMachines), [utMachines, filters]);
    const filteredDftMachines = useMemo(() => applyFilters(dftMachines), [dftMachines, filters]);
    const filteredDigitalCameras = useMemo(() => applyFilters(digitalCameras), [digitalCameras, filters]);
    const filteredAnemometers = useMemo(() => applyFilters(anemometers), [anemometers, filters]);
    
    const filteredMobileSims = useMemo(() => {
        let items = applyFilters(mobileSims);
        if (mobileSearchTerm) {
            const lowercasedTerm = mobileSearchTerm.toLowerCase();
            const allPersonnel = [...users, ...manpowerProfiles];
            items = items.filter(item => {
                const numberToSearch = (item.simNumber || item.number || '').toLowerCase();
                const imeiToSearch = (item.imei || '').toLowerCase();
                const ariesIdToSearch = (item.ariesId || '').toLowerCase();
                const allottedTo = allPersonnel.find(p => p.id === item.allottedToUserId);
                const allottedToName = (allottedTo?.name || '').toLowerCase();

                return numberToSearch.includes(lowercasedTerm) || 
                       imeiToSearch.includes(lowercasedTerm) || 
                       ariesIdToSearch.includes(lowercasedTerm) ||
                       allottedToName.includes(lowercasedTerm);
            });
        }
        return items;
    }, [mobileSims, filters, mobileSearchTerm, users, manpowerProfiles]);

    const filteredLaptopsDesktops = useMemo(() => applyFilters(laptopsDesktops), [laptopsDesktops, filters]);
    const filteredOtherEquipments = useMemo(() => applyFilters(otherEquipments), [otherEquipments, filters]);
    const filteredWeldingMachines = useMemo(() => applyFilters(weldingMachines), [weldingMachines, filters]);
    const filteredWalkieTalkies = useMemo(() => applyFilters(walkieTalkies), [walkieTalkies, filters]);

    const filteredPneumaticDrillingMachines = useMemo(() => applyFilters(pneumaticDrillingMachines), [pneumaticDrillingMachines, filters]);
    const filteredPneumaticAngleGrinders = useMemo(() => applyFilters(pneumaticAngleGrinders), [pneumaticAngleGrinders, filters]);
    const filteredWiredDrillingMachines = useMemo(() => applyFilters(wiredDrillingMachines), [wiredDrillingMachines, filters]);
    const filteredCordlessDrillingMachines = useMemo(() => applyFilters(cordlessDrillingMachines), [cordlessDrillingMachines, filters]);
    const filteredWiredAngleGrinders = useMemo(() => applyFilters(wiredAngleGrinders), [wiredAngleGrinders, filters]);
    const filteredCordlessAngleGrinders = useMemo(() => applyFilters(cordlessAngleGrinders), [cordlessAngleGrinders, filters]);
    const filteredCordlessReciprocatingSaws = useMemo(() => applyFilters(cordlessReciprocatingSaws), [cordlessReciprocatingSaws, filters]);

    const allMachines = useMemo(() => [...utMachines, ...dftMachines], [utMachines, dftMachines]);

    const canManageStore = useMemo(() => {
        if(!user) return false;
        const storeRoles: Role[] = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'];
        return storeRoles.includes(user.role);
    }, [user]);

    const canAddEquipment = useMemo(() => {
        if (!user) return false;
        const addRoles: Role[] = ['Store in Charge', 'Document Controller', 'Admin', 'Project Coordinator', 'NDT Supervisor'];
        return addRoles.includes(user.role);
    }, [user]);

    const myFulfilledEquipmentCertRequests = useMemo(() => {
        if (!user) return [];
        return certificateRequests.filter(req => req.requesterId === user.id && req.status === 'Completed' && (req.utMachineId || req.dftMachineId));
      }, [certificateRequests, user]);

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
        let relevantMachines = [...utMachines, ...dftMachines, ...anemometers];

        // Filter machines based on user's projects if they don't have full view permissions
        if (user && !can.manage_equipment_status) {
            const userProjectIds = new Set(user.projectIds);
            relevantMachines = relevantMachines.filter(m => m.projectId && userProjectIds.has(m.projectId));
        }
        
        return relevantMachines
            .map(m => ({ machine: m, calibrationDueDate: m.calibrationDueDate ? new Date(m.calibrationDueDate) : null }))
            .filter(item => item.calibrationDueDate && isBefore(item.calibrationDueDate, thirtyDaysFromNow));
    }, [utMachines, dftMachines, anemometers, user, can.manage_equipment_status]);

    // UT Handlers
    const handleEditUT = (machine: UTMachine) => { setSelectedUTMachine(machine); setIsEditUTMachineOpen(true); };
    const handleLogManagerUT = (machine: UTMachine) => { setSelectedUTMachine(machine); setIsUTLogManagerOpen(true); };
    
    // DFT Handlers
    const handleEditDft = (machine: DftMachine) => { setSelectedDftMachine(machine); setIsEditDftMachineOpen(true); };
    const handleLogManagerDft = (machine: DftMachine) => { setSelectedDftMachine(machine); setIsDftLogManagerOpen(true); };

    // Mobile/SIM Handlers
    const handleEditMobileSim = (item: MobileSim) => { setSelectedMobileSim(item); setIsEditMobileSimOpen(true); };

    // Laptop/Desktop Handlers
    const handleEditLaptopDesktop = (item: LaptopDesktop) => { setSelectedLaptopDesktop(item); setIsEditLaptopDesktopOpen(true); };

    // Digital Camera Handlers
    const handleEditDigitalCamera = (item: DigitalCamera) => { setSelectedDigitalCamera(item); setIsEditDigitalCameraOpen(true); };

    // Anemometer Handlers
    const handleEditAnemometer = (item: Anemometer) => { setSelectedAnemometer(item); setIsEditAnemometerOpen(true); };

    // Other Equipment Handlers
    const handleEditOtherEquipment = (item: OtherEquipment) => { setSelectedOtherEquipment(item); setIsEditOtherEquipmentOpen(true); };

    // New Equipment handlers
    const handleEditPneumaticDrillingMachine = (item: PneumaticDrillingMachine) => { setEditingPneumaticDrillingMachine(item) };
    const handleEditPneumaticAngleGrinder = (item: PneumaticAngleGrinder) => { setEditingPneumaticAngleGrinder(item) };
    const handleEditWiredDrillingMachine = (item: WiredDrillingMachine) => { setEditingWiredDrillingMachine(item) };
    const handleEditCordlessDrillingMachine = (item: CordlessDrillingMachine) => { setEditingCordlessDrillingMachine(item) };
    const handleEditWiredAngleGrinder = (item: WiredAngleGrinder) => { setEditingWiredAngleGrinder(item) };
    const handleEditCordlessAngleGrinder = (item: CordlessAngleGrinder) => { setEditingCordlessAngleGrinder(item) };
    const handleEditCordlessReciprocatingSaw = (item: CordlessReciprocatingSaw) => { setEditingCordlessReciprocatingSaw(item) };
    const handleEditWeldingMachine = (item: WeldingMachine) => { setEditingWeldingMachine(item) };
    const handleEditWalkieTalkie = (item: WalkieTalkie) => { setEditingWalkieTalkie(item) };

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
    
        const wb = new ExcelJS.Workbook();
        
        // Summary Sheet
        const summaryWorksheet = wb.addWorksheet('Summary Report');
        summaryWorksheet.columns = [
            { header: 'Machine Name', key: 'name', width: 30 },
            { header: 'Serial Number', key: 'serial', width: 20 },
            { header: 'Total Active Days', key: 'activeDays', width: 20 },
        ];
        activeDaysSummary.forEach(item => {
            summaryWorksheet.addRow({
                name: item.name,
                serial: item.serialNumber,
                activeDays: item.activeDays,
            });
        });
    
        // Detailed Log Sheet
        const machinesToReport = selectedMachineIds.length > 0
            ? allMachines.filter(m => selectedMachineIds.includes(m.id))
            : allMachines;
        
        const { from, to = from } = activeDaysDateRange;
        
        const logsInRange = machineLogs.filter(log => {
            const logDate = parseISO(log.date);
            return machinesToReport.some(m => m.id === log.machineId) && (isSameDay(logDate, from) || (isAfter(logDate, from) && isBefore(logDate, to)));
        });

        const detailedWorksheet = wb.addWorksheet('Detailed Log Report');
        detailedWorksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Machine Name', key: 'machineName', width: 30 },
            { header: 'Serial Number', key: 'serialNumber', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Time (From-To)', key: 'time', width: 20 },
            { header: 'Used By', key: 'usedBy', width: 25 },
            { header: 'Location', key: 'location', width: 25 },
            { header: 'Job Description', key: 'job', width: 40 },
            { header: 'Reason for Idle', key: 'reason', width: 40 },
            { header: 'Probe Details', key: 'probe', width: 20 },
            { header: 'Cable Details', key: 'cable', width: 20 },
            { header: 'Calibration Due Date', key: 'calibDue', width: 20 },
        ];
        
        logsInRange.forEach(log => {
            const machine = machinesToReport.find(m => m.id === log.machineId);
            if (!machine) return null;
            detailedWorksheet.addRow({
                date: format(new Date(log.date), 'dd-MM-yyyy'),
                machineName: machine.machineName,
                serialNumber: machine.serialNumber,
                status: log.status,
                time: `${log.fromTime} - ${log.toTime}`,
                usedBy: log.userName,
                location: log.location,
                job: log.jobDescription,
                reason: log.status === 'Idle' ? log.reason : 'N/A',
                probe: (machine as any).probeDetails,
                cable: (machine as any).cableDetails,
                calibDue: format(new Date(machine.calibrationDueDate), 'dd-MM-yyyy')
            });
        });
    
        // Save the workbook
        wb.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), 'Machine_Usage_Report.xlsx');
        });
    };

    const handleExportAllEquipment = async () => {
        const workbook = new ExcelJS.Workbook();
        const allPersonnel = [...users, ...manpowerProfiles];
        
        const createSheet = (sheetName: string, headers: any[], data: any[]) => {
            const worksheet = workbook.addWorksheet(sheetName);
            worksheet.columns = headers;
            worksheet.addRows(data);
        };
    
        // UT Machines
        createSheet('UT Machines', [
            { header: 'Sl. No.', key: 'sl', width: 10 },
            { header: 'Machine Name', key: 'name', width: 25 },
            { header: 'Aries ID', key: 'ariesId', width: 20 },
            { header: 'Serial No.', key: 'serial', width: 20 },
            { header: 'Probe Details', key: 'probeDetails', width: 25 },
            { header: 'Probe Status', key: 'probeStatus', width: 15 },
            { header: 'Cable Details', key: 'cableDetails', width: 25 },
            { header: 'Cable Status', key: 'cableStatus', width: 15 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'Calibration Due', key: 'calibDue', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Remarks', key: 'remarks', width: 40 },
        ], filteredUtMachines.map((m, i) => ({
            sl: i + 1,
            name: m.machineName,
            ariesId: m.ariesId || 'N/A',
            serial: m.serialNumber,
            probeDetails: m.probeDetails || 'N/A',
            probeStatus: m.probeStatus || 'N/A',
            cableDetails: m.cableDetails || 'N/A',
            cableStatus: m.cableStatus || 'N/A',
            location: projects.find(p => p.id === m.projectId)?.name || 'N/A',
            calibDue: format(parseISO(m.calibrationDueDate), 'dd-MM-yyyy'),
            status: m.status,
            remarks: m.remarks || 'N/A',
        })));
    
        // DFT Machines
        createSheet('DFT Machines', [
            { header: 'Sl. No.', key: 'sl', width: 10 },
            { header: 'Machine Name', key: 'name', width: 25 },
            { header: 'Aries ID', key: 'ariesId', width: 20 },
            { header: 'Serial No.', key: 'serial', width: 20 },
            { header: 'Probe Details', key: 'probeDetails', width: 25 },
            { header: 'Cable Details', key: 'cableDetails', width: 25 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'Calibration Due', key: 'calibDue', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Remarks', key: 'remarks', width: 40 },
        ], filteredDftMachines.map((m, i) => ({
            sl: i + 1,
            name: m.machineName,
            ariesId: m.ariesId || 'N/A',
            serial: m.serialNumber,
            probeDetails: m.probeDetails,
            cableDetails: m.cableDetails,
            location: projects.find(p => p.id === m.projectId)?.name || 'N/A',
            calibDue: format(parseISO(m.calibrationDueDate), 'dd-MM-yyyy'),
            status: m.status,
            remarks: (m as any).remarks || 'N/A',
        })));

        // Digital Cameras
        createSheet('Digital Cameras', [
            { header: 'Sl. No.', key: 'sl', width: 10 },
            { header: 'Make & Model', key: 'makeModel', width: 30 },
            { header: 'Serial No.', key: 'serial', width: 20 },
            { header: 'Project', key: 'project', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Remarks', key: 'remarks', width: 40 },
        ], filteredDigitalCameras.map((item, i) => ({
            sl: i + 1,
            makeModel: `${item.make} ${item.model}`,
            serial: item.serialNumber,
            project: projects.find(p => p.id === item.projectId)?.name || 'N/A',
            status: item.status,
            remarks: item.remarks || 'N/A',
        })));

        // Anemometers
        createSheet('Anemometers', [
            { header: 'Sl. No.', key: 'sl', width: 10 },
            { header: 'Make & Model', key: 'makeModel', width: 30 },
            { header: 'Serial No.', key: 'serial', width: 20 },
            { header: 'Project', key: 'project', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Calibration Due', key: 'calibDue', width: 20 },
            { header: 'Remarks', key: 'remarks', width: 40 },
        ], filteredAnemometers.map((item, i) => ({
            sl: i + 1,
            makeModel: `${item.make} ${item.model}`,
            serial: item.serialNumber,
            project: projects.find(p => p.id === item.projectId)?.name || 'N/A',
            status: item.status,
            calibDue: item.calibrationDueDate ? format(parseISO(item.calibrationDueDate), 'dd-MM-yyyy') : 'N/A',
            remarks: item.remarks || 'N/A',
        })));
        
        // Laptops & Desktops
        createSheet('Laptops Desktops', [
            { header: 'Sl. No.', key: 'sl', width: 10 },
            { header: 'Make & Model', key: 'makeModel', width: 30 },
            { header: 'Serial No.', key: 'serial', width: 20 },
            { header: 'Allotted To', key: 'allottedTo', width: 25 },
            { header: 'Aries ID', key: 'ariesId', width: 20 },
            { header: 'Remarks', key: 'remarks', width: 40 },
        ], filteredLaptopsDesktops.map((item, i) => ({
            sl: i + 1,
            makeModel: `${item.make} ${item.model}`,
            serial: item.serialNumber,
            allottedTo: users.find(u => u.id === item.allottedTo)?.name || 'N/A',
            ariesId: item.ariesId || 'N/A',
            remarks: item.remarks || 'N/A',
        })));

        // Mobile & SIM
        createSheet('Mobile SIM', [
            { header: 'Sl. No.', key: 'sl', width: 10 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Make/Provider', key: 'provider', width: 20 },
            { header: 'Model/Number', key: 'number', width: 20 },
            { header: 'IMEI', key: 'imei', width: 20 },
            { header: 'Allotted To', key: 'allottedTo', width: 25 },
            { header: 'Project', key: 'project', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Aries ID', key: 'ariesId', width: 20 },
            { header: 'Remarks', key: 'remarks', width: 40 },
        ], filteredMobileSims.map((item, i) => ({
            sl: i + 1,
            type: item.type,
            provider: item.make || item.simProvider || 'N/A',
            number: item.model || item.simNumber || 'N/A',
            imei: item.imei || 'N/A',
            allottedTo: allPersonnel.find(p => p.id === item.allottedToUserId)?.name || 'N/A',
            project: projects.find(p => p.id === item.projectId)?.name || 'N/A',
            status: item.status,
            ariesId: item.ariesId || 'N/A',
            remarks: item.remarks || 'N/A',
        })));

        // Other Equipments
        createSheet('General Equipments', [
            { header: 'Sl. No.', key: 'sl', width: 10 },
            { header: 'Equipment Name', key: 'name', width: 30 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Serial No.', key: 'serial', width: 20 },
            { header: 'Aries ID', key: 'ariesId', width: 20 },
            { header: 'Project', key: 'project', width: 20 },
            { header: 'Remarks', key: 'remarks', width: 40 },
        ], filteredOtherEquipments.map((item, i) => ({
            sl: i + 1,
            name: item.equipmentName,
            category: item.category || 'N/A',
            serial: item.serialNumber,
            ariesId: item.ariesId || 'N/A',
            project: projects.find(p => p.id === item.projectId)?.name || 'N/A',
            remarks: item.remarks || 'N/A',
        })));
    
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'All_Equipment_Report.xlsx');
    };

    const handleAddClick = () => {
        if (!canAddEquipment) return;
        switch (activeTab) {
            case 'ut-machines': setIsAddUTMachineOpen(true); break;
            case 'dft-machines': setIsAddDftMachineOpen(true); break;
            case 'digital-camera': setIsAddDigitalCameraOpen(true); break;
            case 'anemometer': setIsAddAnemometerOpen(true); break;
            case 'mobile-sim': setIsAddMobileSimOpen(true); break;
            case 'laptops-desktops': setIsAddLaptopDesktopOpen(true); break;
            case 'pneumatic-drilling-machine': setIsAddPneumaticDrillingMachineOpen(true); break;
            case 'pneumatic-angle-grinder': setIsAddPneumaticAngleGrinderOpen(true); break;
            case 'wired-drilling-machine': setIsAddWiredDrillingMachineOpen(true); break;
            case 'cordless-drilling-machine': setIsAddCordlessDrillingMachineOpen(true); break;
            case 'wired-angle-grinder': setIsAddWiredAngleGrinderOpen(true); break;
            case 'cordless-angle-grinder': setIsAddCordlessAngleGrinderOpen(true); break;
            case 'cordless-reciprocating-saw': setIsAddCordlessReciprocatingSawOpen(true); break;
            case 'welding-machines': setIsAddWeldingMachineOpen(true); break;
            case 'walkie-talkie': setIsAddWalkieTalkieOpen(true); break;
            case 'general-equipments': setIsAddOtherEquipmentOpen(true); break;
        }
    };


    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
                    <p className="text-muted-foreground">Manage and track all company equipment and assets.</p>
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={handleExportAllEquipment} variant="outline">
                        <FileDown className="mr-2 h-4 w-4" /> Export All Equipment
                    </Button>
                    {canManageStore && (
                        <Button onClick={() => setIsGenerateCertOpen(true)} variant="outline">
                            <FilePlus className="mr-2 h-4 w-4"/> Generate TP Cert List
                        </Button>
                    )}
                </div>
            </div>

            <EquipmentSummary />
            
            {expiringMachines.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Expiring Calibrations</CardTitle>
                            <CardDescription>The following machines have calibrations expiring within 30 days.</CardDescription>
                        </div>
                        <ExpiringCalibrationsReport expiringMachines={expiringMachines} />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {expiringMachines.map((item, i) => (
                                <div key={i} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                    <span className="font-semibold">{item.machine.machineName || item.machine.make} (SN: {item.machine.serialNumber})</span>: Calibration expires on {format(item.calibrationDueDate!, 'dd-MM-yyyy')}.
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Usage Report</CardTitle>
                    <CardDescription>Count active usage days for machines within a date range.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                    <DateRangePicker date={activeDaysDateRange} onDateChange={setActiveDaysDateRange} />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto flex-1 justify-between">
                                {selectedMachineIds.length > 0 ? `${selectedMachineIds.length} machine(s) selected` : "Select machines..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                    <Button onClick={handleExportActiveDays} disabled={!activeDaysDateRange?.from || activeDaysSummary.length === 0} className="w-full sm:w-auto">
                        <FileDown className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                </CardContent>
                {activeDaysDateRange?.from && (
                    <CardContent>
                        <div className="overflow-x-auto">
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
                        </div>
                    </CardContent>
                )}
            </Card>

            <EquipmentFilters onFiltersChange={setFilters} />
            
            <Card>
                <CardHeader>
                    <div className="flex justify-end gap-2">
                        {canAddEquipment && (
                            <Button onClick={handleAddClick}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Equipment
                            </Button>
                        )}
                        <Button onClick={() => setIsUpdateItemsOpen(true)} variant="outline">
                            <FilePen className="mr-2 h-4 w-4"/> Update Items
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="ut-machines" className="w-full" onValueChange={setActiveTab}>
                        <TabsList className="h-auto flex-wrap justify-start">
                            <TabsTrigger value="ut-machines">UT Machines</TabsTrigger>
                            <TabsTrigger value="dft-machines">DFT Machines</TabsTrigger>
                            <TabsTrigger value="welding-machines">Welding Machines</TabsTrigger>
                            <TabsTrigger value="walkie-talkie">Walkie Talkie</TabsTrigger>
                            <TabsTrigger value="digital-camera">Digital Camera</TabsTrigger>
                            <TabsTrigger value="anemometer">Anemometer</TabsTrigger>
                            <TabsTrigger value="mobile-sim">Mobile &amp; SIM</TabsTrigger>
                            <TabsTrigger value="laptops-desktops">Laptops &amp; Desktops</TabsTrigger>
                            <TabsTrigger value="pneumatic-drilling-machine">Pneumatic Drilling</TabsTrigger>
                            <TabsTrigger value="pneumatic-angle-grinder">Pneumatic Grinder</TabsTrigger>
                            <TabsTrigger value="wired-drilling-machine">Wired Drilling</TabsTrigger>
                            <TabsTrigger value="cordless-drilling-machine">Cordless Drilling</TabsTrigger>
                            <TabsTrigger value="wired-angle-grinder">Wired Grinder</TabsTrigger>
                            <TabsTrigger value="cordless-angle-grinder">Cordless Grinder</TabsTrigger>
                            <TabsTrigger value="cordless-reciprocating-saw">Reciprocating Saw</TabsTrigger>
                            <TabsTrigger value="general-equipments">General Equipments</TabsTrigger>
                        </TabsList>
                        <TabsContent value="ut-machines" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader><CardTitle>UT Machine List</CardTitle><CardDescription>A comprehensive list of all UT machines.</CardDescription></CardHeader>
                                <CardContent><UTMachineTable items={filteredUtMachines} onEdit={handleEditUT} onLogManager={handleLogManagerUT} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="dft-machines" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader><CardTitle>DFT Machine List</CardTitle><CardDescription>A comprehensive list of all DFT machines.</CardDescription></CardHeader>
                                <CardContent><DftMachineTable items={filteredDftMachines} onEdit={handleEditDft} onLogManager={handleLogManagerDft} /></CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="welding-machines" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Welding Machines</CardTitle></CardHeader>
                                <CardContent><WeldingMachineTable items={filteredWeldingMachines} onEdit={handleEditWeldingMachine} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="walkie-talkie" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Walkie Talkies</CardTitle></CardHeader>
                                <CardContent><WalkieTalkieTable items={filteredWalkieTalkies} onEdit={handleEditWalkieTalkie} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="digital-camera" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader><CardTitle>Digital Cameras</CardTitle><CardDescription>List of all company-provided digital cameras.</CardDescription></CardHeader>
                                <CardContent><DigitalCameraTable items={filteredDigitalCameras} onEdit={handleEditDigitalCamera} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="anemometer" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader><CardTitle>Anemometers</CardTitle><CardDescription>List of all company-provided anemometers.</CardDescription></CardHeader>
                                <CardContent><AnemometerTable items={filteredAnemometers} onEdit={handleEditAnemometer} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="mobile-sim" className="mt-4 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by number, IMEI, Aries ID, or name..."
                                        className="pl-9"
                                        value={mobileSearchTerm}
                                        onChange={(e) => setMobileSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Card>
                                <CardHeader><CardTitle>Mobile &amp; SIM Allotment</CardTitle><CardDescription>List of all company-provided mobiles and SIM cards.</CardDescription></CardHeader>
                                <CardContent><MobileSimTable items={filteredMobileSims} onEdit={handleEditMobileSim} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="laptops-desktops" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader><CardTitle>Laptops &amp; Desktops</CardTitle><CardDescription>List of all company-provided laptops and desktops.</CardDescription></CardHeader>
                                <CardContent><LaptopDesktopTable items={filteredLaptopsDesktops} onEdit={handleEditLaptopDesktop} /></CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="pneumatic-drilling-machine" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Pneumatic Drilling Machines</CardTitle></CardHeader>
                                <CardContent><PneumaticDrillingMachineTable items={filteredPneumaticDrillingMachines} onEdit={handleEditPneumaticDrillingMachine} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="pneumatic-angle-grinder" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Pneumatic Angle Grinders</CardTitle></CardHeader>
                                <CardContent><PneumaticAngleGrinderTable items={filteredPneumaticAngleGrinders} onEdit={handleEditPneumaticAngleGrinder} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="wired-drilling-machine" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Wired Drilling Machines</CardTitle></CardHeader>
                                <CardContent><WiredDrillingMachineTable items={filteredWiredDrillingMachines} onEdit={handleEditWiredDrillingMachine} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="cordless-drilling-machine" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Cordless Drilling Machines</CardTitle></CardHeader>
                                <CardContent><CordlessDrillingMachineTable items={filteredCordlessDrillingMachines} onEdit={handleEditCordlessDrillingMachine} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="wired-angle-grinder" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Wired Angle Grinders</CardTitle></CardHeader>
                                <CardContent><WiredAngleGrinderTable items={filteredWiredAngleGrinders} onEdit={handleEditWiredAngleGrinder} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="cordless-angle-grinder" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Cordless Angle Grinders</CardTitle></CardHeader>
                                <CardContent><CordlessAngleGrinderTable items={filteredCordlessAngleGrinders} onEdit={handleEditCordlessAngleGrinder} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="cordless-reciprocating-saw" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle>Cordless Reciprocating Saws</CardTitle></CardHeader>
                                <CardContent><CordlessReciprocatingSawTable items={filteredCordlessReciprocatingSaws} onEdit={handleEditCordlessReciprocatingSaw} /></CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="general-equipments" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader><CardTitle>General Equipments</CardTitle><CardDescription>List of all other company-provided equipments.</CardDescription></CardHeader>
                                <CardContent><OtherEquipmentTable items={filteredOtherEquipments} onEdit={handleEditOtherEquipment} /></CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AddUTMachineDialog isOpen={isAddUTMachineOpen} setIsOpen={setIsAddUTMachineOpen} />
            {selectedUTMachine && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && (<EditUTMachineDialog isOpen={isEditUTMachineOpen} setIsOpen={setIsEditUTMachineOpen} machine={selectedUTMachine}/>)}
            {selectedUTMachine && (<UTMachineLogManagerDialog isOpen={isUTLogManagerOpen} setIsOpen={setIsUTLogManagerOpen} machine={selectedUTMachine}/>)}

            <AddDftMachineDialog isOpen={isAddDftMachineOpen} setIsOpen={setIsAddDftMachineOpen} />
            {selectedDftMachine && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && (<EditDftMachineDialog isOpen={isEditDftMachineOpen} setIsOpen={setIsEditDftMachineOpen} machine={selectedDftMachine} />)}
            {selectedDftMachine && (<DftMachineLogManagerDialog isOpen={isDftLogManagerOpen} setIsOpen={setIsDftLogManagerOpen} machine={selectedDftMachine} />)}

            <AddMobileSimDialog isOpen={isAddMobileSimOpen} setIsOpen={setIsAddMobileSimOpen} />
            {selectedMobileSim && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && (<EditMobileSimDialog isOpen={isEditMobileSimOpen} setIsOpen={setIsEditMobileSimOpen} item={selectedMobileSim} />)}
        
            <AddLaptopDesktopDialog isOpen={isAddLaptopDesktopOpen} setIsOpen={setIsAddLaptopDesktopOpen} />
            {selectedLaptopDesktop && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && (<EditLaptopDesktopDialog isOpen={isEditLaptopDesktopOpen} setIsOpen={setIsEditLaptopDesktopOpen} item={selectedLaptopDesktop} />)}
            
            <AddDigitalCameraDialog isOpen={isAddDigitalCameraOpen} setIsOpen={setIsAddDigitalCameraOpen} />
            {selectedDigitalCamera && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && <EditDigitalCameraDialog isOpen={isEditDigitalCameraOpen} setIsOpen={setIsEditDigitalCameraOpen} item={selectedDigitalCamera} />}

            <AddAnemometerDialog isOpen={isAddAnemometerOpen} setIsOpen={setIsAddAnemometerOpen} />
            {selectedAnemometer && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && <EditAnemometerDialog isOpen={isEditAnemometerOpen} setIsOpen={setIsEditAnemometerOpen} item={selectedAnemometer} />}

            <AddOtherEquipmentDialog isOpen={isAddOtherEquipmentOpen} setIsOpen={setIsAddOtherEquipmentOpen} />
            {selectedOtherEquipment && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && <EditOtherEquipmentDialog isOpen={isEditOtherEquipmentOpen} setIsOpen={setIsEditOtherEquipmentOpen} item={selectedOtherEquipment} />}
            
            <AddPneumaticDrillingMachineDialog isOpen={isAddPneumaticDrillingMachineOpen} setIsOpen={setIsAddPneumaticDrillingMachineOpen} />
            {editingPneumaticDrillingMachine && <EditPneumaticDrillingMachineDialog isOpen={!!editingPneumaticDrillingMachine} setIsOpen={() => setEditingPneumaticDrillingMachine(null)} item={editingPneumaticDrillingMachine} />}

            <AddPneumaticAngleGrinderDialog isOpen={isAddPneumaticAngleGrinderOpen} setIsOpen={setIsAddPneumaticAngleGrinderOpen} />
            {editingPneumaticAngleGrinder && <EditPneumaticAngleGrinderDialog isOpen={!!editingPneumaticAngleGrinder} setIsOpen={() => setEditingPneumaticAngleGrinder(null)} item={editingPneumaticAngleGrinder} />}
            
            <AddWiredDrillingMachineDialog isOpen={isAddWiredDrillingMachineOpen} setIsOpen={setIsAddWiredDrillingMachineOpen} />
            {editingWiredDrillingMachine && <EditWiredDrillingMachineDialog isOpen={!!editingWiredDrillingMachine} setIsOpen={() => setEditingWiredDrillingMachine(null)} item={editingWiredDrillingMachine} />}

            <AddCordlessDrillingMachineDialog isOpen={isAddCordlessDrillingMachineOpen} setIsOpen={setIsAddCordlessDrillingMachineOpen} />
            {editingCordlessDrillingMachine && <EditCordlessDrillingMachineDialog isOpen={!!editingCordlessDrillingMachine} setIsOpen={() => setEditingCordlessDrillingMachine(null)} item={editingCordlessDrillingMachine} />}

            <AddWiredAngleGrinderDialog isOpen={isAddWiredAngleGrinderOpen} setIsOpen={setIsAddWiredAngleGrinderOpen} />
            {editingWiredAngleGrinder && <EditWiredAngleGrinderDialog isOpen={!!editingWiredAngleGrinder} setIsOpen={() => setEditingWiredAngleGrinder(null)} item={editingWiredAngleGrinder} />}

            <AddCordlessAngleGrinderDialog isOpen={isAddCordlessAngleGrinderOpen} setIsOpen={setIsAddCordlessAngleGrinderOpen} />
            {editingCordlessAngleGrinder && <EditCordlessAngleGrinderDialog isOpen={!!editingCordlessAngleGrinder} setIsOpen={() => setEditingCordlessAngleGrinder(null)} item={editingCordlessAngleGrinder} />}

            <AddCordlessReciprocatingSawDialog isOpen={isAddCordlessReciprocatingSawOpen} setIsOpen={setIsAddCordlessReciprocatingSawOpen} />
            {editingCordlessReciprocatingSaw && <EditCordlessReciprocatingSawDialog isOpen={!!editingCordlessReciprocatingSaw} setIsOpen={() => setEditingCordlessReciprocatingSaw(null)} item={editingCordlessReciprocatingSaw} />}

            <AddWeldingMachineDialog isOpen={isAddWeldingMachineOpen} setIsOpen={setIsAddWeldingMachineOpen} />
            {editingWeldingMachine && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && <EditWeldingMachineDialog isOpen={!!editingWeldingMachine} setIsOpen={() => setEditingWeldingMachine(null)} item={editingWeldingMachine} />}

            <AddWalkieTalkieDialog isOpen={isAddWalkieTalkieOpen} setIsOpen={setIsAddWalkieTalkieOpen} />
            {editingWalkieTalkie && (can.manage_equipment_status || user?.role === 'NDT Supervisor') && <EditWalkieTalkieDialog isOpen={!!editingWalkieTalkie} setIsOpen={() => setEditingWalkieTalkie(null)} item={editingWalkieTalkie} />}

            <UpdateItemsDialog isOpen={isUpdateItemsOpen} setIsOpen={setIsUpdateItemsOpen} />
            <GenerateTpCertDialog isOpen={isGenerateCertOpen} setIsOpen={setIsGenerateCertOpen} />
            {viewingCertRequest && ( <ViewCertificateRequestDialog request={viewingCertRequest} isOpen={!!viewingCertRequest} setIsOpen={() => setViewingCertRequest(null)} /> )}
        </div>
    );
}
