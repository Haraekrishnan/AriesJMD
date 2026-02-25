
'use client';
import { useMemo, useState } from 'react';
import { JobProgress } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Loader, Undo2, CheckCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';

const JobCard = ({ job, onViewJob }: { job: JobProgress; onViewJob: (job: JobProgress) => void }) => {
    const { users, projects } = useAppContext();
    
    const returnedStep = job.steps.find(s => s.isReturned);
    const pendingStep = job.steps.find(s => s.status === 'Pending');
    const acknowledgedStep = job.steps.find(s => s.status === 'Acknowledged');
    const currentStep = returnedStep || pendingStep || acknowledgedStep;

    const assignee = currentStep ? users.find(u => u.id === currentStep.assigneeId) : null;
    const project = projects.find(p => p.id === job.projectId);

    return (
        <Card onClick={() => onViewJob(job)} className="cursor-pointer hover:shadow-md">
            <CardContent className="p-3 space-y-2">
                <p className="font-semibold text-sm">{job.title}</p>
                <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">{project?.name || 'N/A'}</p>
                    {assignee && (
                        <div className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={assignee.avatar} />
                                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                    )}
                </div>
                 {currentStep && <Badge variant={returnedStep ? 'destructive' : (acknowledgedStep ? 'default' : 'secondary')}>{currentStep.name}</Badge>}
            </CardContent>
            <CardFooter className="p-3 pt-0 text-xs text-muted-foreground">
                {job.dateFrom && <span>{format(new Date(job.dateFrom), 'dd MMM')}</span>}
                {job.jmsNo && <span>JMS: {job.jmsNo}</span>}
            </CardFooter>
        </Card>
    )
}

const BoardColumn = ({ title, icon: Icon, jobs, onViewJob }: { title: string; icon: React.ElementType; jobs: JobProgress[]; onViewJob: (job: JobProgress) => void; }) => {
    return (
        <div className="flex flex-col bg-muted/50 rounded-lg">
            <h3 className="p-4 font-semibold flex items-center gap-2 text-base border-b">
                <Icon className="h-5 w-5" />
                <span>{title}</span>
                <Badge variant="secondary">{jobs.length}</Badge>
            </h3>
            <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="p-4 space-y-4">
                    {jobs.length > 0 ? (
                        jobs.map(job => (
                            <JobCard key={job.id} job={job} onViewJob={onViewJob} />
                        ))
                    ) : (
                        <div className="text-center text-sm text-muted-foreground pt-10">
                            No jobs in this stage.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}


export default function JobProgressBoard({ jobs, onViewJob }: { jobs: JobProgress[]; onViewJob: (job: JobProgress) => void }) {
  
  const { pending, acknowledged, returned, completed } = useMemo(() => {
    const pending: JobProgress[] = [];
    const acknowledged: JobProgress[] = [];
    const returned: JobProgress[] = [];
    const completed: JobProgress[] = [];

    jobs.forEach(job => {
        if(job.status === 'Completed') {
            completed.push(job);
            return;
        }

        const isReturned = job.steps.some(s => s.isReturned);
        if (isReturned) {
            returned.push(job);
            return;
        }

        const hasAcknowledged = job.steps.some(s => s.status === 'Acknowledged');
        if (hasAcknowledged) {
            acknowledged.push(job);
            return;
        }
        
        const hasPending = job.steps.some(s => s.status === 'Pending');
        if (hasPending) {
            pending.push(job);
            return;
        }
    });

    return { pending, acknowledged, returned, completed };

  }, [jobs]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
        <BoardColumn title="Pending Acknowledgment" icon={Clock} jobs={pending} onViewJob={onViewJob} />
        <BoardColumn title="In Progress" icon={Loader} jobs={acknowledged} onViewJob={onViewJob} />
        <BoardColumn title="Returned" icon={Undo2} jobs={returned} onViewJob={onViewJob} />
        <BoardColumn title="Completed" icon={CheckCircle} jobs={completed} onViewJob={onViewJob} />
    </div>
  );
}

