'use client';

import RecordToolbar, { RecordMetrics } from '@/components/ehs/RecordToolbar';
import { downloadRecords, displayDate } from '@/lib/ehs-records';
import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Zap,
  ShieldCheck,
  MapPin,
  Calendar,
  ChevronRight,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
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
import { Input } from '@/components/ui/input';
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
import { ScrollArea } from '@/components/ui/scroll-area';

const riskColors: Record<string, string> = {
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Critical: 'bg-rose-100 text-rose-700 border-rose-200',
};

const raSchema = z.object({
  activityName: z.string().min(1, 'Activity name is required'),
  projectId: z.string().min(1, 'Location is required'),
  riskLevel: z.enum(['Low', 'Medium', 'High', 'Critical']),
  hazards: z
    .string()
    .refine(
      (value) => value.split(',').some((part) => part.trim()),
      'At least one hazard is required',
    ),
  controls: z
    .string()
    .refine(
      (value) => value.split(',').some((part) => part.trim()),
      'At least one control measure is required',
    ),
});

type RaFormValues = z.infer<typeof raSchema>;

export default function EhsRiskAssessmentsPage() {
  const { riskAssessments, addRiskAssessment } = useEhs();
  const { user } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [recordFilter, setRecordFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<RaFormValues>({
    resolver: zodResolver(raSchema),
    defaultValues: { riskLevel: 'Medium', projectId: '' },
  });

  const filteredAssessments = useMemo(() => {
    return riskAssessments
      .filter((ra) => {
        if (siteFilter !== 'all' && ra.projectId !== siteFilter) return false;
        if (recordFilter !== 'all' && ra.riskLevel !== recordFilter)
          return false;
        const projectName =
          projects.find((p) => p.id === ra.projectId)?.name || '';
        return (
          ra.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          projectName.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .sort(
        (a, b) =>
          parseISO(b.reviewDate).getTime() - parseISO(a.reviewDate).getTime(),
      );
  }, [riskAssessments, searchTerm, projects, siteFilter, recordFilter]);

  const onSubmit = async (data: RaFormValues) => {
    if (!user) return;

    try {
      await addRiskAssessment({
        ...data,
        hazards: data.hazards
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean),
        controls: data.controls
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        reviewedBy: user.name,
        reviewDate: new Date().toISOString(),
      });

      toast({
        title: 'Risk Assessment Registered',
        description:
          'The risk assessment has been successfully added to the system.',
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

  return (
    <div className="ehs-page text-slate-900">
      <div className="flex flex-wrap justify-between items-center gap-4 text-left">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Risk Assessments
          </h1>
          <p className="text-slate-600 text-lg font-medium">
            Identify hazards and establish control measures for organizational
            safety.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/10 px-8 h-12 normal-case tracking-normal text-xs rounded-xl">
              <PlusCircle className="mr-2 h-4 w-4" /> New Risk Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white border-slate-200 text-slate-900 sm:max-w-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900 normal-case font-semibold tracking-tight">
                Create New Assessment
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Document hazard identification and mitigation strategies for
                site activities.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4 text-left"
            >
              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                  Activity / Task Name
                </Label>
                <Input
                  {...form.register('activityName')}
                  className="h-12 rounded-xl font-bold focus-visible:ring-emerald-600/20"
                  placeholder="e.g., Working at Heights - Site Tower"
                />
                {form.formState.errors.activityName && (
                  <p className="text-xs text-rose-600 font-bold">
                    {form.formState.errors.activityName.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
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
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                    Residual Risk Level
                  </Label>
                  <Controller
                    control={form.control}
                    name="riskLevel"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="h-12 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low Risk</SelectItem>
                          <SelectItem value="Medium">Medium Risk</SelectItem>
                          <SelectItem value="High">High Risk</SelectItem>
                          <SelectItem value="Critical">
                            Critical Risk
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                  Identified Hazards
                </Label>
                <Input
                  {...form.register('hazards')}
                  className="h-12 rounded-xl font-bold"
                  placeholder="Hazard 1, Hazard 2, ..."
                />
                <p className="text-sm text-slate-400 font-semibold normal-case tracking-normal ml-1">
                  Separate multiple items with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                  Control Measures
                </Label>
                <Input
                  {...form.register('controls')}
                  className="h-12 rounded-xl font-bold"
                  placeholder="Control 1, Control 2, ..."
                />
                <p className="text-sm text-slate-400 font-semibold normal-case tracking-normal ml-1">
                  Separate multiple items with commas
                </p>
              </div>

              <div role="alert" className="text-sm text-rose-600">
                {Object.values(form.formState.errors).map((error, index) => (
                  <p key={index}>{error?.message}</p>
                ))}
              </div>
              <DialogFooter className="pt-4 gap-4">
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 normal-case text-xs tracking-normal h-12 rounded-xl shadow-lg shadow-emerald-600/10"
                >
                  Register Assessment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <RecordMetrics
        items={[
          { label: 'Assessments recorded', value: riskAssessments.length },
          {
            label: 'High / critical risk',
            value: riskAssessments.filter((r) =>
              ['High', 'Critical'].includes(r.riskLevel),
            ).length,
          },
          {
            label: 'Medium risk',
            value: riskAssessments.filter((r) => r.riskLevel === 'Medium')
              .length,
          },
          {
            label: 'Low risk',
            value: riskAssessments.filter((r) => r.riskLevel === 'Low').length,
          },
        ]}
      />
      <RecordToolbar
        search={searchTerm}
        onSearch={setSearchTerm}
        count={filteredAssessments.length}
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
            label: 'Risk level',
            value: recordFilter,
            onChange: setRecordFilter,
            options: [
              { value: 'all', label: 'All risk levels' },
              ...['Low', 'Medium', 'High', 'Critical'].map((value) => ({
                value,
                label: value,
              })),
            ],
          },
        ]}
        onExport={() =>
          downloadRecords('ehs-risk-assessments', [
            [
              'Activity',
              'Site',
              'Risk',
              'Hazards',
              'Controls',
              'Reviewed by',
              'Review date',
            ],
            ...filteredAssessments.map((r) => [
              r.activityName,
              projects.find((p) => p.id === r.projectId)?.name || r.projectId,
              r.riskLevel,
              (r.hazards || []).join('; '),
              (r.controls || []).join('; '),
              r.reviewedBy,
              r.reviewDate,
            ]),
          ])
        }
      />

      <div className="grid grid-cols-1 gap-6 text-left">
        {filteredAssessments.map((ra) => {
          const site = projects.find((p) => p.id === ra.projectId);
          return (
            <Card
              key={ra.id}
              className="bg-white border-slate-200 overflow-hidden group shadow-sm hover:shadow-md hover:border-emerald-600/20 transition-all duration-300"
            >
              <div className="flex items-stretch h-full">
                <div
                  className={cn(
                    'w-2',
                    riskColors[ra.riskLevel]?.split(' ')[0] || 'bg-slate-300',
                  )}
                />
                <div className="flex-1 p-8">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight normal-case">
                        {ra.activityName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm font-semibold normal-case tracking-normal text-slate-500">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />{' '}
                          {site?.name || 'Unknown Site'}
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600" />{' '}
                          Reviewed: {displayDate(ra.reviewDate, 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'px-4 py-1.5 font-semibold normal-case text-sm tracking-normal bg-white border-2',
                        riskColors[ra.riskLevel],
                      )}
                    >
                      {ra.riskLevel} risk
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm normal-case font-semibold text-emerald-600 tracking-normal mb-4 border-b border-emerald-600/10 pb-2">
                        Identified Hazards
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(ra.hazards || []).map((h, i) => (
                          <span
                            key={i}
                            className="text-xs bg-slate-50 border border-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold tracking-tight"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm normal-case font-semibold text-blue-600 tracking-normal mb-4 border-b border-blue-600/10 pb-2">
                        Mitigation & Controls
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(ra.controls || []).map((c, i) => (
                          <span
                            key={i}
                            className="text-xs bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-xl font-bold tracking-tight"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-sm text-slate-400 font-semibold normal-case tracking-normal">
                      Reviewed By:{' '}
                      <span className="text-slate-900">{ra.reviewedBy}</span>
                    </p>
                    <span className="text-xs text-slate-500">
                      Recorded assessment
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredAssessments.length === 0 && (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-slate-500 bg-white border border-dashed border-slate-200 rounded-xl">
          <ShieldCheck className="h-9 w-9 mb-3 opacity-60 text-emerald-600" />
          <p className="text-2xl font-semibold text-slate-900 tracking-tight normal-case">
            No assessments in library
          </p>
          <p className="text-sm opacity-80 mt-2 font-medium">
            Create assessments to standardize safety protocols for site tasks.
          </p>
        </div>
      )}
    </div>
  );
}
