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
    ArrowDown
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { format, parseISO } from 'date-fns';

const SECTIONS = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: '5why', label: '5-Why Analysis', icon: Search },
    { id: 'rootcause', label: 'Root Cause', icon: GitBranch },
    { id: 'evidence', label: 'Evidence', icon: Paperclip },
    { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 },
];

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const { users } = useAuth();
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 text-left">
            <div className="space-y-2 mb-8">
                <h3 className="text-xl font-bold text-[#0F172A] uppercase tracking-tight">Investigation Workbench</h3>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest leading-none">Milestone 02: Systematic root cause identification and technical analysis.</p>
            </div>

            <Tabs defaultValue="summary" className="w-full">
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200 mb-8 inline-flex">
                    <TabsList className="h-9 bg-transparent p-0 flex gap-1">
                        {SECTIONS.map(s => (
                            <TabsTrigger 
                                key={s.id} 
                                value={s.id}
                                className="h-7 rounded-md px-5 text-[10px] font-bold uppercase tracking-wide data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all"
                            >
                                <s.icon className="mr-2 h-3.5 w-3.5" /> {s.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                            <div className="px-5 py-3 border-b bg-slate-50/50">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <MapPin className="h-3 w-3" /> Technical Logistics
                                </h4>
                            </div>
                            <CardContent className="p-6 space-y-6">
                                <FormItem label="PERSONNEL INVOLVED" placeholder="List employees or departments..." isLocked={isLocked} defaultValue={stageData?.data?.involved} />
                                <FormItem label="FIELD LOCATION DETAILS" placeholder="Specific unit, area or coordinate..." isLocked={isLocked} defaultValue={stageData?.data?.exactLocation} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormItem label="DISCOVERY DATE" type="text" isLocked={isLocked} placeholder="dd-mm-yyyy" defaultValue={stageData?.data?.date} />
                                    <FormItem label="DISCOVERY TIME" type="text" isLocked={isLocked} placeholder="--:--" defaultValue={stageData?.data?.time} />
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                            <div className="px-5 py-3 border-b bg-slate-50/50">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <History className="h-3 w-3" /> Narrative Discovery
                                </h4>
                            </div>
                            <CardContent className="p-6 space-y-6">
                                <FormItem label="SEQUENCE OF EVENTS" type="textarea" placeholder="Step-by-step description of the discovery..." isLocked={isLocked} defaultValue={stageData?.data?.sequence} />
                                <FormItem label="IMMEDIATE FINDING" type="textarea" placeholder="Primary direct cause identified..." isLocked={isLocked} isRequired defaultValue={stageData?.data?.immediateFinding} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="text-center space-y-1 mb-8">
                             <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">5-Why Root Cause Analysis</h4>
                             <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Iterative technique used to explore cause-and-effect relationships</p>
                        </div>
                        
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-5 items-start">
                                    <div className="flex flex-col items-center shrink-0 pt-2">
                                        <div className="h-8 w-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-sm">W{i}</div>
                                        {i < 5 && <ArrowDown className="h-4 w-4 text-slate-200 my-1" />}
                                    </div>
                                    <Card className="flex-1 border-slate-100 shadow-sm rounded-xl p-4 bg-white hover:border-slate-200 transition-colors">
                                        <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                                            {i === 1 ? 'Why did the immediate cause occur?' : `Why did the condition in Why ${i-1} exist?`}
                                        </Label>
                                        <Textarea 
                                            disabled={isLocked}
                                            placeholder="Technical reasoning..."
                                            className="min-h-[40px] border-none bg-slate-50 focus-visible:ring-0 p-3 text-xs font-semibold rounded-lg shadow-inner"
                                            defaultValue={stageData?.data?.[`why${i}`]}
                                        />
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="evidence" className="m-0 focus-visible:ring-0">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-slate-50 p-5 rounded-xl border border-slate-200 border-dashed">
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold uppercase tracking-tight text-slate-900">Field Evidence Documentation</h4>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">Photographs and technical records supporting the investigation findings.</p>
                            </div>
                            {!isLocked && (
                                <div className="relative">
                                    <Button className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-[9px] h-10 px-6 rounded-lg shadow-sm gap-2">
                                        <Upload className="h-3.5 w-3.5" /> {isUploading ? 'Uploading...' : 'Add Evidence'}
                                    </Button>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                                </div>
                            )}
                        </div>

                        {attachments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {attachments.map(att => (
                                    <Card key={att.id} className="overflow-hidden border border-slate-200 hover:border-blue-400 transition-all group rounded-xl shadow-sm bg-white">
                                        <div className="aspect-video bg-slate-50 flex items-center justify-center border-b overflow-hidden relative">
                                            {att.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                <img src={att.url} alt={att.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                            ) : (
                                                <FileText className="h-10 w-10 text-slate-200" />
                                            )}
                                            <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button asChild variant="outline" size="sm" className="bg-white border-none font-bold text-[9px] uppercase h-8 px-4 rounded-md">
                                                    <a href={att.url} target="_blank" rel="noopener noreferrer">Preview</a>
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="p-3 text-left">
                                            <p className="font-bold text-[10px] uppercase text-slate-900 truncate mb-1">{att.name}</p>
                                            <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span>{format(parseISO(att.uploadedAt), 'dd MMM yy')}</span>
                                                <span>By: {users.find(u => u.id === att.uploadedBy)?.name.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 opacity-40">
                                <Paperclip className="h-12 w-12 text-slate-300 mb-4" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No technical evidence uploaded</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="m-0 focus-visible:ring-0">
                    <div className="max-w-2xl mx-auto py-8">
                        <Card className="border-2 border-blue-100 rounded-2xl shadow-sm bg-white overflow-hidden">
                            <div className="p-4 bg-blue-50 border-b border-blue-100">
                                <h4 className="text-xs font-bold uppercase tracking-tight text-blue-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-blue-600" /> Authorized Conclusion
                                </h4>
                            </div>
                            <CardContent className="p-6 space-y-6">
                                <FormItem label="INVESTIGATION SUMMARY" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="ROOT CAUSE DETERMINATION" type="textarea" isLocked={isLocked} isRequired />
                                <FormItem label="RECOMMENDED ACTIONS" type="textarea" isLocked={isLocked} isRequired />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired, defaultValue }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean, defaultValue?: string }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                {label} {isRequired && <span className="text-rose-600 font-black">*</span>}
            </Label>
            {type === 'textarea' ? (
                <Textarea 
                    disabled={isLocked}
                    placeholder={placeholder}
                    defaultValue={defaultValue}
                    className="min-h-[100px] rounded-lg border border-slate-200 font-semibold text-xs bg-slate-50/50 focus-visible:ring-blue-100 shadow-inner"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    defaultValue={defaultValue}
                    className="h-10 rounded-lg border border-slate-200 font-semibold text-xs bg-slate-50/50 focus-visible:ring-blue-100 shadow-inner px-4"
                />
            )}
        </div>
    );
}