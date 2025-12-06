

'use client';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, Search, Plane, FileDown, CheckCircle, Pencil, XCircle, Upload, UserCog, Shirt, FileWarning, Clock, GanttChartSquare, Book, History } from 'lucide-react';
import ManpowerListTable from '@/components/manpower/ManpowerListTable';
import ManpowerProfileDialog from '@/components/manpower/ManpowerProfileDialog';
import type { ManpowerProfile, LeaveRecord } from '@/lib/types';
import ManpowerFilters, { type ManpowerFilterValues } from '@/components/manpower/ManpowerFilters';
import { isWithinInterval, addDays, isBefore, format, parseISO, isToday, isPast, isValid } from 'date-fns';
import ManpowerReportDownloads from '@/components/manpower/ManpowerReportDownloads';
import { Input } from '@/components/ui/input';
import LeaveReportDialog from '@/components/manpower/LeaveReportDialog';
import * as XLSX from 'xlsx';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import TradeSummary from '@/components/manpower/TradeSummary';
import ImportManpowerDialog from '@/components/manpower/ImportManpowerDialog';
import RejoinDialog from '@/components/manpower/RejoinDialog';
import ExtendLeaveDialog from '@/components/manpower/ExtendLeaveDialog';
import IssueMemoDialog from '@/components/manpower/IssueMemoDialog';
import IssuePpeDialog from '@/components/manpower/IssuePpeDialog';
import MemoReportDialog from '@/components/manpower/MemoReportDialog';
import LogbookRegisterDialog from '@/components/manpower/LogbookRegisterDialog';
import LogbookRequestDialog from '@/components/manpower/LogbookRequestDialog';
import LogbookRequests from '@/components/manpower/LogbookRequests';
import LogbookSummary from '@/components/manpower/LogbookSummary';
import LogbookHistoryDialog from '@/components/manpower/LogbookHistoryDialog';


