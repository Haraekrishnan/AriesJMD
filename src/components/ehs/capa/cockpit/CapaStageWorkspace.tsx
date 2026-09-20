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
    Paperclip,
    Zap,
    Activity,
    Target,
    Clock,
    UserPlus,
    Check,
    ChevronsUpDown,
    Upload,
    Trash2,
    ExternalLink
} from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO, isValid } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CAPA_STAGES } from '@/lib/ehs-observations';
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

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user, users } = useAuth();
    const { assignStageOwner, addStageAttachment, deleteStageAttachment } = useEhs();
    const { toast } = useToast();
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
    const [isReassigning, setIsReassigning] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted || !isCurrentStage || user?.id !== sData?.assigneeId;

    const isAuthorizedToReassign = user && ['Admin', 'Project Coordinator', 'Senior Safety Supervisor'].includes(user.role);

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

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        toast({ title: 'Uploading document…', description: 'Adding your attachment to this stage.' });

        const formData = new FormData();
        formData.append("file", file);
        
        try {
            const res = await fetch("/api/upload/dropbox", {
                method: "POST",
                body: formData,
            });

            const uploadData = await res.json();
            setIsUploading(false);

            if (uploadData.success) {
                addStageAttachment(observation.id, stage, file.name, uploadData.downloadLink);
                toast({ title: 'Document uploaded', description: 'The attachment is available in this case.' });
            } else {
                throw new Error(uploadData.error);
            }
        } catch (error: any) {
            setIsUploading(false);
            toast({ variant: 'destructive', title: 'Upload failed', description: error.message || 'Please try uploading the document again.' });
        }
    };

    const attachments = useMemo(() => {
        if (!sData?.attachments) return [];
        return Object.values(sData.attachments).sort((a, b) => 
            parseISO(b.uploadedAt).getTime() - parseISO(a.uploadedAt).getTime()
        );
    }, [sData]);

    const renderStageContent = () => {
        switch (stage) {
            case 'Initiation': return <CapaInitiation observation={observation} onViewImage={setViewingAttachmentUrl} />;
            case 'Investigation': return (
                <Tabs defaultValue="summary" className="w-full">
                    <div className="bg-slate-50/50 border-b px-6">
                        <TabsList className="h-14 w-full justify-start gap-6 bg-transparent p-0">
                            {[
                                { id: 'summary', label: 'Summary', icon: FileText },
                                { id: '5why', label: '5-Why Analysis', icon: Activity },
                                { id: 'rootcause', label: 'Root cause', icon: Zap },
                                { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 },
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.id} 
                                    value={tab.id}
                                    className="h-14 rounded-none border-b-2 border-transparent px-0 text-sm font-semibold normal-case tracking-normal text-slate-400 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                                >
                                    <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    <div className="outline-none">
                        <TabsContent value="summary" className="m-0 focus-visible:ring-0 p-6"><CapaInvestigationWorkspace observation={observation} /></TabsContent>
                        <TabsContent value="5why" className="m-0 focus-visible:ring-0 p-6"><Capa5Why isLocked={isLocked} /></TabsContent>
                        <TabsContent value="rootcause" className="m-0 focus-visible:ring-0 p-6"><CapaSystemicRootCause isLocked={isLocked} /></TabsContent>
                        <TabsContent value="conclusion" className="m-0 focus-visible:ring-0 p-6"><CapaPhaseConclusion isLocked={isLocked} /></TabsContent>
                    </div>
                </Tabs>
            );
            case 'Resolution': return <div className="p-6"><CapaResolution observation={observation} isLocked={isLocked} /></div>;
            case 'Implementation': return <div className="p-6"><CapaImplementation observation={observation} isLocked={isLocked} /></div>;
            case 'Effectiveness Review': return <div className="p-6"><CapaEffectivenessReview observation={observation} isLocked={isLocked} /></div>;
            case 'Reference': return <div className="p-6"><CapaReference observation={observation} isLocked={isLocked} /></div>;
            case 'Closure': return <div className="p-6"><CapaClosure observation={observation} isLocked={isLocked} /></div>;
            default: return null;
        }
    };

    return (
        <div className="ehs-stage-content space-y-5 text-left">
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-wrap gap-5 items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-semibold text-2xl shadow-xl shadow-blue-500/20">
                        {String(CAPA_STAGES.indexOf(stage) + 1).padStart(2, '0')}
                    </div>
                    <div>
                        <h3 className="text-2xl font-semibold text-slate-900 normal-case tracking-tight leading-none mb-2">{stage}</h3>
                        <p className="text-sm font-medium text-slate-500 leading-none">Review the findings and evidence for this stage.</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-5 text-right">
                    {assignee && (
                        <div className="flex flex-col items-end">
                            <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal mb-1.5 uppercase">
                                {stage === 'Initiation' ? 'REPORTED BY' : 'PHASE ASSIGNEE'}
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <p className="text-xs font-black text-slate-900 uppercase leading-none">{assignee.name}</p>
                                    <p className="text-sm font-bold text-blue-600 normal-case tracking-normal mt-1 uppercase">{assignee.role || 'Personnel'}</p>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm">
                                    <AvatarImage src={assignee.avatar} />
                                    <AvatarFallback className="font-semibold text-xs bg-slate-900 text-white">{assignee.name[0]}</AvatarFallback>
                                </Avatar>
                                {isAuthorizedToReassign && isCurrentStage && (
                                    <Popover open={isReassigning} onOpenChange={setIsReassigning}>
                                        <PopoverTrigger asChild>
                                            <Button aria-label="Reassign stage owner" variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                                                <UserPlus className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-0 z-50" align="end">
                                            <Command className="bg-white">
                                                <CommandInput placeholder="Reassign to..." className="h-10 text-sm" />
                                                <CommandList>
                                                    <CommandEmpty>No personnel found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {users.filter(u => u.status !== 'deactivated' && u.role !== 'Manager').map(u => (
                                                            <CommandItem
                                                                key={u.id}
                                                                onSelect={() => {
                                                                    assignStageOwner(observation.id, stage, u.id);
                                                                    setIsReassigning(false);
                                                                }}
                                                                className="text-xs font-bold uppercase cursor-pointer"
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", u.id === sData?.assigneeId ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-col leading-tight">
                                                                    <span>{u.name}</span>
                                                                    <span className="text-sm opacity-60 uppercase">{u.role}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col items-end">
                        <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal mb-1.5 uppercase">TARGET DATE</p>
                        <div className="flex items-center gap-2 text-blue-600">
                            <Clock className="h-5 w-5" />
                            <span className="text-sm font-medium">{sData?.targetDate && isValid(parseISO(sData.targetDate)) ? format(parseISO(sData.targetDate), 'dd MMM yyyy') : 'Not set'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[280px]">
                {renderStageContent()}
                
                {/* --- UNIVERSAL ATTACHMENT REGISTRY --- */}
                <div className="px-6 py-8 border-t bg-slate-50/30">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Paperclip className="h-5 w-5 text-blue-600" />
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">ATTACH DOCUMENT</h4>
                        </div>
                        {!isLocked && (
                            <div className="relative">
                                <Button variant="outline" className="h-9 px-6 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 bg-white gap-2 shadow-sm" disabled={isUploading}>
                                    <Upload className="h-3.5 w-3.5" /> {isUploading ? 'SYNCING...' : 'ATTACH DOCUMENT'}
                                </Button>
                                <input type="file" aria-label="Attach document" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} disabled={isUploading} />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {attachments.map(att => (
                            <div key={att.id} className="group p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-300 transition-all shadow-sm">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate normal-case tracking-tight">{att.name}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Sync: {format(parseISO(att.uploadedAt), 'dd MMM, HH:mm')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => setViewingAttachmentUrl(att.url)}>
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                    <a href={att.url} download target="_blank" rel="noopener noreferrer">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-lg">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </a>
                                    {(!isLocked && (user?.id === att.uploadedBy || user?.role === 'Admin')) && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-xl font-semibold normal-case tracking-tight">DELETE ATTACHMENT?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-sm font-medium">Permanently remove "{att.name}" from the institutional registry?</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white font-semibold" onClick={() => deleteStageAttachment(observation.id, stage, att.id)}>DELETE</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        ))}
                        {attachments.length === 0 && (
                            <div className="col-span-full py-8 text-center bg-slate-50/50 border-2 border-dashed rounded-xl border-slate-200">
                                <Paperclip className="h-6 w-6 mx-auto mb-2 opacity-20 text-slate-400" />
                                <p className="text-sm font-semibold normal-case tracking-normal text-slate-400">No documents attached for this milestone.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); setNumPages(null); setPageNumber(1); }}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl w-full h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black border border-white/10 shadow-2xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Document Viewer</DialogTitle>
                        <DialogDescription>Full-resolution technical documentation review.</DialogDescription>
                    </DialogHeader>
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
                                <img src={viewingAttachmentUrl || ''} alt="Attachment" className={cn("transition-transform duration-200 shadow-2xl", isPanning ? 'cursor-grabbing' : 'cursor-grab')} style={{ transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`, maxWidth: zoom > 1 ? 'none' : '100%', maxHeight: zoom > 1 ? 'none' : '100%', objectFit: 'contain' }} />
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

    const isAuthorized = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor' || user?.role === 'Project Coordinator';
    const project = projects.find(p => p.id === observation.projectId);

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
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN: DETAILS */}
                    <div className="space-y-8">
                        <SectionHeading icon={MapPin} title="DETAILS" />
                        <div className="space-y-6">
                            <EditableMeta label="Discovery Category" value={isEditing ? formData.category : observation.category} isEditing={isEditing} type="select" options={['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']} onChange={val => setFormData(p => ({ ...p, category: val }))} icon={Search} />
                            <EditableMeta label="Risk Severity" value={isEditing ? formData.severity : observation.severity} isEditing={isEditing} type="select" options={['Low', 'Medium', 'High', 'Critical']} onChange={val => setFormData(p => ({ ...p, severity: val }))} icon={ShieldCheck} />
                            <EditableMeta label="Operational Site" value={isEditing ? formData.projectId : (project?.name || observation.projectId)} isEditing={isEditing} type="select" options={projects.map(p => ({ id: p.id, name: p.name }))} onChange={val => setFormData(p => ({ ...p, projectId: val }))} icon={MapPin} />
                            <EditableMeta label="Specific Location" value={isEditing ? formData.location : observation.location} isEditing={isEditing} type="text" onChange={val => setFormData(p => ({ ...p, location: val }))} icon={MapPin} />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY */}
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <SectionHeading icon={FileText} title="SUMMARY" />
                            {isAuthorized && !isEditing && (
                                <Button variant="ghost" size="sm" className="h-7 px-3 text-[9px] font-black uppercase border border-slate-200 tracking-widest" onClick={() => setIsEditing(true)}>
                                    <Edit3 className="h-3 w-3 mr-1.5" /> OVERWRITE
                                </Button>
                            )}
                        </div>
                        <div className="space-y-6">
                            {isEditing ? (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#304B68]">Finding Description</Label>
                                    <Textarea aria-label="Finding description" className="min-h-[180px] rounded-[10px] border-[#DCE5EF] bg-slate-50 shadow-inner font-bold text-sm" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase" onClick={() => setIsEditing(false)}>Cancel</Button>
                                        <Button size="sm" className="h-8 text-[10px] font-black uppercase bg-blue-600" onClick={handleSave}>Save changes</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 rounded-xl bg-slate-50 border border-[#DCE5EF] shadow-inner min-h-[180px]">
                                    <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase tracking-tight">
                                        {sanitizedDescription || "No summary provided."}
                                    </p>
                                </div>
                            )}

                            {extractedEvidenceUrl && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-[#304B68]">Discovery Evidence</Label>
                                    <div 
                                        className="h-32 w-48 rounded-lg border-2 border-slate-200 bg-white overflow-hidden relative group/img cursor-zoom-in"
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
        </div>
    );
}

function SectionHeading({ icon: Icon, title }: { icon: any, title: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-blue-600" />
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#304B68]">{title}</h4>
        </div>
    );
}

function EditableMeta({ label, value, isEditing, type, options, onChange, icon: Icon }: { label: string, value: string, isEditing: boolean, type: 'text' | 'select', options?: any[], onChange: (val: any) => void, icon?: any }) {
    return (
        <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#304B68] ml-1">
                {Icon && <Icon className="h-3 w-3 text-[#7A9ABB]" />}
                {label}
            </Label>
            {isEditing ? (
                type === 'select' ? (
                    <Select value={value} onValueChange={onChange}>
                        <SelectTrigger aria-label={label} className="h-[42px] rounded-[10px] border-[#DCE5EF] bg-slate-50 shadow-inner px-3.5 text-sm font-black uppercase text-[#243B53] tracking-widest">
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
                    <Input aria-label={label} className="h-[42px] rounded-[10px] border-[#DCE5EF] bg-slate-50 shadow-inner text-sm font-bold" value={value} onChange={e => onChange(e.target.value)} />
                )
            ) : (
                <div className="h-[42px] px-3.5 flex items-center bg-slate-50 border border-[#DCE5EF] rounded-[10px] shadow-inner">
                    <span className="text-sm font-black text-[#102A43] uppercase truncate tracking-widest">{value}</span>
                </div>
            )}
        </div>
    );
}
