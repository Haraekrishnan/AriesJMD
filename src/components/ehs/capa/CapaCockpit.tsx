'use client';
import CapaStatusBanner from './cockpit/CapaStatusBanner';
import { validateStageData, workflowStatus } from '@/lib/capa-workflow';
import CapaHandoffFields from './CapaHandoffFields';
import { validateHandoff, type CapaHandoff } from '@/lib/capa-handoff';
import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  Undo2,
  PanelRight,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { useForm, FormProvider } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { CAPA_STAGES } from '@/lib/ehs-observations';
import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaRightSidebar from './cockpit/CapaRightSidebar';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';
import CapaActionFooter from './cockpit/CapaActionFooter';

export default function CapaCockpit({
  observation,
  onClose,
}: {
  observation: EhsObservation;
  onClose: () => void;
}) {
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { reviewStage } = useEhs();
  const [viewingStage, setViewingStage] = useState<CapaStage>(
    observation.currentStage || 'Initiation',
  );
  const [reviewAction, setReviewAction] = useState<
    'Completed' | 'Returned' | null
  >(null);
  const [reviewComment, setReviewComment] = useState('');
  const [handoff, setHandoff] = useState<CapaHandoff>({
    assigneeId: '',
    targetDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const beginReview = (action: 'Completed' | 'Returned') => {
    setHandoff({ assigneeId: action === 'Returned' ? observation.stages[viewingStage]?.assigneeId || '' : '', targetDate: '' });
    setReviewComment('');
    setError('');
    setReviewAction(action);
  };
  const [detailsOpen, setDetailsOpen] = useState(false);
  const sData = observation.stages[viewingStage];
  const isSupervisor =
    user?.role === 'Admin' ||
    user?.role === 'Senior Safety Supervisor' ||
    user?.role === 'Project Coordinator';
  const canReview =
    observation.currentStage === viewingStage &&
    sData?.status === 'In Progress' &&
    isSupervisor;
  const methods = useForm({ defaultValues: sData?.data || {} });
  useEffect(() => {
    methods.reset(sData?.data || {});
  }, [viewingStage, sData, methods]);
  const completed = CAPA_STAGES.filter(
    (s) => observation.stages[s]?.status === 'Completed',
  ).length;
  const progress = Math.round((completed / CAPA_STAGES.length) * 100);
  const project = projects.find((p) => p.id === observation.projectId);
  const reporter = users.find((u) => u.id === observation.reporterId);
  const changeStage = (next: CapaStage) => {
    setViewingStage(next);
  };
  const nextStage = CAPA_STAGES[CAPA_STAGES.indexOf(viewingStage) + 1];
  return (
    <FormProvider {...methods}>
      <div className="ehs-portal absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#F5F7FB] text-slate-900">
        <header className="shrink-0 border-b bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 md:px-7">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="gap-1 px-2 text-blue-600"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Observations</span>
              </Button>
              <span className="hidden h-6 w-px bg-slate-200 sm:block" />
              <h1 className="text-xl font-semibold tracking-tight">
                CAPA-{observation.id.slice(-6).toUpperCase()}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium',
                  observation.severity === 'Low'
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : observation.severity === 'Medium'
                      ? 'border-amber-100 bg-amber-50 text-amber-700'
                      : 'border-rose-100 bg-rose-50 text-rose-700',
                )}
              >
                {observation.severity} risk
              </Badge>
              <Badge className="rounded-md border-blue-100 bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                {workflowStatus(observation)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {canReview && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => beginReview('Returned')}
                    className="gap-2 text-rose-600"
                  >
                    <Undo2 className="h-4 w-4" />
                    Request rework
                  </Button>
                  <Button
                    onClick={() => beginReview('Completed')}
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Verify & continue
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                aria-label="Show case details"
                className="gap-2 xl:hidden"
                onClick={() => setDetailsOpen(true)}
              >
                <PanelRight className="h-4 w-4" />
                Details
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-xs text-slate-500 md:px-8 md:text-sm">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {project?.name || 'Site not provided'}
            </span>
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Reported by {reporter?.name || 'Unknown'}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {isValid(parseISO(observation.createdAt))
                ? format(parseISO(observation.createdAt), 'dd MMM yyyy')
                : 'Date unavailable'}
            </span>
          </div>
          <div className="flex items-center overflow-x-auto border-t bg-slate-50/60 px-4 md:px-7">
            <div className="mr-5 hidden w-[150px] shrink-0 md:block">
              <p className="mb-2 text-xs text-slate-500">
                {completed} of 7 complete{' '}
                <strong className="ml-2 text-blue-600">{progress}%</strong>
              </p>
              <div
                role="progressbar"
                aria-label="Case completion"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: progress + '%' }}
                />
              </div>
            </div>
            <CapaLifecycleStepper
              observation={observation}
              viewingStage={viewingStage}
              onStageSelect={changeStage}
            />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <CapaStatusBanner observation={observation} stage={viewingStage} canReview={canReview} onReview={beginReview} />
              <CapaStageWorkspace
                key={viewingStage}
                observation={observation}
                stage={viewingStage}
              />
            </div>
            <footer className="shrink-0 border-t bg-white px-4 py-4 md:px-6">
              {canReview && <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3"><p className="text-sm font-semibold">Review decision required</p><div className="flex flex-wrap gap-2"><Button variant="outline" className="border-rose-300 text-rose-700" onClick={()=>beginReview('Returned')}>Request rework</Button><Button className="bg-emerald-700 text-white" onClick={()=>beginReview('Completed')}>Verify & approve stage</Button></div></div>}
              <CapaActionFooter
                observation={observation}
                stage={viewingStage}
                onNext={
                  nextStage &&
                  (CAPA_STAGES.indexOf(nextStage) <=
                    CAPA_STAGES.indexOf(observation.currentStage) ||
                    observation.stages[nextStage]?.status === 'Completed')
                    ? () => changeStage(nextStage)
                    : undefined
                }
              />
            </footer>
          </main>
          <aside className="hidden w-[330px] shrink-0 overflow-y-auto pb-6 pr-6 pt-6 xl:block">
            <CapaRightSidebar
              observation={observation}
              activeStage={viewingStage}
            />
          </aside>
        </div>
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="overflow-y-auto bg-slate-50">
            <SheetTitle className="mb-1">Case overview</SheetTitle>
            <SheetDescription className="mb-5">
              Details and recorded activity for this case.
            </SheetDescription>
            <CapaRightSidebar
              observation={observation}
              activeStage={viewingStage}
            />
          </SheetContent>
        </Sheet>
        <Dialog
          open={!!reviewAction}
          onOpenChange={(open) => !open && !saving && setReviewAction(null)}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {reviewAction === 'Completed'
                  ? 'Approve ' + viewingStage
                  : 'Return for rework'}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === 'Returned'
                  ? 'Assign the rework and set its deadline.'
                  : nextStage
                    ? 'Confirm the owner and deadline for ' + nextStage + '.'
                    : 'This is the final phase. No further assignment is needed.'}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reviewAction || !canReview || saving) return;
                setError('');
                try {
                  if (reviewAction === 'Completed') validateStageData(viewingStage, sData?.data);
                  const target =
                    reviewAction === 'Returned' || nextStage
                      ? validateHandoff(handoff, users)
                      : undefined;
                  setSaving(true);
                  await reviewStage(
                    observation.id,
                    viewingStage,
                    reviewAction,
                    reviewComment,
                    target,
                  );
                  setReviewAction(null);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'Could not save. Please try again.',
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              <fieldset disabled={saving} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="review-comment">
                    Review notes{reviewAction === 'Returned' ? ' *' : ''}
                  </Label>
                  <Textarea
                    id="review-comment"
                    required={reviewAction === 'Returned'}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Explain your decision…"
                  />
                </div>
                {(reviewAction === 'Returned' || nextStage) && (
                  <CapaHandoffFields
                    title={
                      reviewAction === 'Returned'
                        ? viewingStage + ' rework'
                        : 'Next phase: ' + nextStage
                    }
                    value={handoff}
                    onChange={setHandoff}
                  />
                )}
              </fieldset>
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
                  onClick={() => setReviewAction(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? 'Saving…'
                    : reviewAction === 'Returned'
                      ? 'Assign rework'
                      : nextStage
                        ? 'Approve & assign next phase'
                        : 'Approve & close case'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </FormProvider>
  );
}
