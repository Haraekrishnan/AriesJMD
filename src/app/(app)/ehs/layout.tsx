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
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ehsNavItems = [
  { href: '/ehs', icon: LayoutDashboard, label: 'Dashboard' },
  { 
    href: '/ehs/observations', 
    icon: Eye, 
    label: 'Safety Observations',
    subItems: [
        { href: '/ehs/observations?filter=all', label: 'All Observations' },
        { href: '/ehs/observations?filter=tasks', label: 'My Tasks' },
        { href: '/ehs/observations?filter=created', label: 'My Creations' },
        { href: '/ehs/observations?filter=review', label: 'Waiting for Review' },
    ]
  },
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
    <div className="fixed inset-0 z-40 flex bg-white text-slate-900 overflow-hidden font-sans">
      {/* EHS Side Navigation - EXECUTIVE LIGHT THEME */}
      <aside className="w-64 border-r border-slate-100 bg-[#F8FAFC] flex flex-col shrink-0 h-full">
        <div className="p-8 pb-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter text-slate-900">EHS Portal</h2>
              <p className="text-[9px] uppercase tracking-[0.2em] text-emerald-600 font-bold">Safety Management</p>
            </div>
          </Link>
        </div>
        
        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1">
            {ehsNavItems.map((item) => {
              const isActive = pathname === item.href || (item.subItems && item.subItems.some(s => pathname === s.href));
              return (
                <div key={item.href} className="space-y-1">
                    <Link href={item.href}>
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-tight transition-all duration-200 group relative",
                        isActive 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}>
                        {isActive && (
                        <div className="absolute left-0 w-1 h-5 bg-emerald-600 rounded-r-full" />
                        )}
                        <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-emerald-600" : "text-slate-400")} />
                        {item.label}
                    </div>
                    </Link>
                    
                    {isActive && item.subItems && (
                        <div className="ml-9 space-y-1 pr-2">
                            {item.subItems.map(sub => (
                                <Link key={sub.href} href={sub.href}>
                                    <div className="py-2 px-3 rounded-lg text-[11px] font-bold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors">
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

        <div className="mt-auto p-4 space-y-1">
            <Link href="/ehs/settings">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">
                    <Settings className="h-4 w-4" /> Settings
                </div>
            </Link>
            
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mx-2 mb-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-slate-50">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">{user?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{user?.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{user?.role}</p>
                    </div>
                </div>
            </div>

            <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-12 rounded-xl font-black uppercase text-[10px] tracking-widest px-8"
                onClick={logout}
            >
                <LogOut className="mr-3 h-4 w-4" /> Logout
            </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#F3F7FB]">
        <div className="flex-1 overflow-y-auto">
            <div className="animate-in fade-in duration-700 h-full">
            {children}
            </div>
        </div>
      </main>
    </div>
  );
}
