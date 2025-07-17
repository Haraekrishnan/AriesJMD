
'use client';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import ManpowerSummaryTable from '@/components/manpower/ManpowerSummaryTable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Calendar as CalendarIcon } from 'lucide-react';
import ManpowerLogDialog from '@/components/manpower/ManpowerLogDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ManpowerLogReportDownloads from '@/components/manpower/ManpowerLogReportDownloads';
import Link from 'next/link';
import { Calendar } from '@/components/ui/calendar';

export default function ManpowerPage() {
    const { can } = useAppContext();
    const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
    const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>();
    const [summaryDate, setSummaryDate] = useState<Date | undefined>(new Date());

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manpower Details</h1>
                    <p className="text-muted-foreground">Track daily manpower logs and generate reports.</p>
                </div>
                <div className="flex items-center gap-2">
                    {can.manage_manpower_list && (
                        <Button asChild variant="outline">
                            <Link href="/manpower-list">
                                <Users className="mr-2 h-4 w-4" />
                                Manpower List
                            </Link>
                        </Button>
                    )}
                    {can.log_manpower && (
                        <Button onClick={() => setIsLogDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Log Manpower
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                            <CardTitle>
                                {summaryDate && format(summaryDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                                    ? "Today's Manpower Summary"
                                    : `Manpower Summary for ${summaryDate ? format(summaryDate, 'dd LLL, yyyy') : '...'}`
                                }
                            </CardTitle>
                            <CardDescription>An overview of manpower counts across all projects for the selected date.</CardDescription>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={'outline'}
                                className={cn('w-full sm:w-[240px] justify-start text-left font-normal', !summaryDate && 'text-muted-foreground')}
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
                    </div>
                </CardHeader>
                <CardContent>
                    <ManpowerSummaryTable selectedDate={summaryDate} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Generate Manpower Report</CardTitle>
                    <CardDescription>Select a date range to generate a downloadable Excel report of daily logs.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
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
                      <ManpowerLogReportDownloads dateRange={reportDateRange} />
                </CardContent>
            </Card>

            <ManpowerLogDialog isOpen={isLogDialogOpen} setIsOpen={setIsLogDialogOpen} />
        </div>
    );
}
