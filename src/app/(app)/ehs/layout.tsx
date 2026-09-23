'use client';
import React, { useEffect, useState } from 'react';
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
  LogOut,
  ShieldAlert,
  ArrowLeft,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import './ehs.css';
import { ehsEntryDestination } from '@/lib/capa-workflow';
import { useEhs } from '@/contexts/ehs-provider';
const items = [
  { href: '/ehs', icon: LayoutDashboard, label: 'Dashboard' },
  {
    href: '/ehs/observations',
    icon: ShieldCheck,
    label: 'Safety observations',
  },
  { href: '/ehs/audits', icon: ClipboardCheck, label: 'Audits & inspections' },
  { href: '/ehs/incidents', icon: AlertTriangle, label: 'Incident management' },
  { href: '/ehs/risk-assessments', icon: Zap, label: 'Risk assessments' },
  { href: '/ehs/trainings', icon: Users, label: 'Safety trainings' },
  { href: '/ehs/documents', icon: BookOpen, label: 'Safety library' },
  { href: '/ehs/analytics', icon: BarChart3, label: 'EHS analytics' },
  { href: '/ehs/support', icon: HelpCircle, label: 'Safety support' },
];
export default function EhsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, can, markFeatureAsViewed, logout } = useAuth();
  const { observationActionCount, observationsLoaded } = useEhs();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (user && !user.viewedFeatures?.ehs) markFeatureAsViewed('ehs');
  }, [user, markFeatureAsViewed]);
  useEffect(() => {
    if (!loading && !can.access_ehs_portal) router.replace('/dashboard');
  }, [loading, can.access_ehs_portal, router]);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (loading || !user || !can.access_ehs_portal || !observationsLoaded || pathname !== '/ehs') return;
    if (new URLSearchParams(window.location.search).get('entry') !== 'notifications') return;
    router.replace(ehsEntryDestination(observationActionCount));
  }, [loading, user, can.access_ehs_portal, observationsLoaded, pathname, observationActionCount, router]);
  if (loading || !can.access_ehs_portal) return null;
  const navigation = (
    <div className="flex h-full flex-col bg-[#101d35] text-slate-300">
      <Link href="/ehs" className="flex items-center gap-3 px-6 py-7">
        <span className="rounded-xl bg-blue-600 p-2.5 text-white">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <span>
          <strong className="block text-lg tracking-tight text-white">
            EHS PORTAL
          </strong>
          <span className="mt-1 block text-[9px] font-semibold tracking-[0.22em] text-blue-300">
            A SAFER TOMORROW
          </span>
        </span>
      </Link>
      <nav
        aria-label="EHS navigation"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
      >
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/ehs' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-medium transition-colors focus-visible:outline-blue-300',
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.href === '/ehs/observations' && observationActionCount > 0 && <span aria-label={`${observationActionCount} observations need your action`} className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">{observationActionCount}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-white/10 p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg border border-blue-300/30 bg-blue-500/15 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500/30"
          title="Return to the main workspace without signing out"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>
            Exit portal
            <span className="block text-xs font-normal text-slate-400">
              Return to main workspace
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-blue-600 text-white">
              {user?.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {user?.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start gap-3 text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
  return (
    <div className="ehs-portal fixed inset-0 z-50 flex overflow-hidden bg-[#F5F7FB] font-sans text-slate-900">
      <aside className="hidden h-full w-[248px] shrink-0 md:block">
        {navigation}
      </aside>
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b bg-white px-4 py-3 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Open EHS navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[280px] border-none bg-[#101d35] p-0 text-white"
            >
              <SheetTitle className="sr-only">EHS navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Navigate safety modules.
              </SheetDescription>
              {navigation}
            </SheetContent>
          </Sheet>
          <span className="font-semibold">EHS Portal</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
