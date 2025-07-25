'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, Users } from 'lucide-react';
import VehicleTable from '@/components/vehicle/VehicleTable';
import AddVehicleDialog from '@/components/vehicle/AddVehicleDialog';
import type { Vehicle, Driver } from '@/lib/types';
import EditVehicleDialog from '@/components/vehicle/EditVehicleDialog';
import { addDays, isBefore, format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DriverListTable from '@/components/driver/DriverListTable';
import AddDriverDialog from '@/components/driver/AddDriverDialog';

export default function VehicleStatusPage() {
    const { can, vehicles, drivers } = useAppContext();
    
    // Vehicle State
    const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
    const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    // Driver State
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | undefined>(undefined);

    const thirtyDaysFromNow = useMemo(() => addDays(new Date(), 30), []);

    const expiringVehicles = useMemo(() => {
        if (!can.manage_vehicles) return [];
        return vehicles.filter(v => 
            (v.vapValidity && isBefore(new Date(v.vapValidity), thirtyDaysFromNow)) ||
            (v.insuranceValidity && isBefore(new Date(v.insuranceValidity), thirtyDaysFromNow)) ||
            (v.fitnessValidity && isBefore(new Date(v.fitnessValidity), thirtyDaysFromNow)) ||
            (v.taxValidity && isBefore(new Date(v.taxValidity), thirtyDaysFromNow)) ||
            (v.puccValidity && isBefore(new Date(v.puccValidity), thirtyDaysFromNow))
        );
    }, [vehicles, thirtyDaysFromNow, can.manage_vehicles]);
    
    const expiringDrivers = useMemo(() => {
        if (!can.manage_vehicles) return [];
        return drivers.map(d => {
            const expiringDocs: string[] = [];
            const checkDate = (dateStr: string | undefined, name: string) => {
                if (dateStr && isBefore(parseISO(dateStr), thirtyDaysFromNow)) {
                    expiringDocs.push(`${name} on ${format(parseISO(dateStr), 'dd-MM-yyyy')}`);
                }
            };
            checkDate(d.epExpiry, 'EP');
            checkDate(d.medicalExpiry, 'Medical');
            checkDate(d.safetyExpiry, 'Safety');
            // Add other driver checks if needed
            return { driver: d, expiringDocs };
        }).filter(item => item.expiringDocs.length > 0);
    }, [drivers, thirtyDaysFromNow, can.manage_vehicles]);

    // Vehicle Handlers
    const handleEditVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsEditVehicleOpen(true);
    };
    const handleAddVehicle = () => {
        setSelectedVehicle(null);
        setIsAddVehicleOpen(true);
    };

    // Driver Handlers
    const handleAddDriver = () => {
        setEditingDriver(undefined);
        setIsAddDriverOpen(true);
    };
    const handleEditDriver = (driver: Driver) => {
        setEditingDriver(driver);
        setIsAddDriverOpen(true);
    };

    if (!can.manage_vehicles) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to manage fleet.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    const expiringItems = [...expiringVehicles, ...expiringDrivers];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
                <p className="text-muted-foreground">Manage and track vehicle details and driver information.</p>
            </div>
            
             {expiringItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Expiring Documents</CardTitle>
                        <CardDescription>The following vehicles or drivers have documents expiring within 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {expiringVehicles.map((v, i) => (
                                <div key={`v-${i}`} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                    <span className="font-semibold">Vehicle {v.vehicleNumber}</span>: 
                                    {v.vapValidity && isBefore(new Date(v.vapValidity), thirtyDaysFromNow) && ` VAP expires ${format(new Date(v.vapValidity), 'dd-MM-yyyy')}. `}
                                    {v.insuranceValidity && isBefore(new Date(v.insuranceValidity), thirtyDaysFromNow) && ` Insurance expires ${format(new Date(v.insuranceValidity), 'dd-MM-yyyy')}. `}
                                    {v.fitnessValidity && isBefore(new Date(v.fitnessValidity), thirtyDaysFromNow) && ` Fitness expires ${format(new Date(v.fitnessValidity), 'dd-MM-yyyy')}. `}
                                    {v.taxValidity && isBefore(new Date(v.taxValidity), thirtyDaysFromNow) && ` Tax expires ${format(new Date(v.taxValidity), 'dd-MM-yyyy')}. `}
                                    {v.puccValidity && isBefore(new Date(v.puccValidity), thirtyDaysFromNow) && ` PUCC expires ${format(new Date(v.puccValidity), 'dd-MM-yyyy')}. `}
                                </div>
                            ))}
                             {expiringDrivers.map(item => (
                                <div key={item.driver.id} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                    <span className="font-semibold">{item.driver.name}</span>: {item.expiringDocs.join(', ')}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="vehicles">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    <TabsTrigger value="drivers">Drivers</TabsTrigger>
                </TabsList>

                <TabsContent value="vehicles" className="mt-4">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Vehicle Fleet</CardTitle>
                                    <CardDescription>A list of all vehicles in the system.</CardDescription>
                                </div>
                                {can.manage_vehicles && (
                                    <Button onClick={handleAddVehicle}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Vehicle
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <VehicleTable onEdit={handleEditVehicle} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="drivers" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Driver List</CardTitle>
                                    <CardDescription>A list of all driver profiles in the system.</CardDescription>
                                </div>
                                {can.manage_vehicles && (
                                    <Button onClick={handleAddDriver}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Driver
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DriverListTable onEdit={handleEditDriver} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AddVehicleDialog isOpen={isAddVehicleOpen} setIsOpen={setIsAddVehicleOpen} />
            {selectedVehicle && (
                <EditVehicleDialog 
                    isOpen={isEditVehicleOpen} 
                    setIsOpen={setIsEditVehicleOpen} 
                    vehicle={selectedVehicle}
                />
            )}
            <AddDriverDialog
                isOpen={isAddDriverOpen}
                setIsOpen={setIsAddDriverOpen}
                driver={editingDriver}
            />
        </div>
    );
}
