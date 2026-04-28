
'use client';
import { useGeneral } from '@/contexts/general-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { ServiceCode } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

interface ServiceCodeListProps {
  onEdit: (code: ServiceCode) => void;
}

export default function ServiceCodeList({ onEdit }: ServiceCodeListProps) {
    const { jobCodes: serviceCodes, deleteJobCode: deleteServiceCode } = useGeneral();
    const { toast } = useToast();

    const handleDelete = (id: string, code: string) => {
        deleteServiceCode(id);
        toast({
            title: "Service Code Deleted",
            description: `Code ${code} has been removed.`,
            variant: "destructive"
        });
    };

    if (serviceCodes.length === 0) {
        return <p className="text-center py-8 text-muted-foreground">No service codes found. Add one to get started.</p>;
    }
    
    return (
        <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {serviceCodes.map(code => (
                        <TableRow key={code.id}>
                            <TableCell className="font-semibold">{code.code}</TableCell>
                            <TableCell>{code.description}</TableCell>
                            <TableCell>{code.uom}</TableCell>
                            <TableCell className="text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(code.rate)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(code)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete the code "{code.code}".</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(code.id, code.code)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
