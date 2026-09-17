'use client';

import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage, CapaAttachment } from '@/lib/types';
import { 
    FileText, 
    Search, 
    GitBranch, 
    CheckCircle2,
    MapPin,
    User,
    Calendar,
    Clock,
    Paperclip,
    Download,
    Upload,
    History,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';

const SECTIONS = [
    { id: 'summary', label: 'SUMMARY', icon: FileText },
    { id: '5why', label: '5-WHY ANALYSIS', icon: Search },
    { id: 'rootcause', label: 'ROOT CAUSE', icon: GitBranch },
    { id: 'evidence', label: 'EVIDENCE', icon: Paperclip },
    { id: 'conclusion', label: 'CONCLUSION', icon: CheckCircle2 },
];

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const { user, users } = useAuth();
    const { addStageAttachment } = useEhs();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

    const stageData = observation.stages['Investigation'];
    const attachments = useMemo(() => {
        if (!stageData?.attachments) return [];
        return Object.values(stageData.attachments).sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt));
    }, [stageData]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload/dropbox", { method: "POST", body: formData });
            const data = await res.json();

            if (res.ok && data.success) {
                addStageAttachment(observation.id, 'Investigation', file.name, data.downloadLink);
                toast({ title: "Evidence Uploaded", description: file.name });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Internal file server error.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-8 mb-12">
                <div className="h-16 w-16 rounded-3xl bg-[#2563EB] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 ring-8 ring-blue-50">
                    <span className="font-black text-2xl">02</span>
                </div>
                <div className="space-y-1 text-left">
                    <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">TECHNICAL ACTION REQUIRED</p>
                        <Badge variant="outline" className="h-5 rounded-sm bg-blue-50 text-blue-700 border-none font-black text-[9px] px-2.5">PHASE IMPLEMENTATION</Badge>
                    </div>
                    <h3 className="text-4xl font-black text-[#0F172A] uppercase tracking-tighter">Investigation Workbench</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">SYSTEMATIC ROOT CAUSE IDENTIFICATION AND TECHNICAL FORENSICS.</p>
                </div>
            </div>

            <Tabs defaultValue="summary" className="w-full">
                <div className="bg-white p-2 rounded-2xl border-2 border-slate-100 mb-10 shadow-sm max-w-fit flex items-center gap-2">
                    <TabsList className="h-10 bg-transparent p-0 flex gap-1.5">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-9 rounded-xl px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] data-[state=active]:bg-[#2563EB] data-[state=active]:text-white data-[state=active]:shadow-xl transition-all duration-300"
                            >
                                <s.icon className="mr-2 h-4 w-4" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        <Card className="p-10 border-2 border-slate-100 shadow-sm rounded-3xl space-y-10 hover:border-blue-100 transition-colors text-left">
                            <h4 className="text-xs font-black uppercase tracking-[0.5em] text-blue-600 border-b pb-4 flex items-center gap-3">
                                <MapPin className="h-4 w-4" /> TECHNICAL LOGISTICS
                            </h4>
                            <div className="space-y-8">
                                <FormItem label="PERSONNEL INVOLVED" placeholder="Identify employees, contractors, or specific trades..." isLocked={isLocked} icon={User} defaultValue={stageData?.data?.involved} />
                                <FormItem label="FIELD LOCATION DETAILS" placeholder="Specify deck level, workshop unit, or coordinates..." isLocked={isLocked} icon={MapPin} defaultValue={stageData?.data?.exactLocation} />
                                <div className="grid grid-cols-2 gap-8">
                                    <FormItem label="DISCOVERY DATE" type="text" isLocked={isLocked} icon={Calendar} placeholder="dd-mm-yyyy" defaultValue={stageData?.data?.date} />
                                    <FormItem label="DISCOVERY TIME" type="text" isLocked={isLocked} icon={Clock} placeholder="--:--" defaultValue={stageData?.data?.time} />
                                </div>
                            </div>
                        </Card>
                        
                        <Card className="p-10 border-2 border-slate-100 shadow-sm rounded-3xl space-y-10 hover:border-blue-100 transition-colors text-left">
                            <h4 className="text-xs font-black uppercase tracking-[0.5em] text-blue-600 border-b pb-4 flex items-center gap-3">
                                <History className="h-4 w-4" /> NARRATIVE FORENSIC CONTEXT
                            </h4>
                            <div className="space-y-8">
                                <FormItem label="SEQUENCE OF EVENTS (CHRONOLOGICAL)" type="textarea" placeholder="Step-by-step technical sequence of the discovery..." isLocked={isLocked} defaultValue={stageData?.data?.sequence} />
                                <FormItem label="IMMEDIATE FINDING (PRIMARY CAUSE)" type="textarea" placeholder="State the direct reason for the unsafe act or condition..." isLocked={isLocked} isRequired defaultValue={stageData?.data?.immediateFinding} />
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="evidence" className="m-0 focus-visible:ring-0">
                    <div className="space-y-8">
                        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
                            <div className="space-y-1 text-left">
                                <h4 className="text-lg font-black uppercase tracking-tight text-slate-900">EVIDENCE DOCUMENTATION</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Field photos and technical reports supporting the discovery.</p>
                            </div>
                            {!isLocked && (
                                <div className="relative">
                                    <Button className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-blue-500/20 gap-2">
                                        <Upload className="h-4 w-4" /> {isUploading ? 'UPLOADING...' : 'ADD FIELD EVIDENCE'}
                                    </Button>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                                </div>
                            )}
                        </div>

                        {attachments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {attachments.map(att => (
                                    <Card key={att.id} className="overflow-hidden border-2 border-slate-100 hover:border-blue-400 transition-all group rounded-2xl shadow-sm">
                                        <div className="aspect-video bg-slate-50 flex items-center justify-center border-b overflow-hidden relative">
                                            {att.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                <img src={att.url} alt={att.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                            ) : (
                                                <FileText className="h-10 w-10 text-slate-300" />
                                            )}
                                            <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <Button asChild variant="outline" size="sm" className="bg-white border-none font-black text-[10px] uppercase h-8 px-4 rounded-lg">
                                                    <a href={att.url} target="_blank" rel="noopener noreferrer">PREVIEW</a>
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="p-4 text-left">
                                            <p className="font-black text-[10px] uppercase text-slate-900 truncate mb-1">{att.name}</p>
                                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span>{format(parseISO(att.uploadedAt), 'dd MMM yy')}</span>
                                                <span>BY: {users.find(u => u.id === att.uploadedBy)?.name.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/30 opacity-40 grayscale">
                                <Paperclip className="h-16 w-16 text-slate-300 mb-6" />
                                <p className="text-sm font-black uppercase tracking-widest text-slate-400">NO TECHNICAL EVIDENCE UPLOADED YET</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired, icon: Icon, defaultValue }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean, icon?: any, defaultValue?: string }) {
    return (
        <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 ml-1 flex items-center gap-2.5">
                {Icon && <Icon className="h-3.5 w-3.5 text-blue-500" />}
                {label} {isRequired && <span className="text-rose-600 font-black">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    defaultValue={defaultValue}
                    className="min-h-[140px] rounded-[1.5rem] border-2 border-slate-100 font-bold text-sm bg-slate-50/20 focus-visible:ring-[#2563EB]/10 px-6 py-5 shadow-inner transition-all hover:border-slate-200"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    defaultValue={defaultValue}
                    className="h-14 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-slate-50/20 focus-visible:ring-[#2563EB]/10 px-6 shadow-inner transition-all hover:border-slate-200"
                />
            )}
        </div>
    );
}
