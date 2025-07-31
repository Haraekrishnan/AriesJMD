
'use client';
import { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Save } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import type { User, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface EmployeeStatsTableProps {
  data: any[];
}

const roleHierarchy: Record<Role, number> = {
  'Team Member': 0,
  'Junior Supervisor': 1,
  'Junior HSE': 1,
  'Assistant Store Incharge': 1,
  'Supervisor': 2,
  'HSE': 2,
  'Store in Charge': 2,
  'Project Coordinator': 3,
  'Manager': 4,
  'Admin': 5,
};

export default function EmployeeStatsTable({ data }: EmployeeStatsTableProps) {
  const { user, updateUserPlanningScore } = useAppContext();
  const { toast } = useToast();
  const [scores, setScores] = useState<Record<string, number | string>>({});

  const handleScoreChange = (userId: string, value: string) => {
    setScores(prev => ({ ...prev, [userId]: value }));
  };

  const handleSaveScore = (userId: string) => {
    const newScore = Number(scores[userId]);
    if (!isNaN(newScore)) {
      updateUserPlanningScore(userId, newScore);
      toast({ title: 'Planning Score Updated', description: `The score has been saved.` });
    } else {
      toast({ variant: 'destructive', title: 'Invalid Score', description: 'Please enter a valid number.' });
    }
  };

  const canScoreUser = (scoredUser: User): boolean => {
    if (!user) return false;
    if (user.id === scoredUser.id) return false;

    if (['Admin', 'Manager', 'Project Coordinator'].includes(user.role)) {
      return true;
    }

    const scorerLevel = roleHierarchy[user.role];
    const scoredLevel = roleHierarchy[scoredUser.role];
    
    // Supervisors can score their direct juniors
    if (scorerLevel > scoredLevel && scoredUser.supervisorId === user.id) return true;

    return false;
  };
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead className="text-center">To Do</TableHead>
          <TableHead className="text-center">In Progress</TableHead>
          <TableHead className="text-center">Completed</TableHead>
          <TableHead className="text-center">Overdue</TableHead>
          <TableHead className="text-center">Planning Score</TableHead>
          <TableHead className="text-center">Total Assigned</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(userData => {
          const canScore = canScoreUser(userData as User);
          return (
            <TableRow key={userData.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userData.avatar} alt={userData.name} />
                    <AvatarFallback>{userData.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{userData.name}</div>
                    <div className="text-sm text-muted-foreground">{userData.role}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">{userData.todo}</TableCell>
              <TableCell className="text-center">{userData.inProgress}</TableCell>
              <TableCell className="text-center font-medium">{userData.completed}</TableCell>
              <TableCell className="text-center">
                {userData.overdue > 0 ? (
                  <Badge variant="destructive">{userData.overdue}</Badge>
                ) : (
                  0
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    defaultValue={userData.planningScore || 0}
                    onChange={(e) => handleScoreChange(userData.id, e.target.value)}
                    disabled={!canScore}
                    className="w-20 h-8 text-center"
                  />
                  {canScore && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveScore(userData.id)}>
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center font-semibold">{userData.total}</TableCell>
            </TableRow>
          )
        })}
         {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No data available for the selected filters.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
