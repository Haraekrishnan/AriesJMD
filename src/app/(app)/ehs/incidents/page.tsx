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
  Plus,
  Search,
  MapPin,
  Calendar,
  Eye,
  Users,
  FileWarning,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { EhsIncidentStatus } from '@/lib/types';

const incidentTypeColors: Record<string, string> = {
  'Near Miss': 'bg-amber-100 text-amber-700 border-amber-200',
  LTI: 'bg-rose-100 text-rose-700 border-rose-200',
  'Minor Injury': 'bg-orange-100 text-orange-700 border-orange-200',
  Environmental: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Property Damage': 'bg-slate-100 text-slate-700 border-slate-200',
};

const incidentSchema = z.object({
  type: z.enum([
    'Near Miss',
    'Minor Injury',
    'LTI',
    'Fatality',
    'Environmental',
    'Property Damage',
  ]),
  date: z.string().min(1, 'Date is required'),
  projectId: z.string().min(1, 'Site is required'),
  location: z.string().min(1, 'Specific location is required'),
  description: z.string().min(5, 'Detailed description is required'),
  immediateActions: z.string().min(5, 'Immediate actions taken is required'),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

export default function EhsIncidentsPage() {
  const { incidents, addIncident, updateIncidentStatus } = useEhs();
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [recordFilter, setRecordFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const details = incidents.find((item) => item.id === detailsId);
  const [actingIncidentId, setActingIncidentId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      type: 'Near Miss',
      date: format(new Date(), 'yyyy-MM-dd'),
      projectId: '',
    },
  });

  const isSupervisor =
    user?.role === 'Senior Safety Supervisor' || user?.role === 'Admin';

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((i) => {
        if (siteFilter !== 'all' && i.projectId !== siteFilter) return false;
        if (recordFilter !== 'all' && i.status !== recordFilter) return false;
        const projectName =
          projects.find((p) => p.id === i.projectId)?.name || '';
        return (
          i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.type.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [incidents, searchTerm, projects, siteFilter, recordFilter]);

  const onSubmit = async (data: IncidentFormValues) => {
    if (!user) return;

    try {
      await addIncident({
        ...data,
        reporterId: user.id,
        status: 'Open',
      });

      toast({
        title: 'Incident Logged',
        description: 'The report has been sent to the higher official.',
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

  const handleResolveAction = (status: EhsIncidentStatus) => {
    if (!actingIncidentId) return;
    if (!resolutionNotes.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Provide resolution or root cause notes.',
        variant: 'destructive',
      });
      return;
    }
    updateIncidentStatus(actingIncidentId, status, resolutionNotes);
    setActingIncidentId(null);
    setResolutionNotes('');
  };

  return (
    <div className="ehs-page text-slate-900">
      <div className="flex flex-wrap justify-between items-center gap-4 text-left">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Incident Management
          </h1>
          <p className="text-slate-600 text-lg font-medium">
            Track investigations led by the Senior Safety Supervisor.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-lg shadow-rose-600/20 px-8 h-12 normal-case tracking-normal text-xs rounded-xl">
              <Plus className="mr-2 h-4 w-4" /> Report New Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white border-slate-200 text-slate-900 sm:max-w-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900 text-xl font-semibold normal-case tracking-tight">
                Report Safety Incident
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Immediate reporting of unsafe incidents for official
                investigation.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 py-4 text-left"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                      Incident Type
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
                            <SelectItem value="Near Miss">Near Miss</SelectItem>
                            <SelectItem value="Minor Injury">
                              Minor Injury
                            </SelectItem>
                            <SelectItem value="LTI">
                              Lost Time Injury (LTI)
                            </SelectItem>
                            <SelectItem value="Fatality">Fatality</SelectItem>
                            <SelectItem value="Environmental">
                              Environmental
                            </SelectItem>
                            <SelectItem value="Property Damage">
                              Property Damage
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                      Date of Incident
                    </Label>
                    <Input
                      type="date"
                      {...form.register('date')}
                      className="h-12 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                      Site/Project
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
                      Specific Location
                    </Label>
                    <Input
                      {...form.register('location')}
                      className="h-12 rounded-xl font-bold"
                      placeholder="e.g., Workshop B"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                    Detailed Description
                  </Label>
                  <Textarea
                    {...form.register('description')}
                    className="min-h-[120px] rounded-2xl p-4 font-bold focus-visible:ring-rose-600/20"
                    placeholder="Explain the sequence of events..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                    Immediate Actions Taken
                  </Label>
                  <Textarea
                    {...form.register('immediateActions')}
                    className="min-h-[100px] rounded-2xl p-4 font-bold focus-visible:ring-emerald-600/20"
                    placeholder="Corrective measures taken to secure the area..."
                  />
                </div>

                <div role="alert" className="text-sm text-rose-600">
                  {Object.values(form.formState.errors).map((error, index) => (
                    <p key={index}>{error?.message}</p>
                  ))}
                </div>
                <DialogFooter className="pt-2">
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
                    className="bg-rose-600 hover:bg-rose-700 font-semibold text-white normal-case tracking-normal text-xs px-8 h-12 rounded-xl shadow-lg shadow-rose-600/10"
                  >
                    Submit for Review
                  </Button>
                </DialogFooter>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <RecordMetrics
        items={[
          { label: 'Incidents recorded', value: incidents.length },
          {
            label: 'Open',
            value: incidents.filter((i) => i.status === 'Open').length,
          },
          {
            label: 'Under investigation',
            value: incidents.filter((i) => i.status === 'Under Investigation')
              .length,
          },
          {
            label: 'Closed',
            value: incidents.filter((i) => i.status === 'Closed').length,
          },
        ]}
      />
      <RecordToolbar
        search={searchTerm}
        onSearch={setSearchTerm}
        count={filteredIncidents.length}
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
              ...['Open', 'Under Investigation', 'Closed'].map((value) => ({
                value,
                label: value,
              })),
            ],
          },
        ]}
        onExport={() =>
          downloadRecords('ehs-incidents', [
            [
              'Type',
              'Site',
              'Location',
              'Date',
              'Status',
              'Description',
              'Immediate actions',
            ],
            ...filteredIncidents.map((r) => [
              r.type,
              projects.find((p) => p.id === r.projectId)?.name || r.projectId,
              r.location,
              r.date,
              r.status,
              r.description,
              r.immediateActions,
            ]),
          ])
        }
      />
      <div className="space-y-6 text-left">
        {filteredIncidents.map((incident) => {
          const site = projects.find((p) => p.id === incident.projectId);
          const reviewer = users.find((u) => u.id === incident.reviewedById);

          return (
            <Card
              key={incident.id}
              className="bg-white border-slate-200 hover:shadow-md transition-all border-l-4 border-l-rose-600 overflow-hidden shadow-sm"
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="p-8 flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'normal-case text-sm tracking-normal font-semibold px-3 py-1',
                          incidentTypeColors[incident.type],
                        )}
                      >
                        {incident.type}
                      </Badge>
                      <span className="text-slate-300 font-semibold">|</span>
                      <span className="text-sm text-slate-500 font-semibold normal-case tracking-normal">
                        {displayDate(incident.date, 'PPP')}
                      </span>
                    </div>

                    <h3 className="text-2xl font-semibold text-slate-900 line-clamp-2 leading-tight normal-case tracking-tight">
                      {incident.description}
                    </h3>

                    {incident.resolutionNotes && (
                      <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 shadow-none">
                        <p className="text-sm font-semibold text-emerald-600 normal-case tracking-normal mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4" /> Official
                          Resolution Findings
                        </p>
                        <p className="text-sm text-slate-700 italic font-bold leading-relaxed">
                          "{incident.resolutionNotes}"
                        </p>
                        {reviewer && (
                          <p className="text-sm text-slate-400 font-semibold normal-case mt-4 tracking-normal">
                            Closed by {reviewer.name} &middot;{' '}
                            {displayDate(incident.reviewDate!, 'dd MMM')}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-8 text-sm text-slate-600 pt-2 font-bold normal-case tracking-tight">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-slate-100 p-2 rounded-xl border border-slate-200">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span>
                          {site?.name || 'Unknown Site'} &middot;{' '}
                          {incident.location}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-semibold text-sm normal-case px-4 h-6 bg-white border-2',
                          incident.status === 'Open'
                            ? 'text-rose-600 border-rose-200'
                            : incident.status === 'Closed'
                              ? 'text-emerald-600 border-emerald-200'
                              : 'text-amber-600 border-amber-200',
                        )}
                      >
                        {incident.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-8 md:border-l border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    {isSupervisor && incident.status !== 'Closed' && (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold normal-case text-sm tracking-normal h-12 px-8 shadow-lg shadow-emerald-600/10"
                        onClick={() => setActingIncidentId(incident.id)}
                      >
                        Investigate
                      </Button>
                    )}
                    <Button
                      onClick={() => setDetailsId(incident.id)}
                      variant="outline"
                      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl h-12 px-8 font-semibold normal-case text-sm tracking-normal"
                    >
                      <Eye className="h-4 w-4 mr-2" /> Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* INVESTIGATION DIALOG */}
      <Dialog
        open={!!actingIncidentId}
        onOpenChange={(o) => !o && setActingIncidentId(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-semibold normal-case tracking-tight text-slate-900">
              Incident Investigation & Resolution
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Formal review and close-out of site incidents by the higher
              official.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-left">
            <div className="space-y-2">
              <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                Resolution Notes / Root Cause Findings
              </Label>
              <Textarea
                className="bg-slate-50 border-slate-200 text-slate-900 min-h-[180px] rounded-2xl p-6 font-bold focus-visible:ring-emerald-600/20"
                placeholder="Enter investigation details and formal resolution..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              className="h-12 px-6 rounded-xl font-bold"
              onClick={() => handleResolveAction('Under Investigation')}
            >
              <Clock className="mr-2 h-4 w-4" /> Move to Investigation
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold normal-case text-sm tracking-normal h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/10"
              onClick={() => handleResolveAction('Closed')}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Resolve & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!details}
        onOpenChange={(open) => !open && setDetailsId(null)}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident details</DialogTitle>
            <DialogDescription>
              {details?.type} · {displayDate(details?.date)}
            </DialogDescription>
          </DialogHeader>
          {details && (
            <dl className="space-y-4 text-sm">
              {[
                [
                  'Site',
                  projects.find((p) => p.id === details.projectId)?.name ||
                    'Not recorded',
                ],
                ['Location', details.location],
                [
                  'Reported by',
                  users.find((u) => u.id === details.reporterId)?.name ||
                    'Not recorded',
                ],
                ['Status', details.status],
                ['Description', details.description],
                ['Immediate actions', details.immediateActions],
                [
                  'Investigation notes',
                  details.resolutionNotes || 'Not recorded',
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold text-slate-500">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
      {filteredIncidents.length === 0 && (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-slate-500 bg-white border border-dashed border-slate-200 rounded-xl">
          <div className="p-3 bg-slate-50 rounded-full mb-3 shadow-none border border-slate-100">
            <FileWarning className="h-8 w-8 opacity-60 text-rose-600" />
          </div>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight normal-case">
            No incident logs found
          </p>
          <p className="text-sm mt-2 opacity-80 font-medium">
            Reporting unsafe conditions prevents actual accidents.
          </p>
        </div>
      )}
    </div>
  );
}
