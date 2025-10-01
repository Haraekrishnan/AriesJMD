
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSunday } from 'date-fns';
import { JOB_CODES, JOB_CODE_COLORS } from '@/lib/job-codes';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';


const PLANT_OPTIONS = ['DTA', 'SEZ', 'DTA-JPC', 'MTF'];

export default function JobRecordSheet() {
    const { manpowerProfiles, jobRecords, saveJobRecord } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const { toast } = useToast();

    const monthKey = format(currentMonth, 'yyyy-MM');
    const daysInMonth = getDaysInMonth(currentMonth);
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const plantAssignments = useMemo(() => {
        return jobRecords[monthKey]?.plantAssignments || {};
    }, [jobRecords, monthKey]);
    
    const overtimeData = useMemo(() => {
        return jobRecords[monthKey]?.overtime || {};
    }, [jobRecords, monthKey]);

    const [tempOvertime, setTempOvertime] = useState<{[key: string]: string}>({});

    useEffect(() => {
        // When overtimeData from context changes, update local state
        const initialTempOvertime: {[key: string]: string} = {};
        for (const profileId in overtimeData) {
            initialTempOvertime[profileId] = String(overtimeData[profileId]);
        }
        setTempOvertime(initialTempOvertime);
    }, [overtimeData]);

    const groupedProfiles = useMemo(() => {
        const groups: { [key: string]: typeof manpowerProfiles } = {
            'DTA': [], 'SEZ': [], 'DTA-JPC': [], 'MTF': [], 'Unassigned': []
        };
        manpowerProfiles.forEach(profile => {
            const plant = plantAssignments[profile.id] || 'Unassigned';
            if (groups[plant]) {
                groups[plant].push(profile);
            } else {
                groups['Unassigned'].push(profile);
            }
        });
        // Sort each group alphabetically by name
        Object.values(groups).forEach(group => group.sort((a, b) => a.name.localeCompare(b.name)));
        return groups;
    }, [manpowerProfiles, plantAssignments]);

    const handleStatusChange = (employeeId: string, day: number, code: string) => {
        saveJobRecord(monthKey, employeeId, day, code, 'status');
    };
    
    const handlePlantChange = (employeeId: string, plant: string) => {
        saveJobRecord(monthKey, employeeId, 0, plant, 'plant');
    }

    const handleOvertimeChange = (employeeId: string, value: string) => {
        setTempOvertime(prev => ({ ...prev, [employeeId]: value }));
    };

    const handleOvertimeSave = (employeeId: string) => {
        const value = tempOvertime[employeeId];
        if (value !== undefined && !isNaN(Number(value))) {
            saveJobRecord(monthKey, employeeId, Number(value), '', 'overtime');
            toast({title: 'Overtime Saved'});
        } else {
            toast({variant: 'destructive', title: 'Invalid Value', description: 'Please enter a valid number for overtime.'});
        }
    };
    
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        [...PLANT_OPTIONS, 'Unassigned'].forEach(plant => {
            const profiles = groupedProfiles[plant];
            if (profiles.length === 0) return;

            const sheetData: (string|number)[][] = [];
            sheetData.push([`Job Record for ${format(currentMonth, 'MMMM yyyy')} - Plant: ${plant}`]);
            sheetData.push([]); 

            const header = [
                'S.No', 'Name', ...dayHeaders, 'Total Leave', 'Total ML', 'Total OFF', 'Total Rept/Office', 'Total Standby/Training',
                'Total working Days', 'Over Time', 'Salary Days', 'Additional Sunday Duty'
            ];
            sheetData.push(header);

            profiles.forEach((profile, index) => {
                const employeeRecord = jobRecords[monthKey]?.records?.[profile.id]?.days || {};
                const summary = dayHeaders.reduce((acc, day) => {
                    const code = employeeRecord[day];
                    if (code === 'OFF' || code === 'PH') acc.offDays++;
                    if (code === 'L') acc.leaveDays++;
                    if (code === 'ML') acc.medicalLeave++;
                    if (['S', 'CQ', 'RST'].includes(code)) acc.standbyTraining++;
                    if (code === 'R') acc.reptOffice++;
                    if (code && !['OFF', 'PH', 'L', 'ML'].includes(code)) acc.workDays++;
                    if (isSunday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) && code && !['OFF', 'PH', 'L', 'ML'].includes(code)) {
                        acc.sundayDuty++;
                    }
                    return acc;
                }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0, sundayDuty: 0 });
                 const salaryDays = daysInMonth - summary.leaveDays;
                
                const row: (string | number)[] = [index + 1, profile.name];
                dayHeaders.forEach(day => {
                    row.push(employeeRecord[day] || '');
                });
                row.push(summary.leaveDays, summary.medicalLeave, summary.offDays, summary.reptOffice, summary.standbyTraining, summary.workDays, overtimeData[profile.id] || 0, salaryDays, summary.sundayDuty);
                sheetData.push(row);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, plant);
        });

        // Add Legend sheet
        const legendData = [['CODE', 'JOB DETAILS'], ...JOB_CODES.map(jc => [jc.code, jc.details])];
        const legendWs = XLSX.utils.aoa_to_sheet(legendData);
        XLSX.utils.book_append_sheet(wb, legendWs, 'Legend');

        XLSX.writeFile(wb, `JobRecord_${monthKey}.xlsx`);
    };
    
    const renderTableForPlant = (plantName: string, profiles: typeof manpowerProfiles) => {
         if (profiles.length === 0) {
            return <div className="text-center p-8 text-muted-foreground">No employees assigned to this plant for this month.</div>
        }
        return (
            <div className="overflow-x-auto">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 bg-card z-10 w-[50px]">S.No</TableHead>
                            <TableHead className="sticky left-[50px] bg-card z-10 min-w-[200px]">Name</TableHead>
                            <TableHead className="sticky left-[250px] bg-card z-10 min-w-[150px]">Plant</TableHead>
                            {dayHeaders.map(day => (
                                <TableHead key={day} className="text-center">{day}</TableHead>
                            ))}
                            <TableHead className="text-center min-w-[100px]">Total OFF</TableHead>
                            <TableHead className="text-center min-w-[100px]">Total Leave</TableHead>
                            <TableHead className="text-center min-w-[100px]">Total ML</TableHead>
                            <TableHead className="text-center min-w-[150px]">Total Standby etc.</TableHead>
                            <TableHead className="text-center min-w-[150px]">Total Rept/Office</TableHead>
                            <TableHead className="text-center min-w-[120px]">Total Working Days</TableHead>
                            <TableHead className="text-center min-w-[120px]">Over Time</TableHead>
                            <TableHead className="text-center min-w-[120px]">Salary Days</TableHead>
                            <TableHead className="text-center min-w-[150px]">Add. Sunday Duty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile, index) => {
                            const employeeRecord = jobRecords[monthKey]?.records?.[profile.id]?.days || {};
                            const summary = dayHeaders.reduce((acc, day) => {
                                const code = employeeRecord[day];
                                if (code === 'OFF' || code === 'PH') acc.offDays++;
                                if (code === 'L') acc.leaveDays++;
                                if (code === 'ML') acc.medicalLeave++;
                                if (['S', 'CQ', 'RST'].includes(code)) acc.standbyTraining++;
                                if (code === 'R') acc.reptOffice++;
                                if (code && !['OFF', 'PH', 'L', 'ML'].includes(code)) acc.workDays++;
                                if (isSunday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) && code && !['OFF', 'PH', 'L', 'ML'].includes(code)) {
                                    acc.sundayDuty++;
                                }
                                return acc;
                            }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0, sundayDuty: 0 });

                            const salaryDays = daysInMonth - summary.leaveDays;

                            return (
                                <TableRow key={profile.id}>
                                    <TableCell className="sticky left-0 bg-card z-10">{index + 1}</TableCell>
                                    <TableCell className="sticky left-[50px] bg-card z-10 font-medium">{profile.name}</TableCell>
                                    <TableCell className="sticky left-[250px] bg-card z-10">
                                        <Select value={plantAssignments[profile.id]} onValueChange={(value) => handlePlantChange(profile.id, value)}>
                                            <SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger>
                                            <SelectContent>
                                                {[...PLANT_OPTIONS, 'Unassigned'].map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    {dayHeaders.map(day => {
                                        const code = employeeRecord[day] || '';
                                        const colorClass = JOB_CODE_COLORS[code] || 'bg-transparent';
                                        return (
                                            <TableCell key={day} className="p-0 text-center">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" className={`w-full h-full rounded-none font-bold ${colorClass}`}>
                                                            {code || '-'}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-1">
                                                        <div className="grid grid-cols-4 gap-1">
                                                            {JOB_CODES.map(jobCode => (
                                                                <Button
                                                                    key={jobCode.code}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleStatusChange(profile.id, day, jobCode.code)}
                                                                >
                                                                    {jobCode.code}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-center font-bold">{summary.offDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.leaveDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.medicalLeave}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.standbyTraining}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.reptOffice}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.workDays}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="text"
                                                value={tempOvertime[profile.id] ?? ''}
                                                onChange={(e) => handleOvertimeChange(profile.id, e.target.value)}
                                                className="w-16 h-8 text-center"
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleOvertimeSave(profile.id)}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-bold">{salaryDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.sundayDuty}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                 <Button onClick={exportToExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Excel
                </Button>
            </div>

            <Tabs defaultValue="DTA" className="w-full">
                <TabsList>
                    {PLANT_OPTIONS.map(plant => <TabsTrigger key={plant} value={plant}>{plant}</TabsTrigger>)}
                    <TabsTrigger value="Unassigned">Unassigned</TabsTrigger>
                </TabsList>
                {PLANT_OPTIONS.map(plant => (
                    <TabsContent key={plant} value={plant}>
                        {renderTableForPlant(plant, groupedProfiles[plant])}
                    </TabsContent>
                ))}
                 <TabsContent value="Unassigned">
                    {renderTableForPlant('Unassigned', groupedProfiles['Unassigned'])}
                </TabsContent>
            </Tabs>
            
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {JOB_CODES.map(jc => (
                    <div key={jc.code} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${JOB_CODE_COLORS[jc.code] || 'border'}`}></div>
                        <span className="text-xs font-semibold">{jc.code}:</span>
                        <span className="text-xs text-muted-foreground">{jc.details}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
