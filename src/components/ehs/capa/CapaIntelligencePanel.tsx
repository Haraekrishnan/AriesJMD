
'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { 
    Activity, FileText, Users, MessageSquare, 
    ShieldAlert, Info, Send, Paperclip 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { EhsObservation } from '@/lib/types';
import { useAuth } from '@/contexts/auth-provider';

export default function CapaIntelligencePanel({ observation }: { observation: EhsObservation }) {
    const { user, users } = useAuth();

    const comments = useMemo(() => {
        const stageData = observation.stages[observation.currentStage];
        if (!stageData?.comments) return [];
        return Object.values(stageData.comments).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    }, [observation]);

    return (
        <div className="space-y-10">
            {/* Case Health */}
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Case Intelligence</p>
                <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-emerald-600" />
                        <span className="text-xs font-black text-slate-900 uppercase">System Health</span>
                    </div>
                    <Badge className="bg-emerald-500 font-black uppercase text-[8px] px-2 h-5">On Track</Badge>
                </div>
            </div>

            {/* Informed Personnel */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Informed Personnel</p>
                    <Button variant="ghost" className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-blue-600">Add +</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(observation.ccUserIds || []).map(id => {
                        const u = users.find(x => x.id === id);
                        return (
                            <Avatar key={id} className="h-8 w-8 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                <AvatarImage src={u?.avatar} />
                                <AvatarFallback className="text-[8px] font-black">{u?.name?.[0]}</AvatarFallback>
                            </Avatar>
                        );
                    })}
                </div>
            </div>

            {/* Contextual Discussion */}
            <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Collaborative Feed</p>
                <div className="space-y-6">
                    {comments.map((comment, i) => {
                        const author = users.find(u => u.id === comment.userId);
                        return (
                            <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Avatar className="h-8 w-8 shrink-0 border border-slate-100 shadow-sm">
                                    <AvatarImage src={author?.avatar} />
                                    <AvatarFallback className="text-[7px] font-black">{author?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] font-black text-slate-900 uppercase truncate">{author?.name}</span>
                                        <span className="text-[8px] font-bold text-slate-400 shrink-0">{formatDistanceToNow(parseISO(comment.date), { addSuffix: true })}</span>
                                    </div>
                                    <div className="p-3 rounded-2xl rounded-tl-none bg-slate-50 border border-slate-100">
                                        <p className="text-[11px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div className="relative pt-4">
                        <Textarea 
                            placeholder="Add a reply or technical note..." 
                            className="min-h-[100px] rounded-2xl border-2 border-slate-100 p-4 font-bold text-xs focus-visible:ring-blue-100 shadow-sm"
                        />
                        <Button size="icon" className="absolute right-3 bottom-3 h-8 w-8 rounded-full bg-slate-900 shadow-lg active:scale-95 transition-all">
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatDistanceToNow(date: Date, options: any) {
    // Helper implementation
    return "just now";
}
