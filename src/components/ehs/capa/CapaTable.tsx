'use client';

import React, { useMemo, useState, useRef, MouseEvent } from 'react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    format, 
    parseISO, 
    differenceInDays,
    isValid
} from 'date-fns';
import { cn } from '@/lib/utils';
import { 
    MoreVertical, 
    Trash2,
    MapPin,
    ExternalLink,
    Clock,
    ZoomIn,
    X,
    Download,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

interface CapaTableProps {
    observations: EhsObservation[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onOpenCockpit: (id: string) => void;
}

const riskStyles: Record<string, string> = {
    'Low': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Medium': 'bg-amber-50 text-amber-700 border-amber-100',
    'High': 'bg-rose-50 text-rose-700 border-rose-100',
    'Critical': 'bg-rose-100 text-rose-900 border-rose-200',
};

const statusStyles: Record<string, string> = {
    'Open': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Progress': 'bg-blue-600 text-white border-none',
    'Closed': 'bg-emerald-600 text-white border-none',
    'Returned': 'bg-rose-600 text-white border-none',
};

export default function CapaTable({ observations, selectedId, onSelect, onOpenCockpit }: CapaTableProps) {
    const { projects } = useGeneral();
    const { user } = useAuth();
    const { deleteObservation } = useEhs();

    // Lightbox State
    const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);

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

    return (
        <>
        <Table className="w-full border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-40 bg-white shadow-sm">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                    <TableHead className="w-12 px-6 border-b border-slate-200">
                        <Checkbox />
                    </TableHead>
                    <TableHead className="w-[90px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">CASE ID</TableHead>
                    <TableHead className="min-w-[200px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">NARRATIVE FINDINGS</TableHead>
                    <TableHead className="w-[110px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">CATEGORY</TableHead>
                    <TableHead className="w-[90px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">RISK</TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">STATUS</TableHead>
                    <TableHead className="w-[100px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">SITE</TableHead>
                    <TableHead className="w-[110px] font-black text-slate-900 border-b uppercase tracking-widest text-[9px] h-14">INITIATED</TableHead>
                    <TableHead className="w-[80px] font-black text-slate-900 border-b text-center uppercase tracking-widest text-[9px] h-14">AGE</TableHead>
                    <TableHead className="w-[70px] text-right font-black text-slate-900 border-b uppercase tracking-widest text-[9px] px-6 h-14">ACTION</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {observations.map((obs) => {
                    const project = projects.find(p => p.id === obs.projectId);
                    const isSelected = selectedId === obs.id;
                    const createdDate = parseISO(obs.createdAt);
                    const ageDays = isValid(createdDate) ? differenceInDays(new Date(), createdDate) : 0;

                    // Extract Evidence URL and Sanitize Text
                    const evidenceUrl = obs.discoveryAttachmentUrl || obs.description.match(/src="([^"]+)"/i)?.[1];
                    const sanitizedText = obs.description.replace(/<IMG[^>]*>/gi, '').replace(/<[^>]*>?/gm, '').trim();

                    return (
                        <TableRow 
                            key={obs.id} 
                            className={cn(
                                "group cursor-pointer hover:bg-blue-50/20 transition-colors border-b border-slate-50",
                                isSelected && "bg-blue-50/30"
                            )}
                            onClick={() => onSelect(isSelected ? null : obs.id)}
                        >
                            <TableCell className="px-6 py-4">
                                <Checkbox checked={isSelected} />
                            </TableCell>
                            <TableCell className="font-mono text-[10px] font-black text-blue-600">
                                <button 
                                    className="hover:underline flex flex-col items-start leading-tight"
                                    onClick={(e) => { e.stopPropagation(); onOpenCockpit(obs.id); }}
                                >
                                    <span>CAPA-</span>
                                    <span>{obs.id.slice(-3).toUpperCase()}</span>
                                </button>
                            </TableCell>
                            <TableCell className="py-4">
                                <div className="flex items-start gap-4 max-w-[400px]">
                                    {evidenceUrl && (
                                        <div 
                                            className="h-10 w-16 shrink-0 rounded border border-slate-200 bg-slate-50 overflow-hidden relative group/thumb cursor-zoom-in"
                                            onClick={(e) => { e.stopPropagation(); setViewingAttachmentUrl(evidenceUrl); }}
                                        >
                                            <img src={evidenceUrl} alt="E" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 flex items-center justify-center transition-all">
                                                <ZoomIn className="h-3 w-3 text-white opacity-0 group-hover/thumb:opacity-100" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-[11px] font-bold text-slate-800 line-clamp-2 uppercase tracking-tight leading-tight">
                                            {sanitizedText}
                                        </p>
                                        <div className="flex items-center gap-1.5 opacity-60">
                                            <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{obs.location || 'SITE POSITION TBD'}</span>
                                        </div>
                                    </div>
                                </div>
                            </TableCell>

                            <TableCell className="text-center">
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-5 px-2 rounded-sm bg-slate-50 border-slate-200 text-slate-600 whitespace-nowrap">
                                    {obs.category}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                                <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest h-5 px-2 border rounded-sm", riskStyles[obs.severity])}>
                                    {obs.severity}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                                <Badge className={cn("text-[8px] font-black uppercase tracking-widest h-5 px-3 rounded-sm border", statusStyles[obs.status])}>
                                    {obs.status}
                                </Badge>
                            </TableCell>
                            
                            <TableCell className="text-[9px] font-black text-slate-900 uppercase">
                                {project?.name || 'N/A'}
                            </TableCell>

                            <TableCell className="text-[9px] font-bold text-slate-500 uppercase">
                                <div className="flex flex-col leading-none gap-0.5">
                                    <span className="text-slate-900">{format(createdDate, 'dd MMM')}</span>
                                    <span>{format(createdDate, 'yyyy')}</span>
                                </div>
                            </TableCell>
                            
                            <TableCell className="text-center">
                                <div className={cn(
                                    "text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1",
                                    ageDays > 14 ? "text-rose-600" : "text-slate-500"
                                )}>
                                    <Clock className="h-3 w-3" />
                                    <span>{ageDays}D</span>
                                </div>
                            </TableCell>

                            <TableCell className="text-right px-6">
                                <div className="flex items-center justify-end gap-1">
                                    {user?.role === 'Admin' && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">DELETE SAFETY CASE?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-slate-500 font-medium">
                                                        This action wipes all technical data for Case <strong>CAPA-{obs.id.slice(-3).toUpperCase()}</strong>.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="gap-3">
                                                    <AlertDialogCancel className="font-bold rounded-xl h-11 px-8">CANCEL</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] h-11 px-10 rounded-xl"
                                                        onClick={() => deleteObservation(obs.id)}
                                                    >
                                                        DELETE PERMANENTLY
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>

        {/* --- LIGHTBOX EVIDENCE VIEWER --- */}
        <Dialog open={!!viewingAttachmentUrl} onOpenChange={() => { setViewingAttachmentUrl(null); setZoom(1); setTranslate({x: 0, y: 0}); setNumPages(null); setPageNumber(1); }}>
            <DialogContent className="max-w-3xl w-full h-auto max-h-[85vh] flex flex-col p-0 overflow-hidden bg-black border border-white/10 shadow-2xl">
                <div className="sr-only">
                    <DialogTitle>Case Discovery Evidence Viewer</DialogTitle>
                    <DialogDescription>Full-resolution technical evidence for forensic inspection.</DialogDescription>
                </div>

                {/* Minimalist Overlay Controls */}
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                    {!isPdf && (
                        <div className="flex bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
                        </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-white hover:bg-rose-600 transition-colors" onClick={() => setViewingAttachmentUrl(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Bottom Status/Download Bar */}
                <div className="absolute bottom-4 left-4 right-4 z-50 flex justify-between items-center">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Registry Evidence Preview</p>
                        {isPdf && numPages && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-white border-l border-white/20 pl-3">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}><ChevronLeft className="h-3 w-3" /></Button>
                                <span>PAGE {pageNumber} / {numPages}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}><ChevronRight className="h-3 w-3" /></Button>
                            </div>
                        )}
                    </div>
                    <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white hover:text-black font-black uppercase text-[10px] tracking-widest h-9 px-6 rounded-full gap-2" asChild>
                        <a href={viewingAttachmentUrl || ''} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" /> DOWNLOAD
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
                                        <Page pageNumber={pageNumber} scale={1.2} />
                                    </Document>
                                </div>
                            </ScrollArea>
                        ) : (
                            <img 
                                src={viewingAttachmentUrl} 
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
        </>
    );
}