'use client';

import React, { useMemo, useState } from 'react';

import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ClipboardCheck,
    FileText,
    FolderOpen,
    History,
    Home,
    Link as LinkIcon,
    MapPin,
    MessageSquare,
    MoreVertical,
    Printer,
    Settings,
    Shield,
    ShieldCheck,
    Split,
    Target,
    Trash2,
    User,
    Users,
} from 'lucide-react';

import {
    differenceInDays,
    format,
    isValid,
    parseISO,
} from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type {
    CapaStage,
    EhsObservation,
} from '@/lib/types';

import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useEhs } from '@/contexts/ehs-provider';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import CapaLifecycleStepper from './cockpit/CapaLifecycleStepper';
import CapaWorkflowSidebar from './cockpit/CapaWorkflowSidebar';
import CapaCaseInformation from './cockpit/CapaCaseInformation';
import CapaStageWorkspace from './cockpit/CapaStageWorkspace';
import CapaActionFooter from './cockpit/CapaActionFooter';

/* ============================================================
   TYPES
============================================================ */

interface CapaCockpitProps {
    observation: EhsObservation;
    onClose: () => void;
}

/* ============================================================
   CONSTANTS
============================================================ */

const riskStyles: Record<string, string> = {
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    High: 'bg-red-50 text-red-700 border-red-200',
    Critical:
        'bg-red-100 text-red-800 border-red-300',
};

const statusStyles: Record<string, string> = {
    Open: 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress':
        'bg-blue-600 text-white border-blue-600',
    Closed:
        'bg-emerald-600 text-white border-emerald-600',
    Returned:
        'bg-red-600 text-white border-red-600',
};

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely removes HTML from narrative text before displaying it
 * in compact UI elements such as the case header.
 *
 * IMPORTANT:
 * The original Firebase value is never modified.
 */
