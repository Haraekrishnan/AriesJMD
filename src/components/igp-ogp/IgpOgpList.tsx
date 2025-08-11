
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

    const groupedByMrn = useMemo(() => {
        const groups: { [mrn: string]: { igpItems: any[], ogpItems: any[] } } = {};
        
        igpOgpRecords.forEach(record => {
            if (!groups[record.mrnNumber]) {
                groups[record.mrnNumber] = { igpItems: [], ogpItems: [] };
            }
            if (record.type === 'IGP') {
                groups[record.mrnNumber].igpItems.push(...record.items);
            } else {
                groups[record.mrnNumber].ogpItems.push(...record.items);
            }
        });

        return Object.entries(groups).map(([mrnNumber, { igpItems, ogpItems }]) => {
            const itemMap = new Map<string, { inward: number, outward: number, uom: string }>();

            igpItems.forEach(item => {
                const key = `${item.itemName.toLowerCase()}_${item.uom.toLowerCase()}`;
                const existing = itemMap.get(key) || { inward: 0, outward: 0, uom: item.uom };
                existing.inward += item.quantity;
                itemMap.set(key, existing);
            });

            ogpItems.forEach(item => {
                const key = `${item.itemName.toLowerCase()}_${item.uom.toLowerCase()}`;
                const existing = itemMap.get(key) || { inward: 0, outward: 0, uom: item.uom };
                existing.outward += item.quantity;
                itemMap.set(key, existing);
            });
            
            const summary = Array.from(itemMap.entries()).map(([key, { inward, outward, uom }]) => ({
                itemName: igpItems.find(i => `${i.itemName.toLowerCase()}_${i.uom.toLowerCase()}` === key)?.itemName || ogpItems.find(i => `${i.itemName.toLowerCase()}_${i.uom.toLowerCase()}` === key)?.itemName,
                uom,
                inward,
                outward,
                balance: inward - outward,
            }));

            return {
                mrnNumber,
                summary,
                // Get the latest date from any record associated with this MRN
                lastActivity: igpOgpRecords
                  .filter(r => r.mrnNumber === mrnNumber)
                  .map(r => parseISO(r.date))
                  .sort((a,b) => b.getTime() - a.getTime())[0]
            };
        });
    }, [igpOgpRecords]);

    const filteredRecords = useMemo(() => {
        return groupedByMrn.filter(group => 
            group.mrnNumber.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    }, [groupedByMrn, searchTerm]);

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
             <Accordion type="multiple" className="w-full space-y-2">
                {filteredRecords.map(({ mrnNumber, summary, lastActivity }) => (
                    <AccordionItem key={mrnNumber} value={mrnNumber} className="border rounded-lg bg-card">
                        <AccordionTrigger className="p-4 hover:no-underline">
                            <div className="flex justify-between w-full items-center">
                                <span className="font-semibold text-lg">{mrnNumber}</span>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-muted-foreground">Last Activity: {format(lastActivity, 'dd MMM, yyyy')}</span>
                                    {summary.every(s => s.balance <= 0) && <Badge variant="destructive">Exhausted</Badge>}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead className="text-center">UOM</TableHead>
                                        <TableHead className="text-center">Inward (IGP)</TableHead>
                                        <TableHead className="text-center">Outward (OGP)</TableHead>
                                        <TableHead className="text-center">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.map(item => (
                                        <TableRow key={item.itemName}>
                                            <TableCell>{item.itemName}</TableCell>
                                            <TableCell className="text-center">{item.uom}</TableCell>
                                            <TableCell className="text-center text-green-600 font-medium">{item.inward}</TableCell>
                                            <TableCell className="text-center text-red-600 font-medium">{item.outward}</TableCell>
                                            <TableCell className="text-center font-bold">
                                                {item.balance > 0 ? (
                                                    item.balance
                                                ) : (
                                                    <Badge variant="destructive">Exhausted</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
