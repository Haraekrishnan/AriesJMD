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
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document, Page, pdfjs } from 'react-pdf';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Set up PDF worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

// Phase-Specific Components
import CapaInvestigationWorkspace from './CapaInvestigationWorkspace';
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

    const isPdf = useMemo(() => {
        return viewingAttachmentUrl?.toLowerCase().endsWith('.pdf');
    }, [viewingAttachmentUrl]);

    const renderStageContent = () => {
        switch (stage) {
            case 'Investigation':
                return <CapaInvestigationWorkspace observation={observation} />;
            case 'Resolution': return <CapaResolution observation={observation} isLocked={isLocked} />;
            case 'Implementation': return <CapaImplementation observation={observation} isLocked={isLocked} />;
            case 'Effectiveness Review': return <CapaEffectivenessReview observation={observation} isLocked={isLocked} />;
            case 'Reference': return <CapaReference observation={observation} isLocked={isLocked} />;
            case 'Closure': return <CapaClosure observation={observation} isLocked={isLocked} />;
            default: return <div className="py-20 text-center opacity-30 font-black uppercase text-xs tracking-[0.3em]">Technical Workspace Offline</div>;
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
            {/* --- PHASE IDENTIFIER --- */}
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-8">
                        <div className="h-16 w-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-500/20">
                            0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge className={cn(
                                    "h-5 font-black uppercase text-[8px] tracking-[0.2em] border-none shadow-sm rounded-lg px-3",
                                    isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                                )}>
                                    {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION REQUIRED'}
                                </Badge>
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{stage}</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-10">
                        <div className="text-right space-y-1.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">PHASE OWNER</p>
                            <div className="flex items-center gap-4">
                                <div className="leading-tight">
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{currentOwner?.name || 'UNASSIGNED'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Lead</p>
                                </div>
                                <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-md ring-1 ring-slate-100">
                                    <AvatarImage src={currentOwner?.avatar} />
                                    <AvatarFallback className="text-[12px] font-black bg-blue-50 text-blue-600">{currentOwner?.name?.[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    </div>
                </div>

                {isReturned && (
                    <div className="p-8 rounded-[2rem] bg-rose-50 border-2 border-rose-100 flex items-start gap-6 shadow-sm">
                        <div className="p-4 bg-rose-500 rounded-2xl shadow-xl shadow-rose-500/20">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-1">Official Review Correction instructed</p>
                                <p className="text-lg font-bold text-rose-900 leading-relaxed italic">
                                    "{sData?.comments ? Object.values(sData.comments).reverse()[0]?.text : 'Technical details require clarification.'}"
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- PHASE WORKSPACE --- */}
            <Card className="bg-white border-none rounded-[3rem] shadow-xl overflow-hidden">
                {renderStageContent()}
            </Card>

            {/* --- PHASE DOCUMENT LEDGER --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 pl-1">
                    <Paperclip className="h-5 w-5 text-blue-600" />
                    <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500">PHASE DOCUMENT LEDGER</h4>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {attachmentsArray.map(a => (
                        <Card key={a.id} className="bg-white border-none rounded-3xl p-5 flex items-center justify-between shadow-sm border border-slate-50 hover:shadow-md transition-all">
                            <div className="flex items-center gap-5">
                                <div className="h-12 w-12 rounded-2xl bg-slate-50 border flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{a.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {format(parseISO(a.uploadedAt), 'dd MMM yyyy, p')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-blue-600 hover:bg-blue-50 rounded-xl"
                                    onClick={() => setViewingAttachmentUrl(a.url)}
                                >
                                    <Download className="h-5 w-5" />
                                </Button>
                                {canDeleteDocument && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-600 hover:bg-rose-50 rounded-xl">
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="font-black uppercase tracking-tight text-slate-900 text-xl">DELETE DOCUMENT RECORD?</AlertDialogTitle>
                                                <AlertDialogDescription className="font-bold text-slate-500">
                                                    This will permanently purge this document from the phase ledger. This action is irreversible.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-xl font-bold h-11 px-8">Cancel</AlertDialogCancel>
                                                <AlertDialogAction 
                                                    className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] h-11 px-10 rounded-xl shadow-lg"
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
                        <div className="h-full border-2 border-dashed border-slate-200 rounded-[2rem] bg-white p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all group min-h-[140px]">
                            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <UploadCloud className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">TRANSMIT TECHNICAL DOCUMENT</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">DROP FILE OR CLICK TO BROWSE</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- OFFICIAL REVIEW PANEL --- */}
            {isCurrentStage && isSubmitted && isSupervisor && (
                <div className="p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-1000 border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <ShieldCheck className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase tracking-tight">Official Verification Workspace</h4>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Lifecycle Governance & Compliance Validation</p>
                        </div>
                    </div>
                    
                    <div className="p-6 rounded-[1.5rem] bg-white/5 border border-white/10 space-y-2">
                         <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                            Technical data and evidence have been uploaded by the assignee. Validate the findings to proceed to the next lifecycle stage.
                         </p>
                    </div>

                    <div className="flex gap-4">
                         <Button 
                            className="flex-1 h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
                            onClick={() => reviewStage(observation.id, stage, 'Completed', 'Documentation verified and approved.')}
                         >
                            <ThumbsUp className="mr-3 h-5 w-5" /> Verify & Continue Lifecycle
                         </Button>
                         <Button 
                            variant="outline" 
                            className="flex-1 h-16 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all active:scale-95"
                            onClick={() => reviewStage(observation.id, stage, 'Returned', 'Technical data requires clarification.')}
                         >
                            <Undo2 className="mr-3 h-5 w-5" /> Instruct Rework
                         </Button>
                    </div>
                </div>
            )}

            {/* --- VIEWER --- */}
            <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); setNumPages(null); setPageNumber(1); }}>
                <DialogContent className="max-w-[95vw] md:max-w-7xl w-full h-auto max-h-[90vh] flex flex-col p-0 overflow-hidden bg-black border border-white/10 shadow-2xl rounded-3xl">
                    <div className="sr-only">
                        <DialogTitle>Phase Document Viewer</DialogTitle>
                        <DialogDescription>Full-resolution view for technical verification.</DialogDescription>
                    </div>

                    <div className="absolute top-8 right-8 z-50 flex items-center gap-4">
                        {!isPdf && (
                            <div className="flex gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-white bg-blue-600 hover:bg-blue-700 shadow-xl rounded-xl border border-blue-400/30" 
                                    onClick={() => setZoom(z => z + 0.2)}
                                >
                                    <ZoomIn className="h-5 w-5" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-white bg-slate-700 hover:bg-slate-800 shadow-xl rounded-xl border border-slate-500/30" 
                                    onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}
                                >
                                    <ZoomOut className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 bg-rose-600 text-white hover:bg-rose-700 shadow-xl rounded-xl border border-rose-400/30 transition-colors" 
                            onClick={() => setViewingAttachmentUrl(null)}
                        >
                            <X className="h-5 w-5" />
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
                                        maxWidth: '90%', 
                                        maxHeight: '90%',
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