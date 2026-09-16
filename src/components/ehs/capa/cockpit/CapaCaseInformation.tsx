'use client';

import React, { useMemo } from 'react';
import {
    Activity,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Clock3,
    HelpCircle,
    Info,
    MapPin,
    ShieldCheck,
    Target,
    UserRound,
} from 'lucide-react';
import { differenceInDays, isValid, parseISO } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';


const STAGE_GUIDANCE: Record<
    string,
    {
        title: string;
        description: string;
        tasks: string[];
    }
> = {
    Initiation: {
        title: 'Confirm the initial finding',
        description:
            'Capture accurate factual information about the observation before progressing the case.',
        tasks: [
            'Record the observation accurately',
            'Confirm site and location',
            'Identify the risk level',
            'Attach initial evidence',
        ],
    },

    Investigation: {
        title: 'Perform a technical investigation',
        description:
            'Determine what happened, why it happened, and identify the underlying root cause.',
        tasks: [
            'Gather factual information',
            'Identify all possible causes',
            'Perform 5-Why analysis',
            'Collect evidence and interviews',
            'Determine systemic root cause',
        ],
    },

    Resolution: {
        title: 'Control the immediate risk',
        description:
            'Document the immediate containment or corrective action taken to control the identified hazard.',
        tasks: [
            'Identify immediate risk',
            'Define containment action',
            'Confirm responsible person',
            'Attach supporting evidence',
        ],
    },

    Implementation: {
        title: 'Implement the corrective action',
        description:
            'Document the long-term action required to prevent recurrence of the identified issue.',
        tasks: [
            'Define corrective action',
            'Assign responsibility',
            'Set implementation target',
            'Attach completion evidence',
        ],
    },

    'Effectiveness Review': {
        title: 'Verify effectiveness',
        description:
            'Determine whether the implemented corrective action has actually controlled the underlying cause.',
        tasks: [
            'Review implemented action',
            'Verify field conditions',
            'Check recurrence potential',
            'Record effectiveness decision',
        ],
    },

    Reference: {
        title: 'Complete technical reference',
        description:
            'Preserve the technical record, supporting documentation and relevant references.',
        tasks: [
            'Review technical records',
            'Attach final references',
            'Confirm supporting documents',
            'Complete archival information',
        ],
    },

    Closure: {
        title: 'Complete final sign-off',
        description:
            'Review the complete CAPA record and provide the final closure decision.',
        tasks: [
            'Verify all stages',
            'Confirm actions are complete',
            'Review evidence',
            'Complete final sign-off',
        ],
    },
};


