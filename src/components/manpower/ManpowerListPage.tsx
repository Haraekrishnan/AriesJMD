'use client';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, Search } from 'lucide-react';
import ManpowerListTable from '@/components/manpower/ManpowerListTable';
import ManpowerProfileDialog from '@/components/manpower/ManpowerProfileDialog';
import type { ManpowerProfile } from '@/lib/types';
import ManpowerSummary from '@/components/manpower/ManpowerSummary';
import ManpowerFilters, { type ManpowerFilterValues } from '@/components/manpower/ManpowerFilters';
import { isWithinInterval, addDays, isBefore, format, parseISO } from 'date-fns';
import ManpowerReportDownloads from '@/components/manpower/ManpowerReportDownloads';
import { Input } from '@/components/ui/input';

export default function ManpowerListPage() {
    const { user, roles, manpowerProfiles, projects } = useAppContext();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
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
            checkDate(p.woValidity, 'WO');
            checkDate(p.wcPolicyValidity, 'WC Policy');
            checkDate(p.labourContractValidity, 'Labour Contract');
            checkDate(p.medicalExpiryDate, 'Medical');
            checkDate(p.safetyExpiryDate, 'Safety');
            checkDate(p.irataValidity, 'IRATA');
            checkDate(p.contractValidity, 'Contract');
            
            return { profile: p, expiringDocs };
        }).filter(item => item.expiringDocs.length > 0);
    }, [manpowerProfiles, canManage]);

    const filteredProfiles = useMemo(() => {
        return manpowerProfiles.filter(profile => {
            if (searchTerm && !profile.name.toLowerCase().includes(searchTerm.toLowerCase()) && !profile.hardCopyFileNo?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }

            const { status, trade, returnDateRange, projectId, expiryDateRange } = filters;
            if (status !== 'all' && profile.status !== status) return false;
            if (trade !== 'all' && profile.trade !== trade) return false;

            if(projectId !== 'all' && profile.eicName !== projectId) return false;

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
                    profile.passIssueDate, profile.woValidity, profile.wcPolicyValidity, 
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
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedProfile(null);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedProfile(null);
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
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Manpower
                    </Button>
                </div>
            </div>

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

            <ManpowerSummary profiles={filteredProfiles}/>
            
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
                isOpen={isDialogOpen}
                setIsOpen={handleCloseDialog}
                profile={selectedProfile}
            />
        </div>
    );
}
