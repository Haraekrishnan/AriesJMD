'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { RequestItem } from '@/types';

type NewInternalRequestDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

export default function NewInternalRequestDialog({ isOpen, setIsOpen }: NewInternalRequestDialogProps) {
    const { createInternalRequest } = useAppContext();
    const { toast } = useToast();
    const [items, setItems] = useState<RequestItem[]>([{ description: '', quantity: 1, remarks: '' }]);

    const handleItemChange = (index: number, field: keyof RequestItem, value: string | number) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, remarks: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = () => {
        const validItems = items.filter(item => item.description.trim() && item.quantity > 0);
        if (validItems.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please add at least one valid item.' });
            return;
        }
        createInternalRequest(validItems);
        toast({ title: 'Request Submitted' });
        setItems([{ description: '', quantity: 1, remarks: '' }]);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>New Internal Store Request</DialogTitle>
                    <DialogDescription>
                        List the items you want to request from the store.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 items-center gap-2 border-b pb-2">
                            <div className="col-span-5">
                                <Label htmlFor={`description-${index}`} className="sr-only">Description</Label>
                                <Input
                                    id={`description-${index}`}
                                    placeholder="Item Description"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor={`quantity-${index}`} className="sr-only">Quantity</Label>
                                <Input
                                    id={`quantity-${index}`}
                                    type="number"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                    min="1"
                                />
                            </div>
                            <div className="col-span-4">
                                <Label htmlFor={`remarks-${index}`} className="sr-only">Remarks</Label>
                                <Input
                                    id={`remarks-${index}`}
                                    placeholder="Remarks (optional)"
                                    value={item.remarks}
                                    onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                                />
                            </div>
                            <div className="col-span-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addItem}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Submit Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
