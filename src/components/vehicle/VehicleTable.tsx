

'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  const { vehicles, drivers, can, deleteVehicle } = useAppContext();
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
    <div className="overflow-x-auto">
    <TooltipProvider>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle No.</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>VAP Number</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>VAP Access</TableHead>
          <TableHead>VAP Validity</TableHead>
          <TableHead>Insurance</TableHead>
          <TableHead>Fitness</TableHead>
          <TableHead>Tax</TableHead>
          <TableHead>PUCC</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map(vehicle => (
          <TableRow key={vehicle.id}>
            <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
            <TableCell><Badge variant={statusVariant[vehicle.status || 'Active']}>{vehicle.status || 'Active'}</Badge></TableCell>
            <TableCell>{vehicle.vapNumber || 'N/A'}</TableCell>
            <TableCell>{getDriverName(vehicle.driverId)}</TableCell>
            <TableCell>{vehicle.vendorName || 'N/A'}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(vehicle.vapAccess || []).map(access => (
                  <Badge key={access} variant="secondary">{access}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className={cn(getDateStyles(vehicle.vapValidity))}>{formatDate(vehicle.vapValidity)}</TableCell>
            <TableCell className={cn(getDateStyles(vehicle.insuranceValidity))}>{formatDate(vehicle.insuranceValidity)}</TableCell>
            <TableCell className={cn(getDateStyles(vehicle.fitnessValidity))}>{formatDate(vehicle.fitnessValidity)}</TableCell>
            <TableCell className={cn(getDateStyles(vehicle.taxValidity))}>{formatDate(vehicle.taxValidity)}</TableCell>
            <TableCell className={cn(getDateStyles(vehicle.puccValidity))}>{formatDate(vehicle.puccValidity)}</TableCell>
            <TableCell className="text-right">
                 <div className="flex items-center justify-end gap-2">
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onLogManager(vehicle)}><FileText className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>View/Add Logs</p></TooltipContent></Tooltip>
                    {can.manage_vehicles && (
                      <>
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onEdit(vehicle)}><Edit className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>Edit</p></TooltipContent></Tooltip>
                        <AlertDialog>
                            <Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent><p>Delete</p></TooltipContent></Tooltip>
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
