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
    History,
    FileText,
    MapPin,
    User,
    Calendar,
    Search,
    ZoomIn,
    ZoomOut,
    Download,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    UserPlus,
    Plus,
    Loader2,
    Clock
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

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
    
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);

    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';
    const canReassign = (user?.role === 'Admin' || user?.role === 'Project Coordinator' || user?.role === 'Senior Safety Supervisor') && !isCompleted;

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        setStartPosition({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isPanning || !imageContainerRef.current) return;
        e.preventDefault();
        const x = e.clientX - startPosition.x;
        const y = e.clientY - startPosition.y;
        setTranslate({ x, y });
    };
    
    const handleMouseUpOrLeave = () => setIsPanning(false);

    const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().endsWith('.pdf');

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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="bg-white border-slate-200 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="border-b border-slate-100 bg-white px-8 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[15px] border border-slate-200 bg-white text-2xl font-black text-slate-900 shadow-sm">
                                0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                            </div>
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <Badge className={cn(
                                        "h-5 font-black uppercase text-[8px] tracking-[0.2em] border-none shadow-sm",
                                        isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                                    )}>
                                        {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION'}
                                    </Badge>
                                </div>
                                <h2 className="text-3xl font-black uppercase leading-none tracking-tighter text-[#071B33]">
                                    {stage}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">OWNERSHIP</p>
                                <div className="mt-2 flex items-center gap-3 justify-end">
                                    <div className="flex flex-col leading-none">
                                        <p className="text-[12px] font-black uppercase text-slate-900">{currentOwner?.name || 'UNASSIGNED'}</p>
                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{currentOwner?.role || '---'}</p>
                                    </div>
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                                            <AvatarImage src={currentOwner?.avatar} />
                                            <AvatarFallback className="bg-slate-100 text-[10px] font-black">{currentOwner?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        {canReassign && (
                                            <Button variant="outline" size="icon" className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-blue-600 border-white text-white shadow-sm" onClick={() => setIsReassignOpen(true)}>
                                                <UserPlus className="h-2.5 w-2.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="h-12 w-px bg-slate-100" />
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">PHASE TARGET</p>
                                <p className={cn(
                                    "mt-2 flex items-center justify-end gap-1.5 text-sm font-black uppercase",
                                    sData?.status !== 'Completed' && sData?.targetDate && isPast(parseISO(sData.targetDate)) ? "text-rose-600 animate-pulse" : "text-slate-900"
                                )}>
                                    <Clock className="h-4 w-4" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM, HH:mm') : 'TBD'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-0">
                    {renderStageContent()}
                </div>

                {!isLocked && stage !== 'Initiation' && (
                    <div className="px-10 py-8 border-t bg-slate-50/50">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                                    <Paperclip className="h-4 w-4 text-blue-600" />
                                </div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">ATTACH PHASE EVIDENCE</h4>
                            </div>
                            <div className="relative">
                                <input type="file" id="stage-file-upload" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                <Button variant="outline" asChild className="h-10 px-6 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest hover:bg-white">
                                    <label htmlFor="stage-file-upload" className="cursor-pointer">
                                        {isUploading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-2" />}
                                        Upload File
                                    </label>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => setViewingAttachmentUrl(null)}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl w-full h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black border border-white/10 shadow-2xl">
                    <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                        {!isPdf && (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-white bg-blue-600 shadow-lg" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-5 w-5" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-white bg-slate-700 shadow-lg" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-5 w-5" /></Button>
                            </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-10 w-10 bg-rose-600 text-white shadow-lg" onClick={() => setViewingAttachmentUrl(null)}><X className="h-5 w-5" /></Button>
                    </div>
                    <div ref={imageContainerRef} className="aspect-video w-full overflow-hidden flex items-center justify-center bg-black relative" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}>
                        {viewingAttachmentUrl && (
                            isPdf ? (
                                <ScrollArea className="h-full w-full">
                                    <div className="flex justify-center p-12">
                                        <Document file={viewingAttachmentUrl} onLoadSuccess={onDocumentLoadSuccess} className="flex justify-center">
                                            <Page pageNumber={pageNumber} scale={1.5} />
                                        </Document>
                                    </div>
                                </ScrollArea>
                            ) : (
                                <img src={viewingAttachmentUrl} alt="Evidence" className={cn("transition-transform duration-200", isPanning ? 'cursor-grabbing' : 'cursor-grab')} style={{ transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`, maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reassign Milestone Responsibility</DialogTitle>
                        <DialogDescription>Select new owner for phase: {stage}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-64 border rounded-xl bg-slate-50 mt-4">
                        <div className="p-2 space-y-1">
                            {users.filter(u => u.status === 'active' && u.role !== 'Manager').map(u => (
                                <button key={u.id} className={cn("w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all", u.id === sData?.assigneeId ? "bg-blue-600 text-white" : "hover:bg-white")} onClick={() => { assignStageOwner(observation.id, stage, u.id); setIsReassignOpen(false); }}>
                                    <Avatar className="h-8 w-8 border"><AvatarImage src={u.avatar} /><AvatarFallback>{u.name[0]}</AvatarFallback></Avatar>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase truncate">{u.name}</p>
                                        <p className={cn("text-[9px] font-bold uppercase", u.id === sData?.assigneeId ? "text-blue-100" : "text-slate-400")}>{u.role}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
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
        <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-10">
                    <SectionHeading icon={MapPin} title="OPERATIONAL LOGISTICS" />
                    <div className="space-y-8">
                        <MetaRow label="Discovery Category" value={observation.category} icon={Search} />
                        <MetaRow label="Risk Severity" value={observation.severity} isRisk risk={observation.severity} icon={ShieldCheck} />
                        <MetaRow label="Operational Site" value={project?.name || observation.projectId} icon={MapPin} />
                        <MetaRow label="Specific Location" value={observation.location} icon={MapPin} />
                    </div>
                </div>
                <div className="space-y-10">
                    <SectionHeading icon={FileText} title="NARRATIVE CONTEXT" />
                    <div className="space-y-8">
                        <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 shadow-inner"><p className="text-[13px] font-medium text-slate-700 leading-relaxed uppercase tracking-tight">{sanitizedDescription}</p></div>
                        {extractedEvidenceUrl && (
                            <div className="space-y-3">
                                <Label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 ml-1">Discovery Evidence</Label>
                                <div className="h-48 w-72 rounded-xl border-2 border-slate-200 bg-white overflow-hidden relative group/img cursor-zoom-in" onClick={() => onViewImage(extractedEvidenceUrl)}>
                                    <img src={extractedEvidenceUrl} alt="E" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 flex items-center justify-center transition-all"><ZoomIn className="h-8 w-8 text-white opacity-0 group-hover/img:opacity-100" /></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-blue-600" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">{title}</h4>
        </div>
    );
}

function MetaRow({ label, value, icon: Icon, isRisk = false, risk = '' }: { label: string, value: string, icon: any, isRisk?: boolean, risk?: string }) {
    return (
        <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 ml-1"><Icon className="h-4 w-4 text-slate-300" />{label}</Label>
            <div className="h-[52px] px-4 flex items-center bg-slate-50 border border-slate-200 rounded-xl">
                {isRisk ? (
                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest h-6 px-3 border rounded-md", risk === 'Low' && "text-emerald-700 bg-emerald-50", risk === 'Medium' && "text-amber-700 bg-amber-50", risk === 'High' && "text-red-700 bg-red-50", risk === 'Critical' && "text-white bg-red-700")}>{value}</Badge>
                ) : <span className="text-xs font-bold text-slate-900 uppercase truncate">{value}</span>}
            </div>
        </div>
    );
}
