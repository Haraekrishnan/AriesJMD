

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

export default function JobRecordSheet() {
    const { manpowerProfiles, jobRecords, saveJobRecord, projects } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [selectedProject, setSelectedProject] = useState('all');

    const monthKey = format(currentMonth, 'yyyy-MM');
    const daysInMonth = getDaysInMonth(currentMonth);
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const filteredProfiles = useMemo(() => {
        return manpowerProfiles
            .filter(p => selectedProject === 'all' || p.eic === selectedProject)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [manpowerProfiles, selectedProject]);

    const handleStatusChange = (employeeId: string, day: number, code: string) => {
        saveJobRecord(monthKey, employeeId, day, code);
    };
    
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const sheetData = [];

        // Header
        const header = ['S.No', 'Name', ...dayHeaders, 'Total OFF', 'Total Leave', 'Total Working Days'];
        sheetData.push(header);

        // Body
        filteredProfiles.forEach((profile, index) => {
            const row: (string | number)[] = [index + 1, profile.name];
            const currentMonthRecords = jobRecords && jobRecords[monthKey] ? jobRecords[monthKey] : { records: {} };
            const employeeRecord = currentMonthRecords.records?.[profile.id]?.days || {};
            let offDays = 0;
            let leaveDays = 0;
            let workDays = 0;

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
                <div className="flex items-center gap-4">
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Project" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <Button onClick={exportToExcel}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Excel
                </Button>
            </div>
            <div className="overflow-x-auto">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky left-0 bg-card z-10 w-[50px]">S.No</TableHead>
                            <TableHead className="sticky left-[50px] bg-card z-10 min-w-[200px]">Name</TableHead>
                            {dayHeaders.map(day => (
                                <TableHead key={day} className="text-center">{day}</TableHead>
                            ))}
                            <TableHead className="text-center min-w-[100px]">Total OFF</TableHead>
                            <TableHead className="text-center min-w-[100px]">Total Leave</TableHead>
                            <TableHead className="text-center min-w-[120px]">Working Days</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProfiles.map((profile, index) => {
                            const currentMonthRecords = (jobRecords && jobRecords[monthKey]) ? jobRecords[monthKey] : { records: {} };
                            const employeeRecord = currentMonthRecords.records?.[profile.id]?.days || {};
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
                    </TableBody>
                </Table>
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
