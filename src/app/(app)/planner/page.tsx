
'use client';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import CreateEventDialog from '@/components/planner/create-event-dialog';
import PlannerCalendar from '@/components/planner/planner-calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { startOfMonth, parseISO } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PlannerPage() {
    const { user, getVisibleUsers, can } = useAuth();
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
        <div 
          className="flex flex-col gap-6"
          style={{ height: "calc(100vh - 165px)" }}
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Monthly Planning</h1>
                    <p className="text-muted-foreground font-medium">Coordinate schedules, notes, and delegated events in a worksheet format.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    {canViewOthers && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="user-select" className="text-xs font-black uppercase tracking-widest text-slate-500">View Planner of:</Label>
                            <Select value={selectedUserId} onValueChange={handleUserChange}>
                                <SelectTrigger className="w-[200px] h-9 font-bold" id="user-select">
                                    <SelectValue placeholder="Select an employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleUsers.map((u, index) => (
                                        <SelectItem key={`${u.id}-${index}`} value={u.id} className="font-bold">{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex gap-2">
                      <CreateEventDialog isPlanning={true} />
                      <CreateEventDialog isDelegating={true} />
                    </div>
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
