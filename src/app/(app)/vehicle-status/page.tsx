

'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, Users, Car, Wrench, Notebook } from 'lucide-react';
import VehicleTable from '@/components/vehicle/VehicleTable';
import AddVehicleDialog from '@/components/vehicle/AddVehicleDialog';
import type { Vehicle, Driver } from '@/lib/types';
import EditVehicleDialog from '@/components/vehicle/EditVehicleDialog';
import { addDays, isBefore, format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DriverListTable from '@/components/driver/DriverListTable';
import AddDriverDialog from '@/components/driver/AddDriverDialog';
import VehicleLogManagerDialog from '@/components/vehicle/VehicleLogManagerDialog';
import { useSearchParams } from 'next/navigation';
import StatCard from '@/components/dashboard/stat-card';
import ExpiringDocumentsReport from '@/components/vehicle/ExpiringDocumentsReport';
import Link from 'next/link';

export default function VehicleStatusPage() {
    const { can, vehicles, drivers } = useAppContext();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    
    // Vehicle State
    const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
    const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
    const [isLogManagerOpen, setIsLogManagerOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    // Driver State
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | undefined>(undefined);

    const thirtyDaysFromNow = useMemo(() => addDays(new Date(), 30), []);

    const activeOrMaintenanceVehicles = useMemo(() => {
        return vehicles.filter(v => v.status === 'Active' || v.status === 'In Maintenance');
    }, [vehicles]);
    
    const expiringVehicles = useMemo(() => {
        if (!can.manage_vehicles || !activeOrMaintenanceVehicles) return [];
        return activeOrMaintenanceVehicles.filter(v => 
            (v.vapValidity && isBefore(parseISO(v.vapValidity), thirtyDaysFromNow)) ||
            (v.insuranceValidity && isBefore(parseISO(v.insuranceValidity), thirtyDaysFromNow)) ||
            (v.fitnessValidity && isBefore(parseISO(v.fitnessValidity), thirtyDaysFromNow)) ||
            (v.taxValidity && isBefore(parseISO(v.taxValidity), thirtyDaysFromNow)) ||
            (v.puccValidity && isBefore(parseISO(v.puccValidity), thirtyDaysFromNow))
        ).map(v => {
            const expiringDocs: string[] = [];
            const check = (dateStr: string | undefined, name: string) => {
                if(dateStr && isBefore(parseISO(dateStr), thirtyDaysFromNow)) {
                    expiringDocs.push(`${name} on ${format(parseISO(dateStr), 'dd-MM-yyyy')}`);
                }
            };
            check(v.vapValidity, 'VAP');
            check(v.insuranceValidity, 'Insurance');
            check(v.fitnessValidity, 'Fitness');
            check(v.taxValidity, 'Tax');
            check(v.puccValidity, 'PUCC');
            return { vehicle: v, expiringDocs };
        });
    }, [activeOrMaintenanceVehicles, thirtyDaysFromNow, can.manage_vehicles]);
    
    const expiringDrivers = useMemo(() => {
        if (!can.manage_vehicles || !drivers) return [];
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
            checkDate(d.licenseExpiry, 'License');
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
    const handleLogManager = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsLogManagerOpen(true);
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

    const activeVehiclesCount = vehicles.filter(v => v.status === 'Active').length;
    const maintenanceVehiclesCount = vehicles.filter(v => v.status === 'In Maintenance').length;
    const totalDriversCount = drivers.length;
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
                    <p className="text-muted-foreground">Manage and track vehicle details and driver information.</p>
                </div>
                <div>
                    <Button asChild>
                        <Link href="/vehicle-usage-summary">
                            <Notebook className="mr-2 h-4 w-4" /> Vehicle Usage Summary
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <StatCard 
                    title="Active Vehicles"
                    value={activeVehiclesCount}
                    icon={Car}
                    description="Vehicles currently in service"
                />
                <StatCard 
                    title="Total Drivers"
                    value={totalDriversCount}
                    icon={Users}
                    description="Total number of registered drivers"
                />
                <StatCard 
                    title="In Maintenance"
                    value={maintenanceVehiclesCount}
                    icon={Wrench}
                    description="Vehicles currently under maintenance"
                />
            </div>
            
             {expiringItems.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Expiring Documents</CardTitle>
                            <CardDescription>The following vehicles or drivers have documents expiring within 30 days.</CardDescription>
                        </div>
                        <ExpiringDocumentsReport expiringVehicles={expiringVehicles} expiringDrivers={expiringDrivers} />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {expiringVehicles.map((item, i) => (
                                <div key={`v-${i}`} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                    <span className="font-semibold">Vehicle {item.vehicle.vehicleNumber}</span>: {item.expiringDocs.join(', ')}
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

            <Tabs defaultValue={tab || "vehicles"}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    <TabsTrigger value="drivers">Drivers</TabsTrigger>
                </TabsList>

                <TabsContent value="vehicles" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <CardTitle>Vehicle Fleet</CardTitle>
                                <CardDescription>A list of all vehicles in the system.</CardDescription>
                            </div>
                            {can.manage_vehicles && (
                                <Button onClick={handleAddVehicle} className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Vehicle
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <VehicleTable onEdit={handleEditVehicle} onLogManager={handleLogManager} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="drivers" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <CardTitle>Driver List</CardTitle>
                                <CardDescription>A list of all driver profiles in the system.</CardDescription>
                            </div>
                            {can.manage_vehicles && (
                                <Button onClick={handleAddDriver} className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Driver
                                </Button>
                            )}
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
             {selectedVehicle && (
                <VehicleLogManagerDialog 
                    isOpen={isLogManagerOpen} 
                    setIsOpen={setIsLogManagerOpen} 
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
