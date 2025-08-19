
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PlusCircle } from 'lucide-react';
import StatCard from '@/components/dashboard/stat-card';
import { BedDouble, BedSingle, Building } from 'lucide-react';
import AccommodationDetails from '@/components/accommodation/accommodation-details';
import AddBuildingDialog from '@/components/accommodation/add-building-dialog';
import AddRoomDialog from '@/components/accommodation/add-room-dialog';
import type { Building as BuildingType, Room } from '@/lib/types';
import EditBuildingDialog from '@/components/accommodation/edit-building-dialog';

export default function AccommodationPage() {
    const { can, buildings } = useAppContext();
    const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
    const [isEditBuildingOpen, setIsEditBuildingOpen] = useState(false);
    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);

    const summary = useMemo(() => {
        let totalBeds = 0;
        let occupiedBeds = 0;
        buildings.forEach(b => {
            const roomsArray: Room[] = b.rooms ? (Array.isArray(b.rooms) ? b.rooms : Object.values(b.rooms)) : [];
            if (roomsArray.length > 0) {
                roomsArray.forEach(r => {
                    if (!r) return;
                    const bedsArray = r.beds ? (Array.isArray(r.beds) ? r.beds : Object.values(r.beds)) : [];
                    totalBeds += bedsArray.length;
                    occupiedBeds += bedsArray.filter(bed => bed && bed.occupantId).length;
                });
            }
        });
        return { totalBeds, occupiedBeds, availableBeds: totalBeds - occupiedBeds };
    }, [buildings]);

    const handleAddRoomClick = (building: BuildingType) => {
        setSelectedBuilding(building);
        setIsAddRoomOpen(true);
    };

    const handleEditBuildingClick = (building: BuildingType) => {
        setSelectedBuilding(building);
        setIsEditBuildingOpen(true);
    }

    if (!can.manage_accommodation) {
        return (
           <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to manage accommodation.</CardDescription>
               </CardHeader>
           </Card>
       );
   }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Accommodation Management</h1>
                    <p className="text-muted-foreground">Manage buildings, rooms, and bed assignments.</p>
                </div>
                {can.manage_accommodation && (
                    <Button onClick={() => setIsAddBuildingOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Building
                    </Button>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <StatCard 
                    title="Total Beds" 
                    value={summary.totalBeds.toString()} 
                    icon={BedDouble}
                    description="Total number of beds across all buildings"
                />
                <StatCard 
                    title="Occupied Beds" 
                    value={summary.occupiedBeds.toString()} 
                    icon={BedSingle}
                    description="Beds currently assigned to manpower"
                />
                <StatCard 
                    title="Available Beds" 
                    value={summary.availableBeds.toString()} 
                    icon={Building}
                    description="Empty beds available for assignment"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Building & Room Details</CardTitle>
                    <CardDescription>View and manage all accommodation facilities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AccommodationDetails onAddRoom={handleAddRoomClick} onEditBuilding={handleEditBuildingClick} />
                </CardContent>
            </Card>

            <AddBuildingDialog isOpen={isAddBuildingOpen} setIsOpen={setIsAddBuildingOpen} />
            {selectedBuilding && (
                <AddRoomDialog 
                    isOpen={isAddRoomOpen} 
                    setIsOpen={setIsAddRoomOpen}
                    buildingId={selectedBuilding.id} 
                />
            )}
            {selectedBuilding && (
                <EditBuildingDialog 
                    isOpen={isEditBuildingOpen}
                    setIsOpen={setIsEditBuildingOpen}
                    building={selectedBuilding}
                />
            )}
        </div>
    );
}
