'use client';
import { useState } from 'react';
import type { Quotation } from '@/lib/types';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { FileDown, Eye, Edit } from 'lucide-react';
import ViewQuotationDialog from './ViewQuotationDialog';
import { exportToExcel } from './exportQuotationToExcel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/app-provider';

export default function QuotationList({ quotations, onEdit }: { quotations: Quotation[], onEdit: (q: Quotation) => void }) {
    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
    const { users } = useAppContext();

    const handleExport = (quotation: Quotation) => {
        exportToExcel(quotation);
    };

    if (!quotations || quotations.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-muted-foreground">No price comparisons created yet.</p>
            </div>
        )
    }

    return (
        <>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Created By</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Items</TableHead>
                            <TableHead className="text-center">Vendors</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {quotations.map(q => {
                            const creator = users.find(u => u.id === q.creatorId);
                            return (
                                <TableRow key={q.id}>
                                    <TableCell className="font-medium">{q.title}</TableCell>
                                    <TableCell>{creator?.name || 'Unknown'}</TableCell>
                                    <TableCell>{format(parseISO(q.createdAt), 'dd MMM, yyyy')}</TableCell>
                                    <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                                    <TableCell className="text-center">{q.items.length}</TableCell>
                                    <TableCell className="text-center">{q.vendors.length}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => onEdit(q)}>
                                                <Edit className="mr-2 h-4 w-4"/> Edit
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleExport(q)}>
                                                <FileDown className="mr-2 h-4 w-4" /> Excel
                                            </Button>
                                            <Button size="sm" onClick={() => setViewingQuotation(q)}>
                                                <Eye className="mr-2 h-4 w-4" /> View
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            {viewingQuotation && (
                <ViewQuotationDialog
                    isOpen={!!viewingQuotation}
                    setIsOpen={() => setViewingQuotation(null)}
                    quotation={viewingQuotation}
                />
            )}
        </>
    );
}
