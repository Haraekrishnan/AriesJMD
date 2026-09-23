'use client';
import type { CapaStage, EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { reworkNote } from '@/lib/capa-workflow';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Undo2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
export default function CapaStatusBanner({
  observation,
  stage,
  canReview,
  onReview,
}: {
  observation: EhsObservation;
  stage: CapaStage;
  canReview: boolean;
  onReview: (action: 'Completed' | 'Returned') => void;
}) {
  const { user, users } = useAuth();
  const record = observation.stages[stage];
  const name = (id?: string) =>
    users.find((u) => u.id === id)?.name || 'Not assigned';
  const date = (value?: string | null) =>
    value && isValid(new Date(value))
      ? format(new Date(value), 'dd MMM yyyy, HH:mm')
      : 'Not set';
  const review = record?.status === 'In Progress',
    rework = record?.status === 'Returned',
    complete = record?.status === 'Completed';
  return (
    <section
      role="status"
      aria-live="polite"
      className={`mb-4 rounded-xl border p-4 ${rework ? 'border-rose-200 bg-rose-50' : review ? 'border-amber-200 bg-amber-50' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">
            {rework
              ? 'Rework required'
              : review
                ? record.reviewAssigneeId === user?.id
                  ? 'Your review is required'
                  : 'Submitted — awaiting review'
                : complete
                  ? 'Stage completed and verified'
                  : record.assigneeId === user?.id
                    ? 'This stage is assigned to you'
                    : 'Stage in progress'}
          </h2>
          <p className="mt-1 text-sm">
            {review
              ? `Submitted by ${name(record.actionedById || record.assigneeId)}. Reviewer: ${name(record.reviewAssigneeId)}. Review due: ${date(record.reviewTargetDate)}.`
              : complete
                ? `Completed by ${name(record.actionedById)} · Verified by ${name(record.reviewedById)}.`
                : `Assigned to ${name(record?.assigneeId)} · Due ${date(record?.targetDate)}.`}
          </p>
          {review && record.assigneeId === user?.id && (
            <p className="mt-1 text-sm">
              Your submission is saved. No further action is needed from you
              unless the reviewer requests rework.
            </p>
          )}
          {rework && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-white p-3">
              <p className="text-xs font-semibold text-rose-800">
                Instructions from {name(record.reviewedById)}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                {reworkNote(record) ||
                  'No legacy rework note was recorded. Contact the reviewer for instructions.'}
              </p>
            </div>
          )}
        </div>
        {canReview && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onReview('Returned')}
              variant="outline"
              className="gap-2 border-rose-300 bg-white text-rose-700"
            >
              <Undo2 className="h-4 w-4" />
              Request rework
            </Button>
            <Button
              onClick={() => onReview('Completed')}
              className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              Verify & approve stage
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
