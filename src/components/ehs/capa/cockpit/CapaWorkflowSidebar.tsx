'use client';

import React, { useMemo } from 'react';
import {
    Check,
    Circle,
    Clock3,
    RotateCcw,
    ShieldCheck,
    UserRound,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';

const STAGES: CapaStage[] = [
    'Initiation',
    'Investigation',
    'Resolution',
    'Implementation',
    'Effectiveness Review',
    'Reference',
    'Closure',
];

interface Props {
    observation: EhsObservation;
    viewingStage: CapaStage;
    onStageSelect: (stage: CapaStage) => void;
}

export default function CapaWorkflowSidebar({
    observation,
    viewingStage,
    onStageSelect,
}: Props) {
    const { users } = useAuth();

    const stats = useMemo(() => {
        let completed = 0;
        let returned = 0;

        STAGES.forEach((stage) => {
            const status = observation.stages?.[stage]?.status;

            if (status === 'Completed') completed++;
            if (status === 'Returned') returned++;
        });

        return {
            completed,
            returned,
            pending: STAGES.length - completed,
            progress: Math.round((completed / STAGES.length) * 100),
        };
    }, [observation.stages]);

    const currentIndex = Math.max(
        0,
        STAGES.indexOf(observation.currentStage)
    );

    return (
        <aside className="flex h-full min-h-0 w-full flex-col bg-white text-[#102A43]">

            {/* =========================================================
                HEADER
            ========================================================== */}
            <div className="shrink-0 border-b border-[#E7EEF7] bg-white px-5 pb-5 pt-5">

                <div className="flex items-center gap-3">

                    {/* Shield */}
                    <div
                        className="
                            flex h-9 w-9 shrink-0 items-center justify-center
                            rounded-xl
                            bg-[#EAF3FF]
                            text-[#1769FF]
                        "
                    >
                        <ShieldCheck className="h-[17px] w-[17px]" />
                    </div>

                    <div className="min-w-0">
                        <h3
                            className="
                                text-[11px]
                                font-extrabold
                                uppercase
                                tracking-[0.18em]
                                text-[#102A43]
                            "
                        >
                            Case Workflow
                        </h3>

                        <p
                            className="
                                mt-1
                                text-[9px]
                                font-medium
                                tracking-wide
                                text-[#8A9AB0]
                            "
                        >
                            CAPA lifecycle governance
                        </p>
                    </div>
                </div>

                {/* Progress */}
                <div className="mt-6">

                    <div className="mb-2 flex items-center justify-between">
                        <span
                            className="
                                text-[9px]
                                font-extrabold
                                uppercase
                                tracking-[0.13em]
                                text-[#8092A8]
                            "
                        >
                            Total Progress
                        </span>

                        <span
                            className="
                                text-[13px]
                                font-extrabold
                                text-[#1769FF]
                            "
                        >
                            {stats.progress}%
                        </span>
                    </div>

                    <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#E8EEF6]">
                        <div
                            className="
                                h-full
                                rounded-full
                                bg-[#1769FF]
                                transition-all
                                duration-500
                            "
                            style={{
                                width: `${stats.progress}%`,
                            }}
                        />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[#9AA9BA]">
                            {stats.completed} completed
                        </span>

                        <span className="text-[8px] font-bold uppercase tracking-wider text-[#9AA9BA]">
                            {stats.pending} pending
                        </span>
                    </div>
                </div>
            </div>

            {/* =========================================================
                WORKFLOW STAGES
            ========================================================== */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-3 py-5">

                <div className="relative">

                    {/* Vertical lifecycle connector */}
                    <div
                        className="
                            pointer-events-none
                            absolute
                            left-[25px]
                            top-[27px]
                            bottom-[27px]
                            w-px
                            bg-[#DCE6F1]
                        "
                    />

                    <div className="relative space-y-1">

                        {STAGES.map((stage, index) => {
                            const stageData = observation.stages?.[stage];

                            const status =
                                stageData?.status || 'Pending';

                            const isCurrent =
                                observation.currentStage === stage;

                            const isViewing =
                                viewingStage === stage;

                            const isCompleted =
                                status === 'Completed';

                            const isReturned =
                                status === 'Returned';

                            const isFuture =
                                index > currentIndex;

                            const assignee = users.find(
                                (u) =>
                                    u.id === stageData?.assigneeId
                            );

                            return (
                                <WorkflowStage
                                    key={stage}
                                    stage={stage}
                                    index={index}
                                    status={status}
                                    isCurrent={isCurrent}
                                    isViewing={isViewing}
                                    isCompleted={isCompleted}
                                    isReturned={isReturned}
                                    isFuture={isFuture}
                                    assignee={assignee?.name}
                                    actionedAt={stageData?.actionedAt}
                                    onClick={() =>
                                        onStageSelect(stage)
                                    }
                                />
                            );
                        })}

                    </div>
                </div>
            </div>

            {/* =========================================================
                BOTTOM CURRENT-STAGE SUMMARY
            ========================================================== */}
            <div
                className="
                    shrink-0
                    border-t
                    border-[#E7EEF7]
                    bg-[#F8FAFD]
                    px-5
                    py-4
                "
            >
                <div className="flex items-center justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-2.5">

                        <div
                            className="
                                flex h-7 w-7 shrink-0
                                items-center justify-center
                                rounded-lg
                                border border-[#DCE6F1]
                                bg-white
                            "
                        >
                            <Clock3 className="h-3.5 w-3.5 text-[#70839A]" />
                        </div>

                        <div className="min-w-0">
                            <p
                                className="
                                    text-[8px]
                                    font-extrabold
                                    uppercase
                                    tracking-[0.12em]
                                    text-[#91A0B1]
                                "
                            >
                                Current Stage
                            </p>

                            <p
                                className="
                                    mt-0.5
                                    truncate
                                    text-[10px]
                                    font-extrabold
                                    text-[#102A43]
                                "
                            >
                                {observation.currentStage}
                            </p>
                        </div>
                    </div>

                    <div
                        className="
                            shrink-0
                            rounded-full
                            border
                            border-[#CFE0F8]
                            bg-[#EEF5FF]
                            px-2.5
                            py-1
                            text-[8px]
                            font-extrabold
                            uppercase
                            tracking-wider
                            text-[#1769FF]
                        "
                    >
                        {stats.progress}%
                    </div>
                </div>
            </div>
        </aside>
    );
}


/* =====================================================================
   WORKFLOW STAGE
===================================================================== */

function WorkflowStage({
    stage,
    index,
    status,
    isCurrent,
    isViewing,
    isCompleted,
    isReturned,
    isFuture,
    assignee,
    actionedAt,
    onClick,
}: {
    stage: CapaStage;
    index: number;
    status: string;
    isCurrent: boolean;
    isViewing: boolean;
    isCompleted: boolean;
    isReturned: boolean;
    isFuture: boolean;
    assignee?: string;
    actionedAt?: string;
    onClick: () => void;
}) {
    const clickable = !isFuture;

    return (
        <button
            type="button"
            disabled={!clickable}
            onClick={onClick}
            className={cn(
                `
                    relative
                    flex
                    w-full
                    items-start
                    gap-3
                    rounded-xl
                    px-2
                    py-3
                    text-left
                    transition-all
                    duration-200
                `,

                /* Active / selected stage */
                isViewing &&
                    `
                        bg-[#EEF5FF]
                        shadow-[inset_3px_0_0_#1769FF]
                    `,

                /* Hover */
                !isViewing &&
                    clickable &&
                    `
                        hover:bg-[#F7F9FC]
                    `,

                /* Future stages */
                isFuture &&
                    `
                        cursor-not-allowed
                        opacity-45
                    `
            )}
        >

            {/* =====================================================
                STAGE NODE
            ====================================================== */}
            <div
                className="
                    relative
                    z-10
                    flex
                    w-9
                    shrink-0
                    justify-center
                "
            >
                <div
                    className={cn(
                        `
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded-full
                            border
                            text-[9px]
                            font-extrabold
                            transition-all
                            duration-200
                        `,

                        /* Completed */
                        isCompleted &&
                            `
                                border-[#10A36A]
                                bg-[#10A36A]
                                text-white
                                shadow-[0_2px_5px_rgba(16,163,106,0.18)]
                            `,

                        /* Returned */
                        isReturned &&
                            `
                                border-[#EF4444]
                                bg-[#EF4444]
                                text-white
                                shadow-[0_2px_5px_rgba(239,68,68,0.18)]
                            `,

                        /* Current */
                        isCurrent &&
                            !isCompleted &&
                            !isReturned &&
                            `
                                border-[#1769FF]
                                bg-[#1769FF]
                                text-white
                                shadow-[0_3px_8px_rgba(23,105,255,0.25)]
                            `,

                        /* Pending */
                        !isCurrent &&
                            !isCompleted &&
                            !isReturned &&
                            `
                                border-[#D7E1EC]
                                bg-white
                                text-[#9BAABC]
                            `
                    )}
                >
                    {isCompleted ? (
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                    ) : isReturned ? (
                        <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                    ) : isFuture ? (
                        <Circle className="h-2.5 w-2.5 text-[#D8E1EB]" />
                    ) : (
                        index + 1
                    )}
                </div>
            </div>

            {/* =====================================================
                STAGE CONTENT
            ====================================================== */}
            <div className="min-w-0 flex-1 pt-0.5">

                <div className="flex items-center justify-between gap-2">

                    <p
                        className={cn(
                            `
                                truncate
                                text-[10px]
                                font-extrabold
                                uppercase
                                leading-tight
                                tracking-[0.035em]
                            `,

                            isCurrent &&
                                'text-[#1769FF]',

                            isCompleted &&
                                !isCurrent &&
                                'text-[#17324D]',

                            isReturned &&
                                'text-[#DC2626]',

                            !isCurrent &&
                                !isCompleted &&
                                !isReturned &&
                                'text-[#788BA1]'
                        )}
                    >
                        {stage}
                    </p>

                    {isCurrent && (
                        <span
                            className="
                                shrink-0
                                rounded-full
                                bg-[#DDEBFF]
                                px-2
                                py-[3px]
                                text-[7px]
                                font-extrabold
                                uppercase
                                tracking-wider
                                text-[#1769FF]
                            "
                        >
                            Active
                        </span>
                    )}
                </div>

                {/* Status + Date */}
                <div className="mt-1.5 flex items-center gap-2">

                    <StatusBadge
                        status={status}
                        isCompleted={isCompleted}
                        isReturned={isReturned}
                        isCurrent={isCurrent}
                    />

                    {actionedAt && (
                        <span
                            className="
                                text-[8px]
                                font-semibold
                                text-[#9AA9BA]
                            "
                        >
                            {formatStageDate(actionedAt)}
                        </span>
                    )}
                </div>

                {/* Assignee */}
                {isCurrent && assignee && (
                    <div
                        className="
                            mt-2
                            flex
                            min-w-0
                            items-center
                            gap-1.5
                            text-[8px]
                            font-bold
                            uppercase
                            tracking-wider
                            text-[#657A91]
                        "
                    >
                        <UserRound className="h-3 w-3 shrink-0 text-[#1769FF]" />

                        <span className="truncate">
                            {assignee}
                        </span>
                    </div>
                )}
            </div>
        </button>
    );
}


/* =====================================================================
   STATUS BADGE
===================================================================== */

function StatusBadge({
    status,
    isCompleted,
    isReturned,
    isCurrent,
}: {
    status: string;
    isCompleted: boolean;
    isReturned: boolean;
    isCurrent: boolean;
}) {
    return (
        <span
            className={cn(
                `
                    inline-flex
                    items-center
                    rounded-full
                    px-1.5
                    py-[3px]
                    text-[7px]
                    font-extrabold
                    uppercase
                    tracking-wider
                `,

                isCompleted &&
                    `
                        bg-[#E8F8F1]
                        text-[#07885A]
                    `,

                isReturned &&
                    `
                        bg-[#FEECEC]
                        text-[#D92D3A]
                    `,

                isCurrent &&
                    !isCompleted &&
                    !isReturned &&
                    `
                        bg-[#EAF2FF]
                        text-[#1769FF]
                    `,

                !isCompleted &&
                    !isReturned &&
                    !isCurrent &&
                    `
                        bg-[#F1F4F8]
                        text-[#8B9AAD]
                    `
            )}
        >
            {status}
        </span>
    );
}


/* =====================================================================
   DATE FORMATTER
===================================================================== */

function formatStageDate(value?: string) {
    if (!value) return '';

    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
        });
    } catch {
        return '';
    }
}