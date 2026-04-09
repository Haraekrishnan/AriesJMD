'use client';
import { useState } from 'react';
import type { Quotation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { FileDown, Eye, Edit } from 'lucide-react';
import ViewQuotationDialog from './ViewQuotationDialog';
import { exportToExcel } from './exportQuotationToExcel';

export default function QuotationList({ quotations, onEdit }: { quotations: Quotation[], onEdit: (q: Quotation) => void }) {
    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);

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
            <div className="space-y-4">
                {quotations.map(q => (
                    <Card key={q.id}>
                        <CardHeader>
                            <CardTitle>{q.title}</CardTitle>
                            <CardDescription>Created on {format(parseISO(q.createdAt), 'dd MMM, yyyy')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>Status: {q.status}</p>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(q)}>
                                <Edit className="mr-2 h-4 w-4"/> Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleExport(q)}>
                                <FileDown className="mr-2 h-4 w-4" /> Excel
                            </Button>
                            <Button size="sm" onClick={() => setViewingQuotation(q)}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
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
