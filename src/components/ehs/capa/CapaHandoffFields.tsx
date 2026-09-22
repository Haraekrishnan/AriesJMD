'use client';
import { useId } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { REVIEW_ROLES, type CapaHandoff } from '@/lib/capa-handoff';
import { format } from 'date-fns';

export default function CapaHandoffFields({
  value,
  onChange,
  review = false,
  title,
}: {
  value: CapaHandoff;
  onChange: (value: CapaHandoff) => void;
  review?: boolean;
  title: string;
}) {
  const { users } = useAuth();
  const id = useId();
  const candidates = users
    .filter(
      (u) =>
        u.status !== 'deactivated' &&
        (!review || REVIEW_ROLES.includes(u.role)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <fieldset className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <label htmlFor={id + '-owner'} className="block text-sm font-medium">
        {review ? 'Reviewer' : 'Assigned owner'}{' '}
        <span aria-hidden="true">*</span>
      </label>
      <select
        id={id + '-owner'}
        required
        value={value.assigneeId}
        onChange={(e) => onChange({ ...value, assigneeId: e.target.value })}
        className="h-11 w-full rounded-lg border bg-white px-3 text-sm"
      >
        <option value="">Select {review ? 'reviewer' : 'owner'}…</option>
        {candidates.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} · {u.role}
          </option>
        ))}
      </select>
      {review ? <p className="rounded-lg bg-blue-100 p-3 text-sm text-blue-900">Review is due automatically 24 hours after submission.</p> : <>
      <label htmlFor={id + '-date'} className="block text-sm font-medium">
        {review ? 'Review deadline' : 'Completion deadline'}{' '}
        <span aria-hidden="true">*</span>
      </label>
      <input
        id={id + '-date'}
        type="datetime-local"
        required
        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
        value={value.targetDate}
        onChange={(e) => onChange({ ...value, targetDate: e.target.value })}
        className="h-11 w-full min-w-0 rounded-lg border bg-white px-3 text-sm"
      />
      <p className="text-xs text-slate-500">
        Deadline uses your local time. Both fields are required before this
        handoff.
      </p>
      </>}
      {!candidates.length && (
        <p role="alert" className="text-sm text-rose-600">
          No eligible active users are available.
        </p>
      )}
    </fieldset>
  );
}
