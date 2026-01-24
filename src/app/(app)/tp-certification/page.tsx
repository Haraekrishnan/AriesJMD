
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Trash2, FileSpreadsheet, Edit, BookOpen, Search, Unlock, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateTpCertExcel, generateTpCertPdf } from '@/components/tp-certification/generateTpCertReport';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TpCertList, TpCertChecklist, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import GenerateTpCertDialog from '@/components/inventory/GenerateTpCertDialog';
import UpdateCertValidityDialog from '@/components/tp-certification/UpdateCertValidityDialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function TpCertificationPage() {
    const { 
        user, users, tpCertLists, deleteTpCertList,
        inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims, can,
        updateTpCertList
     } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const [editingList, setEditingList] = useState<TpCertList | null>(null);
    const [updatingValidityList, setUpdatingValidityList] = useState<TpCertList | null>(null);
    
    const allItems = useMemo(() => [
      ...inventoryItems, ...utMachines, ...dftMachines, ...digitalCameras, 
      ...anemometers, ...otherEquipments, ...laptopsDesktops, ...mobileSims
    ], [inventoryItems, utMachines, dftMachines, digitalCameras, anemometers, otherEquipments, laptopsDesktops, mobileSims]);

    const filteredLists = useMemo(() => {
        const allLists = (tpCertLists || [])
            .filter(list => !!list.createdAt)
            .sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
        if (!searchTerm.trim()) {
            return allLists;
        }
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        return allLists.filter(list => 
            list.items.some(item => 
                item.manufacturerSrNo?.toLowerCase().includes(lowercasedSearchTerm) ||
                item.chestCrollNo?.toLowerCase().includes(lowercasedSearchTerm)
            )
        );
    }, [searchTerm, tpCertLists]);

    const handleGenerateWorkbook = async () => {
        if (filteredLists.length === 0) {
            toast({ title: "No lists to export.", variant: 'destructive' });
            return;
        }

        const workbook = new ExcelJS.Workbook();
        
        for (const list of filteredLists) {
            await generateTpCertExcel(list.items, allItems, workbook, list.name, list.date);
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `TP_Cert_Master_Workbook.xlsx`);
    };

    const handleGenerateSingleFile = async (list: TpCertList, type: 'excel' | 'pdf') => {
        try {
            if (type === 'excel') {
                await generateTpCertExcel(list.items, allItems, undefined, list.name, list.date);
            } else {
                await generateTpCertPdf(list.items, allItems, list.date);
            }
            toast({ title: `${type.toUpperCase()} Generated` });
        } catch (error) {
            console.error(error);
            toast({ title: 'Export Failed', variant: 'destructive', description: (error as Error).message });
        }
    };

    const handleDeleteList = (listId: string) => {
        deleteTpCertList(listId);
        toast({ title: 'List Deleted', variant: 'destructive' });
    };

    const checklistItems: { key: keyof TpCertChecklist; label: string; permissions: Role[] }[] = [
      { key: 'sentForTesting', label: 'Sent for Testing', permissions: ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'] },
      { key: 'itemsReceived', label: 'Received Items After Testing', permissions: ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'] },
      { key: 'proformaReceived', label: 'Proforma Received', permissions: ['Admin', 'Project Coordinator', 'Document Controller'] },
      { key: 'poSent', label: 'PO Sent', permissions: ['Admin', 'Project Coordinator', 'Document Controller'] },
      { key: 'certsReceived', label: 'Received Certificates After Testing', permissions: ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'] },
      { key: 'validityUpdated', label: 'Certificates Scanned & Validity Updated', permissions: ['Admin', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'] },
    ];
    
    const handleChecklistChange = (list: TpCertList, itemKey: keyof TpCertChecklist, checked: boolean) => {
        if (!user) return;

        const currentIndex = checklistItems.findIndex(item => item.key === itemKey);

        // Prevent checking an item if the previous one isn't checked.
        if (checked && currentIndex > 0) {
            const prevItemKey = checklistItems[currentIndex - 1].key;
            if (!list.checklist?.[prevItemKey]) {
                toast({
                    title: 'Prerequisite Step Missing',
                    description: `Please complete "${checklistItems[currentIndex - 1].label}" before proceeding.`,
                    variant: 'destructive',
                });
                return; 
            }
        }
        
        // Prevent unchecking an item if a later one is still checked.
        if (!checked && currentIndex < checklistItems.length - 1) {
            const nextItemKey = checklistItems[currentIndex + 1].key;
            if (list.checklist?.[nextItemKey]) {
                toast({
                    title: 'Invalid Action',
                    description: `Please uncheck later steps before unchecking this one.`,
                    variant: 'destructive',
                });
                return;
            }
        }
    
        const updatedChecklist = {
            ...(list.checklist || {}),
            [itemKey]: checked ? { userId: user.id, date: new Date().toISOString() } : null
        };
        
        const isLockingAction = itemKey === 'sentForTesting' && checked;
        
        updateTpCertList({ 
            ...list, 
            checklist: updatedChecklist,
            isLocked: list.isLocked || isLockingAction,
        });
    };
    
    const handleUnlock = (list: TpCertList) => {
        updateTpCertList({ ...list, isLocked: false });
        toast({ title: "List Unlocked", description: "The list can now be edited." });
    };


    if (!can.manage_tp_certification) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to manage TP Certification lists.</CardDescription>
               </CardHeader>
           </Card>
        );
    }

    return (
        <>
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">TP Certification Lists</h1>
                    <p className="text-muted-foreground">Review, manage, and update certification lists.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>View Saved Lists</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                         <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by Serial No or Chest Croll No..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleGenerateWorkbook} disabled={filteredLists.length === 0}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Generate Workbook
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredLists.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4">
                            {filteredLists.map(list => {
                                const creator = users.find(u => u.id === list.creatorId);
                                const itemSummary = list.items.reduce((acc, item) => {
                                    acc[item.materialName] = (acc[item.materialName] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>);
                                const totalQuantity = list.items.length;
                                const isLocked = list.isLocked;
                                const canUserUnlock = user && (user.role === 'Admin' || user.role === 'Project Coordinator');
                                
                                const isFinalized = !!list.checklist?.[checklistItems[checklistItems.length - 1].key];
                                const isAdmin = user?.role === 'Admin';

                                return (
                                    <AccordionItem key={list.id} value={list.id} className="border rounded-lg">
                                        <div className="flex justify-between items-center p-4">
                                            <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                                <div className="flex items-center gap-3">
                                                    {isLocked && <Lock className="h-4 w-4 text-muted-foreground"/>}
                                                    <div>
                                                        <p className="font-semibold text-lg">{list.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Created by {creator?.name || 'Unknown'} on {list.createdAt ? format(parseISO(list.createdAt), 'dd MMM, yyyy') : 'N/A'} at {list.createdAt ? format(parseISO(list.createdAt), 'p') : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>

                                            <Badge variant="secondary" className="mx-4">Total Qty: {totalQuantity}</Badge>

                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setUpdatingValidityList(list)}><BookOpen className="mr-2 h-4 w-4"/> Update Validity</Button>
                                                {!isLocked && (
                                                    <Button size="sm" variant="secondary" onClick={() => setEditingList(list)}><Edit className="mr-2 h-4 w-4"/> Edit List</Button>
                                                )}
                                                {isLocked && canUserUnlock && (
                                                    <Button size="sm" variant="outline" onClick={() => handleUnlock(list)}><Unlock className="mr-2 h-4 w-4" /> Unlock</Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); handleGenerateSingleFile(list, 'excel')}}><FileDown className="mr-2 h-4 w-4"/> Excel</Button>
                                                <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); handleGenerateSingleFile(list, 'pdf')}}><FileDown className="mr-2 h-4 w-4"/> PDF</Button>
                                                {user?.role === 'Admin' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="icon" variant="destructive" onClick={e => e.stopPropagation()}><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete this list?</AlertDialogTitle>
                                                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteList(list.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </div>
                                         <div className="p-4 pt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-t">
                                            {checklistItems.map(({ key, label, permissions }, index) => {
                                                const checkData = list.checklist?.[key];
                                                const isChecked = !!checkData;
                                                const checkedByUser = isChecked ? users.find(u => u.id === checkData.userId) : null;
                                                const canCheck = user && permissions.includes(user.role);

                                                let isDisabled = !canCheck;
                                                if (isFinalized && !isAdmin) {
                                                    isDisabled = true;
                                                }

                                                return (
                                                    <div key={key} className={cn("flex items-start space-x-2", isDisabled && "opacity-60")}>
                                                        <Checkbox
                                                            id={`${list.id}-${key}`}
                                                            checked={isChecked}
                                                            onCheckedChange={(checked) => handleChecklistChange(list, key, !!checked)}
                                                            disabled={isDisabled}
                                                        />
                                                        <div className="grid gap-1.5 leading-none">
                                                            <Label htmlFor={`${list.id}-${key}`} className={cn("text-sm font-medium leading-none", !isDisabled && "cursor-pointer", isDisabled && "cursor-not-allowed")}>
                                                                {label}
                                                            </Label>
                                                            {checkedByUser && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    <p>by {checkedByUser.name}</p>
                                                                    <p>{format(parseISO(checkData.date), 'dd MMM, h:mm a')}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <AccordionContent className="p-4 pt-0 max-h-[450px] overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Material Name</TableHead>
                                                        <TableHead className="text-right">Quantity</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Object.entries(itemSummary).map(([name, count]) => (
                                                        <TableRow key={name}>
                                                            <TableCell>{name}</TableCell>
                                                            <TableCell className="text-right">{count}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-muted font-bold">
                                                        <TableCell>Total</TableCell>
                                                        <TableCell className="text-right">{totalQuantity}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No certification lists found for the current filter.</p>
                    )}
                </CardContent>
            </Card>
        </div>
        {editingList && (
            <GenerateTpCertDialog 
                isOpen={!!editingList} 
                setIsOpen={() => setEditingList(null)}
                existingList={editingList}
            />
        )}
        {updatingValidityList && (
            <UpdateCertValidityDialog
                isOpen={!!updatingValidityList}
                setIsOpen={() => setUpdatingValidityList(null)}
                certList={updatingValidityList}
            />
        )}
        </>
    );
}
