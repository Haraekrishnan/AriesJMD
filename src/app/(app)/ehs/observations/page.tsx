'use client';

import React, { useState, useMemo, useEffect, useRef, MouseEvent } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, Search, MapPin, Calendar, Eye, 
  AlertCircle, CheckCircle, ShieldCheck, 
  Clock, MessageSquare, Target, 
  FileCheck, FileSearch, 
  ChevronLeft, FileText, Download, 
  Check, XCircle, Trash2, History, Upload, Paperclip, Undo2, Image as ImageIcon, X,
  Bold, Italic, Underline, List, ListOrdered, Heading1, AlignLeft, UserPlus, ArrowRightLeft,
  ZoomIn, ZoomOut, Lock, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Split,
  ChevronUp, Info, AlertTriangle, ArrowUpRight, Send, FilterX, FileSpreadsheet, MoreVertical,
  ChevronLast, ChevronFirst
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
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
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { CapaStage, EhsObservation } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ------------------------------------------------------------------ */
/* UTILITIES */
/* ------------------------------------------------------------------ */

const Loader2 = ({ className }: { className?: string }) => (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373(0, 0, 5.373, 0, 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
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
        const imgHtml = `<img src="${data.downloadLink}" alt="Pasted Evidence" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 2px solid #e2e8f0; cursor: pointer;" />`;
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
    <div className={cn("border-2 rounded-xl overflow-hidden bg-white shadow-inner", disabled && "opacity-50 pointer-events-none")}>
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
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        className="min-h-[200px] p-4 focus:outline-none font-bold text-slate-900 text-sm leading-relaxed"
        data-placeholder={placeholder}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* CONFIGS */
/* ------------------------------------------------------------------ */

const severityConfig: Record<string, { bg: string, text: string, border: string }> = {
  'Low': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Medium': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'High': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Critical': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const stageConfig: Record<CapaStage, { label: string, icon: any, color: string, badge: string, description: string }> = {
  'Initiation': { label: 'Initiation', icon: Plus, color: 'text-slate-600', badge: 'bg-slate-100 text-slate-700', description: 'Initial recording of the site observation.' },
  'Investigation': { label: 'Investigation', icon: Search, color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700', description: 'Root cause analysis using Who, When, Where, How.' },
  'Resolution': { label: 'Resolution', icon: FileCheck, color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700', description: 'Immediate correction and containment actions.' },
  'Implementation': { label: 'Implementation', icon: Target, color: 'text-indigo-600', badge: 'bg-indigo-50 text-indigo-700', description: 'Long-term preventive action deployment.' },
  'Effectiveness Review': { label: 'Effectiveness Review', icon: CheckCircle, color: 'text-amber-600', badge: 'bg-emerald-50 text-amber-700', description: 'Validation that actions prevented recurrence.' },
  'Reference': { label: 'Reference', icon: FileSearch, color: 'text-slate-600', badge: 'bg-slate-50 text-slate-700', description: 'Technical archiving of documentation.' },
  'Closure': { label: 'Closure', icon: Lock, color: 'text-slate-900', badge: 'bg-slate-900 text-white', description: 'Final organizational sign-off and closure.' },
};

const observationSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  location: z.string().min(1, 'Specific location is required'),
  category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  description: z.string().min(5, 'Detailed description is required'),
});

const splitSchema = z.object({
    subObservations: z.array(z.object({
        category: z.enum(['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']),
        severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
        description: z.string().min(5, 'Description is required (Min 5 chars)'),
        assigneeId: z.string().min(1, 'Assignee is required'),
    })).min(2, 'At least 2 sub-cases are required for a split.'),
});

type ObservationFormValues = z.infer<typeof observationSchema>;
type SplitFormValues = z.infer<typeof splitSchema>;

/* ------------------------------------------------------------------ */
/* STAT CARD COMPONENT */
/* ------------------------------------------------------------------ */

const CapaStatCard = ({ title, value, icon: Icon, trend, trendColor }: { title: string, value: string | number, icon: any, trend?: string, trendColor?: string }) => (
    <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex items-center gap-5 hover:shadow-md transition-shadow">
        <div className="bg-slate-50 p-4 rounded-xl">
            <Icon className="h-6 w-6 text-slate-500" />
        </div>
        <div className="flex-1">
            <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
            {trend && (
                <div className={cn("text-[9px] font-bold uppercase flex items-center gap-1 mt-1", trendColor)}>
                   {trend}
                </div>
            )}
        </div>
    </Card>
);

/* ------------------------------------------------------------------ */
/* MAIN PAGE */
/* ------------------------------------------------------------------ */

export default function EhsObservationsPage() {
  const { audits, incidents, trainings, observations, addObservation, splitObservation, actionStage, reviewStage, assignStageOwner, addStageComment, addCcToObservation, deleteObservation } = useEhs();
  const { user, users, getAssignableUsers } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSite, setFilterSite] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState(false);
  const [viewingObservationId, setViewingObservationId] = useState<string | null>(null);
  const [activeViewStage, setActiveViewStage] = useState<CapaStage | null>(null);
  const [expandedMasterId, setExpandedMasterId] = useState<string | null>(null);

  // Lightbox State
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Management Action States
  const [isReassignPopoverOpen, setIsReassignPopoverOpen] = useState(false);
  const [isCcPopoverOpen, setIsCcPopoverOpen] = useState(false);

  // Form states for stage actions
  const [actionData, setActionData] = useState<any>({});
  const [reviewComment, setReviewComment] = useState('');
  const [newDiscussionComment, setNewDiscussionComment] = useState('');
  const [tempAttachmentUrl, setTempAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const viewingObservation = useMemo(() => 
    observations.find(o => o.id === viewingObservationId), 
  [observations, viewingObservationId]);

  const childObservationsForViewing = useMemo(() => {
    if (!viewingObservationId) return [];
    return observations.filter(o => o.parentId === viewingObservationId);
  }, [observations, viewingObservationId]);

  const form = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: { category: 'Unsafe Act', severity: 'Medium', projectId: '', description: '' },
  });

  const splitForm = useForm<SplitFormValues>({
      resolver: zodResolver(splitSchema),
      defaultValues: {
          subObservations: [
              { category: 'Unsafe Act', severity: 'Medium', description: '', assigneeId: 'unassigned' },
              { category: 'Unsafe Act', severity: 'Medium', description: '', assigneeId: 'unassigned' }
          ]
      }
  });

  const { fields: splitFields, append: appendSplit, remove: removeSplit } = useFieldArray({
      control: splitForm.control,
      name: "subObservations"
  });

  // NAVIGATION SYNC FOR LIGHTBOX
  useEffect(() => {
    const handlePopState = (e: PopstateEvent) => {
        if (viewingImage) {
            e.preventDefault();
            setViewingImage(null);
        }
    };

    if (viewingImage) {
        window.history.pushState({ lightbox: true }, '');
        window.addEventListener('popstate', handlePopState);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewingImage]);

  useEffect(() => {
    if (viewingObservation) {
      setActiveViewStage(viewingObservation.currentStage);
      const currentStageData = viewingObservation.stages?.[viewingObservation.currentStage];
      setActionData(currentStageData?.data || {});
    }
  }, [viewingObservation]);

  // Ensure split form is initialized with at least 2 items when dialog is opened
  useEffect(() => {
    if (isSplitDialogOpen) {
      splitForm.reset({
        subObservations: [
            { category: 'Unsafe Act', severity: 'Medium', description: '', assigneeId: 'unassigned' },
            { category: 'Unsafe Act', severity: 'Medium', description: '', assigneeId: 'unassigned' }
        ]
      });
    }
  }, [isSplitDialogOpen, splitForm]);

  const filteredObservations = useMemo(() => {
    return observations.filter(o => {
      // Only show master observations (no parent) in the main list
      if (o.parentId) return false;

      const projectName = projects.find(p => p.id === o.projectId)?.name || '';
      
      const matchSearch = 
        o.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = filterCategory === 'all' || o.category === filterCategory;
      const matchRisk = filterRisk === 'all' || o.severity === filterRisk;
      const matchStatus = filterStatus === 'all' || o.status === filterStatus;
      const matchSite = filterSite === 'all' || o.projectId === filterSite;

      return matchSearch && matchCategory && matchRisk && matchStatus && matchSite;
    }).sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [observations, searchTerm, projects, filterCategory, filterRisk, filterStatus, filterSite]);

  const onReportSubmit = async (data: ObservationFormValues) => {
    addObservation({
        ...data,
        discoveryAttachmentUrl: null 
    });
    setIsReportDialogOpen(false);
    form.reset();
  };

  const onSplitSubmit = (data: SplitFormValues) => {
      if (!viewingObservationId) return;
      splitObservation(viewingObservationId, data.subObservations);
      setIsSplitDialogOpen(false);
      splitForm.reset();
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

  const handleAddDiscussionComment = () => {
    if (!newDiscussionComment.trim() || !viewingObservationId || !activeViewStage) return;
    addStageComment(viewingObservationId, activeViewStage, newDiscussionComment);
    setNewDiscussionComment('');
  };

  const handleCcSelectedUsers = (userIds: string[]) => {
    if (!viewingObservationId) return;
    addCcToObservation(viewingObservationId, userIds);
    setIsCcPopoverOpen(false);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
        setViewingImage((target as HTMLImageElement).src);
        e.stopPropagation();
    }
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
      if (!isPanning) return;
      e.preventDefault();
      const x = e.clientX - startPosition.x;
      const y = e.clientY - startPosition.y;
      setTranslate({ x, y });
  };
  
  const handleMouseUpOrLeave = () => {
      setIsPanning(false);
  };

  const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';
  const assignableUsers = useMemo(() => {
      return getAssignableUsers();
  }, [getAssignableUsers]);

  const openSplitDialog = () => {
      splitForm.reset({
          subObservations: [
              { category: 'Unsafe Act', severity: 'Medium', description: '', assigneeId: 'unassigned' },
              { category: 'Unsafe Act', severity: 'Medium', description: '', assigneeId: 'unassigned' }
          ]
      });
      setIsSplitDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    toast({ title: 'Uploading Evidence...', description: 'Transmitting to Dropbox repository.' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/dropbox', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setTempAttachmentUrl(data.downloadLink);
        toast({ title: 'Document Prepared', description: 'Attachment linked to submission.' });
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetFilters = () => {
      setSearchTerm('');
      setFilterCategory('all');
      setFilterRisk('all');
      setFilterStatus('all');
      setFilterSite('all');
      setFilterDateRange(undefined);
  };

  const highRiskCount = useMemo(() => observations.filter(o => !o.parentId && (o.severity === 'High' || o.severity === 'Critical')).length, [observations]);
  const overdueCount = useMemo(() => observations.filter(o => !o.parentId && o.status !== 'Closed' && differenceInDays(new Date(), parseISO(o.createdAt)) > 14).length, [observations]);

  return (
    <div className="h-full flex flex-col overflow-hidden text-left bg-[#f8fafc]">
      {viewingObservation && activeViewStage ? (
        /* COCKPIT VIEW */
        <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between bg-white p-4 border border-slate-200 rounded-lg shadow-sm shrink-0">
                <div className="flex items-center gap-4 text-left">
                    <Button variant="ghost" size="icon" onClick={() => setViewingObservationId(null)}>
                        <ChevronLeft className="h-5 w-5 text-slate-900" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Case Dossier: {viewingObservation.id.slice(-6).toUpperCase()}</span>
                            <Badge variant="outline" className={cn("text-[9px] font-black h-4 px-2 uppercase border-2", severityConfig[viewingObservation.severity]?.border, severityConfig[viewingObservation.severity]?.text)}>
                                {viewingObservation.severity}
                            </Badge>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase mt-0.5">Observation Lifecycle Cockpit</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isSupervisor && (
                        <>
                             <Button variant="outline" size="sm" className="font-black uppercase text-[10px] tracking-widest border-2 h-9 px-4" onClick={openSplitDialog}>
                                <Split className="mr-2 h-3.5 w-3.5" /> Split Case
                            </Button>

                            <Popover open={isCcPopoverOpen} onOpenChange={setIsCcPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="font-black uppercase text-[10px] tracking-widest border-2 h-9 px-4">
                                        <UserPlus className="mr-2 h-3.5 w-3.5" /> Inform Personnel
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="Search people..." />
                                        <CommandList>
                                            <CommandEmpty>No personnel found.</CommandEmpty>
                                            <CommandGroup>
                                                {users.filter(u => u.role !== 'Manager').map(u => (
                                                    <CommandItem 
                                                        key={u.id} 
                                                        onSelect={() => handleCcSelectedUsers([u.id])}
                                                        className="cursor-pointer font-bold text-xs"
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", viewingObservation.ccUserIds?.includes(u.id) ? "opacity-100" : "opacity-0")} />
                                                        {u.name} <span className="ml-1 text-[9px] text-slate-400">({u.role})</span>
                                                        {u.status === 'locked' && <Badge variant="destructive" className="ml-auto text-[8px] h-4">LOCKED</Badge>}
                                                        {u.status === 'deactivated' && <Badge variant="secondary" className="ml-auto text-[8px] h-4">REMOVED</Badge>}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            <Popover open={isReassignPopoverOpen} onOpenChange={setIsReassignPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="font-black uppercase text-[10px] tracking-widest border-2 h-9 px-4" disabled={viewingObservation.status === 'Closed' || childObservationsForViewing.length > 0}>
                                        <ArrowRightLeft className="mr-2 h-3.5 w-3.5" /> Redirect Step
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="end">
                                    <Command>
                                        <CommandInput placeholder="Search responsible user..." />
                                        <CommandList>
                                            <CommandEmpty>No personnel found.</CommandEmpty>
                                            <CommandGroup>
                                                {assignableUsers.map(u => (
                                                    <CommandItem 
                                                        key={u.id} 
                                                        onSelect={() => {
                                                            assignStageOwner(viewingObservation.id, viewingObservation.currentStage, u.id);
                                                            setIsReassignPopoverOpen(false);
                                                        }}
                                                        className="cursor-pointer font-bold text-xs"
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", viewingObservation.stages?.[viewingObservation.currentStage]?.assigneeId === u.id ? "opacity-100" : "opacity-0")} />
                                                        {u.name} <span className="ml-1 text-[9px] text-slate-400">({u.role})</span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </>
                    )}
                    <Button variant="outline" size="sm" className="font-black uppercase text-[10px] tracking-widest border-2 h-9 px-4"><Download className="mr-2 h-4 w-4" /> PDF Report</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6 items-start flex-1 overflow-hidden p-1">
                <div className="space-y-4 overflow-y-auto h-full pr-1 visible-scrollbar">
                    <Card className="rounded-lg shadow-sm overflow-hidden border-slate-200">
                        <CardHeader className="bg-slate-900 text-white p-4">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Case Discovery Narrative
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-6 text-left">
                            <div className="space-y-4 pt-2 text-slate-900">
                                <div className="flex justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Site Location</span>
                                    <span className="text-xs font-black">{projects.find(p => p.id === viewingObservation.projectId)?.name || 'N/A'} &middot; {viewingObservation.location}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Reporter</span>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5 border"><AvatarImage src={users.find(u => u.id === viewingObservation.reporterId)?.avatar}/><AvatarFallback>{users.find(u => u.id === viewingObservation.reporterId)?.name?.[0]}</AvatarFallback></Avatar>
                                        <span className="text-xs font-black">{users.find(u => u.id === viewingObservation.reporterId)?.name}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Logged On</span>
                                    <span className="text-xs font-black">{format(parseISO(viewingObservation.createdAt), 'dd MMM yyyy, p')}</span>
                                </div>
                                {viewingObservation.parentId && (
                                    <div className="pt-2 border-t mt-2">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700">SUB-CASE OF {viewingObservation.parentId.slice(-6).toUpperCase()}</Badge>
                                    </div>
                                )}
                            </div>
                            
                            {viewingObservation.ccUserIds && viewingObservation.ccUserIds.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Informed Stakeholders</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {viewingObservation.ccUserIds.map(ccId => {
                                            const ccUser = users.find(u => u.id === ccId);
                                            return (
                                                <Badge key={ccId} variant="secondary" className="text-[9px] font-black h-5 px-1.5 bg-slate-100 text-slate-600 border-none">
                                                    {ccUser?.name || 'User'}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Original Narrative Findings</Label>
                                <ScrollArea className="max-h-[400px]">
                                   <div 
                                     className="text-sm font-bold text-slate-900 leading-relaxed rich-text-content cursor-pointer" 
                                     onClick={handleImageClick}
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
                                
                                // Hierarchical Progress Logic
                                const isDone = childObservationsForViewing.length > 0
                                  ? childObservationsForViewing.every(child => child.stages?.[key as CapaStage]?.status === 'Completed')
                                  : s?.status === 'Completed';

                                const isActive = childObservationsForViewing.length > 0
                                  ? (!isDone && childObservationsForViewing.some(child => key === child.currentStage))
                                  : (key === viewingObservation.currentStage && viewingObservation.status !== 'Closed');

                                const isReturned = childObservationsForViewing.length > 0
                                  ? childObservationsForViewing.some(child => child.stages?.[key as CapaStage]?.status === 'Returned')
                                  : s?.status === 'Returned';

                                const isViewing = activeViewStage === key;

                                return (
                                    <button 
                                        key={key} 
                                        onClick={() => setActiveViewStage(key as CapaStage)}
                                        className={cn(
                                            "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group relative",
                                            isViewing 
                                              ? "bg-white text-slate-900 border border-slate-200 shadow-sm" 
                                              : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                                        )}
                                    >
                                        {isViewing && (
                                          <div className="absolute left-0 w-1.5 h-6 bg-slate-900 rounded-r-full" />
                                        )}
                                        <div className={cn(
                                            "w-6 h-6 rounded flex items-center justify-center border font-black text-[10px]",
                                            isDone ? "border-emerald-600 text-emerald-600 bg-emerald-50" : (isReturned ? "border-rose-600 text-rose-600 bg-rose-50" : "border-slate-200 text-slate-400")
                                        )}>
                                            {isDone ? <Check className="h-3 w-3" /> : (isReturned ? <Undo2 className="h-3 w-3" /> : idx + 1)}
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className={cn(
                                                "text-[9px] font-black uppercase tracking-widest truncate",
                                                isViewing ? "text-slate-900" : isDone ? "text-emerald-600" : isReturned ? "text-rose-600" : isActive ? "text-blue-600" : "text-slate-500"
                                            )}>{config.label}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col h-full overflow-hidden">
                    <Card className="rounded-lg border-slate-200 shadow-sm flex flex-col bg-white text-left h-full overflow-hidden">
                        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-200">
                                    {activeViewStage && React.createElement(stageConfig[activeViewStage].icon, { className: "h-6 w-6 text-slate-900" })}
                                </div>
                                {activeViewStage && (
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">{activeViewStage}</h2>
                                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{stageConfig[activeViewStage].description}</p>
                                    </div>
                                )}
                            </div>
                            {activeViewStage !== viewingObservation.currentStage && (
                                <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest px-4 h-7 border-2">ARCHIVE REVIEW</Badge>
                            )}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-8">
                                {childObservationsForViewing.length > 0 ? (
                                    /* MASTER VIEW - SHOW SUB-CASE REGISTRY */
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <Split className="h-5 w-5 text-blue-600" />
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Sub-Case Remediation Registry</h3>
                                        </div>
                                        
                                        <div className="border rounded-xl overflow-hidden shadow-sm">
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow>
                                                        <TableHead className="font-black uppercase text-[9px] tracking-widest">Case ID</TableHead>
                                                        <TableHead className="min-w-[300px] font-black uppercase text-[9px] tracking-widest">Finding Summary</TableHead>
                                                        <TableHead className="font-black uppercase text-[9px] tracking-widest">Current Phase</TableHead>
                                                        <TableHead className="font-black uppercase text-[9px] tracking-widest">Responsibility</TableHead>
                                                        <TableHead className="text-right font-black uppercase text-[9px] tracking-widest">Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {childObservationsForViewing.map(child => {
                                                        const currentAssignee = users.find(u => u.id === child.stages[child.currentStage]?.assigneeId);
                                                        return (
                                                            <TableRow key={child.id} className="hover:bg-slate-50/50">
                                                                <TableCell className="font-mono font-black text-[10px] text-slate-500">
                                                                    {child.id.slice(-6).toUpperCase()}
                                                                </TableCell>
                                                                <TableCell className="max-w-[200px]">
                                                                    <div className="text-[11px] font-bold text-slate-800 line-clamp-1 rich-text-content" dangerouslySetInnerHTML={{ __html: child.description }} />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-blue-200 text-blue-700 bg-blue-50">
                                                                        {child.currentStage}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar className="h-5 w-5 border">
                                                                            <AvatarImage src={currentAssignee?.avatar} />
                                                                            <AvatarFallback className="text-[7px] font-black">{currentAssignee?.name?.[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <span className="text-[10px] font-black text-slate-700">{currentAssignee?.name || 'Unassigned'}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button 
                                                                      variant="ghost" 
                                                                      size="sm" 
                                                                      className="h-7 px-2 font-black text-[9px] uppercase tracking-widest text-blue-600 hover:text-blue-700"
                                                                      onClick={() => setViewingObservationId(child.id)}
                                                                    >
                                                                        Navigate <ArrowUpRight className="ml-1 h-3 w-3" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <Alert className="bg-blue-50 border-blue-100">
                                            <Info className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-xs font-bold text-blue-800">
                                                This is a master discovery case. Actions and documentation are managed within the individual sub-cases above.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                ) : (
                                    /* INDIVIDUAL CHILD/CASE VIEW - SHOW ACTION WORKSPACE */
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-lg bg-slate-50 border border-slate-100">
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Responsibility</Label>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5 border-slate-300">
                                                        <AvatarImage src={users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.assigneeId)?.avatar}/>
                                                        <AvatarFallback className="font-bold text-[8px]">{users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.assigneeId)?.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs font-black text-slate-900">{users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.assigneeId)?.name || 'Unassigned'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Delegated By</Label>
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                    <Avatar className="h-4 w-4 border-slate-200">
                                                        <AvatarImage src={users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.assignedById)?.avatar}/>
                                                        <AvatarFallback className="text-[7px]">{users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.assignedById)?.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    {users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.assignedById)?.name || 'System'}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Action By</Label>
                                                <span className="block text-xs font-bold text-slate-700">{users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.actionedById)?.name || 'Waiting...'}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Stage Status</Label>
                                                <Badge className="h-5 text-[9px] font-black uppercase tracking-wider" variant={viewingObservation.stages?.[activeViewStage!]?.status === 'Completed' ? 'success' : (viewingObservation.stages?.[activeViewStage!]?.status === 'Returned' ? 'destructive' : 'secondary')}>
                                                    {viewingObservation.stages?.[activeViewStage!]?.status === 'Returned' ? 'RETURNED FOR REWORK' : (viewingObservation.stages?.[activeViewStage!]?.status || 'Pending')}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Rework Alert Callout */}
                                            {viewingObservation.stages?.[activeViewStage!]?.status === 'Returned' && viewingObservation.stages?.[activeViewStage!]?.comments && (
                                                (() => {
                                                    const comments = Object.values(viewingObservation.stages[activeViewStage!].comments!);
                                                    const lastComment = comments.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
                                                    if (lastComment?.text.startsWith('[REWORK REQUIRED]')) {
                                                        return (
                                                            <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800">
                                                                <Undo2 className="h-4 w-4 text-rose-600" />
                                                                <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Rework Recommended</AlertTitle>
                                                                <AlertDescription className="text-sm font-bold">
                                                                    {lastComment.text.replace('[REWORK REQUIRED] ', '')}
                                                                </AlertDescription>
                                                            </Alert>
                                                        );
                                                    }
                                                    return null;
                                                })()
                                            )}

                                            {/* Discussion & Comment History */}
                                            {activeViewStage && viewingObservation.stages?.[activeViewStage]?.comments && (
                                                <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                                                    <Label className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2",
                                                        viewingObservation.stages?.[activeViewStage].status === 'Returned' ? "text-rose-600" : "text-emerald-600"
                                                    )}>
                                                        <MessageSquare className="h-3.5 w-3.5" /> 
                                                        {viewingObservation.stages?.[activeViewStage].status === 'Completed' ? 'VERIFIED WITH COMMENTS' : (viewingObservation.stages?.[activeViewStage].status === 'Returned' ? 'REWORK SUGGESTED WITH COMMENTS' : 'Discussion & Feedback')}
                                                    </Label>
                                                    <div className="space-y-4 mb-4">
                                                        {Object.values(viewingObservation.stages[activeViewStage].comments!)
                                                            .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                                                            .map((c) => {
                                                                const author = users.find((u) => u.id === c.userId);
                                                                return (
                                                                    <div key={c.id} className="flex gap-3">
                                                                        <Avatar className="h-7 w-7 border shrink-0">
                                                                            <AvatarImage src={author?.avatar} />
                                                                            <AvatarFallback className="text-[9px] font-black">{author?.name?.[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex-1 space-y-1">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-[10px] font-black text-slate-500 uppercase">{author?.name}</span>
                                                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                                    {c.date && isValid(parseISO(c.date)) ? formatDistanceToNow(parseISO(c.date), { addSuffix: true }) : ''}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs font-bold text-black dark:text-white leading-tight whitespace-pre-wrap">{c.text}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>

                                                    <div className="relative pt-2">
                                                        <Textarea 
                                                            placeholder="Add a quick reply or feedback..." 
                                                            className="min-h-[40px] pr-10 text-xs font-bold bg-white"
                                                            value={newDiscussionComment}
                                                            onChange={(e) => setNewDiscussionComment(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleAddDiscussionComment();
                                                                }
                                                            }}
                                                        />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="absolute right-1 top-1/2 -translate-y-[-50%] h-8 w-8 text-emerald-600"
                                                            disabled={!newDiscussionComment.trim()}
                                                            onClick={handleAddDiscussionComment}
                                                        >
                                                            <Send className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {activeViewStage === 'Initiation' && (
                                                <div className="space-y-4">
                                                    <div className="p-6 border rounded-lg bg-slate-50/30">
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 border-b pb-2">Discovery Report Overview</h4>
                                                        <div className="grid grid-cols-2 gap-8">
                                                            <div>
                                                                <Label className="text-[10px] font-bold uppercase text-slate-500">Risk Severity</Label>
                                                                <p className="font-black text-slate-900 mt-1 uppercase">{viewingObservation.severity}</p>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] font-bold uppercase text-slate-500">Category</Label>
                                                                <p className="font-black text-slate-900 mt-1 uppercase">{viewingObservation.category}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeViewStage === 'Investigation' && (
                                                <div className="space-y-6">
                                                    <div className="space-y-4">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Investigation Specifics</Label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            <div className="space-y-2">
                                                                <Label className="text-[9px] font-bold uppercase text-slate-400">Who (Personnel involved)</Label>
                                                                {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage]?.assigneeId ? (
                                                                    <Input 
                                                                        className="h-10 font-bold" 
                                                                        placeholder="Name of personnel involved" 
                                                                        value={actionData.who || ''}
                                                                        onChange={(e) => setActionData({ ...actionData, who: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <p className="p-2 border rounded-md font-bold text-slate-900 text-sm bg-slate-50/50">{viewingObservation.stages?.[activeViewStage!]?.data?.who || 'N/A'}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[9px] font-bold uppercase text-slate-400">When (Date/Time context)</Label>
                                                                {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage]?.assigneeId ? (
                                                                    <Input 
                                                                        className="h-10 font-bold" 
                                                                        placeholder="Date and time of discovery details" 
                                                                        value={actionData.when || ''}
                                                                        onChange={(e) => setActionData({ ...actionData, when: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <p className="p-2 border rounded-md font-bold text-slate-900 text-sm bg-slate-50/50">{viewingObservation.stages?.[activeViewStage!]?.data?.when || 'N/A'}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[9px] font-bold uppercase text-slate-400">Where (Specific area/location)</Label>
                                                                {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage]?.assigneeId ? (
                                                                    <Input 
                                                                        className="h-10 font-bold" 
                                                                        placeholder="Detailed location" 
                                                                        value={actionData.where || ''}
                                                                        onChange={(e) => setActionData({ ...actionData, where: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <p className="p-2 border rounded-md font-bold text-slate-900 text-sm bg-slate-50/50">{viewingObservation.stages?.[activeViewStage!]?.data?.where || 'N/A'}</p>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[9px] font-bold uppercase text-slate-400">How (Sequence of events/method)</Label>
                                                                {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage]?.assigneeId ? (
                                                                    <Input 
                                                                        className="h-10 font-bold" 
                                                                        placeholder="How did it occur?" 
                                                                        value={actionData.how || ''}
                                                                        onChange={(e) => setActionData({ ...actionData, how: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <p className="p-2 border rounded-md font-bold text-slate-900 text-sm bg-slate-50/50">{viewingObservation.stages?.[activeViewStage!]?.data?.how || 'N/A'}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 pt-2">
                                                            <Label className="text-[9px] font-bold uppercase text-slate-400">Additional Investigation Details</Label>
                                                            {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage]?.assigneeId ? (
                                                                <RichNarrativeEditor 
                                                                    value={actionData.notes || ''} 
                                                                    onChange={(html) => setActionData({ ...actionData, notes: html })}
                                                                    placeholder="Add further investigation findings, root causes, or context..."
                                                                />
                                                            ) : (
                                                                <div 
                                                                    className="p-4 border rounded-lg bg-slate-50 text-sm font-bold text-slate-700 leading-relaxed rich-text-content cursor-pointer"
                                                                    onClick={handleImageClick}
                                                                    dangerouslySetInnerHTML={{ __html: viewingObservation.stages?.[activeViewStage!]?.data?.notes || `No additional details logged.` }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeViewStage !== 'Initiation' && activeViewStage !== 'Investigation' && (
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                                                            {activeViewStage} Technical Narrative
                                                        </Label>
                                                        {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage!]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage!]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage!]?.assigneeId ? (
                                                            <div className="space-y-4">
                                                                <RichNarrativeEditor 
                                                                    value={actionData.notes || ''} 
                                                                    onChange={(html) => setActionData({ ...actionData, notes: html })}
                                                                    placeholder={`Log details for the ${activeViewStage} phase...`}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div 
                                                                className="p-4 border rounded-lg bg-slate-50 text-sm font-bold text-slate-700 leading-relaxed rich-text-content cursor-pointer"
                                                                onClick={handleImageClick}
                                                                dangerouslySetInnerHTML={{ __html: viewingObservation.stages?.[activeViewStage!]?.data?.notes || `No documentation logged for ${activeViewStage}.` }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Stage Attachments History */}
                                            {activeViewStage && viewingObservation.stages?.[activeViewStage]?.attachments && (
                                                <div className="space-y-2">
                                                    <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Stage Evidence</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {Object.values(viewingObservation.stages[activeViewStage].attachments!).map(file => (
                                                            <Button key={file.id} variant="outline" size="sm" asChild className="h-8 text-[10px] font-bold">
                                                                <a href={file.url} target="_blank" rel="noopener noreferrer">
                                                                    <Paperclip className="mr-1.5 h-3 w-3" /> {file.name}
                                                                </a>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage!]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage!]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage!]?.assigneeId && (
                                                <div className="pt-6 border-t border-dashed space-y-4">
                                                    <div>
                                                        <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest mb-2 block">Upload Evidence (Dropbox)</Label>
                                                        <div className="flex items-center gap-4">
                                                            <input 
                                                                type="file"
                                                                onChange={handleFileUpload}
                                                                disabled={isUploading}
                                                                className="h-10 text-xs font-bold cursor-pointer block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                            />
                                                            {isUploading && <Loader2 className="h-5 w-5 text-primary" />}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] font-black uppercase text-slate-900 tracking-widest mb-2 block">External Link</Label>
                                                        <Input 
                                                            placeholder="Paste technical attachment URL or reference link here..." 
                                                            className="h-10 text-xs font-bold"
                                                            value={tempAttachmentUrl}
                                                            onChange={(e) => setTempAttachmentUrl(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {activeViewStage === viewingObservation.currentStage && viewingObservation.stages?.[activeViewStage!]?.status === 'In Progress' && isSupervisor && (
                                                <div className="p-6 border-2 border-slate-900 rounded-lg bg-slate-50 space-y-4 animate-in zoom-in-95">
                                                    <div className="flex items-center gap-3">
                                                        <ShieldCheck className="h-5 w-5 text-slate-900" />
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Official Verification Workspace</h4>
                                                    </div>
                                                    <Textarea 
                                                        className="bg-white border-slate-200 p-4 font-bold text-sm" 
                                                        placeholder="Provide technical feedback or official instructions..."
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
                                    </>
                                )}
                            </div>
                        </ScrollArea>

                        <CardFooter className="p-6 border-t bg-slate-50/50 justify-between items-center shrink-0">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                {viewingObservation.stages?.[activeViewStage!]?.status === 'Completed' && `Phase verified by ${users.find(u => u.id === viewingObservation.stages?.[activeViewStage!]?.reviewedById)?.name || 'System'}`}
                            </div>
                            <div className="flex gap-2">
                                {user?.role === 'Admin' && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-black uppercase tracking-widest text-[10px] h-11 px-6 border-2 border-rose-100">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Forever
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Safety Case Permanently?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    You are about to delete Case Dossier: <strong>{viewingObservation.id.slice(-6).toUpperCase()}</strong>. This will wipe all comments, evidence, and technical logs. It cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => { deleteObservation(viewingObservation.id); setViewingObservationId(null); }} className="bg-rose-600 text-white font-black uppercase tracking-widest text-xs h-10 hover:bg-rose-700">
                                                    Yes, Delete Permanently
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                {activeViewStage === viewingObservation.currentStage && (viewingObservation.stages?.[activeViewStage!]?.status === 'Pending' || viewingObservation.stages?.[activeViewStage!]?.status === 'Returned') && user?.id === viewingObservation.stages?.[activeViewStage!]?.assigneeId && (
                                    <Button className="bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] h-11 px-10 text-[10px]" onClick={handleActionSubmit}>
                                        {activeViewStage === 'Closure' ? 'EXECUTE FINAL CLOSURE' : 'Submit Stage Data'}
                                    </Button>
                                )}
                                <Button variant="outline" className="font-black uppercase tracking-[0.2em] h-11 px-8 text-[10px] border-2" onClick={() => setViewingObservationId(null)}>
                                    Exit Cockpit
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
      ) : (
        /* REGISTRY DASHBOARD VIEW */
        <div className="space-y-6 flex flex-col flex-1 overflow-hidden p-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">CAPA Master Tracker</h1>
                  <p className="text-slate-500 text-sm font-bold mt-2 uppercase tracking-wide">Enterprise registry for safety lifecycle governance.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden lg:block text-right pr-4 border-r">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A Safer Workplace</p>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A Stronger Tomorrow</p>
                    </div>
                    <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-emerald-600/10 transition-all active:scale-95 text-xs tracking-widest">
                                <Plus className="mr-2 h-4 w-4" /> INITIATE CASE
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
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
                                                        <SelectTrigger className="h-12 rounded-xl font-bold">
                                                            <SelectValue placeholder="Select site..." />
                                                        </SelectTrigger>
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
                                                    placeholder="Narrate the observation here. You can paste screenshots directly into this box..." 
                                                />
                                            )}
                                        />
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
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <CapaStatCard title="Total Cases" value={observations.length} icon={FileText} trend="↑ 12% vs last month" trendColor="text-emerald-600" />
                <CapaStatCard title="High Risk" value={highRiskCount} icon={AlertCircle} trend="↑ 5 new" trendColor="text-rose-600" />
                <CapaStatCard title="In Progress" value={observations.filter(o => o.status !== 'Closed').length} icon={Clock} trend="● 50% of total" trendColor="text-blue-600" />
                <CapaStatCard title="Closed" value={observations.filter(o => o.status === 'Closed').length} icon={CheckCircle} trend="↑ 8 this month" trendColor="text-emerald-600" />
                <CapaStatCard title="Overdue" value={overdueCount} icon={AlertTriangle} trend="Needs attention" trendColor="text-rose-600" />
            </div>

            {/* Redesigned Filter Bar */}
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl p-4">
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search by Case ID, narrative, or site..." 
                            className="pl-9 h-11 border-slate-200 bg-slate-50/50 rounded-xl font-bold text-xs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="space-y-1.5 flex-1 min-w-[150px]">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Category</p>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="Unsafe Act">Unsafe Act</SelectItem>
                                    <SelectItem value="Unsafe Condition">Unsafe Condition</SelectItem>
                                    <SelectItem value="Safe Act">Safe Act</SelectItem>
                                    <SelectItem value="Near Miss">Near Miss</SelectItem>
                                    <SelectItem value="Environmental">Environmental</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[150px]">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Risk</p>
                            <Select value={filterRisk} onValueChange={setFilterRisk}>
                                <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Risk</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[150px]">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status</p>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="In Progress">In Progress</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[150px]">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Site</p>
                            <Select value={filterSite} onValueChange={setFilterSite}>
                                <SelectTrigger className="h-10 rounded-xl font-bold border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sites</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 min-w-[240px]">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date Range</p>
                            <DateRangePicker date={filterDateRange} onDateChange={setFilterDateRange} className="h-10 rounded-xl font-bold border-slate-200" />
                        </div>
                        <div className="flex gap-2 pt-5">
                            <Button variant="outline" className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={handleResetFilters}>
                                <Undo2 className="mr-2 h-3.5 w-3.5" /> Reset
                            </Button>
                            <Button variant="outline" className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                <History className="mr-2 h-3.5 w-3.5" /> Audit Trail
                            </Button>
                            <Button variant="outline" className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Export Excel
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* High Fidelity Table Section */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 rounded-[2.5rem]">
                <div className="flex-1 overflow-hidden relative">
                  <ScrollArea className="h-full w-full">
                    <Table className="border-separate border-spacing-0">
                        <TableHeader className="sticky top-0 z-30">
                            <TableRow>
                                <TableHead className="w-[140px] min-w-[140px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 px-6 sticky left-0 z-50 bg-slate-50/80">Case ID</TableHead>
                                <TableHead className="w-[350px] min-w-[350px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 px-6 sticky left-[140px] z-50 bg-slate-50/80 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Narrative Findings</TableHead>
                                <TableHead className="w-[130px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest">Category</TableHead>
                                <TableHead className="w-[100px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest">Risk</TableHead>
                                
                                <TableHead className="w-[110px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest">Initiation</TableHead>
                                <TableHead className="w-[110px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest">Investigation</TableHead>
                                <TableHead className="w-[110px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest">Resolution</TableHead>
                                <TableHead className="w-[110px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest">Implementation</TableHead>
                                <TableHead className="w-[140px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest leading-tight">Effectiveness Review</TableHead>
                                <TableHead className="w-[110px] border-r border-b border-slate-100 font-black uppercase text-[9px] text-slate-400 text-center tracking-widest">Reference</TableHead>

                                <TableHead className="w-[80px] text-right font-black uppercase text-[9px] text-slate-400 px-6 sticky right-0 z-50 bg-slate-50/80 shadow-[-2px_0_5px_rgba(0,0,0,0.02)] border-l border-b border-slate-100">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredObservations.map((obs) => {
                                const site = projects.find(p => p.id === obs.projectId);
                                const childObservations = observations.filter(child => child.parentId === obs.id);
                                const isExpanded = expandedMasterId === obs.id;
                                
                                const getStatusBadge = (stage: CapaStage) => {
                                    const sData = obs.stages?.[stage];
                                    const isDone = childObservations.length > 0 
                                        ? childObservations.every(child => child.stages?.[stage]?.status === 'Completed')
                                        : sData?.status === 'Completed';
                                    
                                    const isActive = childObservations.length > 0
                                        ? (!isDone && childObservations.some(child => stage === child.currentStage && child.status !== 'Closed'))
                                        : (stage === obs.currentStage && obs.status !== 'Closed');

                                    if (isDone) return <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-none font-bold text-[8px] h-5">Completed</Badge>;
                                    if (isActive) return <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-bold text-[8px] h-5">In Progress</Badge>;
                                    return <span className="text-slate-300">-</span>;
                                };

                                return (
                                    <React.Fragment key={obs.id}>
                                    <TableRow className={cn("group hover:bg-slate-50 border-b border-slate-50 transition-colors", isExpanded && "bg-slate-50/50")}>
                                        <TableCell className="border-r border-slate-100 p-6 sticky left-0 z-20 bg-white group-hover:bg-slate-50">
                                            <button 
                                                className="text-blue-600 font-bold text-[11px] underline hover:text-blue-800 transition-colors uppercase tracking-tight"
                                                onClick={() => setViewingObservationId(obs.id)}
                                            >
                                                CAPA-{format(parseISO(obs.createdAt), 'yyyy')}-{obs.id.slice(-3).toUpperCase()}
                                            </button>
                                        </TableCell>
                                        <TableCell className="border-r border-slate-100 p-6 sticky left-[140px] z-20 bg-white group-hover:bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                                            <div className="flex flex-col gap-1 max-w-[300px]">
                                                <p className="font-bold text-[11px] text-slate-700 leading-snug line-clamp-2 rich-text-content" dangerouslySetInnerHTML={{ __html: obs.description }} />
                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    <MapPin className="h-2.5 w-2.5" /> {site?.name}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center border-r border-slate-100 p-4">
                                            <Badge variant="outline" className={cn(
                                                "font-black text-[9px] uppercase tracking-widest border-none px-3 h-5",
                                                obs.category === 'Unsafe Act' ? 'bg-rose-50 text-rose-600' : 
                                                obs.category === 'Unsafe Condition' ? 'bg-orange-50 text-orange-600' :
                                                obs.category === 'Safe Act' ? 'bg-emerald-50 text-emerald-600' :
                                                obs.category === 'Near Miss' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                                            )}>
                                                {obs.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center border-r border-slate-100 p-4">
                                            <Badge variant="outline" className={cn(
                                                "font-black text-[9px] uppercase tracking-widest border-none px-3 h-5",
                                                obs.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                                                obs.severity === 'High' ? 'bg-rose-50 text-rose-600' :
                                                obs.severity === 'Medium' ? 'bg-orange-50 text-orange-600' :
                                                obs.severity === 'Low' ? 'bg-emerald-50 text-emerald-600' : ''
                                            )}>
                                                {obs.severity}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-center border-r border-slate-100 font-bold text-[10px] text-slate-500">
                                            {format(parseISO(obs.createdAt), 'dd MMM yyyy')}
                                        </TableCell>
                                        
                                        <TableCell className="text-center border-r border-slate-100">{getStatusBadge('Investigation')}</TableCell>
                                        <TableCell className="text-center border-r border-slate-100">{getStatusBadge('Resolution')}</TableCell>
                                        <TableCell className="text-center border-r border-slate-100">{getStatusBadge('Implementation')}</TableCell>
                                        <TableCell className="text-center border-r border-slate-100">{getStatusBadge('Effectiveness Review')}</TableCell>
                                        
                                        <TableCell className="text-center border-r border-slate-100">
                                            <span className="text-blue-600 font-bold text-[10px] underline cursor-pointer">OBS-{obs.id.slice(-3).toUpperCase()}</span>
                                        </TableCell>

                                        <TableCell className="text-right p-4 sticky right-0 z-20 bg-white group-hover:bg-slate-50 border-l border-slate-100">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewingObservationId(obs.id)}>View Details</DropdownMenuItem>
                                                    {user?.role === 'Admin' && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-rose-600" onSelect={(e) => e.preventDefault()}>Delete Case</DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Safety Case Permanently?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action cannot be undone. All technical sub-cases and evidence will be lost.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => deleteObservation(obs.id)} className="bg-rose-600 text-white">Delete Permanently</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                {/* Pagination Footer */}
                <div className="bg-slate-50/50 p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing 1 to {Math.min(10, filteredObservations.length)} of {filteredObservations.length} cases
                    </p>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200"><ChevronFirst className="h-3.5 w-3.5"/></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200"><ChevronLeft className="h-3.5 w-3.5"/></Button>
                        <div className="flex items-center gap-1 mx-2">
                            <Button size="sm" className="h-8 w-8 bg-emerald-600 text-white font-black text-[11px] rounded-lg">1</Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 font-black text-[11px] rounded-lg text-slate-400">2</Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 font-black text-[11px] rounded-lg text-slate-400">3</Button>
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200"><ChevronRight className="h-3.5 w-3.5"/></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200"><ChevronLast className="h-3.5 w-3.5"/></Button>
                    </div>
                </div>
            </Card>
        </div>
      )}

      {/* SPLIT DIALOG */}
      <Dialog open={isSplitDialogOpen} onOpenChange={(open) => { if (!open) splitForm.reset(); setIsSplitDialogOpen(open); }}>
        <DialogContent className="sm:max-w-4xl h-[95vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 shrink-0">
                <DialogTitle className="font-black uppercase tracking-tight text-slate-900">Split Observation Case</DialogTitle>
                <DialogDescription className="font-medium text-slate-500">If this discovery contains multiple distinct issues, split them into sub-cases.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 px-6"><ScrollArea className="h-full w-full pr-4"><form id="split-observation-form" onSubmit={splitForm.handleSubmit(onSplitSubmit)} className="space-y-6 py-4 text-left">
                {splitFields.map((field, index) => (
                    <div key={field.id} className="p-5 border-2 border-slate-200 rounded-xl bg-white space-y-4 shadow-sm">
                        <Label className="font-black uppercase text-[10px]">Sub-Observation #{index+1}</Label>
                        <Input {...splitForm.register(`subObservations.${index}.description`)} placeholder="Finding details..." />
                    </div>
                ))}
            </form></ScrollArea></div>
            <DialogFooter className="p-6 border-t"><Button onClick={() => setIsSplitDialogOpen(false)} variant="outline">Cancel</Button><Button type="submit" form="split-observation-form" className="bg-slate-900 text-white">Execute Split</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMAGE LIGHTBOX */}
      <Dialog open={!!viewingImage} onOpenChange={(v) => { if(!v) { setViewingImage(null); setZoom(1); setTranslate({x: 0, y: 0}); } }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col p-0 overflow-hidden border-none bg-transparent shadow-none">
            <DialogHeader className="sr-only"><DialogTitle>Evidence Image Viewer</DialogTitle></DialogHeader>
            <div className="absolute top-4 right-4 z-[60] flex gap-2">
                <Button variant="secondary" size="icon" className="bg-white/80 text-slate-900 rounded-full" onClick={() => setZoom(z => z + 0.2)}><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" className="bg-white/80 text-slate-900 rounded-full" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="destructive" size="icon" className="rounded-full shadow-lg" onClick={() => setViewingImage(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div ref={imageContainerRef} className="flex-1 flex items-center justify-center bg-black/90 backdrop-blur-xl" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}>
                {viewingImage && <img src={viewingImage} alt="Evidence" className={cn("transition-transform duration-200", isPanning ? 'cursor-grabbing' : 'cursor-grab')} style={{ transform: `scale(${zoom}) translate(${translate.x}px, ${translate.y}px)`, maxWidth: zoom > 1 ? 'none' : '90%', maxHeight: zoom > 1 ? 'none' : '90%', objectFit: 'contain' }} />}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
