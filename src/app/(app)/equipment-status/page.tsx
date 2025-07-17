

'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import UTMachineTable from '@/components/ut-machine/UTMachineTable';
import AddUTMachineDialog from '@/components/ut-machine/AddUTMachineDialog';
import type { UTMachine, DftMachine, MobileSim, LaptopDesktop, CertificateRequest, Role } from '@/lib/types';
import EditUTMachineDialog from '@/components/ut-machine/EditUTMachineDialog';
import { addDays, isBefore, format, formatDistanceToNow } from 'date-fns';
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

export default function EquipmentStatusPage() {
    const { can, user, users, utMachines, dftMachines, mobileSims, laptopsDesktops, myFulfilledEquipmentCertRequests, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, certificateRequests, inventoryItems } = useAppContext();
    
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

    const [viewingCertRequest, setViewingCertRequest] = useState<CertificateRequest | null>(null);

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

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
                    <p className="text-muted-foreground">Manage and track all company equipment and assets.</p>
                </div>
            </div>

            <Tabs defaultValue="ut-machines" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="ut-machines">UT Machines</TabsTrigger>
                    <TabsTrigger value="dft-machines">DFT Machines</TabsTrigger>
                    <TabsTrigger value="mobile-sim">Mobile &amp; SIM</TabsTrigger>
                    <TabsTrigger value="laptops-desktops">Laptops &amp; Desktops</TabsTrigger>
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
                                    const isFulfilled = req.status === 'Completed';
                                    const lastComment = req.comments?.[req.comments.length - 1];
                                    const fulfiller = isFulfilled && lastComment ? users.find(u => u.id === lastComment.userId) : null;
                                    return (
                                        <div key={req.id} className="p-3 border rounded-lg bg-muted/50">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <p className="font-semibold">{req.requestType} for {subject}</p>
                                              <p className="text-sm text-muted-foreground">Submitted {formatDistanceToNow(new Date(req.requestDate), { addSuffix: true })}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant={req.status === 'Completed' ? 'default' : req.status === 'Rejected' ? 'destructive' : 'secondary'}>{req.status}</Badge>
                                              {isFulfilled && (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => acknowledgeFulfilledRequest(req.id)}><X className="h-4 w-4"/></Button>
                                              )}
                                            </div>
                                          </div>
                                          {isFulfilled && lastComment && fulfiller && (
                                            <div className="flex items-start gap-2 mt-2 pt-2 border-t">
                                              <Avatar className="h-7 w-7"><AvatarImage src={fulfiller?.avatar} /><AvatarFallback>{fulfiller?.name.charAt(0)}</AvatarFallback></Avatar>
                                              <div className="bg-background p-2 rounded-md w-full text-sm">
                                                <div className="flex justify-between items-baseline"><p className="font-semibold text-xs">{fulfiller?.name}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(lastComment.date), { addSuffix: true })}</p></div>
                                                <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{lastComment?.text}</p>
                                              </div>
                                            </div>
                                          )}
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
            {viewingCertRequest && ( <ViewCertificateRequestDialog request={viewingCertRequest} isOpen={!!viewingCertRequest} setIsOpen={() => setViewingCertRequest(null)} /> )}
        </div>
    );

    

