'use client';

import RecordToolbar, { RecordMetrics } from '@/components/ehs/RecordToolbar';
import { downloadRecords, displayDate } from '@/lib/ehs-records';
import React, { useState, useMemo, useEffect } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  Clock,
  Trophy,
  Play,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const trainingSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  type: z.enum(['Induction', 'Toolbox', 'Specialized']),
  date: z.string().min(1, 'Date is required'),
  attendees: z.array(z.string()).min(1, 'Select at least one attendee'),
});

type TrainingFormValues = z.infer<typeof trainingSchema>;

export default function EhsTrainingsPage() {
  const { trainings, addTraining } = useEhs();
  const { user } = useAuth();
  const { manpowerProfiles } = useManpower();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('new') === '1') {
      setIsDialogOpen(true);
      url.searchParams.delete('new');
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, []);
  const [isAttendeePopoverOpen, setIsAttendeePopoverOpen] = useState(false);

  const form = useForm<TrainingFormValues>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      type: 'Toolbox',
      date: format(new Date(), 'yyyy-MM-dd'),
      attendees: [],
    },
  });

  const selectedAttendeeIds = form.watch('attendees') || [];

  const onSubmit = async (data: TrainingFormValues) => {
    if (!user) return;

    try {
      await addTraining({
        ...data,
        trainer: user.name,
      });

      toast({
        title: 'Session Registered',
        description: 'Workforce competency record has been updated.',
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

  const sortedTrainings = useMemo(() => {
    return trainings
      .filter(
        (t) =>
          (typeFilter === 'all' || t.type === typeFilter) &&
          [t.topic, t.trainer, t.type]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [trainings, search, typeFilter]);

  return (
    <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-900">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Safety Trainings
          </h1>
          <p className="text-slate-600 font-medium">
            Track workforce competency and toolbox talk records.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-600/20 px-8 h-12 rounded-xl normal-case text-xs tracking-normal">
              <GraduationCap className="mr-2 h-4 w-4" /> Register Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto bg-white border-slate-200 text-slate-900 sm:max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-semibold normal-case">
                Log Training Session
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                Record a safety induction, toolbox talk, or specialized training
                event.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                  Training Module Title
                </Label>
                <Input
                  {...form.register('topic')}
                  className="h-12 rounded-xl font-bold"
                  placeholder="e.g., Fire Safety Level 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                    Session Type
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
                          <SelectItem value="Induction">
                            Safety Induction
                          </SelectItem>
                          <SelectItem value="Toolbox">Toolbox Talk</SelectItem>
                          <SelectItem value="Specialized">
                            Specialized Certification
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                    Date Held
                  </Label>
                  <Input
                    type="date"
                    {...form.register('date')}
                    className="h-12 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-900 font-semibold normal-case text-sm tracking-normal ml-1">
                  Participants ({selectedAttendeeIds.length})
                </Label>
                <Controller
                  control={form.control}
                  name="attendees"
                  render={({ field }) => (
                    <Popover
                      open={isAttendeePopoverOpen}
                      onOpenChange={setIsAttendeePopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between bg-white border-slate-200 text-slate-700 h-12 rounded-xl font-bold"
                        >
                          {selectedAttendeeIds.length > 0
                            ? `${selectedAttendeeIds.length} Selected`
                            : 'Select attendees...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command className="bg-white">
                          <CommandInput
                            placeholder="Search manpower..."
                            className="font-medium"
                          />
                          <CommandList>
                            <CommandEmpty>No personnel found.</CommandEmpty>
                            <CommandGroup className="text-slate-700">
                              <ScrollArea className="h-64">
                                {manpowerProfiles.map((p) => (
                                  <CommandItem
                                    key={p.id}
                                    onSelect={() => {
                                      const isSelected =
                                        selectedAttendeeIds.includes(p.id);
                                      field.onChange(
                                        isSelected
                                          ? selectedAttendeeIds.filter(
                                              (id) => id !== p.id,
                                            )
                                          : [...selectedAttendeeIds, p.id],
                                      );
                                    }}
                                    className="hover:bg-slate-50 cursor-pointer font-bold"
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4 text-emerald-600',
                                        selectedAttendeeIds.includes(p.id)
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                    {p.name}{' '}
                                    <span className="text-sm text-slate-400 font-semibold ml-2 normal-case">
                                      ({p.trade})
                                    </span>
                                  </CommandItem>
                                ))}
                              </ScrollArea>
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
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
                  className="bg-indigo-600 hover:bg-indigo-700 font-semibold h-12 rounded-xl px-6 shadow-lg shadow-indigo-600/10 normal-case text-xs tracking-normal text-white"
                >
                  Register Session
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <RecordMetrics
        items={[
          { label: 'Sessions recorded', value: trainings.length },
          {
            label: 'Unique participants',
            value: new Set(trainings.flatMap((t) => t.attendees || [])).size,
          },
          {
            label: 'Toolbox talks',
            value: trainings.filter((t) => t.type === 'Toolbox').length,
          },
          {
            label: 'Inductions',
            value: trainings.filter((t) => t.type === 'Induction').length,
          },
        ]}
      />
      <RecordToolbar
        search={search}
        onSearch={setSearch}
        count={sortedTrainings.length}
        onReset={() => {
          setSearch('');
          setTypeFilter('all');
        }}
        filters={[
          {
            label: 'Session type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: 'all', label: 'All session types' },
              ...['Induction', 'Toolbox', 'Specialized'].map((value) => ({
                value,
                label: value,
              })),
            ],
          },
        ]}
        onExport={() =>
          downloadRecords('ehs-training-sessions', [
            ['Topic', 'Type', 'Date', 'Trainer', 'Participants'],
            ...sortedTrainings.map((t) => [
              t.topic,
              t.type,
              t.date,
              t.trainer,
              (t.attendees || []).length,
            ]),
          ])
        }
      />
      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-semibold">Training session register</h2>
          <p className="mt-1 text-xs text-slate-500">
            Expand a session to view the recorded participants.
          </p>
        </div>
        <div className="divide-y">
          {sortedTrainings.map((t) => (
            <details key={t.id} className="group p-5">
              <summary className="cursor-pointer rounded-lg focus-visible:outline-blue-600">
                <span className="ml-2 inline-flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{t.topic}</span>
                  <Badge variant="outline">{t.type}</Badge>
                  <span className="text-sm text-slate-500">
                    {displayDate(t.date)} · {t.trainer} ·{' '}
                    {(t.attendees || []).length} participants
                  </span>
                </span>
              </summary>
              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-medium">Participants</h3>
                <ul className="grid gap-2 text-sm sm:grid-cols-2">
                  {(t.attendees || []).map((id) => (
                    <li key={id}>
                      {manpowerProfiles.find((p) => p.id === id)?.name ||
                        'Personnel record unavailable'}
                    </li>
                  ))}
                </ul>
                {!t.attendees?.length && (
                  <p className="text-sm text-slate-500">
                    No participant records available.
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
        {!sortedTrainings.length && (
          <div className="py-16 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="font-medium">No matching training sessions</h3>
            <p className="mt-2 text-sm text-slate-500">
              Change your filters or register a completed session.
            </p>
            <Button className="mt-5" onClick={() => setIsDialogOpen(true)}>
              Register session
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
