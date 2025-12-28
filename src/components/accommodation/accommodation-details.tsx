
'use client'

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { BedSingle, PlusCircle, User, UserX, Edit, Trash2 } from 'lucide-react';
import AssignOccupantDialog from './assign-occupant-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { Building, Room, Bed } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import EditBedDialog from './EditBedDialog';

interface AccommodationDetailsProps {
    onAddRoom: (building: Building) => void;
    onEditBuilding: (building: Building) => void;
    onEditRoom: (building: Building, room: Room) => void;
}

export default function AccommodationDetails({ onAddRoom, onEditBuilding, onEditRoom }: AccommodationDetailsProps) {
    const { buildings, manpowerProfiles, can, unassignOccupant, deleteBuilding, deleteRoom, addBed, deleteBed } = useAppContext();
    const { toast } = useToast();
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [editingBed, setEditingBed] = useState<{buildingId: string, roomId: string, bed: Bed} | null>(null);
    const [selectedBedInfo, setSelectedBedInfo] = useState<{buildingId: string, roomId: string, bedId: string} | null>(null);

    const handleAssignClick = (buildingId: string, roomId: string, bedId: string) => {
        setSelectedBedInfo({ buildingId, roomId, bedId });
        setIsAssignDialogOpen(true);
    };
    
    const handleUnassign = (buildingId: string, roomId: string, bedId: string) => {
        unassignOccupant(buildingId, roomId, bedId);
    };

    const handleDeleteBuilding = (buildingId: string) => {
        deleteBuilding(buildingId);
        toast({ title: 'Building Deleted', variant: 'destructive' });
    }

    const handleDeleteRoom = (buildingId: string, roomId: string) => {
        deleteRoom(buildingId, roomId);
        toast({ title: 'Room Deleted', variant: 'destructive' });
    }
    
    const handleEditBed = (buildingId: string, roomId: string, bed: Bed) => {
        setEditingBed({ buildingId, roomId, bed });
    };

    const handleAddBed = (buildingId: string, roomId: string) => {
        addBed(buildingId, roomId);
        toast({ title: 'Bed Added', description: 'A new bed has been added to the room.' });
    };

    const handleDeleteBed = (buildingId: string, roomId: string, bed: Bed) => {
        if(bed.occupantId) {
            toast({ variant: 'destructive', title: 'Cannot Delete', description: 'This bed is currently occupied.' });
            return;
        }
        deleteBed(buildingId, roomId, bed.id);
        toast({ title: 'Bed Deleted', variant: 'destructive' });
    };

    const sortedBuildings = useMemo(() => {
        if (!buildings) return [];
        return [...buildings].sort((a, b) => 
            a.buildingNumber.localeCompare(b.buildingNumber, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [buildings]);

    if (!buildings || buildings.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No buildings found.</p>
                <p className="text-sm">Click "Add Building" to get started.</p>
            </div>
        )
    }

    return (
        <>
        <Accordion type="multiple" className="w-full space-y-4">
            {sortedBuildings.map(building => {
                const roomsArray: Room[] = building.rooms || [];
                
                const buildingSummary = roomsArray.reduce((acc, room) => {
                    const bedsArray = room.beds || [];
                    acc.totalBeds += bedsArray.length;
                    acc.occupiedBeds += bedsArray.filter(bed => bed && bed.occupantId).length;
                    return acc;
                }, { totalRooms: roomsArray.length, totalBeds: 0, occupiedBeds: 0, vacantBeds: 0 });

                buildingSummary.vacantBeds = buildingSummary.totalBeds - buildingSummary.occupiedBeds;

                return (
                    <AccordionItem key={building.id} value={building.id} className="border rounded-lg">
                        <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                           <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <span>Building {building.buildingNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 pr-4">
                                     <Badge variant="secondary">Rooms: {buildingSummary.totalRooms}</Badge>
                                     <Badge variant="success">Total Beds: {buildingSummary.totalBeds}</Badge>
                                     <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Vacant: {buildingSummary.vacantBeds}</Badge>
                                </div>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <div className="space-y-4">
                                {roomsArray && roomsArray.filter(room => room && room.roomNumber).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })).map(room => {
                                    const bedsArray: Bed[] = room.beds || [];
                                    const occupiedCount = bedsArray.filter(bed => bed.occupantId).length;
                                    const totalCount = bedsArray.length;
                                    const vacantCount = totalCount - occupiedCount;
                                    return (
                                        <div key={room.id} className="p-4 border rounded-md bg-muted/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold flex items-center gap-3">
                                                  <span className="flex items-center gap-2">
                                                    Room {room.roomNumber}
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditRoom(building, room)}><Edit className="h-3 w-3"/></Button>
                                                  </span>
                                                  <Badge variant="success">Total: {totalCount}</Badge>
                                                  <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Vacant: {vacantCount}</Badge>
                                                </h4>
                                                {can.manage_accommodation && (
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="outline" size="sm" onClick={() => handleAddBed(building.id, room.id)}>Add Bed</Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Room {room.roomNumber}?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will also unassign any occupants. This action cannot be undone.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteRoom(building.id, room.id)}>Delete Room</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-2">
                                                {bedsArray.map((bed) => {
                                                    const occupant = bed.occupantId ? manpowerProfiles.find(p => p.id === bed.occupantId) : null;
                                                    const isOccupied = !!occupant;
                                                    return (
                                                        <div 
                                                          key={bed.id} 
                                                          className={cn(
                                                            "p-3 border-2 rounded-lg flex flex-col items-center justify-center text-center relative",
                                                            isOccupied ? "bg-green-100 dark:bg-green-900/40 border-green-400" : "bg-red-100 dark:bg-red-900/40 border-red-400"
                                                          )}
                                                        >
                                                            <BedSingle className={cn("h-6 w-6 mb-2", isOccupied ? "text-green-700" : "text-red-700")} />
                                                            <p className="font-medium text-sm">Bed {bed.bedNumber}</p>
                                                            {occupant ? (
                                                                <>
                                                                    <p className="text-xs text-muted-foreground mt-1">{occupant.name}</p>
                                                                    <div className="flex items-center gap-1 mt-2">
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                                                                                    <UserX className="mr-1 h-3 w-3"/> Unassign
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Unassign {occupant.name}?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>Are you sure you want to remove this person from this bed?</AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                    <AlertDialogAction onClick={() => handleUnassign(building.id, room.id, bed.id)}>Unassign</AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                 <>
                                                                    <p className="text-xs text-red-600 mt-1">Available</p>
                                                                    <div className="flex items-center gap-1 mt-2">
                                                                        <Button variant="outline" size="sm" className="h-7" onClick={() => handleAssignClick(building.id, room.id, bed.id)}>
                                                                            <User className="mr-1 h-3 w-3"/> Assign
                                                                        </Button>
                                                                    </div>
                                                                 </>
                                                            )}
                                                            <div className="absolute top-1 right-1 flex">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditBed(building.id, room.id, bed)}><Edit className="h-3 w-3"/></Button>
                                                                {!bed.occupantId && (
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3"/></Button></AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader><AlertDialogTitle>Delete Bed?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this bed? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={() => handleDeleteBed(building.id, room.id, bed)}>Delete</AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                                 {can.manage_accommodation && (
                                    <div className="mt-4 flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => onAddRoom(building)}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                                        </Button>
                                         <Button variant="secondary" size="sm" onClick={() => onEditBuilding(building)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit Building
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Building
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Building {building.buildingNumber}?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will delete the building and all its rooms. This action cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteBuilding(building.id)}>Delete Building</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
        {selectedBedInfo && (
            <AssignOccupantDialog
                isOpen={isAssignDialogOpen}
                setIsOpen={setIsAssignDialogOpen}
                bedInfo={selectedBedInfo}
            />
        )}
        {editingBed && (
            <EditBedDialog
                isOpen={!!editingBed}
                setIsOpen={() => setEditingBed(null)}
                buildingId={editingBed.buildingId}
                roomId={editingBed.roomId}
                bed={editingBed.bed}
            />
        )}
        </>
    );
}
