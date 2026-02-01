'use client';
import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { JobProgress, JobStep, JobStepStatus } from '@/lib/types';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { CheckCircle, Clock, Circle, Send } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

const statusConfig: { [key in JobStepStatus]: { icon: React.ElementType, color: string, label: string } } = {
  'Pending': { icon: Clock, color: 'text-gray-500', label: 'Pending' },
  'Acknowledged': { icon: CheckCircle, color: 'text-blue-500', label: 'Acknowledged' },
  'Completed': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'Skipped': { icon: Circle, color: 'text-gray-400', label: 'Skipped' },
};

export default function JobProgressCard({ job }: { job: JobProgress }) {
  const { user, users, updateJobStepStatus, addJobStepComment } = useAppContext();
  const [comments, setComments] = useState<Record<string, string>>({});

  const creator = users.find(u => u.id === job.creatorId);

  const handleStatusUpdate = (stepId: string, status: JobStepStatus) => {
    updateJobStepStatus(job.id, stepId, status);
  };
  
  const handleAddComment = (stepId: string) => {
    const commentText = comments[stepId];
    if (!commentText || !commentText.trim()) return;
    addJobStepComment(job.id, stepId, commentText);
    setComments(prev => ({...prev, [stepId]: ''}));
  };

  return (
    <AccordionItem value={job.id} className="border rounded-lg">
      <AccordionTrigger className="p-4 hover:no-underline">
        <div className="flex justify-between w-full items-center">
            <div className="text-left">
                <p className="font-bold text-lg">{job.title}</p>
                <p className="text-sm text-muted-foreground">Created by {creator?.name} on {format(parseISO(job.createdAt), 'dd MMM yyyy')}</p>
            </div>
            <Badge variant="secondary" className="mr-4">{job.status}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 pt-0">
        <div className="space-y-4">
          {job.steps.map((step, index) => {
            const assignee = users.find(u => u.id === step.assigneeId);
            const canAct = user?.id === step.assigneeId;
            const Icon = statusConfig[step.status].icon;

            return (
              <div key={step.id} className="p-3 border rounded-md bg-muted/50">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-semibold">{index + 1}. {step.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Assigned to:</span>
                            <Avatar className="h-5 w-5"><AvatarImage src={assignee?.avatar} /><AvatarFallback>{assignee?.name.charAt(0)}</AvatarFallback></Avatar>
                            <span>{assignee?.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Icon className={`h-4 w-4 ${statusConfig[step.status].color}`} />
                        <span className={statusConfig[step.status].color}>{statusConfig[step.status].label}</span>
                    </div>
                </div>

                {step.acknowledgedAt && <p className="text-xs text-muted-foreground mt-1">Acknowledged: {formatDistanceToNow(parseISO(step.acknowledgedAt), { addSuffix: true })}</p>}
                {step.completedAt && <p className="text-xs text-muted-foreground mt-1">Completed: {formatDistanceToNow(parseISO(step.completedAt), { addSuffix: true })} by {users.find(u => u.id === step.completedBy)?.name}</p>}

                {canAct && (
                    <div className="mt-3 space-y-2">
                        {step.status === 'Pending' && (
                            <Button size="sm" onClick={() => handleStatusUpdate(step.id, 'Acknowledged')}>Acknowledge</Button>
                        )}
                         {step.status === 'Acknowledged' && (
                            <div className="space-y-2">
                                <Label className="text-xs">Add a completion comment (Optional)</Label>
                                <div className="relative">
                                    <Textarea 
                                        value={comments[step.id] || ''}
                                        onChange={e => setComments(prev => ({...prev, [step.id]: e.target.value}))}
                                        placeholder="Add notes about your work..." 
                                        className="pr-10"
                                        rows={2}
                                    />
                                    <Button size="icon" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => handleStatusUpdate(step.id, 'Completed')}><Send className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}