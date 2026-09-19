'use client';

import React, { useState, useRef, MouseEvent, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Clock, 
    FileText, 
    Download, 
    Trash2,
    Paperclip,
    ShieldCheck,
    CheckCircle2,
    Target,
    Activity,
    UploadCloud,
    AlertTriangle,
    ThumbsUp,
    Undo2,
    Lock,
    Search,
    ZoomIn,
    ZoomOut,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import type { EhsObservation, CapaStage, User as UserType } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document, Page, pdfjs } from 'react-pdf';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Set up PDF worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

// Phase-Specific Components
import CapaInvestigation from '../stages/CapaInvestigation';
import Capa5Why from '../stages/Capa5Why';
import CapaSystemicRootCause from '../stages/CapaSystemicRootCause';
import CapaInvestigationConclusion from '../stages/CapaInvestigationConclusion';
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
    const { reviewStage, deleteStageAttachment } = useEhs();
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
    const currentOwner = users.find(u => u.id === sData?.assigneeId);
    
    // Deletion Logic
    const isAssignor = user?.id === sData?.assignedById;
    const canDeleteDocument = (isAssignor || user?.role === 'Admin') && !isLocked;

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

    const isPdf = viewingAttachmentUrl && viewingAttachmentUrl.toLowerCase().includes('.pdf');

    const renderStageContent = () => {
        switch (stage) {
            case 'Investigation':
                return (
                    <Tabs defaultValue="summary" className="w-full">
                        <div className="px-10 bg-slate-50/50 border-b-2">
                            <TabsList className="h-14 w-full justify-start gap-12 bg-transparent p-0">
                                {[
                                    { id: 'summary', label: 'Technical Summary', icon: FileText },
                                    { id: '5why', label: '5-Why Root Cause', icon: Activity },
                                    { id: 'systemic', label: 'Systemic Root Cause', icon: Target },
                                    { id: 'conclusion', label: 'Phase Conclusion', icon: CheckCircle2 },
                                ].map(tab => (
                                    <TabsTrigger 
                                        key={tab.id} 
                                        value={tab.id}
                                        className="h-14 rounded-none border-b-4 border-transparent px-0 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 data-[state=active]:border-[#2563EB] data-[state=active]:text-[#2563EB] bg-transparent shadow-none"
                                    >
                                        <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                        <TabsContent value="summary" className="p-12 m-0"><CapaInvestigation observation={observation} isLocked={isLocked} /></TabsContent>
                        <TabsContent value="5why" className="p-12 m-0"><Capa5Why isLocked={isLocked} /></TabsContent>
                        <TabsContent value="systemic" className="p-12 m-0"><CapaSystemicRootCause isLocked={isLocked} /></TabsContent>
                        <TabsContent value="conclusion" className="p-12 m-0"><CapaInvestigationConclusion isLocked={isLocked} /></TabsContent>
                    </Tabs>
                );
            case 'Resolution': return <div className="p-12"><CapaResolution observation={observation} isLocked={isLocked} /></div>;
            case 'Implementation': return <div className="p-12"><CapaImplementation observation={observation} isLocked={isLocked} /></div>;
            case 'Effectiveness Review': return <div className="p-12"><CapaEffectivenessReview observation={observation} isLocked={isLocked} /></div>;
            case 'Reference': return <div className="p-12"><CapaReference observation={observation} isLocked={isLocked} /></div>;
            case 'Closure': return <div className="p-12"><CapaClosure observation={observation} isLocked={isLocked} /></div>;
            default: return <div className="p-24 text-center opacity-30 font-black uppercase text-xs tracking-[0.3em]">Technical Workspace Offline</div>;
        }
    };

    const attachmentsArray = useMemo(() => {
        if (!sData?.attachments) return [];
        return Object.values(sData.attachments).sort((a, b) => 
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
    }, [sData?.attachments]);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left">
            {/* --- PHASE HEADER & ALERTS --- */}
            <div className="space-y-8">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-10">
                        <div className="h-16 w-16 rounded-none border-4 border-slate-900 bg-[#2563EB] flex items-center justify-center text-white text-3xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                            0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <Badge className={cn(
                                    "h-6 font-black uppercase text-[10px] tracking-[0.25em] border-none shadow-sm rounded-none px-4",
                                    isCompleted ? "bg-emerald-600" : isReturned ? "bg-rose-600" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                                )}>
                                    {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION REQUIRED'}
                                </Badge>
                            </div>
                            <h3 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-12">
                        <div className="text-right space-y-1.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">PHASE OWNER</p>
                            <div className="flex items-center gap-4">
                                <div className="leading-tight">
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{currentOwner?.name || 'UNASSIGNED'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Technical Lead</p>
                                </div>
                                <Avatar className="h-12 w-12 border-2 border-slate-900 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <AvatarImage src={currentOwner?.avatar} />
                                    <AvatarFallback className="text-[12px] font-black bg-blue-50 text-blue-600">{currentOwner?.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <div className="h-16 w-1.5 bg-slate-900" />
                        <div className="text-right space-y-1.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">TARGET DELIVERY</p>
                            <p className="text-lg font-black text-slate-900 flex items-center justify-end gap-3 tracking-tighter">
                                <Clock className="h-5 w-5 text-blue-600" /> {sData?.targetDate ? format(parseISO(sData.targetDate), 'dd MMM yyyy') : 'TBD'}
                            </p>
                        </div>
                    </div>
                </div>

                {isReturned && (
                    <div className="p-10 rounded-none border-4 border-rose-600 bg-rose-50 flex items-start gap-8 shadow-[10px_10px_0px_0px_rgba(225,29,72,0.1)]">
                        <div className="p-5 bg-rose-600 rounded-none shadow-xl">
                            <AlertTriangle className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1 space-y-5">
                            <div>
                                <p className="text-[12px] font-black text-rose-600 uppercase tracking-[0.4em] mb-2">OFFICIAL REVIEW CORRECTION INSTRUCTED</p>
                                <p className="text-xl font-bold text-rose-900 leading-relaxed italic">
                                    "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification and resubmission.'}"
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- PHASE WORKSPACE --- */}
            <Card className="bg-white border-4 border-slate-900 rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {renderStageContent()}
            </Card>

            {/* --- PHASE DOCUMENT LEDGER --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 pl-1">
                    <Paperclip className="h-5 w-5 text-blue-600" />
                    <h4 className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-900">PHASE DOCUMENT LEDGER</h4>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {attachmentsArray.map(a => (
                        <Card key={a.id} className="bg-white border-2 border-slate-900 rounded-none p-5 flex items-center justify-between shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-none bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                                    <FileText className="h-7 w-7 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{a.name}</p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {format(parseISO(a.uploadedAt), 'dd MMM yyyy, p')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-12 w-12 text-blue-600 hover:bg-blue-100/50 border-2 border-transparent hover:border-blue-600 rounded-none"
                                    onClick={() => setViewingAttachmentUrl(a.url)}
                                >
                                    <Download className="h-6 w-6" />
                                </Button>
                                {canDeleteDocument && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-12 w-12 text-rose-600 hover:bg-rose-100/50 border-2 border-transparent hover:border-rose-600 rounded-none"
                                            >
                                                <Trash2 className="h-6 w-6" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-none border-4 border-slate-900">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="font-black uppercase tracking-tight">DELETE DOCUMENT RECORD?</AlertDialogTitle>
                                                <AlertDialogDescription className="font-bold text-slate-500">
                                                    This will permanently purge this document from the phase ledger. This action is irreversible.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-none font-black uppercase text-[10px] h-12 px-8 border-2 border-slate-200">Cancel</AlertDialogCancel>
                                                <AlertDialogAction 
                                                    className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-10 rounded-none shadow-lg"
                                                    onClick={() => deleteStageAttachment(observation.id, stage, a.id)}
                                                >
                                                    CONFIRM PURGE
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </Card>
                    ))}
                    
                    {!isLocked && (
                        <div className="h-full border-4 border-dashed border-slate-200 rounded-none bg-white p-10 flex flex-col items-center justify-center gap-5 cursor-pointer hover:bg-slate-50 hover:border-[#2563EB] transition-all group min-h-[140px]">
                            <div className="h-12 w-12 bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                <UploadCloud className="h-7 w-7 text-[#2563EB]" />
                            </div>
                            <div className="text-center">
                                <p className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">DROP TECHNICAL DOCUMENT HERE</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">OR CLICK TO BROWSE LOCAL DIRECTORY</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- ATTACHMENT VIEWER --- */}
            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); setNumPages(null); setPageNumber(1); }}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl w-full h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-none">
                    <div className="sr-only">
                        <DialogTitle>Phase Document Viewer</DialogTitle>
                        <DialogDescription>Full-resolution view for forensic verification.</DialogDescription>
                    </div>

                    <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
                        {!isPdf && (
                            <div className="flex gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-12 w-12 text-white bg-blue-600 hover:bg-blue-700 shadow-xl rounded-none border-2 border-blue-400/30" 
                                    onClick={() => setZoom(z => z + 0.2)}
                                >
                                    <ZoomIn className="h-6 w-6" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-12 w-12 text-white bg-slate-700 hover:bg-slate-800 shadow-xl rounded-none border-2 border-slate-500/30" 
                                    onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}
                                >
                                    <ZoomOut className="h-6 w-6" />
                                </Button>
                            </div>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-12 w-12 bg-rose-600 text-white hover:bg-rose-700 shadow-xl rounded-none border-2 border-rose-400/30 transition-colors" 
                            onClick={() => setViewingAttachmentUrl(null)}
                        >
                            <X className="h-6 w-6" />
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
                                    <div className="flex justify-center p-20">
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
                                    alt="Document" 
                                    className={cn("transition-transform duration-200 shadow-2xl", isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                                    style={{ 
                                        transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`, 
                                        maxWidth: '100%', 
                                        maxHeight: '100%',
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
