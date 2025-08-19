

'use client'

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { BedSingle, PlusCircle, User, UserX, Edit, Trash2 } from 'lucide-react';
import AssignOccupantDialog from './assign-occupant-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { Building, Room } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AccommodationDetailsProps {
    onAddRoom: (building: Building) => void;
    onEditBuilding: (building: Building) => void;
}

export default function AccommodationDetails({ onAddRoom, onEditBuilding }: AccommodationDetailsProps) {
    const { buildings, manpowerProfiles, can, unassignOccupant, deleteBuilding, deleteRoom } = useAppContext();
    const { toast } = useToast();
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
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

    const sortedBuildings = useMemo(() => {
        return [...buildings].sort((a, b) => 
            a.buildingNumber.localeCompare(b.buildingNumber, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [buildings]);

    if (buildings.length === 0) {
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
                const roomsArray: Room[] = building.rooms ? (Array.isArray(building.rooms) ? Object.values(building.rooms) : []) : [];
                return (
                    <AccordionItem key={building.id} value={building.id} className="border rounded-lg">
                        <AccordionTrigger className="p-4 hover:no-underline text-lg font-semibold">
                           <div className="flex items-center gap-2">
                             <span>Building {building.buildingNumber}</span>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <div className="space-y-4">
                                {roomsArray.filter(room => room && room.roomNumber).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })).map(room => {
                                    const bedsArray = room.beds ? (Array.isArray(room.beds) ? Object.values(room.beds) : []) : [];
                                    return (
                                        <div key={room.id} className="p-4 border rounded-md bg-muted/50">
                                            <h4 className="font-semibold flex items-center justify-between">
                                                Room {room.roomNumber}
                                                {can.manage_accommodation && (
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
                                                )}
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                                {bedsArray.map(bed => {
                                                    const occupant = bed.occupantId ? manpowerProfiles.find(p => p.id === bed.occupantId) : null;
                                                    return (
                                                        <div key={bed.id} className="p-3 border rounded-lg bg-background flex flex-col items-center justify-center text-center">
                                                            <BedSingle className="h-6 w-6 mb-2" />
                                                            <p className="font-medium text-sm">Bed {bed.bedNumber}</p>
                                                            {occupant ? (
                                                                <>
                                                                    <p className="text-xs text-muted-foreground mt-1">{occupant.name}</p>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="ghost" size="sm" className="mt-2 h-7 text-destructive hover:text-destructive">
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
                                                                </>
                                                            ) : (
                                                                 <>
                                                                    <p className="text-xs text-green-600 mt-1">Available</p>
                                                                    <Button variant="outline" size="sm" className="mt-2 h-7" onClick={() => handleAssignClick(building.id, room.id, bed.id)}>
                                                                        <User className="mr-1 h-3 w-3"/> Assign
                                                                    </Button>
                                                                 </>
                                                            )}
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
        </>
    );
}
