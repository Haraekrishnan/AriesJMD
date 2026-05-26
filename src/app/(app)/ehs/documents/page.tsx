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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Safety Library</h1>
        <p className="text-slate-400">Access organizational safety standards and regulatory documents.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, i) => (
          <Card key={i} className="bg-slate-900 border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-all">
            <CardHeader className="pb-2">
              <cat.icon className={cn("h-6 w-6 mb-2", cat.color)} />
              <CardTitle className="text-sm font-semibold text-white">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{cat.count} Documents</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center gap-4">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
             <Input placeholder="Search document library..." className="pl-10 bg-slate-800 border-slate-700 text-white" />
           </div>
           <Button variant="outline" className="bg-slate-800 border-slate-700 text-slate-300">
             <Filter className="mr-2 h-4 w-4" /> Filter
           </Button>
        </div>
        
        <div className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-black text-slate-500 bg-slate-900/50">
              <tr>
                <th className="px-6 py-4">Document Title</th>
                <th className="px-6 py-4">Ref Number</th>
                <th className="px-6 py-4">Version</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                { title: 'Emergency Response Plan - Site A', ref: 'ARIES-ERP-01', ver: '3.2', date: 'Oct 2024' },
                { title: 'Hot Work Permit System', ref: 'ARIES-SAF-05', ver: '2.0', date: 'Jan 2025' },
                { title: 'Confined Space Entry Protocol', ref: 'ARIES-SAF-12', ver: '1.4', date: 'Sep 2024' },
                { title: 'PPE Compliance Standard', ref: 'ARIES-POL-02', ver: '5.1', date: 'Dec 2024' },
                { title: 'Working at Heights Manual', ref: 'ARIES-TRN-08', ver: '4.0', date: 'Jan 2025' },
              ].map((doc, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-800 p-2 rounded group-hover:bg-emerald-500/20 transition-colors">
                        <FileText className="h-4 w-4 text-slate-400 group-hover:text-emerald-400" />
                      </div>
                      <span className="font-semibold text-slate-200">{doc.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{doc.ref}</td>
                  <td className="px-6 py-4"><Badge variant="outline" className="text-[10px]">{doc.ver}</Badge></td>
                  <td className="px-6 py-4 text-slate-400">{doc.date}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                      <Download className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-900/50 border-t border-slate-800 text-center">
           <p className="text-xs text-slate-500">End of records. Contact Document Control for non-digital archives.</p>
        </div>
      </div>
    </div>
  );
}
