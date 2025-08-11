'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function IgpOgpList() {
    const { igpOgpRecords = [] } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRecords = useMemo(() => {
        return igpOgpRecords.filter(record => 
            record.mrnNumber.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [igpOgpRecords, searchTerm]);

    if (igpOgpRecords.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No records found.</p>;
    }
    
    return (
        <div className="space-y-4">
            <div className="max-w-sm">
                <Input 
                    placeholder="Search by MRN Number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>MRN No.</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Items</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.map(record => (
                            <TableRow key={record.id}>
                                <TableCell>
                                    <Badge variant={record.type === 'IGP' ? 'success' : 'warning'}>{record.type}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">{record.mrnNumber}</TableCell>
                                <TableCell>{format(parseISO(record.date), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>{record.location}</TableCell>
                                <TableCell>
                                     <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value={record.id} className="border-none">
                                            <AccordionTrigger className="p-0 hover:no-underline font-normal text-left text-primary">
                                                {record.items.length} item(s)
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 text-muted-foreground">
                                                <ul className="list-disc pl-4 text-sm">
                                                    {record.items.map((item) => (
                                                        <li key={item.id}>
                                                            {item.itemName} - {item.quantity} {item.uom}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
