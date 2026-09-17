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
  ClipboardCheck,
  Zap,
  Eye,
  Settings,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ehsNavItems = [
  { href: '/ehs', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/ehs/observations', icon: ShieldCheck, label: 'Safety Observations' },
  { href: '/ehs/audits', icon: ClipboardCheck, label: 'Audits & Inspections' },
  { href: '/ehs/incidents', icon: AlertTriangle, label: 'Incident Management' },
  { href: '/ehs/risk-assessments', icon: Zap, label: 'Risk Assessments' },
  { href: '/ehs/trainings', icon: Users, label: 'Safety Trainings' },
  { href: '/ehs/documents', icon: BookOpen, label: 'Safety Library' },
  { href: '/ehs/analytics', icon: BarChart3, label: 'EHS Analytics' },
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
    <div className="fixed inset-0 z-50 flex bg-[#F3F7FB] text-slate-900 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* EHS Side Navigation - DEEP NAVY THEME */}
      <aside className="w-[280px] bg-[#0F172A] flex flex-col shrink-0 h-full text-white shadow-2xl">
        <div className="p-8 pb-10">
          <Link href="/dashboard" className="flex items-center gap-4 group">
            <div className="bg-[#2563EB] p-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter text-white leading-none">EHS PORTAL</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-bold mt-1.5 opacity-80">A SAFER TOMORROW</p>
            </div>
          </Link>
        </div>
        
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1">
            {ehsNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-4 px-5 py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200 group relative overflow-hidden mb-1",
                    isActive 
                      ? "bg-[#2563EB] text-white shadow-xl shadow-blue-600/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}>
                    <item.icon className={cn("h-4.5 w-4.5 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-500")} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="mt-auto p-6 space-y-4">
            <Link href="/ehs/settings">
                <div className="flex items-center gap-4 px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all">
                    <Settings className="h-4.5 w-4.5 text-slate-500" /> Settings
                </div>
            </Link>
            
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-white/10">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-blue-600 text-white font-black text-xs">{user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 rounded-full border-2 border-[#0F172A]" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{user?.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate mt-0.5">{user?.role}</p>
                </div>
            </div>

            <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest px-5 transition-all"
                onClick={logout}
            >
                <LogOut className="mr-4 h-4 w-4" /> Logout
            </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#F3F7FB]">
        <div className="flex-1 overflow-y-auto visible-scrollbar">
            <div className="animate-in fade-in slide-in-from-right-2 duration-700 h-full">
            {children}
            </div>
        </div>
      </main>
    </div>
  );
}
