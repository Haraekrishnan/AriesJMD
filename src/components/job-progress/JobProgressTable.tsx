'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { JOB_PROGRESS_STEPS, type JobProgress } from '@/lib/types';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { Check, Clock, Undo2, AlertCircle, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import styles from './job-progress-table.module.css';

interface JobProgressTableProps {
  jobs: JobProgress[];
  onViewJob: (job: JobProgress) => void;
}

const stageLabels = ['JMS Created', 'Sent to Site', 'Handed Over', 'Submitted', 'Endorsed', 'Sent to Office', 'JMS No. Created', 'Hard Copy Sent Back to Site', 'Hard Copy Submitted'];
const formatDate = (value?: string | null, pattern = 'dd-MM-yy') => {
  if (!value) return '';
  const date = parseISO(value);
  return isValid(date) ? format(date, pattern) : '';
};

export function JobProgressTable({ jobs, onViewJob }: JobProgressTableProps) {
  const { users } = useAuth();
  const { projects } = useGeneral();
  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()), [jobs]);

  if (!jobs.length) return <div className={styles.empty}>No JMS records found for this period.</div>;

  return (
    <div className={styles.root}>
      <div className={styles.hint}>Click a row to view details</div>
      <TooltipProvider>
        <div className={styles.scroll} role="region" aria-label="JMS tracker table" tabIndex={0}>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '3%' }} /><col style={{ width: '13%' }} /><col style={{ width: '8%' }} />
              <col style={{ width: '6%' }} /><col style={{ width: '6%' }} /><col style={{ width: '12%' }} /><col style={{ width: '7%' }} />
              {JOB_PROGRESS_STEPS.map(name => <col key={name} style={{ width: '5%' }} />)}
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} scope="col">#</th><th rowSpan={2} scope="col">Job / W.O.</th>
                <th rowSpan={2} scope="col">Plant / Unit</th><th rowSpan={2} scope="col">JMS No.</th>
                <th rowSpan={2} scope="col" className={styles.amount}>Value (INR)</th>
                <th rowSpan={2} scope="col">Current action / Assignee</th><th rowSpan={2} scope="col">Start / End</th>
                <th colSpan={JOB_PROGRESS_STEPS.length} scope="colgroup">Workflow</th>
              </tr>
              <tr>{JOB_PROGRESS_STEPS.map((name, index) => <th key={name} scope="col" title={name} className={styles.stageHeading}>{stageLabels[index]}</th>)}</tr>
            </thead>
            <tbody>
              {sortedJobs.map((job, index) => {
                const project = projects.find(p => p.id === job.projectId);
                // Preserve the existing active-step and reopened-stage selection rules.
                const currentStep = job.status === 'Completed' ? job.steps[job.steps.length - 1] : (job.steps.find(s => s.status !== 'Completed') || job.steps[job.steps.length - 1]);
                const activeAssignee = currentStep ? users.find(u => u.id === currentStep.assigneeId) : null;
                const returned = job.steps.some(s => s.isReturned);
                return (
                  <tr key={job.id} className={styles.jobRow} onClick={() => onViewJob(job)}>
                    <td className={styles.serial}>{index + 1}</td>
                    <td><button type="button" className={styles.jobButton} onClick={e => { e.stopPropagation(); onViewJob(job); }} aria-label={`View JMS: ${job.title}`}>{job.title}</button><span className={styles.secondary}>WO / ARC: {job.workOrderNo || 'N/A'}</span></td>
                    <td>{project?.name || 'N/A'}{job.plantUnit && <span className={styles.secondary}>{job.plantUnit}</span>}</td>
                    <td><span className={styles.jmsNumber}>{job.jmsNo || '—'}</span></td>
                    <td className={styles.amount}>{job.amount != null ? new Intl.NumberFormat('en-IN').format(job.amount) : '—'}</td>
                    <td>
                      <div className={styles.person}>
                        {activeAssignee && <Avatar className="h-7 w-7 shrink-0"><AvatarImage src={activeAssignee.avatar} alt="" /><AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">{activeAssignee.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('')}</AvatarFallback></Avatar>}
                        <div className={styles.personText}><strong>{activeAssignee?.name || 'Unassigned'}</strong><span className={styles.secondary}>{currentStep?.name || 'N/A'}</span></div>
                      </div>
                      {returned ? <span className={styles.returned}><Undo2 size={12} /> Returned</span> : job.status === 'Completed' ? <span className={styles.completedLabel}>Completed</span> : null}
                    </td>
                    <td className={styles.dates}><span>{formatDate(job.dateFrom) || '—'}</span><span className={styles.secondary}>{formatDate(job.dateTo) || '—'}</span></td>
                    {JOB_PROGRESS_STEPS.map((name, stageIndex) => {
                      const matching = job.steps.filter(s => s.name === name);
                      const step = matching.find(s => s.status !== 'Completed') || [...matching].reverse()[0];
                      const completed = step?.status === 'Completed';
                      const unacknowledged = !completed && (step?.status === 'Pending' || step?.isReturned);
                      const pending = !completed && !unacknowledged && step?.status === 'Acknowledged';
                      const skipped = step?.status === 'Skipped';
                      const assignee = step ? users.find(u => u.id === step.assigneeId) : null;
                      const updated = parseISO(job.lastUpdated);
                      const daysElapsed = isValid(updated) ? differenceInDays(new Date(), updated) : null;
                      const overdue = daysElapsed !== null && daysElapsed > 2 && (unacknowledged || pending);
                      const state = completed ? 'complete' : unacknowledged ? 'unacknowledged' : pending ? 'pending' : 'idle';
                      const label = completed ? 'Completed' : step?.isReturned ? 'Returned — awaiting acknowledgment' : unacknowledged ? 'Awaiting acknowledgment' : pending ? 'In progress' : skipped ? 'Skipped' : 'Not started';
                      // Active stages have no assigned-at field; keep lastUpdated explicitly labelled.
                      const recordedDate = completed ? step?.completedAt : (unacknowledged || pending) ? job.lastUpdated : null;
                      return (
                        <td key={name} className={styles.stageCell} data-state={state}>
                          <div className={styles.stageTrack} data-first={stageIndex === 0} data-last={stageIndex === JOB_PROGRESS_STEPS.length - 1}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className={styles.stageButton} onClick={e => { e.stopPropagation(); onViewJob(job); }} aria-label={`${name}: ${label}${recordedDate ? `, ${completed ? 'completed' : 'last updated'} ${formatDate(recordedDate)}` : ''}`}>
                                  <span className={styles.node} data-overdue={!!overdue}>{completed ? <Check size={13} /> : unacknowledged ? <AlertCircle size={18} /> : pending ? <Clock size={18} /> : skipped ? <Minus size={12} /> : null}</span>
                                  <span className={styles.stageDate}>{formatDate(recordedDate) || '\u00a0'}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <p className="font-semibold">{name} · {label}</p>
                                  {overdue && <p className="font-semibold">ACTION OVERDUE</p>}
                                  {completed && step?.completedAt && <p>Completed: {formatDate(step.completedAt, 'dd MMM yyyy, hh:mm a')}</p>}
                                  {(unacknowledged || pending) && <><p>Last updated: {formatDate(job.lastUpdated, 'dd MMM yyyy, hh:mm a') || 'Unknown'}</p>{daysElapsed !== null && <p>{daysElapsed} days since last update</p>}</>}
                                  {assignee && <p>Current: {assignee.name}</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TooltipProvider>
      <div className={styles.footer}>
        <div className={styles.counts}><span>Total jobs: {jobs.length}</span><span>Completed: {jobs.filter(j => j.status === 'Completed').length}</span></div>
        <div className={styles.legend}>
          <span><Check size={14} className={styles.green} /> Completed</span><span><Clock size={14} className={styles.amber} /> In progress</span>
          <span><AlertCircle size={14} className={styles.red} /> Awaiting acknowledgment</span><span><i className={styles.idleDot} /> Not started</span><span><i className={styles.overdueDot} /> Overdue (&gt;2 days)</span>
        </div>
      </div>
    </div>
  );
}
