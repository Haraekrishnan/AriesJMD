
'use client';

import React, { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, parseISO } from 'date-fns';
import type { Vehicle } from '@/lib/types';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface VehicleTableProps {
  onEdit: (vehicle: Vehicle) => void;
}

export default function VehicleTable({ onEdit }: VehicleTableProps) {
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

  const isDateExpired = (dateString?: string) => {
    if (!dateString) return false;
    return isPast(parseISO(dateString));
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle No.</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>VAP Access</TableHead>
          <TableHead>VAP Validity</TableHead>
          <TableHead>Insurance</TableHead>
          <TableHead>Fitness</TableHead>
          <TableHead>Tax</TableHead>
          <TableHead>PUCC</TableHead>
          {can.manage_vehicles && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map(vehicle => (
          <TableRow key={vehicle.id}>
            <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
            <TableCell>{getDriverName(vehicle.driverId)}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(vehicle.vapAccess || []).map(access => (
                  <Badge key={access} variant="secondary">{access}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className={cn(isDateExpired(vehicle.vapValidity) && 'text-destructive font-bold')}>{formatDate(vehicle.vapValidity)}</TableCell>
            <TableCell className={cn(isDateExpired(vehicle.insuranceValidity) && 'text-destructive font-bold')}>{formatDate(vehicle.insuranceValidity)}</TableCell>
            <TableCell className={cn(isDateExpired(vehicle.fitnessValidity) && 'text-destructive font-bold')}>{formatDate(vehicle.fitnessValidity)}</TableCell>
            <TableCell className={cn(isDateExpired(vehicle.taxValidity) && 'text-destructive font-bold')}>{formatDate(vehicle.taxValidity)}</TableCell>
            <TableCell className={cn(isDateExpired(vehicle.puccValidity) && 'text-destructive font-bold')}>{formatDate(vehicle.puccValidity)}</TableCell>
            {can.manage_vehicles && (
              <TableCell className="text-right">
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onEdit(vehicle)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
