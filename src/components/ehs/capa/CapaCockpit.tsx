'use client';

import React, { useState } from 'react';
import { 
    ChevronLeft, 
    MessageSquare, 
    Clock, 
    MapPin,
    User,
    Calendar,
    Paperclip,
    FileText,
    MoreVertical,
    ShieldAlert,
    Target,
    Download,
    Share2,
    CheckCircle2,
    Activity,
    ShieldCheck,
    Plus,
    X,
    FileSearch,
    UploadCloud,
    ArrowRight,
    Search,
    Info,
    AlertTriangle,
    Save,
    Send,
    History,
    CheckCircle,
    UserCircle,
    Trash2
} from 'lucide-react';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { useForm, FormProvider } from 'react-hook-form';

import CapaStepper from './cockpit/CapaStepper';
import CapaLeftSidebar from './cockpit/CapaLeftSidebar';
import CapaRightSidebar from './cockpit/CapaRightSidebar';
import CapaInvestigationWorkspace from './cockpit/CapaInvestigationWorkspace';

interface CapaCockpitProps {
    observation: EhsObservation;
    onClose: () => void;
}

export default function CapaCockpit({ observation, onClose }: CapaCockpitProps) {
    const { users } = useAuth();
    const { projects } = useGeneral();
    const [viewingStage, setViewingStage] = useState<CapaStage>(observation.currentStage || 'Investigation');

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const methods = useForm({
        defaultValues: observation.stages?.[viewingStage]?.data || {}
    });

    return (
        <FormProvider {...methods}>
            <div className="fixed inset-0 z-40 flex flex-col bg-[#F3F7FB] text-slate-900 font-sans overflow-hidden select-none">
                
                {/* --- 1. EXECUTIVE HEADER --- */}
                <header className="shrink-0 bg-white border-b px-8 py-4 flex flex-col gap-3 z-30 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={onClose} 
                                className="h-9 px-3 text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100"
                            >
                                <ChevronLeft className="mr-1.5 h-4 w-4" /> Back
                            </Button>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                                    {observation.id.slice(-10).toUpperCase()}
                                </h1>
                                <Badge variant="outline" className="bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] font-black uppercase text-[10px] px-3 h-6">
                                    MEDIUM RISK
                                </Badge>
                                <Badge variant="outline" className="bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE] font-black uppercase text-[10px] px-3 h-6">
                                    OPEN
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 mr-6">
                                <div className="bg-[#D1FAE5] p-1.5 rounded-lg">
                                    <ShieldCheck className="h-4 w-4 text-[#059669]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">A SAFER WORKPLACE</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-none">A STRONGER TOMORROW</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="h-10 px-4 gap-2 text-blue-700 border-blue-100 bg-blue-50 font-bold text-xs uppercase tracking-wider">
                                <MessageSquare className="h-4 w-4" /> Add Comment
                            </Button>
                            <Button variant="outline" size="sm" className="h-10 px-4 gap-2 text-blue-700 border-blue-100 bg-blue-50 font-bold text-xs uppercase tracking-wider">
                                <UploadCloud className="h-4 w-4" /> Upload Document
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 border text-slate-400">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-bold text-slate-600 uppercase tracking-tight">{observation.description}</p>
                        <div className="flex items-center gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pt-1">
                            <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-blue-600" /> {project?.name || 'STORE'}</span>
                            <span className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-blue-600" /> Reported by {reporter?.name || 'N/A'}</span>
                            <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-blue-600" /> {format(parseISO(observation.createdAt), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-2 text-rose-500"><Clock className="h-3.5 w-3.5" /> 0 Days Open</span>
                            <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-blue-600" /> Target Closure: 30 Sep 2026</span>
                        </div>
                    </div>
                </header>

                {/* --- 2. PROGRESS STEPPER --- */}
                <section className="h-24 shrink-0 bg-[#F8FAFC] border-b px-10 flex items-center z-20">
                    <CapaStepper currentStage={observation.currentStage} />
                </section>

                {/* --- 3. CORE CONTENT AREA --- */}
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT SIDEBAR */}
                    <aside className="w-[280px] shrink-0 border-r bg-white flex flex-col z-20 overflow-y-auto">
                        <CapaLeftSidebar observation={observation} />
                    </aside>

                    {/* MAIN WORKSPACE */}
                    <main className="flex-1 flex flex-col overflow-hidden relative bg-[#F3F7FB]">
                        <ScrollArea className="flex-1">
                            <div className="p-8 max-w-[1400px] mx-auto w-full pb-40">
                                <CapaInvestigationWorkspace observation={observation} />
                            </div>
                        </ScrollArea>

                        {/* BOTTOM ACTION BAR */}
                        <footer className="h-20 shrink-0 bg-white border-t px-8 flex items-center justify-between z-30 absolute bottom-0 left-0 right-0 shadow-lg">
                            <div className="flex items-center gap-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Stage: Investigation</span>
                                </div>
                                <div className="h-6 w-px bg-slate-200" />
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Status: </span>
                                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Pending</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button variant="ghost" className="h-11 px-6 font-bold text-xs uppercase tracking-widest border border-slate-200 gap-2">
                                    <Save className="h-4 w-4" /> Save Draft
                                </Button>
                                <Button variant="ghost" className="h-11 px-6 font-bold text-xs uppercase tracking-widest border border-slate-200 gap-2">
                                    <MessageSquare className="h-4 w-4" /> Add Comment
                                </Button>
                                <Button variant="outline" className="h-11 px-6 font-bold text-xs uppercase tracking-widest text-blue-700 border-blue-200 bg-blue-50 gap-2">
                                    <UploadCloud className="h-4 w-4" /> Upload Document
                                </Button>
                                <Button className="h-11 px-10 bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[11px] gap-3 rounded-lg ml-4">
                                    <Send className="h-4 w-4" /> Submit Investigation
                                </Button>
                            </div>
                        </footer>
                    </main>

                    {/* RIGHT SIDEBAR */}
                    <aside className="w-[360px] shrink-0 border-l bg-white flex flex-col z-20 overflow-y-auto">
                        <CapaRightSidebar observation={observation} />
                    </aside>
                </div>
            </div>
        </FormProvider>
    );
}
