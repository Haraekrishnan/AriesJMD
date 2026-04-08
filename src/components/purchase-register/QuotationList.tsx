'use client';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { Quotation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';
import { FileText } from 'lucide-react';

export default function QuotationList({ quotations }: { quotations: Quotation[] }) {
    if (!quotations || quotations.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-muted-foreground">No price comparisons created yet.</p>
            </div>
        )
    }

    return (
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
                </Card>
            ))}
        </div>
    );
}
