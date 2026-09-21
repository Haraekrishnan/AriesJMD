'use client';

import RecordToolbar, { RecordMetrics } from '@/components/ehs/RecordToolbar';
import { downloadRecords, displayDate } from '@/lib/ehs-records';
import React, { useState, useMemo, useEffect } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  ClipboardList,
  Clock,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const auditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['Safety', 'Environmental', 'Health', 'Fire']),
  projectId: z.string().min(1, 'Project location is required'),
  date: z.string().min(1, 'Date is required'),
  score: z.coerce.number().min(0).max(100),
});

type AuditFormValues = z.infer<typeof auditSchema>;

export default function EhsAuditsPage() {
  const { audits, addAudit, reviewAudit } = useEhs();
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [recordFilter, setRecordFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('new') === '1') {
      setIsDialogOpen(true);
      url.searchParams.delete('new');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);

  const [reportId, setReportId] = useState<string | null>(null);
  const report = audits.find((a) => a.id === reportId);
  const [reviewingAuditId, setReviewingAuditId] = useState<string | null>(null);
  const [supervisorComment, setSupervisorComment] = useState('');

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditSchema),
    defaultValues: {
      type: 'Safety',
      score: 100,
      date: format(new Date(), 'yyyy-MM-dd'),
      projectId: '',
    },
  });

  const isSupervisor =
    user?.role === 'Senior Safety Supervisor' || user?.role === 'Admin';

  const filteredAudits = useMemo(() => {
    return audits
      .filter((a) => {
        if (siteFilter !== 'all' && a.projectId !== siteFilter) return false;
        if (recordFilter !== 'all' && a.status !== recordFilter) return false;
        const projectName =
          projects.find((p) => p.id === a.projectId)?.name || '';
        return (
          a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          projectName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [audits, searchTerm, projects, siteFilter, recordFilter]);

  const onSubmit = async (data: AuditFormValues) => {
    if (!user) return;

    try {
      await addAudit({
        ...data,
        inspectorId: user.id,
        findings: [],
        status: 'Pending Review',
      });

      toast({
        title: 'Audit Submitted',
        description: 'Sent to Higher Official for review.',
      });
      setIsDialogOpen(false);
      form.reset();
    } catch {
      toast({
        title: 'Could not save record',
        description: 'Please try again. Your entries have been kept.',
        variant: 'destructive',
      });
    }
  };

  const handleReviewAction = (status: 'Approved' | 'Rejected') => {
    if (!reviewingAuditId) return;
    if (!supervisorComment.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please provide feedback for the review.',
        variant: 'destructive',
      });
      return;
    }
    reviewAudit(reviewingAuditId, status, supervisorComment);
    setReviewingAuditId(null);
    setSupervisorComment('');
  };

  return (
    <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-900">
      <div className="flex flex-wrap justify-between items-center gap-4 text-left">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Audits & Inspections
          </h1>
          <p className="text-slate-600 text-lg font-medium">
            Manage site walkthroughs and higher official reviews.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold normal-case tracking-normal h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/10">
              <Plus className="mr-2 h-4 w-4" /> New Audit Submission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white border-slate-200 text-slate-900 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-semibold normal-case">
                Register Site Audit
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Submit an inspection outcome for higher official verification.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold text-sm normal-case tracking-normal">
                  Audit Title
                </Label>
                <Input
                  {...form.register('title')}
                  className="h-12 rounded-xl font-bold"
                  placeholder="e.g., Weekly Site Walkthrough"
                />
                {form.formState.errors.title && (
                  <p className="text-xs text-rose-600">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold text-sm normal-case tracking-normal">
                    Audit Type
                  </Label>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-12 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Safety">Safety</SelectItem>
                          <SelectItem value="Environmental">
                            Environmental
                          </SelectItem>
                          <SelectItem value="Health">Health</SelectItem>
                          <SelectItem value="Fire">Fire</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold text-sm normal-case tracking-normal">
                    Site Location
                  </Label>
                  <Controller
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-12 rounded-xl font-bold">
                          <SelectValue placeholder="Select site..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold text-sm normal-case tracking-normal">
                    Date
                  </Label>
                  <Input
                    type="date"
                    {...form.register('date')}
                    className="h-12 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold text-sm normal-case tracking-normal">
                    Score (%)
                  </Label>
                  <Input
                    type="number"
                    {...form.register('score')}
                    className="h-12 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div role="alert" className="text-sm text-rose-600">
                {Object.values(form.formState.errors).map((error, index) => (
                  <p key={index}>{error?.message}</p>
                ))}
              </div>
              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-12 rounded-xl font-bold px-8"
                >
                  Cancel
                </Button>
                <Button
                  disabled={form.formState.isSubmitting}
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-semibold normal-case tracking-normal px-8"
                >
                  Submit for Review
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <RecordMetrics
        items={[
          { label: 'Audits recorded', value: audits.length },
          {
            label: 'Awaiting review',
            value: audits.filter((a) => a.status === 'Pending Review').length,
          },
          {
            label: 'Approved',
            value: audits.filter((a) => a.status === 'Approved').length,
          },
          {
            label: 'Rejected',
            value: audits.filter((a) => a.status === 'Rejected').length,
          },
        ]}
      />
      <RecordToolbar
        search={searchTerm}
        onSearch={setSearchTerm}
        count={filteredAudits.length}
        onReset={() => {
          setSearchTerm('');
          setSiteFilter('all');
          setRecordFilter('all');
        }}
        filters={[
          {
            label: 'Site',
            value: siteFilter,
            onChange: setSiteFilter,
            options: [
              { value: 'all', label: 'All sites' },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ],
          },
          {
            label: 'Status',
            value: recordFilter,
            onChange: setRecordFilter,
            options: [
              { value: 'all', label: 'All statuses' },
              ...['Pending Review', 'Approved', 'Rejected'].map((value) => ({
                value,
                label: value,
              })),
            ],
          },
        ]}
        onExport={() =>
          downloadRecords('ehs-audits', [
            ['Title', 'Site', 'Type', 'Date', 'Status', 'Score'],
            ...filteredAudits.map((r) => [
              r.title,
              projects.find((p) => p.id === r.projectId)?.name || r.projectId,
              r.type,
              r.date,
              r.status,
              r.score,
            ]),
          ])
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-left">
        {filteredAudits.map((audit) => {
          const site = projects.find((p) => p.id === audit.projectId);
          const reviewer = users.find((u) => u.id === audit.reviewedById);

          return (
            <Card
              key={audit.id}
              className="bg-white border-slate-200 hover:border-emerald-600/30 transition-all duration-300 group shadow-sm hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-emerald-600/20 text-emerald-600 mb-2 font-semibold normal-case text-sm tracking-normal bg-emerald-50',
                        audit.status === 'Rejected' &&
                          'text-rose-600 border-rose-600/20 bg-rose-50',
                      )}
                    >
                      {audit.type} &middot; {audit.status}
                    </Badge>
                    <CardTitle className="text-slate-900 text-lg font-bold group-hover:text-emerald-600 transition-colors normal-case tracking-tight">
                      {audit.title}
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-emerald-600">
                      {audit.score}%
                    </div>
                    <p className="text-sm normal-case font-semibold text-slate-400 tracking-normal">
                      Site Score
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    {displayDate(audit.date, 'dd MMM yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {site?.name || 'Unknown Site'}
                  </div>
                </div>

                {audit.supervisorComment && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-sm normal-case font-semibold text-emerald-600 mb-1 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> Official Feedback
                    </p>
                    <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
                      "{audit.supervisorComment}"
                    </p>
                    {reviewer && (
                      <p className="text-sm text-slate-400 font-bold mt-2 normal-case tracking-wide">
                        Reviewed by {reviewer.name}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 normal-case tracking-normal">
                    <Clock className="h-3 w-3 text-emerald-600" />
                    {audit.status}
                  </div>
                  <div className="flex gap-2">
                    {isSupervisor && audit.status === 'Pending Review' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 h-8 font-semibold normal-case text-sm px-4 rounded-lg"
                        onClick={() => setReviewingAuditId(audit.id)}
                      >
                        Action
                      </Button>
                    )}
                    <Button
                      onClick={() => setReportId(audit.id)}
                      variant="ghost"
                      size="sm"
                      className="text-emerald-600 h-8 hover:bg-emerald-50 hover:text-emerald-700 text-sm font-semibold normal-case tracking-normal rounded-lg"
                    >
                      View Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* REVIEW DIALOG */}
      <Dialog
        open={!!reviewingAuditId}
        onOpenChange={(o) => !o && setReviewingAuditId(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 normal-case font-semibold tracking-tight">
              Review Site Audit
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Validation of site EHS findings by the Senior Safety Supervisor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold normal-case text-xs tracking-normal">
                Supervisor Feedback / Instructions
              </Label>
              <Textarea
                className="bg-slate-50 border-slate-200 text-slate-900 min-h-[120px] rounded-xl font-bold p-4 focus-visible:ring-emerald-600/20"
                placeholder="Enter validation notes or required actions..."
                value={supervisorComment}
                onChange={(e) => setSupervisorComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-12 px-6 rounded-xl font-bold"
              onClick={() => handleReviewAction('Rejected')}
            >
              <ThumbsDown className="mr-2 h-4 w-4" /> Reject Findings
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 font-semibold normal-case text-sm h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/10"
              onClick={() => handleReviewAction('Approved')}
            >
              <ThumbsUp className="mr-2 h-4 w-4" /> Approve Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!report}
        onOpenChange={(open) => !open && setReportId(null)}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{report?.title || 'Audit report'}</DialogTitle>
            <DialogDescription>
              Recorded inspection outcome and supervisor feedback.
            </DialogDescription>
          </DialogHeader>
          {report && (
            <dl className="space-y-4 text-sm">
              {[
                [
                  'Site',
                  projects.find((p) => p.id === report.projectId)?.name ||
                    'Not recorded',
                ],
                ['Date', displayDate(report.date)],
                ['Type', report.type],
                ['Status', report.status],
                [
                  'Inspector',
                  users.find((u) => u.id === report.inspectorId)?.name ||
                    'Not recorded',
                ],
                ['Score', report.score + '%'],
                [
                  'Supervisor feedback',
                  report.supervisorComment || 'Not recorded',
                ],
                ['Reviewed', displayDate(report.reviewDate)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-medium text-slate-500">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
      {filteredAudits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-xl">
          <ClipboardList className="h-16 w-16 mb-6 opacity-20 text-emerald-600" />
          <p className="text-xl font-semibold text-slate-900 normal-case tracking-normal">
            No audit records found
          </p>
          <p className="text-sm mt-1 font-medium opacity-80">
            Refine your search or submit a new walkthrough report.
          </p>
        </div>
      )}
    </div>
  );
}
