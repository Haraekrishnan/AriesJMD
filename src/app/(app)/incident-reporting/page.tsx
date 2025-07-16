'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import NewIncidentReportDialog from '@/components/incident-reporting/NewIncidentReportDialog';
import IncidentListTable from '@/components/incident-reporting/IncidentListTable';

export default function IncidentReportingPage() {
    const { user, incidentReports } = useAppContext();
    const [isNewReportOpen, setIsNewReportOpen] = useState(false);
    
    const visibleIncidents = useMemo(() => {
        if (!user) return [];
        
        return incidentReports.filter(i => {
            const isParticipant = i.reporterId === user.id || (i.reportedToUserIds || []).includes(user.id);
            if (i.isPublished || isParticipant) {
                return true;
            }
            return false;
        }).sort((a,b) => new Date(b.reportTime).getTime() - new Date(a.reportTime).getTime());
    }, [user, incidentReports]);

    
    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Incident Reporting</h1>
                    <p className="text-muted-foreground">Report new incidents and track your submissions.</p>
                </div>
                <Button onClick={() => setIsNewReportOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Report New Incident
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Incident Log</CardTitle>
                    <CardDescription>A list of all incidents you have access to.</CardDescription>
                </CardHeader>
                <CardContent>
                    <IncidentListTable incidents={visibleIncidents} />
                </CardContent>
            </Card>
            <NewIncidentReportDialog isOpen={isNewReportOpen} setIsOpen={setIsNewReportOpen} />
        </div>
    );
}
