'use client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Save, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useFormContext } from 'react-hook-form';
export default function CapaActionFooter({observation,stage,onNext}:{observation:EhsObservation;stage:CapaStage;onNext?:()=>void}) {
 const {user}=useAuth();const {actionStage}=useEhs();const {getValues}=useFormContext();
 const record=observation.stages[stage];const complete=record?.status==='Completed';const submitted=record?.status==='In Progress';const returned=record?.status==='Returned';
 const canAct=!!user?.id && user.id===record?.assigneeId && !complete && !submitted && stage===observation.currentStage;
 const Icon=complete?CheckCircle2:returned?RotateCcw:Clock;
 const title=complete?'Verified stage':submitted?'Awaiting review':returned?'Rework required':'Stage in progress';
 return <div className="flex flex-wrap items-center justify-between gap-4">
  <div className="flex items-center gap-3"><span className={complete?'rounded-full bg-emerald-50 p-2 text-emerald-600':'rounded-full bg-blue-50 p-2 text-blue-600'}><Icon className="h-5 w-5" /></span><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-slate-500">{complete?stage+' has been reviewed and verified.':submitted?'Submitted for supervisor verification.':canAct?'Save your progress or submit this stage for review.':'Only the assigned owner can submit this stage.'}</p></div></div>
  <div className="flex items-center gap-2">{canAct&&<><Button variant="outline" className="gap-2" onClick={()=>actionStage(observation.id,stage,getValues(),false)}><Save className="h-4 w-4" />Save draft</Button><Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={()=>actionStage(observation.id,stage,getValues(),true)}>Submit for review<ArrowRight className="h-4 w-4" /></Button></>}{!canAct&&onNext&&<Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700" onClick={onNext}>Next stage<ArrowRight className="h-4 w-4" /></Button>}</div>
 </div>;
}
