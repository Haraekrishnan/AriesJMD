
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PlusCircle, Search, UserCog } from 'lucide-react';
import StatCard from '@/components/dashboard/stat-card';
import { BedDouble, BedSingle, Building } from 'lucide-react';
import AccommodationDetails from '@/components/accommodation/accommodation-details';
import AddBuildingDialog from '@/components/accommodation/add-building-dialog';
import AddRoomDialog from '@/components/accommodation/add-room-dialog';
import type { Building as BuildingType, Room, Bed, ManpowerProfile } from '@/lib/types';
import EditBuildingDialog from '@/components/accommodation/edit-building-dialog';
import AccommodationReportDownloads from '@/components/accommodation/AccommodationReportDownloads';
import { Input } from '@/components/ui/input';
import EditRoomDialog from '@/components/accommodation/EditRoomDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AccommodationPage() {
    const { can, user, buildings, manpowerProfiles, forceUnassign } = useAppContext();
    const { toast } = useToast();
    const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
    const [isEditBuildingOpen, setIsEditBuildingOpen] = useState(false);
    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debugSelectedProfileId, setDebugSelectedProfileId] = useState<string | null>(null);
    
    const debugSelectedProfile = useMemo(() => {
        if (!debugSelectedProfileId) return null;
        return manpowerProfiles.find(p => p.id === debugSelectedProfileId);
    }, [debugSelectedProfileId, manpowerProfiles]);

    const handleForceUnassign = () => {
        if (!debugSelectedProfile) return;
        forceUnassign(debugSelectedProfile.id);
        toast({
            title: 'Assignment Forcefully Cleared',
            description: `${debugSelectedProfile.name}'s accommodation record has been removed.`,
            variant: 'destructive',
        });
        setDebugSelectedProfileId(null);
    };

    const searchResult = useMemo(() => {
        if (!searchTerm || !buildings) return null;
    
        const lowercasedTerm = searchTerm.toLowerCase();
        for (const profile of manpowerProfiles) {
            if (profile.name.toLowerCase().includes(lowercasedTerm) && profile.accommodation) {
                const { buildingId, roomId, bedId } = profile.accommodation;
                const building = buildings.find(b => b.id === buildingId);
                const room = building?.rooms?.find(r => r.id === roomId);
                const bed = room?.beds?.find(b => b.id === bedId);

                if (building && room && bed) {
                    return {
                        occupantName: profile.name,
                        buildingNumber: building.buildingNumber,
                        roomNumber: room.roomNumber,
                        bedNumber: bed.bedNumber,
                    };
                }
            }
        }
        return 'not_found';
    }, [searchTerm, buildings, manpowerProfiles]);

    const summary = useMemo(() => {
        if (!buildings) {
          return { totalBeds: 0, occupiedBeds: 0, availableBeds: 0 };
        }
        let totalBeds = 0;
        let occupiedBeds = 0;
        buildings.forEach(b => {
            const roomsArray: Room[] = b.rooms || [];
            roomsArray.forEach(r => {
                if (!r) return;
                const bedsArray = r.beds || [];
                totalBeds += bedsArray.length;
                occupiedBeds += bedsArray.filter(bed => bed && bed.occupantId).length;
            });
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

    const handleEditRoomClick = (building: BuildingType, room: Room) => {
        setSelectedBuilding(building);
        setSelectedRoom(room);
        setIsEditRoomOpen(true);
    };

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
                <div className="flex items-center gap-2">
                    <AccommodationReportDownloads />
                    {can.manage_accommodation && (
                        <Button onClick={() => setIsAddBuildingOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Building
                        </Button>
                    )}
                </div>
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
                    <div className="pt-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by employee name..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {searchResult && searchTerm && (
                            <div className="mt-2 p-3 rounded-md bg-muted text-sm">
                                {typeof searchResult === 'string' ? (
                                    <p>No occupant found with that name.</p>
                                ) : (
                                    <p>
                                        <span className="font-semibold">{searchResult.occupantName}</span> is in 
                                        <span className="font-semibold"> Building {searchResult.buildingNumber}</span>, 
                                        <span className="font-semibold"> Room {searchResult.roomNumber}</span>, 
                                        <span className="font-semibold"> Bed {searchResult.bedNumber}</span>.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <AccommodationDetails onAddRoom={handleAddRoomClick} onEditBuilding={handleEditBuildingClick} onEditRoom={handleEditRoomClick} />
                </CardContent>
            </Card>

            {user?.role === 'Admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserCog /> Admin Inspector</CardTitle>
                        <CardDescription>Select an employee to view and manually clear their accommodation assignment if it is inconsistent.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select onValueChange={setDebugSelectedProfileId}>
                            <SelectTrigger><SelectValue placeholder="Select an employee to inspect..." /></SelectTrigger>
                            <SelectContent>
                                {manpowerProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {debugSelectedProfile && (
                            <div className="p-4 border rounded-md bg-muted space-y-2">
                                <h4 className="font-semibold">{debugSelectedProfile.name}'s Assignment Data</h4>
                                {debugSelectedProfile.accommodation ? (
                                    <div className="text-sm font-mono">
                                        <p>Building ID: {debugSelectedProfile.accommodation.buildingId || 'N/A'}</p>
                                        <p>Room ID: {debugSelectedProfile.accommodation.roomId || 'N/A'}</p>
                                        <p>Bed ID: {debugSelectedProfile.accommodation.bedId || 'N/A'}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No accommodation data found on this profile.</p>
                                )}
                                 {debugSelectedProfile.accommodation && (
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" className="mt-2">Force Unassign</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will forcefully remove the assignment data from {debugSelectedProfile.name}'s profile. This is a recovery tool and should be used with caution.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleForceUnassign}>Yes, Force Unassign</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                 )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

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
            {selectedBuilding && selectedRoom && (
                <EditRoomDialog
                    isOpen={isEditRoomOpen}
                    setIsOpen={setIsEditRoomOpen}
                    buildingId={selectedBuilding.id}
                    room={selectedRoom}
                />
            )}
        </div>
    );
}
