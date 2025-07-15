
'use client';

import { useState } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bed, Building, PlusCircle, Trash2, Pencil, UserPlus, LogOut, MoreHorizontal, UserCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { Building as BuildingType } from '@/types';
import EditRoomDialog from './edit-room-dialog';
import AddBedDialog from './add-bed-dialog';

type AccommodationDetailsProps = {
    onAddRoom: (building: BuildingType) => void;
    onEditBuilding: (building: BuildingType) => void;
};

export default function AccommodationDetails({ onAddRoom, onEditBuilding }: AccommodationDetailsProps) {
    const { buildings, users, deleteBuilding, deleteRoom, deleteBed, assignOccupant, can } = useAppContext();
    const [selectedRoom, setSelectedRoom] = useState<{buildingId: string; roomId: string} | null>(null);
    const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
    const [isAddBedOpen, setIsAddBedOpen] = useState(false);
    const [assignBedInfo, setAssignBedInfo] = useState<{buildingId: string; roomId: string; bedId: string} | null>(null);
    const [selectedOccupant, setSelectedOccupant] = useState<string | null>(null);

    const manpowerProfiles = users.filter(u => u.role === "Team Member" || u.role.includes("Junior"));

    const handleEditRoomClick = (buildingId: string, roomId: string) => {
        setSelectedRoom({buildingId, roomId});
        setIsEditRoomOpen(true);
    };

    const handleAddBedClick = (buildingId: string, roomId: string) => {
        setSelectedRoom({buildingId, roomId});
        setIsAddBedOpen(true);
    }

    const handleAssignBed = () => {
        if (assignBedInfo && selectedOccupant) {
            assignOccupant(assignBedInfo.buildingId, assignBedInfo.roomId, assignBedInfo.bedId, selectedOccupant);
            setAssignBedInfo(null);
            setSelectedOccupant(null);
        }
    };
    
    const handleUnassignBed = (buildingId: string, roomId: string, bedId: string) => {
        assignOccupant(buildingId, roomId, bedId, null);
    };


    const getOccupantName = (occupantId?: string) => {
        return users.find(u => u.id === occupantId)?.name || 'N/A';
    };

    if (buildings.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No buildings found. Add one to get started.</p>
    }

    return (
        <Accordion type="single" collapsible className="w-full space-y-4">
            {buildings.map(building => (
                <AccordionItem value={building.id} key={building.id} className="border rounded-lg">
                    <AccordionTrigger className="px-6 hover:no-underline">
                        <div className="flex items-center gap-4">
                            <Building className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-lg">{building.buildingNumber}</span>
                            <Badge variant="secondary">{building.rooms.length} Rooms</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                        <div className="flex justify-end gap-2 mb-4">
                            <Button variant="outline" size="sm" onClick={() => onEditBuilding(building)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Building
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Building
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the building and all its rooms and beds.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteBuilding(building.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button size="sm" onClick={() => onAddRoom(building)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                            </Button>
                        </div>
                        {building.rooms.length > 0 ? (
                            <div className="space-y-4">
                                {building.rooms.map(room => (
                                    <div key={room.id} className="border p-4 rounded-md">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold">Room {room.roomNumber}</h4>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleAddBedClick(building.id, room.id)}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Bed
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEditRoomClick(building.id, room.id)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Room
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Room
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the room and all its beds.
                                                            </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteRoom(building.id, room.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {room.beds.map(bed => (
                                                <Card key={bed.id} className={bed.occupantId ? 'bg-primary/10' : ''}>
                                                    <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                                                        <Bed className="h-8 w-8 text-primary" />
                                                        <p className="font-bold">{bed.bedNumber}</p>
                                                        {bed.occupantId ? (
                                                            <div className='text-center'>
                                                                <p className="text-sm text-green-600 font-semibold">{getOccupantName(bed.occupantId)}</p>
                                                                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 mt-1 text-xs text-destructive" onClick={() => handleUnassignBed(building.id, room.id, bed.id)}>
                                                                    <LogOut className="mr-1 h-3 w-3" /> Unassign
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="outline" size="sm" className="text-xs h-auto px-2 py-1" onClick={() => setAssignBedInfo({ buildingId: building.id, roomId: room.id, bedId: bed.id })}>
                                                                        <UserPlus className="mr-1 h-3 w-3" /> Assign
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Assign Bed {bed.bedNumber} in Room {room.roomNumber}</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Select a manpower profile to assign to this bed.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <Select onValueChange={setSelectedOccupant}>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select manpower..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {manpowerProfiles.map(p => (
                                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel onClick={() => setAssignBedInfo(null)}>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={handleAssignBed}>Assign</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No rooms in this building. Add one to get started.</p>
                        )}
                    </AccordionContent>
                </AccordionItem>
            ))}

            {selectedRoom && (
                <>
                    <EditRoomDialog 
                        isOpen={isEditRoomOpen}
                        setIsOpen={setIsEditRoomOpen}
                        buildingId={selectedRoom.buildingId}
                        room={buildings.find(b => b.id === selectedRoom.buildingId)?.rooms.find(r => r.id === selectedRoom.roomId)}
                    />
                    <AddBedDialog
                        isOpen={isAddBedOpen}
                        setIsOpen={setIsAddBedOpen}
                        buildingId={selectedRoom.buildingId}
                        roomId={selectedRoom.roomId}
                    />
                </>
            )}
        </Accordion>
    );
}
