'use client';

import React, { useEffect } from 'react';
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
  ChevronLeft,
  ClipboardCheck,
  Zap,
  Eye,
  Settings,
  LogOut,
  Compass
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ehsNavItems = [
  { href: '/ehs', icon: LayoutDashboard, label: 'Control Center' },
  { 
    href: '/ehs/observations', 
    icon: Eye, 
    label: 'Observations (CAPA)',
    subItems: [
        { href: '/ehs/observations?filter=all', label: 'Safety Registry' },
        { href: '/ehs/observations?filter=tasks', label: 'Operational Tasks' },
        { href: '/ehs/observations?filter=review', label: 'Verification Queue' },
    ]
  },
  { href: '/ehs/audits', icon: ClipboardCheck, label: 'Audit Log' },
  { href: '/ehs/incidents', icon: AlertTriangle, label: 'Incident Desk' },
  { href: '/ehs/risk-assessments', icon: Zap, label: 'Risk Indices' },
  { href: '/ehs/trainings', icon: Users, label: 'Workforce Competency' },
  { href: '/ehs/documents', icon: BookOpen, label: 'Compliance Library' },
  { href: '/ehs/analytics', icon: BarChart3, label: 'Safety Intelligence' },
  { href: '/ehs/support', icon: HelpCircle, label: 'Safety Support' },
];

export default function EhsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, can, markFeatureAsViewed, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.viewedFeatures?.ehs) {
        markFeatureAsViewed('ehs');
    }
  }, [user, markFeatureAsViewed]);

  if (loading) return null;

  if (!can.access_ehs_portal) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-white text-slate-900 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* EHS Side Navigation - EXECUTIVE LIGHT THEME */}
      <aside className="w-[280px] border-r border-slate-100 bg-[#F8FAFC] flex flex-col shrink-0 h-full">
        <div className="p-8 pb-10">
          <Link href="/dashboard" className="flex items-center gap-4 group">
            <div className="bg-[#2563EB] p-3 rounded-[1.25rem] shadow-xl shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500 ring-4 ring-blue-50">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter text-[#0F172A] leading-none">EHS Portal</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#2563EB] font-black mt-1.5">Mission Control</p>
            </div>
          </Link>
        </div>
        
        <ScrollArea className="flex-1 px-5">
          <nav className="space-y-1.5">
            {ehsNavItems.map((item) => {
              const isActive = pathname === item.href || (item.subItems && item.subItems.some(s => pathname === s.href));
              return (
                <div key={item.href} className="space-y-1">
                    <Link href={item.href}>
                    <div className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group relative overflow-hidden",
                        isActive 
                        ? "bg-white text-[#2563EB] shadow-md shadow-blue-500/5 ring-1 ring-slate-100" 
                        : "text-slate-500 hover:bg-slate-200/50 hover:text-[#0F172A]"
                    )}>
                        {isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-[#2563EB] rounded-r-full" />
                        )}
                        <item.icon className={cn("h-4.5 w-4.5 transition-transform group-hover:scale-110", isActive ? "text-[#2563EB]" : "text-slate-400")} />
                        {item.label}
                    </div>
                    </Link>
                    
                    {isActive && item.subItems && (
                        <div className="ml-11 space-y-1 pr-3 pt-1 border-l-2 border-slate-100">
                            {item.subItems.map(sub => (
                                <Link key={sub.href} href={sub.href}>
                                    <div className={cn(
                                        "py-2.5 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                                        pathname === sub.href ? "text-[#2563EB] bg-blue-50/50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                                    )}>
                                        {sub.label}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="mt-auto p-6 space-y-1.5">
            <Link href="/ehs/settings">
                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200/50 hover:text-[#0F172A] transition-all">
                    <Settings className="h-4.5 w-4.5 text-slate-400" /> Settings & System
                </div>
            </Link>
            
            <div className="p-5 bg-white rounded-2xl border-2 border-slate-100 shadow-sm mx-1 mb-4 flex items-center gap-4">
                <Avatar className="h-11 w-11 border-2 border-slate-100 shadow-inner">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-blue-50 text-[#2563EB] font-black text-xs">{user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[#0F172A] truncate uppercase tracking-tight">{user?.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">{user?.role}</p>
                </div>
            </div>

            <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-14 rounded-2xl font-black uppercase text-[11px] tracking-widest px-8 transition-all active:scale-95"
                onClick={logout}
            >
                <LogOut className="mr-4 h-5 w-5" /> Terminate Session
            </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#F3F7FB]">
        <div className="flex-1 overflow-y-auto visible-scrollbar">
            <div className="animate-in fade-in slide-in-from-right-4 duration-1000 h-full">
            {children}
            </div>
        </div>
      </main>
    </div>
  );
}
