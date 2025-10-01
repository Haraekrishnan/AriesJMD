
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, ChevronsUpDown } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isSunday } from 'date-fns';
import { JOB_CODES, JOB_CODE_COLORS } from '@/lib/job-codes';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check } from 'lucide-react';

const PLANT_OPTIONS = ['DTA', 'SEZ', 'DTA-JPC', 'MTF'];

// Simple Job Code Picker
const JobCodePicker = ({ onSelect, onOpenChange }: { onSelect: (code: string) => void, onOpenChange: (open: boolean) => void }) => {
    return (
        <div className="grid grid-cols-5 gap-1 p-2">
            {JOB_CODES.map(jobCode => (
                <Button
                    key={jobCode.code}
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                        onSelect(jobCode.code);
                        onOpenChange(false);
                    }}
                >
                    {jobCode.code}
                </Button>
            ))}
        </div>
    );
};


export default function JobRecordSheet() {
    const { manpowerProfiles, jobRecords, saveJobRecord } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const { toast } = useToast();
    const [activeCell, setActiveCell] = useState<{ profileId: string; day: number } | null>(null);
    const [localCellValues, setLocalCellValues] = useState<Record<string, string>>({});

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
    
    const jobRecordForMonth = useMemo(() => {
        return jobRecords[monthKey]?.records || {};
    }, [jobRecords, monthKey]);

    useEffect(() => {
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
        Object.values(groups).forEach(group => group.sort((a, b) => a.name.localeCompare(b.name)));
        return groups;
    }, [manpowerProfiles, plantAssignments]);

    const handleStatusChange = (employeeId: string, day: number, code: string) => {
        saveJobRecord(monthKey, employeeId, day, code, 'status');
        setLocalCellValues(prev => ({...prev, [`${employeeId}-${day}`]: code}));
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
                'S.No', 'Name', ...dayHeaders, 'Total OFF', 'Total Leave', 'Total ML', 'Over Time', 'Total Standby/Training',
                'Total working Days', 'Total Rept/Office', 'Salary Days', 'Additional Sunday Duty'
            ];
            sheetData.push(header);

            profiles.forEach((profile, index) => {
                const employeeRecord = jobRecords[monthKey]?.records?.[profile.id]?.days || {};
                
                const offCodes = ['OFF', 'PH', 'OS'];
                const leaveCodes = ['L', 'X', 'NWS'];
                const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];
                const workCodes = ["MTP","ZPT","ZE","MCT","ZCU","ZRS","ZPB","Z","RGR","ZC","ZP","DC","DRS","SP","DCR","SWS","DD","RRT","DA","ZPS","C2L","DP","SWR","SWP","NT","C2C","DR","2CL","C2M","IIR","PVS","MTM","MTB","MTT","MTF","MTS","KD","ZI","ZS","ZB","DRR","MTJ", "MTC", "CRY", "MTI", "MTL", "SWB"];
                
                const summary = dayHeaders.reduce((acc, day) => {
                    const code = employeeRecord[day];
                    if (offCodes.includes(code)) acc.offDays++;
                    if (leaveCodes.includes(code)) acc.leaveDays++;
                    if (code === 'ML') acc.medicalLeave++;
                    if (standbyCodes.includes(code)) acc.standbyTraining++;
                    if (code === 'R') acc.reptOffice++;
                    if (workCodes.includes(code)) acc.workDays++;
                    if (isSunday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) && code && !['OFF', 'PH', 'L', 'ML'].includes(code)) {
                        acc.sundayDuty++;
                    }
                    return acc;
                }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0, sundayDuty: 0 });

                const salaryDays = summary.sundayDuty + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;
                
                const row: (string | number)[] = [index + 1, profile.name];
                dayHeaders.forEach(day => {
                    row.push(employeeRecord[day] || '');
                });
                row.push(summary.offDays, summary.leaveDays, summary.medicalLeave, overtimeData[profile.id] || 0, summary.standbyTraining, summary.workDays, summary.reptOffice, salaryDays, summary.sundayDuty);
                sheetData.push(row);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            ws['!cols'] = [{ wch: 5 }, { wch: 25 }];
            dayHeaders.forEach(() => ws['!cols']?.push({ wch: 5 }));
            header.slice(3 + daysInMonth).forEach(() => ws['!cols']?.push({ wch: 10 }));
            
            profiles.forEach((profile, rIndex) => {
                const employeeRecord = jobRecords[monthKey]?.records?.[profile.id]?.days || {};
                dayHeaders.forEach((day, cIndex) => {
                    const code = employeeRecord[day] || '';
                    const colorInfo = JOB_CODE_COLORS[code];
                    const cellAddress = XLSX.utils.encode_cell({ r: rIndex + 3, c: cIndex + 2 });
                    
                    if (colorInfo?.excelFill) {
                        if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: code };
                         ws[cellAddress].s = {
                            fill: {
                                patternType: "solid",
                                fgColor: colorInfo.excelFill.fgColor,
                            },
                            ...colorInfo.excelFill.font && { font: colorInfo.excelFill.font }
                        };
                    } else {
                        if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: code };
                    }
                });
            });

            XLSX.utils.book_append_sheet(wb, ws, plant);
        });

        const legendData = [['CODE', 'JOB DETAILS'], ...JOB_CODES.map(jc => [jc.code, jc.details])];
        const legendWs = XLSX.utils.aoa_to_sheet(legendData);
        XLSX.utils.book_append_sheet(wb, legendWs, 'Legend');

        XLSX.writeFile(wb, `JobRecord_${monthKey}.xlsx`);
    };

    const LegendTable = ({ profiles }: { profiles: typeof manpowerProfiles }) => {
        const manDaysCount = useMemo(() => {
            const counts: { [code: string]: number } = {};
            JOB_CODES.forEach(jc => counts[jc.code] = 0);
    
            profiles.forEach(profile => {
                const employeeRecord = jobRecords[monthKey]?.records?.[profile.id]?.days || {};
                dayHeaders.forEach(day => {
                    const code = employeeRecord[day];
                    if (code && counts.hasOwnProperty(code)) {
                        counts[code]++;
                    }
                });
            });
            return counts;
        }, [profiles, monthKey, jobRecords]);
    
        return (
            <div className="mt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Job Details</TableHead>
                            <TableHead className="text-right">Man-Days Count</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {JOB_CODES.map(jc => (
                            <TableRow key={jc.code}>
                                <TableCell className="font-bold">{jc.code}</TableCell>
                                <TableCell>{jc.details}</TableCell>
                                <TableCell className="text-right font-bold">{manDaysCount[jc.code] || 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };
    
    const renderTableForPlant = (plantName: string, profiles: typeof manpowerProfiles) => {
         if (profiles.length === 0) {
            return <div className="text-center p-8 text-muted-foreground">No employees assigned to this plant for this month.</div>
        }
        return (
            <>
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
                             <TableHead className="text-center min-w-[120px]">Over Time</TableHead>
                             <TableHead className="text-center min-w-[150px]">Total Standby/Training</TableHead>
                             <TableHead className="text-center min-w-[120px]">Total Working Days</TableHead>
                             <TableHead className="text-center min-w-[150px]">Total Rept/Office</TableHead>
                             <TableHead className="text-center min-w-[120px]">Salary Days</TableHead>
                             <TableHead className="text-center min-w-[150px]">Additional Sunday Duty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile, index) => {
                            const employeeRecord = jobRecordForMonth[profile.id]?.days || {};
                            
                            const offCodes = ['OFF', 'PH', 'OS'];
                            const leaveCodes = ['L', 'X', 'NWS'];
                            const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];
                            const workCodes = ["MTP","ZPT","ZE","MCT","ZCU","ZRS","ZPB","Z","RGR","ZC","ZP","DC","DRS","SP","DCR","SWS","DD","RRT","DA","ZPS","C2L","DP","SWR","SWP","NT","C2C","DR","2CL","C2M","IIR","PVS","MTM","MTB","MTT","MTF","MTS","KD","ZI","ZS","ZB","DRR","MTJ", "MTC", "CRY", "MTI", "MTL", "SWB"];
                            
                            const summary = dayHeaders.reduce((acc, day) => {
                                const code = employeeRecord[day];
                                if (offCodes.includes(code)) acc.offDays++;
                                if (leaveCodes.includes(code)) acc.leaveDays++;
                                if (code === 'ML') acc.medicalLeave++;
                                if (standbyCodes.includes(code)) acc.standbyTraining++;
                                if (code === 'R') acc.reptOffice++;
                                if (workCodes.includes(code)) acc.workDays++;
                                if (isSunday(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)) && code && !['OFF', 'PH', 'L', 'ML'].includes(code)) {
                                    acc.sundayDuty++;
                                }
                                return acc;
                            }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0, sundayDuty: 0 });

                            const salaryDays = summary.sundayDuty + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;

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
                                        const cellKey = `${profile.id}-${day}`;
                                        const code = localCellValues[cellKey] ?? employeeRecord[day] ?? '';
                                        const isOpen = activeCell?.profileId === profile.id && activeCell?.day === day;
                                        const colorInfo = JOB_CODE_COLORS[code] || {};
                                        return (
                                            <TableCell key={day} className="p-0 text-center">
                                                <Popover open={isOpen} onOpenChange={(openState) => setActiveCell(openState ? { profileId: profile.id, day } : null)}>
                                                    <PopoverTrigger asChild>
                                                        <Input
                                                            value={code}
                                                            onChange={(e) => setLocalCellValues(prev => ({...prev, [cellKey]: e.target.value.toUpperCase()}))}
                                                            onBlur={() => handleStatusChange(profile.id, day, code)}
                                                            className={cn("w-full h-full p-2 text-center font-bold border-0 rounded-none focus-visible:ring-1 focus-visible:ring-ring", colorInfo.bg, colorInfo.text)}
                                                        />
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <JobCodePicker 
                                                            onSelect={(newCode) => {
                                                                handleStatusChange(profile.id, day, newCode);
                                                                setActiveCell(null);
                                                            }} 
                                                            onOpenChange={(open) => setActiveCell(open ? {profileId: profile.id, day} : null)}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-center font-bold">{summary.offDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.leaveDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.medicalLeave}</TableCell>
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
                                    <TableCell className="text-center font-bold">{summary.standbyTraining}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.workDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.reptOffice}</TableCell>
                                    <TableCell className="text-center font-bold">{salaryDays}</TableCell>
                                    <TableCell className="text-center font-bold">{summary.sundayDuty}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
             <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="item-1">
                    <AccordionTrigger className="font-semibold">Job Code Legend & Man-Days Count</AccordionTrigger>
                    <AccordionContent>
                        <LegendTable profiles={profiles} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            </>
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
        </div>
    );
}
