'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useForm, Controller } from 'react-hook-form';
import { Label } from '../ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface RequestFiltersProps {
    onSearch: (filters: any) => void;
    onClear: () => void;
}

export default function RequestFilters({ onSearch, onClear }: RequestFiltersProps) {
    const { handleSubmit, control, reset } = useForm();
    
    const onSubmit = (data: any) => {
        onSearch(data);
    };

    const handleClear = () => {
        reset({
            action: '', status: '', currentStage: '', requestAddedBy: '',
            requestCategory: '', expenseCategory: '', purchaseIncharge: '', lpoAmount: '',
            lpoNo: '', requestFrom: null, requestTo: null, deliveryFrom: null,
            suppliers: '', paymentModes: '', subject: '', holdCancelRequest: '',
            company: '', division: '', subdivision: '', requestNo: '', jobNo: '',
            deliveryTo: null, priority: ''
        });
        onClear();
    };
    
    return (
        <Accordion type="single" collapsible defaultValue="filters">
            <AccordionItem value="filters">
                <AccordionTrigger className="text-lg font-semibold">Search Filters</AccordionTrigger>
                <AccordionContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Card>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                                <div className="space-y-1">
                                    <Label>Actions</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Action" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Status</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Current Stage</Label>
                                    <Input placeholder="Current Stage" />
                                </div>
                                <div className="space-y-1">
                                    <Label>Request Added By</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Request Added By" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Request Category</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Request Category" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Expense Category</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Expense Category" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Purchase Incharge</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Purchase Incharge" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                 <div className="space-y-1">
                                    <Label>LPO Amount (1000 AED)</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Lpo No</Label>
                                    <Input />
                                </div>
                                <div className="space-y-1">
                                    <Label>Request From</Label>
                                    <DatePickerInput value={undefined} onChange={() => {}} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Request To</Label>
                                    <DatePickerInput value={undefined} onChange={() => {}} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Delivery From</Label>
                                    <DatePickerInput value={undefined} onChange={() => {}} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Suppliers</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Suppliers" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Payment Modes</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Payment Modes" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                 <div className="space-y-1">
                                    <Label>Subject</Label>
                                    <Input />
                                </div>
                                <div className="space-y-1">
                                    <Label>Hold/Cancel Request</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Anyone" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Company</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Company" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Division</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Division" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Subdivision</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Subdivision" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Request No</Label>
                                    <Input />
                                </div>
                                <div className="space-y-1">
                                    <Label>Job No</Label>
                                    <Input />
                                </div>
                                <div className="space-y-1">
                                    <Label>Delivery To</Label>
                                    <DatePickerInput value={undefined} onChange={() => {}} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Priority</Label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Priority" /></SelectTrigger><SelectContent></SelectContent></Select>
                                </div>

                                <div className="lg:col-span-4 flex justify-end items-center gap-2 pt-4">
                                    <Button type="submit">Search</Button>
                                    <Button type="button" variant="outline">Excel Export</Button>
                                    <Button type="button" variant="ghost" onClick={handleClear}>Clear</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </form>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
