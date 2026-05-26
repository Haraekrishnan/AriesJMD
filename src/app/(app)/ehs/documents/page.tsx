'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, FileText, Download, Filter, FileCheck, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'Policies & Standards', count: 12, icon: ShieldAlert, color: 'text-rose-400' },
  { name: 'Safety Procedures', count: 45, icon: FileCheck, color: 'text-emerald-400' },
  { name: 'Training Manuals', count: 8, icon: BookOpen, color: 'text-indigo-400' },
  { name: 'Forms & Templates', count: 22, icon: FileText, color: 'text-amber-400' },
];

export default function EhsDocumentsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight">Safety Library</h1>
        <p className="text-slate-400 text-lg mt-2">Access organizational safety standards and regulatory documents.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700 hover:shadow-xl cursor-pointer transition-all duration-300 group">
            <CardHeader className="pb-4">
              <div className={cn("p-3 rounded-2xl bg-slate-800/50 w-fit group-hover:scale-110 transition-transform", cat.color)}>
                <cat.icon className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg font-bold text-white mt-4">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{cat.count} Documents</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900/40 border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-800/60 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/20">
           <div className="relative flex-1 w-full max-w-xl">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
             <Input placeholder="Search document library..." className="pl-12 h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" />
           </div>
           <Button variant="outline" className="h-12 px-6 bg-slate-800/50 border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-colors">
             <Filter className="mr-2 h-4 w-4" /> Advanced Filter
           </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] uppercase font-black text-slate-500 bg-slate-900/80 border-b border-slate-800">
                <th className="px-8 py-5">Document Title</th>
                <th className="px-8 py-5">Ref Number</th>
                <th className="px-8 py-5">Version</th>
                <th className="px-8 py-5">Last Updated</th>
                <th className="px-8 py-5 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {[
                { title: 'Emergency Response Plan - Site A', ref: 'ARIES-ERP-01', ver: '3.2', date: 'Oct 2024' },
                { title: 'Hot Work Permit System', ref: 'ARIES-SAF-05', ver: '2.0', date: 'Jan 2025' },
                { title: 'Confined Space Entry Protocol', ref: 'ARIES-SAF-12', ver: '1.4', date: 'Sep 2024' },
                { title: 'PPE Compliance Standard', ref: 'ARIES-POL-02', ver: '5.1', date: 'Dec 2024' },
                { title: 'Working at Heights Manual', ref: 'ARIES-TRN-08', ver: '4.0', date: 'Jan 2025' },
              ].map((doc, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-800 p-2.5 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                        <FileText className="h-5 w-5 text-slate-400 group-hover:text-emerald-400" />
                      </div>
                      <span className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-slate-500 font-mono text-xs tracking-wider">{doc.ref}</td>
                  <td className="px-8 py-6">
                    <Badge variant="outline" className="text-[10px] font-black border-slate-700 bg-slate-800/30 text-slate-400 px-2 py-0.5">
                      v{doc.ver}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 text-slate-400 text-xs font-medium">{doc.date}</td>
                  <td className="px-8 py-6 text-right">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full h-10 w-10">
                      <Download className="h-5 w-5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 bg-slate-900/50 text-center border-t border-slate-800/60">
           <p className="text-xs text-slate-500 font-medium">End of records. Contact Document Control for access to physical safety archives.</p>
        </div>
      </Card>
    </div>
  );
}
