'use client';

import React, { useMemo } from 'react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { 
    Activity, 
    MessageSquare, 
    Send, 
    ShieldCheck,
    History,
    Zap,
    Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function CapaIntelligencePanel({ observation }: { observation: EhsObservation }) {
    const { user, users } = useAuth();

    const comments = useMemo(() => {
        const stageData = observation.stages[observation.currentStage];
        if (!stageData?.comments) return [];
        return Object.values(stageData.comments).sort((a, b) => 
            parseISO(b.date).getTime() - parseISO(a.date).getTime()
        );
    }, [observation]);

    return (
        <div className="space-y-12">
            {/* --- CASE VITALITY --- */}
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-1">Lifecycle Intelligence</p>
                <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-inner space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-emerald-600" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Governance Health</span>
                        </div>
                        <Badge className="bg-emerald-500 font-black uppercase text-[8px] px-2.5 h-5 border-none shadow-sm">OPTIMAL</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Stage Age</p>
                            <p className="text-sm font-black text-slate-900">2 Days</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Reworks</p>
                            <p className="text-sm font-black text-slate-900">0 Total</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- INFORMED PERSONNEL --- */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                        <Users className="h-3 w-3" /> Stakeholder Loop
                    </p>
                    <Button variant="ghost" className="h-6 px-3 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg">Notify Personnel +</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(observation.ccUserIds || []).length > 0 ? (
                        observation.ccUserIds!.map(id => {
                            const u = users.find(x => x.id === id);
                            return (
                                <TooltipProvider key={id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-md ring-1 ring-slate-100 hover:scale-110 transition-transform cursor-pointer">
                                                <AvatarImage src={u?.avatar} />
                                                <AvatarFallback className="text-[10px] font-black bg-blue-50 text-blue-600">{u?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="font-bold text-xs">{u?.name}</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })
                    ) : (
                        <div className="w-full py-6 px-4 bg-slate-50 border border-dashed rounded-2xl flex items-center justify-center gap-3 opacity-60 grayscale">
                             <Users className="h-4 w-4 text-slate-400" />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No extra personnel notified</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- COLLABORATIVE DISCUSSION --- */}
            <div className="space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2 ml-1">
                    <MessageSquare className="h-3 w-3" /> Contextual Feed
                </p>
                
                <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-8 pb-4">
                        {comments.length > 0 ? (
                            comments.map((comment, i) => {
                                const author = users.find(u => u.id === comment.userId);
                                return (
                                    <div key={comment.id || i} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <Avatar className="h-9 w-9 shrink-0 border-2 border-white shadow-md">
                                            <AvatarImage src={author?.avatar} />
                                            <AvatarFallback className="text-[9px] font-black">{author?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-2 min-w-0 text-left">
                                            <div className="flex justify-between items-baseline gap-2">
                                                <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-wider truncate">{author?.name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">
                                                    {formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <div className="p-4 rounded-[1.25rem] rounded-tl-none bg-slate-50 border border-slate-100 shadow-sm relative group">
                                                <p className="text-[12px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center grayscale">
                                <div className="p-5 rounded-full bg-slate-100 mb-4">
                                    <MessageSquare className="h-8 w-8 text-slate-400" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">No dialogue recorded for this stage</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="relative pt-6">
                    <Textarea 
                        placeholder="Add a technical note or query..." 
                        className="min-h-[140px] rounded-[1.5rem] border-2 border-slate-100 bg-white p-6 font-bold text-xs focus-visible:ring-blue-100 shadow-xl"
                    />
                    <Button 
                        size="icon" 
                        className="absolute right-4 bottom-4 h-10 w-10 rounded-full bg-slate-900 shadow-2xl active:scale-95 transition-all hover:bg-black"
                    >
                        <Send className="h-4 w-4 text-white" />
                    </Button>
                </div>
            </div>
        </div>
    );
}