
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Book, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import StatCard from '../dashboard/stat-card';
import type { LogbookStatus, ManpowerProfile } from '@/lib/types';

export default function LogbookSummary({ profiles }: { profiles: ManpowerProfile[] }) {
  
  const statusCounts = useMemo(() => {
    const counts: Record<LogbookStatus, number> = {
      'Pending': 0,
      'Requested': 0,
      'Received': 0,
      'Not Received': 0,
      'Sent back as requested': 0,
    };
    
    profiles.forEach(profile => {
        const status = profile.logbook?.status || 'Pending';
        if (counts[status] !== undefined) {
            counts[status]++;
        } else if (status === 'Sent back as requested') {
            // Count "Sent back" as "Pending" for this summary view
            counts['Pending']++;
        }
    });
    
    return counts;
  }, [profiles]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
       <StatCard 
          title="Received" 
          value={statusCounts.Received} 
          icon={CheckCircle}
          description="Logbooks currently with the company"
          className="border-green-500"
        />
        <StatCard 
          title="Not Received" 
          value={statusCounts['Not Received']}
          icon={XCircle} 
          description="Logbooks not yet submitted"
          className="border-red-500"
        />
        <StatCard 
          title="Requested" 
          value={statusCounts.Requested} 
          icon={Book} 
          description="Logbooks requested by supervisors"
          className="border-blue-500"
        />
        <StatCard 
          title="Pending" 
          value={statusCounts.Pending + statusCounts['Sent back as requested']} 
          icon={AlertCircle}
          description="Logbooks with no status recorded"
          className="border-yellow-500"
        />
    </div>
  );
}
