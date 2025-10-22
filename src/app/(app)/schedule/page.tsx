
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import CreateEventDialog from '@/components/schedule/create-event-dialog';
import PlannerCalendar from '@/components/planner/planner-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function SchedulePage() {
    const { user, getVisibleUsers, can } = useAppContext();
    const [selectedUserId, setSelectedUserId] = useState<string>(user!.id);
    
    const visibleUsers = useMemo(() => {
        return getVisibleUsers().filter(u => u.role !== 'Manager');
    }, [getVisibleUsers]);
    
    const canViewOthers = can.manage_planner;

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Monthly Planning</h1>
                    <p className="text-muted-foreground">Organize your team's schedule and events.</p>
                </div>
                <div className="flex items-center gap-4">
                    {canViewOthers && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="user-select" className="text-sm font-medium">View Planning of:</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="w-[200px]" id="user-select">
                                    <SelectValue placeholder="Select an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleUsers.map((u, index) => (
                                        <SelectItem key={`${u.id}-${index}`} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <CreateEventDialog />
                </div>
            </div>
            
            <PlannerCalendar selectedUserId={selectedUserId} />
        </div>
    );
}

    
