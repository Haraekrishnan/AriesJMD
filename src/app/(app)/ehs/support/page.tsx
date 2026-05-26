'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, Phone, Mail, FileQuestion, Book, ShieldCheck, Send, Zap, Edit, Check, X, Clock, MessageSquare, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function EhsSupportPage() {
  const { user, users } = useAuth();
  const { contactInfo, supportTickets, addSupportTicket, updateContactInfo, updateTicketStatus, addTicketComment } = useEhs();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'audit',
    urgency: 'normal',
    description: '',
  });

  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isManagement = user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';

  const myTickets = useMemo(() => {
    return supportTickets.filter(t => t.requesterId === user?.id).sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [supportTickets, user]);

  const ticketsToReview = useMemo(() => {
    if (!isManagement) return [];
    return supportTickets.sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
  }, [supportTickets, isManagement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast({ title: 'Description Required', description: 'Please provide details for your support request.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    await addSupportTicket(formData);
    
    toast({ 
      title: 'Support Case Opened', 
      description: 'Your request has been received and assigned to the Senior Safety Supervisor.' 
    });
    setIsSubmitting(false);
    setFormData({ category: 'audit', urgency: 'normal', description: '' });
  };

  const handleStartEdit = (key: string, value: string) => {
    setEditingContact(key);
    setEditValue(value);
  };

  const handleSaveContact = () => {
    if (!editingContact) return;
    updateContactInfo({ [editingContact]: editValue });
    setEditingContact(null);
  };

  return (
    <div className="space-y-10">
      <div className="text-center space-y-6">
        <div className="bg-emerald-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
           <HelpCircle className="h-10 w-10 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white tracking-tighter">Safety Support Center</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Technical safety assistance, compliance guidance, and reporting help.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Immediate Contact</h3>
          
          <ContactCard 
            icon={Phone} 
            label="Safety Hotline" 
            value={contactInfo.hotline} 
            desc="Available 24/7 for urgent reports."
            isEditable={isManagement}
            onEdit={() => handleStartEdit('hotline', contactInfo.hotline)}
            isEditing={editingContact === 'hotline'}
            editValue={editValue}
            onValueChange={setEditValue}
            onSave={handleSaveContact}
            onCancel={() => setEditingContact(null)}
          />

          <ContactCard 
            icon={Mail} 
            label="Compliance Office" 
            value={contactInfo.email} 
            desc="SOP & Document queries."
            isEditable={isManagement}
            onEdit={() => handleStartEdit('email', contactInfo.email)}
            isEditing={editingContact === 'email'}
            editValue={editValue}
            onValueChange={setEditValue}
            onSave={handleSaveContact}
            onCancel={() => setEditingContact(null)}
          />

          <ContactCard 
            icon={MessageCircle} 
            label="Portal Support" 
            value={contactInfo.liveChat} 
            desc="Real-time technical assistance."
            isEditable={isManagement}
            onEdit={() => handleStartEdit('liveChat', contactInfo.liveChat)}
            isEditing={editingContact === 'liveChat'}
            editValue={editValue}
            onValueChange={setEditValue}
            onSave={handleSaveContact}
            onCancel={() => setEditingContact(null)}
          />
        </div>

        <div className="lg:col-span-2 space-y-10">
          <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden relative">
            <CardHeader className="p-10 pb-4 border-b border-slate-800/50">
              <CardTitle className="text-white text-3xl font-black tracking-tight">Open Support Ticket</CardTitle>
              <CardDescription className="text-slate-500 text-base mt-2">Request a technical safety review or get help with a portal feature.</CardDescription>
            </CardHeader>
            <CardContent className="p-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Query Category</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                      <SelectTrigger className="h-14 bg-slate-800 border-slate-700 text-white rounded-2xl focus:ring-emerald-500/20">
                        <SelectValue placeholder="Select topic..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="Audit/Inspection Query">Audit/Inspection Query</SelectItem>
                        <SelectItem value="Incident Reporting Help">Incident Reporting Help</SelectItem>
                        <SelectItem value="Risk Assessment Review">Risk Assessment Review</SelectItem>
                        <SelectItem value="Portal Technical Issue">Portal Technical Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Urgency Profile</Label>
                    <Select value={formData.urgency} onValueChange={(val) => setFormData(prev => ({ ...prev, urgency: val }))}>
                      <SelectTrigger className="h-14 bg-slate-800 border-slate-700 text-white rounded-2xl focus:ring-emerald-500/20">
                        <SelectValue placeholder="Normal" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                        <SelectItem value="Low - Routine Query">Low - Routine Query</SelectItem>
                        <SelectItem value="Normal - 24hr Response">Normal - 24hr Response</SelectItem>
                        <SelectItem value="High - Action Required">High - Action Required</SelectItem>
                        <SelectItem value="Critical - Immediate Assist">Critical - Immediate Assist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-slate-400 font-bold text-xs uppercase tracking-widest">Detailed Request Description</Label>
                  <Textarea 
                    placeholder="Please provide specific details including Site, Date, and Case IDs if applicable..." 
                    className="bg-slate-800 border-slate-700 text-white min-h-[200px] rounded-2xl focus:ring-emerald-500/20 text-base p-6" 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] h-16 px-10 rounded-2xl shadow-xl shadow-emerald-500/20">
                    <Send className="mr-3 h-5 w-5" /> {isSubmitting ? 'Transmitting...' : 'Send Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* MANAGEMENT VIEW: TICKETS FOR REVIEW */}
          {isManagement && ticketsToReview.length > 0 && (
            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="bg-slate-800/40 border-b border-slate-800 p-6">
                    <CardTitle className="text-emerald-400 text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" /> Manage Support Tickets (Higher Official View)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                        <div className="divide-y divide-slate-800">
                            {ticketsToReview.map(ticket => (
                                <TicketReviewItem key={ticket.id} ticket={ticket} users={users} onStatusChange={updateTicketStatus} onAddComment={addTicketComment} />
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
          )}

          {/* USER VIEW: MY TICKETS */}
          {!isManagement && myTickets.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">My Support History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myTickets.map(ticket => (
                    <div key={ticket.id} className="p-4 border border-slate-800 rounded-xl bg-slate-800/20 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-200">{ticket.category}</p>
                        <p className="text-xs text-slate-500">{format(parseISO(ticket.createdAt), 'PPP')}</p>
                      </div>
                      <Badge variant={ticket.status === 'Open' ? 'destructive' : ticket.status === 'Closed' ? 'success' : 'default'}>
                        {ticket.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="bg-slate-900/30 rounded-[3rem] border border-slate-800 p-12 flex flex-col md:flex-row items-center gap-12 shadow-inner">
        <div className="flex-1 space-y-6">
          <h3 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter">
             <Book className="h-8 w-8 text-indigo-400" /> Organizational Knowledge Base
          </h3>
          <p className="text-slate-400 text-lg leading-relaxed">Browse through safety guides, video tutorials, and technical standards in our self-service portal. Find answers to common compliance questions instantly.</p>
          <Button variant="outline" className="h-14 px-8 bg-slate-800 border-slate-700 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 hover:text-white transition-colors uppercase tracking-widest text-xs">
             Open Knowledge Library
          </Button>
        </div>
        <div className="w-full md:w-1/3 grid grid-cols-2 gap-4">
           {[FileQuestion, ShieldCheck, Zap, HelpCircle].map((Icon, i) => (
             <div key={i} className="bg-slate-800 p-8 rounded-[2rem] flex items-center justify-center shadow-lg hover:bg-slate-700 transition-colors">
                <Icon className="h-10 w-10 text-slate-600" />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}

function ContactCard({ icon: Icon, label, value, desc, isEditable, onEdit, isEditing, editValue, onValueChange, onSave, onCancel }: any) {
  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/20 transition-all duration-300 shadow-xl group">
      <CardContent className="p-6 flex gap-6 relative">
        <div className="bg-slate-800 p-4 rounded-2xl group-hover:scale-110 transition-transform">
          <Icon className="h-6 w-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
          {isEditing ? (
            <div className="mt-2 flex gap-2">
              <Input 
                value={editValue} 
                onChange={(e) => onValueChange(e.target.value)}
                className="h-8 bg-slate-800 border-slate-700 text-white text-sm"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400" onClick={onSave}><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500" onClick={onCancel}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-white mt-1">{value}</p>
              {isEditable && (
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onEdit}>
                  <Edit className="h-3.5 w-3.5 text-slate-500" />
                </Button>
              )}
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-1 font-medium">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketReviewItem({ ticket, users, onStatusChange, onAddComment }: any) {
    const requester = users.find((u: any) => u.id === ticket.requesterId);
    const [comment, setComment] = useState('');
    const comments = ticket.comments ? Object.values(ticket.comments) : [];

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-800">
                        <AvatarImage src={requester?.avatar} />
                        <AvatarFallback>{requester?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold text-white">{requester?.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{ticket.category} &middot; {ticket.urgency}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant={ticket.status === 'Open' ? 'destructive' : ticket.status === 'Closed' ? 'success' : 'default'}>
                        {ticket.status}
                    </Badge>
                    <span className="text-[10px] text-slate-600 font-bold">{formatDistanceToNow(parseISO(ticket.createdAt), { addSuffix: true })}</span>
                </div>
            </div>

            <p className="text-slate-300 text-sm p-4 bg-slate-800/40 rounded-2xl border border-slate-800/50 whitespace-pre-wrap">{ticket.description}</p>

            {comments.length > 0 && (
                <div className="space-y-3 pl-12">
                    {comments.map((c: any, i: number) => {
                        const cAuthor = users.find((u: any) => u.id === c.userId);
                        return (
                            <div key={i} className="flex gap-3">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={cAuthor?.avatar} />
                                    <AvatarFallback>{cAuthor?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 bg-slate-800/20 p-3 rounded-xl border border-slate-800/40">
                                    <p className="text-[10px] font-bold text-slate-500">{cAuthor?.name} &middot; {formatDistanceToNow(parseISO(c.date), { addSuffix: true })}</p>
                                    <p className="text-xs text-slate-300 mt-1">{c.text}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-4 pt-2">
                <div className="flex-1 relative">
                    <Input 
                        placeholder="Type reply to user..." 
                        className="bg-slate-800 border-slate-700 text-white rounded-xl h-12 pr-12"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-1 top-1 text-emerald-400" 
                        disabled={!comment.trim()}
                        onClick={() => { onAddComment(ticket.id, comment); setComment(''); }}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <Select value={ticket.status} onValueChange={(val) => onStatusChange(ticket.id, val)}>
                    <SelectTrigger className="w-[140px] h-12 bg-slate-800 border-slate-700 text-white rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
