'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Clock, 
    FileText, 
    ShieldCheck,
    Edit3,
    Search,
    Zap,
    CheckCircle2,
    Activity
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Phase-Specific Components
import CapaInvestigationWorkspace from './CapaInvestigationWorkspace';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user, users } = useAuth();
    const sData = observation.stages[stage];
    
    const isLocked = sData?.status === 'Completed' || sData?.status === 'In Progress';
    const currentOwner = users.find(u => u.id === sData?.assigneeId);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
            {/* --- PHASE IDENTIFIER --- */}
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-500/20">
                        0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                    </div>
                    <div className="space-y-1">
                        <Badge className="bg-blue-600 text-white border-none font-black text-[9px] px-3 h-5 rounded-lg tracking-widest uppercase mb-1">TECHNICAL ACTION REQUIRED</Badge>
                        <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">{stage}</h3>
                    </div>
                </div>

                <div className="text-right space-y-1.5 pr-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">PHASE OWNER</p>
                    <div className="flex items-center gap-4">
                        <div className="leading-tight">
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{currentOwner?.name || 'RINTU GOGOI'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Operational Lead</p>
                        </div>
                        <Avatar className="h-12 w-12 border-2 border-white shadow-xl ring-2 ring-slate-100">
                            <AvatarImage src={currentOwner?.avatar} />
                            <AvatarFallback className="text-[12px] font-black bg-blue-50 text-blue-600">{currentOwner?.name?.[0] || 'RG'}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </div>

            {/* --- WORKBENCH TABS --- */}
            <Card className="bg-white border-none rounded-[2.5rem] shadow-xl overflow-hidden ring-1 ring-slate-100">
                <Tabs defaultValue="summary" className="w-full">
                    <div className="bg-slate-50/50 border-b px-10">
                        <TabsList className="h-16 w-full justify-start gap-12 bg-transparent p-0">
                            {[
                                { id: 'summary', label: 'Technical Summary', icon: FileText },
                                { id: '5why', label: '5-Why Analysis', icon: Activity },
                                { id: 'rootcause', label: 'Systemic Root Cause', icon: Zap },
                                { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id}
                                    className="h-16 rounded-none border-b-4 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                                >
                                    <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    
                    <div className="p-10 m-0 outline-none">
                        <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                            <CapaInvestigationWorkspace observation={observation} />
                        </TabsContent>
                        <TabsContent value="5why" className="m-0">
                            <div className="py-20 text-center opacity-30 font-black uppercase text-xs tracking-[0.3em]">Causal Chain Editor Offline</div>
                        </TabsContent>
                        <TabsContent value="rootcause" className="m-0">
                            <div className="py-20 text-center opacity-30 font-black uppercase text-xs tracking-[0.3em]">Systemic Ledger Offline</div>
                        </TabsContent>
                        <TabsContent value="conclusion" className="m-0">
                            <div className="py-20 text-center opacity-30 font-black uppercase text-xs tracking-[0.3em]">Phase Conclusion Register Offline</div>
                        </TabsContent>
                    </div>
                </Tabs>
            </Card>
        </div>
    );
}