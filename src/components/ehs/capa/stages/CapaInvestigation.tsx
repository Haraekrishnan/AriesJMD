'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { 
    FileText, 
    Search, 
    GitBranch, 
    LayoutGrid, 
    History, 
    CheckCircle2,
    ArrowDown,
    MapPin,
    User,
    Calendar,
    Clock,
    Paperclip,
    Plus,
    Download,
    X,
    ExternalLink,
    Upload
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';

const SECTIONS = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: '5why', label: '5-Why Analysis', icon: Search },
    { id: 'rootcause', label: 'Root Cause', icon: GitBranch },
    { id: 'evidence', label: 'Evidence', icon: Paperclip },
    { id: 'conclusion', label: 'Conclusion', icon: CheckCircle2 },
];

export default function CapaInvestigation({ observation, isLocked }: { observation: EhsObservation, isLocked: boolean }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);

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
                toast({ title: "Evidence Uploaded", description: file.name });
                // Note: Actual logic to push to stage attachments would go here via EhsProvider
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
            {/* --- WORKBENCH HEADER --- */}
            <div className="flex items-center gap-8 mb-12">
                <div className="h-16 w-16 rounded-3xl bg-[#2563EB] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 ring-8 ring-blue-50">
                    <span className="font-black text-2xl">02</span>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Technical Action Required</p>
                        <Badge variant="outline" className="h-5 rounded-sm bg-blue-50 text-blue-700 border-none font-black text-[9px] px-2.5">PHASE IMPLEMENTATION</Badge>
                    </div>
                    <h3 className="text-4xl font-black text-[#0F172A] uppercase tracking-tighter">Investigation Workbench</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">Systematic root cause identification and technical forensics.</p>
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
                        <Card className="p-10 border-2 border-slate-100 shadow-sm rounded-3xl space-y-10 hover:border-blue-100 transition-colors">
                            <h4 className="text-xs font-black uppercase tracking-[0.5em] text-blue-600 border-b pb-4 flex items-center gap-3">
                                <MapPin className="h-4 w-4" /> Technical Logistics
                            </h4>
                            <div className="space-y-8">
                                <FormItem label="Personnel Involved" placeholder="Identify employees, contractors, or specific trades..." isLocked={isLocked} icon={User} />
                                <FormItem label="Field Location Details" placeholder="Specify deck level, workshop unit, or coordinates..." isLocked={isLocked} icon={MapPin} />
                                <div className="grid grid-cols-2 gap-8">
                                    <FormItem label="Discovery Date" type="date" isLocked={isLocked} icon={Calendar} />
                                    <FormItem label="Discovery Time" type="time" isLocked={isLocked} icon={Clock} />
                                </div>
                            </div>
                        </Card>
                        
                        <Card className="p-10 border-2 border-slate-100 shadow-sm rounded-3xl space-y-10 hover:border-blue-100 transition-colors">
                            <h4 className="text-xs font-black uppercase tracking-[0.5em] text-blue-600 border-b pb-4 flex items-center gap-3">
                                <History className="h-4 w-4" /> Narrative Forensic Context
                            </h4>
                            <div className="space-y-8">
                                <FormItem label="Sequence of Events (Chronological)" type="textarea" placeholder="Step-by-step technical sequence of the discovery..." isLocked={isLocked} />
                                <FormItem label="Immediate Finding (Primary Cause)" type="textarea" placeholder="State the direct reason for the unsafe act or condition..." isLocked={isLocked} isRequired />
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="5why" className="m-0 focus-visible:ring-0">
                    <div className="max-w-5xl mx-auto space-y-12 py-6">
                        <div className="text-center space-y-4">
                             <div className="bg-blue-100 h-14 w-14 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><Search className="h-7 w-7 text-blue-600" /></div>
                             <h4 className="text-2xl font-black uppercase tracking-tight text-slate-900">Root Cause Methodology (5-Why)</h4>
                             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Ask "Why?" until the systemic organizational failure is revealed</p>
                        </div>
                        
                        <div className="space-y-8 relative">
                            <div className="absolute left-6 top-8 bottom-8 w-1 bg-slate-100 -z-10 rounded-full" />
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-10 items-start animate-in slide-in-from-left-6 duration-700" style={{ animationDelay: `${i * 150}ms` }}>
                                    <div className="h-12 w-12 rounded-2xl bg-[#0F172A] text-white font-black flex items-center justify-center text-sm shadow-2xl ring-8 ring-white shrink-0">W{i}</div>
                                    <Card className="flex-1 p-8 border-2 border-slate-100 shadow-sm rounded-3xl hover:border-blue-300 transition-all group relative overflow-hidden bg-white">
                                        <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-100 group-hover:bg-blue-500 transition-colors" />
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 block">
                                            {i === 1 ? "Why did the immediate finding occur?" : `Why did the technical condition in WHY ${i-1} exist?`}
                                        </Label>
                                        <Textarea 
                                            disabled={isLocked}
                                            placeholder="Enter technical reasoning and causal deduction..."
                                            className="min-h-[70px] border-none bg-slate-50/50 p-6 font-bold focus-visible:ring-0 text-slate-800 text-lg shadow-inner rounded-2xl italic leading-relaxed"
                                        />
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="evidence" className="m-0 focus-visible:ring-0">
                    <div className="space-y-8">
                        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
                            <div className="space-y-1">
                                <h4 className="text-lg font-black uppercase tracking-tight">Evidence Documentation</h4>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Field photos and technical reports supporting the discovery.</p>
                            </div>
                            {!isLocked && (
                                <div className="relative">
                                    <Button className="bg-[#2563EB] hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-blue-500/20 gap-2">
                                        <Upload className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Add Field Evidence'}
                                    </Button>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={isUploading} />
                                </div>
                            )}
                        </div>

                        {/* Evidence Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Empty State placeholder */}
                            <div className="lg:col-span-4 py-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/30 opacity-40 grayscale">
                                <Paperclip className="h-16 w-16 text-slate-300 mb-6" />
                                <p className="text-sm font-black uppercase tracking-widest text-slate-400">No technical evidence uploaded yet</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="conclusion" className="m-0 focus-visible:ring-0">
                    <div className="max-w-4xl mx-auto space-y-10 py-6">
                        <Card className="rounded-[3rem] border-none shadow-2xl p-12 bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16" />
                            <CardContent className="p-0 space-y-10 relative z-10">
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20"><CheckCircle2 className="h-8 w-8" /></div>
                                    <div>
                                        <h4 className="text-3xl font-black uppercase tracking-tight text-[#0F172A]">Technical Determination</h4>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Investigator Summary & Sign-off</p>
                                    </div>
                                </div>
                                <div className="space-y-10">
                                    <FormItem label="Formal Investigation Findings" type="textarea" isLocked={isLocked} isRequired />
                                    <FormItem label="Deducted Root Cause (Systemic Failure)" type="textarea" isLocked={isLocked} isRequired />
                                    <FormItem label="Proposed Operational Remediation" type="textarea" isLocked={isLocked} isRequired />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FormItem({ label, placeholder, type = 'text', isLocked, isRequired, icon: Icon }: { label: string, placeholder?: string, type?: 'text' | 'textarea' | 'date' | 'time', isLocked: boolean, isRequired?: boolean, icon?: any }) {
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
                    className="min-h-[140px] rounded-[1.5rem] border-2 border-slate-100 font-bold text-sm bg-slate-50/20 focus-visible:ring-[#2563EB]/10 px-6 py-5 shadow-inner transition-all hover:border-slate-200"
                />
            ) : (
                <Input 
                    type={type}
                    disabled={isLocked}
                    placeholder={placeholder}
                    className="h-14 rounded-2xl border-2 border-slate-100 font-bold text-sm bg-slate-50/20 focus-visible:ring-[#2563EB]/10 px-6 shadow-inner transition-all hover:border-slate-200"
                />
            )}
        </div>
    );
}
