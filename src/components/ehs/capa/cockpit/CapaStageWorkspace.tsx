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
    ShieldCheck
} from 'lucide-react';
import type { EhsObservation, CapaStage, Role } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO, isPast } from 'date-fns';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
            toast({ title: 'Establishing Link...', description: 'Transmitting document to institutional storage.' });
            const res = await fetch("/api/upload/dropbox", {
                method: "POST",
                body: formData,
            });
            const uploadData = await res.json();
            if (!res.ok || !uploadData.success) throw new Error(uploadData.error || 'Upload failed.');
            addStageAttachment(observation.id, stage, file.name, uploadData.downloadLink);
            toast({ title: 'Document Secured' });
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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="bg-white border-2 border-slate-900 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-[720px] overflow-hidden">
                <div className="border-b-2 border-slate-900 bg-slate-50 px-8 py-6 shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center border-2 border-slate-900 bg-slate-900 text-2xl font-black text-white">
                                0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase leading-none tracking-tighter text-slate-900">
                                    {stage}
                                </h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Institutional Phase Workbench</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-12">
                            <div className="text-right space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">OWNERSHIP</p>
                                <div className="flex items-center gap-4 justify-end">
                                    <div className="flex flex-col text-right leading-tight">
                                        <p className="text-xs font-black uppercase text-slate-900 tracking-tight">{currentOwner?.name || 'UNASSIGNED'}</p>
                                        <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">{currentOwner?.role || 'SYSTEM'}</p>
                                    </div>
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-slate-900 rounded-none">
                                            <AvatarImage src={currentOwner?.avatar} />
                                            <AvatarFallback className="bg-slate-200 text-xs font-black">{currentOwner?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        {isManagement && !isCompleted && (
                                            <Button variant="outline" size="icon" className="absolute -bottom-1 -right-1 h-5 w-5 rounded-none bg-slate-900 border-slate-900 text-white shadow-sm hover:bg-black" onClick={() => setIsReassignOpen(true)}>
                                                <UserPlus className="h-2.5 w-2.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="h-10 w-0.5 bg-slate-900" />
                            <div className="text-right min-w-[140px]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">TARGET DELIVERY</p>
                                <p className={cn("mt-1 flex items-center justify-end gap-2 text-sm font-black uppercase tracking-tighter", sData?.targetDate && isPast(parseISO(sData.targetDate)) ? "text-rose-600" : "text-slate-900")}>
                                    <Clock className="h-4 w-4" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM yyyy') : 'TBD'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto visible-scrollbar">
                        {stage === 'Initiation' ? <CapaInitiation observation={observation} /> : renderStageContent()}
                        
                        <div className="px-10 pb-12 space-y-8">
                            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-2">
                                <Paperclip className="h-4 w-4 text-blue-600" />
                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900">PHASE DOCUMENT LEDGER</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    {attachments.length > 0 ? attachments.map(a => {
                                        const isUploader = user?.id === a.uploadedBy;
                                        const canDel = isManagement || (!isLocked && isUploader);
                                        return (
                                            <div key={a.id} className="p-4 border-2 border-slate-900 bg-white flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="h-10 w-10 border-2 border-slate-900 bg-slate-50 flex items-center justify-center shrink-0">
                                                        <File className="h-5 w-5 text-slate-900" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-widest">{a.name}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(parseISO(a.uploadedAt), 'dd MMM, HH:mm')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-blue-50" asChild>
                                                        <a href={a.url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                                                    </Button>
                                                    {canDel && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-600 hover:bg-rose-50">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="rounded-none border-2 border-slate-900 shadow-2xl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="uppercase font-black tracking-tight">Institutional Override: Remove Document</AlertDialogTitle>
                                                                    <AlertDialogDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">Confirm permanent deletion of technical record: {a.name}</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="gap-3">
                                                                    <AlertDialogCancel className="font-black uppercase text-[10px] h-11 px-8 rounded-none border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] h-11 px-10 rounded-none border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" onClick={() => deleteStageAttachment(observation.id, stage, a.id)}>Wipe Record</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="p-8 border-2 border-dashed border-slate-200 text-center opacity-40">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No documents registered</p>
                                        </div>
                                    )}
                                </div>
                                
                                {!isLocked && stage !== 'Initiation' && (
                                    <div className="relative h-full min-h-[140px]">
                                        <input type="file" id="stage-upload-primary" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                        <label htmlFor="stage-upload-primary" className="h-full w-full border-2 border-dashed border-slate-900 bg-slate-50 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white transition-all group shadow-[inset_0_0_10px_rgba(0,0,0,0.02)]">
                                            <div className="h-12 w-12 border-2 border-slate-900 bg-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                <UploadCloud className="h-6 w-6 text-slate-900" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Transmit Technical Document</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Cloud Submission</p>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                <DialogContent className="sm:max-w-md bg-white border-2 border-slate-900 shadow-2xl p-0 overflow-hidden rounded-none">
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Institutional Reassignment</DialogTitle>
                            <DialogDescription className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Transfer Ownership</DialogDescription>
                        </DialogHeader>
                    </div>
                    <Command className="bg-transparent border-t-2 border-slate-900">
                        <div className="px-8 py-4">
                            <CommandInput placeholder="Search personnel..." className="h-12 bg-slate-50 border-2 border-slate-900 rounded-none px-4 font-black uppercase text-xs tracking-widest" />
                        </div>
                        <ScrollArea className="h-[400px]">
                            <CommandList>
                                <CommandEmpty className="p-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching officials</CommandEmpty>
                                <CommandGroup className="p-4">
                                    {users.filter(u => u.status === 'active' && u.role !== 'Manager').map(u => (
                                        <CommandItem key={u.id} onSelect={() => { assignStageOwner(observation.id, stage, u.id); setIsReassignOpen(false); }} className="flex items-center gap-4 p-4 rounded-none cursor-pointer transition-all duration-200 mb-2 aria-selected:bg-slate-900 aria-selected:text-white border-2 border-transparent hover:border-slate-900">
                                            <Avatar className="h-10 w-10 border-2 border-slate-900 rounded-none shrink-0">
                                                <AvatarImage src={u.avatar} />
                                                <AvatarFallback className="font-black text-xs">{u.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-black uppercase tracking-tighter truncate">{u.name}</p>
                                                <p className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-60">{u.role}</p>
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
        <div className="p-10 space-y-12 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-10">
                    <SectionTitle icon={MapPin} title="OPERATIONAL LOGISTICS" />
                    <div className="space-y-6 text-left">
                        <StaticField label="Discovery Category" value={observation.category} icon={Search} />
                        <StaticField label="Risk Level" value={observation.severity} isRisk risk={observation.severity} icon={ShieldCheck} />
                        <StaticField label="Site Location" value={project?.name || observation.projectId} icon={MapPin} />
                        <StaticField label="Specific Area" value={observation.location || '—'} icon={MapPin} />
                    </div>
                </div>
                <div className="space-y-10">
                    <SectionTitle icon={FileText} title="NARRATIVE DISCOVERY" />
                    <div className="space-y-6 text-left">
                        <div className="p-8 border-2 border-slate-900 bg-slate-50 shadow-inner">
                            <p className="text-sm font-black text-slate-800 leading-relaxed uppercase tracking-tight italic">
                                "{sanitizedDescription}"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionTitle({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-4">
            <Icon className="h-6 w-6 text-slate-900" />
            <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-900">{title}</h4>
        </div>
    );
}

function StaticField({ label, value, icon: Icon, isRisk = false, risk = '' }: { label: string, value: string, icon: any, isRisk?: boolean, risk?: string }) {
    return (
        <div className="space-y-2.5">
            <Label className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                <Icon className="h-3.5 w-3.5 opacity-40" />{label}
            </Label>
            <div className="h-12 px-5 flex items-center bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {isRisk ? (
                    <Badge variant="outline" className={cn(
                        "text-[10px] font-black uppercase tracking-[0.15em] h-7 px-4 border-2 rounded-none",
                        risk === 'Low' && "text-emerald-700 bg-emerald-50 border-emerald-700",
                        risk === 'Medium' && "text-amber-700 bg-amber-50 border-amber-700",
                        risk === 'High' && "text-white bg-rose-600 border-rose-600",
                        risk === 'Critical' && "text-white bg-rose-700 border-rose-700 shadow-sm"
                    )}>{value}</Badge>
                ) : <span className="text-xs font-black text-slate-900 uppercase tracking-tighter truncate">{value}</span>}
            </div>
        </div>
    );
}
