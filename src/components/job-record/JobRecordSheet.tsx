
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Clock, UserX, PlusCircle, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal, Info, Edit, Trash2, Lock, Unlock, ArrowUp, ArrowDown, Settings, Search } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isAfter, isBefore, startOfToday, parseISO, isSameMonth, isValid, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import AddJobCodeDialog from './AddJobCodeDialog';
import type { JobCode, ManpowerProfile } from '@/lib/types';
import EditJobCodeDialog from './EditJobCodeDialog';
import AddJobRecordPlantDialog from './AddJobRecordPlantDialog';

const implementationStartDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed)

export default function JobRecordSheet() {
    const { user, manpowerProfiles, jobRecords, saveJobRecord, savePlantOrder, jobRecordPlants, projects, jobCodes, JOB_CODE_COLORS, deleteJobCode, can, lockJobRecordSheet, unlockJobRecordSheet } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfToday());
    const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
    const [isAddJobCodeOpen, setIsAddJobCodeOpen] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [editingJobCode, setEditingJobCode] = useState<JobCode | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState('Unassigned');
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    
    const monthKey = format(currentMonth, 'yyyy-MM');
    const prevMonthKey = format(subMonths(currentMonth, 1), 'yyyy-MM');
    
    const [cellStates, setCellStates] = useState<Record<string, string>>({});

    const jobRecordForMonth = useMemo(() => {
        return jobRecords[monthKey] || { records: {}, plantsOrder: {} };
    }, [jobRecords, monthKey]);

    const isCurrentSheetLocked = useMemo(() => {
        return jobRecords[monthKey]?.isLocked || false;
    }, [jobRecords, monthKey]);
    
    const prevJobRecordForMonth = useMemo(() => {
        return jobRecords[prevMonthKey] || { records: {}, plantsOrder: {} };
    }, [jobRecords, prevMonthKey]);

    const filteredAndGroupedProfiles = useMemo(() => {
        const filtered = searchTerm
            ? manpowerProfiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : manpowerProfiles;
        
        const groups: { [key: string]: ManpowerProfile[] } = {};
        const plantProjects = (jobRecordPlants || []).map(p => p.name);
        const availablePlants = new Set(plantProjects);
        availablePlants.add('Unassigned');

        availablePlants.forEach(p => groups[p] = []);

        filtered.forEach(profile => {
            const plantForCurrentMonth = jobRecordForMonth.records?.[profile.id]?.plant;
            const plantForPrevMonth = prevJobRecordForMonth.records?.[profile.id]?.plant;
            const plantAssignment = plantForCurrentMonth ?? plantForPrevMonth ?? 'Unassigned';

            if (groups[plantAssignment]) {
                groups[plantAssignment].push(profile);
            } else {
                groups['Unassigned'].push(profile);
            }
        });

        if (!searchTerm) {
            Object.keys(groups).forEach(plantName => {
                const currentOrder = jobRecordForMonth.plantsOrder?.[plantName];
                const prevOrder = prevJobRecordForMonth.plantsOrder?.[plantName];
                const order = currentOrder || prevOrder;

                groups[plantName].sort((a, b) => {
                    const plantForA_current = jobRecordForMonth.records?.[a.id]?.plant;
                    const plantForA_prev = prevJobRecordForMonth.records?.[a.id]?.plant;
                    const a_isNew = plantForA_current && plantForA_current !== plantForA_prev && plantForA_prev !== undefined;

                    const plantForB_current = jobRecordForMonth.records?.[b.id]?.plant;
                    const plantForB_prev = prevJobRecordForMonth.records?.[b.id]?.plant;
                    const b_isNew = plantForB_current && plantForB_current !== plantForB_prev && plantForB_prev !== undefined;
                    
                    if (a_isNew && !b_isNew) return 1;
                    if (!a_isNew && b_isNew) return -1;
                    
                    if (order && Array.isArray(order)) {
                        const indexA = order.indexOf(a.id);
                        const indexB = order.indexOf(b.id);
                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                    }
                    const originalAIndex = manpowerProfiles.findIndex(p => p.id === a.id);
                    const originalBIndex = manpowerProfiles.findIndex(p => p.id === b.id);
                    return originalAIndex - originalBIndex;
                });
            });
        }
        
        return groups;

    }, [manpowerProfiles, jobRecordForMonth, prevJobRecordForMonth, searchTerm, jobRecordPlants]);

    const batchUpdateJobRecords = useCallback((updates: { profileId: string; day: number; code: string }[]) => {
        updates.forEach(update => {
            saveJobRecord(monthKey, update.profileId, update.day, update.code, 'status');
        });
    }, [monthKey, saveJobRecord]);

    const [isDragging, setIsDragging] = useState(false);
    const [startCell, setStartCell] = useState<{ profileId: string; day: number } | null>(null);
    const [fillValue, setFillValue] = useState<string>('');
    const [endCell, setEndCell] = useState<{ profileId: string; day: number } | null>(null);
    const dragFillTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseUp = useCallback(() => {
        if (isDragging && startCell && endCell && fillValue) {
            const profiles = filteredAndGroupedProfiles[activeTab] || [];
            const startIndex = profiles.findIndex(p => p.id === startCell.profileId);
            const endIndex = profiles.findIndex(p => p.id === endCell.profileId);

            if (startIndex === -1 || endIndex === -1) {
                setIsDragging(false);
                setStartCell(null);
                setEndCell(null);
                setFillValue('');
                return;
            }

            const minRow = Math.min(startIndex, endIndex);
            const maxRow = Math.max(startIndex, endIndex);
            const minCol = Math.min(startCell.day, endCell.day);
            const maxCol = Math.max(startCell.day, endCell.day);

            const updates: { profileId: string; day: number; code: string }[] = [];
            const newCellStates = { ...cellStates };

            for (let i = minRow; i <= maxRow; i++) {
                const profileId = profiles[i].id;
                for (let j = minCol; j <= maxCol; j++) {
                    updates.push({ profileId, day: j, code: fillValue });
                    newCellStates[`${profileId}-${j}`] = fillValue;
                }
            }
            batchUpdateJobRecords(updates);
            setCellStates(newCellStates);
        }
        setIsDragging(false);
        setStartCell(null);
        setEndCell(null);
        setFillValue('');
    }, [isDragging, startCell, endCell, fillValue, batchUpdateJobRecords, cellStates, filteredAndGroupedProfiles, activeTab]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    const handleMouseDown = (profileId: string, day: number) => {
        setIsDragging(true);
        const cellId = `${profileId}-${day}`;
        const value = cellStates[cellId] || '';
        setStartCell({ profileId, day });
        setEndCell({ profileId, day });
        setFillValue(value);
    };

    const handleMouseEnter = (profileId: string, day: number) => {
        if (isDragging) {
            if (dragFillTimeoutRef.current) clearTimeout(dragFillTimeoutRef.current);
            dragFillTimeoutRef.current = setTimeout(() => setEndCell({ profileId, day }), 50);
        }
    };

    useEffect(() => {
        const newStates: Record<string, string> = {};
        if (jobRecordForMonth.records) {
            for (const profileId in jobRecordForMonth.records) {
                const record = jobRecordForMonth.records[profileId];
                if (record.days) {
                    for (const day in record.days) {
                        newStates[`${profileId}-${day}`] = record.days[day];
                    }
                }
            }
        }
        setCellStates(newStates);
    }, [jobRecordForMonth]);

    const getSelectionRange = () => {
        if (!isDragging || !startCell || !endCell) return null;
        const profiles = filteredAndGroupedProfiles[activeTab] || [];
        const startIndex = profiles.findIndex(p => p.id === startCell.profileId);
        const endIndex = profiles.findIndex(p => p.id === endCell.profileId);
    
        return {
            minRow: Math.min(startIndex, endIndex),
            maxRow: Math.max(startIndex, endIndex),
            minCol: Math.min(startCell.day, endCell.day),
            maxCol: Math.max(startCell.day, endCell.day),
        };
    };
    
    const selectionRange = getSelectionRange();
    
    const isCellInSelection = (profileId: string, day: number) => {
        if (!selectionRange) return false;
        const profiles = filteredAndGroupedProfiles[activeTab] || [];
        const rowIndex = profiles.findIndex(p => p.id === profileId);
        if(rowIndex === -1) return false;
        return (
            rowIndex >= selectionRange.minRow &&
            rowIndex <= selectionRange.maxRow &&
            day >= selectionRange.minCol &&
            day <= selectionRange.maxCol
        );
    };

    const handleStatusChange = useCallback((employeeId: string, day: number, value: string) => {
        const code = (value || '').toUpperCase() ?? '';
        const cellId = `${employeeId}-${day}`;

        setCellStates(prev => ({...prev, [cellId]: code }));

        const isValidCode = jobCodes.some(jc => jc.code === code) || code === '';

        if (!isValidCode && code !== '') {
            toast({
                title: "Invalid Job Code",
                description: `The code "${code}" is not a valid job code.`,
                variant: "destructive"
            });
            const previousCode = jobRecords[monthKey]?.records?.[employeeId]?.days?.[day] || '';
            setCellStates(prev => ({...prev, [cellId]: previousCode}));
            return;
        }
        
        saveJobRecord(monthKey, employeeId, day, code, 'status');
    
        if (code === '') {
            saveJobRecord(monthKey, employeeId, day, null, 'dailyOvertime');
        }
    }, [monthKey, saveJobRecord, jobCodes, toast, jobRecords]);
    
    const handleOvertimeChange = (employeeId: string, day: number, value: string) => {
        const record = jobRecordForMonth.records?.[employeeId] || {};
        const jobCodeForDay = record.days?.[day]?.toUpperCase();
        
        const restrictedCodes = ['X','KD','Q','ST','NWS','OS','ML','L','TR','PD','EP','OFF','PH'];
        if (jobCodeForDay && restrictedCodes.includes(jobCodeForDay)) {
            toast({
                title: "Invalid Overtime",
                description: `Overtime cannot be added for the job code "${jobCodeForDay}".`,
                variant: "destructive"
            });
            saveJobRecord(monthKey, employeeId, day, null, 'dailyOvertime');
            return;
        }

        if (value && !jobCodeForDay) {
            toast({
                title: "Cannot Add Overtime",
                description: "Overtime can only be added to a day with a valid job code.",
                variant: "destructive"
            });
            saveJobRecord(monthKey, employeeId, day, null, 'dailyOvertime');
            return;
        }
        
        const hours = Number(value);
        const finalHours = isNaN(hours) || hours <= 0 ? null : hours;
        saveJobRecord(monthKey, employeeId, day, finalHours, 'dailyOvertime');
    };
    
    const handlePlantChange = (employeeId: string, plant: string) => {
       saveJobRecord(monthKey, employeeId, 0, plant, 'plant');
    }
    
    const handleSundayDutySave = (employeeId: string, value: string) => {
        const days = value === '' ? null : parseInt(value, 10);
        if (days !== null && !isNaN(days) && days >= 0) {
            saveJobRecord(monthKey, employeeId, days, 'sundayDuty', 'sundayDuty');
        } else if (value === '') {
             saveJobRecord(monthKey, employeeId, null, 'sundayDuty', 'sundayDuty');
        }
    };
    
    const plantProjects = useMemo(() => {
        return (jobRecordPlants || []).map(p => p.name).sort();
    }, [jobRecordPlants]);

    useEffect(() => {
        if (plantProjects.length > 0 && !plantProjects.includes(activeTab) && activeTab !== 'Unassigned') {
            setActiveTab(plantProjects[0]);
        }
    }, [plantProjects, activeTab]);
    
    const toggleRow = (profileId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(profileId)) {
                newSet.delete(profileId);
            } else {
                newSet.add(profileId);
            }
            return newSet;
        });
    };
    
    const allTabs = Array.from(new Set(['Unassigned', ...plantProjects])).sort();
    
    const canGoToPreviousMonth = useMemo(() => {
      const firstDayOfCurrentMonth = startOfMonth(currentMonth);
      return isAfter(firstDayOfCurrentMonth, implementationStartDate);
    }, [currentMonth]);
    
    const canGoToNextMonth = useMemo(() => isBefore(currentMonth, startOfToday()), [currentMonth]);

    const isEditableMonth = useMemo(() => isSameMonth(currentMonth, new Date()), [currentMonth]);
    
    const canEditSheet = useMemo(() => {
        if (!user) return false;
        if (user.role === 'Admin') return true;
        return can.manage_job_record && !isCurrentSheetLocked;
    }, [user, can.manage_job_record, isCurrentSheetLocked]);
    
    const manDaysCountByCodeForCurrentTab = useMemo(() => {
        if (!jobCodes) return {};
        const counts: { [key: string]: number } = {};
        jobCodes.forEach(jc => counts[jc.code] = 0);

        const profilesInTab = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : (filteredAndGroupedProfiles[activeTab] || []);
        profilesInTab.forEach(p => {
            const record = jobRecordForMonth.records?.[p.id];
            const days = record?.days || {};
            Object.values(days).forEach(code => {
                if (counts.hasOwnProperty(code as string)) {
                    counts[code as string]++;
                }
            });
        });
        return counts;
    }, [jobRecordForMonth, activeTab, jobCodes, filteredAndGroupedProfiles, searchTerm]);
    
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
    
        allTabs.forEach(plant => {
            const profiles = filteredAndGroupedProfiles[plant];
            if (!profiles || profiles.length === 0) return;
    
            const ws_data: any[][] = [];
            ws_data.push([`Job Record for ${format(currentMonth, 'MMMM yyyy')} - Plant: ${plant}`]);
            ws_data.push([]);
            const dayHeadersExcel = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);
            const header = ['S.No', 'Name', ...dayHeadersExcel.map(String), 'Total OFF', 'Total Leave', 'Total ML', 'Over Time', 'Total Standby/Training', 'Total working Days', 'Total Rept/Office', 'Salary Days', 'Additional Sunday Duty'];
            ws_data.push(header);
    
            profiles.forEach((profile, rIndex) => {
                const record = jobRecordForMonth.records?.[profile.id] || {};
                const employeeRecord = record.days || {};
                const dailyOvertime = record.dailyOvertime || {};
                const offCodes = ['OFF', 'PH', 'OS'];
                const leaveCodes = ['L', 'X', 'NWS'];
                const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];
                const workCodes = jobCodes ? jobCodes.filter(jc => !['X', 'KD', 'Q', 'ST', 'NWS', 'R', 'OS', 'ML', 'L', 'TR', 'PD', 'EP', 'OFF', 'PH', 'S', 'CQ', 'RST'].includes(jc.code)).map(jc => jc.code) : [];
                const summary = dayHeadersExcel.reduce((acc, day) => {
                    const code = employeeRecord[day];
                    if (offCodes.includes(code)) acc.offDays++;
                    if (leaveCodes.includes(code)) acc.leaveDays++;
                    if (code === 'ML') acc.medicalLeave++;
                    if (standbyCodes.includes(code)) acc.standbyTraining++;
                    if (code === 'R') acc.reptOffice++;
                    if (workCodes.includes(code)) acc.workDays++;
                    return acc;
                }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0 });
                const totalOvertime = Object.values(dailyOvertime).reduce((sum, hours) => sum + (hours || 0), 0);
                const additionalSundays = record.additionalSundayDuty || 0;
                const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;
    
                const rowData: any[] = [rIndex + 1, profile.name];
                dayHeadersExcel.forEach(day => {
                    const code = employeeRecord[day] || '';
                    const overtimeForDay = dailyOvertime[day];
                    const cell: {v: string, c?: any[]} = { v: code };

                    if (overtimeForDay && overtimeForDay > 0) {
                        cell.c = [{ a: "Overtime", t: `Hours: ${overtimeForDay}`, hidden: true }];
                    }
                    rowData.push(cell);
                });
                rowData.push(summary.offDays, summary.leaveDays, summary.medicalLeave, totalOvertime, summary.standbyTraining, summary.workDays, summary.reptOffice, salaryDays, additionalSundays);
                ws_data.push(rowData);
            });
    
            const ws = XLSX.utils.aoa_to_sheet(ws_data, { cellStyles: true });
            
            ws_data.forEach((row, r) => {
              if (r < 3) return;
              row.forEach((cellData, c) => {
                  if (c >= 2 && c < dayHeadersExcel.length + 2) {
                      const code = (typeof cellData === 'object' && cellData !== null && 'v' in cellData) ? cellData.v : cellData;
                      const cellAddress = XLSX.utils.encode_cell({ r, c });
                      if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: code };

                      const colorInfo = JOB_CODE_COLORS[code as string];
                      if (colorInfo?.excelFill) {
                          ws[cellAddress].s = {
                             fill: { patternType: "solid", fgColor: colorInfo.excelFill.fgColor },
                             font: colorInfo.excelFill.font || {}
                         };
                      }
                  }
              });
            });
            
            ws['!cols'] = [{ wch: 5 }, { wch: 25 }, ...dayHeadersExcel.map(() => ({ wch: 7 })), { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }];
    
            const legendStartRow = ws_data.length + 2;
            XLSX.utils.sheet_add_aoa(ws, [[]], { origin: -1 }); 
            XLSX.utils.sheet_add_aoa(ws, [['Job Code Legend & Man-Days Count']], { origin: -1 });
            XLSX.utils.sheet_add_aoa(ws, [['Code', 'Job Details', 'Man-Days']], { origin: -1 });
            
            if (jobCodes) {
              const manDaysCount = jobCodes.reduce((acc, jc) => {
                  acc[jc.code] = 0;
                  return acc;
              }, {} as {[key: string]: number});
              
              profiles.forEach(p => {
                  const record = jobRecordForMonth.records?.[p.id];
                  const days = record?.days || {};
                  Object.values(days).forEach(code => {
                      if (manDaysCount.hasOwnProperty(code as string)) {
                          manDaysCount[code as string]++;
                      }
                  });
              });
              jobCodes.forEach(jc => {
                 XLSX.utils.sheet_add_aoa(ws, [[jc.code, jc.details, manDaysCount[jc.code] || 0]], { origin: -1 });
              });
            }
    
            XLSX.utils.book_append_sheet(wb, ws, plant);
        });
    
        if(wb.SheetNames.length > 0) {
            XLSX.writeFile(wb, `JobRecord_${monthKey}.xlsx`);
        } else {
            toast({ variant: 'destructive', title: 'No Data', description: `No employees assigned to any plant to export.` });
        }
    };
    
    const handleMoveRow = (profileId: string, direction: 'up' | 'down') => {
        const currentProfiles = filteredAndGroupedProfiles[activeTab];
        if (!currentProfiles) return;

        const index = currentProfiles.findIndex(p => p.id === profileId);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentProfiles.length) return;

        const newOrder = [...currentProfiles];
        const [movedItem] = newOrder.splice(index, 1);
        newOrder.splice(targetIndex, 0, movedItem);

        const newOrderIds = newOrder.map(p => p.id);
        savePlantOrder(monthKey, activeTab, newOrderIds);
    };

    const dayHeaders = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);

    const handleDeleteJobCode = (id: string) => {
        deleteJobCode(id);
        toast({ title: 'Job Code Deleted', variant: 'destructive' });
    }

    const searchResults = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : [];

    return (
        <TooltipProvider>
            <datalist id="jobcodes-datalist">
                {jobCodes && jobCodes.map(jc => (
                    <option key={jc.id} value={jc.code} />
                ))}
            </datalist>
            <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
                {/* Header Section */}
                <div className="p-4 border-b bg-card shrink-0 space-y-4 sticky top-0 z-30">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={!canGoToPreviousMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-lg font-semibold flex items-center gap-2">
                                {format(currentMonth, 'MMMM yyyy')}
                                {isCurrentSheetLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                            </span>
                            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} disabled={!canGoToNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="relative ml-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name..."
                                    className="pl-9 w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={exportToExcel}><Download className="mr-2 h-4 w-4"/>Export All to Excel</Button>
                            {user?.role === 'Admin' && (
                                <>
                                    <Button onClick={() => setIsAddJobCodeOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add Job Code</Button>
                                    <Button onClick={() => setIsAddPlantOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add New Plant</Button>
                                </>
                            )}
                            {canEditSheet && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => setIsReorderMode(!isReorderMode)}><Settings className="h-4 w-4" /></Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Toggle Reorder Mode</p></TooltipContent>
                            </Tooltip>
                            )}
                             {can.manage_job_record && !isCurrentSheetLocked && isEditableMonth && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive"><Lock className="mr-2 h-4 w-4" /> Lock Sheet</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Lock Job Record Sheet?</AlertDialogTitle><AlertDialogDescription>Locking this sheet will prevent further edits by non-admin users. This should only be done when the month's record is final.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => lockJobRecordSheet(monthKey)}>Confirm Lock</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {user?.role === 'Admin' && isCurrentSheetLocked && (
                                <Button variant="secondary" onClick={() => unlockJobRecordSheet(monthKey)}>
                                    <Unlock className="mr-2 h-4 w-4" /> Unlock Sheet
                                </Button>
                            )}
                        </div>
                    </div>
                     <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full justify-start h-auto">
                            {allTabs.map(plant => <TabsTrigger key={plant} value={plant} className="flex-1">{plant}</TabsTrigger>)}
                        </TabsList>
                     </Tabs>
                </div>
                
                <div className="flex-1 overflow-auto visible-scrollbar">
                    <Table className="min-w-full border-collapse">
                        <thead className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="sticky left-0 bg-background z-20 w-[120px] border-r">S.No / Actions</TableHead>
                                <TableHead className="sticky left-[120px] bg-background z-20 min-w-[200px] border-r">Name / EP No.</TableHead>
                                <TableHead className="sticky left-[320px] bg-background z-20 min-w-[150px] border-r">Plant</TableHead>
                                {dayHeaders.map(day => (
                                    <TableHead key={day} className="text-center min-w-[100px] border-r">
                                        {day}
                                    </TableHead>
                                ))}
                                <TableHead className="text-center min-w-[150px] border-r">Total OFF</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Leave</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total ML</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Over Time</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Standby/Training</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Working Days</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Total Rept/Office</TableHead>
                                <TableHead className="text-center min-w-[150px] border-r">Salary Days</TableHead>
                                <TableHead className="text-center min-w-[150px]">Additional Sunday Duty</TableHead>
                            </TableRow>
                        </thead>
                        <TableBody>
                            {(searchTerm ? searchResults : (filteredAndGroupedProfiles[activeTab] || [])).map((profile, index) => {
                                const record = jobRecordForMonth.records?.[profile.id] || {};
                                const employeeRecord = record.days || {};
                                const dailyOvertime = record.dailyOvertime || {};
                                
                                const workCodes = jobCodes ? jobCodes.filter(jc => !['X', 'KD', 'Q', 'ST', 'NWS', 'R', 'OS', 'ML', 'L', 'TR', 'PD', 'EP', 'OFF', 'PH', 'S', 'CQ', 'RST'].includes(jc.code)).map(jc => jc.code) : [];
                                const offCodes = ['OFF', 'PH', 'OS'];
                                const leaveCodes = ['L', 'X', 'NWS'];
                                const standbyCodes = ['ST', 'TR', 'EP', 'PD', 'Q'];

                                const summary = dayHeaders.reduce((acc, day) => {
                                    const code = employeeRecord[day];
                                    if (offCodes.includes(code)) acc.offDays++;
                                    else if (leaveCodes.includes(code)) acc.leaveDays++;
                                    else if (code === 'ML') acc.medicalLeave++;
                                    else if (standbyCodes.includes(code)) acc.standbyTraining++;
                                    else if (code === 'R') acc.reptOffice++;
                                    else if (workCodes.includes(code)) acc.workDays++;
                                    return acc;
                                }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0 });

                                const totalOvertime = Object.values(dailyOvertime).reduce((sum, hours) => sum + (hours || 0), 0);
                                const additionalSundays = record.additionalSundayDuty || 0;
                                const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + summary.workDays;
                                const isExpanded = expandedRows.has(profile.id);

                                return (
                                    <React.Fragment key={profile.id}>
                                    <TableRow>
                                        <TableCell className="sticky left-0 bg-background z-20 flex items-center border-r">
                                            <div className="flex items-center">
                                                <span className="w-6 text-center">{index + 1}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRow(profile.id)}>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                                                </Button>
                                                {isReorderMode && (
                                                    <div className="flex flex-col">
                                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleMoveRow(profile.id, 'up')} disabled={index === 0}><ArrowUp className="h-3 w-3"/></Button>
                                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleMoveRow(profile.id, 'down')} disabled={index === (filteredAndGroupedProfiles[activeTab]?.length || 0) - 1}><ArrowDown className="h-3 w-3"/></Button>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="sticky left-[120px] bg-background z-20 font-medium whitespace-nowrap border-r">
                                            <p>{profile.name}</p>
                                            <p className="text-xs text-muted-foreground">{profile.epNumber || 'No EP No.'}</p>
                                        </TableCell>
                                        <TableCell className="sticky left-[320px] bg-background z-20 font-medium whitespace-nowrap border-r">
                                        <Select defaultValue={record.plant || 'Unassigned'} onValueChange={(value) => handlePlantChange(profile.id, value)} disabled={!canEditSheet}>
                                                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                                                    {plantProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        {dayHeaders.map(day => {
                                            const code = cellStates[`${profile.id}-${day}`] || '';
                                            const overtimeForDay = dailyOvertime[day] || 0;
                                            const colorInfo = JOB_CODE_COLORS[code as string] || {};
                                            const isInSelection = isCellInSelection(profile.id, day);

                                            return (
                                                <TableCell 
                                                    key={day} 
                                                    className="p-0 text-center relative min-w-[100px] border-r"
                                                    onMouseEnter={() => handleMouseEnter(profile.id, day)}
                                                >
                                                    <div className={cn("relative h-10 flex items-center justify-center", isInSelection && "bg-blue-200/50")}>
                                                        <Input
                                                            id={`${profile.id}-${day}`}
                                                            type="text"
                                                            list="jobcodes-datalist"
                                                            value={code}
                                                            onChange={(e) => setCellStates(prev => ({...prev, [`${profile.id}-${day}`]: e.target.value}))}
                                                            onBlur={(e) => handleStatusChange(profile.id, day, e.target.value)}
                                                            className={cn(
                                                                "w-full h-full text-center font-bold rounded-none border-0 focus:ring-1 focus:ring-offset-0 focus:ring-ring",
                                                                code ? colorInfo.bg : 'bg-transparent',
                                                                code ? colorInfo.text : 'text-foreground'
                                                            )}
                                                            style={{ boxShadow: 'none' }}
                                                            disabled={!canEditSheet}
                                                        />
                                                        {overtimeForDay > 0 && (
                                                            <Tooltip>
                                                            <TooltipTrigger className="absolute right-1 top-1 h-3 w-3">
                                                                <Clock className="h-full w-full text-blue-500" />
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>{overtimeForDay} hours OT</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {canEditSheet && (
                                                            <div 
                                                                onMouseDown={() => handleMouseDown(profile.id, day)}
                                                                className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary border-2 border-background rounded-full cursor-crosshair z-30"
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.offDays}</TableCell>
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.leaveDays}</TableCell>
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.medicalLeave}</TableCell>
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{totalOvertime}</TableCell>
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.standbyTraining}</TableCell>
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.workDays}</TableCell>
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{summary.reptOffice}</TableCell>
                                        <TableCell className="text-center font-bold border-r min-w-[150px]">{salaryDays}</TableCell>
                                        <TableCell className="text-center min-w-[150px]">
                                            <Input
                                                type="number"
                                                defaultValue={record.additionalSundayDuty || ''}
                                                onBlur={(e) => handleSundayDutySave(profile.id, e.target.value)}
                                                className="w-16 h-8 text-center"
                                                placeholder="0"
                                                disabled={!canEditSheet}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="sticky left-0 bg-muted/50 text-right font-semibold text-xs pr-4 z-20 border-r">Overtime Hours</TableCell>
                                            {dayHeaders.map(day => {
                                                return (
                                                    <TableCell key={`ot-${day}`} className="p-0 bg-muted/50 border-r">
                                                        <Input
                                                            id={`${profile.id}-${day}-overtime`}
                                                            type="number"
                                                            placeholder="0"
                                                            defaultValue={dailyOvertime[day] || ''}
                                                            onBlur={(e) => handleOvertimeChange(profile.id, day, e.target.value)}
                                                            className="w-full h-8 text-center border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                                                            disabled={!canEditSheet}
                                                        />
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell colSpan={9} className="bg-muted/50"></TableCell>
                                        </TableRow>
                                    )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="shrink-0 z-20 border-t bg-card">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="p-3 text-sm font-semibold hover:no-underline">
                                <div className="flex items-center gap-2"><Info className="h-4 w-4"/>Job Code Legend & Man-Days Count for {searchTerm ? "All Plants" : activeTab}</div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-4">
                                {jobCodes && jobCodes.map(jc => (
                                    <div key={jc.id} className="flex items-start gap-4 text-xs">
                                        <div className="font-bold w-12">{jc.code}</div>
                                        <div className="flex-1">
                                            <p>{jc.details}</p>
                                            {jc.jobNo && <p className="text-muted-foreground">Job No: {jc.jobNo}</p>}
                                        </div>
                                        <div className="font-semibold">{manDaysCountByCodeForCurrentTab[jc.code] || 0}</div>
                                        {user?.role === 'Admin' && (
                                            <div className="flex">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingJobCode(jc)}><Edit className="h-3 w-3"/></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80"><Trash2 className="h-3 w-3"/></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Job Code {jc.code}?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteJobCode(jc.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        )}
                                    </div>
                                ))}
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
            <AddJobRecordPlantDialog isOpen={isAddPlantOpen} setIsOpen={setIsAddPlantOpen} />
            <AddJobCodeDialog isOpen={isAddJobCodeOpen} setIsOpen={setIsAddJobCodeOpen} />
            {editingJobCode && <EditJobCodeDialog isOpen={!!editingJobCode} setIsOpen={() => setEditingJobCode(null)} jobCode={editingJobCode} />}
        </TooltipProvider>
    );
}
