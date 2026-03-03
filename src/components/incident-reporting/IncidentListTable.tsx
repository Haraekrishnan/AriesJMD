
'use client';
import { useState, useMemo } from 'react';
import type { IncidentReport, IncidentStatus } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';
import { format } from 'date-fns';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Eye } from 'lucide-react';
import EditIncidentReportDialog from './EditIncidentReportDialog';
import { cn } from '@/lib/utils';

interface IncidentListTableProps {
  incidents: IncidentReport[];
}

const statusVariant: { [key in IncidentStatus]: "default" | "secondary" | "destructive" | "outline" } = {
    'New': 'destructive',
    'Under Investigation': 'default',
    'Action Pending': 'outline',
    'Resolved': 'secondary',
    'Closed': 'secondary',
}

export default function IncidentListTable({ incidents }: IncidentListTableProps) {
    const { user, users, projects, markIncidentAsViewed } = useAppContext();
    const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
    
    const handleViewClick = (incident: IncidentReport) => {
        if(user) markIncidentAsViewed(incident.id);
        setSelectedIncidentId(incident.id);
    };
    
    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'N/A';

    if (incidents.length === 0) {
        return (
            <Card className="flex items-center justify-center h-48 border-dashed">
                <p className="text-muted-foreground">No incidents to display.</p>
            </Card>
        );
    }

    return (
        <>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Incident Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {incidents.map(incident => {
                    const reporter = users.find(u => u.id === incident.reporterId);
                    const hasUnreadUpdate = user && !incident.viewedBy[user.id];
                    
                    return (
                        <TableRow key={incident.id} className={cn(incident.status === 'New' && 'font-bold bg-destructive/5', hasUnreadUpdate && "font-bold bg-blue-50 dark:bg-blue-900/20")}>
                            <TableCell className="w-8">
                               {hasUnreadUpdate && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" title="Unread update"></div>}
                            </TableCell>
                            <TableCell>{reporter?.name}</TableCell>
                            <TableCell>{getProjectName(incident.projectId)} - {incident.unitArea}</TableCell>
                            <TableCell>{format(new Date(incident.incidentTime), 'PPP p')}</TableCell>
                            <TableCell>
                               <div className='flex items-center gap-2'>
                                 <Badge variant={statusVariant[incident.status]}>{incident.status}</Badge>
                               </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleViewClick(incident)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
                </TableBody>
            </Table>
            <EditIncidentReportDialog 
                isOpen={!!selectedIncidentId}
                setIsOpen={(open) => !open && setSelectedIncidentId(null)}
                incidentId={selectedIncidentId}
            />
        </>
    );
}
