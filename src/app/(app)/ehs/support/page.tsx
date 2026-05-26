'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, Phone, Mail, FileQuestion, Book, ShieldCheck, Send, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function EhsSupportPage() {
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
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({ title: 'Support Case Opened', description: 'Your request has been received and assigned to a safety officer.' });
    setIsSubmitting(false);
    setFormData({ category: 'audit', urgency: 'normal', description: '' });
  };

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Safety Support Center</h1>
        <p className="text-slate-400">Need help with compliance, reporting, or technical safety questions? Our team is here to assist.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider">Direct Assistance</h3>
          {[
            { icon: Phone, label: 'Safety Hotline', value: '+91 966 209 5558', desc: 'Available 24/7 for emergencies.' },
            { icon: Mail, label: 'Support Email', value: 'safety.support@ariesmar.com', desc: 'Queries answered in 2 hours.' },
            { icon: MessageCircle, label: 'Safety Chat', value: 'Live Messenger', desc: 'Chat with an officer now.' },
          ].map((item, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 flex gap-4">
                <div className="bg-slate-800 p-3 rounded-xl">
                  <item.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{item.value}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="md:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-xl">Open Support Case</CardTitle>
            <CardDescription className="text-slate-500">Document a question or request a safety technical review.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">Subject Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select topic..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="audit">Audit/Inspection Query</SelectItem>
                      <SelectItem value="incident">Incident Reporting Help</SelectItem>
                      <SelectItem value="ra">Risk Assessment Review</SelectItem>
                      <SelectItem value="tech">Technical Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Urgency Level</Label>
                  <Select value={formData.urgency} onValueChange={(val) => setFormData(prev => ({ ...prev, urgency: val }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Normal" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="low">Low - Routine Query</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High - Urgent Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-400">Detailed Description</Label>
                <Textarea 
                  placeholder="Please provide as much detail as possible..." 
                  className="bg-slate-800 border-slate-700 text-white min-h-[150px]" 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8">
                  <Send className="mr-2 h-4 w-4" /> {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-900/30 rounded-2xl border border-slate-800 p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
             <Book className="h-6 w-6 text-indigo-400" /> Comprehensive Help Center
          </h3>
          <p className="text-slate-400">Browse through hundreds of safety guides, video tutorials, and frequently asked questions in our self-service portal.</p>
          <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
             Open Knowledge Base
          </Button>
        </div>
        <div className="w-full md:w-1/3 grid grid-cols-2 gap-4">
           {[FileQuestion, ShieldCheck, Zap, HelpCircle].map((Icon, i) => (
             <div key={i} className="bg-slate-800 p-6 rounded-2xl flex items-center justify-center">
                <Icon className="h-8 w-8 text-slate-600" />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
