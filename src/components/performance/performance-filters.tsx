'use client';
import type { User } from '@/lib/types';
import type { DateRange } from 'react-day-picker';
import { TransferList } from '@/components/ui/transfer-list';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

interface PerformanceFiltersProps {
    users: User[];
    selectedUserIds: string[];
    onUserChange: (ids: string[]) => void;
    dateRange: DateRange | undefined;
    onDateChange: (range: DateRange | undefined) => void;
    onApply: () => void;
    onClear: () => void;
    canCompareEmployees: boolean;
}

export default function PerformanceFilters({ 
    users, 
    selectedUserIds, 
    onUserChange, 
    dateRange, 
    onDateChange,
    onApply,
    onClear,
    canCompareEmployees
}: PerformanceFiltersProps) {

    const userOptions = users
        .filter(u => u.role === 'Employee')
        .map(user => ({
            value: user.id,
            label: user.name,
        }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className={cn(
                    "grid gap-8 items-start",
                    canCompareEmployees ? "lg:grid-cols-[2fr,1fr]" : "grid-cols-1"
                )}>
                    {canCompareEmployees && (
                        <div>
                            <Label className="text-base font-semibold">Compare Employees</Label>
                            <p className="text-sm text-muted-foreground mb-2">Select employees to include in the comparison.</p>
                            <TransferList
                                options={userOptions}
                                selected={selectedUserIds}
                                onChange={onUserChange}
                                availableTitle="Available Employees"
                                selectedTitle="Selected for Comparison"
                            />
                        </div>
                    )}
                     <div className="flex flex-col gap-4 justify-start">
                         <div>
                            <Label className="text-base font-semibold">Date Range</Label>
                             <p className="text-sm text-muted-foreground mb-2">Filter task data by a specific date range.</p>
                            <DateRangePicker
                                date={dateRange}
                                onDateChange={onDateChange}
                            />
                         </div>
                        <div className="flex gap-2 justify-start pt-6">
                            <Button onClick={onApply}>Apply Filters</Button>
                            <Button variant="ghost" onClick={onClear}>
                                <X className="mr-2 h-4 w-4" /> Clear All
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
