'use client';
import { useFormContext } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
export default function Capa5Why({isLocked}:{isLocked:boolean}) {
 const {register}=useFormContext();
 return <div className="space-y-5"><div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4"><Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><p className="text-sm font-semibold">Trace each answer back to its cause.</p><p className="mt-1 text-sm text-slate-500">Start with what happened. Each answer should explain the preceding step.</p></div></div>
  <div className="space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="flex gap-4"><div className="relative flex w-9 shrink-0 justify-center pt-1"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">{i}</span>{i<5&&<span className="absolute bottom-[-12px] top-10 w-px bg-blue-100" />}</div><div className="min-w-0 flex-1"><Label htmlFor={'why-'+i} className="mb-2 block text-sm font-medium">Why {i}{i===5?' · Root cause':''}</Label><Textarea id={'why-'+i} disabled={isLocked} {...register('why'+i)} placeholder={i===1?'Why did this happen?':'Why did the previous cause occur?'} className="min-h-[64px] resize-y bg-slate-50/50 text-sm font-normal" /></div></div>)}</div>
 </div>;
}
