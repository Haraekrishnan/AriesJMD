'use client';
import { useMemo, useState } from 'react';
import { Info, Activity, History } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import {
  format,
  parseISO,
  isValid,
  differenceInCalendarDays,
  formatDistanceToNow,
} from 'date-fns';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Button } from '@/components/ui/button';
import { isObservationOverdue } from '@/lib/ehs-observations';
const dateLabel = (value?: string | null) =>
  value && isValid(parseISO(value))
    ? format(parseISO(value), 'dd MMM yyyy, HH:mm')
    : 'Not set';
export default function CapaRightSidebar({
  observation,
  activeStage,
}: {
  observation: EhsObservation;
  activeStage: CapaStage;
}) {
  const { users } = useAuth();
  const { projects } = useGeneral();
  const [all, setAll] = useState(false);
  const current = observation.stages[observation.currentStage];
  const assignee = users.find((u) => u.id === current?.assigneeId);
  const activities = useMemo(
    () =>
      Object.values(observation.activities || {}).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [observation.activities],
  );
  const age = isValid(parseISO(observation.createdAt))
    ? Math.max(
        0,
        differenceInCalendarDays(new Date(), parseISO(observation.createdAt)),
      )
    : null;
  const overdue = isObservationOverdue(observation);
  const status =
    observation.status === 'Closed'
      ? 'Case closed'
      : overdue
        ? 'Target date overdue'
        : current?.status === 'Returned'
          ? 'Rework required'
          : current?.status === 'In Progress'
            ? 'Awaiting review'
            : 'Case in progress';
  return (
    <div className="space-y-4 text-left">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4 text-blue-600" />
          Case details
        </h2>
        <dl className="space-y-3">
          {[
            ['Category', observation.category],
            ['Risk level', observation.severity],
            [
              'Operational site',
              projects.find((p) => p.id === observation.projectId)?.name ||
                'Not provided',
            ],
            ['Location', observation.location || 'Not provided'],
            [
              'Reported by',
              users.find((u) => u.id === observation.reporterId)?.name ||
                'Unknown',
            ],
            ['Current assignee', assignee?.name || 'Unassigned'],
            [
              'Phase deadline',
              dateLabel(observation.stages[activeStage]?.targetDate),
            ],
            [
              'Reviewer',
              users.find(
                (u) =>
                  u.id === observation.stages[activeStage]?.reviewAssigneeId,
              )?.name || 'Not assigned',
            ],
            [
              'Review deadline',
              dateLabel(observation.stages[activeStage]?.reviewTargetDate),
            ],
            ['Started on', dateLabel(observation.createdAt)],
            ['Target closure', dateLabel(observation.targetDate)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[110px_1fr] gap-3 text-sm"
            >
              <dt className="text-slate-500">{label}</dt>
              <dd className="break-words text-right font-medium text-slate-800">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Activity className="h-4 w-4 text-blue-600" />
          Case health
        </h2>
        <p className="text-sm font-medium">{status}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {observation.targetDate
            ? 'Based on the recorded workflow and target date.'
            : 'Set a target date to track closure against a deadline.'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Case age</p>
            <p className="mt-1 font-semibold">
              {age === null ? 'Unknown' : age + ' days'}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Rework</p>
            <p className="mt-1 font-semibold">{observation.reworkCount || 0}</p>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 font-semibold">
          <History className="h-4 w-4 text-blue-600" />
          Recent activity
        </h2>
        <ol className="space-y-5">
          {(all ? activities : activities.slice(0, 4)).map((a) => (
            <li key={a.id} className="relative border-l border-blue-100 pl-4">
              <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-blue-500" />
              <p className="text-sm leading-5 text-slate-700">{a.action}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {users.find((u) => u.id === a.userId)?.name || 'User'} ·{' '}
                {isValid(parseISO(a.date))
                  ? formatDistanceToNow(parseISO(a.date), { addSuffix: true })
                  : 'Date unavailable'}
              </p>
            </li>
          ))}
        </ol>
        {!activities.length && (
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        )}
        {activities.length > 4 && (
          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={() => setAll(!all)}
          >
            {all
              ? 'Show recent activity'
              : 'View all activity (' + activities.length + ')'}
          </Button>
        )}
      </section>
    </div>
  );
}
