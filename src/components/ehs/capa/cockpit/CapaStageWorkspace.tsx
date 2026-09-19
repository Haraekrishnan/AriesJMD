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
    FileText,
    MapPin,
    Calendar,
    Search,
    ZoomIn,
    ZoomOut,
    Download,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    Zap,
    Activity,
    Target
} from 'lucide-react';
import type { EhsObservation, CapaStage, User as UserType } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Phase Components
import CapaInvestigationWorkspace from './CapaInvestigationWorkspace';
import Capa5Why from '../stages/Capa5Why';
import CapaSystemicRootCause from '../stages/CapaSystemicRootCause';
import CapaPhaseConclusion from '../stages/CapaPhaseConclusion';
import CapaResolution from '../stages/CapaResolution';
import CapaImplementation from '../stages/CapaImplementation';
import CapaEffectivenessReview from '../stages/CapaEffectivenessReview';
import CapaReference from '../stages/CapaReference';
import CapaClosure from '../stages/CapaClosure';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

const STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user, users } = useAuth();
    const { reviewStage } = useEhs();
    const sData = observation.stages[stage];
    const assignee = users.find(u => u.id === sData?.assigneeId);
    
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

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (zoom <= 1) return;
        e.preventDefault();
        setIsPanning(true);
        setStartPosition({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isPanning || !imageContainerRef.current) return;
        e.preventDefault();
        setTranslate({ x: e.clientX - startPosition.x, y: e.clientY - startPosition.y });
    };

    const handleMouseUpOrLeave = () => setIsPanning(false);
    const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().endsWith('.pdf');

    const renderStageContent = () => {
        switch (stage) {
            case 'Initiation': return <CapaInitiation observation={observation} onViewImage={setViewingAttachmentUrl} />;
            case 'Investigation': return (
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
                                    className="h-16 rounded-none border-b-4 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                                >
                                    <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    <div className="outline-none">
                        <TabsContent value="summary" className="m-0 focus-visible:ring-0 p-10"><CapaInvestigationWorkspace observation={observation} /></TabsContent>
                        <TabsContent value="5why" className="m-0 focus-visible:ring-0 p-10"><Capa5Why isLocked={isLocked} /></TabsContent>
                        <TabsContent value="rootcause" className="m-0 focus-visible:ring-0 p-10"><CapaSystemicRootCause isLocked={isLocked} /></TabsContent>
                        <TabsContent value="conclusion" className="m-0 focus-visible:ring-0 p-10"><CapaPhaseConclusion isLocked={isLocked} /></TabsContent>
                    </div>
                </Tabs>
            );
            case 'Resolution': return <div className="p-10"><CapaResolution observation={observation} isLocked={isLocked} /></div>;
            case 'Implementation': return <div className="p-10"><CapaImplementation observation={observation} isLocked={isLocked} /></div>;
            case 'Effectiveness Review': return <div className="p-10"><CapaEffectivenessReview observation={observation} isLocked={isLocked} /></div>;
            case 'Reference': return <div className="p-10"><CapaReference observation={observation} isLocked={isLocked} /></div>;
            case 'Closure': return <div className="p-10"><CapaClosure observation={observation} isLocked={isLocked} /></div>;
            default: return null;
        }
    };

    return (
        <div className="space-y-8 text-left">
            {/* Milestone Card Header */}
            <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/20">
                        {String(STAGES.indexOf(stage) + 1).padStart(2, '0')}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2">{stage}</h3>
                        <p className="text-sm font-medium text-slate-500 leading-none">Institutional governance lifecycle stage.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-12 text-right">
                    {assignee && (
                        <div className="flex flex-col items-end">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                {stage === 'Initiation' ? 'REPORTER / CREATOR' : 'PHASE ASSIGNEE'}
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <p className="text-xs font-black text-slate-900 uppercase leading-none">{assignee.name}</p>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">{assignee.role || 'Personnel'}</p>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm">
                                    <AvatarImage src={assignee.avatar} />
                                    <AvatarFallback className="font-black text-xs bg-slate-900 text-white">{assignee.name[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col items-end">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">TARGET DELIVERY</p>
                        <div className="flex items-center gap-2 text-blue-600">
                            <Clock className="h-5 w-5" />
                            <span className="text-xl font-black tracking-tighter">TBD</span>
                        </div>
                    </div>
                </div>
            </div>

            {isReturned && (
                <div className="p-8 rounded-[2rem] bg-rose-50 border-2 border-rose-100 flex items-start gap-6 shadow-sm">
                    <AlertTriangle className="h-6 w-6 text-rose-500" />
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-1">Official Review Correction instructed</p>
                        <p className="text-lg font-bold text-rose-900 italic">"{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification.'}"</p>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[400px]">
                {renderStageContent()}
            </div>

            {isCurrentStage && isSubmitted && isSupervisor && stage !== 'Initiation' && (
                <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 border border-white/5">
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-10 w-10 text-emerald-500" />
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-tight">Official Verification Workspace</h4>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Lifecycle Governance Validation</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                         <Button className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg active:scale-95 transition-all" onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified.')}>
                            <ThumbsUp className="mr-3 h-5 w-5" /> Verify & Continue
                         </Button>
                         <Button variant="outline" className="flex-1 h-14 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-black uppercase tracking-widest text-[11px] rounded-xl transition-all active:scale-95" onClick={() => reviewStage(observation.id, stage, 'Returned', 'Clarification required.')}>
                            <Undo2 className="mr-3 h-5 w-5" /> Instruct Rework
                         </Button>
                    </div>
                </div>
            )}

            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); setNumPages(null); setPageNumber(1); }}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl w-full h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black border border-white/10 shadow-2xl">
                    <DialogTitle className="px-6 py-4 text-white text-sm font-black uppercase tracking-widest bg-slate-900/50">Forensic Evidence Viewer</DialogTitle>
                    <div className="absolute top-16 right-6 z-50 flex items-center gap-3">
                        {!isPdf && (
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-white bg-blue-600 hover:bg-blue-700 shadow-lg rounded-lg" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-5 w-5" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 text-white bg-slate-700 hover:bg-slate-800 shadow-lg rounded-lg" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-5 w-5" /></Button>
                            </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-10 w-10 bg-rose-600 text-white rounded-lg shadow-lg" onClick={() => setViewingAttachmentUrl(null)}><X className="h-5 w-5" /></Button>
                    </div>
                    <div 
                      ref={imageContainerRef}
                      className="aspect-video w-full overflow-hidden flex items-center justify-center bg-black relative"
                      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}
                    >
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
                                <img src={viewingAttachmentUrl || ''} alt="Evidence" className={cn("transition-transform duration-200 shadow-2xl", isPanning ? 'cursor-grabbing' : 'cursor-grab')} style={{ transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`, maxWidth: zoom > 1 ? 'none' : '100%', maxHeight: zoom > 1 ? 'none' : '100%', objectFit: 'contain' }} />
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
        <div className="p-10 space-y-10 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-10">
                    <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-800">OPERATIONAL LOGISTICS</h4>
                    </div>
                    <div className="space-y-6">
                        <EditableMeta label="Discovery Category" value={observation.category} isEditing={isEditing} type="select" options={['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']} onChange={val => setFormData(p => ({ ...p, category: val }))} icon={Search} />
                        <EditableMeta label="Risk Severity Index" value={observation.severity} isEditing={isEditing} type="select" options={['Low', 'Medium', 'High', 'Critical']} onChange={val => setFormData(p => ({ ...p, severity: val }))} icon={ShieldCheck} />
                        <EditableMeta label="Operational Site" value={project?.name || observation.projectId} isEditing={isEditing} type="select" options={projects.map(p => ({ id: p.id, name: p.name }))} onChange={val => setFormData(p => ({ ...p, projectId: val }))} icon={MapPin} />
                        <EditableMeta label="Specific Location" value={observation.location} isEditing={isEditing} type="text" onChange={val => setFormData(p => ({ ...p, location: val }))} icon={MapPin} />
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <h4 className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-800">NARRATIVE CONTEXT</h4>
                        </div>
                        {isAuthorized && !isEditing && (
                            <Button variant="ghost" size="sm" className="h-8 px-4 font-black uppercase text-[10px] border border-slate-200 rounded-lg hover:bg-slate-50" onClick={() => setIsEditing(true)}>
                                <Edit3 className="h-3.5 w-3.5 mr-2" /> OVERWRITE
                            </Button>
                        )}
                    </div>
                    <div className="space-y-8">
                        {isEditing ? (
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Finding Description</Label>
                                <Textarea className="min-h-[160px] rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-sm shadow-inner" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" className="h-9 font-bold" onClick={() => setIsEditing(false)}>CANCEL</Button>
                                    <Button size="sm" className="h-9 font-bold bg-blue-600" onClick={handleSave}>SAVE CHANGES</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-inner">
                                <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase tracking-tight">
                                    {sanitizedDescription}
                                </p>
                            </div>
                        )}

                        {extractedEvidenceUrl && (
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discovery Evidence</Label>
                                <div 
                                    className="h-40 w-64 rounded-xl border-2 border-slate-200 bg-white overflow-hidden relative group/img cursor-zoom-in shadow-md"
                                    onClick={() => onViewImage(extractedEvidenceUrl)}
                                >
                                    <img src={extractedEvidenceUrl} alt="E" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 flex items-center justify-center transition-all">
                                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover/img:opacity-100" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EditableMeta({ label, value, isEditing, type, options, onChange, icon: Icon }: { label: string, value: string, isEditing: boolean, type: 'text' | 'select', options?: any[], onChange: (val: any) => void, icon?: any }) {
    return (
        <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#304B68] ml-1">
                {Icon && <Icon className="h-3 w-3 text-[#7A9ABB]" />}
                {label}
            </Label>
            {isEditing ? (
                type === 'select' ? (
                    <Select value={value} onValueChange={onChange}>
                        <SelectTrigger className="h-[42px] rounded-[10px] border-[#DCE5EF] bg-slate-50 shadow-inner px-3.5 text-[10px] font-bold uppercase text-[#243B53] focus:ring-blue-100">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {options?.map(opt => (
                                <SelectItem key={typeof opt === 'string' ? opt : opt.id} value={typeof opt === 'string' ? opt : opt.id}>
                                    {typeof opt === 'string' ? opt : opt.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input className="h-[42px] rounded-[10px] border-[#DCE5EF] bg-slate-50 shadow-inner text-[10px] px-3.5 focus:ring-blue-100" value={value} onChange={e => onChange(e.target.value)} />
                )
            ) : (
                <div className="h-[42px] px-3.5 flex items-center bg-slate-50 border border-[#DCE5EF] rounded-[10px] shadow-inner">
                    <span className="text-[10px] font-bold text-[#102A43] uppercase truncate">{value}</span>
                </div>
            )}
        </div>
    );
}
