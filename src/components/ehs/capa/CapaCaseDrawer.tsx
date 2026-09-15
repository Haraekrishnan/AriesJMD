
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { X, MapPin, User, Calendar, ShieldCheck, ArrowUpRight, Clock, Target, Edit, Split, MessageSquare, Paperclip } from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface CapaCaseDrawerProps {
    observation: EhsObservation | undefined;
    onOpenCockpit: () => void;
    onClose: () => void;
}

export default function CapaCaseDrawer({ observation, onOpenCockpit, onClose }: CapaCaseDrawerProps) {
    const { projects } = useGeneral();
    const { users } = useAuth();

    if (!observation) {
        return (
            <Card className="hidden lg:flex h-full flex-col items-center justify-center rounded-[2.5rem] bg-white border-slate-200 border shadow-sm p-10 text-center">
                <div className="bg-slate-50 p-6 rounded-full mb-6">
                    <Target className="h-12 w-12 text-slate-200" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Select a Safety Case</h4>
                <p className="text-xs font-medium text-slate-400 mt-2">Click any row in the registry to view immediate technical findings and lifecycle progress.</p>
            </Card>
        );
    }

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    
    const caseIdDisplay = `CAPA-2026-${observation.id.slice(-3).toUpperCase()}`;

    return (
        <Card className="hidden lg:flex flex-col h-full rounded-[2.5rem] border-slate-200 shadow-xl overflow-hidden bg-white animate-in slide-in-from-right duration-500">
            <CardHeader className="p-8 pb-4 space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{caseIdDisplay}</h3>
                         <Badge className="bg-blue-600 font-black uppercase text-[8px] tracking-widest h-5">{observation.status}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-sm font-bold text-slate-700 leading-tight uppercase line-clamp-2">{observation.description}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 font-black uppercase text-[8px] h-6 px-3 tracking-widest">Unsafe Act</Badge>
                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 font-black uppercase text-[8px] h-6 px-3 tracking-widest">High Risk</Badge>
                    <div className="flex items-center gap-1.5 ml-auto text-[10px] font-black text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3" /> 5 Days
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden mt-4">
                <div className="px-8 border-b">
                    <TabsList className="w-full justify-start gap-6 bg-transparent h-10 p-0 rounded-none">
                        {['Overview', 'Workflow', 'Details', 'Attachments', 'History'].map(tab => (
                            <TabsTrigger 
                                key={tab} 
                                value={tab.toLowerCase()}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent font-black text-[10px] uppercase tracking-widest px-0 h-10"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <TabsContent value="overview" className="p-8 m-0 space-y-8">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Narrative Findings
                            </p>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                "{observation.description}"
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-6">
                            <MetaItem icon={MapPin} label="Site Location" value={project?.name || 'DTA'} />
                            <MetaItem icon={User} label="Reported By" value={reporter?.name || 'Sanjay Kumar'} />
                            <MetaItem icon={ShieldCheck} label="Risk Level" value={observation.severity.toUpperCase()} isBold />
                            <MetaItem icon={Clock} label="Target Closure" value="---" />
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="grid grid-cols-2 gap-4">
                             <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 font-black uppercase tracking-widest text-[9px] rounded-lg shadow-lg shadow-emerald-500/10" onClick={onOpenCockpit}>
                                <Edit className="h-3.5 w-3.5 mr-2" /> Open Cockpit
                             </Button>
                             <Button variant="outline" className="border-slate-200 text-slate-700 h-11 font-black uppercase tracking-widest text-[9px] rounded-lg">
                                <Split className="h-3.5 w-3.5 mr-2" /> Split Case
                             </Button>
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <CardFooter className="p-6 pt-2 border-t bg-slate-50/30 flex flex-col gap-4">
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-full">Quick Actions</p>
                 <div className="grid grid-cols-4 gap-2 w-full">
                    <ActionButton icon={MessageSquare} label="Comment" />
                    <ActionButton icon={Paperclip} label="Evidence" />
                    <ActionButton icon={ArrowUpRight} label="Redirect" />
                    <ActionButton icon={ShieldCheck} label="Overtake" />
                 </div>
            </CardFooter>
        </Card>
    );
}

function MetaItem({ icon: Icon, label, value, isBold = false }: { icon: any, label: string, value: string, isBold?: boolean }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-slate-300" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            </div>
            <p className={cn("text-xs truncate text-slate-800", isBold ? "font-black" : "font-bold")}>{value}</p>
        </div>
    );
}

function ActionButton({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <button className="flex flex-col items-center justify-center gap-2 group">
            <div className="h-10 w-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-50 transition-colors shadow-sm">
                <Icon className="h-4 w-4" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        </button>
    );
}
