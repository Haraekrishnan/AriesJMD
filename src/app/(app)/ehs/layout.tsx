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
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ehsNavItems = [
  { href: '/ehs', icon: LayoutDashboard, label: 'Safety Overview' },
  { href: '/ehs/observations', icon: Eye, label: 'Safety Observations' },
  { href: '/ehs/audits', icon: ClipboardCheck, label: 'Audits & Inspections' },
  { href: '/ehs/incidents', icon: AlertTriangle, label: 'Incident Management' },
  { href: '/ehs/risk-assessments', icon: Zap, label: 'Risk Assessments' },
  { href: '/ehs/trainings', icon: Users, label: 'Safety Trainings' },
  { href: '/ehs/documents', icon: BookOpen, label: 'Safety Library' },
  { href: '/ehs/analytics', icon: BarChart3, label: 'EHS Analytics' },
  { href: '/ehs/support', icon: HelpCircle, label: 'Safety Support' },
];

export default function EhsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, can, markFeatureAsViewed } = useAuth();
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
    <div className="fixed inset-0 z-40 flex bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* EHS Side Navigation - LIGHT THEME */}
      <aside className="w-72 border-r border-slate-200 bg-slate-100 flex flex-col shrink-0 h-full shadow-lg">
        <div className="p-8 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-600/20">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-slate-900">EHS Portal</h2>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-bold">Safety Management</p>
            </div>
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-4 py-8">
          <nav className="space-y-2">
            {ehsNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group relative",
                    isActive 
                      ? "bg-white text-emerald-600 border border-slate-200 shadow-sm" 
                      : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                  )}>
                    {isActive && (
                      <div className="absolute left-0 w-1.5 h-6 bg-emerald-600 rounded-r-full" />
                    )}
                    <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 px-6 border-t border-slate-200">
           <Button asChild variant="ghost" className="w-full justify-start text-slate-500 hover:text-slate-900 hover:bg-white h-12 rounded-xl font-bold">
             <Link href="/dashboard">
               <ChevronLeft className="mr-3 h-4 w-4" />
               Exit Portal
             </Link>
           </Button>
        </div>

        <div className="p-8 bg-slate-200/50 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-emerald-600/30">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-slate-300 text-slate-700 font-bold">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate">{user?.name}</p>
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc] relative">
        <div className="p-10 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
