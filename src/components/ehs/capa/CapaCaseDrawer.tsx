'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    X, 
    MapPin, 
    Calendar, 
    ShieldAlert, 
    Clock, 
    CheckCircle2,
    MessageSquare,
    ArrowUpRight,
    Edit3,
    Split,
    FileText,
    ExternalLink
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CapaCaseDrawerProps {
    observation: EhsObservation | undefined;
    onClose: () => void;
    onOpenCockpit: () => void;
}

export default function CapaCaseDrawer({ observation, onClose, onOpenCockpit }: CapaCaseDrawerProps) {
    const { projects } = useGeneral();
    const { users } = useAuth();

    if (!observation) return null;

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const createdDate = parseISO(observation.createdAt);

    return (
        <Card className="bg-white border-slate-200 rounded-[1.5rem] shadow-2xl flex flex-col h-full overflow-hidden border-t-4 border-t-blue-600">
            <CardHeader className="p-6 pb-2 border-b shrink-0 bg-white">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 shadow-sm">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 tracking-tight uppercase">CAPA-{observation.id.slice(-3).toUpperCase()}</CardTitle>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Lifecycle Preview</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-100">
                        <X className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-800 leading-snug line-clamp-3 uppercase tracking-tight">
                        {observation.description}
                    </h3>

                    <div className="flex flex-wrap gap-2 pb-4">
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[9px] font-black uppercase px-2.5 h-6">
                            {observation.category}
                        </Badge>
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 text-[9px] font-black uppercase px-2.5 h-6">
                            {observation.severity}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] font-black uppercase px-2.5 h-6">
                            {observation.status}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <div className="px-6 border-b bg-slate-50/50">
                    <TabsList className="h-12 w-full justify-start gap-6 bg-transparent p-0">
                        {['Overview', 'History', 'Discussion'].map(tab => (
                            <TabsTrigger 
                                key={tab} 
                                value={tab.toLowerCase()}
                                className="h-12 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black text-slate-400 uppercase tracking-widest data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 bg-transparent shadow-none"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <TabsContent value="overview" className="p-6 m-0 space-y-8">
                        {/* Narrative Findings Card */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                                <FileText className="h-3 w-3" /> Narrative Discovery
                            </p>
                            <p className="text-xs font-bold text-slate-500 leading-relaxed italic p-4 bg-slate-50 rounded-xl border border-slate-100">
                                "{observation.description}"
                            </p>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t pt-6">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Project</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100"><MapPin className="h-3 w-3 text-blue-500" /></div>
                                    <span className="text-xs font-black text-slate-800 uppercase truncate">{project?.name || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reporting Official</p>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 border border-slate-100 shadow-sm">
                                        <AvatarImage src={reporter?.avatar}/>
                                        <AvatarFallback className="text-[8px] font-black">{reporter?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-bold text-slate-800 truncate">{reporter?.name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Milestone</p>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] font-black uppercase h-5">{observation.currentStage}</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Health</p>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase">On Track</span>
                                </div>
                            </div>
                        </div>

                        {/* Interaction Log Summary */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-between">
                                RECENT ACTIVITY
                                <Button variant="link" className="h-auto p-0 text-[10px] text-blue-600 font-black">View All</Button>
                            </p>
                            <div className="space-y-3">
                                {observation.lastUpdated && (
                                    <div className="flex gap-3 text-left">
                                        <div className="w-1 bg-blue-100 rounded-full" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 uppercase">Case Status Synchronized</p>
                                            <p className="text-[9px] font-bold text-slate-400">{formatDistanceToNow(parseISO(observation.lastUpdated), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="discussion" className="p-6 m-0">
                         <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                            <MessageSquare className="h-10 w-10 mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Collaborative dialogue encrypted</p>
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <CardFooter className="p-6 border-t bg-slate-50/50 flex flex-col gap-3 shrink-0">
                <Button 
                    className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[11px] h-14 rounded-2xl shadow-xl shadow-blue-500/10 active:scale-95 transition-all"
                    onClick={onOpenCockpit}
                >
                    <ExternalLink className="mr-3 h-4 w-4" /> Open Technical Cockpit
                </Button>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest h-11 rounded-xl border-2">
                        <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest h-11 rounded-xl border-2">
                        <Split className="mr-2 h-3.5 w-3.5" /> Split
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

