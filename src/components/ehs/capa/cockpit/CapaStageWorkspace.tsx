'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Clock, 
    UserPlus, 
    FileText, 
    MapPin, 
    Download, 
    File, 
    Trash2,
    Search,
    UploadCloud,
    Paperclip,
    ShieldCheck,
    GitBranch,
    LayoutGrid,
    CheckCircle2
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Phase-Specific Components
import CapaInvestigation from '../stages/CapaInvestigation';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { assignStageOwner, addStageAttachment, deleteStageAttachment } = useEhs();
    
    const sData = observation.stages[stage];
    
    const [isUploading, setIsUploading] = useState(false);

    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted;

    const currentOwner = users.find(u => u.id === sData?.assigneeId);
    const attachments = useMemo(() => {
        if (!sData?.attachments) return [];
        return Object.values(sData.attachments).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    }, [sData]);

    return (
        <div className="space-y-6">
            {/* Phase Context Card */}
            <Card className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50/80 px-8 py-6 border-b flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/20">
                            0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{stage}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Determine what happened, why it happened and identify root cause.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 text-right">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">OWNER</p>
                            <div className="flex items-center gap-3">
                                <div className="leading-tight">
                                    <p className="text-xs font-black text-slate-900 uppercase">{currentOwner?.name || 'UNASSIGNED'}</p>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase">Supervisor</p>
                                </div>
                                <Avatar className="h-8 w-8 border shadow-sm">
                                    <AvatarImage src={currentOwner?.avatar} />
                                    <AvatarFallback className="text-[10px] font-black">{currentOwner?.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-slate-200" />
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TARGET DELIVERY</p>
                            <p className="text-xs font-black text-slate-900 flex items-center justify-end gap-2">
                                <Clock className="h-3.5 w-3.5 text-blue-600" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM yyyy') : 'TBD'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    <Tabs defaultValue="summary" className="w-full">
                        <div className="px-8 border-b bg-white">
                            <TabsList className="h-12 w-full justify-start gap-8 bg-transparent p-0">
                                {[
                                    { id: 'summary', label: 'Investigation Summary', icon: FileText },
                                    { id: '5why', label: '5-Why Root Cause', icon: GitBranch },
                                    { id: 'systemic', label: 'Systemic Root Cause', icon: LayoutGrid },
                                    { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 },
                                ].map(tab => (
                                    <TabsTrigger 
                                        key={tab.id} 
                                        value={tab.id}
                                        className="h-12 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                                    >
                                        <tab.icon className="mr-2 h-3.5 w-3.5" /> {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="summary" className="p-8 m-0 animate-in fade-in duration-500">
                            <CapaInvestigation observation={observation} isLocked={isLocked} />
                        </TabsContent>
                    </Tabs>

                    {/* Evidence Ledger Integrated Inside Card */}
                    <div className="px-8 pb-8 space-y-6">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-3">
                                <Paperclip className="h-4 w-4 text-blue-600" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">PHASE DOCUMENT LEDGER</h4>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Upload relevant documents, images or evidence</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                {attachments.length > 0 ? attachments.map(a => (
                                    <div key={a.id} className="p-3 border rounded-xl bg-white flex items-center justify-between shadow-sm group hover:border-blue-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
                                                <File className="h-5 w-5 text-rose-500" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{a.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{format(parseISO(a.uploadedAt), 'dd MMM yyyy, HH:mm')} &middot; 245 KB</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" asChild>
                                                <a href={a.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => deleteStageAttachment(observation.id, stage, a.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center opacity-40 grayscale">
                                        <FileText className="h-8 w-8 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No documents attached</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="h-full min-h-[120px] border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-blue-50 transition-all">
                                <div className="h-10 w-10 rounded-full bg-white border shadow-sm flex items-center justify-center">
                                    <UploadCloud className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Drag and drop files here</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">or click to browse</p>
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Supported: PDF, DOC, XLS, JPG, PNG (Max 50MB)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function UploadCloud(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  )
}
