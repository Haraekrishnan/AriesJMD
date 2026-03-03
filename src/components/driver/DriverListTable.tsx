
'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import type { Driver } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import AddDriverDialog from './AddDriverDialog';

interface DriverListTableProps {
  onEdit: (driver: Driver) => void;
}

export default function DriverListTable({ onEdit }: DriverListTableProps) {
    const { can, drivers, deleteDriver } = useAppContext();
    const { toast } = useToast();

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

    const handleDelete = (driverId: string) => {
        deleteDriver(driverId);
        toast({ variant: 'destructive', title: 'Driver Deleted' });
    };

    if (!drivers || drivers.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No drivers found.</p>;
    }
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = parseISO(dateString);
        return format(date, 'dd-MM-yyyy');
    };

    return (
        <div className="overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>License No.</TableHead>
                    <TableHead>License Expiry</TableHead>
                    <TableHead>EP Expiry</TableHead>
                    <TableHead>Medical Expiry</TableHead>
                    <TableHead>Safety Expiry</TableHead>
                    {can.manage_vehicles && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {drivers.map(driver => (
                    <TableRow key={driver.id}>
                        <TableCell className="font-medium">{driver.name}</TableCell>
                        <TableCell>{driver.licenseNumber}</TableCell>
                         <TableCell className={cn(getDateStyles(driver.licenseExpiry))}>
                            {formatDate(driver.licenseExpiry)}
                        </TableCell>
                        <TableCell className={cn(getDateStyles(driver.epExpiry))}>
                            {formatDate(driver.epExpiry)}
                        </TableCell>
                        <TableCell className={cn(getDateStyles(driver.medicalExpiry))}>
                            {formatDate(driver.medicalExpiry)}
                        </TableCell>
                        <TableCell className={cn(getDateStyles(driver.safetyExpiry))}>
                            {formatDate(driver.safetyExpiry)}
                        </TableCell>
                        {can.manage_vehicles && (
                           <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(driver)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the driver record for {driver.name}.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(driver.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        </div>
    );
}
