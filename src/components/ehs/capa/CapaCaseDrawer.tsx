'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    X, 
    MapPin, 
    User, 
    Calendar, 
    ShieldAlert, 
    Clock, 
    ChevronRight,
    CheckCircle2,
    MessageSquare,
    Paperclip,
    ArrowUpRight,
    ShieldCheck,
    Edit3,
    Split,
    UserPlus,
    FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EhsObservation } from '@/lib/types';
import { useGeneral } from '@/contexts/general-provider';
import { useAuth } from '@/contexts/auth-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CapaCaseDrawerProps {
    observation: EhsObservation | undefined;
    onClose: () => void;
}

const statusOptions = ['Open', 'In Progress', 'Returned', 'Closed'];

export default function CapaCaseDrawer({ observation, onClose }: CapaCaseDrawerProps) {
    const { projects } = useGeneral();
    const { users } = useAuth();

    if (!observation) {
        return (
            <Card className="hidden lg:flex flex-col items-center justify-center p-12 text-center bg-white border-slate-100 rounded-3xl shadow-sm h-full">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                    <FileText className="h-8 w-8 text-slate-200" />
                </div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Select a safety case</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-[200px] font-medium leading-relaxed">Select any row from the registry to view its lifecycle intelligence.</p>
            </Card>
        );
    }

    const project = projects.find(p => p.id === observation.projectId);
    const reporter = users.find(u => u.id === observation.reporterId);
    const createdDate = parseISO(observation.createdAt);

    return (
        <Card className="bg-white border-slate-100 rounded-3xl shadow-xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
            <CardHeader className="p-6 border-b shrink-0 bg-white">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-xl">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-slate-900 tracking-tight uppercase">CAPA-2026-{observation.id.slice(-3).toUpperCase()}</CardTitle>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select defaultValue={observation.status}>
                            <SelectTrigger className="h-8 w-[120px] text-[10px] font-black uppercase tracking-widest border-none bg-blue-50 text-blue-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                
                <h3 className="text-sm font-bold text-slate-800 leading-tight mb-4 line-clamp-2">
                    {observation.description}
                </h3>

                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 text-[8px] font-black uppercase px-3 h-5">
                        {observation.category}
                    </Badge>
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-100 text-[8px] font-black uppercase px-3 h-5">
                        {observation.severity} Risk
                    </Badge>
                    <div className="flex items-center gap-4 ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {project?.name}</span>
                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {format(createdDate, 'dd MMM yyyy')}</span>
                        <Badge variant="destructive" className="bg-rose-100 text-rose-600 text-[9px] font-black border-none rounded px-2 h-5 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> 5 days
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <div className="px-6 border-b bg-white">
                    <TabsList className="h-12 w-full justify-start gap-6 bg-transparent p-0">
                        {['Overview', 'Workflow', 'Details', 'Attachments', 'History'].map(tab => (
                            <TabsTrigger 
                                key={tab} 
                                value={tab.toLowerCase()}
                                className="h-12 rounded-none border-b-2 border-transparent px-0 text-[10px] font-black text-slate-400 uppercase tracking-widest data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 bg-transparent shadow-none"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <TabsContent value="overview" className="p-6 m-0 space-y-8">
                        {/* Narrative Findings Card */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <FileText className="h-3 w-3" /> Narrative Findings
                            </p>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                "{observation.description}"
                            </p>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t pt-6">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Site</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center"><MapPin className="h-3 w-3 text-slate-400" /></div>
                                    <span className="text-xs font-black text-slate-800 uppercase">{project?.name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reported By</p>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6"><AvatarImage src={reporter?.avatar}/><AvatarFallback>{reporter?.name?.[0]}</AvatarFallback></Avatar>
                                    <span className="text-xs font-bold text-slate-800">{reporter?.name}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                                <span className="text-xs font-black text-rose-600 uppercase underline decoration-2 underline-offset-4">{observation.category}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Risk Level</p>
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-3 w-3 text-rose-600" />
                                    <span className="text-xs font-black text-slate-800 uppercase">{observation.severity}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-[9px] font-black uppercase h-5">{observation.status}</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Closure</p>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-slate-300" />
                                    <span className="text-xs font-bold text-slate-300">---</span>
                                </div>
                            </div>
                        </div>

                        {/* Primary Management Actions */}
                        <div className="grid grid-cols-2 gap-3 border-t pt-6">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                                <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest h-10 rounded-xl border-2">
                                <Split className="mr-2 h-3.5 w-3.5" /> Split Case
                            </Button>
                            <Button variant="outline" className="font-black uppercase text-[10px] tracking-widest h-10 rounded-xl border-2 w-full col-span-1">
                                <UserPlus className="mr-2 h-3.5 w-3.5" /> Assign
                            </Button>
                            <Select>
                                <SelectTrigger className="h-10 text-[10px] font-black uppercase tracking-widest border-2 rounded-xl">
                                    <SelectValue placeholder="More" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="audit">Audit Trail</SelectItem>
                                    <SelectItem value="pdf">Download PDF</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quick Actions Feed */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quick Actions</h4>
                            <div className="grid grid-cols-4 gap-2">
                                <ActionIconBtn icon={MessageSquare} label="Comment" />
                                <ActionIconBtn icon={Paperclip} label="Evidence" />
                                <ActionIconBtn icon={ArrowUpRight} label="Redirect" />
                                <ActionIconBtn icon={ShieldCheck} label="Overtake" />
                            </div>
                        </div>

                        {/* Recent Activity Mini-Feed */}
                        <div className="space-y-4 border-t pt-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Activity</h4>
                                <Button variant="link" className="h-auto p-0 text-[10px] font-black text-blue-600 uppercase">View All</Button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-3 items-start">
                                    <Avatar className="h-7 w-7 border"><AvatarImage src="https://i.pravatar.cc/150?u=vj" /><AvatarFallback>VS</AvatarFallback></Avatar>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold leading-tight">
                                            <span className="font-black text-slate-900">Vijay Sai</span> reviewed Investigation 
                                            <Badge variant="outline" className="ml-2 bg-rose-50 text-rose-600 border-rose-100 text-[8px] font-black uppercase h-4">Rework Suggested</Badge>
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">2 hours ago</p>
                                        <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100">
                                            <p className="text-[10px] text-slate-600 font-medium">"Need detailed root cause analysis with 5-Whys. Please rework."</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <CardFooter className="p-4 border-t bg-slate-50/30 flex justify-center">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Aries EHS Governance Workspace v4.2</p>
            </CardFooter>
        </Card>
    );
}

function ActionIconBtn({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <button className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition-colors group">
            <Icon className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-tight">{label}</span>
        </button>
    );
}