function stripHtml(value: string) {
    if (!value) return '';

    try {
        const doc = new DOMParser().parseFromString(
            value,
            'text/html'
        );

        return (
            doc.body.textContent
                ?.replace(/\s+/g, ' ')
                .trim() || ''
        );
    } catch {
        return value
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

function safeFormatDate(
    value: string | undefined,
    fallback = '—'
) {
    if (!value) return fallback;

    try {
        const parsed = parseISO(value);

        if (!isValid(parsed)) return fallback;

        return format(parsed, 'dd MMM yyyy');
    } catch {
        return fallback;
    }
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function CapaCockpit({
    observation,
    onClose,
}: CapaCockpitProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { deleteObservation } = useEhs();

    const [viewingStage, setViewingStage] =
        useState<CapaStage>(observation.currentStage);

    /* ---------------------------------------------------------
       DERIVED DATA
    --------------------------------------------------------- */

    const project = useMemo(
        () =>
            projects.find(
                (projectItem) =>
                    projectItem.id === observation.projectId
            ),
        [projects, observation.projectId]
    );

    const reporter = useMemo(
        () =>
            users.find(
                (userItem) =>
                    userItem.id === observation.reporterId
            ),
        [users, observation.reporterId]
    );

    const caseIdDisplay = useMemo(
        () =>
            `CAPA-26-${observation.id
                .slice(-5)
                .toUpperCase()}`,
        [observation.id]
    );

    const sanitizedDescription = useMemo(
        () => stripHtml(observation.description),
        [observation.description]
    );

    const daysOpen = useMemo(() => {
        if (!observation.createdAt) return 0;

        try {
            const created = parseISO(
                observation.createdAt
            );

            if (!isValid(created)) return 0;

            if (observation.status === 'Closed') {
                return Math.max(
                    0,
                    differenceInDays(
                        created,
                        new Date()
                    )
                );
            }

            return Math.max(
                0,
                differenceInDays(
                    new Date(),
                    created
                )
            );
        } catch {
            return 0;
        }
    }, [
        observation.createdAt,
        observation.status,
    ]);

    const targetDate = useMemo(
        () =>
            safeFormatDate(
                observation.targetDate
            ),
        [observation.targetDate]
    );

    const currentStageOwner = useMemo(() => {
        const stageRecord =
            observation.stages?.[
                viewingStage
            ];

        if (!stageRecord?.assigneeId) {
            return null;
        }

        return users.find(
            (item) =>
                item.id ===
                stageRecord.assigneeId
        );
    }, [
        observation.stages,
        viewingStage,
        users,
    ]);

    const isCurrentStage =
        viewingStage === observation.currentStage;

    const currentStageRecord =
        observation.stages?.[viewingStage];

    const currentStageStatus =
        currentStageRecord?.status ||
        observation.status;

    /* ---------------------------------------------------------
       NAVIGATION ITEMS
    --------------------------------------------------------- */

    const navigationItems = [
        {
            label: 'Home',
            icon: Home,
        },
        {
            label: 'Observations',
            icon: ClipboardCheck,
        },
        {
            label: 'CAPA',
            icon: Shield,
            active: true,
        },
        {
            label: 'Risk Register',
            icon: AlertTriangle,
        },
        {
            label: 'Audits',
            icon: FileText,
        },
        {
            label: 'Inspections',
            icon: FolderOpen,
        },
        {
            label: 'Reports',
            icon: BarChart3,
        },
        {
            label: 'Dashboard',
            icon: Activity,
        },
    ];

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <div
            className="
                fixed
                inset-0
                z-50
                flex
                overflow-hidden
                bg-[#F3F7FB]
                text-[#0F172A]
                font-sans
            "
        >            
            {/* =================================================
                MAIN APPLICATION AREA
            ================================================= */}

            <div
                className="
                    min-w-0
                    flex-1
                    flex
                    flex-col
                    overflow-hidden
                "
            >
                {/* =================================================
                    CASE HEADER
                ================================================= */}

                <header
                    className="
                        shrink-0
                        h-[88px]
                        bg-white
                        border-b
                        border-[#DCE4EE]
                        flex
                        items-center
                        justify-between
                        px-5
                        xl:px-7
                        gap-5
                        z-30
                    "
                >
                    {/* LEFT HEADER */}
                    <div
                        className="
                            min-w-0
                            flex
                            items-center
                            gap-4
                        "
                    >
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onClose}
                            className="
                                h-9
                                w-9
                                shrink-0
                                rounded-lg
                                border-[#D5DFEA]
                                bg-white
                                text-[#334155]
                                hover:bg-[#F8FAFC]
                            "
                            aria-label="Back"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="min-w-0">
                            {/* CASE ID / BADGES */}
                            <div
                                className="
                                    flex
                                    items-center
                                    gap-2
                                    flex-wrap
                                "
                            >
                                <h1
                                    className="
                                        text-[19px]
                                        leading-none
                                        font-extrabold
                                        tracking-tight
                                        text-[#0B1F3A]
                                    "
                                >
                                    {
                                        caseIdDisplay
                                    }
                                </h1>

                                <Badge
                                    variant="outline"
                                    className={cn(
                                        `
                                            h-5
                                            px-2
                                            rounded-md
                                            text-[9px]
                                            font-bold
                                            border
                                        `,
                                        riskStyles[
                                            observation
                                                .severity
                                        ] ||
                                            riskStyles
                                                .Medium
                                    )}
                                >
                                    {
                                        observation.severity
                                    }{' '}
                                    RISK
                                </Badge>

                                <Badge
                                    variant="outline"
                                    className={cn(
                                        `
                                            h-5
                                            px-2
                                            rounded-md
                                            text-[9px]
                                            font-bold
                                            border
                                        `,
                                        statusStyles[
                                            observation
                                                .status
                                        ] ||
                                            statusStyles
                                                .Open
                                    )}
                                >
                                    {
                                        observation.status
                                    }
                                </Badge>
                            </div>

                            {/* NARRATIVE */}
                            <p
                                className="
                                    mt-1
                                    max-w-[700px]
                                    truncate
                                    text-[13px]
                                    font-semibold
                                    text-[#334155]
                                "
                                title={
                                    sanitizedDescription
                                }
                            >
                                {
                                    sanitizedDescription
                                }
                            </p>

                            {/* META */}
                            <div
                                className="
                                    mt-1.5
                                    flex
                                    items-center
                                    gap-x-4
                                    gap-y-1
                                    flex-wrap
                                    text-[9px]
                                    font-semibold
                                    text-[#64748B]
                                "
                            >
                                <span className="flex items-center gap-1">
                                    <MapPin
                                        className="
                                            h-3
                                            w-3
                                            text-[#2563EB]
                                        "
                                    />
                                    {
                                        project?.name ||
                                        'N/A'
                                    }
                                </span>

                                <span className="flex items-center gap-1">
                                    <User
                                        className="
                                            h-3
                                            w-3
                                            text-[#059669]
                                        "
                                    />
                                    Reported by{' '}
                                    {reporter?.name ||
                                        'N/A'}
                                </span>

                                <span className="flex items-center gap-1">
                                    <Calendar
                                        className="
                                            h-3
                                            w-3
                                            text-[#2563EB]
                                        "
                                    />
                                    {safeFormatDate(
                                        observation.createdAt
                                    )}
                                </span>

                                <span
                                    className={cn(
                                        `
                                            flex
                                            items-center
                                            gap-1
                                        `,
                                        daysOpen >
                                            30
                                            ? 'text-red-600'
                                            : 'text-[#475569]'
                                    )}
                                >
                                    <History className="h-3 w-3" />
                                    {daysOpen} days open
                                </span>

                                <span className="hidden xl:flex items-center gap-1">
                                    <Target className="h-3 w-3 text-[#64748B]" />
                                    Target closure:{' '}
                                    {targetDate}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT HEADER ACTIONS */}
                    <div
                        className="
                            hidden
                            md:flex
                            items-center
                            gap-2
                            shrink-0
                        "
                    >
                        <div
                            className="
                                hidden
                                xl:flex
                                flex-col
                                items-end
                                mr-2
                                pr-4
                                border-r
                                border-[#E2E8F0]
                            "
                        >
                            <span
                                className="
                                    text-[9px]
                                    font-bold
                                    text-[#059669]
                                "
                            >
                                A SAFER WORKPLACE
                            </span>

                            <span
                                className="
                                    text-[9px]
                                    font-semibold
                                    text-[#64748B]
                                "
                            >
                                A STRONGER TOMORROW
                            </span>
                        </div>

                        <Button
                            variant="outline"
                            className="
                                h-9
                                px-3
                                rounded-lg
                                border-[#D5DFEA]
                                bg-white
                                text-[#1E3A5F]
                                text-[10px]
                                font-bold
                                gap-2
                                hover:bg-[#F8FAFC]
                            "
                        >
                            <MessageSquare className="h-3.5 w-3.5 text-[#2563EB]" />
                            Add Comment
                        </Button>

                        <Button
                            variant="outline"
                            className="
                                h-9
                                px-3
                                rounded-lg
                                border-[#D5DFEA]
                                bg-white
                                text-[#1E3A5F]
                                text-[10px]
                                font-bold
                                gap-2
                                hover:bg-[#F8FAFC]
                            "
                        >
                            <LinkIcon className="h-3.5 w-3.5 text-[#2563EB]" />
                            Evidence
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger
                                asChild
                            >
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="
                                        h-9
                                        w-9
                                        rounded-lg
                                        border-[#D5DFEA]
                                        bg-white
                                        hover:bg-[#F8FAFC]
                                    "
                                >
                                    <MoreVertical className="h-4 w-4 text-[#475569]" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                className="
                                    w-56
                                    rounded-xl
                                    border-[#DCE4EE]
                                    shadow-lg
                                "
                            >
                                <DropdownMenuItem
                                    className="
                                        py-2.5
                                        text-xs
                                        font-semibold
                                    "
                                >
                                    <Split className="mr-2 h-4 w-4 text-[#2563EB]" />
                                    Split Case
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    className="
                                        py-2.5
                                        text-xs
                                        font-semibold
                                    "
                                >
                                    <ArrowUpRight className="mr-2 h-4 w-4 text-[#D97706]" />
                                    Redirect Stage
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    className="
                                        py-2.5
                                        text-xs
                                        font-semibold
                                    "
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4 text-[#059669]" />
                                    Overtake Step
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                    className="
                                        py-2.5
                                        text-xs
                                        font-semibold
                                    "
                                >
                                    <Printer className="mr-2 h-4 w-4 text-[#475569]" />
                                    Print Dossier
                                </DropdownMenuItem>

                                {user?.role ===
                                    'Admin' && (
                                    <DropdownMenuItem
                                        className="
                                            py-2.5
                                            text-xs
                                            font-semibold
                                            text-red-600
                                        "
                                        onClick={() =>
                                            deleteObservation(
                                                observation.id
                                            )
                                        }
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Administrative Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* =================================================
                    LIFECYCLE
                ================================================= */}

                <section
                    className="
                        shrink-0
                        h-[84px]
                        bg-white
                        border-b
                        border-[#DCE4EE]
                        px-4
                        xl:px-8
                        flex
                        items-center
                        overflow-hidden
                        z-20
                    "
                >
                    <div className="w-full min-w-0">
                        <CapaLifecycleStepper
                            observation={
                                observation
                            }
                            viewingStage={
                                viewingStage
                            }
                            onStageSelect={
                                setViewingStage
                            }
                        />
                    </div>
                </section>

                {/* =================================================
                    COCKPIT BODY
                ================================================= */}

                <div
                    className="
                        min-h-0
                        flex-1
                        flex
                        overflow-hidden
                        bg-[#F3F7FB]
                    "
                >
                    {/* =================================================
                        CAPA WORKFLOW
                    ================================================= */}

                    <aside
                        className="
                            hidden
                            lg:flex
                            w-[218px]
                            xl:w-[230px]
                            shrink-0
                            flex-col
                            border-r
                            border-[#DCE4EE]
                            bg-[#F8FAFC]
                            overflow-hidden
                        "
                    >
                        <div
                            className="
                                h-full
                                overflow-y-auto
                                custom-scrollbar
                            "
                        >
                            <CapaWorkflowSidebar
                                observation={
                                    observation
                                }
                                viewingStage={
                                    viewingStage
                                }
                                onStageSelect={
                                    setViewingStage
                                }
                            />
                        </div>
                    </aside>

                    {/* =================================================
                        CENTER WORKSPACE
                    ================================================= */}

                    <main
                        className="
                            min-w-0
                            flex-1
                            flex
                            flex-col
                            overflow-hidden
                        "
                    >
                        {/* CENTER SCROLL AREA */}
                        <div
                            className="
                                min-h-0
                                flex-1
                                overflow-y-auto
                                overflow-x-hidden
                                bg-[#F3F7FB]
                            "
                        >
                            <div
                                className="
                                    w-full
                                    max-w-[1280px]
                                    mx-auto
                                    px-4
                                    py-5
                                    lg:px-6
                                    xl:px-7
                                "
                            >
                                <CapaStageWorkspace
                                    observation={
                                        observation
                                    }
                                    stage={
                                        viewingStage
                                    }
                                />
                            </div>
                        </div>

                        {/* =================================================
                            ACTION FOOTER
                        ================================================= */}

                        <footer
                            className="
                                shrink-0
                                min-h-[64px]
                                bg-white
                                border-t
                                border-[#DCE4EE]
                                px-4
                                lg:px-6
                                xl:px-7
                                flex
                                items-center
                                z-20
                            "
                        >
                            <div className="w-full">
                                <CapaActionFooter
                                    observation={
                                        observation
                                    }
                                    stage={
                                        viewingStage
                                    }
                                />
                            </div>
                        </footer>
                    </main>

                    {/* =================================================
                        RIGHT INTELLIGENCE PANEL
                    ================================================= */}

                    <aside
                        className="
                            hidden
                            xl:flex
                            w-[300px]
                            2xl:w-[320px]
                            shrink-0
                            flex-col
                            border-l
                            border-[#DCE4EE]
                            bg-white
                            overflow-hidden
                        "
                    >
                        {/* PANEL HEADER */}
                        <div
                            className="
                                h-[48px]
                                shrink-0
                                px-5
                                flex
                                items-center
                                border-b
                                border-[#E5EAF0]
                            "
                        >
                            <div className="flex items-center gap-2">
                                <Activity
                                    className="
                                        h-4
                                        w-4
                                        text-[#2563EB]
                                    "
                                />

                                <span
                                    className="
                                        text-[11px]
                                        font-bold
                                        text-[#0B1F3A]
                                        tracking-wide
                                    "
                                >
                                    CASE INTELLIGENCE
                                </span>
                            </div>
                        </div>

                        {/* PANEL CONTENT */}
                        <div
                            className="
                                flex-1
                                overflow-y-auto
                                p-4
                                space-y-4
                            "
                        >
                            <CapaCaseInformation
                                observation={
                                    observation
                                }
                            />

                            {/* CURRENT STAGE OWNER */}
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-[#DCE4EE]
                                    bg-[#F8FAFC]
                                    p-3.5
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        gap-3
                                    "
                                >
                                    <div>
                                        <p
                                            className="
                                                text-[9px]
                                                font-bold
                                                text-[#94A3B8]
                                                uppercase
                                            "
                                        >
                                            Current Stage
                                        </p>

                                        <p
                                            className="
                                                mt-1
                                                text-[12px]
                                                font-bold
                                                text-[#0F172A]
                                            "
                                        >
                                            {
                                                viewingStage
                                            }
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p
                                            className="
                                                text-[9px]
                                                font-bold
                                                text-[#94A3B8]
                                                uppercase
                                            "
                                        >
                                            Owner
                                        </p>

                                        <div
                                            className="
                                                mt-1
                                                flex
                                                items-center
                                                gap-1.5
                                            "
                                        >
                                            <div
                                                className="
                                                    h-6
                                                    w-6
                                                    rounded-full
                                                    bg-[#DBEAFE]
                                                    flex
                                                    items-center
                                                    justify-center
                                                "
                                            >
                                                <Users className="h-3 w-3 text-[#2563EB]" />
                                            </div>

                                            <span
                                                className="
                                                    max-w-[100px]
                                                    truncate
                                                    text-[11px]
                                                    font-semibold
                                                    text-[#334155]
                                                "
                                            >
                                                {currentStageOwner?.name ||
                                                    'Unassigned'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="
                                        mt-3
                                        pt-3
                                        border-t
                                        border-[#E2E8F0]
                                        flex
                                        items-center
                                        justify-between
                                    "
                                >
                                    <span
                                        className="
                                            text-[9px]
                                            font-semibold
                                            text-[#64748B]
                                        "
                                    >
                                        Stage status
                                    </span>

                                    <span
                                        className={cn(
                                            `
                                                inline-flex
                                                items-center
                                                rounded-full
                                                px-2
                                                py-1
                                                text-[8px]
                                                font-bold
                                                uppercase
                                            `,
                                            currentStageStatus ===
                                                'Completed'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : currentStageStatus ===
                                                    'Returned'
                                                ? 'bg-red-50 text-red-700'
                                                : currentStageStatus ===
                                                    'In Progress'
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'bg-slate-100 text-slate-600'
                                        )}
                                    >
                                        {
                                            currentStageStatus
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* DEADLINE CARD */}
                            <div
                                className={cn(
                                    `
                                        rounded-xl
                                        border
                                        p-3.5
                                    `,
                                    daysOpen >
                                        30
                                        ? `
                                            border-red-200
                                            bg-red-50
                                        `
                                        : `
                                            border-[#DCE4EE]
                                            bg-white
                                        `
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Calendar
                                        className={cn(
                                            'h-4 w-4',
                                            daysOpen >
                                                30
                                                ? 'text-red-600'
                                                : 'text-[#2563EB]'
                                        )}
                                    />

                                    <div>
                                        <p
                                            className="
                                                text-[9px]
                                                font-bold
                                                uppercase
                                                text-[#94A3B8]
                                            "
                                        >
                                            Target Closure
                                        </p>

                                        <p
                                            className="
                                                mt-0.5
                                                text-[12px]
                                                font-bold
                                                text-[#0F172A]
                                            "
                                        >
                                            {
                                                targetDate
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className="
                                        mt-3
                                        flex
                                        items-center
                                        justify-between
                                        text-[9px]
                                        font-semibold
                                    "
                                >
                                    <span className="text-[#64748B]">
                                        Days open
                                    </span>

                                    <span
                                        className={cn(
                                            daysOpen >
                                                30
                                                ? 'text-red-600'
                                                : 'text-[#2563EB]'
                                        )}
                                    >
                                        {daysOpen}{' '}
                                        days
                                    </span>
                                </div>
                            </div>

                            {/* QUICK CONTEXT */}
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-[#DCE4EE]
                                    bg-white
                                    p-3.5
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                    "
                                >
                                    <BookOpen
                                        className="
                                            h-4
                                            w-4
                                            text-[#059669]
                                        "
                                    />

                                    <span
                                        className="
                                            text-[10px]
                                            font-bold
                                            text-[#0F172A]
                                        "
                                    >
                                        Governance Context
                                    </span>
                                </div>

                                <p
                                    className="
                                        mt-2
                                        text-[10px]
                                        leading-relaxed
                                        text-[#64748B]
                                    "
                                >
                                    Review the current
                                    stage, ownership,
                                    evidence and workflow
                                    status before taking
                                    an action.
                                </p>
                            </div>

                            {/* CURRENT STAGE INDICATOR */}
                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-blue-100
                                    bg-blue-50/70
                                    p-3.5
                                "
                            >
                                <div className="flex items-start gap-2.5">
                                    <div
                                        className="
                                            mt-0.5
                                            h-7
                                            w-7
                                            rounded-lg
                                            bg-blue-600
                                            flex
                                            items-center
                                            justify-center
                                            shrink-0
                                        "
                                    >
                                        {isCurrentStage ? (
                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                        ) : (
                                            <History className="h-4 w-4 text-white" />
                                        )}
                                    </div>

                                    <div>
                                        <p
                                            className="
                                                text-[10px]
                                                font-bold
                                                text-blue-900
                                            "
                                        >
                                            {isCurrentStage
                                                ? 'Current Stage'
                                                : 'Viewing Stage'}
                                        </p>

                                        <p
                                            className="
                                                mt-0.5
                                                text-[10px]
                                                leading-relaxed
                                                text-blue-700
                                            "
                                        >
                                            {
                                                viewingStage
                                            }{' '}
                                            workspace
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}