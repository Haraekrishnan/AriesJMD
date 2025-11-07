
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import CreateEventDialog from '@/components/schedule/create-event-dialog';
import PlannerCalendar from '@/components/planner/planner-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import RecentPlannerActivity from '@/components/planner/RecentActivity';

export default function SchedulePage() {
    const { user, getVisibleUsers, can, updateLastViewedPlanner } = useAppContext();
    const [selectedUserId, setSelectedUserId] = useState<string>(user!.id);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    const visibleUsers = useMemo(() => {
        return getVisibleUsers().filter(u => u.role !== 'Manager');
    }, [getVisibleUsers]);
    
    const canViewOthers = can.manage_planner;

    useEffect(() => {
      // When the user views their own planner, update their last viewed time.
      if (selectedUserId === user?.id) {
        // This function needs to be implemented in the context
        // updateLastViewedPlanner(); 
      }
    }, [selectedUserId, user?.id]);


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
                    <CreateEventDialog isPlanning={true} />
                    <CreateEventDialog isDelegating={true} />
                </div>
            </div>
            
            <RecentPlannerActivity onDateSelect={setSelectedDate} selectedUserId={selectedUserId} />
            
            <PlannerCalendar selectedUserId={selectedUserId} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
        </div>
    );
}

