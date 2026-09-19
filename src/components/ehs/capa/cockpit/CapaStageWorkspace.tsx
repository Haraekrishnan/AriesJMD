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
    Save,
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
    Paperclip
} from 'lucide-react';
import type { EhsObservation, CapaStage, User as UserType } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

// Phase-Specific Components
import CapaInvestigationWorkspace from './CapaInvestigationWorkspace';
import Capa5Why from '../stages/Capa5Why';
import CapaSystemicRootCause from '../stages/CapaSystemicRootCause';
import CapaPhaseConclusion from '../stages/CapaPhaseConclusion';
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
    const { reviewStage, updateInitiationDetails } = useEhs();
    const sData = observation.stages[stage];
    
    // Viewer State
    const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
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

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        setStartPosition({
            x: e.clientX - translate.x,
            y: e.clientY - translate.y,
        });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isPanning || !imageContainerRef.current) return;
        e.preventDefault();
        const x = e.clientX - startPosition.x;
        const y = e.clientY - startPosition.y;
        setTranslate({ x, y });
    };
    
    const handleMouseUpOrLeave = () => {
        setIsPanning(false);
    };

    const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().endsWith('.pdf');

    const renderStageContent = () => {
        switch (stage) {
            case 'Initiation':
                return <CapaInitiation observation={observation} onViewImage={setViewingAttachmentUrl} />;
            case 'Investigation':
                return (
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
                            <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                                <Capa5Why isLocked={isLocked} />
                            </TabsContent>
                            <TabsContent value="rootcause" className="m-0 focus-visible:ring-0">
                                <CapaSystemicRootCause isLocked={isLocked} />
                            </TabsContent>
                            <TabsContent value="conclusion" className="m-0 focus-visible:ring-0">
                                <CapaPhaseConclusion isLocked={isLocked} />
                            </TabsContent>
                        </div>
                    </Tabs>
                );
            case 'Resolution':
                return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation':
                return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review':
                return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference':
                return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure':
                return <CapaClosure observation={observation} isLocked={isLocked} />;
            default:
                return <div className="py-20 text-center opacity-30 font-bold uppercase text-xs tracking-widest">TECHNICAL WORKSPACE OFFLINE</div>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- PHASE ALERT (IF RETURNED) --- */}
            {isReturned && (
                <div className="p-6 rounded-none bg-rose-50 border-2 border-rose-200 flex items-start gap-4 shadow-sm">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-1">Official Review Correction instructed</p>
                        <p className="text-sm font-bold text-rose-900 leading-relaxed italic">
                            "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification.'}"
                        </p>
                    </div>
                </div>
            )}

            {/* --- PHASE WORKSPACE --- */}
            <Card className="bg-white border-none rounded-none shadow-xl overflow-hidden ring-1 ring-slate-100">
                <div className={cn("transition-all duration-700", (isLocked && stage !== 'Initiation') && "opacity-95 grayscale-[0.1]")}>
                    {renderStageContent()}
                </div>
            </Card>

            {/* --- OFFICIAL REVIEW PANEL --- */}
            {isCurrentStage && isSubmitted && isSupervisor && stage !== 'Initiation' && (
                <div className="p-10 rounded-none bg-slate-900 text-white shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-1000 border-4 border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-none bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-tight">Official Verification Workspace</h4>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Lifecycle Governance & Compliance Validation</p>
                        </div>
                    </div>
                    
                    <div className="p-6 rounded-none bg-white/5 border border-white/10 space-y-2">
                         <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
                            Technical data and evidence have been uploaded by the assignee. Validate the findings to proceed to the next lifecycle stage or request immediate rework if the documentation is insufficient.
                         </p>
                    </div>

                    <div className="flex gap-4">
                         <Button 
                            className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-none shadow-lg active:scale-95 transition-all"
                            onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified and approved.')}
                         >
                            <ThumbsUp className="mr-3 h-5 w-5" /> Verify & Continue Lifecycle
                         </Button>
                         <Button 
                            variant="outline" 
                            className="flex-1 h-14 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-black uppercase tracking-widest text-[10px] rounded-none transition-all active:scale-95"
                            onClick={() => reviewStage(observation.id, stage, 'Returned', 'Technical data requires clarification.')}
                         >
                            <Undo2 className="mr-3 h-5 w-5" /> Instruct Rework
                         </Button>
                    </div>
                </div>
            )}

            {/* --- LIGHTBOX EVIDENCE VIEWER --- */}
            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); setNumPages(null); setPageNumber(1); }}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl w-full h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                    <div className="sr-only">
                        <DialogTitle>Case Discovery Evidence Viewer</DialogTitle>
                        <DialogDescription>Full-resolution technical evidence for forensic inspection.</DialogDescription>
                    </div>

                    <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
                        {!isPdf && (
                            <div className="flex gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-white bg-blue-600 hover:bg-blue-700 shadow-lg rounded-none border border-blue-400/30" 
                                    onClick={() => setZoom(z => z + 0.2)}
                                >
                                    <ZoomIn className="h-5 w-5" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-white bg-slate-700 hover:bg-slate-800 shadow-lg rounded-none border border-slate-500/30" 
                                    onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}
                                >
                                    <ZoomOut className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 bg-rose-600 text-white hover:bg-rose-700 shadow-lg rounded-none border border-rose-400/30 transition-colors" 
                            onClick={() => setViewingAttachmentUrl(null)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 z-50 flex justify-between items-center">
                         <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-none px-5 py-2 flex items-center gap-4">
                            <p className="text-[11px] font-black text-white uppercase tracking-widest">Case Discovery Evidence</p>
                            {isPdf && numPages && (
                                <div className="flex items-center gap-2 text-[10px] font-bold text-white border-l border-white/20 pl-4">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}><ChevronLeft className="h-3 w-3" /></Button>
                                    <span>PAGE {pageNumber} / {numPages}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}><ChevronRight className="h-3 w-3" /></Button>
                                </div>
                            )}
                         </div>
                         <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white hover:text-black font-black uppercase text-[11px] tracking-widest h-11 px-8 rounded-none gap-3 shadow-2xl" asChild>
                            <a href={viewingAttachmentUrl || ''} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" /> DOWNLOAD FULL SIZE
                            </a>
                         </Button>
                    </div>

                    <div 
                      ref={imageContainerRef}
                      className="aspect-video w-full overflow-hidden flex items-center justify-center bg-black relative"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                    >
                        {viewingAttachmentUrl && (
                            isPdf ? (
                                <ScrollArea className="h-full w-full">
                                    <div className="flex justify-center p-12">
                                        <Document
                                            file={viewingAttachmentUrl}
                                            onLoadSuccess={onDocumentLoadSuccess}
                                            className="flex justify-center"
                                        >
                                            <Page pageNumber={pageNumber} scale={1.5} />
                                        </Document>
                                    </div>
                                </ScrollArea>
                            ) : (
                                <img 
                                    src={viewingAttachmentUrl || ''} 
                                    alt="Evidence" 
                                    className={cn("transition-transform duration-200 shadow-2xl", isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                                    style={{ 
                                        transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`, 
                                        maxWidth: zoom > 1 ? 'none' : '100%', 
                                        maxHeight: zoom > 1 ? 'none' : '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CapaInitiation({ observation, onViewImage }: { observation: EhsObservation, onViewImage: (url: string) => void }) {
    const { user, users } = useAuth();
    const { projects } = useGeneral();
    const { updateInitiationDetails } = useEhs();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        description: observation.description,
        category: observation.category,
        severity: observation.severity,
        projectId: observation.projectId,
        location: observation.location
    });

    const isAuthorized = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';
    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);

    const extractedEvidenceUrl = useMemo(() => {
        if (observation.discoveryAttachmentUrl) return observation.discoveryAttachmentUrl;
        const match = observation.description.match(/src="([^"]+)"/i);
        return match ? match[1] : null;
    }, [observation.discoveryAttachmentUrl, observation.description]);

    const sanitizedDescription = useMemo(() => {
        return observation.description.replace(/<IMG[^>]*>/gi, '').replace(/<[^>]*>?/gm, '').trim();
    }, [observation.description]);

    const handleSave = async () => {
        await updateInitiationDetails(observation.id, formData);
        setIsEditing(false);
    };

    return (
        <div className="w-full text-left">
            <section className="overflow-hidden rounded-none border-2 border-slate-200 bg-white shadow-[0_2px_12px_rgba(16,42,67,0.04)]">
                
                {/* 1. STAGE HEADER */}
                <div className="border-b-2 border-slate-100 bg-white px-7 py-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-none border-4 border-slate-900 bg-white text-[21px] font-black text-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                                01
                            </div>
                            <div>
                                <div className="mb-1.5 flex items-center gap-2">
                                    <span className="rounded-none bg-blue-50 px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-blue-600 border border-blue-100">
                                        GOVERNANCE MILESTONE
                                    </span>
                                </div>
                                <h2 className="text-[25px] font-black uppercase leading-none tracking-tight text-slate-900">
                                    INITIATION
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">REPORTER</p>
                                <div className="mt-1 flex items-center gap-2 justify-end">
                                    <p className="text-[10px] font-black uppercase text-slate-900">{reporter?.name || 'Unknown'}</p>
                                    <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                                        <AvatarImage src={reporter?.avatar} />
                                        <AvatarFallback className="text-[8px] font-black">{reporter?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>
                            <div className="h-9 w-px bg-slate-100" />
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">TIMESTAMP</p>
                                <p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-black uppercase text-slate-900">
                                    <Calendar className="h-3 w-3 text-blue-600" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-7 space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* LEFT COLUMN: LOGISTICS */}
                        <div className="space-y-8">
                            <SectionHeading icon={MapPin} title="OPERATIONAL LOGISTICS" />
                            <div className="space-y-6">
                                <EditableMeta label="Discovery Category" value={observation.category} isEditing={isEditing} type="select" options={['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']} onChange={val => setFormData(p => ({ ...p, category: val }))} icon={Search} />
                                <EditableMeta label="Risk Severity" value={observation.severity} isEditing={isEditing} type="select" options={['Low', 'Medium', 'High', 'Critical']} onChange={val => setFormData(p => ({ ...p, severity: val }))} icon={ShieldCheck} />
                                <EditableMeta label="Operational Site" value={project?.name || observation.projectId} isEditing={isEditing} type="select" options={projects.map(p => ({ id: p.id, name: p.name }))} onChange={val => setFormData(p => ({ ...p, projectId: val }))} icon={MapPin} />
                                <EditableMeta label="Specific Location" value={observation.location} isEditing={isEditing} type="text" onChange={val => setFormData(p => ({ ...p, location: val }))} icon={MapPin} />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: NARRATIVE */}
                        <div className="space-y-8">
                            <div className="flex justify-between items-center">
                                <SectionHeading icon={FileText} title="NARRATIVE CONTEXT" />
                                {isAuthorized && !isEditing && (
                                    <Button variant="ghost" size="sm" className="h-7 px-3 text-[9px] font-black uppercase border-2 border-slate-200 rounded-none hover:bg-slate-50" onClick={() => setIsEditing(true)}>
                                        <Edit3 className="h-3 w-3 mr-1.5" /> OVERWRITE
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-6">
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Finding Description</Label>
                                        <Textarea className="min-h-[120px] rounded-none border-2 border-slate-200 bg-slate-50 font-bold text-[10px] shadow-inner" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="outline" size="sm" className="h-8 text-[9px] font-black rounded-none uppercase border-2" onClick={() => setIsEditing(false)}>CANCEL</Button>
                                            <Button size="sm" className="h-8 text-[9px] font-black rounded-none uppercase bg-blue-600 hover:bg-blue-700" onClick={handleSave}>SAVE CHANGES</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-none bg-slate-50 border-2 border-slate-100 shadow-inner">
                                        <p className="text-[11px] font-bold text-slate-800 leading-relaxed uppercase tracking-tight italic">
                                            "{sanitizedDescription}"
                                        </p>
                                    </div>
                                )}

                                {extractedEvidenceUrl && (
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Discovery Evidence</Label>
                                        <div 
                                            className="h-32 w-48 rounded-none border-4 border-slate-900 bg-white overflow-hidden relative group/img cursor-zoom-in shadow-lg"
                                            onClick={() => onViewImage(extractedEvidenceUrl)}
                                        >
                                            <img src={extractedEvidenceUrl} alt="E" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 flex items-center justify-center transition-all">
                                                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover/img:opacity-100" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-blue-600" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">{title}</h4>
        </div>
    );
}

function EditableMeta({ label, value, isEditing, type, options, onChange, icon: Icon }: { label: string, value: string, isEditing: boolean, type: 'text' | 'select', options?: any[], onChange: (val: any) => void, icon?: any }) {
    return (
        <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 ml-1">
                {Icon && <Icon className="h-3 w-3 text-blue-400" />}
                {label}
            </Label>
            {isEditing ? (
                type === 'select' ? (
                    <Select value={value} onValueChange={onChange}>
                        <SelectTrigger className="h-[42px] rounded-none border-2 border-slate-200 bg-slate-50 px-3.5 text-[10px] font-black uppercase text-slate-900 shadow-inner">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {options?.map(opt => (
                                <SelectItem key={typeof opt === 'string' ? opt : opt.id} value={typeof opt === 'string' ? opt : opt.id} className="text-[10px] font-black uppercase">
                                    {typeof opt === 'string' ? opt : opt.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input className="h-[42px] rounded-none border-2 border-slate-200 bg-slate-50 text-[10px] font-black uppercase shadow-inner" value={value} onChange={e => onChange(e.target.value)} />
                )
            ) : (
                <div className="h-[42px] px-3.5 flex items-center bg-slate-50 border-2 border-slate-100 rounded-none shadow-inner">
                    <span className="text-[10px] font-black text-slate-900 uppercase truncate">{value}</span>
                </div>
            )}
        </div>
    );
}
