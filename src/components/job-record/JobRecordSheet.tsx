

'use client';

import { useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from 'date-fns';
import { JOB_CODES, JOB_CODE_COLORS } from '@/lib/job-codes';
import * as XLSX from 'xlsx';

const PLANT_OPTIONS = ['DTA', 'SEZ', 'DTA-JPC', 'MTF'];

export default function JobRecordSheet() {
    const { manpowerProfiles, jobRecords, saveJobRecord } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

    const monthKey = format(currentMonth, 'yyyy-MM');
    const daysInMonth = getDaysInMonth(currentMonth);
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const plantAssignments = useMemo(() => jobRecords[monthKey]?.plantAssignments || {}, [jobRecords, monthKey]);

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
        Object.values(groups).forEach(group => group.sort((a,b) => a.name.localeCompare(b.name)));
        return groups;
    }, [manpowerProfiles, plantAssignments]);

    const handleStatusChange = (employeeId: string, day: number, code: string) => {
        saveJobRecord(monthKey, employeeId, day, code, 'status');
    };
    
    const handlePlantChange = (employeeId: string, plant: string) => {
        saveJobRecord(monthKey, employeeId, 0, plant, 'plant');
    }
    
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const sheetData: (string|number)[][] = [];

        // Header
        sheetData.push([`Job Record for ${format(currentMonth, 'MMMM yyyy')}`]);
        sheetData.push([]); // Empty row

        PLANT_OPTIONS.forEach(plant => {
            const profiles = groupedProfiles[plant];
            if (profiles.length === 0) return;

            sheetData.push([`Plant: ${plant}`]);
            const header = ['S.No', 'Name', ...dayHeaders, 'Total OFF', 'Total Leave', 'Total Working Days'];
            sheetData.push(header);

            profiles.forEach((profile, index) => {
                const row: (string | number)[] = [index + 1, profile.name];
                const employeeRecord = jobRecords[monthKey]?.records?.[profile.id]?.days || {};
                let offDays = 0, leaveDays = 0, workDays = 0;

                dayHeaders.forEach(day => {
                    const code = employeeRecord[day] || '';
                    row.push(code);
                    if (code === 'OFF' || code === 'PH') offDays++;
                    if (code === 'L') leaveDays++;
                    if (code && !['OFF', 'PH', 'L'].includes(code)) workDays++;
                });
                
                row.push(offDays, leaveDays, workDays);
                sheetData.push(row);
            });
            sheetData.push([]); // Empty row between plants
        });

        // Legend
        sheetData.push([]);
        sheetData.push(['CODE', 'JOB DETAILS']);
        JOB_CODES.forEach(jc => {
            sheetData.push([jc.code, jc.details]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, `Job Record - ${format(currentMonth, 'MMM yyyy')}`);
        XLSX.writeFile(wb, `JobRecord_${monthKey}.xlsx`);
    };

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
            <div className="space-y-8">
                {PLANT_OPTIONS.map(plant => (
                    <div key={plant}>
                        <h3 className="font-bold text-xl p-4">{plant} Plant</h3>
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
                                        <TableHead className="text-center min-w-[120px]">Working Days</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupedProfiles[plant].map((profile, index) => {
                                        const employeeRecord = jobRecords[monthKey]?.records?.[profile.id]?.days || {};
                                        const summary = dayHeaders.reduce((acc, day) => {
                                            const code = employeeRecord[day];
                                            if (code === 'OFF' || code === 'PH') acc.offDays++;
                                            if (code === 'L') acc.leaveDays++;
                                            if (code && !['OFF', 'PH', 'L'].includes(code)) acc.workDays++;
                                            return acc;
                                        }, { offDays: 0, leaveDays: 0, workDays: 0 });

                                        return (
                                            <TableRow key={profile.id}>
                                                <TableCell className="sticky left-0 bg-card z-10">{index + 1}</TableCell>
                                                <TableCell className="sticky left-[50px] bg-card z-10 font-medium">{profile.name}</TableCell>
                                                <TableCell className="sticky left-[250px] bg-card z-10">
                                                    <Select value={plantAssignments[profile.id]} onValueChange={(value) => handlePlantChange(profile.id, value)}>
                                                        <SelectTrigger><SelectValue placeholder="Assign..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {PLANT_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
                                                <TableCell className="text-center font-bold">{summary.workDays}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                     {groupedProfiles[plant].length === 0 && (
                                        <TableRow><TableCell colSpan={dayHeaders.length + 6} className="h-24 text-center">No employees assigned to this plant for this month.</TableCell></TableRow>
                                     )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ))}
            </div>
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
