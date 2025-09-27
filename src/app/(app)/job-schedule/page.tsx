'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileDown, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import JobScheduleTable from '@/components/job-schedule/JobScheduleTable';
import { generateScheduleExcel } from '@/components/job-schedule/generateScheduleExcel';
import { generateSchedulePdf } from '@/components/job-schedule/generateSchedulePdf';
import type { JobSchedule } from '@/lib/types';

export default function JobSchedulePage() {
    const { user, projects, jobSchedules, manpowerProfiles, vehicles, can } = useAppContext();
    const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));

    const visibleProjects = useMemo(() => {
        if (!user) return [];
        if (user.role === 'Admin' || user.role === 'Project Coordinator') {
            return projects;
        }
        return projects.filter(p => p.id === user.projectId);
    }, [user, projects]);

    const [selectedProjectId, setSelectedProjectId] = useState<string>(visibleProjects[0]?.id || 'all');
    
    const masterSchedule = useMemo(() => {
        const schedulesForDate = jobSchedules.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'));
        const combinedItems: JobSchedule['items'] = [];
        schedulesForDate.forEach(schedule => {
            const projectName = projects.find(p => p.id === schedule.projectId)?.name || 'Unknown Project';
            schedule.items.forEach(item => {
                combinedItems.push({
                    ...item,
                    projectVesselName: `${projectName} / ${item.projectVesselName || ''}`
                });
            });
        });
         return {
            id: `master_${format(selectedDate, 'yyyy-MM-dd')}`,
            date: format(selectedDate, 'yyyy-MM-dd'),
            projectId: 'all',
            supervisorId: user!.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: combinedItems,
        };
    }, [jobSchedules, selectedDate, projects, user]);

    const handleExportExcel = () => {
        const scheduleWithNames = {
            ...masterSchedule,
            items: masterSchedule.items.map(item => ({
                ...item,
                manpowerIds: item.manpowerIds.map(id => manpowerProfiles.find(p => p.id === id)?.name || id),
                vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
            }))
        };
        generateScheduleExcel(scheduleWithNames, 'Master Schedule', selectedDate);
    };

    const handleExportPdf = () => {
       const scheduleWithNames = {
            ...masterSchedule,
            items: masterSchedule.items.map(item => ({
                ...item,
                manpowerIds: item.manpowerIds.map(id => manpowerProfiles.find(p => p.id === id)?.name || id),
                vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
            }))
        };
        generateSchedulePdf(scheduleWithNames, 'Master Schedule', selectedDate);
    };

    if (!can.manage_job_schedule) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view the job schedule.</CardDescription>
               </CardHeader>
           </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Job Schedule</h1>
                    <p className="text-muted-foreground">Plan and view the daily job schedule.</p>
                </div>
                 {can.prepare_master_schedule && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" /> Prepare Full Schedule (Excel)</Button>
                        <Button variant="outline" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4" /> Prepare Full Schedule (PDF)</Button>
                    </div>
                )}
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
