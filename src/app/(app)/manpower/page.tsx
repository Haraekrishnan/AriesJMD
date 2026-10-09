'use client';
import { useState, useMemo } from 'react';
import styles from '@/components/manpower/manpower-page.module.css';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import ManpowerSummaryTable from '@/components/manpower/ManpowerSummaryTable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Calendar as CalendarIcon, Plane, Book, History } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, sub, addDays } from 'date-fns';
import ManpowerLogReportDownloads from '@/components/manpower/ManpowerLogReportDownloads';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import ManpowerSummaryReportDownloads from '@/components/manpower/ManpowerSummaryReportDownloads';
import LogbookRegisterDialog from '@/components/manpower/LogbookRegisterDialog';
import LogbookHistoryDialog from '@/components/manpower/LogbookHistoryDialog';
import ManpowerSummary from '@/components/manpower/ManpowerSummary';
import { Role } from '@/lib/types';

export default function ManpowerPage() {
    const { user, can } = useAuth();
    const [isLogbookRegisterOpen, setIsLogbookRegisterOpen] = useState(false);
    const [isLogbookHistoryOpen, setIsLogbookHistoryOpen] = useState(false);
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>();
    const [dirty, setDirty] = useState(false);
    const [summaryDate, setSummaryDate] = useState<Date | undefined>(new Date());

    const selectDate = (date: Date | undefined) => {
      if (dirty && !window.confirm('Discard unsaved manpower changes and change the date?')) return;
      setDirty(false); setSummaryDate(date);
    };

    const canManageLogbooks = useMemo(() => {
        if (!user) return false;
        const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Store in Charge', 'Assistant Store Incharge', 'Document Controller'];
        return allowedRoles.includes(user.role);
    }, [user]);

    return (
        <div className={styles.page}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Daily Manpower</h1>
                    <p className="text-muted-foreground">Enter daily movements and leave by project.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/manpower-list">
                            <Users className="mr-2 h-4 w-4" />
                            Manpower List
                        </Link>
                    </Button>
                    {canManageLogbooks && (
                        <>
                            <Button variant="outline" onClick={() => setIsLogbookHistoryOpen(true)}><History className="mr-2 h-4 w-4"/> Logbook History</Button>
                            <Button variant="outline" onClick={() => setIsLogbookRegisterOpen(true)}><Book className="mr-2 h-4 w-4" /> Logbook Register</Button>
                        </>
                    )}
                </div>
            </div>



            <Card className={styles.panel}>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-1">
                        <CardTitle>
                            {summaryDate && format(summaryDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                                ? "Today's Manpower Summary"
                                : `Manpower Summary for ${summaryDate ? format(summaryDate, 'dd LLL, yyyy') : '...'}`
                            }
                        </CardTitle>
                        <CardDescription>Review counts, save the day, and track every correction.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" aria-label="Previous day" onClick={()=>selectDate(addDays(summaryDate || new Date(),-1))}>‹</Button>
                    <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn('w-full sm:w-auto justify-start text-left font-normal', !summaryDate && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {summaryDate ? format(summaryDate, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={summaryDate}
                            onSelect={selectDate}
                            initialFocus
                          />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" aria-label="Next day" onClick={()=>selectDate(addDays(summaryDate || new Date(),1))}>›</Button>
                    <Button variant="outline" onClick={()=>selectDate(new Date())}>Today</Button></div>
                </CardHeader>
                <CardContent>
                    <ManpowerSummaryTable key={summaryDate ? format(summaryDate, 'yyyy-MM-dd') : 'none'} selectedDate={summaryDate} onDirtyChange={setDirty} />
                </CardContent>
            </Card>
            
            <Card className={styles.panel}>
                <CardHeader>
                    <CardTitle>Download manpower reports</CardTitle>
                    <CardDescription>Select a date range to generate downloadable reports.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center flex-wrap">
                     <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full md:w-[300px] justify-start text-left font-normal',
                              !reportDateRange && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {reportDateRange?.from ? (
                              reportDateRange.to ? (
                                <>
                                  {format(reportDateRange.from, 'LLL dd, y')} - {format(reportDateRange.to, 'LLL dd, y')}
                                </>
                              ) : (
                                format(reportDateRange.from, 'LLL dd, y')
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={reportDateRange?.from}
                            selected={reportDateRange}
                            onSelect={setReportDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex gap-2">
                        <ManpowerLogReportDownloads dateRange={reportDateRange} />
                        <ManpowerSummaryReportDownloads dateRange={reportDateRange} />
                      </div>
                </CardContent>
            </Card>

            {canManageLogbooks && (
                <>
                    <LogbookRegisterDialog isOpen={isLogbookRegisterOpen} setIsOpen={setIsLogbookRegisterOpen} />
                    <LogbookHistoryDialog isOpen={isLogbookHistoryOpen} setIsOpen={setIsLogbookHistoryOpen} />
                </>
            )}
        </div>
    );
}
