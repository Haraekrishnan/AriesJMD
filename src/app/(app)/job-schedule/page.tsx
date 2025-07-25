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
    
    const scheduleForExport = useMemo(() => {
        return jobSchedules.find(s => s.date === format(selectedDate, 'yyyy-MM-dd') && s.projectId === selectedProjectId);
    }, [jobSchedules, selectedDate, selectedProjectId]);

    const handleExportExcel = () => {
        const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'All Projects';
        
        const scheduleWithNames = scheduleForExport ? {
            ...scheduleForExport,
            items: scheduleForExport.items.map(item => ({
                ...item,
                manpowerIds: item.manpowerIds.map(id => manpowerProfiles.find(p => p.id === id)?.name || id),
                vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
            }))
        } : undefined;

        generateScheduleExcel(scheduleWithNames, projectName, selectedDate);
    };

    const handleExportPdf = () => {
        const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'All Projects';

        const scheduleWithNames = scheduleForExport ? {
            ...scheduleForExport,
            items: scheduleForExport.items.map(item => ({
                ...item,
                manpowerIds: item.manpowerIds.map(id => manpowerProfiles.find(p => p.id === id)?.name || id),
                vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
            }))
        } : undefined;
        generateSchedulePdf(scheduleWithNames, projectName, selectedDate);
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
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportExcel} disabled={selectedProjectId === 'all' || !scheduleForExport}><FileDown className="mr-2 h-4 w-4" /> Export Excel</Button>
                    <Button variant="outline" onClick={handleExportPdf} disabled={selectedProjectId === 'all' || !scheduleForExport}><FileDown className="mr-2 h-4 w-4" /> Export PDF</Button>
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
