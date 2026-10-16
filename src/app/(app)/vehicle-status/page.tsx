'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import AddVehicleDialog from '@/components/vehicle/AddVehicleDialog';
import EditVehicleDialog from '@/components/vehicle/EditVehicleDialog';
import VehicleLogManagerDialog from '@/components/vehicle/VehicleLogManagerDialog';
import AddDriverDialog from '@/components/driver/AddDriverDialog';
import FleetWorkspace from '@/components/vehicle/FleetWorkspace';
import type { Vehicle, Driver } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

export default function VehicleStatusPage() {
    const { can } = useAuth();
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

    if (!can.manage_vehicles && !can.view_all) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    return (
        <>
            <FleetWorkspace initialTab={tab} onAddVehicle={handleAddVehicle} onEditVehicle={handleEditVehicle} onLogs={handleLogManager} onAddDriver={handleAddDriver} onEditDriver={handleEditDriver} />
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
        </>
    );
}
