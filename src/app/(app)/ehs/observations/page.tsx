
'use client';

import React, { useState, useMemo, useEffect, useRef, MouseEvent } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, MapPin, Calendar, Eye, Users, 
  FileWarning, AlertCircle, CheckCircle, ShieldCheck, 
  Clock, MessageSquare, Zap, Send, Target, ChevronRight, 
  FileCheck, HelpCircle, ArrowRight, Lock, FileSearch, 
  Archive, ChevronLeft, FileText, Download, UserRound, 
  Check, XCircle, Trash2, ClipboardCheck, History, Upload, Paperclip, Undo2, Image as ImageIcon, X,
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, AlignLeft, AlignCenter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { EhsObservationStatus, EhsObservationSeverity, EhsObservation, CapaStage, CapaStageRecord } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

/* ------------------------------------------------------------------ */
/* RICH TEXT EDITOR COMPONENT */
/* ------------------------------------------------------------------ */

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const RichNarrativeEditor = ({ value, onChange, placeholder, disabled }: RichEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // Sync internal state with external value if needed
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleImageUpload(file);
        }
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    toast({ title: 'Processing Image...', description: 'Transmitting to Dropbox repository.' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/dropbox', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Insert image into editor
        const imgHtml = `<img src="${data.downloadLink}" alt="Pasted Evidence" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 2px solid #e2e8f0;" />`;
        execCommand('insertHTML', imgHtml);
        toast({ title: 'Evidence Attached' });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("border-2 rounded-xl overflow-hidden bg-white", disabled && "opacity-50 pointer-events-none")}>
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-0.5 p-1 bg-slate-50 border-b border-slate-200">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('bold')} title="Bold"><Bold className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('italic')} title="Italic"><Italic className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('underline')} title="Underline"><Underline className="h-4 w-4" /></Button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('insertUnorderedList')} title="Bullet List"><List className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('insertOrderedList')} title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('formatBlock', 'H3')} title="Heading"><Heading1 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand('formatBlock', 'P')} title="Normal Text"><AlignLeft className="h-4 w-4" /></Button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <div className="relative">
           <input 
             type="file" 
             className="absolute inset-0 opacity-0 cursor-pointer" 
             accept="image/*"
             onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
           />
           <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Insert Image"><ImageIcon className="h-4 w-4" /></Button>
        </div>
        {isUploading && <Loader2 className="h-3 w-3 animate-spin text-primary ml-2" />}
      </div>

      {/* EDITOR AREA */}
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        className="min-h-[250px] p-4 focus:outline-none font-bold text-slate-900 text-sm leading-relaxed"
        data-placeholder={placeholder}
      />
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

/* ------------------------------------------------------------------ */
/* CONFIGS */
/* ------------------------------------------------------------------ */

const severityConfig: Record<EhsObservationSeverity, { bg: string, text: string, border: string }> = {
  'Low': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Medium': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'High': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Critical': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const stageConfig: Record<CapaStage, { label: string, icon: any, color: string, badge: string, description: string }> = {
  'Initiation': { label: 'Initiation', icon: Plus, color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', description: 'Initial recording of the site observation.' },
  'Resolution': { label: 'Resolution', icon: FileCheck, color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700', description: 'Immediate correction and containment actions.' },
  'Investigation': { label: 'Investigation', icon: Search, color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700', description: 'Root cause analysis using 5-Whys methodology.' },
  'Implementation': { label: 'Implementation', icon: Target, color: 'text-indigo-600', badge: 'bg-indigo-50 text-indigo-700', description: 'Long-term preventive action deployment.' },
  'Effectiveness Review': { label: 'Effectiveness Review', icon: CheckCircle, color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700', description: 'Validation that actions prevented recurrence.' },
  'Reference': { label: 'Reference', icon: FileSearch, color: 'text-slate-600', badge: 'bg-slate-50 text-slate-700', description: 'Technical archiving of documentation.' },
  'Closure': { label: 'Closure', icon: Lock, color: 'text-slate-900', badge: 'bg-slate-900 text-white', description: 'Final organizational sign-off and closure.' },
};

const observationSchema = z.object({
  projectId: z.string().min(1, 'Site is required'),
  location: z.string().min(1, 'Specific location is required'),
  category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  description: z.string().min(5, 'Detailed description is required'),
});

type ObservationFormValues = z.infer<typeof observationSchema>;

/* ------------------------------------------------------------------ */
/* MAIN PAGE */
/* ------------------------------------------------------------------ */

export default function EhsObservationsPage() {
  const { observations, addObservation, actionStage, reviewStage, assignStageOwner, deleteObservation } = useEhs();
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [viewingObservationId, setViewingObservationId] = useState<string | null>(null);
  const [activeViewStage, setActiveViewStage] = useState<CapaStage | null>(null);

  // Form states for stage actions
  const [actionData, setActionData] = useState<any>({});
  const [reviewComment, setReviewComment] = useState('');
  const [tempAttachmentUrl, setTempAttachmentUrl] = useState('');

  const viewingObservation = useMemo(() => 
    observations.find(o => o.id === viewingObservationId), 
  [observations, viewingObservationId]);

  useEffect(() => {
    if (viewingObservation) {
      setActiveViewStage(viewingObservation.currentStage);
      const currentStageData = viewingObservation.stages?.[viewingObservation.currentStage];
      setActionData(currentStageData?.data || {});
    }
  }, [viewingObservation]);

  const form = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: { category: 'Unsafe Act', severity: 'Medium', projectId: '', description: '' },
  });

  const filteredObservations = useMemo(() => {
    return observations.filter(o => {
      const projectName = projects.find(p => p.id === o.projectId)?.name || '';
      return (
        o.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [observations, searchTerm, projects]);

  const onReportSubmit = async (data: ObservationFormValues) => {
    addObservation({
        ...data,
        discoveryAttachmentUrl: null // Attachments are now embedded in HTML description
    });
    
    setIsReportDialogOpen(false);
    form.reset();
  };

  const handleActionSubmit = () => {
    if (!viewingObservationId || !activeViewStage) return;
    actionStage(viewingObservationId, activeViewStage, actionData, tempAttachmentUrl);
    setTempAttachmentUrl('');
  };

  const handleReview = (status: 'Completed' | 'Returned') => {
    if (!viewingObservationId || !activeViewStage) return;
    reviewStage(viewingObservationId, activeViewStage, status, reviewComment);
    setReviewComment('');
  };

  if (viewingObservation && activeViewStage) {
    const stageData = viewingObservation.stages?.[activeViewStage];
    const isCurrentStage = activeViewStage === viewingObservation.currentStage;
    const isActionPending = isCurrentStage && stageData?.status === 'Pending';
    const isReviewPending = isCurrentStage && stageData?.status === 'In Progress';
    
    const assignee = users.find(u => u.id === stageData?.assigneeId);
    const assignedBy = users.find(u => u.id === stageData?.assignedById);
    const actionedBy = users.find(u => u.id === stageData?.actionedById);
    const reviewedBy = users.find(u => u.id === stageData?.reviewedById);

    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';
    const isAssignee = user?.id === stageData?.assigneeId;

    const reporter = users.find(u => u.id === viewingObservation.reporterId);
    const site = projects.find(p => p.id === viewingObservation.projectId);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Nav Header */}
            <div className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-4 text-left">
                    <Button variant="ghost" size="icon" onClick={() => setViewingObservationId(null)}>
                        <ChevronLeft className="h-5 w-5 text-slate-900" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Case Dossier: {viewingObservation.id.slice(-6).toUpperCase()}</span>
                            <Badge variant="outline" className={cn("text-[9px] font-black h-4 px-2 uppercase border-2", severityConfig[viewingObservation.severity].border, severityConfig[viewingObservation.severity].text)}>
                                {viewingObservation.severity}
                            </Badge>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase mt-0.5">Observation Lifecycle Cockpit</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="font-bold text-xs"><Download className="mr-2 h-4 w-4" /> PDF Report</Button>
                    <Badge className={cn("h-8 px-4 font-black uppercase text-[10px] tracking-widest", stageConfig[viewingObservation.currentStage].badge)}>
                        {viewingObservation.currentStage}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6 items-start">
                {/* Side Dossier */}
                <div className="space-y-4">
                    <Card className="rounded-lg shadow-sm overflow-hidden border-slate-200">
                        <CardHeader className="bg-slate-900 text-white p-4">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Case Discovery Narrative
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-6 text-left">
                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Site Location</span>
                                    <span className="text-xs font-black text-slate-900">{site?.name || 'N/A'} &middot; {viewingObservation.location}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Reporter</span>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 border"><AvatarImage src={reporter?.avatar}/><AvatarFallback>{reporter?.name?.[0]}</AvatarFallback></Avatar>
                                        <span className="text-xs font-black text-slate-900">{reporter?.name}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Logged On</span>
                                    <span className="text-xs font-black text-slate-900">{format(parseISO(viewingObservation.createdAt), 'dd MMM yyyy, p')}</span>
                                </div>
                            </div>
                            
                            <Separator />

                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Original Narrative Findings</Label>
                                <ScrollArea className="max-h-[300px]">
                                   <div 
                                     className="text-sm font-bold text-slate-900 leading-relaxed rich-text-content" 
                                     dangerouslySetInnerHTML={{ __html: viewingObservation.description }} 
                                   />
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-lg shadow-sm border-slate-200 text-left">
                        <CardHeader className="p-4 border-b bg-slate-50">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">CAPA Process Pipeline</CardTitle>
                        </CardHeader>
                        <div className="p-2 space-y-1">
                            {Object.entries(stageConfig).map(([key, config], idx) => {
                                const s = viewingObservation.stages?.[key as CapaStage];
                                const isDone = s?.status === 'Completed';
                                const isActive = key === viewingObservation.currentStage;
                                const isViewing = activeViewStage === key;

                                return (
                                    <button 
                                        key={key} 
                                        onClick={() => setActiveViewStage(key as CapaStage)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2.5 rounded-md transition-all group",
                                            isViewing ? "bg-slate-900 text-white shadow-md" : "hover:bg-slate-100"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded flex items-center justify-center border font-black text-[10px]",
                                            isDone ? <Check className="h-3 w-3" /> : idx + 1,
                                            isDone ? "bg-emerald-500 border-emerald-500 text-white" :
                                            isActive ? "border-blue-600 text-blue-600" : "border-slate-300 text-slate-400",
                                            isViewing && "bg-white text-slate-900"
                                        )}>
                                            {isDone ? <Check className="h-3 w-3" /> : idx + 1}
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className={cn(
                                                "text-[9px] font-black uppercase tracking-widest truncate",
                                                isViewing ? "text-white" : isDone ? "text-emerald-600" : isActive ? "text-blue-600" : "text-slate-500"
                                            )}>{config.label}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* Main Action Workspace */}
                <div className="space-y-6">
                    <Card className="rounded-lg border-slate-200 shadow-sm min-h-[600px] flex flex-col bg-white text-left">
                        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                                    {React.createElement(stageConfig[activeViewStage].icon, { className: "h-6 w-6 text-slate-900" })}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{activeViewStage}</h2>
                                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{stageConfig[activeViewStage].description}</p>
                                </div>
                            </div>
                            {!isCurrentStage && (
                                <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest px-4 h-7 border-2">ARCHIVE REVIEW</Badge>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-8">
                                {/* Stage Ownership Audit */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Assigned To</Label>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5"><AvatarImage src={assignee?.avatar}/></Avatar>
                                            <span className="text-xs font-black text-slate-900">{assignee?.name || 'Unassigned'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Assigned By</Label>
                                        <span className="block text-xs font-bold text-slate-700">{assignedBy?.name || 'N/A'}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Action By</Label>
                                        <span className="block text-xs font-bold text-slate-700">{actionedBy?.name || 'N/A'}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</Label>
                                        <Badge className="h-5 text-[9px] font-black uppercase" variant={stageData?.status === 'Completed' ? 'success' : 'secondary'}>
                                            {stageData?.status || 'Pending'}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Stage Content - Conditional by Stage Type */}
                                <div className="space-y-6">
                                    {activeViewStage === 'Initiation' && (
                                        <div className="space-y-4">
                                            <div className="p-6 border rounded-lg bg-slate-50/30">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 border-b pb-2">Discovery Report</h4>
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div>
                                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Risk Severity</Label>
                                                        <p className="font-black text-slate-900 mt-1">{viewingObservation.severity}</p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Category</Label>
                                                        <p className="font-black text-slate-900 mt-1">{viewingObservation.category}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Resolution' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Correction Documentation</Label>
                                                {isActionPending && isAssignee ? (
                                                    <Textarea 
                                                        className="min-h-[120px] rounded-lg p-4 font-bold border-2 focus-visible:ring-blue-100" 
                                                        placeholder="Log the immediate actions taken to contain the hazard..."
                                                        value={actionData.notes || ''}
                                                        onChange={(e) => setActionData({ ...actionData, notes: e.target.value })}
                                                    />
                                                ) : (
                                                    <p className="p-4 border rounded-lg bg-slate-50 text-sm font-bold text-slate-700 leading-relaxed">
                                                        {stageData?.data?.notes || 'No correction notes logged.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeViewStage === 'Investigation' && (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">5-Whys Methodology Audit</Label>
                                                {[0, 1, 2, 3, 4].map(i => (
                                                    <div key={i} className="flex gap-4 items-center">
                                                        <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">W{i+1}</div>
                                                        {isActionPending && isAssignee ? (
                                                            <Input 
                                                                className="h-10 font-bold" 
                                                                placeholder="Ask why did the previous failure occur?" 
                                                                value={actionData[`why${i}`] || ''}
                                                                onChange={(e) => setActionData({ ...actionData, [`why${i}`]: e.target.value })}
                                                            />
                                                        ) : (
                                                            <p className="flex-1 p-2 border-b font-bold text-slate-900 text-sm">{stageData?.data?.[`why${i}`] || '...'}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attachment Section for the current stage */}
                                    {(isActionPending && isAssignee) && (
                                        <div className="pt-6 border-t border-dashed">
                                            <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest mb-2 block">Upload Evidence / Files</Label>
                                            <div className="flex items-center gap-4">
                                                <Button variant="outline" className="font-bold text-xs h-10 border-2">
                                                    <Upload className="mr-2 h-4 w-4" /> Add Attachment
                                                </Button>
                                                <Input 
                                                    placeholder="Or paste external link here..." 
                                                    className="h-10 text-xs font-bold"
                                                    value={tempAttachmentUrl}
                                                    onChange={(e) => setTempAttachmentUrl(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* REVIEWER WORKSPACE */}
                                    {isReviewPending && isSupervisor && (
                                        <div className="p-6 border-2 border-slate-900 rounded-lg bg-slate-50 space-y-4 animate-in zoom-in-95">
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck className="h-5 w-5 text-slate-900" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Verification Workspace</h4>
                                            </div>
                                            <Textarea 
                                                className="bg-white border-slate-200 p-4 font-bold text-sm" 
                                                placeholder="Provide technical feedback or instructions..."
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                            />
                                            <div className="flex gap-3">
                                                <Button variant="outline" className="flex-1 font-bold h-11 border-2" onClick={() => handleReview('Returned')}>
                                                    <Undo2 className="mr-2 h-4 w-4" /> Request Rework
                                                </Button>
                                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 uppercase tracking-wider" onClick={() => handleReview('Completed')}>
                                                    <CheckCircle className="mr-2 h-4 w-4" /> Verify & Progress
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ScrollArea>

                        <CardFooter className="p-6 border-t bg-slate-50/50 justify-between items-center">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {stageData?.status === 'Completed' && `Stage Verified By ${reviewedBy?.name || 'System'}`}
                            </div>
                            <div className="flex gap-2">
                                {isActionPending && isAssignee && (
                                    <Button className="bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] h-11 px-10 text-[10px]" onClick={handleActionSubmit}>
                                        Submit Stage Data
                                    </Button>
                                )}
                                <Button variant="outline" className="font-black uppercase tracking-[0.2em] h-11 px-8 text-[10px] border-2" onClick={() => setViewingObservationId(null)}>
                                    Exit Workspace
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8 flex flex-col h-full overflow-hidden text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 px-1">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">CAPA Master Tracker</h1>
          <p className="text-slate-500 text-sm font-bold mt-2 uppercase tracking-wide">Enterprise Registry for Safety Lifecycle Governance.</p>
        </div>
        
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-black text-white font-black h-11 px-8 rounded-md shadow-lg active:scale-95 transition-all text-xs tracking-widest">
              <Plus className="mr-2 h-4 w-4" /> INITIATE CASE
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[95vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-tight text-slate-900">Initiate Safety Case</DialogTitle>
              <DialogDescription className="font-medium text-slate-500">Log a professional observation report with rich narrative and evidence.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1">
            <form onSubmit={form.handleSubmit(onReportSubmit)} className="space-y-6 py-4 pr-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest ml-0.5">Finding Category</Label>
                    <Controller
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unsafe Act">Unsafe Act</SelectItem>
                            <SelectItem value="Unsafe Condition">Unsafe Condition</SelectItem>
                            <SelectItem value="Safe Act">Safe Act</SelectItem>
                            <SelectItem value="Near Miss">Near Miss</SelectItem>
                            <SelectItem value="Environmental">Environmental</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest ml-0.5">Severity</Label>
                    <Controller
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="font-bold border-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest ml-0.5">Site / Project</Label>
                    <Controller
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="font-bold border-2"><SelectValue placeholder="Select site..." /></SelectTrigger>
                          <SelectContent>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest ml-0.5">Specific Area</Label>
                    <Input {...form.register('location')} className="font-bold border-2" placeholder="e.g., Tank 101" />
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest ml-0.5">Finding Narrative & Visual Evidence</Label>
                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <RichNarrativeEditor 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Narate the observation here. You can paste screenshots directly into this box..." 
                      />
                    )}
                  />
                  {form.formState.errors.description && <p className="text-xs text-rose-600 font-bold">{form.formState.errors.description.message}</p>}
                </div>

                <DialogFooter className="pt-4 border-t">
                  <Button variant="outline" type="button" onClick={() => setIsReportDialogOpen(false)} className="h-11 px-8 font-bold border-2">CANCEL</Button>
                  <Button type="submit" className="bg-slate-900 hover:bg-black text-white h-11 px-10 font-black uppercase tracking-widest text-[10px]">OPEN CASE</Button>
                </DialogFooter>
            </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
            <div className="relative w-full max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search Master Registry by Case ID, Narrative or Site..." 
                    className="pl-9 h-10 border-slate-300 font-bold text-slate-900 text-xs uppercase tracking-tight"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9 px-4 font-black uppercase tracking-widest text-[9px] border-2">
                    <History className="mr-2 h-3.5 w-3.5" /> AUDIT TRAIL
                </Button>
                <Button variant="outline" size="sm" className="h-9 px-4 font-black uppercase tracking-widest text-[9px] border-2">
                    <Download className="mr-2 h-3.5 w-3.5" /> EXPORT EXCEL
                </Button>
            </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <Table className="border-collapse border-slate-300">
                <TableHeader className="bg-slate-100 sticky top-0 z-40">
                    <TableRow className="border-b-2 border-slate-300">
                        <TableHead className="w-20 border-r border-slate-300 font-black uppercase text-[10px] text-slate-900 text-center sticky left-0 z-50 bg-slate-100">ID</TableHead>
                        <TableHead className="min-w-[300px] border-r border-slate-300 font-black uppercase text-[10px] text-slate-900 px-4 sticky left-20 z-50 bg-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Narrative Findings</TableHead>
                        <TableHead className="w-32 border-r border-slate-300 font-black uppercase text-[10px] text-slate-900 text-center">Category</TableHead>
                        <TableHead className="w-24 border-r-2 border-slate-400 font-black uppercase text-[10px] text-slate-900 text-center">Risk</TableHead>
                        
                        {Object.values(stageConfig).map(cfg => (
                           <TableHead key={cfg.label} className="w-32 border-r border-slate-200 font-black uppercase text-[9px] text-slate-600 text-center leading-tight bg-slate-50/50">
                              {cfg.label}
                           </TableHead>
                        ))}

                        <TableHead className="w-24 text-right font-black uppercase text-[10px] text-slate-900 px-4 sticky right-0 z-50 bg-slate-100 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l border-slate-300">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredObservations.map((obs) => {
                        const site = projects.find(p => p.id === obs.projectId);
                        const stages = Object.keys(stageConfig) as CapaStage[];

                        return (
                            <TableRow key={obs.id} className="group hover:bg-blue-50/20 border-b border-slate-200 h-14">
                                <TableCell className="text-center font-mono text-[10px] font-black text-slate-500 border-r border-slate-200 sticky left-0 z-20 bg-white">
                                  {obs.id.slice(-6).toUpperCase()}
                                </TableCell>
                                <TableCell className="border-r border-slate-200 px-4 py-2 sticky left-20 z-20 bg-white group-hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col gap-0.5">
                                        <p className="font-black text-xs uppercase tracking-tight text-slate-800 leading-tight line-clamp-1" dangerouslySetInnerHTML={{ __html: obs.description }} />
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                            <MapPin className="h-2.5 w-2.5" /> {site?.name} &middot; {obs.location}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center border-r border-slate-200 font-bold uppercase text-[10px] text-slate-700">
                                    {obs.category}
                                </TableCell>
                                <TableCell className="text-center border-r-2 border-slate-300">
                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase h-5 px-2 border-2", severityConfig[obs.severity].border, severityConfig[obs.severity].text)}>
                                        {obs.severity}
                                    </Badge>
                                </TableCell>

                                {stages.map((stage) => {
                                  const sData = obs.stages?.[stage];
                                  const isDone = sData?.status === 'Completed';
                                  const isActive = stage === obs.currentStage && obs.status !== 'Closed';
                                  const isReturned = sData?.status === 'Returned';
                                  
                                  return (
                                    <TableCell key={stage} className={cn(
                                      "border-r border-slate-200 text-center p-0",
                                      isActive && "bg-blue-50/10",
                                      isDone && "bg-emerald-50/10",
                                      isReturned && "bg-rose-50/10"
                                    )}>
                                       <div className="flex flex-col items-center justify-center h-full">
                                          {isDone ? (
                                            <div className="flex flex-col items-center">
                                                <Check className="h-3 w-3 text-emerald-600" />
                                                {sData?.actionedAt && <span className="text-[8px] font-black text-emerald-700 mt-0.5">{format(parseISO(sData.actionedAt), 'dd/MM')}</span>}
                                            </div>
                                          ) : isReturned ? (
                                            <div className="flex flex-col items-center animate-pulse">
                                                <XCircle className="h-3 w-3 text-rose-600" />
                                                <span className="text-[8px] font-black text-rose-700 uppercase">Return</span>
                                            </div>
                                          ) : isActive ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse mb-1" />
                                                <span className="text-[8px] font-black text-blue-700 uppercase">Active</span>
                                            </div>
                                          ) : (
                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                          )}
                                       </div>
                                    </TableCell>
                                  )
                                })}

                                <TableCell className="text-right px-4 sticky right-0 z-20 bg-white group-hover:bg-slate-50 border-l border-slate-300 transition-colors">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 px-3 font-black text-[9px] uppercase tracking-widest border-2 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                        onClick={() => setViewingObservationId(obs.id)}
                                    >
                                        COCKPIT
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </Card>

      {filteredObservations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem]">
          <div className="p-8 bg-slate-50 rounded-full mb-6 shadow-inner border border-slate-100">
            <FileWarning className="h-14 w-14 opacity-40 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight uppercase">No records found</p>
          <p className="text-slate-400 font-bold mt-2 uppercase text-sm">Waiting for first site observation report...</p>
        </div>
      )}
    </div>
  );
}
