

'use client';
import { useMemo, useState } from 'react';
import type { ManpowerProfile, EpNumberRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, MoreHorizontal, Trash2, Link as LinkIcon, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { useAppContext } from '@/contexts/app-provider';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format, isValid, parseISO, differenceInDays, isPast as isDateInPast } from 'date-fns';
import React from 'react';
import { cn } from '@/lib/utils';


interface ManpowerListTableProps {
    profiles: (ManpowerProfile & { dbIndex: number })[];
    onEdit: (profile: ManpowerProfile) => void;
}

const statusVariant: { [key in ManpowerProfile['status']]: "yellow" | "destructive" | "default" | "outline" | "success" | "warning" } = {
    'Working': 'success',
    'On Leave': 'yellow',
    'Resigned': 'destructive',
    'Terminated': 'destructive',
    'Left the Project': 'warning',
}

const DetailItem = ({ label, value }: { label: string, value?: string | number | null }) => {
    if (!value && value !== 0) return null;
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value}</p>
        </div>
    );
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'dd MMM, yyyy') : 'N/A';
};

const getNextExpiry = (profile: ManpowerProfile) => {
    const dates: { name: string; date: Date }[] = [];
    const checkDate = (dateStr: string | undefined, name: string) => {
        if (dateStr) {
            const date = parseISO(dateStr);
            if (isValid(date)) {
                dates.push({ name, date });
            }
        }
    };
    checkDate(profile.passIssueDate, 'Pass');
    checkDate(profile.workOrderExpiryDate, 'WO');
    checkDate(profile.wcPolicyExpiryDate, 'WC Policy');
    checkDate(profile.labourLicenseExpiryDate, 'Labour License');
    checkDate(profile.medicalExpiryDate, 'Medical');
    checkDate(profile.safetyExpiryDate, 'Safety');
    checkDate(profile.irataValidity, 'IRATA');
    checkDate(profile.firstAidExpiryDate, 'First Aid');
    
    (profile.skills || []).forEach(skill => {
        if(skill.validity) {
            checkDate(skill.validity, `${skill.name} Validity`);
        }
    });

    if (dates.length === 0) return null;
    
    const now = new Date();
    const futureDates = dates.filter(d => d.date >= now);
    
    if (futureDates.length > 0) {
        futureDates.sort((a, b) => a.date.getTime() - b.date.getTime());
        return futureDates[0];
    }
    
    // If no future dates, find the most recently expired date
    const pastDates = dates.filter(d => d.date < now).sort((a,b) => b.date.getTime() - a.date.getTime());
    return pastDates[0] || null;
};

