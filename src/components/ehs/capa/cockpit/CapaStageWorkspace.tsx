'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Clock, 
    UserPlus, 
    Plus, 
    Loader2, 
    FileText, 
    MapPin, 
    Download, 
    File, 
    Trash2,
    Activity,
    GitBranch,
    CheckCircle2,
    Search,
    UploadCloud
} from 'lucide-react';
import type { EhsObservation, CapaStage, Role } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO, isValid, isPast } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Phase-Specific Components
import CapaInvestigation from '../stages/CapaInvestigation';
import CapaResolution from '../stages/CapaResolution';
import CapaImplementation from '../stages/CapaImplementation';
import CapaEffectivenessReview from '../stages/CapaEffectivenessReview';
import CapaReference from '../stages/CapaReference';
import CapaClosure from '../stages/CapaClosure';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { assignStageOwner, addStageAttachment, deleteStageAttachment } = useEhs();
    const { toast } = useToast();
    
    const sData = observation.stages[stage];
    
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted;

    const isManagement = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor' || user?.role === 'Project Coordinator';
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            toast({ title: 'Institutional Link Establishing...', description: 'Transmitting evidence to institutional Dropbox.' });
            const res = await fetch("/api/upload/dropbox", {
                method: "POST",
                body: formData,
            });
            const uploadData = await res.json();
            if (!res.ok || !uploadData.success) throw new Error(uploadData.error || 'Upload failed.');
            addStageAttachment(observation.id, stage, file.name, uploadData.downloadLink);
            toast({ title: 'Evidence Secured' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Storage Error', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const currentOwner = users.find(u => u.id === sData?.assigneeId);
    const attachments = useMemo(() => {
        if (!sData?.attachments) return [];
        return Object.values(sData.attachments).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    }, [sData]);

    const renderStageContent = () => {
        switch (stage) {
            case 'Investigation': return <CapaInvestigation observation={observation} isLocked={isLocked} />;
            case 'Resolution': return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation': return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review': return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference': return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure': return <CapaClosure observation={observation} isLocked={isLocked} />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Phase Context Card */}
            <Card className="bg-white border-[#E5EBF2] rounded-2xl shadow-sm overflow-hidden min-h-[640px] flex flex-col">
                {/* Industrial Phase Header */}
                <div className="border-b border-[#E5EBF2] bg-white px-8 py-6 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-5">
                            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[12px] bg-[#1769FF] text-2xl font-black text-white shadow-[0_8px_20px_rgba(23,105,255,0.2)]">
                                0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase leading-none tracking-tight text-[#071B33]">
                                    {stage}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-md">
                                    {stage === 'Investigation' ? 'Determine what happened, why it happened and identify the root cause.' : `Technical milestone phase execution: ${stage}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">OWNER</p>
                                <div className="mt-1 flex items-center gap-3 justify-end">
                                    <div className="flex flex-col leading-none text-right">
                                        <p className="text-xs font-black uppercase text-[#071B33]">{currentOwner?.name || 'UNASSIGNED'}</p>
                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{currentOwner?.role || '---'}</p>
                                    </div>
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                            <AvatarImage src={currentOwner?.avatar} />
                                            <AvatarFallback className="bg-slate-50 text-[10px] font-black">{currentOwner?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        {isManagement && !isCompleted && (
                                            <Button variant="outline" size="icon" className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-600 border-white text-white shadow-md hover:bg-blue-700" onClick={() => setIsReassignOpen(true)}>
                                                <UserPlus className="h-2.5 w-2.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="h-10 w-px bg-slate-100" />
                            <div className="text-right min-w-[120px]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">TARGET DELIVERY</p>
                                <p className={cn("mt-1 flex items-center justify-end gap-1.5 text-sm font-black uppercase", sData?.targetDate && isPast(parseISO(sData.targetDate)) ? "text-rose-600" : "text-[#071B33]")}>
                                    <Clock className="h-4 w-4" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM') : 'TBD'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Phase Work Area */}
                    <div className="flex-1 overflow-y-auto">
                        {stage === 'Initiation' ? <CapaInitiation observation={observation} /> : renderStageContent()}
                        
                        {/* Evidence Ledger (Integrated) */}
                        <div className="px-8 pb-8 space-y-6">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                                <Paperclip className="h-4 w-4 text-blue-600" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">PHASE EVIDENCE LEDGER</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    {attachments.map(a => {
                                        const isUploader = user?.id === a.uploadedBy;
                                        const canDel = isManagement || (!isLocked && isUploader);
                                        return (
                                            <div key={a.id} className="p-4 rounded-xl border border-[#DCE5EF] bg-white flex items-center justify-between group hover:border-blue-400 transition-all shadow-sm">
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                        <File className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{a.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(parseISO(a.uploadedAt), 'dd MMM, HH:mm')} &middot; 245 KB</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 ml-4">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200" asChild>
                                                        <a href={a.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 text-blue-600" /></a>
                                                    </Button>
                                                    {canDel && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="uppercase font-black">Institutional Override: Evidence Removal</AlertDialogTitle>
                                                                    <AlertDialogDescription className="font-medium text-slate-500">Confirm permanent deletion of technical document "{a.name}" from the dossier.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="gap-3">
                                                                    <AlertDialogCancel className="font-bold rounded-xl h-11 px-8 uppercase text-[10px]">Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] h-11 px-10 rounded-xl" onClick={() => deleteStageAttachment(observation.id, stage, a.id)}>Confirm Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {!isLocked && stage !== 'Initiation' && (
                                    <div className="relative h-full min-h-[120px]">
                                        <input type="file" id="stage-upload-primary" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                        <label htmlFor="stage-upload-primary" className="h-full w-full border-2 border-dashed border-[#BFDBFE] rounded-2xl bg-[#F8FAFC] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white hover:border-blue-500 transition-all group">
                                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <UploadCloud className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Drag and drop files here or click to browse</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Supported: PDF, DOC, XLS, JPG, PNG (Max 50MB)</p>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Reassign Dialog */}
            <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-[#0F172A] uppercase tracking-tight">Reassign Responsibility</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Ownership Transfer</DialogDescription>
                        </DialogHeader>
                    </div>
                    <Command className="bg-transparent border-t">
                        <div className="px-8 py-4">
                            <CommandInput placeholder="Search personnel..." className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-sm shadow-sm" />
                        </div>
                        <ScrollArea className="h-[400px]">
                            <CommandList>
                                <CommandEmpty className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No personnel found.</CommandEmpty>
                                <CommandGroup className="p-4">
                                    {users.filter(u => u.status === 'active' && u.role !== 'Manager').map(u => (
                                        <CommandItem key={u.id} onSelect={() => { assignStageOwner(observation.id, stage, u.id); setIsReassignOpen(false); }} className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 aria-selected:bg-blue-600 aria-selected:text-white shadow-sm border border-transparent">
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                                                <AvatarImage src={u.avatar} />
                                                <AvatarFallback className="font-black text-xs">{u.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-black uppercase tracking-tight truncate">{u.name}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-70">{u.role}</p>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </ScrollArea>
                    </Command>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CapaInitiation({ observation }: { observation: EhsObservation }) {
    const { projects } = useGeneral();
    const project = projects.find(p => p.id === observation.projectId);
    const sanitizedDescription = observation.description.replace(/<IMG[^>]*>/gi, '').replace(/<[^>]*>?/gm, '').trim();

    return (
        <div className="p-8 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <SectionTitle icon={MapPin} title="OPERATIONAL LOGISTICS" />
                    <div className="space-y-6 text-left">
                        <StaticField label="Discovery Category" value={observation.category} icon={Search} />
                        <StaticField label="Risk Severity" value={observation.severity} isRisk risk={observation.severity} icon={ShieldCheck} />
                        <StaticField label="Operational Site" value={project?.name || observation.projectId} icon={MapPin} />
                        <StaticField label="Specific Location" value={observation.location || '—'} icon={MapPin} />
                    </div>
                </div>
                <div className="space-y-8">
                    <SectionTitle icon={FileText} title="NARRATIVE CONTEXT" />
                    <div className="space-y-6 text-left">
                        <div className="p-6 rounded-2xl bg-slate-50 border border-[#DCE5EF] shadow-inner">
                            <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase tracking-tight">{sanitizedDescription}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionTitle({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-blue-600" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">{title}</h4>
        </div>
    );
}

function StaticField({ label, value, icon: Icon, isRisk = false, risk = '' }: { label: string, value: string, icon: any, isRisk?: boolean, risk?: string }) {
    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400 ml-1"><Icon className="h-3.5 w-3.5 opacity-50" />{label}</Label>
            <div className="h-11 px-4 flex items-center bg-white border border-[#DCE5EF] rounded-xl shadow-sm">
                {isRisk ? (
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 border rounded-sm", risk === 'Low' && "text-emerald-700 bg-emerald-50", risk === 'Medium' && "text-amber-700 bg-amber-50", risk === 'High' && "text-red-700 bg-red-50", risk === 'Critical' && "text-white bg-red-700")}>{value}</Badge>
                ) : <span className="text-xs font-black text-[#071B33] uppercase truncate">{value}</span>}
            </div>
        </div>
    );
}
