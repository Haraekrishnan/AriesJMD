'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileDown, AlertTriangle, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import JobScheduleTable from '@/components/job-schedule/JobScheduleTable';
import { generateScheduleExcel } from '@/components/job-schedule/generateScheduleExcel';
import { generateSchedulePdf } from '@/components/job-schedule/generateSchedulePdf';
import { useToast } from '@/hooks/use-toast';
import type { JobSchedule } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { DatePickerInput } from '@/components/ui/date-picker-input';

export default function JobSchedulePage() {
    const { user, users, jobSchedules, can, manpowerProfiles, vehicles } = useAppContext();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [footerDate, setFooterDate] = useState<Date>(new Date());

    const scheduleForDate: JobSchedule | undefined = useMemo(() => {
        if (!jobSchedules) return undefined;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return jobSchedules.find(s => s.date === dateStr);
    }, [jobSchedules, selectedDate]);

    const changeDay = (amount: number) => {
        setSelectedDate(prev => addDays(prev, amount));
    };

    const handleExport = async (type: 'excel' | 'pdf') => {
        if (!scheduleForDate || !scheduleForDate.items || scheduleForDate.items.length === 0 || !vehicles) return;

        const scheduleWithNames = {
            ...scheduleForDate,
            items: scheduleForDate.items.map((item: any) => ({
                ...item,
                manpowerIds: item.manpowerIds.map((id: string) => {
                  const manpowerProfile = manpowerProfiles.find(p => p.id === id);
                  if (manpowerProfile) return manpowerProfile.name;
                  const userProfile = users.find(u => u.id === id);
                  return userProfile?.name || id;
                }),
                vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
            }))
        };

        if (type === 'excel') {
            await generateScheduleExcel(scheduleWithNames, selectedDate, footerDate);
        } else {
            await generateSchedulePdf(scheduleWithNames, selectedDate, footerDate);
        }
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
            </div>
            
            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => changeDay(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn('w-full sm:w-[240px] justify-start text-left font-normal text-lg py-6')}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, 'PPP')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={selectedDate} onSelect={(day) => day && setSelectedDate(day)} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="icon" onClick={() => changeDay(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end gap-2">
                        {scheduleForDate && scheduleForDate.items.length > 0 && (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="footer-date" className="text-sm">Report Date</Label>
                                    <DatePickerInput value={footerDate} onChange={(d) => d && setFooterDate(d)} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => handleExport('excel')}><FileDown className="mr-2 h-4 w-4"/> Export Excel</Button>
                                    <Button onClick={() => handleExport('pdf')}><FileDown className="mr-2 h-4 w-4"/> Export PDF</Button>
                                </div>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <JobScheduleTable 
                        selectedDate={format(selectedDate, 'yyyy-MM-dd')} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}
