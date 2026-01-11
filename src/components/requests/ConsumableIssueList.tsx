
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export default function ConsumableIssueList() {
    const { internalRequests, users, consumableItems } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    
    const consumableItemIds = useMemo(() => new Set(consumableItems.map(item => item.id)), [consumableItems]);

    const issuedItems = useMemo(() => {
        const items: any[] = [];
        internalRequests.forEach(req => {
            const isConsumableReq = req.items?.some(item => item.inventoryItemId && consumableItemIds.has(item.inventoryItemId));
            if (!isConsumableReq) return;

            const requester = users.find(u => u.id === req.requesterId);
            
            (req.items || []).forEach(item => {
                if (item.status === 'Issued') {
                    const issuedDate = (item as any).issuedDate;
                    if (issuedDate) {
                        items.push({
                            ...item,
                            requesterName: requester?.name || 'Unknown',
                            requestDate: req.date,
                            issuedDate: issuedDate,
                        });
                    }
                }
            });
        });
        return items.sort((a,b) => {
            const dateA = a.issuedDate ? parseISO(a.issuedDate) : null;
            const dateB = b.issuedDate ? parseISO(b.issuedDate) : null;
            if (dateA && dateB) {
                return dateB.getTime() - dateA.getTime();
            }
            return 0;
        });
    }, [internalRequests, users, consumableItemIds]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return issuedItems;
        const lowercasedTerm = searchTerm.toLowerCase();
        return issuedItems.filter(item => 
            item.description.toLowerCase().includes(lowercasedTerm) ||
            item.requesterName.toLowerCase().includes(lowercasedTerm)
        );
    }, [issuedItems, searchTerm]);
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'dd MMM, yyyy') : 'Invalid Date';
    };

    return (
        <div>
            <div className="pt-2 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by item or requester name..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            {filteredItems.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-2">
                    {filteredItems.map((item, index) => (
                        <AccordionItem key={`${item.id}-${index}`} value={`${item.id}-${index}`} className="border rounded-md px-4 bg-muted/40">
                            <AccordionTrigger>
                                <div className="flex justify-between items-center w-full">
                                    <div className="text-left">
                                        <p className="font-semibold">{item.description}</p>
                                        <p className="text-sm text-muted-foreground">Qty: {item.quantity} {item.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">To: {item.requesterName}</Badge>
                                        <Badge variant="success">Issued: {formatDate(item.issuedDate)}</Badge>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
                                    <p><strong>Requested By:</strong> {item.requesterName}</p>
                                    <p><strong>Requested Date:</strong> {formatDate(item.requestDate)}</p>
                                    <p><strong>Issued Date:</strong> {formatDate(item.issuedDate)}</p>
                                    <p><strong>Remarks:</strong> {item.remarks || 'N/A'}</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                    <div className="text-center py-10 text-muted-foreground">No issued consumables found.</div>
            )}
        </div>
    );
}

