
'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useInventory } from '@/contexts/inventory-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import type { Vehicle, VehicleStatus } from '@/lib/types';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface VehicleTableProps {
  onEdit: (vehicle: Vehicle) => void;
  onLogManager: (vehicle: Vehicle) => void;
}

const statusVariant: Record<VehicleStatus, 'success' | 'warning' | 'destructive'> = {
    'Active': 'success',
    'In Maintenance': 'warning',
    'Left the Project': 'destructive',
}

export default function VehicleTable({ onEdit, onLogManager }: VehicleTableProps) {
  const { can } = useAuth();
  const { vehicles, drivers, deleteVehicle } = useGeneral();
  const { toast } = useToast();

  const handleDelete = (vehicleId: string) => {
    deleteVehicle(vehicleId);
    toast({
      variant: 'destructive',
      title: 'Vehicle Deleted',
      description: 'The vehicle has been removed from the system.',
    });
  };
  
  const getDriverName = (driverId: string) => {
    return drivers.find(d => d.id === driverId)?.name || 'Unassigned';
  }
  
  const formatDate = (dateString?: string) => {
      if(!dateString) return 'N/A';
      const date = parseISO(dateString);
      return format(date, 'dd-MM-yyyy');
  }

  const getDateStyles = (dateString?: string): string => {
    if (!dateString) return '';
    const date = parseISO(dateString);
    if (isPast(date)) {
        return 'text-destructive font-bold';
    }
    if (differenceInDays(date, new Date()) <= 30) {
        return 'text-orange-500 font-semibold';
    }
    return '';
  };

  if (!vehicles || vehicles.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No vehicles found.</p>;
  }

  return (
    <div className="overflow-x-auto visible-scrollbar">
    <TooltipProvider>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Vehicle No.</TableHead>
          <TableHead className="whitespace-nowrap">Status</TableHead>
          <TableHead className="whitespace-nowrap">VAP Number</TableHead>
          <TableHead className="whitespace-nowrap">Driver</TableHead>
          <TableHead className="whitespace-nowrap">Vendor</TableHead>
          <TableHead className="whitespace-nowrap">VAP Access</TableHead>
          <TableHead className="whitespace-nowrap">VAP Validity</TableHead>
          <TableHead className="whitespace-nowrap">Insurance</TableHead>
          <TableHead className="whitespace-nowrap">Fitness</TableHead>
          <TableHead className="whitespace-nowrap">Tax</TableHead>
          <TableHead className="whitespace-nowrap">PUCC</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map(vehicle => (
          <TableRow key={vehicle.id}>
            <TableCell className="font-bold whitespace-nowrap">{vehicle.vehicleNumber}</TableCell>
            <TableCell className="whitespace-nowrap"><Badge variant={statusVariant[vehicle.status || 'Active']}>{vehicle.status || 'Active'}</Badge></TableCell>
            <TableCell className="whitespace-nowrap">{vehicle.vapNumber || 'N/A'}</TableCell>
            <TableCell className="whitespace-nowrap font-medium">{getDriverName(vehicle.driverId)}</TableCell>
            <TableCell className="whitespace-nowrap">{vehicle.vendorName || 'N/A'}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(vehicle.vapAccess || []).map(access => (
                  <Badge key={access} variant="secondary">{access}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className={cn('whitespace-nowrap', getDateStyles(vehicle.vapValidity))}>{formatDate(vehicle.vapValidity)}</TableCell>
            <TableCell className={cn('whitespace-nowrap', getDateStyles(vehicle.insuranceValidity))}>{formatDate(vehicle.insuranceValidity)}</TableCell>
            <TableCell className={cn('whitespace-nowrap', getDateStyles(vehicle.fitnessValidity))}>{formatDate(vehicle.fitnessValidity)}</TableCell>
            <TableCell className={cn('whitespace-nowrap', getDateStyles(vehicle.taxValidity))}>{formatDate(vehicle.taxValidity)}</TableCell>
            <TableCell className={cn('whitespace-nowrap', getDateStyles(vehicle.puccValidity))}>{formatDate(vehicle.puccValidity)}</TableCell>
            <TableCell className="text-right">
                 <div className="flex items-center justify-end gap-2">
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onLogManager(vehicle)}><FileText className="h-5 w-5"/></Button></TooltipTrigger><TooltipContent><p>View/Add Logs</p></TooltipContent></Tooltip>
                    {can.manage_vehicles && (
                      <>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onEdit(vehicle)}><Edit className="h-5 w-5"/></Button></TooltipTrigger><TooltipContent><p>Edit</p></TooltipContent></Tooltip>
                        <AlertDialog>
                            <Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-5 w-5"/></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the vehicle {vehicle.vehicleNumber}.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                </div>
              </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </TooltipProvider>
    </div>
  );
}
