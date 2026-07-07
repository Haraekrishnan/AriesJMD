'use client';
import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileDown, AlertTriangle, Unlock, ChevronLeft, ChevronRight, Lock, FileStack } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { addDays, format, isWithinInterval, parseISO } from 'date-fns';
import JobScheduleTable from '@/components/job-schedule/JobScheduleTable';
import { generateScheduleExcel, generateScheduleWorkbook } from '@/components/job-schedule/generateScheduleExcel';
import { generateSchedulePdf } from '@/components/job-schedule/generateSchedulePdf';
import { useToast } from '@/hooks/use-toast';
import type { JobSchedule } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';

export default function JobSchedulePage() {
    const { user, users, jobSchedules, can, manpowerProfiles, vehicles, saveJobSchedule, projects } = useAppContext();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [footerDate, setFooterDate] = useState<Date>(new Date());
    
    // Batch Export State
    const [isBatchExportOpen, setIsBatchExportOpen] = useState(false);
    const [batchDateRange, setBatchDateRange] = useState<DateRange | undefined>();

    const scheduleForDate: JobSchedule | undefined = useMemo(() => {
        if (!jobSchedules) return undefined;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return jobSchedules.find(s => s.date === dateStr);
    }, [jobSchedules, selectedDate]);

    const isLocked = scheduleForDate?.isLocked || false;

    const changeDay = (amount: number) => {
        setSelectedDate(prev => addDays(prev, amount));
    };

    const handleToggleLock = () => {
        if (!scheduleForDate || !user) return;
        saveJobSchedule({
            ...scheduleForDate,
            isLocked: !isLocked,
        });
        toast({
            title: isLocked ? 'Schedule Unlocked' : 'Schedule Locked',
            description: isLocked ? 'You can now make changes.' : 'Schedule finalized and locked for editing.',
        });
    };

    const handleExport = async (type: 'excel' | 'pdf') => {
        if (!scheduleForDate || !scheduleForDate.items || scheduleForDate.items.length === 0 || !vehicles || !user) return;

        const scheduleWithNames = {
            ...scheduleForDate,
            items: scheduleForDate.items.map((item: any) => ({
                ...item,
                manpowerIds: item.manpowerIds.map((id: string) => {
                  const mp = manpowerProfiles.find(p => p.id === id);
                  if (mp) return `${mp.name} (${mp.trade})`;
                  const up = users.find(u => u.id === id);
                  return up ? `${up.name} (${up.role})` : id;
                }),
                vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
            }))
        };

        const schedulerName = user.name;
        const signature = user.signatureBase64;

        if (type === 'excel') {
            await generateScheduleExcel(scheduleWithNames, selectedDate, footerDate, schedulerName, projects, signature);
        } else {
            await generateSchedulePdf(scheduleWithNames, selectedDate, footerDate, schedulerName, projects, signature);
        }
    };

    const handleBatchExport = async () => {
        if (!batchDateRange?.from || !user) return;
        const start = batchDateRange.from;
        const end = batchDateRange.to || start;

        const filteredSchedules = jobSchedules.filter(s => {
            const date = parseISO(s.date);
            return isWithinInterval(date, { start, end });
        }).sort((a, b) => a.date.localeCompare(b.date));

        if (filteredSchedules.length === 0) {
            toast({ title: 'No schedules found', description: 'No schedule records found in the selected range.', variant: 'destructive' });
            return;
        }

        const schedulesWithNames = filteredSchedules.map(s => ({
            ...s,
            items: s.items.map((item: any) => ({
                ...item,
                manpowerIds: item.manpowerIds.map((id: string) => {
                  const mp = manpowerProfiles.find(p => p.id === id);
                  if (mp) return `${mp.name} (${mp.trade})`;
                  const up = users.find(u => u.id === id);
                  return up ? `${up.name} (${up.role})` : id;
                }),
                vehicleId: vehicles.find(v => v.id === item.vehicleId)?.vehicleNumber || 'N/A'
            }))
        }));

        await generateScheduleWorkbook(schedulesWithNames, new Date(), user.name, projects, user.signatureBase64);
        setIsBatchExportOpen(false);
    };

    if (!can.manage_job_schedule && !can.view_all) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
               <CardHeader className="text-center items-center">
                   <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                       <AlertTriangle className="h-10 w-10 text-destructive" />
                   </div>
                   <CardTitle>Access Denied</CardTitle>
                   <CardDescription>You do not have permission to view this page.</CardDescription>
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
                <div className="flex gap-2">
                    <Dialog open={isBatchExportOpen} onOpenChange={setIsBatchExportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><FileStack className="mr-2 h-4 w-4"/> Batch Export</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Batch Excel Export</DialogTitle>
                                <DialogDescription>Generate a single workbook with multiple daily schedules.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Date Range</Label>
                                    <DateRangePicker date={batchDateRange} onDateChange={setBatchDateRange} className="w-full" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsBatchExportOpen(false)}>Cancel</Button>
                                <Button onClick={handleBatchExport} disabled={!batchDateRange?.from}>Download Workbook</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full sm:w-auto">
                        {scheduleForDate?.items && scheduleForDate.items.length > 0 && (
                            <>
                                <div className="hidden sm:block space-y-1.5">
                                    <Label htmlFor="footer-date" className="text-xs">Report Date</Label>
                                    <DatePickerInput value={footerDate} onChange={(d) => d && setFooterDate(d)} />
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button variant={isLocked ? "secondary" : "destructive"} onClick={handleToggleLock}>
                                        {isLocked ? <Unlock className="mr-2 h-4 w-4"/> : <Lock className="mr-2 h-4 w-4"/>}
                                        {isLocked ? 'Unlock Sheet' : 'Lock Schedule'}
                                    </Button>
                                    <Button onClick={() => handleExport('excel')} variant="outline"><FileDown className="mr-2 h-4 w-4"/> Excel</Button>
                                    <Button onClick={() => handleExport('pdf')} variant="outline"><FileDown className="mr-2 h-4 w-4"/> PDF</Button>
                                </div>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <JobScheduleTable 
                        selectedDate={format(selectedDate, 'yyyy-MM-dd')} 
                    />
                </CardContent>
            </Card>
        </div>
    );
}
