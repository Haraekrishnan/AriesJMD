'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, FileText, Download, Filter, FileCheck, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'Policies & Standards', count: 12, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  { name: 'Safety Procedures', count: 45, icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Training Manuals', count: 8, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { name: 'Forms & Templates', count: 22, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
];

export default function EhsDocumentsPage() {
  return (
    <div className="space-y-10 text-slate-900">
      <div className="text-left">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Safety Library</h1>
        <p className="text-slate-600 text-lg mt-2 font-medium">Access organizational safety standards and regulatory documents.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, i) => (
          <Card key={i} className="bg-white border-slate-200 hover:shadow-md cursor-pointer transition-all duration-300 group rounded-3xl">
            <CardHeader className="pb-4">
              <div className={cn("p-4 rounded-2xl w-fit group-hover:scale-110 transition-transform", cat.bg, cat.color)}>
                <cat.icon className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg font-black text-slate-900 mt-4 uppercase tracking-tight">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{cat.count} Indexed Files</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-[2.5rem]">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50">
           <div className="relative flex-1 w-full max-w-xl">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
             <Input placeholder="Search document library by title or ref..." className="pl-12 h-14 bg-white border-slate-200 text-slate-900 rounded-2xl font-bold focus-visible:ring-emerald-600/20 shadow-sm" />
           </div>
           <Button variant="outline" className="h-14 px-8 border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest shadow-sm">
             <Filter className="mr-2 h-4 w-4" /> Filter Library
           </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase font-black text-slate-400 bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-5">Document Title</th>
                <th className="px-8 py-5">Ref Number</th>
                <th className="px-8 py-5">Version</th>
                <th className="px-8 py-5">Last Validated</th>
                <th className="px-8 py-5 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { title: 'Emergency Response Plan - Site A', ref: 'ARIES-ERP-01', ver: '3.2', date: 'Oct 2024' },
                { title: 'Hot Work Permit System', ref: 'ARIES-SAF-05', ver: '2.0', date: 'Jan 2025' },
                { title: 'Confined Space Entry Protocol', ref: 'ARIES-SAF-12', ver: '1.4', date: 'Sep 2024' },
                { title: 'PPE Compliance Standard', ref: 'ARIES-POL-02', ver: '5.1', date: 'Dec 2024' },
                { title: 'Working at Heights Manual', ref: 'ARIES-TRN-08', ver: '4.0', date: 'Jan 2025' },
              ].map((doc, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-2.5 rounded-xl group-hover:bg-emerald-100 transition-colors">
                        <FileText className="h-5 w-5 text-slate-400 group-hover:text-emerald-600" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm transition-colors group-hover:text-emerald-600">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-500 font-mono text-xs tracking-wider">{doc.ref}</td>
                  <td className="px-8 py-6">
                    <Badge variant="outline" className="text-[10px] font-black border-slate-200 bg-white text-slate-600 px-3 py-0.5">
                      v{doc.ver}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 text-slate-500 text-xs font-bold uppercase">{doc.date}</td>
                  <td className="px-8 py-6 text-right">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full h-10 w-10">
                      <Download className="h-5 w-5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-10 bg-slate-50/50 text-center border-t border-slate-100">
           <p className="text-xs text-slate-400 font-black uppercase tracking-[0.2em]">End of indexed records</p>
        </div>
      </Card>
    </div>
  );
}
