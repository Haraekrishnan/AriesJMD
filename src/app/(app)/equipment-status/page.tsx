
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import UTMachineTable from '@/components/ut-machine/UTMachineTable';
import AddUTMachineDialog from '@/components/ut-machine/AddUTMachineDialog';
import type { UTMachine, DftMachine, MobileSim, OtherEquipment } from '@/lib/types';
import EditUTMachineDialog from '@/components/ut-machine/EditUTMachineDialog';
import { addDays, isBefore, format, formatDistanceToNow } from 'date-fns';
import UTMachineLogManagerDialog from '@/components/ut-machine/UTMachineLogManagerDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AddDftMachineDialog from '@/components/dft-machine/AddDftMachineDialog';
import DftMachineTable from '@/components/dft-machine/DftMachineTable';
import EditDftMachineDialog from '@/components/dft-machine/EditDftMachineDialog';
import DftMachineLogManagerDialog from '@/components/dft-machine/DftMachineLogManagerDialog';
import AddOtherEquipmentDialog from '@/components/other-equipment/AddOtherEquipmentDialog';
import OtherEquipmentTable from '@/components/other-equipment/OtherEquipmentTable';
import EditOtherEquipmentDialog from '@/components/other-equipment/EditOtherEquipmentDialog';
import AddMobileSimDialog from '@/components/mobile-sim/AddMobileSimDialog';
import EditMobileSimDialog from '@/components/mobile-sim/EditMobileSimDialog';
import MobileSimTable from '@/components/mobile-sim/MobileSimTable';

export default function EquipmentStatusPage() {
    const { can, utMachines, dftMachines, mobileSims, otherEquipments, users, myFulfilledUTRequests, markUTRequestsAsViewed, acknowledgeFulfilledUTRequest } = useAppContext();
    
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
    
    // Other Equipment State
    const [isAddOtherEquipmentOpen, setIsAddOtherEquipmentOpen] = useState(false);
    const [isEditOtherEquipmentOpen, setIsEditOtherEquipmentOpen] = useState(false);
    const [selectedOtherEquipment, setSelectedOtherEquipment] = useState<OtherEquipment | null>(null);


    useEffect(() => {
        if (myFulfilledUTRequests?.length > 0) {
            markUTRequestsAsViewed();
        }
    }, [markUTRequestsAsViewed, myFulfilledUTRequests]);

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


    // Other Equipment Handlers
    const handleEditOther = (item: OtherEquipment) => { setSelectedOtherEquipment(item); setIsEditOtherEquipmentOpen(true); };
    const handleAddOther = () => { setSelectedOtherEquipment(null); setIsAddOtherEquipmentOpen(true); };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Equipment Status</h1>
                    <p className="text-muted-foreground">Manage and track all company equipment and assets.</p>
                </div>
            </div>

            <Tabs defaultValue="ut-machines" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="ut-machines">UT Machines</TabsTrigger>
                    <TabsTrigger value="dft-machines">DFT Machines</TabsTrigger>
                    <TabsTrigger value="mobile-sim">Mobile & SIM</TabsTrigger>
                    <TabsTrigger value="other-equipment">Other Equipment</TabsTrigger>
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
                     {myFulfilledUTRequests && myFulfilledUTRequests.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Fulfilled Certificate Requests</CardTitle>
                                <CardDescription>Your recent certificate requests have been fulfilled. Please acknowledge them to clear them from this list.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {myFulfilledUTRequests.map(req => {
                                    const machine = utMachines.find(m => m.id === req.utMachineId);
                                    const lastComment = req.comments?.[0];
                                    const fulfiller = users.find(u => u.id === lastComment?.userId);
                                    return (
                                        <div key={req.id} className="p-3 border rounded-lg bg-muted/50 flex justify-between items-center">
                                            <div className="flex-1">
                                                <p className="font-semibold">{req.requestType} for {machine?.machineName} (SN: {machine?.serialNumber})</p>
                                                <div className="flex items-start gap-2 mt-2">
                                                    <Avatar className="h-7 w-7"><AvatarImage src={fulfiller?.avatar} /><AvatarFallback>{fulfiller?.name.charAt(0)}</AvatarFallback></Avatar>
                                                    <div className="bg-background p-2 rounded-md w-full text-sm">
                                                        <div className="flex justify-between items-baseline"><p className="font-semibold text-xs">{fulfiller?.name}</p><p className="text-xs text-muted-foreground">{lastComment ? formatDistanceToNow(new Date(lastComment.date), { addSuffix: true }) : ''}</p></div>
                                                        <p className="text-foreground/80 mt-1">{lastComment?.text}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => acknowledgeFulfilledUTRequest(req.id)} className="ml-4 shrink-0">
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Acknowledge
                                            </Button>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}
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
                        <CardHeader><CardTitle>Mobile & SIM Allotment</CardTitle><CardDescription>List of all company-provided mobiles and SIM cards.</CardDescription></CardHeader>
                        <CardContent><MobileSimTable onEdit={handleEditMobileSim} /></CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="other-equipment" className="mt-4 space-y-4">
                     <div className="flex justify-end">
                        {can.manage_equipment_status && (
                            <Button onClick={handleAddOther}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Equipment
                            </Button>
                        )}
                    </div>
                    <Card>
                        <CardHeader><CardTitle>Other Equipment & Usage</CardTitle><CardDescription>List of all other company equipment.</CardDescription></CardHeader>
                        <CardContent><OtherEquipmentTable onEdit={handleEditOther} /></CardContent>
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
        
            {can.manage_equipment_status && <AddOtherEquipmentDialog isOpen={isAddOtherEquipmentOpen} setIsOpen={setIsAddOtherEquipmentOpen} />}
            {selectedOtherEquipment && can.manage_equipment_status && (<EditOtherEquipmentDialog isOpen={isEditOtherEquipmentOpen} setIsOpen={setIsEditOtherEquipmentOpen} item={selectedOtherEquipment} />)}
        </div>
    );
}