export default function ManpowerListPage() {
    const { user, roles, manpowerProfiles, projects, confirmManpowerLeave, cancelManpowerLeave, can, updateManpowerProfile } = useAppContext();
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isRejoinDialogOpen, setIsRejoinDialogOpen] = useState(false);
    const [isExtendLeaveOpen, setIsExtendLeaveOpen] = useState(false);
    const [isMemoDialogOpen, setIsMemoDialogOpen] = useState(false);
    const [isPpeDialogOpen, setIsPpeDialogOpen] = useState(false);
    const [isMemoReportOpen, setIsMemoReportOpen] = useState(false);
    const [isLogbookRegisterOpen, setIsLogbookRegisterOpen] = useState(false);
    const [isLogbookRequestOpen, setIsLogbookRequestOpen] = useState(false);
    const [isLogbookHistoryOpen, setIsLogbookHistoryOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<ManpowerProfile | null>(null);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<ManpowerFilterValues>({
        status: 'all',
        trade: 'all',
        returnDateRange: undefined,
        projectId: 'all',
        expiryDateRange: undefined,
    });
    
    const leavesStartingToday = useMemo(() => {
        return manpowerProfiles.flatMap(p => {
            const historyArray = Array.isArray(p.leaveHistory) ? p.leaveHistory : Object.values(p.leaveHistory || {});
            return historyArray
                .filter(l => l && l.leaveStartDate && p.status === 'Working' && (isToday(parseISO(l.leaveStartDate)) || isPast(parseISO(l.leaveStartDate))) && !l.rejoinedDate && !l.leaveEndDate)
                .map(l => ({ profile: p, leave: l }));
        });
    }, [manpowerProfiles]);

    const upcomingLeaves = useMemo(() => {
        if (!can.manage_manpower_list) return [];
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);
        
        return manpowerProfiles.flatMap(p => {
            const historyArray = Array.isArray(p.leaveHistory) ? p.leaveHistory : Object.values(p.leaveHistory || {});
            return historyArray
                .filter(l => {
                    if(!l || !l.leaveStartDate) return false;
                    const leaveStartDate = parseISO(l.leaveStartDate);
                    return !l.rejoinedDate && !l.leaveEndDate && isWithinInterval(leaveStartDate, { start: now, end: thirtyDaysFromNow });
                })
                .map(l => ({ profile: p, leave: l }))
        });
    }, [manpowerProfiles, can.manage_manpower_list]);

    const overdueLeaves = useMemo(() => {
        if (!can.manage_manpower_list) return [];
        return manpowerProfiles.flatMap(p => {
            const historyArray = Array.isArray(p.leaveHistory) ? p.leaveHistory : Object.values(p.leaveHistory || {});
            return historyArray
                .filter(l => {
                    if (!l || p.status !== 'On Leave' || l.rejoinedDate || !l.plannedEndDate) {
                        return false;
                    }
                    return isPast(parseISO(l.plannedEndDate));
                })
                .map(l => ({ profile: p, leave: l }))
        });
    }, [manpowerProfiles, can.manage_manpower_list]);
    
    const profilesWithDbIndex = useMemo(() =>
      manpowerProfiles.map((profile, index) => ({
        ...profile,
        dbIndex: index + 1,
      })),
      [manpowerProfiles]
    );

    const filteredProfiles = useMemo(() => {
        return profilesWithDbIndex.filter(profile => {
            if (searchTerm && !profile.name.toLowerCase().includes(searchTerm.toLowerCase()) && !profile.hardCopyFileNo?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            const { status, trade, returnDateRange, projectId, expiryDateRange } = filters;
            if (status !== 'all' && profile.status !== status) return false;
            if (trade !== 'all' && profile.trade !== trade) return false;

            if(projectId !== 'all' && profile.eic !== projectId) return false;

            if (returnDateRange?.from) {
                const historyArray = Array.isArray(profile.leaveHistory) ? profile.leaveHistory : Object.values(profile.leaveHistory || {});
                const returnDate = historyArray.find(l => l?.rejoinedDate)?.rejoinedDate;
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
                    profile.labourLicenseExpiryDate, profile.medicalExpiryDate, 
                    profile.safetyExpiryDate, profile.irataValidity, profile.firstAidExpiryDate
                ];
                const fallsInRange = datesToCheck.some(dateStr => {
                    if (!dateStr) return false;
                    const expiryDate = parseISO(dateStr);
                    const from = expiryDateRange.from!;
                    const to = expiryDateRange.to || from;
                    return isValid(expiryDate) && isWithinInterval(expiryDate, { start: from, end: to });
                });
                if (!fallsInRange) return false;
            }

            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [profilesWithDbIndex, filters, searchTerm]);

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
        const leaveData = manpowerProfiles.flatMap(profile => {
            const historyArray = Array.isArray(profile.leaveHistory) ? profile.leaveHistory : Object.values(profile.leaveHistory || {});
            return historyArray.map(leave => ({
                'Employee Name': profile.name,
                'Trade': profile.trade,
                'Leave Type': leave.leaveType || 'N/A',
                'Start Date': leave.leaveStartDate ? format(new Date(leave.leaveStartDate), 'dd-MM-yyyy') : '',
                'Planned End Date': leave.plannedEndDate ? format(new Date(leave.plannedEndDate), 'dd-MM-yyyy') : '',
                'Actual End Date': leave.leaveEndDate ? format(new Date(leave.leaveEndDate), 'dd-MM-yyyy') : '',
                'Rejoined Date': leave.rejoinedDate ? format(new Date(leave.rejoinedDate), 'dd-MM-yyyy') : '',
            }))
        });

        if (leaveData.length === 0) {
            alert('No leave data to export.');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(leaveData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
        XLSX.writeFile(workbook, 'Manpower_Leave_Report.xlsx');
    };

    const handleMarkAsLeft = (profile: ManpowerProfile, leave: LeaveRecord) => {
        const historyArray = Array.isArray(profile.leaveHistory) ? profile.leaveHistory : Object.values(profile.leaveHistory || {});
        const updatedProfile = { 
            ...profile, 
            status: 'Left the Project' as const,
            leaveHistory: historyArray.map(l => 
                l.id === leave.id ? { ...l, leaveEndDate: new Date().toISOString() } : l
            )
        };
        updateManpowerProfile(updatedProfile);
    };

    const handleExtendLeave = (profile: ManpowerProfile, leave: LeaveRecord) => {
        setSelectedProfile(profile);
        setSelectedLeave(leave);
        setIsExtendLeaveOpen(true);
    };

    if (!can.manage_manpower_list) {
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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <ManpowerReportDownloads profiles={filteredProfiles} />
                    {can.manage_manpower_list && (
                        <>
                         <Button variant="outline" onClick={() => setIsLogbookHistoryOpen(true)}><History className="mr-2 h-4 w-4" /> Logbook History</Button>
                         <Button variant="outline" onClick={() => setIsLogbookRegisterOpen(true)}><Book className="mr-2 h-4 w-4" /> Logbook Register</Button>
                         <Button variant="outline" onClick={() => setIsLogbookRequestOpen(true)}><Book className="mr-2 h-4 w-4" /> Request Logbook</Button>
                         <Button variant="outline" onClick={() => setIsMemoReportOpen(true)}><GanttChartSquare className="mr-2 h-4 w-4" /> Memo Report</Button>
                         <Button variant="outline" onClick={handleDownloadLeaveReport}><FileDown className="mr-2 h-4 w-4" /> Leave Report</Button>
                         <Button onClick={() => setIsLeaveDialogOpen(true)}><Plane className="mr-2 h-4 w-4" /> Plan Leave</Button>
                         <Button onClick={() => setIsRejoinDialogOpen(true)}><UserCog className="mr-2 h-4 w-4" /> Update Rejoin</Button>
                         <Button onClick={() => setIsMemoDialogOpen(true)}><FileWarning className="mr-2 h-4 w-4" /> Issue Memo</Button>
                         <Button variant="outline" onClick={() => setIsPpeDialogOpen(true)}><Shirt className="mr-2 h-4 w-4"/> PPE Status</Button>
                         <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}><Upload className="mr-2 h-4 w-4" /> Import</Button>
                         <Button onClick={handleAdd}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Manpower
                        </Button>
                        </>
                    )}
                </div>
            </div>

            <LogbookRequests />
            {can.manage_logbook && <LogbookSummary />}
            <TradeSummary />
            
            {can.manage_manpower_list && overdueLeaves.length > 0 && (
                <Card className="border-orange-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock className="text-orange-500"/>Leave Period Ended</CardTitle>
                        <CardDescription>The following employees' leave periods have ended. Please update their status.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                        {overdueLeaves.map(({ profile, leave }) => (
                            <div key={`${profile.id}-${leave.id}`} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <p className="text-sm">
                                    <span className="font-semibold">{profile.name}'s</span> leave was planned to end on <span className="font-medium">{format(parseISO(leave.plannedEndDate!), 'dd-MM-yyyy')}</span>.
                                </p>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button size="sm" variant="outline" onClick={() => handleExtendLeave(profile, leave)}>Extend Leave</Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Left Project</Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Confirm Action</AlertDialogTitle><AlertDialogDescription>This will change {profile.name}'s status to "Left the Project" and close their leave record. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleMarkAsLeft(profile, leave)}>Confirm</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <Button size="sm" onClick={() => setIsRejoinDialogOpen(true)}>Update Rejoin</Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {can.manage_manpower_list && upcomingLeaves.length > 0 && (
                 <Card className="border-amber-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Plane className="text-amber-500"/>Upcoming Leave Within 30 Days</CardTitle>
                        <CardDescription>The following employees have leaves starting soon.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                        {upcomingLeaves.map(({ profile, leave }) => (
                            <div key={`${profile.id}-${leave.id}`} className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                <p className="text-sm">
                                    <span className="font-semibold">{profile.name}</span> has a planned {leave.leaveType} leave starting on <span className="font-medium">{format(parseISO(leave.leaveStartDate), 'dd-MM-yyyy')}</span>.
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {can.manage_manpower_list && leavesStartingToday.length > 0 && (
                 <Card className="border-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Plane className="text-blue-500"/>Leave Starting Soon</CardTitle>
                        <CardDescription>The following employees are scheduled for leave. Please confirm or modify their status.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {leavesStartingToday.map(({ profile, leave }) => (
                            <div key={`${profile.id}-${leave.id}`} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-2">
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>All Manpower ({filteredProfiles.length})</CardTitle>
                            <CardDescription>A list of all manpower profiles in the system.</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-auto sm:max-w-sm">
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
            
            {can.manage_manpower_list && (
                <>
                    <ManpowerProfileDialog
                        isOpen={isProfileDialogOpen}
                        setIsOpen={handleCloseDialog}
                        profile={selectedProfile}
                    />
                    <LeaveReportDialog 
                        isOpen={isLeaveDialogOpen} 
                        setIsOpen={setIsLeaveDialogOpen}
                    />
                     <RejoinDialog 
                        isOpen={isRejoinDialogOpen} 
                        setIsOpen={setIsRejoinDialogOpen}
                    />
                     <IssueMemoDialog
                        isOpen={isMemoDialogOpen}
                        setIsOpen={setIsMemoDialogOpen}
                    />
                    <IssuePpeDialog
                        isOpen={isPpeDialogOpen}
                        setIsOpen={setIsPpeDialogOpen}
                    />
                    <ImportManpowerDialog
                        isOpen={isImportDialogOpen}
                        setIsOpen={setIsImportDialogOpen}
                    />
                    <MemoReportDialog
                        isOpen={isMemoReportOpen}
                        setIsOpen={setIsMemoReportOpen}
                    />
                    <LogbookRegisterDialog
                        isOpen={isLogbookRegisterOpen}
                        setIsOpen={setIsLogbookRegisterOpen}
                    />
                     <LogbookHistoryDialog
                        isOpen={isLogbookHistoryOpen}
                        setIsOpen={setIsLogbookHistoryOpen}
                    />
                    <LogbookRequestDialog
                        isOpen={isLogbookRequestOpen}
                        setIsOpen={setIsLogbookRequestOpen}
                    />
                     {selectedProfile && selectedLeave && (
                        <ExtendLeaveDialog
                            isOpen={isExtendLeaveOpen}
                            setIsOpen={setIsExtendLeaveOpen}
                            profile={selectedProfile}
                            leave={selectedLeave}
                        />
                    )}
                </>
            )}
        </div>
    );
}