export default function ManpowerListTable({ profiles, onEdit }: ManpowerListTableProps) {
    const { user, can, deleteManpowerProfile } = useAppContext();
    const { toast } = useToast();
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    
    const toggleRow = (id: string) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(id)) {
            newExpandedRows.delete(id);
        } else {
            newExpandedRows.add(id);
        }
        setExpandedRows(newExpandedRows);
    };

    const getDocumentProgress = (profile: ManpowerProfile) => {
        const requiredDocs = ['Aadhar Card', 'CV', 'Pan Card', 'Personal Details', 'Form A', 'Induction', 'Signed Contract', 'Medical Report', 'First Aid Certificate'];
        if (['RA Level 1', 'RA Level 2', 'RA Level 3', 'RA + Supervisor'].includes(profile.trade)) {
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
        const requiredDocs = ['Aadhar Card', 'CV', 'Pan Card', 'Personal Details', 'Form A', 'Induction', 'Signed Contract', 'Medical Report', 'First Aid Certificate'];
        if (['RA Level 1', 'RA Level 2', 'RA Level 3', 'RA + Supervisor'].includes(profile.trade)) {
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
        <div className="overflow-x-auto">
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="w-[50px]">DB No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Doc. Progress</TableHead>
                        <TableHead>Next Expiry</TableHead>
                        <TableHead>Doc. Link</TableHead>
                        {can.manage_manpower_list && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {profiles.map((profile) => {
                        const isExpanded = expandedRows.has(profile.id);
                        const nextExpiry = getNextExpiry(profile);
                        const daysToExpiry = nextExpiry ? differenceInDays(nextExpiry.date, new Date()) : null;
                        
                        const isExpired = nextExpiry ? isDateInPast(nextExpiry.date) : false;
                        const isExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30;

                        return (
                            <React.Fragment key={profile.id}>
                                <TableRow>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => toggleRow(profile.id)} className="h-8 w-8">
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                    <TableCell>{profile.dbIndex}</TableCell>
                                    <TableCell className="font-medium">{profile.name}</TableCell>
                                    <TableCell>{profile.trade}</TableCell>
                                    <TableCell><Badge variant={statusVariant[profile.status]}>{profile.status}</Badge></TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Progress value={getDocumentProgress(profile)} className="w-full" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">{getProgressTooltip(profile)}</TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell className={cn('text-sm', isExpired && 'text-destructive font-semibold', isExpiringSoon && !isExpired && 'text-orange-500 font-semibold')}>
                                        {nextExpiry ? (
                                            <div className="flex items-center gap-1">
                                                {(isExpired || isExpiringSoon) && <AlertCircle className="h-4 w-4" />}
                                                <span>{nextExpiry.name}: {format(nextExpiry.date, 'dd-MM-yy')}</span>
                                            </div>
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {profile.documentFolderUrl && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button asChild variant="ghost" size="icon">
                                                        <Link href={profile.documentFolderUrl} target="_blank" rel="noopener noreferrer">
                                                            <LinkIcon className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Open Document Folder</p></TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    {can.manage_manpower_list && (
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
                                                        {user?.role === 'Admin' && (
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
                                    )}
                                </TableRow>
                                {isExpanded && (
                                    <TableRow>
                                        <TableCell colSpan={can.manage_manpower_list ? 9 : 8} className="p-0">
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/50">
                                                <div className="space-y-4">
                                                    <h4 className="font-semibold text-sm">Personal & Work Details</h4>
                                                    <DetailItem label="Hard Copy File No." value={profile.hardCopyFileNo} />
                                                    <DetailItem label="Mobile" value={profile.mobileNumber} />
                                                    <DetailItem label="Gender" value={profile.gender} />
                                                    <DetailItem label="Date of Birth" value={formatDate(profile.dob)} />
                                                    <DetailItem label="Aadhar No." value={profile.aadharNumber} />
                                                    <DetailItem label="UAN No." value={profile.uanNumber} />
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="font-semibold text-sm">Contract & Policy Details</h4>
                                                    <DetailItem label="Work Order No." value={profile.workOrderNumber} />
                                                    <DetailItem label="Labour License No." value={profile.labourLicenseNo} />
                                                    <DetailItem label="EIC" value={profile.eic} />
                                                    <DetailItem label="EP No." value={profile.epNumber} />
                                                    <DetailItem label="Joining Date" value={formatDate(profile.joiningDate)} />
                                                    <DetailItem label="Work Order Expiry" value={formatDate(profile.workOrderExpiryDate)} />
                                                    <DetailItem label="Labour License Expiry" value={formatDate(profile.labourLicenseExpiryDate)} />
                                                    <DetailItem label="WC Policy No." value={profile.wcPolicyNumber} />
                                                    <DetailItem label="WC Policy Expiry" value={formatDate(profile.wcPolicyExpiryDate)} />
                                                    <DetailItem label="IRATA Expiry" value={formatDate(profile.irataValidity)} />
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="font-semibold text-sm">Document Status</h4>
                                                    {(profile.documents || []).map((doc, index) => (
                                                        <div key={`${doc.name}-${index}`} className="flex justify-between items-center text-sm">
                                                            <span>{doc.name}</span>
                                                            <Badge variant={doc.status === 'Collected' || doc.status === 'Received' ? 'success' : 'secondary'}>{doc.status}</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </TooltipProvider>
        </div>
    );
}
