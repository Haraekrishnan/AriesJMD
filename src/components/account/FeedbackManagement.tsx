'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, parseISO, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { Feedback, FeedbackStatus } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';

const statusVariant: Record<FeedbackStatus, 'default' | 'secondary' | 'success'> = {
    'New': 'default',
    'In Progress': 'secondary',
    'Resolved': 'success',
};

const statusOptions: FeedbackStatus[] = ['New', 'In Progress', 'Resolved'];

export default function FeedbackManagement() {
    const { feedback, users, updateFeedbackStatus, markFeedbackAsViewed } = useAppContext();
    const [filter, setFilter] = useState<'all' | FeedbackStatus>('all');
    
    useEffect(() => {
        markFeedbackAsViewed();
    }, [markFeedbackAsViewed]);

    const filteredFeedback = useMemo(() => {
        if (!feedback || !Array.isArray(feedback)) return [];
        const sorted = [...feedback].sort((a, b) => {
            if (!a?.date) return 1;
            if (!b?.date) return -1;
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;
            return dateB.getTime() - dateA.getTime();
        });
        if (filter === 'all') {
            return sorted;
        }
        return sorted.filter(f => f.status === filter);
    }, [feedback, filter]);

    const handleStatusChange = (id: string, status: FeedbackStatus) => {
        updateFeedbackStatus(id, status);
    };

    if (!feedback || feedback.length === 0) {
        return <p className="text-muted-foreground">No feedback has been submitted yet.</p>;
    }
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'No Date';
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'dd MMM, yyyy') : 'Invalid Date';
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <Accordion type="multiple" className="w-full space-y-2">
                {filteredFeedback.map(item => {
                    const submitter = users.find(u => u.id === item.userId);
                    return (
                        <AccordionItem key={item.id} value={item.id} className="border rounded-lg">
                            <AccordionTrigger className="p-4 hover:no-underline text-left">
                                <div className="flex justify-between w-full items-center">
                                    <div className="flex-1">
                                      <p className="font-semibold">{item.subject}</p>
                                      <p className="text-sm text-muted-foreground">From: {submitter?.name || 'Unknown User'} on {formatDate(item.date)}</p>
                                    </div>
                                    <Badge variant={statusVariant[item.status]} className="ml-4">{item.status}</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <div className="p-4 bg-muted rounded-md mb-4 whitespace-pre-wrap">{item.message}</div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Change Status:</Label>
                                    <Select value={item.status} onValueChange={(value) => handleStatusChange(item.id, value as FeedbackStatus)}>
                                        <SelectTrigger className="w-[180px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </div>
    );
}

    
