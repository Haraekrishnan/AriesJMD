'use client';

import React, { useState, useMemo, useRef, MouseEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Lock, 
    CheckCircle2, 
    Undo2, 
    ThumbsUp,
    AlertCircle,
    Info,
    ShieldCheck,
    AlertTriangle,
    Edit3,
    X,
    Clock,
    UserPlus,
    Plus,
    Loader2,
    Search,
    Check,
    FileText,
    MapPin,
    Calendar,
    ZoomIn,
    Download,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';

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
    const { reviewStage, assignStageOwner, addStageAttachment } = useEhs();
    const { toast } = useToast();
    
    const sData = observation.stages[stage];
    
    const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';
    const canReassign = (user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Senior Safety Supervisor') && !isCompleted;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            addStageAttachment(observation.id, stage, file.name, base64);
            setIsUploading(false);
            toast({ title: 'Evidence Attached' });
        };
        reader.readAsDataURL(file);
    };

    const renderStageContent = () => {
        switch (stage) {
            case 'Initiation': return <CapaInitiation observation={observation} onViewImage={setViewingAttachmentUrl} />;
            case 'Investigation': return <CapaInvestigation observation={observation} isLocked={isLocked} />;
            case 'Resolution': return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation': return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review': return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference': return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure': return <CapaClosure observation={observation} isLocked={isLocked} />;
            default: return null;
        }
    };

    const currentOwner = users.find(u => u.id === sData?.assigneeId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- PRIMARY TECHNICAL CARD --- */}
            <Card className="bg-white border-slate-200 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] overflow-hidden">
                {/* 1. INDUSTRIAL HEADER (COMPACTED) */}
                <div className="border-b border-slate-100 bg-white px-8 py-5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            {/* Phase Number Box (Compacted) */}
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-lg font-black text-slate-900 shadow-sm">
                                0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                            </div>
                            <div>
                                <div className="mb-1 flex items-center gap-2">
                                    <Badge className={cn(
                                        "h-4 font-black uppercase text-[7px] tracking-[0.2em] border-none shadow-sm",
                                        isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                                    )}>
                                        {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION'}
                                    </Badge>
                                </div>
                                <h2 className="text-xl font-black uppercase leading-none tracking-tighter text-[#071B33]">
                                    {stage}
                                </h2>
                            </div>
                        </div>

                        {/* Ownership & Target Panel (Compacted) */}
                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">OWNERSHIP</p>
                                <div className="mt-1 flex items-center gap-2 justify-end">
                                    <div className="flex flex-col leading-none">
                                        <p className="text-[10px] font-black uppercase text-slate-900">{currentOwner?.name || 'UNASSIGNED'}</p>
                                        <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{currentOwner?.role || '---'}</p>
                                    </div>
                                    <div className="relative">
                                        <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                            <AvatarImage src={currentOwner?.avatar} />
                                            <AvatarFallback className="bg-slate-100 text-[8px] font-black">{currentOwner?.name?.[0] || '?'}</AvatarFallback>
                                        </Avatar>
                                        {canReassign && (
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-blue-600 border-white text-white shadow-sm hover:bg-blue-700"
                                                onClick={() => setIsReassignOpen(true)}
                                            >
                                                <UserPlus className="h-2 w-2" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-slate-100" />
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">PHASE TARGET</p>
                                <p className={cn(
                                    "mt-1 flex items-center justify-end gap-1 text-xs font-black uppercase",
                                    sData?.status !== 'Completed' && sData?.targetDate && isPast(parseISO(sData.targetDate)) ? "text-rose-600 animate-pulse" : "text-slate-900"
                                )}>
                                    <Clock className="h-3.5 w-3.5" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM, HH:mm') : 'TBD'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. PHASE CONTENT */}
                <div className="p-0">
                    {renderStageContent()}
                </div>

                {/* 3. ATTACHMENT ACTION (COMPACTED) */}
                {!isLocked && stage !== 'Initiation' && (
                    <div className="px-8 py-4 border-t bg-slate-50/50">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                                    <Plus className="h-3 w-3 text-blue-600" />
                                </div>
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-900">ATTACH PHASE EVIDENCE</h4>
                            </div>
                            <div className="relative">
                                <input type="file" id="stage-file-upload-workspace" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                <Button variant="outline" asChild className="h-8 px-4 rounded-lg border font-black uppercase text-[9px] tracking-widest hover:bg-white shadow-sm">
                                    <label htmlFor="stage-file-upload-workspace" className="cursor-pointer flex items-center">
                                        {isUploading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Plus className="h-3 w-3 mr-2" />}
                                        Upload File
                                    </label>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* --- REASSIGNMENT DIALOG --- */}
            <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                <DialogContent className="sm:max-w-md bg-[#F8FAFC] border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-[#0F172A] uppercase tracking-tight">Reassign Milestone Responsibility</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Select new owner for phase: {stage}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <Command className="bg-transparent">
                        <div className="px-8 pb-4">
                            <CommandInput 
                                placeholder="Search personnel by name or role..." 
                                className="h-12 bg-white border-2 border-slate-100 rounded-xl px-4 font-bold text-sm shadow-sm focus:border-blue-500 transition-all"
                            />
                        </div>
                        <ScrollArea className="h-[400px] bg-white border-t border-slate-100">
                            <CommandList>
                                <CommandEmpty className="p-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">No personnel matching parameters found.</CommandEmpty>
                                <CommandGroup className="p-4">
                                    {users.filter(u => u.status === 'active' && u.role !== 'Manager').map(u => {
                                        const isSelected = u.id === sData?.assigneeId;
                                        return (
                                            <CommandItem 
                                                key={u.id} 
                                                onSelect={() => { assignStageOwner(observation.id, stage, u.id); setIsReassignOpen(false); }}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 group",
                                                    isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "hover:bg-blue-50"
                                                )}
                                            >
                                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                                                    <AvatarImage src={u.avatar} />
                                                    <AvatarFallback className={cn("text-[10px] font-black", isSelected ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400")}>
                                                        {u.name[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-black uppercase tracking-tight truncate",
                                                        isSelected ? "text-white" : "text-[#0F172A]"
                                                    )}>{u.name}</p>
                                                    <p className={cn(
                                                        "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                                                        isSelected ? "text-blue-100" : "text-slate-400"
                                                    )}>{u.role}</p>
                                                </div>
                                                {isSelected && <Check className="h-4 w-4 text-white shrink-0" />}
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </ScrollArea>
                    </Command>
                    
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <Button variant="ghost" onClick={() => setIsReassignOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">
                            Close Interface
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CapaInitiation({ observation, onViewImage }: { observation: EhsObservation, onViewImage: (url: string) => void }) {
    const { projects } = useGeneral();
    const project = projects.find(p => p.id === observation.projectId);
    const sanitizedDescription = observation.description.replace(/<IMG[^>]*>/gi, '').replace(/<[^>]*>?/gm, '').trim();
    const extractedEvidenceUrl = observation.discoveryAttachmentUrl || observation.description.match(/src="([^"]+)"/i)?.[1];

    return (
        <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">OPERATIONAL LOGISTICS</h4>
                    </div>
                    <div className="space-y-4 text-left">
                        <MetaRow label="Discovery Category" value={observation.category} icon={Search} />
                        <MetaRow label="Risk Severity" value={observation.severity} isRisk risk={observation.severity} icon={ShieldCheck} />
                        <MetaRow label="Operational Site" value={project?.name || observation.projectId} icon={MapPin} />
                        <MetaRow label="Specific Location" value={observation.location} icon={MapPin} />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">NARRATIVE CONTEXT</h4>
                    </div>
                    <div className="space-y-6 text-left">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-inner">
                            <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase tracking-tight">{sanitizedDescription}</p>
                        </div>
                        {extractedEvidenceUrl && (
                            <div className="space-y-2">
                                <Label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Discovery Evidence</Label>
                                <div className="h-32 w-56 rounded-xl border-2 border-slate-200 bg-white overflow-hidden relative group/img cursor-zoom-in shadow-sm" onClick={() => onViewImage(extractedEvidenceUrl)}>
                                    <img src={extractedEvidenceUrl} alt="E" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 flex items-center justify-center transition-all"><ZoomIn className="h-6 w-6 text-white opacity-0 group-hover/img:opacity-100" /></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetaRow({ label, value, icon: Icon, isRisk = false, risk = '' }: { label: string, value: string, icon: any, isRisk?: boolean, risk?: string }) {
    return (
        <div className="space-y-1.5">
            <Label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500 ml-1"><Icon className="h-3.5 w-3.5 text-slate-300" />{label}</Label>
            <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-lg">
                {isRisk ? (
                    <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest h-5 px-2 border rounded-sm", risk === 'Low' && "text-emerald-700 bg-emerald-50", risk === 'Medium' && "text-amber-700 bg-amber-50", risk === 'High' && "text-red-700 bg-red-50", risk === 'Critical' && "text-white bg-red-700")}>{value}</Badge>
                ) : <span className="text-[11px] font-bold text-slate-900 uppercase truncate">{value}</span>}
            </div>
        </div>
    );
}
