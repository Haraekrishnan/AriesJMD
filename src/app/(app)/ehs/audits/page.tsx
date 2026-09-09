'use client';

import React, { useState, useMemo } from 'react';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, MapPin, ClipboardList, Clock, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const auditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['Safety', 'Environmental', 'Health', 'Fire']),
  projectId: z.string().min(1, 'Project location is required'),
  date: z.string().min(1, 'Date is required'),
  score: z.coerce.number().min(0).max(100),
});

type AuditFormValues = z.infer<typeof auditSchema>;

export default function EhsAuditsPage() {
  const { audits, addAudit, reviewAudit } = useEhs();
  const { user, users } = useAuth();
  const { projects } = useGeneral();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [reviewingAuditId, setReviewingAuditId] = useState<string | null>(null);
  const [supervisorComment, setSupervisorComment] = useState('');

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditSchema),
    defaultValues: { 
      type: 'Safety', 
      score: 100, 
      date: format(new Date(), 'yyyy-MM-dd'),
      projectId: '',
    },
  });

  const isSupervisor = user?.role === 'Senior Safety Supervisor' || user?.role === 'Admin';

  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const projectName = projects.find(p => p.id === a.projectId)?.name || '';
      return (
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [audits, searchTerm, projects]);

  const onSubmit = (data: AuditFormValues) => {
    if (!user) return;
    
    addAudit({
      ...data,
      inspectorId: user.id,
      findings: [],
      status: 'Pending Review',
    });
    
    toast({ title: 'Audit Submitted', description: 'Sent to Higher Official for review.' });
    setIsDialogOpen(false);
    form.reset();
  };

  const handleReviewAction = (status: 'Approved' | 'Rejected') => {
    if (!reviewingAuditId) return;
    if (!supervisorComment.trim()) {
      toast({ title: 'Comment Required', description: 'Please provide feedback for the review.', variant: 'destructive' });
      return;
    }
    reviewAudit(reviewingAuditId, status, supervisorComment);
    setReviewingAuditId(null);
    setSupervisorComment('');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Audits & Inspections</h1>
          <p className="text-slate-200 text-lg font-medium">Manage site walkthroughs and higher official reviews.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20">
              <Plus className="mr-2 h-4 w-4" /> New Audit Submission
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Register Site Audit</DialogTitle>
              <DialogDescription className="text-slate-300 font-medium">Submit an inspection outcome for higher official verification.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-100 font-bold">Audit Title</Label>
                <Input {...form.register('title')} className="bg-slate-800 border-slate-700 text-white focus:ring-emerald-500/20" placeholder="e.g., Weekly Site Walkthrough" />
                {form.formState.errors.title && <p className="text-xs text-rose-400">{form.formState.errors.title.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-100 font-bold">Audit Type</Label>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="Safety">Safety</SelectItem>
                          <SelectItem value="Environmental">Environmental</SelectItem>
                          <SelectItem value="Health">Health</SelectItem>
                          <SelectItem value="Fire">Fire</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-100 font-bold">Site Location</Label>
                  <Controller
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Select site..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-100 font-bold">Date</Label>
                  <Input type="date" {...form.register('date')} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-100 font-bold">Score (%)</Label>
                  <Input type="number" {...form.register('score')} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="bg-transparent border-slate-700 text-slate-200">Cancel</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Submit for Review</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-200" />
          <Input 
            placeholder="Search audits by title or site..." 
            className="pl-10 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-400 h-12 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-left">
        {filteredAudits.map((audit) => {
          const site = projects.find(p => p.id === audit.projectId);
          const reviewer = users.find(u => u.id === audit.reviewedById);
          
          return (
            <Card key={audit.id} className="bg-slate-900/60 border-slate-800 hover:border-emerald-500/30 transition-all duration-300 group shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                     <Badge variant="outline" className={cn(
                       "border-emerald-500/20 text-emerald-400 mb-2 font-black uppercase text-[10px] tracking-widest bg-emerald-500/5",
                       audit.status === 'Rejected' && "text-rose-400 border-rose-500/20 bg-rose-500/5"
                     )}>
                       {audit.type} &middot; {audit.status}
                     </Badge>
                    <CardTitle className="text-white text-lg font-bold group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{audit.title}</CardTitle>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-400">{audit.score}%</div>
                    <p className="text-[9px] uppercase font-black text-slate-300 tracking-tighter">Site Score</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    {format(parseISO(audit.date), 'dd MMM yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    {site?.name || 'Unknown Site'}
                  </div>
                </div>

                {audit.supervisorComment && (
                  <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                    <p className="text-[10px] uppercase font-black text-emerald-400 mb-1 flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> Official Feedback
                    </p>
                    <p className="text-xs text-slate-200 italic font-medium leading-relaxed">"{audit.supervisorComment}"</p>
                    {reviewer && <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wide">Reviewed by {reviewer.name}</p>}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    <Clock className="h-3 w-3 text-emerald-400" />
                    {audit.status}
                  </div>
                  <div className="flex gap-2">
                    {isSupervisor && audit.status === 'Pending Review' && (
                      <Button 
                        size="sm" 
                        className="bg-emerald-500 hover:bg-emerald-600 h-8 font-black uppercase text-[10px] px-4"
                        onClick={() => setReviewingAuditId(audit.id)}
                      >
                        Action
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-emerald-400 h-8 hover:bg-emerald-500/10 hover:text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                      View Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* REVIEW DIALOG */}
      <Dialog open={!!reviewingAuditId} onOpenChange={(o) => !o && setReviewingAuditId(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white uppercase font-black tracking-tight">Review Site Audit</DialogTitle>
            <DialogDescription className="text-slate-300 font-medium">The Senior Safety Supervisor is the higher authority for all EHS findings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label className="text-slate-100 font-bold uppercase text-xs tracking-widest">Supervisor Feedback / Instructions</Label>
               <Textarea 
                 className="bg-slate-800 border-slate-700 text-white min-h-[120px] focus:ring-emerald-500/20" 
                 placeholder="Enter validation notes or required actions..."
                 value={supervisorComment}
                 onChange={(e) => setSupervisorComment(e.target.value)}
               />
             </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="bg-transparent border-slate-700 text-slate-200" onClick={() => handleReviewAction('Rejected')}>
               <ThumbsDown className="mr-2 h-4 w-4" /> Reject Findings
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600 font-bold" onClick={() => handleReviewAction('Approved')}>
               <ThumbsUp className="mr-2 h-4 w-4" /> Approve Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredAudits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-200 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl">
          <ClipboardList className="h-16 w-16 mb-6 opacity-20 text-emerald-400" />
          <p className="text-xl font-black text-white uppercase tracking-widest">No audit records found</p>
          <p className="text-sm mt-1 font-medium opacity-80">Refine your search or submit a new walkthrough report.</p>
        </div>
      )}
    </div>
  );
}
