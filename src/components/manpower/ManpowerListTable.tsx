'use client';
import { useAppContext } from '@/hooks/use-app-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import type { ManpowerProfile } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

type ManpowerListTableProps = {
  profiles: ManpowerProfile[];
  onEdit: (profile: ManpowerProfile) => void;
};

export default function ManpowerListTable({ profiles, onEdit }: ManpowerListTableProps) {
  const { projects } = useAppContext();

  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return 'N/A';
    return projects.find(p => p.id === projectId)?.name || projectId;
  }

  const getStatusVariant = (status: ManpowerProfile['status']) => {
    switch(status) {
        case 'Working': return 'default';
        case 'On Leave': return 'secondary';
        case 'Resigned': return 'destructive';
        case 'Terminated': return 'destructive';
        default: return 'outline';
    }
  }

  if (profiles.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No profiles match the current filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Trade</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>File No.</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Joining Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map(profile => (
          <TableRow key={profile.id}>
            <TableCell className="font-medium">{profile.name}</TableCell>
            <TableCell>{profile.trade}</TableCell>
            <TableCell><Badge variant={getStatusVariant(profile.status)}>{profile.status}</Badge></TableCell>
            <TableCell>{profile.hardCopyFileNo}</TableCell>
            <TableCell>{profile.plantName}</TableCell>
            <TableCell>{profile.joiningDate ? format(parseISO(profile.joiningDate), 'dd MMM, yyyy') : 'N/A'}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => onEdit(profile)}>
                <Edit className="mr-2 h-4 w-4" /> View / Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
