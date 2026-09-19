'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
    CheckCircle2, 
    Circle, 
    Activity, 
    Target, 
    Truck, 
    History, 
    ShieldCheck,
    Clock,
    Lock
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const WORKFLOW: { id: CapaStage; icon: any; label: string; date?: string; owner?: string; status: 'Completed' | 'Active' | 'Pending' }[] = [
    { id: 'Initiation', icon: CheckCircle2, label: 'Initiation', date: '15 Sep 2026', status: 'Completed' },
    { id: 'Investigation', icon: Activity, label: 'Investigation', status: 'Active', owner: 'Mujeeb' },
    { id: 'Resolution', icon: Target, label: 'Resolution', status: 'Pending' },
    { id: 'Implementation', icon: Truck, label: 'Implementation', status: 'Pending' },
    { id: 'Effectiveness Review', icon: ShieldCheck, label: 'Effectiveness Review', status: 'Pending' },
    { id: 'Reference', icon: History, label: 'Reference', status: 'Pending' },
    { id: 'Closure', icon: Lock, label: 'Closure', status: 'Pending' }
];

export default function CapaLeftSidebar({ observation }: { observation: EhsObservation }) {
    return (
        <div className="flex flex-col h-full py-6">
            <div className="px-6 mb-8">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> CASE WORKFLOW
                </h3>
                
                <div className="space-y-1">
                    {WORKFLOW.map((item) => (
                        <div 
                            key={item.id}
                            className={cn(
                                "flex items-start gap-4 p-4 rounded-lg transition-all",
                                item.status === 'Active' ? "bg-blue-50 border border-blue-100" : "hover:bg-slate-50"
                            )}
                        >
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0",
                                item.status === 'Completed' ? "bg-emerald-500 border-emerald-500 text-white" :
                                item.status === 'Active' ? "bg-blue-600 border-blue-600 text-white shadow-sm" :
                                "bg-white border-slate-200 text-slate-300"
                            )}>
                                <span className="text-[11px] font-black">{WORKFLOW.indexOf(item) + 1}</span>
                            </div>
                            <div className="min-w-0">
                                <p className={cn(
                                    "text-xs font-black uppercase tracking-widest",
                                    item.status === 'Active' ? "text-blue-700" : "text-slate-600"
                                )}>
                                    {item.label}
                                </p>
                                <div className="mt-1">
                                    <p className={cn(
                                        "text-[9px] font-bold uppercase",
                                        item.status === 'Completed' ? "text-emerald-600" : 
                                        item.status === 'Active' ? "text-blue-600" : "text-slate-400"
                                    )}>
                                        {item.status === 'Active' ? `Active` : item.status}
                                    </p>
                                    {item.owner && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">👤 {item.owner}</p>}
                                    {item.date && <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">{item.date}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto px-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">CASE PROGRESS</span>
                    <span className="text-xl font-black text-blue-600">14%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border mb-6">
                    <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: '14%' }} />
                </div>
                
                <div className="grid grid-cols-2 gap-y-3">
                    <LegendItem color="bg-emerald-500" label="Completed" value="1" />
                    <LegendItem color="bg-blue-600" label="Active" value="1" />
                    <LegendItem color="bg-slate-300" label="Pending" value="5" />
                    <LegendItem color="bg-rose-500" label="Rework" value="0" />
                </div>
            </div>
        </div>
    );
}

function LegendItem({ color, label, value }: { color: string, label: string, value: string }) {
    return (
        <div className="flex items-center justify-between pr-2">
            <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
                <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">{label}</span>
            </div>
            <span className="text-[10px] font-black text-slate-800">{value}</span>
        </div>
    );
}