export default function CapaCaseInformation({
    observation,
}: {
    observation: EhsObservation;
}) {
    const { users } = useAuth();
    const { projects } = useGeneral();

    const project = projects.find(
        (item) => item.id === observation.projectId
    );

    const reporter = users.find(
        (item) => item.id === observation.reporterId
    );

    const currentStageData =
        observation.stages?.[observation.currentStage];

    const currentOwner = users.find(
        (item) => item.id === currentStageData?.assigneeId
    );


    const daysOpen = useMemo(() => {
        if (!observation.createdAt) {
            return 0;
        }

        const created = parseISO(observation.createdAt);

        if (!isValid(created)) {
            return 0;
        }

        if (observation.status === 'Closed') {
            return 0;
        }

        return Math.max(
            0,
            differenceInDays(new Date(), created)
        );
    }, [
        observation.createdAt,
        observation.status,
    ]);


    const stageAge = useMemo(() => {
        const stageDate =
            currentStageData?.actionedAt ||
            observation.createdAt;

        if (!stageDate) {
            return 0;
        }

        const parsed = parseISO(stageDate);

        if (!isValid(parsed)) {
            return 0;
        }

        return Math.max(
            0,
            differenceInDays(new Date(), parsed)
        );
    }, [
        currentStageData?.actionedAt,
        observation.createdAt,
    ]);


    const health = useMemo(() => {
        if (observation.status === 'Closed') {
            return {
                label: 'OPTIMAL',
                description: 'Case successfully closed',
                tone: 'emerald',
            };
        }

        if (
            observation.severity === 'Critical' ||
            daysOpen > 15
        ) {
            return {
                label: 'CRITICAL',
                description: 'Immediate management attention required',
                tone: 'red',
            };
        }

        if (
            observation.severity === 'High' ||
            daysOpen > 7
        ) {
            return {
                label: 'AT RISK',
                description: 'Case requires close monitoring',
                tone: 'amber',
            };
        }

        return {
            label: 'ON TRACK',
            description: 'Activities are within expected timeframe',
            tone: 'blue',
        };
    }, [
        observation.status,
        observation.severity,
        daysOpen,
    ]);


    const guidance =
        STAGE_GUIDANCE[observation.currentStage] ||
        STAGE_GUIDANCE.Investigation;


    return (
        <aside className="flex h-full min-h-0 w-full flex-col border-l border-slate-200 bg-slate-50">

            {/* HEADER */}

            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center gap-2">

                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                        <Activity className="h-3.5 w-3.5" />
                    </div>

                    <div>
                        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#102A43]">
                            Case Intelligence
                        </h3>

                        <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                            Live case governance
                        </p>
                    </div>

                </div>
            </div>


            {/* CONTENT */}

            <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-5 p-4">


                    {/* CASE INFORMATION */}

                    <section>
                        <SectionTitle
                            icon={Info}
                            title="Case Information"
                        />

                        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">

                            <InfoRow
                                icon={Target}
                                label="Category"
                                value={observation.category || 'N/A'}
                                badgeType="category"
                            />

                            <InfoRow
                                icon={ShieldCheck}
                                label="Risk Index"
                                value={observation.severity || 'N/A'}
                                badgeType="risk"
                                risk={observation.severity}
                            />

                            <InfoRow
                                icon={MapPin}
                                label="Site"
                                value={project?.name || 'N/A'}
                            />

                            <InfoRow
                                icon={MapPin}
                                label="Area"
                                value={
                                    (observation as any).location ||
                                    (observation as any).area ||
                                    'Not specified'
                                }
                            />

                            <InfoRow
                                icon={UserRound}
                                label="Reporter"
                                value={reporter?.name || 'Unknown'}
                            />

                            <InfoRow
                                icon={UserRound}
                                label="Current Owner"
                                value={
                                    currentOwner?.name ||
                                    'Unassigned'
                                }
                                owner
                            />

                            <InfoRow
                                icon={CalendarDays}
                                label="Initiated"
                                value={formatDate(
                                    observation.createdAt
                                )}
                            />

                            <InfoRow
                                icon={Clock3}
                                label="Days Open"
                                value={`${daysOpen} Days`}
                                danger={daysOpen > 7}
                                last
                            />

                        </div>
                    </section>


                    {/* GOVERNANCE HEALTH */}

                    <section>
                        <SectionTitle
                            icon={ShieldCheck}
                            title="Governance Health"
                        />

                        <div
                            className={cn(
                                'mt-2 rounded-xl border p-3',
                                health.tone === 'emerald' &&
                                    'border-emerald-200 bg-emerald-50/50',
                                health.tone === 'blue' &&
                                    'border-blue-200 bg-blue-50/40',
                                health.tone === 'amber' &&
                                    'border-amber-200 bg-amber-50/50',
                                health.tone === 'red' &&
                                    'border-red-200 bg-red-50/50'
                            )}
                        >

                            <div className="flex items-center gap-2">

                                <span
                                    className={cn(
                                        'h-2 w-2 rounded-full',
                                        health.tone === 'emerald' &&
                                            'bg-emerald-500',
                                        health.tone === 'blue' &&
                                            'bg-blue-500',
                                        health.tone === 'amber' &&
                                            'bg-amber-500',
                                        health.tone === 'red' &&
                                            'bg-red-500'
                                    )}
                                />

                                <span
                                    className={cn(
                                        'text-[10px] font-extrabold uppercase tracking-[0.1em]',
                                        health.tone === 'emerald' &&
                                            'text-emerald-700',
                                        health.tone === 'blue' &&
                                            'text-blue-700',
                                        health.tone === 'amber' &&
                                            'text-amber-700',
                                        health.tone === 'red' &&
                                            'text-red-700'
                                    )}
                                >
                                    {health.label}
                                </span>

                            </div>

                            <p className="mt-1 text-[8px] font-medium text-slate-500">
                                {health.description}
                            </p>

                            <div className="mt-3 grid grid-cols-3 gap-1.5">

                                <Metric
                                    label="Stage Age"
                                    value={`${stageAge}D`}
                                />

                                <Metric
                                    label="Reworks"
                                    value={`${observation.reworkCount || 0}`}
                                />

                                <Metric
                                    label="Overdue"
                                    value={daysOpen > 15 ? '1' : '0'}
                                    danger={daysOpen > 15}
                                />

                            </div>

                        </div>
                    </section>


                    {/* STAGE GUIDANCE */}

                    <section>
                        <SectionTitle
                            icon={BookOpen}
                            title="Stage Guidance"
                        />

                        <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-3.5">

                            <div className="flex items-start gap-2.5">

                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                                    <Target className="h-3 w-3" />
                                </div>

                                <div>

                                    <p className="text-[10px] font-extrabold leading-tight text-blue-900">
                                        {guidance.title}
                                    </p>

                                    <p className="mt-1.5 text-[8px] font-medium leading-relaxed text-blue-800/80">
                                        {guidance.description}
                                    </p>

                                </div>

                            </div>


                            <div className="mt-3 space-y-1.5">

                                {guidance.tasks.map(
                                    (task, index) => (
                                        <div
                                            key={`${task}-${index}`}
                                            className="flex items-center gap-2"
                                        >

                                            <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-600" />

                                            <span className="text-[8px] font-semibold text-blue-900/80">
                                                {task}
                                            </span>

                                        </div>
                                    )
                                )}

                            </div>

                        </div>
                    </section>


                    {/* CURRENT STAGE */}

                    <section>
                        <SectionTitle
                            icon={Activity}
                            title="Current Stage"
                        />

                        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">

                            <div className="flex items-center justify-between">

                                <div>
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                        Stage
                                    </p>

                                    <p className="mt-1 text-[11px] font-extrabold text-[#102A43]">
                                        {observation.currentStage}
                                    </p>
                                </div>

                                <div className="rounded-md bg-blue-50 px-2 py-1 text-[8px] font-extrabold uppercase text-blue-700">
                                    {currentStageData?.status || 'Pending'}
                                </div>

                            </div>


                            <div className="mt-3 border-t border-slate-100 pt-3">

                                <div className="flex items-center justify-between">

                                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                        Owner
                                    </span>

                                    <div className="flex items-center gap-2">

                                        <Avatar className="h-6 w-6">
                                            <AvatarImage
                                                src={
                                                    (currentOwner as any)?.avatarUrl ||
                                                    ''
                                                }
                                            />

                                            <AvatarFallback className="bg-blue-50 text-[8px] font-bold text-blue-700">
                                                {getInitials(
                                                    currentOwner?.name
                                                )}
                                            </AvatarFallback>
                                        </Avatar>

                                        <span className="max-w-[110px] truncate text-[9px] font-bold text-[#102A43]">
                                            {currentOwner?.name ||
                                                'Unassigned'}
                                        </span>

                                    </div>

                                </div>

                            </div>

                        </div>
                    </section>


                    {/* SUPPORT */}

                    <section>

                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">

                            <div className="flex items-center gap-2.5">

                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 text-slate-500">
                                    <HelpCircle className="h-3.5 w-3.5" />
                                </div>

                                <div className="min-w-0">

                                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#102A43]">
                                        Need Support?
                                    </p>

                                    <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                                        View documentation for this stage
                                    </p>

                                </div>

                            </div>

                            <Button
                                variant="outline"
                                className="mt-3 h-8 w-full rounded-md border-slate-200 text-[8px] font-extrabold uppercase tracking-wider text-slate-600"
                            >
                                <BookOpen className="mr-1.5 h-3 w-3" />
                                View Guidelines
                            </Button>

                        </div>

                    </section>

                </div>
            </ScrollArea>
        </aside>
    );
}


