
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import CreateEventDialog from '@/components/schedule/create-event-dialog';
import PlannerCalendar from '@/components/planner/planner-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import RecentPlannerActivity from '@/components/planner/RecentActivity';
import { startOfMonth, parseISO } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PlannerPage() {
    const { user, getVisibleUsers, can } = useAppContext();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [selectedUserId, setSelectedUserId] = useState<string>(() => {
        const urlUserId = searchParams.get('userId');
        return urlUserId || user!.id;
    });

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
        const urlDate = searchParams.get('date');
        return urlDate ? parseISO(urlDate) : new Date();
    });

    const [currentMonth, setCurrentMonth] = useState(() => {
        const urlDate = searchParams.get('date');
        return urlDate ? startOfMonth(parseISO(urlDate)) : startOfMonth(new Date());
    });
    
    const visibleUsers = useMemo(() => {
        return getVisibleUsers().filter(u => u.role !== 'Manager');
    }, [getVisibleUsers]);
    
    const canViewOthers = can.manage_planner;

    useEffect(() => {
        const urlUserId = searchParams.get('userId');
        if (urlUserId && urlUserId !== selectedUserId) {
            setSelectedUserId(urlUserId);
        }
    }, [searchParams, selectedUserId]);

    const handleUserChange = (userId: string) => {
        setSelectedUserId(userId);
        router.push(`/planner?userId=${userId}`, { scroll: false });
    };

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
                            <Select value={selectedUserId} onValueChange={handleUserChange}>
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
            
            <PlannerCalendar 
              selectedUserId={selectedUserId} 
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
            />
        </div>
    );
}
