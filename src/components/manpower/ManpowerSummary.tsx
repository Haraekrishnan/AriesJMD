'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/hooks/use-app-context';
import StatCard from '@/components/dashboard/stat-card';
import { Users, UserCheck, UserX, Briefcase } from 'lucide-react';

export default function ManpowerSummary() {
    const { manpowerProfiles } = useAppContext();

    const summary = useMemo(() => {
        const total = manpowerProfiles.length;
        const working = manpowerProfiles.filter(p => p.status === 'Working').length;
        const onLeave = manpowerProfiles.filter(p => p.status === 'On Leave').length;
        const ex = manpowerProfiles.filter(p => p.status === 'Resigned' || p.status === 'Terminated').length;
        return { total, working, onLeave, ex };
    }, [manpowerProfiles]);

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
                title="Total Manpower"
                value={summary.total.toString()}
                icon={Users}
                description="Total number of profiles in the system"
            />
            <StatCard 
                title="Currently Working"
                value={summary.working.toString()}
                icon={UserCheck}
                description="Manpower actively on project sites"
            />
            <StatCard 
                title="On Leave"
                value={summary.onLeave.toString()}
                icon={UserX}
                description="Manpower currently on sick or annual leave"
            />
            <StatCard 
                title="Ex-Manpower"
                value={summary.ex.toString()}
                icon={Briefcase}
                description="Resigned or terminated manpower"
            />
        </div>
    );
}
