
'use client';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import ManpowerSummaryTable from '@/components/manpower/ManpowerSummaryTable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Calendar as CalendarIcon, Plane, Book, History } from 'lucide-react';
import ManpowerLogDialog from '@/components/manpower/ManpowerLogDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, sub } from 'date-fns';
import ManpowerLogReportDownloads from '@/components/manpower/ManpowerLogReportDownloads';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';
import ManpowerSummaryReportDownloads from '@/components/manpower/ManpowerSummaryReportDownloads';
import LogLeaveDialog from '@/components/manpower/LogLeaveDialog';
import LogbookRegisterDialog from '@/components/manpower/LogbookRegisterDialog';
import LogbookRequestDialog from '@/components/manpower/LogbookRequestDialog';
import LogbookRequests from '@/components/manpower/LogbookRequests';
import LogbookHistoryDialog from '@/components/manpower/LogbookHistoryDialog';
import ManpowerSummary from '@/components/manpower/ManpowerSummary';
import { Role } from '@/lib/types';
import LogbookSummary from '@/components/manpower/LogbookSummary';

export default function ManpowerPage() {
    const { user, can } = useAppContext();
    const [isLogbookRegisterOpen, setIsLogbookRegisterOpen] = useState(false);
    const [isLogbookRequestOpen, setIsLogbookRequestOpen] = useState(false);
    const [isLogbookHistoryOpen, setIsLogbookHistoryOpen] = useState(false);
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>();
    const [summaryDate, setSummaryDate] = useState<Date | undefined>(new Date());

    const canManageLogbooks = useMemo(() => {
        if (!user) return false;
        const allowedRoles: Role[] = ['Admin', 'Project Coordinator', 'Store in Charge', 'Assistant Store Incharge', 'Document Controller'];
        return allowedRoles.includes(user.role);
    }, [user]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manpower Details</h1>
                    <p className="text-muted-foreground">Track daily manpower logs and generate reports.</p>
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

            <ManpowerSummary />

            {can.manage_logbook && <LogbookSummary />}

            <LogbookRequests />

            <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex-1">
                        <CardTitle>
                            {summaryDate && format(summaryDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                                ? "Today's Manpower Summary"
                                : `Manpower Summary for ${summaryDate ? format(summaryDate, 'dd LLL, yyyy') : '...'}`
                            }
                        </CardTitle>
                        <CardDescription>A cumulative overview of manpower counts across all projects for the selected date.</CardDescription>
                    </div>
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
                            onSelect={setSummaryDate}
                            initialFocus
                          />
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardContent>
                    <ManpowerSummaryTable selectedDate={summaryDate} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Generate Manpower Report</CardTitle>
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
