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
    UserPlus, 
    FileText, 
    MapPin, 
    Download, 
    File, 
    Trash2,
    Search,
    Paperclip,
    ShieldCheck,
    GitBranch,
    LayoutGrid,
    CheckCircle2,
    ArrowDown
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Phase-Specific Components
import CapaInvestigation from '../stages/CapaInvestigation';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user, users } = useAuth();
    const { deleteStageAttachment } = useEhs();
    
    const sData = observation.stages[stage];
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted;

    const currentOwner = users.find(u => u.id === sData?.assigneeId);
    const attachments = useMemo(() => {
        if (!sData?.attachments) return [];
        return Object.values(sData.attachments).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    }, [sData]);

    return (
        <div className="space-y-10">
            {/* Phase Context Card - OLD SCHOOL INDUSTRIAL */}
            <Card className="bg-white border-2 border-slate-900 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col">
                <div className="bg-slate-100 px-8 py-6 border-b-2 border-slate-900 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-none border-2 border-slate-900 bg-[#2563EB] flex items-center justify-center text-white text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{stage}</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Verification Unit & Workflow Registry</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 text-right">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">OFFICIAL OWNER</p>
                            <div className="flex items-center gap-3">
                                <div className="leading-tight">
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{currentOwner?.name || 'UNASSIGNED'}</p>
                                    <p className="text-[9px] font-black text-[#2563EB] uppercase tracking-widest">Supervisor</p>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-slate-900 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <AvatarImage src={currentOwner?.avatar} />
                                    <AvatarFallback className="text-[10px] font-black rounded-none">{currentOwner?.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <div className="h-12 w-0.5 bg-slate-300" />
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">TARGET DELIVERY</p>
                            <p className="text-sm font-black text-slate-900 flex items-center justify-end gap-2">
                                <Clock className="h-4 w-4 text-[#2563EB]" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM yyyy') : 'TBD'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    <Tabs defaultValue="summary" className="w-full">
                        <div className="px-8 border-b-2 border-slate-900 bg-white">
                            <TabsList className="h-14 w-full justify-start gap-10 bg-transparent p-0">
                                {[
                                    { id: 'summary', label: 'Investigation Summary', icon: FileText },
                                    { id: '5why', label: '5-Why Analysis', icon: GitBranch },
                                    { id: 'rootcause', label: 'Systemic Root Cause', icon: LayoutGrid },
                                    { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 },
                                ].map(tab => (
                                    <TabsTrigger 
                                        key={tab.id} 
                                        value={tab.id}
                                        className="h-14 rounded-none border-b-4 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 data-[state=active]:border-[#2563EB] data-[state=active]:text-blue-700 bg-transparent shadow-none transition-all"
                                    >
                                        <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="summary" className="p-10 m-0 animate-in fade-in duration-500">
                            <CapaInvestigation observation={observation} isLocked={isLocked} />
                        </TabsContent>

                        <TabsContent value="5why" className="p-10 m-0 animate-in fade-in duration-500">
                            <div className="max-w-4xl mx-auto space-y-8">
                                <div className="p-6 bg-slate-900 text-white rounded-none border-2 border-slate-900 mb-8">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 text-blue-400">
                                        <GitBranch className="h-4 w-4" /> 5-WHY TECHNICAL LEDGER
                                    </h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                        Maintain logical technical causality until a systemic organizational failure is identified.
                                    </p>
                                </div>

                                <div className="border-4 border-slate-900 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)]">
                                    <div className="grid grid-cols-[120px_1fr] bg-slate-100 border-b-4 border-slate-900">
                                        <div className="p-4 border-r-4 border-slate-900 font-black text-[11px] uppercase tracking-widest text-center">LEVEL</div>
                                        <div className="p-4 font-black text-[11px] uppercase tracking-widest">TECHNICAL CAUSALITY NARRATIVE</div>
                                    </div>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="grid grid-cols-[120px_1fr] border-b-2 border-slate-900 last:border-b-0 group">
                                            <div className="p-8 border-r-4 border-slate-900 bg-slate-50 flex flex-col items-center justify-center gap-2 group-hover:bg-blue-50 transition-colors">
                                                <span className="text-3xl font-black text-slate-900 tracking-tighter">W{i}</span>
                                                {i < 5 && <ArrowDown className="h-4 w-4 text-slate-300" />}
                                            </div>
                                            <div className="p-6 bg-white relative">
                                                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 absolute top-2 left-4">
                                                    {i === 1 ? 'Primary Discovery Reasoning' : `Link to W${i-1} Technical Condition`}
                                                </Label>
                                                <Textarea 
                                                    disabled={isLocked}
                                                    placeholder="Enter technical why..."
                                                    className="border-none bg-transparent rounded-none focus-visible:ring-0 min-h-[100px] text-sm font-bold uppercase p-4 shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="rootcause" className="p-10 m-0 animate-in fade-in duration-500">
                            <div className="max-w-3xl mx-auto space-y-10">
                                <div className="p-8 border-4 border-slate-900 bg-white space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">1. Root Cause Categorization</Label>
                                        <Select disabled={isLocked}>
                                            <SelectTrigger className="h-14 border-2 border-slate-900 rounded-none font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                <SelectValue placeholder="Select Domain..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none border-2 border-slate-900">
                                                <SelectItem value="Human" className="font-bold uppercase text-xs">Human Factor / Behavioral</SelectItem>
                                                <SelectItem value="Process" className="font-bold uppercase text-xs">Procedural / Process Deficiency</SelectItem>
                                                <SelectItem value="Equipment" className="font-bold uppercase text-xs">Equipment / Technical Failure</SelectItem>
                                                <SelectItem value="System" className="font-bold uppercase text-xs">Management System Failure</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">2. Definitive Root Cause Statement</Label>
                                        <Textarea 
                                            disabled={isLocked}
                                            placeholder="Declare the isolated systemic root cause..."
                                            className="min-h-[180px] border-2 border-slate-900 rounded-none font-bold p-6 text-sm uppercase shadow-inner focus-visible:ring-blue-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="conclusion" className="p-10 m-0 animate-in fade-in duration-500">
                            <div className="max-w-3xl mx-auto space-y-8">
                                <div className="p-10 bg-blue-600 text-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-8 rounded-none">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                        <ShieldCheck className="h-8 w-8" /> INVESTIGATION FINALIZATION
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-100">Final Investigative Finding</Label>
                                            <Textarea 
                                                disabled={isLocked}
                                                className="bg-white/10 border-white/20 text-white rounded-none p-4 font-bold"
                                                placeholder="Executive summary of findings..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-blue-100">Institutional Recommendations</Label>
                                            <Textarea 
                                                disabled={isLocked}
                                                className="bg-white/10 border-white/20 text-white rounded-none p-4 font-bold"
                                                placeholder="Required actions for resolution phase..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Integrated Document Ledger - OLD SCHOOL */}
                    <div className="px-10 pb-10 space-y-8 mt-10">
                        <div className="flex items-center justify-between border-b-4 border-slate-900 pb-2">
                            <div className="flex items-center gap-3">
                                <Paperclip className="h-5 w-5 text-[#2563EB]" />
                                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900">PHASE DOCUMENT LEDGER</h4>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dossier Repository</span>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                {attachments.length > 0 ? attachments.map(a => (
                                    <div key={a.id} className="p-4 border-2 border-slate-900 bg-white flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 border-2 border-slate-900 bg-slate-50 flex items-center justify-center">
                                                <File className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{a.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{format(parseISO(a.uploadedAt), 'dd MMM yyyy, HH:mm')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 border-2 border-transparent hover:border-slate-900 rounded-none text-[#2563EB]" asChild>
                                                <a href={a.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 border-2 border-transparent hover:border-rose-600 rounded-none text-rose-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-none border-4 border-slate-900">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="font-black uppercase tracking-tight">WIPE DOCUMENT RECORD?</AlertDialogTitle>
                                                        <AlertDialogDescription className="font-bold text-slate-500">This will permanently remove the technical attachment from the case dossier.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="gap-3">
                                                        <AlertDialogCancel className="font-black uppercase text-[10px] h-11 px-8 rounded-none border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] h-11 px-10 rounded-none border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" onClick={() => deleteStageAttachment(observation.id, stage, a.id)}>Wipe Record</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="h-full border-4 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center opacity-40 grayscale min-h-[160px]">
                                        <FileText className="h-10 w-10 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No documentation attached</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="h-full border-4 border-dashed border-slate-900 bg-blue-50/50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-blue-100 transition-all min-h-[160px] group shadow-[8px_8px_0px_0px_rgba(37,99,235,0.1)]">
                                <div className="h-12 w-12 rounded-none bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Download className="h-6 w-6 text-[#2563EB]" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Transmit Technical Files</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Select files for institutional archival</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
