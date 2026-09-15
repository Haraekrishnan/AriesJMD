
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ExternalLink, X, MapPin, User, Calendar, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
            <Card className="hidden lg:flex flex-col items-center justify-center rounded-[2rem] bg-slate-50/50 border-dashed border-2">
                <ShieldCheck className="h-12 w-12 text-slate-200 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 text-center px-10">Select a safety case to view immediate discovery details</p>
            </Card>
        );
    }

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const owner = users.find(u => u.id === observation.stages[observation.currentStage]?.assigneeId);

    return (
        <Card className="hidden lg:flex flex-col rounded-[2rem] border-slate-200 shadow-xl overflow-hidden bg-white animate-in slide-in-from-right duration-500">
            <CardHeader className="p-8 pb-4 space-y-4 border-b">
                <div className="flex justify-between items-start">
                    <Badge className="bg-slate-900 font-black uppercase text-[9px] tracking-widest px-4 h-6">
                        CAPA-{format(parseISO(observation.createdAt), 'yy')}-{observation.id.slice(-4).toUpperCase()}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-tight line-clamp-2">
                        {observation.description}
                    </h3>
                </div>
            </CardHeader>

            <ScrollArea className="flex-1">
                <CardContent className="p-8 space-y-8">
                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-y-6">
                        <MetaItem icon={MapPin} label="Site Location" value={project?.name || 'N/A'} />
                        <MetaItem icon={User} label="Reporter" value={reporter?.name || 'System'} />
                        <MetaItem icon={Calendar} label="Incident Date" value={format(parseISO(observation.createdAt), 'dd MMM yyyy')} />
                        <MetaItem icon={ShieldCheck} label="Risk Rating" value={observation.severity.toUpperCase()} isBold />
                    </div>

                    <Separator className="bg-slate-100" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Action Phase</p>
                             <Badge variant="outline" className="font-black text-[8px] uppercase">{observation.status}</Badge>
                        </div>
                        <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-100 space-y-2">
                            <p className="font-black text-blue-900 uppercase text-xs tracking-tight">{observation.currentStage}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-700">Responsibility: {owner?.name || 'Unassigned'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remediation Status</p>
                        <div className="grid grid-cols-7 gap-1">
                            {['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'].map((stage, i) => {
                                const s = observation.stages[stage as any];
                                return (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "h-1.5 rounded-full",
                                            s?.status === 'Completed' ? "bg-emerald-500" : (stage === observation.currentStage ? "bg-blue-500 animate-pulse" : "bg-slate-100")
                                        )}
                                        title={stage}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </ScrollArea>

            <CardFooter className="p-8 pt-4 border-t bg-slate-50/50">
                <Button 
                    className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
                    onClick={onOpenCockpit}
                >
                    Open Lifecycle Cockpit <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
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
            <p className={cn("text-xs truncate text-slate-700", isBold ? "font-black" : "font-bold")}>{value}</p>
        </div>
    );
}
