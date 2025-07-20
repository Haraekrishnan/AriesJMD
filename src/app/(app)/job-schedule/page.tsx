'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import JobScheduleTable from '@/components/job-schedule/JobScheduleTable';
import { generateScheduleExcel } from '@/components/job-schedule/generateScheduleExcel';
import { generateSchedulePdf } from '@/components/job-schedule/generateSchedulePdf';

export default function JobSchedulePage() {
    const { user, projects, jobSchedules, manpowerProfiles } = useAppContext();
    const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));

    const visibleProjects = useMemo(() => {
        if (!user) return [];
        if (user.role === 'Admin' || user.role === 'Project Coordinator') {
            return projects;
        }
        return projects.filter(p => p.id === user.projectId);
    }, [user, projects]);

    const [selectedProjectId, setSelectedProjectId] = useState<string>(visibleProjects[0]?.id || 'all');

    const handleExportExcel = () => {
        const schedule = jobSchedules.find(s => s.date === format(selectedDate, 'yyyy-MM-dd') && s.projectId === selectedProjectId);
        const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'All Projects';
        
        const scheduleWithNames = schedule ? {
            ...schedule,
            items: schedule.items.map(item => ({
                ...item,
                manpowerIds: item.manpowerIds.map(id => manpowerProfiles.find(p => p.id === id)?.name || id)
            }))
        } : undefined;

        generateScheduleExcel(scheduleWithNames, projectName, selectedDate);
    };

    const handleExportPdf = () => {
        const schedule = jobSchedules.find(s => s.date === format(selectedDate, 'yyyy-MM-dd') && s.projectId === selectedProjectId);
        const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'All Projects';

        const scheduleWithNames = schedule ? {
            ...schedule,
            items: schedule.items.map(item => ({
                ...item,
                manpowerIds: item.manpowerIds.map(id => manpowerProfiles.find(p => p.id === id)?.name || id)
            }))
        } : undefined;
        generateSchedulePdf(scheduleWithNames, projectName, selectedDate);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Job Schedule</h1>
                    <p className="text-muted-foreground">Plan and view the daily job schedule.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportExcel} disabled={selectedProjectId === 'all'}><FileDown className="mr-2 h-4 w-4" /> Export Excel</Button>
                    <Button variant="outline" onClick={handleExportPdf} disabled={selectedProjectId === 'all'}><FileDown className="mr-2 h-4 w-4" /> Export PDF</Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-4">
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn('w-full sm:w-[240px] justify-start text-left font-normal')}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, 'PPP')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={selectedDate} onSelect={(day) => day && setSelectedDate(day)} initialFocus />
                            </PopoverContent>
                        </Popover>
                         {user && (user.role === 'Admin' || user.role === 'Project Coordinator') && (
                            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select a project..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {visibleProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         )}
                    </div>
                </CardHeader>
                <CardContent>
                    <JobScheduleTable 
                        selectedDate={format(selectedDate, 'yyyy-MM-dd')} 
                        projectId={selectedProjectId}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
