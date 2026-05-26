'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-provider';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  AlertTriangle, 
  BookOpen, 
  BarChart3, 
  Users, 
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ehsNavItems = [
  { href: '/ehs', icon: LayoutDashboard, label: 'Safety Overview' },
  { href: '/ehs/audits', icon: ClipboardCheck, label: 'Audits & Inspections' },
  { href: '/ehs/incidents', icon: AlertTriangle, label: 'Incident Management' },
  { href: '/ehs/risk-assessments', icon: Zap, label: 'Risk Assessments' },
  { href: '/ehs/trainings', icon: Users, label: 'Safety Trainings' },
  { href: '/ehs/documents', icon: BookOpen, label: 'Safety Library' },
  { href: '/ehs/analytics', icon: BarChart3, label: 'EHS Analytics' },
  { href: '/ehs/support', icon: HelpCircle, label: 'Safety Support' },
];

export default function EhsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) return null;

  if (!can.access_ehs_portal) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-[#0f172a] text-slate-200">
      {/* EHS Side Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-[#0f172a] flex flex-col shrink-0 h-full">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">EHS Portal</h2>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Safety Management</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-4 py-6">
          <nav className="space-y-1">
            {ehsNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group",
                    isActive 
                      ? "bg-emerald-500/10 text-emerald-400 border-l-4 border-emerald-500" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}>
                    <item.icon className={cn("h-5 w-5", isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300")} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800">
           <Button asChild variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800">
             <Link href="/dashboard">
               <ChevronLeft className="mr-2 h-4 w-4" />
               Exit Portal
             </Link>
           </Button>
        </div>

        <div className="p-6 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-emerald-500/20">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-slate-800 text-slate-200">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#1e293b] p-8">
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
