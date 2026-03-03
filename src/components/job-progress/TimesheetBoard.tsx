
'use client';
import { useMemo } from 'react';
import { Timesheet, TimesheetStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, UserCheck, Send, Building, XCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';

const TimesheetCard = ({ timesheet, onViewTimesheet }: { timesheet: Timesheet, onViewTimesheet: (ts: Timesheet) => void }) => {
    const { users, projects } = useAppContext();
    const submitter = users.find(u => u.id === timesheet.submitterId);
    const recipient = users.find(u => u.id === timesheet.submittedToId);
    const project = projects.find(p => p.id === timesheet.projectId);
    const locationText = [project?.name, timesheet.plantUnit].filter(Boolean).join(' / ');

    return (
        <Card onClick={() => onViewTimesheet(timesheet)} className="cursor-pointer hover:shadow-md">
            <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm pr-2">{locationText || 'N/A'}</p>
                    <Badge variant="outline">Qty: {timesheet.numberOfTimesheets}</Badge>
                </div>
                <div className="flex justify-between items-center pt-1">
                    <p className="text-xs text-muted-foreground">
                        {format(parseISO(timesheet.startDate), 'dd MMM')} - {format(parseISO(timesheet.endDate), 'dd MMM, yyyy')}
                    </p>
                    {submitter && (
                        <div className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={submitter.avatar} />
                                <AvatarFallback>{submitter.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const statusColumns: { title: string, status: TimesheetStatus, icon: React.ElementType }[] = [
    { title: 'Pending', status: 'Pending', icon: Clock },
    { title: 'Acknowledged', status: 'Acknowledged', icon: UserCheck },
    { title: 'Sent To Office', status: 'Sent To Office', icon: Send },
    { title: 'Office Acknowledged', status: 'Office Acknowledged', icon: Building },
    { title: 'Rejected', status: 'Rejected', icon: XCircle },
];

const BoardColumn = ({ title, icon: Icon, timesheets, onViewTimesheet }: { title: string, icon: React.ElementType, timesheets: Timesheet[], onViewTimesheet: (ts: Timesheet) => void }) => {
    return (
        <div className="flex flex-col bg-muted/50 rounded-lg">
            <h3 className="p-4 font-semibold flex items-center gap-2 text-base border-b">
                <Icon className="h-5 w-5" />
                <span>{title}</span>
                <Badge variant="secondary">{timesheets.length}</Badge>
            </h3>
            <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="p-4 space-y-4">
                    {timesheets.length > 0 ? (
                        timesheets.map(ts => (
                            <TimesheetCard key={ts.id} timesheet={ts} onViewTimesheet={onViewTimesheet} />
                        ))
                    ) : (
                        <div className="text-center text-sm text-muted-foreground pt-10">
                            No timesheets here.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

export default function TimesheetBoard({ timesheets, onViewTimesheet }: { timesheets: Timesheet[], onViewTimesheet: (ts: Timesheet) => void }) {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 h-full">
       {statusColumns.map(({ title, status, icon }) => (
         <BoardColumn
            key={status}
            title={title}
            icon={icon}
            timesheets={timesheets.filter(ts => ts.status === status)}
            onViewTimesheet={onViewTimesheet}
         />
       ))}
    </div>
  );
}
