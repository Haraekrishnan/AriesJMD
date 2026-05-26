'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, Phone, Mail, FileQuestion, Book, ShieldCheck, Send, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function EhsSupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'audit',
    urgency: 'normal',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast({ title: 'Description Required', description: 'Please provide details for your support request.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call - in real app would push to ehs/support in RTDB
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({ 
      title: 'Support Case Opened', 
      description: 'Your request has been received and assigned to a safety officer.' 
    });
    setIsSubmitting(false);
    setFormData({ category: 'audit', urgency: 'normal', description: '' });
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
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
          {[
            { icon: Phone, label: 'Safety Hotline', value: '+91 966 209 5558', desc: 'Available 24/7 for urgent reports.' },
            { icon: Mail, label: 'Compliance Office', value: 'safety.hq@ariesmar.com', desc: 'SOP & Document queries.' },
            { icon: MessageCircle, label: 'Portal Support', value: 'EHS Live Chat', desc: 'Real-time technical assistance.' },
          ].map((item, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800 hover:border-emerald-500/20 transition-all duration-300 shadow-xl group">
              <CardContent className="p-6 flex gap-6">
                <div className="bg-slate-800 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                  <p className="text-lg font-bold text-white mt-1">{item.value}</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 shadow-2xl overflow-hidden relative">
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
                      <SelectItem value="audit">Audit/Inspection Query</SelectItem>
                      <SelectItem value="incident">Incident Reporting Help</SelectItem>
                      <SelectItem value="ra">Risk Assessment Review</SelectItem>
                      <SelectItem value="tech">Portal Technical Issue</SelectItem>
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
                      <SelectItem value="low">Low - Routine Query</SelectItem>
                      <SelectItem value="normal">Normal - 24hr Response</SelectItem>
                      <SelectItem value="high">High - Action Required</SelectItem>
                      <SelectItem value="critical">Critical - Immediate Assist</SelectItem>
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
          {/* Decorative background glow */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        </Card>
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
