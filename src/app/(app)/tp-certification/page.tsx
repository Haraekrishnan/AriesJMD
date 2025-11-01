
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Trash2, FileSpreadsheet, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateTpCertExcel, generateTpCertPdf } from '@/components/inventory/generateTpCertReport';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TpCertList } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import GenerateTpCertDialog from '@/components/inventory/GenerateTpCertDialog';


export default function TpCertificationPage() {
    const { user, users, can, tpCertLists, deleteTpCertList } = useAppContext();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const { toast } = useToast();
    const [editingList, setEditingList] = useState<TpCertList | null>(null);

    const groupedLists = useMemo(() => {
        if (!selectedDate || !tpCertLists) return [];
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return (tpCertLists || []).filter(list => list.date === dateKey)
            .sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
    }, [selectedDate, tpCertLists]);

    const handleGenerateWorkbook = async () => {
        if (!tpCertLists || tpCertLists.length === 0) {
            toast({ title: "No lists found to generate a workbook.", variant: 'destructive' });
            return;
        }

        const workbook = new ExcelJS.Workbook();
        
        for (const list of tpCertLists) {
            await generateTpCertExcel(list.items, workbook, list.name);
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Master_TP_Cert_Workbook.xlsx`);
    };

    const handleGenerateSingleFile = async (list: TpCertList, type: 'excel' | 'pdf') => {
        try {
            if (type === 'excel') {
                await generateTpCertExcel(list.items, undefined, list.name);
            } else {
                await generateTpCertPdf(list.items);
            }
            toast({ title: `${type.toUpperCase()} Generated` });
        } catch (error) {
            toast({ title: 'Export Failed', variant: 'destructive' });
        }
    };

    const handleDeleteList = (listId: string) => {
        deleteTpCertList(listId);
        toast({ title: 'List Deleted', variant: 'destructive' });
    };

    const handleEditList = (list: TpCertList) => {
        setEditingList(list);
    };

    return (
        <>
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">TP Certification Lists</h1>
                    <p className="text-muted-foreground">Review and manage saved certification lists.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>View Saved Lists</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                        <DatePickerInput value={selectedDate} onChange={setSelectedDate} />
                        <Button onClick={handleGenerateWorkbook} disabled={!tpCertLists || tpCertLists.length === 0}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Generate Master Workbook
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {groupedLists.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4">
                            {groupedLists.map(list => {
                                const creator = users.find(u => u.id === list.creatorId);
                                const canEditList = list.isEditable && (user?.role === 'Admin' || can.approve_store_requests);
                                return (
                                    <AccordionItem key={list.id} value={list.id} className="border rounded-lg">
                                        <div className="flex justify-between items-center p-4">
                                            <AccordionTrigger className="p-0 hover:no-underline flex-1">
                                                <div>
                                                    <p className="font-semibold text-lg">{list.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Created by {creator?.name || 'Unknown'} at {format(parseISO(list.createdAt), 'p')}
                                                    </p>
                                                </div>
                                            </AccordionTrigger>
                                            <div className="flex items-center gap-2 pl-4">
                                                {canEditList && (
                                                    <Button size="sm" variant="secondary" onClick={() => handleEditList(list)}><Edit className="mr-2 h-4 w-4"/> Edit List</Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => handleGenerateSingleFile(list, 'excel')}><FileDown className="mr-2 h-4 w-4"/> Excel</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleGenerateSingleFile(list, 'pdf')}><FileDown className="mr-2 h-4 w-4"/> PDF</Button>
                                                {user?.role === 'Admin' && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="icon" variant="destructive"><Trash2 className="h-4 w-4"/></Button>
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
                                        <AccordionContent className="p-4 pt-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Sr. No</TableHead>
                                                        <TableHead>Material Name</TableHead>
                                                        <TableHead>Manufacturer Sr. No</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {list.items.map((item, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{index + 1}</TableCell>
                                                            <TableCell>{item.materialName}</TableCell>
                                                            <TableCell>{item.manufacturerSrNo}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No certification lists found for this date.</p>
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
        </>
    );
}
