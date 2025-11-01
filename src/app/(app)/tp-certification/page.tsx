
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Trash2, Workbook } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateTpCertExcel, generateTpCertPdf } from '@/components/inventory/generateTpCertReport';
import * as XLSX from 'xlsx';
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

export default function TpCertificationPage() {
    const { user, users, tpCertLists, deleteTpCertList } = useAppContext();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const { toast } = useToast();

    const groupedLists = useMemo(() => {
        if (!selectedDate) return [];
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return (tpCertLists || []).filter(list => list.date === dateKey)
            .sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
    }, [selectedDate, tpCertLists]);

    const handleGenerateWorkbook = async () => {
        if (groupedLists.length === 0) {
            toast({ title: "No lists found for this date.", variant: 'destructive' });
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const headerImagePath = '/aries-header.png';
        
        for (const list of groupedLists) {
            await generateTpCertExcel(list.items, headerImagePath, workbook, list.name);
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `TP_Cert_Workbook_${format(selectedDate!, 'yyyy-MM-dd')}.xlsx`);
    };

    const handleGenerateSingleFile = async (list: TpCertList, type: 'excel' | 'pdf') => {
        const headerImagePath = '/aries-header.png';
        try {
            if (type === 'excel') {
                await generateTpCertExcel(list.items, headerImagePath);
            } else {
                await generateTpCertPdf(list.items, headerImagePath);
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

    return (
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
                        <Button onClick={handleGenerateWorkbook} disabled={groupedLists.length === 0}>
                            <Workbook className="mr-2 h-4 w-4" /> Generate Day's Workbook
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {groupedLists.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4">
                            {groupedLists.map(list => {
                                const creator = users.find(u => u.id === list.creatorId);
                                return (
                                    <AccordionItem key={list.id} value={list.id} className="border rounded-lg">
                                        <AccordionTrigger className="p-4 hover:no-underline">
                                            <div className="flex justify-between w-full items-center">
                                                <div>
                                                    <p className="font-semibold text-lg">{list.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Created by {creator?.name || 'Unknown'} at {format(parseISO(list.createdAt), 'p')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
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
                                        </AccordionTrigger>
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
    );
}
