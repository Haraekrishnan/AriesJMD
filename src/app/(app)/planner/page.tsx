
'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import CreateEventDialog from '@/components/planner/create-event-dialog';
import PlannerCalendar from '@/components/planner/planner-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { redirect } from 'next/navigation';

export default function PlannerPage() {
    redirect('/schedule');
    
    // The code below is kept to prevent breaking changes if other components depend on it,
    // but the user will be redirected away from this page.
    const { user, getVisibleUsers, can } = useAppContext();
    const [selectedUserId, setSelectedUserId] = useState<string>(user!.id);
    
    const visibleUsers = useMemo(() => getVisibleUsers(), [getVisibleUsers]);
    
    const canViewOthers = can.manage_planner;

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Monthly Planner</h1>
                    <p className="text-muted-foreground">Organize your team's schedule and events.</p>
                </div>
                <div className="flex items-center gap-4">
                    {canViewOthers && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="user-select" className="text-sm font-medium">Viewing Planner For:</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="w-[200px]" id="user-select">
                                    <SelectValue placeholder="Select an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleUsers.map(u => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {can.manage_planner && <CreateEventDialog />}
                </div>
            </div>
            
            <PlannerCalendar selectedUserId={selectedUserId} />
        </div>
    );
}