/* ================================================================
   SECTION TITLE
================================================================ */

function SectionTitle({
    icon: Icon,
    title,
}: {
    icon: React.ElementType;
    title: string;
}) {
    return (
        <div className="flex items-center gap-2 px-1">

            <Icon className="h-3 w-3 text-slate-400" />

            <span className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                {title}
            </span>

        </div>
    );
}


/* ================================================================
   INFORMATION ROW
================================================================ */

function InfoRow({
    icon: Icon,
    label,
    value,
    badgeType,
    risk,
    danger,
    owner,
    last,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    badgeType?: 'category' | 'risk';
    risk?: string;
    danger?: boolean;
    owner?: boolean;
    last?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex min-h-[35px] items-center justify-between gap-3 px-3 py-2',
                !last && 'border-b border-slate-100'
            )}
        >

            <div className="flex min-w-0 items-center gap-2">

                <Icon className="h-3 w-3 shrink-0 text-slate-300" />

                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                </span>

            </div>


            {badgeType ? (

                <Badge
                    variant="outline"
                    className={cn(
                        'h-5 shrink-0 rounded-md px-2 text-[7px] font-extrabold uppercase tracking-wider',

                        badgeType === 'category' &&
                            'border-slate-200 bg-slate-50 text-slate-700',

                        badgeType === 'risk' &&
                            risk === 'Low' &&
                            'border-emerald-200 bg-emerald-50 text-emerald-700',

                        badgeType === 'risk' &&
                            risk === 'Medium' &&
                            'border-amber-200 bg-amber-50 text-amber-700',

                        badgeType === 'risk' &&
                            risk === 'High' &&
                            'border-orange-200 bg-orange-50 text-orange-700',

                        badgeType === 'risk' &&
                            risk === 'Critical' &&
                            'border-red-200 bg-red-50 text-red-700'
                    )}
                >
                    {value}
                </Badge>

            ) : (

                <span
                    className={cn(
                        'max-w-[135px] truncate text-right text-[9px] font-bold text-[#102A43]',
                        danger && 'text-red-600',
                        owner && 'text-blue-700'
                    )}
                >
                    {value}
                </span>

            )}

        </div>
    );
}


/* ================================================================
   METRIC
================================================================ */

function Metric({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string;
    danger?: boolean;
}) {
    return (
        <div className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center">

            <p className="text-[7px] font-bold uppercase tracking-wider text-slate-400">
                {label}
            </p>

            <p
                className={cn(
                    'mt-1 text-[11px] font-extrabold text-[#102A43]',
                    danger && 'text-red-600'
                )}
            >
                {value}
            </p>

        </div>
    );
}


/* ================================================================
   DATE FORMATTER
================================================================ */

function formatDate(value?: string) {
    if (!value) {
        return 'N/A';
    }

    try {
        const date = parseISO(value);

        if (!isValid(date)) {
            return 'N/A';
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return 'N/A';
    }
}


/* ================================================================
   INITIALS
================================================================ */

function getInitials(name?: string) {
    if (!name) {
        return 'NA';
    }

    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}