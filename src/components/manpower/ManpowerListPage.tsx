
'use client';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, Search, Plane, FileDown, CheckCircle, Pencil, XCircle, Upload } from 'lucide-react';
import ManpowerListTable from '@/components/manpower/ManpowerListTable';
import ManpowerProfileDialog from '@/components/manpower/ManpowerProfileDialog';
import type { ManpowerProfile } from '@/lib/types';
import ManpowerFilters, { type ManpowerFilterValues } from '@/components/manpower/ManpowerFilters';
import { isWithinInterval, addDays, isBefore, format, parseISO, isToday, isPast } from 'date-fns';
import ManpowerReportDownloads from '@/components/manpower/ManpowerReportDownloads';
import { Input } from '@/components/ui/input';
import LeaveReportDialog from '@/components/manpower/LeaveReportDialog';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import TradeSummary from '@/components/manpower/TradeSummary';
import ImportManpowerDialog from '@/components/manpower/ImportManpowerDialog';


export default function ManpowerListPage() {
    const { user, roles, manpowerProfiles, projects, confirmManpowerLeave, cancelManpowerLeave } = useAppContext();
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<ManpowerProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<ManpowerFilterValues>({
        status: 'all',
        trade: 'all',
        returnDateRange: undefined,
        projectId: 'all',
        expiryDateRange: undefined,
    });

    const canManage = useMemo(() => {
        if (!user) return false;
        const userRole = roles.find(r => r.name === user.role);
        return userRole?.permissions.includes('manage_manpower_list');
    }, [user, roles]);
    
    const expiringProfiles = useMemo(() => {
        if (!canManage) return [];
        const thirtyDaysFromNow = addDays(new Date(), 30);
        
        return manpowerProfiles.map(p => {
            const expiringDocs: string[] = [];
            const checkDate = (dateStr: string | undefined, name: string) => {
                if (dateStr && isBefore(parseISO(dateStr), thirtyDaysFromNow)) {
                    expiringDocs.push(`${name} on ${format(parseISO(dateStr), 'dd-MM-yyyy')}`);
                }
            };
    
            checkDate(p.passIssueDate, 'Pass');
            checkDate(p.workOrderExpiryDate, 'WO');
            checkDate(p.wcPolicyExpiryDate, 'WC Policy');
            checkDate(p.labourContractValidity, 'Labour Contract');
            checkDate(p.medicalExpiryDate, 'Medical');
            checkDate(p.safetyExpiryDate, 'Safety');
            checkDate(p.irataValidity, 'IRATA');
            checkDate(p.contractValidity, 'Contract');
            
            return { profile: p, expiringDocs };
        }).filter(item => item.expiringDocs.length > 0);
    }, [manpowerProfiles, canManage]);
    
    const leavesStartingToday = useMemo(() => {
        return manpowerProfiles.flatMap(p => 
            (p.leaveHistory || [])
                .filter(l => p.status === 'Working' && (isToday(parseISO(l.leaveStartDate)) || isPast(parseISO(l.leaveStartDate))) && !l.rejoinedDate)
                .map(l => ({ profile: p, leave: l }))
        );
    }, [manpowerProfiles]);

    const filteredProfiles = useMemo(() => {
        return manpowerProfiles.filter(profile => {
            if (searchTerm && !profile.name.toLowerCase().includes(searchTerm.toLowerCase()) && !profile.hardCopyFileNo?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            const { status, trade, returnDateRange, projectId, expiryDateRange } = filters;
            if (status !== 'all' && profile.status !== status) return false;
            if (trade !== 'all' && profile.trade !== trade) return false;

            if(projectId !== 'all' && profile.eic !== projectId) return false;

            if (returnDateRange?.from) {
                const returnDate = profile.leaveHistory?.find(l => l.rejoinedDate)?.rejoinedDate;
                if (!returnDate) return false;
                
                const from = returnDateRange.from;
                const to = returnDateRange.to || from;
                if (!isWithinInterval(parseISO(returnDate), { start: from, end: to })) {
                    return false;
                }
            }
            
            if (expiryDateRange?.from) {
                const datesToCheck = [
                    profile.passIssueDate, profile.workOrderExpiryDate, profile.wcPolicyExpiryDate, 
                    profile.labourContractValidity, profile.medicalExpiryDate, 
                    profile.safetyExpiryDate, profile.irataValidity, profile.contractValidity
                ];
                const fallsInRange = datesToCheck.some(dateStr => {
                    if (!dateStr) return false;
                    const expiryDate = parseISO(dateStr);
                    const from = expiryDateRange.from!;
                    const to = expiryDateRange.to || from;
                    return isWithinInterval(expiryDate, { start: from, end: to });
                });
                if (!fallsInRange) return false;
            }

            return true;
        });
    }, [manpowerProfiles, filters, projects, searchTerm]);

    const handleEdit = (profile: ManpowerProfile) => {
        setSelectedProfile(profile);
        setIsProfileDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedProfile(null);
        setIsProfileDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsProfileDialogOpen(false);
        setSelectedProfile(null);
    };
    
    const handleDownloadLeaveReport = () => {
        const leaveData = manpowerProfiles.flatMap(profile => 
            (profile.leaveHistory || []).map(leave => ({
                'Employee Name': profile.name,
                'Trade': profile.trade,
                'Leave Type': leave.leaveType || 'N/A',
                'Start Date': leave.leaveStartDate ? format(new Date(leave.leaveStartDate), 'dd-MM-yyyy') : '',
                'Planned End Date': leave.plannedEndDate ? format(new Date(leave.plannedEndDate), 'dd-MM-yyyy') : '',
                'Actual End Date': leave.leaveEndDate ? format(new Date(leave.leaveEndDate), 'dd-MM-yyyy') : '',
                'Rejoined Date': leave.rejoinedDate ? format(new Date(leave.rejoinedDate), 'dd-MM-yyyy') : '',
            }))
        );

        if (leaveData.length === 0) {
            alert('No leave data to export.');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(leaveData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
        XLSX.writeFile(workbook, 'Manpower_Leave_Report.xlsx');
    };

    if (!canManage) {
        return (
            <Card className="w-full max-w-md mx-auto mt-20">
                <CardHeader className="text-center items-center">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to manage the manpower list.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manpower List</h1>
                    <p className="text-muted-foreground">Manage manpower profiles and documentation.</p>
                </div>
                <div className="flex items-center gap-2">
                    <ManpowerReportDownloads profiles={filteredProfiles} />
                     <Button variant="outline" onClick={handleDownloadLeaveReport}><FileDown className="mr-2 h-4 w-4" /> Leave Report</Button>
                     <Button onClick={() => setIsLeaveDialogOpen(true)}><Plane className="mr-2 h-4 w-4" /> Plan Leave</Button>
                     <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Manpower
                    </Button>
                </div>
            </div>

            <TradeSummary />

            {leavesStartingToday.length > 0 && (
                 <Card className="border-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Plane className="text-blue-500"/>Leave Starting Soon</CardTitle>
                        <CardDescription>The following employees are scheduled for leave. Please confirm or modify their status.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {leavesStartingToday.map(({ profile, leave }) => (
                            <div key={leave.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <p className="text-sm">
                                    <span className="font-semibold">{profile.name}</span> is scheduled for {leave.leaveType} leave from <span className="font-medium">{format(parseISO(leave.leaveStartDate), 'dd MMM, yyyy')}</span>.
                                </p>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button size="sm" variant="default" onClick={() => confirmManpowerLeave(profile.id, leave.id)}><CheckCircle className="mr-2 h-4 w-4" /> Confirm</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleEdit(profile)}><Pencil className="mr-2 h-4 w-4" /> Modify</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button size="sm" variant="destructive"><XCircle className="mr-2 h-4 w-4" /> Cancel</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Cancel Leave Plan?</AlertDialogTitle><AlertDialogDescription>This will remove the planned leave for {profile.name}. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Close</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => cancelManpowerLeave(profile.id, leave.id)}>Confirm Cancellation</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {expiringProfiles.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Expiring Documents</CardTitle>
                        <CardDescription>The following manpower have documents expiring within the next 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {expiringProfiles.map(item => (
                                <div key={item.profile.id} className="text-sm p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                    <span className="font-semibold">{item.profile.name} ({item.profile.trade})</span>: {item.expiringDocs.join(', ')}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter the list of manpower profiles below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ManpowerFilters onApplyFilters={setFilters} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>All Manpower ({filteredProfiles.length})</CardTitle>
                            <CardDescription>A list of all manpower profiles in the system.</CardDescription>
                        </div>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or file no..." 
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ManpowerListTable profiles={filteredProfiles} onEdit={handleEdit} />
                </CardContent>
            </Card>

            <ManpowerProfileDialog
                isOpen={isProfileDialogOpen}
                setIsOpen={handleCloseDialog}
                profile={selectedProfile}
            />
            <LeaveReportDialog 
                isOpen={isLeaveDialogOpen} 
                setIsOpen={setIsLeaveDialogOpen}
            />
            <ImportManpowerDialog
                isOpen={isImportDialogOpen}
                setIsOpen={setIsImportDialogOpen}
            />
        </div>
    );
}
