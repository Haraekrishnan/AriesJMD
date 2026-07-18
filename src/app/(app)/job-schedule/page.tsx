'use client';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, FileDown, AlertTriangle, Unlock, ChevronLeft, ChevronRight, Lock, FileStack, PlusCircle, Trash2, Users } from 'lucide-react';
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
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { rtdb } from '@/lib/rtdb';
import { ref, remove } from 'firebase/database';

export default function JobSchedulePage() {
    const { user, users, jobSchedules, can, manpowerProfiles, vehicles, saveJobSchedule, projects } = useAppContext();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [footerDate, setFooterDate] = useState<Date>(new Date());
    const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
    
    // Batch Export State
    const [isBatchExportOpen, setIsBatchExportOpen] = useState(false);
    const [batchDateRange, setBatchDateRange] = useState<DateRange | undefined>();

    const schedulesForDate = useMemo(() => {
        if (!jobSchedules) return [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return jobSchedules.filter(s => s.date === dateStr).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
    }, [jobSchedules, selectedDate]);

    useEffect(() => {
        if (schedulesForDate.length > 0) {
            if (!activeScheduleId || !schedulesForDate.some(s => s.id === activeScheduleId)) {
                setActiveScheduleId(schedulesForDate[0].id);
            }
        } else {
            setActiveScheduleId(null);
        }
    }, [schedulesForDate, activeScheduleId]);

    const activeSchedule = useMemo(() => {
        return schedulesForDate.find(s => s.id === activeScheduleId);
    }, [schedulesForDate, activeScheduleId]);

    const isLocked = activeSchedule?.isLocked || false;

    const changeDay = (amount: number) => {
        setSelectedDate(prev => addDays(prev, amount));
    };

    const handleAddSchedule = () => {
        if (!user) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const newId = `schedule_${dateStr}_${Date.now()}`;
        saveJobSchedule({
            id: newId,
            date: dateStr,
            projectId: 'all',
            supervisorId: user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [],
            isLocked: false,
            name: `Schedule ${schedulesForDate.length + 1}`
        });
        setActiveScheduleId(newId);
        toast({ title: 'New Schedule Added' });
    };

    const handleToggleLock = () => {
        if (!activeSchedule || !user) return;
        saveJobSchedule({
            ...activeSchedule,
            isLocked: !isLocked,
        });
        toast({
            title: isLocked ? 'Schedule Unlocked' : 'Schedule Locked',
            description: isLocked ? 'You can now make changes.' : 'Schedule finalized and locked for editing.',
        });
    };

    const handleDeleteSchedule = (id: string) => {
        remove(ref(rtdb, `jobSchedules/${id}`));
        toast({ title: 'Schedule Deleted', variant: 'destructive' });
    };

    const handleExport = async (type: 'excel' | 'pdf') => {
        if (!activeSchedule || !activeSchedule.items || activeSchedule.items.length === 0 || !vehicles || !user) return;

        const scheduleWithNames = {
            ...activeSchedule,
            items: activeSchedule.items.map((item: any) => ({
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

    const globalHeadcountSummary = useMemo(() => {
        const allAssignedIds = new Set<string>();
        schedulesForDate.forEach(s => {
            s.items?.forEach(item => {
                item.manpowerIds?.forEach(id => allAssignedIds.add(id));
            });
        });
        
        const counts: Record<string, number> = {};
        allAssignedIds.forEach(id => {
            const mp = manpowerProfiles.find(p => p.id === id);
            const u = users.find(u => u.id === id);
            const trade = mp?.trade || u?.role || 'Unknown';
            counts[trade] = (counts[trade] || 0) + 1;
        });

        return {
            counts: Object.entries(counts).sort((a, b) => b[1] - a[1]),
            total: allAssignedIds.size
        };
    }, [schedulesForDate, manpowerProfiles, users]);

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Job Schedule</h1>
                    <p className="text-muted-foreground">Plan and view the daily job schedule.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isBatchExportOpen} onOpenChange={setIsBatchExportOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><FileStack className="mr-2 h-4 w-4"/> Batch Export</Button>
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

            {/* Global Headcount Summary for the date */}
            {globalHeadcountSummary.total > 0 && (
                <div className="p-4 bg-muted/30 border rounded-lg shadow-sm">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-2 mr-2">
                            <Users className="h-5 w-5 text-primary" />
                            <span className="font-bold text-sm uppercase tracking-wider">Daily Headcount Summary:</span>
                            <Badge variant="default" className="ml-1 text-sm font-black px-3">
                                {globalHeadcountSummary.total} Total
                            </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {globalHeadcountSummary.counts.map(([trade, count]) => (
                                <div key={trade} className="flex items-center gap-1.5 px-3 py-1 bg-background border rounded-full shadow-sm text-xs font-semibold">
                                    <span className="text-muted-foreground">{trade}:</span>
                                    <span className="text-primary font-black">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
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
                        <div className="hidden sm:block space-y-1.5">
                            <Label htmlFor="footer-date" className="text-xs">Report Date</Label>
                            <DatePickerInput value={footerDate} onChange={(d) => d && setFooterDate(d)} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {can.manage_job_schedule && activeSchedule && (
                                <Button variant={isLocked ? "secondary" : "destructive"} onClick={handleToggleLock} size="sm">
                                    {isLocked ? <Unlock className="mr-2 h-4 w-4"/> : <Lock className="mr-2 h-4 w-4"/>}
                                    {isLocked ? 'Unlock' : 'Lock'}
                                </Button>
                            )}
                            <Button onClick={() => handleExport('excel')} variant="outline" size="sm" disabled={!activeSchedule}><FileDown className="mr-2 h-4 w-4"/> Excel</Button>
                            <Button onClick={() => handleExport('pdf')} variant="outline" size="sm" disabled={!activeSchedule}><FileDown className="mr-2 h-4 w-4"/> PDF</Button>
                            {can.manage_job_schedule && (
                                <Button onClick={handleAddSchedule} size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Schedule</Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-4">
                    {schedulesForDate.length > 0 ? (
                        <Tabs value={activeScheduleId || ''} onValueChange={setActiveScheduleId} className="w-full">
                            <TabsList className="px-4 bg-muted/20 h-auto flex-wrap justify-start border-b rounded-none mb-4 gap-2 py-2">
                                {schedulesForDate.map((s, i) => (
                                    <div key={s.id} className="relative group">
                                        <TabsTrigger value={s.id} className="data-[state=active]:bg-background">
                                            {s.name || `Schedule ${i + 1}`}
                                        </TabsTrigger>
                                        {can.manage_job_schedule && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-destructive text-white rounded-full hidden group-hover:flex">
                                                        <Trash2 className="h-2 w-2"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will permanently delete "{s.name || `Schedule ${i + 1}`}". This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteSchedule(s.id)} className="bg-destructive text-white">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                ))}
                            </TabsList>
                            {schedulesForDate.map(s => (
                                <TabsContent key={s.id} value={s.id} className="p-0 focus-visible:ring-0">
                                    <JobScheduleTable 
                                        selectedDate={format(selectedDate, 'yyyy-MM-dd')} 
                                        schedule={s}
                                    />
                                </TabsContent>
                            ))}
                        </Tabs>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg m-4">
                            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-semibold">No schedules for this day.</p>
                            <p className="text-sm">Click "Add Schedule" to create one.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}