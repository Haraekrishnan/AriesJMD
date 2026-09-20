'use client';
import { Check } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { CAPA_STAGES } from '@/lib/ehs-observations';
import { cn } from '@/lib/utils';
export default function CapaLifecycleStepper({observation, viewingStage, onStageSelect}: {observation:EhsObservation;viewingStage:CapaStage;onStageSelect:(stage:CapaStage)=>void}) {
 return <nav aria-label="Case lifecycle" className="flex min-w-[1000px] flex-1 items-stretch gap-1">
  {CAPA_STAGES.map((stage,i) => {
   const record=observation.stages[stage]; const complete=record?.status==='Completed'; const current=stage===observation.currentStage;
   const disabled=i>CAPA_STAGES.indexOf(observation.currentStage) && !complete;
   const selected=stage===viewingStage;
   return <button key={stage} disabled={disabled} aria-current={selected?'step':undefined} onClick={()=>onStageSelect(stage)} className={cn('flex flex-1 items-center gap-2 border-b-2 px-3 py-4 text-left transition-colors',selected?'border-blue-600 bg-blue-50/50':'border-transparent hover:bg-slate-50',disabled && 'cursor-not-allowed text-slate-400')}>
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',complete?'border-emerald-500 bg-emerald-500 text-white':current?'border-blue-600 bg-blue-600 text-white':'border-slate-200 bg-white text-slate-400')}>{complete?<Check className="h-4 w-4" />:i+1}</span>
    <span><span className={cn('block text-xs font-semibold leading-5',selected?'text-blue-600':'')}>{stage}</span><span className={cn('block text-[11px] leading-5',complete?'text-emerald-600':'text-slate-500')}>{complete?'Verified':record?.status==='Returned'?'Rework required':record?.status==='In Progress'?'Awaiting review':current?'In progress':'Pending'}</span></span>
   </button>;
  })}
 </nav>;
}
