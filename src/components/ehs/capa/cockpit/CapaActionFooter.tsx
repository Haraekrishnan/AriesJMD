'use client';
import { validateStageData } from '@/lib/capa-workflow';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Save, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useFormContext } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import CapaHandoffFields from '../CapaHandoffFields';
import { validateHandoff, type CapaHandoff } from '@/lib/capa-handoff';
export default function CapaActionFooter({
  observation,
  stage,
  onNext,
}: {
  observation: EhsObservation;
  stage: CapaStage;
  onNext?: () => void;
}) {
  const { user, users } = useAuth();
  const { actionStage } = useEhs();
  const { getValues } = useFormContext();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [handoff, setHandoff] = useState<CapaHandoff>({
    assigneeId: '',
    targetDate: '',
  });
  const record = observation.stages[stage];
  const complete = record?.status === 'Completed';
  const submitted = record?.status === 'In Progress';
  const returned = record?.status === 'Returned';
  const canAct =
    !!user?.id &&
    user.id === record?.assigneeId &&
    !complete &&
    !submitted &&
    stage === observation.currentStage &&
    observation.status !== 'Closed';
  const closing = stage === 'Closure';
  const Icon = complete ? CheckCircle2 : returned ? RotateCcw : Clock;
  const title = complete
    ? 'Verified stage'
    : submitted
      ? 'Awaiting review'
      : returned
        ? 'Rework required'
        : 'Stage in progress';
  async function save(submit: boolean) {
    if (!canAct || saving) return;
    setError('');
    try {
      if (submit) validateStageData(stage, getValues());
      const target =
        submit && !closing ? validateHandoff(handoff, users, true) : undefined;
      setSaving(true);
      await actionStage(observation.id, stage, getValues(), submit, target);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={
              complete
                ? 'rounded-full bg-emerald-50 p-2 text-emerald-600'
                : 'rounded-full bg-blue-50 p-2 text-blue-600'
            }
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {complete
                ? stage + ' has been completed.'
                : submitted
                  ? 'Assigned for supervisor verification.'
                  : canAct
                    ? 'Save your progress or complete this phase.'
                    : 'Only the assigned owner can submit this stage.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canAct && (
            <>
              <Button
                disabled={saving}
                variant="outline"
                className="gap-2"
                onClick={() => save(false)}
              >
                <Save className="h-4 w-4" />
                Save draft
              </Button>
              <Button
                disabled={saving}
                className="gap-2"
                onClick={() => {
                  try { validateStageData(stage, getValues()); } catch (err) { setError((err as Error).message); return; }
                  setHandoff({ assigneeId: '', targetDate: '' });
                  setError('');
                  setOpen(true);
                }}
              >
                {closing ? 'Complete & close case' : 'Submit for review'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {!canAct && onNext && (
            <Button className="gap-2" onClick={onNext}>
              Next stage
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {error && !open && (
        <p role="alert" className="mt-2 max-h-28 overflow-y-auto rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {closing
                ? 'Confirm final closure'
                : 'Submit ' + stage + ' for review'}
            </DialogTitle>
            <DialogDescription>
              {closing
                ? 'This completes the case. There is no next phase or deadline to assign.'
                : 'Choose who will review your findings. The review deadline is automatically 24 hours after submission.'}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save(true);
            }}
          >
            {!closing && (
              <fieldset disabled={saving}>
                <CapaHandoffFields
                  review
                  title="Next step: supervisor review"
                  value={handoff}
                  onChange={setHandoff}
                />
              </fieldset>
            )}
            {error && (
              <p role="alert" className="text-sm text-rose-600">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? 'Saving…'
                  : closing
                    ? 'Confirm & close case'
                    : 'Assign reviewer & submit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
