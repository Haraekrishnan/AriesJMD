
'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
    Clock, 
    FileText, 
    Download, 
    File, 
    Trash2,
    Paperclip,
    ShieldCheck,
    CheckCircle2,
    LayoutGrid,
    Target,
    Users,
    Edit3,
    Activity,
    Plus,
    UploadCloud,
    ExternalLink
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Phase-Specific Components
import CapaInvestigation from '../stages/CapaInvestigation';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { users } = useAuth();
    const sData = observation.stages[stage];
    const isLocked = sData?.status === 'Completed' || sData?.status === 'In Progress';

    const currentOwner = users.find(u => u.id === sData?.assigneeId);

    return (
        <div className="space-y-6">
            {/* Phase Header Card */}
            <Card className="bg-white border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-8 py-6 border-b flex justify-between items-center bg-white">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20 animate-in zoom-in duration-500">
                            0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-none">{stage}</h2>
                            <p className="text-[11px] font-medium text-slate-500 tracking-normal mt-1.5">
                                {stage === 'Investigation' ? 'Determine what happened, why it happened and identify the root cause.' : 'Phase execution and management.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">OWNER</p>
                            <div className="flex items-center gap-3">
                                <div className="leading-tight">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{currentOwner?.name || 'UNASSIGNED'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Not Supervisor</p>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                                    <AvatarImage src={currentOwner?.avatar} />
                                    <AvatarFallback className="text-[10px] font-black bg-blue-50 text-blue-600">{currentOwner?.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <div className="h-12 w-px bg-slate-200" />
                        <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TARGET DELIVERY</p>
                            <p className="text-base font-black text-slate-900 flex items-center justify-end gap-2 text-blue-600 tracking-tighter">
                                <Clock className="h-4 w-4" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM yyyy') : 'TBD'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    <Tabs defaultValue="summary" className="w-full">
                        <div className="px-8 bg-slate-50/50 border-b">
                            <TabsList className="h-12 w-full justify-start gap-10 bg-transparent p-0">
                                {[
                                    { id: 'summary', label: 'Investigation Summary', icon: FileText },
                                    { id: '5why', label: '5-Why Root Cause', icon: Activity },
                                    { id: 'systemic', label: 'Systemic Root Cause', icon: Target },
                                    { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 },
                                ].map(tab => (
                                    <TabsTrigger 
                                        key={tab.id} 
                                        value={tab.id}
                                        className="h-12 rounded-none border-b-2 border-transparent px-0 text-[11px] font-bold uppercase tracking-tight text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none transition-all"
                                    >
                                        <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="summary" className="p-10 m-0 animate-in fade-in slide-in-from-bottom-2 duration-700">
                            <CapaInvestigation observation={observation} isLocked={isLocked} />
                        </TabsContent>
                        
                        <TabsContent value="5why" className="p-10 m-0">
                             <div className="py-20 text-center opacity-30">
                                <Activity className="h-12 w-12 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">5-Why Analysis Ledger Offline</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </Card>

            {/* Evidence Ledger Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pl-1">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">PHASE EVIDENCE LEDGER</h4>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white border-slate-200 rounded-2xl shadow-sm p-4 flex items-center justify-between group hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">VEG 1.PDF</p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">17 SEP 2026, 18:57 &middot; 245 KB</p>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-blue-50 text-blue-600"><Download className="h-4.5 w-4.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="h-4.5 w-4.5" /></Button>
                        </div>
                    </Card>
                    
                    <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UploadCloud className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-[11px] font-black text-slate-900 uppercase">Drag and drop files here</p>
                            <p className="text-[10px] font-medium text-slate-400">or click to browse</p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Supported: PDF, DOC, XLS, JPG, PNG (Max 50MB)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
