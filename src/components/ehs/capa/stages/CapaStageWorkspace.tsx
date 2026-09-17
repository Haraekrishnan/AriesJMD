
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    Search
} from 'lucide-react';
import type { EhsObservation, CapaStage, User as UserType } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { cn } from '@/lib/utils';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Phase-Specific Components
import CapaInvestigation from './CapaInvestigation';
import CapaResolution from './CapaResolution';
import CapaImplementation from './CapaImplementation';
import CapaEffectivenessReview from './CapaEffectivenessReview';
import CapaReference from './CapaReference';
import CapaClosure from './CapaClosure';

interface CapaStageWorkspaceProps {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaStageWorkspace({ observation, stage }: CapaStageWorkspaceProps) {
    const { user } = useAuth();
    const { reviewStage } = useEhs();
    const sData = observation.stages[stage];
    
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isReturned = sData?.status === 'Returned';
    const isLocked = isCompleted || isSubmitted;

    const isSupervisor = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';

    const renderStageContent = () => {
        switch (stage) {
            case 'Initiation':
                return <CapaInitiation observation={observation} />;
            case 'Investigation':
                return <CapaInvestigation observation={observation} isLocked={isLocked} />;
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
                return null;
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* --- PHASE HEADER & ALERTS --- */}
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <span className="font-black text-xs">0{['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].indexOf(stage) + 1}</span>
                             </div>
                             <Badge className={cn(
                                "h-5 font-black uppercase text-[8px] tracking-[0.2em] border-none shadow-sm",
                                isCompleted ? "bg-emerald-500" : isReturned ? "bg-rose-500" : isSubmitted ? "bg-amber-500" : "bg-blue-600"
                             )}>
                                {isReturned ? 'REWORK REQUIRED' : isSubmitted ? 'AWAITING OFFICIAL REVIEW' : isCompleted ? 'VERIFIED MILESTONE' : 'TECHNICAL ACTION REQUIRED'}
                             </Badge>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">{stage}</h3>
                    </div>
                    {isLocked && stage !== 'Initiation' && (
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-full">
                            <Lock className="h-3 w-3" /> Locked For Audit Protection
                        </div>
                    )}
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
                            <div className="flex items-center gap-6 pt-2">
                                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                                    Returned By: <span className="text-rose-900">Safety HQ</span>
                                </div>
                                <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                                    Required Action: <span className="text-rose-900 underline underline-offset-4 decoration-2">Edit & Resubmit Phase</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- PHASE WORKSPACE --- */}
            <div className={cn("transition-all duration-700", (isLocked && stage !== 'Initiation') && "opacity-90 grayscale-[0.2]")}>
                {renderStageContent()}
            </div>

            {/* --- OFFICIAL REVIEW PANEL --- */}
            {isCurrentStage && isSubmitted && isSupervisor && stage !== 'Initiation' && (
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
                            Technical data and evidence have been uploaded by the assignee. Validate the findings to proceed to the next lifecycle stage or request immediate rework if the documentation is insufficient.
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
        </div>
    );
}

function CapaInitiation({ observation }: { observation: EhsObservation }) {
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
    
    const reporter = users.find(u => u.id === observation.reporterId);
    const project = projects.find(p => p.id === observation.projectId);

    const revisions = useMemo(() => {
        if (!observation.revisions) return [];
        return Object.values(observation.revisions).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [observation.revisions]);

    const handleSave = async () => {
        await updateInitiationDetails(observation.id, formData);
        setIsEditing(false);
    };

    return (
        <div className="space-y-10">
            <Card className="rounded-[2.5rem] border-none shadow-inner bg-slate-50 p-10 border-2 border-dashed border-slate-200">
                <CardContent className="p-0 space-y-12">
                    <div className="flex justify-between items-start">
                        <div className="space-y-4 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                <Info className="h-3 w-3" /> Reported Safety Finding Narrative
                            </p>
                            {isEditing ? (
                                <Textarea 
                                    className="min-h-[140px] rounded-[1.5rem] p-6 font-bold text-lg bg-white border-2 border-blue-100 shadow-xl focus-visible:ring-blue-200"
                                    value={formData.description}
                                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                />
                            ) : (
                                <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                                    <p className="text-xl font-black text-slate-800 leading-relaxed uppercase tracking-tight">
                                        {observation.description}
                                    </p>
                                </div>
                            )}
                        </div>

                        {isAuthorized && (
                            <div className="ml-8 pt-6">
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="rounded-xl font-bold h-10 px-4" onClick={() => setIsEditing(false)}>
                                            <X className="h-4 w-4 mr-2" /> Cancel
                                        </Button>
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-6 shadow-lg shadow-emerald-500/20" onClick={handleSave}>
                                            <Save className="h-4 w-4 mr-2" /> Save Revisions
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" size="sm" className="rounded-xl font-black uppercase tracking-widest text-[10px] h-10 px-6 border-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all" onClick={() => setIsEditing(true)}>
                                        <Edit3 className="h-4 w-4 mr-2" /> Overwrite Record
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-8 pt-8 border-t border-slate-200">
                        <EditableMeta 
                            label="Discovery Category" 
                            value={observation.category} 
                            isEditing={isEditing}
                            field="category"
                            type="select"
                            options={['Unsafe Act', 'Unsafe Condition', 'Safe Act', 'Near Miss', 'Environmental']}
                            onChange={(val) => setFormData(p => ({ ...p, category: val }))}
                        />
                        <EditableMeta 
                            label="Risk Severity" 
                            value={observation.severity} 
                            isEditing={isEditing}
                            field="severity"
                            type="select"
                            options={['Low', 'Medium', 'High', 'Critical']}
                            onChange={(val) => setFormData(p => ({ ...p, severity: val }))}
                        />
                        <EditableMeta 
                            label="Operational Site" 
                            value={project?.name || observation.projectId} 
                            isEditing={isEditing}
                            field="projectId"
                            type="select"
                            options={projects.map(p => ({ id: p.id, name: p.name }))}
                            onChange={(val) => setFormData(p => ({ ...p, projectId: val }))}
                        />
                        <EditableMeta 
                            label="Specific Location" 
                            value={observation.location} 
                            isEditing={isEditing}
                            field="location"
                            type="text"
                            onChange={(val) => setFormData(p => ({ ...p, location: val }))}
                        />
                    </div>

                    {/* Reporter Info */}
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                                <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logged by Official</p>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{reporter?.name || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Report Cycle Started</p>
                             <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{format(parseISO(observation.createdAt), 'dd MMM yyyy · HH:mm')}</p>
                        </div>
                    </div>

                    {/* Discovery Attachment Frame */}
                    {observation.discoveryAttachmentUrl && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                                <Search className="h-3.5 w-3.5" /> Site Discovery Evidence
                            </p>
                            <div className="relative group max-w-xl mx-auto">
                                <div className="rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl bg-slate-200 aspect-video">
                                    <img 
                                        src={observation.discoveryAttachmentUrl} 
                                        alt="Discovery" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                    />
                                </div>
                                <Button variant="secondary" className="absolute bottom-6 right-6 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                    Expand Evidence View
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- REVISION HISTORY LEDGER --- */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 ml-2">
                    <History className="h-4 w-4 text-slate-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Forensic Audit Ledger</h4>
                </div>
                
                {revisions.length > 0 ? (
                    <div className="border border-slate-200 rounded-[2rem] bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent border-b-2 border-slate-200">
                                    <TableHead className="text-[9px] font-black text-slate-900 uppercase tracking-widest h-12 text-center">TIMESTAMP</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-900 uppercase tracking-widest h-12">BY OFFICIAL</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-900 uppercase tracking-widest h-12">FIELD DATA</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-900 uppercase tracking-widest h-12">PREVIOUS STATE</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-900 uppercase tracking-widest h-12">NEW STATE</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {revisions.map((rev) => {
                                    const revUser = users.find(u => u.id === rev.userId);
                                    return (
                                        <TableRow key={rev.id} className="hover:bg-slate-50/50">
                                            <TableCell className="text-[10px] font-black text-slate-400 text-center py-4">
                                                {format(parseISO(rev.date), 'dd/MM/yy · HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6 border border-slate-100">
                                                        <AvatarImage src={revUser?.avatar}/>
                                                        <AvatarFallback className="text-[8px] font-black">{revUser?.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-[10px] font-bold text-slate-900 uppercase">{revUser?.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-blue-200 text-blue-600 bg-blue-50">{rev.field}</Badge>
                                            </TableCell>
                                            <TableCell className="text-[10px] font-bold text-rose-400 italic strike-through line-through opacity-60">
                                                {String(rev.oldValue || '—')}
                                            </TableCell>
                                            <TableCell className="text-[10px] font-black text-emerald-600">
                                                {String(rev.newValue || '—')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 flex flex-col items-center justify-center grayscale opacity-40">
                         <ShieldCheck className="h-8 w-8 text-slate-300 mb-3" />
                         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Original discovery record intact · No revisions recorded</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function EditableMeta({ label, value, isEditing, field, type, options, onChange }: { label: string, value: string, isEditing: boolean, field: string, type: 'text' | 'select', options?: any[], onChange: (val: any) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500/30" /> {label}
            </Label>
            {isEditing ? (
                type === 'select' ? (
                    <Select value={value} onValueChange={onChange}>
                        <SelectTrigger className="h-10 rounded-xl font-bold text-xs bg-white border-2 border-blue-100 shadow-sm">
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
                    <Input 
                        className="h-10 rounded-xl font-bold text-xs bg-white border-2 border-blue-100 shadow-sm"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                    />
                )
            ) : (
                <div className="h-10 px-4 flex items-center bg-white border border-slate-200 rounded-xl shadow-sm">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{value}</span>
                </div>
            )}
        </div>
    );
}

function StatItem({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
    return (
        <div className="space-y-1.5 text-left">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                <Icon className="h-2.5 w-2.5 text-slate-500" /> {label}
            </p>
            <p className="text-lg font-black text-white tracking-tight uppercase">{value}</p>
        </div>
    );
}
