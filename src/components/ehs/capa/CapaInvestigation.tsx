'use client';

import React from 'react';
import {
    Activity,
    AlertTriangle,
    CalendarDays,
    Clock3,
    MapPin,
    MessageSquare,
    Search,
    ShieldAlert,
    UserRound,
    ChevronRight,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

import type { EhsObservation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';

interface CapaInvestigationProps {
    observation: EhsObservation;
    isLocked: boolean;
}

export default function CapaInvestigation({
    observation,
    isLocked,
}: CapaInvestigationProps) {
    const sData = observation.stages?.Investigation;
    const { actionStage } = useEhs();

    const data = sData?.data || {};

    const handleSubmit = async () => {
        await actionStage(
            observation.id,
            'Investigation',
            {
                submitted: true,
            }
        );
    };

    return (
        <div className="w-full">

            {/* =========================================================
                MAIN INVESTIGATION WORKSPACE
                ========================================================= */}

            <section className="overflow-hidden rounded-[18px] border border-[#D9E2EC] bg-white shadow-[0_2px_12px_rgba(16,42,67,0.04)]">

                {/* -----------------------------------------------------
                    WORKSPACE HEADER
                    ----------------------------------------------------- */}

                <div className="border-b border-[#E5EBF2] bg-white px-7 py-6">

                    <div className="flex items-center justify-between gap-6">

                        <div className="flex items-center gap-4">

                            {/* Stage number */}
                            <div className="
                                flex
                                h-[54px]
                                w-[54px]
                                shrink-0
                                items-center
                                justify-center
                                rounded-[15px]
                                bg-[#1769FF]
                                text-[21px]
                                font-extrabold
                                text-white
                                shadow-[0_8px_20px_rgba(23,105,255,0.20)]
                            ">
                                02
                            </div>

                            <div>

                                <div className="mb-1.5 flex items-center gap-2">

                                    <span className="
                                        rounded-full
                                        bg-[#E7F0FF]
                                        px-3
                                        py-1
                                        text-[8px]
                                        font-extrabold
                                        uppercase
                                        tracking-[0.12em]
                                        text-[#1769FF]
                                    ">
                                        Technical Action Required
                                    </span>

                                </div>

                                <h2 className="
                                    text-[25px]
                                    font-extrabold
                                    uppercase
                                    leading-none
                                    tracking-[-0.025em]
                                    text-[#071B33]
                                ">
                                    Investigation
                                </h2>

                            </div>

                        </div>

                        {/* Ownership / deadline */}
                        <div className="flex items-center gap-7">

                            <div className="hidden text-right sm:block">

                                <p className="
                                    text-[8px]
                                    font-extrabold
                                    uppercase
                                    tracking-[0.14em]
                                    text-[#8A9AAF]
                                ">
                                    Ownership
                                </p>

                                <p className="
                                    mt-1
                                    text-[10px]
                                    font-extrabold
                                    uppercase
                                    text-[#102A43]
                                ">
                                    {sData?.assigneeId ? 'Assigned' : 'Unassigned'}
                                </p>

                            </div>

                            <div className="hidden h-9 w-px bg-[#E5EBF2] md:block" />

                            <div className="text-right">

                                <p className="
                                    text-[8px]
                                    font-extrabold
                                    uppercase
                                    tracking-[0.14em]
                                    text-[#8A9AAF]
                                ">
                                    Target Delivery
                                </p>

                                <p className="
                                    mt-1
                                    flex
                                    items-center
                                    justify-end
                                    gap-1.5
                                    text-[11px]
                                    font-extrabold
                                    uppercase
                                    text-[#102A43]
                                ">
                                    <Clock3 className="h-3.5 w-3.5 text-[#1769FF]" />
                                    TBD
                                </p>

                            </div>

                        </div>

                    </div>

                </div>


                {/* -----------------------------------------------------
                    INTERNAL INVESTIGATION NAVIGATION
                    ----------------------------------------------------- */}

                <div className="px-7 pt-5">

                    <div className="
                        flex
                        h-[52px]
                        items-center
                        gap-1
                        overflow-x-auto
                        rounded-[14px]
                        border
                        border-[#E5EBF2]
                        bg-[#F7F9FC]
                        px-2
                    ">

                        <WorkspaceTab
                            icon={Search}
                            label="Summary"
                            active
                        />

                        <WorkspaceTab
                            label="5-Why Analysis"
                        />

                        <WorkspaceTab
                            label="Root Cause"
                        />

                        <WorkspaceTab
                            label="Fishbone"
                        />

                        <WorkspaceTab
                            label="Timeline"
                        />

                        <WorkspaceTab
                            label="Conclusion"
                        />

                    </div>

                </div>


                {/* -----------------------------------------------------
                    SUMMARY CONTENT
                    ----------------------------------------------------- */}

                <div className="grid grid-cols-1 gap-10 px-7 py-7 xl:grid-cols-2">

                    {/* =================================================
                        LEFT COLUMN
                        ================================================= */}

                    <div>

                        <SectionHeading
                            icon={Activity}
                            title="Technical Logistics"
                        />

                        <div className="space-y-6">

                            <FieldItem
                                icon={UserRound}
                                label="Who was involved?"
                                required
                                value={data.who}
                                placeholder="Personnel, contractors, or departments..."
                                isLocked={isLocked}
                            />

                            <FieldItem
                                icon={MapPin}
                                label="Exact site position"
                                required
                                value={data.where}
                                placeholder="Specific deck, unit, workshop or coordinate..."
                                isLocked={isLocked}
                            />

                            {/* Date / time */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                <FieldItem
                                    icon={CalendarDays}
                                    label="Discovery date"
                                    required
                                    value={extractDate(data.when)}
                                    placeholder="dd-mm-yyyy"
                                    isLocked={isLocked}
                                />

                                <FieldItem
                                    icon={Clock3}
                                    label="Discovery time"
                                    value={extractTime(data.when)}
                                    placeholder="--:--"
                                    isLocked={isLocked}
                                />

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        RIGHT COLUMN
                        ================================================= */}

                    <div>

                        <SectionHeading
                            icon={MessageSquare}
                            title="Narrative Context"
                        />

                        <div className="space-y-6">

                            <TextAreaField
                                icon={MessageSquare}
                                label="Sequence of events (How?)"
                                required
                                value={data.sequence || ''}
                                placeholder="Describe the chronological sequence of events..."
                                isLocked={isLocked}
                                minHeight="104px"
                            />

                            <TextAreaField
                                icon={Activity}
                                label="Activity during discovery"
                                value={data.how}
                                placeholder="What was being done at the time of the incident..."
                                isLocked={isLocked}
                                minHeight="104px"
                            />

                            <TextAreaField
                                icon={AlertTriangle}
                                label="Immediate finding"
                                required
                                value={data.immediateCause}
                                placeholder="State the direct reason for the unsafe act or unsafe condition..."
                                isLocked={isLocked}
                                minHeight="104px"
                                danger
                            />

                        </div>

                    </div>

                </div>


                {/* =====================================================
                    5 WHY SECTION
                    ===================================================== */}

                <div className="border-t border-[#E7EDF4] px-7 py-7">

                    <div className="mb-6 flex items-center justify-between gap-4">

                        <SectionHeading
                            icon={ShieldAlert}
                            title="Root Cause Analysis"
                            inline
                        />

                        <span className="
                            hidden
                            text-[8px]
                            font-bold
                            uppercase
                            tracking-[0.12em]
                            text-[#94A3B8]
                            md:block
                        ">
                            Keep asking why until a systemic failure is identified
                        </span>

                    </div>

                    <div className="
                        rounded-[13px]
                        border
                        border-[#DDE8F5]
                        bg-[#F7FAFF]
                        px-5
                        py-4
                    ">

                        <div className="flex items-start gap-3">

                            <div className="
                                mt-0.5
                                flex
                                h-7
                                w-7
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                bg-[#E5EFFF]
                            ">
                                <ShieldAlert className="h-3.5 w-3.5 text-[#1769FF]" />
                            </div>

                            <div>

                                <p className="
                                    text-[9px]
                                    font-extrabold
                                    uppercase
                                    tracking-[0.12em]
                                    text-[#1769FF]
                                ">
                                    Investigation principle
                                </p>

                                <p className="
                                    mt-1
                                    max-w-3xl
                                    text-[10px]
                                    leading-5
                                    text-[#486581]
                                ">
                                    Do not stop at the immediate finding. Continue the
                                    analysis until the underlying procedural, human,
                                    equipment or management-system failure is identified.
                                </p>

                            </div>

                        </div>

                    </div>


                    <div className="mt-5 space-y-3">

                        {[1, 2, 3, 4, 5].map((number) => (
                            <WhyRow
                                key={number}
                                number={number}
                                value={data[`why${number}`]}
                                isLocked={isLocked}
                            />
                        ))}

                    </div>

                </div>


                {/* =====================================================
                    COMPLETION / LOCKED STATE
                    ===================================================== */}

                {isLocked && (
                    <div className="
                        mx-7
                        mb-7
                        rounded-[12px]
                        border
                        border-[#D9E2EC]
                        bg-[#F8FAFC]
                        px-5
                        py-4
                    ">

                        <div className="flex items-center gap-3">

                            <div className="
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                bg-[#E8EDF3]
                            ">
                                <ShieldAlert className="h-4 w-4 text-[#64748B]" />
                            </div>

                            <div>

                                <p className="
                                    text-[9px]
                                    font-extrabold
                                    uppercase
                                    tracking-[0.12em]
                                    text-[#334E68]
                                ">
                                    Investigation Submitted
                                </p>

                                <p className="
                                    mt-0.5
                                    text-[10px]
                                    text-[#829AB1]
                                ">
                                    This investigation has been submitted and is currently
                                    locked for editing.
                                </p>

                            </div>

                        </div>

                    </div>
                )}


                {/* =====================================================
                    SUBMIT AREA
                    ===================================================== */}

                {!isLocked && (

                    <div className="
                        flex
                        flex-col
                        gap-4
                        border-t
                        border-[#E7EDF4]
                        bg-[#FBFCFE]
                        px-7
                        py-5
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    ">

                        <div>

                            <p className="
                                text-[9px]
                                font-extrabold
                                uppercase
                                tracking-[0.14em]
                                text-[#52667A]
                            ">
                                Investigation Stage
                            </p>

                            <p className="
                                mt-1
                                text-[10px]
                                text-[#94A3B8]
                            ">
                                Review all technical findings before submission.
                            </p>

                        </div>

                        <Button
                            type="button"
                            onClick={handleSubmit}
                            className="
                                h-11
                                rounded-[10px]
                                bg-[#1769FF]
                                px-7
                                text-[9px]
                                font-extrabold
                                uppercase
                                tracking-[0.12em]
                                text-white
                                shadow-[0_6px_16px_rgba(23,105,255,0.20)]
                                transition-all
                                hover:bg-[#0D5CE5]
                                hover:shadow-[0_8px_20px_rgba(23,105,255,0.25)]
                            "
                        >
                            Submit Investigation
                            <ChevronRight className="ml-2 h-3.5 w-3.5" />
                        </Button>

                    </div>

                )}

            </section>

        </div>
    );
}


/* ================================================================
   WORKSPACE TAB
   ================================================================ */

function WorkspaceTab({
    icon: Icon,
    label,
    active = false,
}: {
    icon?: React.ElementType;
    label: string;
    active?: boolean;
}) {
    return (
        <button
            type="button"
            className={cn(
                `
                flex
                h-9
                shrink-0
                items-center
                gap-2
                rounded-[9px]
                px-4
                text-[8px]
                font-extrabold
                uppercase
                tracking-[0.08em]
                transition-all
                `,
                active
                    ? `
                        bg-white
                        text-[#1769FF]
                        shadow-[0_2px_7px_rgba(16,42,67,0.08)]
                    `
                    : `
                        text-[#7B8EA5]
                        hover:bg-white
                        hover:text-[#1769FF]
                    `
            )}
        >
            {Icon && <Icon className="h-3 w-3" />}
            {label}
        </button>
    );
}


/* ================================================================
   SECTION HEADING
   ================================================================ */

function SectionHeading({
    icon: Icon,
    title,
    inline = false,
}: {
    icon: React.ElementType;
    title: string;
    inline?: boolean;
}) {
    return (
        <div
            className={cn(
                "mb-6",
                inline && "mb-0"
            )}
        >

            <div className="flex items-center gap-2.5">

                <Icon className="h-3.5 w-3.5 text-[#1769FF]" />

                <h3 className="
                    text-[9px]
                    font-extrabold
                    uppercase
                    tracking-[0.25em]
                    text-[#0D3B66]
                ">
                    {title}
                </h3>

            </div>

            {!inline && (
                <div className="
                    mt-3
                    h-px
                    w-full
                    bg-[#DCE6F0]
                " />
            )}

        </div>
    );
}


/* ================================================================
   INPUT FIELD
   ================================================================ */

function FieldItem({
    icon: Icon,
    label,
    value,
    placeholder,
    required = false,
    isLocked,
}: {
    icon: React.ElementType;
    label: string;
    value?: any;
    placeholder: string;
    required?: boolean;
    isLocked: boolean;
}) {
    return (
        <div className="space-y-2.5">

            <Label className="
                flex
                items-center
                gap-1.5
                text-[9px]
                font-extrabold
                uppercase
                tracking-[0.16em]
                text-[#304B68]
            ">

                <Icon className="h-3 w-3 text-[#7A9ABB]" />

                {label}

                {required && (
                    <span className="text-red-500">*</span>
                )}

            </Label>

            <Input
                disabled={isLocked}
                defaultValue={value ?? ''}
                placeholder={placeholder}
                className="
                    h-[42px]
                    rounded-[10px]
                    border
                    border-[#DCE5EF]
                    bg-white
                    px-3.5
                    text-[10px]
                    font-medium
                    text-[#243B53]
                    shadow-[0_1px_3px_rgba(16,42,67,0.03)]
                    placeholder:text-[#9AAABD]
                    focus-visible:border-[#1769FF]
                    focus-visible:ring-2
                    focus-visible:ring-[#DCEAFF]
                    disabled:bg-[#F8FAFC]
                    disabled:text-[#64748B]
                "
            />

        </div>
    );
}


/* ================================================================
   TEXT AREA
   ================================================================ */

function TextAreaField({
    icon: Icon,
    label,
    value,
    placeholder,
    required = false,
    isLocked,
    minHeight = '104px',
    danger = false,
}: {
    icon: React.ElementType;
    label: string;
    value?: any;
    placeholder: string;
    required?: boolean;
    isLocked: boolean;
    minHeight?: string;
    danger?: boolean;
}) {
    return (
        <div className="space-y-2.5">

            <Label className="
                flex
                items-center
                gap-1.5
                text-[9px]
                font-extrabold
                uppercase
                tracking-[0.16em]
                text-[#304B68]
            ">

                <Icon
                    className={cn(
                        "h-3 w-3",
                        danger
                            ? "text-red-500"
                            : "text-[#7A9ABB]"
                    )}
                />

                {label}

                {required && (
                    <span className="text-red-500">*</span>
                )}

            </Label>

            <Textarea
                disabled={isLocked}
                defaultValue={value ?? ''}
                placeholder={placeholder}
                style={{ minHeight }}
                className="
                    resize-y
                    rounded-[10px]
                    border
                    border-[#DCE5EF]
                    bg-white
                    px-3.5
                    py-3
                    text-[10px]
                    font-medium
                    leading-5
                    text-[#243B53]
                    shadow-[0_1px_3px_rgba(16,42,67,0.03)]
                    placeholder:text-[#9AAABD]
                    focus-visible:border-[#1769FF]
                    focus-visible:ring-2
                    focus-visible:ring-[#DCEAFF]
                    disabled:bg-[#F8FAFC]
                    disabled:text-[#64748B]
                "
            />

        </div>
    );
}


/* ================================================================
   5-WHY ROW
   ================================================================ */

function WhyRow({
    number,
    value,
    isLocked,
}: {
    number: number;
    value?: any;
    isLocked: boolean;
}) {
    return (
        <div className="grid grid-cols-[34px_1fr] items-start gap-3">

            <div
                className={cn(
                    `
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-[9px]
                    text-[9px]
                    font-extrabold
                    `,
                    number === 1
                        ? "bg-[#0D3B66] text-white"
                        : "border border-[#DCE5EF] bg-white text-[#60758A]"
                )}
            >
                W{number}
            </div>

            <div className="relative">

                <Input
                    disabled={isLocked}
                    defaultValue={value ?? ''}
                    placeholder={
                        number === 1
                            ? 'Why did the immediate finding occur?'
                            : 'Why did the previous cause occur?'
                    }
                    className="
                        h-[42px]
                        rounded-[10px]
                        border
                        border-[#DCE5EF]
                        bg-white
                        px-4
                        text-[10px]
                        font-medium
                        text-[#243B53]
                        shadow-[0_1px_3px_rgba(16,42,67,0.03)]
                        placeholder:text-[#9AAABD]
                        focus-visible:border-[#1769FF]
                        focus-visible:ring-2
                        focus-visible:ring-[#DCEAFF]
                        disabled:bg-[#F8FAFC]
                    "
                />

                {number < 5 && (
                    <div className="
                        absolute
                        left-[15px]
                        top-full
                        h-3
                        w-px
                        bg-[#DCE5EF]
                    " />
                )}

            </div>

        </div>
    );
}


/* ================================================================
   DATE / TIME HELPERS
   ================================================================ */

function extractDate(value: any) {
    if (!value || typeof value !== 'string') return '';

    if (value.includes('T')) {
        return value.split('T')[0];
    }

    return value;
}

function extractTime(value: any) {
    if (!value || typeof value !== 'string') return '';

    if (value.includes('T')) {
        const time = value.split('T')[1];

        return time ? time.slice(0, 5) : '';
    }

    return '';
}