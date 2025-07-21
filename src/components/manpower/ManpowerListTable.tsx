
'use client';
import { useMemo } from 'react';
import type { ManpowerProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, MoreHorizontal, Trash2, Link as LinkIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { MANDATORY_DOCS, RA_TRADES } from '@/lib/mock-data';
import { useAppContext } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';

interface ManpowerListTableProps {
    profiles: ManpowerProfile[];
    onEdit: (profile: ManpowerProfile) => void;
}

const statusVariant: { [key in ManpowerProfile['status']]: "secondary" | "destructive" | "default" | "outline" } = {
    'Working': 'secondary',
    'On Leave': 'default',
    'Resigned': 'destructive',
    'Terminated': 'destructive',
}

export default function ManpowerListTable({ profiles, onEdit }: ManpowerListTableProps) {
    const { user, deleteManpowerProfile } = useAppContext();
    const { toast } = useToast();
    const isAdmin = user?.role === 'Admin';

    const getDocumentProgress = (profile: ManpowerProfile) => {
        const requiredDocs = [...MANDATORY_DOCS];
        if (RA_TRADES.includes(profile.trade)) {
            requiredDocs.push('IRATA Certificate');
        }

        if (requiredDocs.length === 0) return 100;

        const collectedCount = requiredDocs.filter(docName => {
            const doc = (profile.documents || []).find(d => d.name === docName);
            return doc && doc.status !== 'Pending';
        }).length;
        
        return (collectedCount / requiredDocs.length) * 100;
    };
    
     const getProgressTooltip = (profile: ManpowerProfile) => {
        const requiredDocs = [...MANDATORY_DOCS];
        if (RA_TRADES.includes(profile.trade)) {
            requiredDocs.push('IRATA Certificate');
        }

        if (requiredDocs.length === 0) {
            return <div>No documents required for this trade.</div>
        }
        
        const collected: string[] = [];
        const pending: string[] = [];

        requiredDocs.forEach(docName => {
            const doc = (profile.documents || []).find(d => d.name === docName);
            if(doc && doc.status !== 'Pending') {
                collected.push(docName);
            } else {
                pending.push(docName);
            }
        });

        return (
            <div>
                {collected.length > 0 && <p><strong>Collected:</strong> {collected.join(', ')}</p>}
                {pending.length > 0 && <p className="mt-2"><strong>Pending:</strong> {pending.join(', ')}</p>}
            </div>
        );
    };

    const handleDelete = (profile: ManpowerProfile) => {
        deleteManpowerProfile(profile.id);
        toast({
            variant: 'destructive',
            title: 'Profile Deleted',
            description: `${profile.name}'s profile has been removed.`,
        });
    };

    if (profiles.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No manpower profiles found.</p>;
    }

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Documentation Status</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {profiles.map(profile => (
                        <TableRow key={profile.id}>
                            <TableCell className="font-medium">{profile.name}</TableCell>
                            <TableCell>{profile.trade}</TableCell>
                            <TableCell><Badge variant={statusVariant[profile.status]}>{profile.status}</Badge></TableCell>
                            <TableCell>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            <Progress value={getDocumentProgress(profile)} className="w-48" />
                                            <span className="text-xs text-muted-foreground">{getDocumentProgress(profile).toFixed(0)}%</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        {getProgressTooltip(profile)}
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell>
                                {profile.documentFolderUrl ? (
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={profile.documentFolderUrl} target="_blank" rel="noopener noreferrer">
                                            <LinkIcon className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">N/A</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => onEdit(profile)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            {isAdmin && (
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the profile for {profile.name}.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(profile)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TooltipProvider>
    );
}
