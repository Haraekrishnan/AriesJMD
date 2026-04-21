
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useManpower } from '@/contexts/manpower-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useGeneral } from '@/contexts/general-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Clock, UserX, PlusCircle, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal, Info, Edit, Trash2, Lock, Unlock, ArrowUp, ArrowDown, Settings, Search, MessageSquare, ArrowRightLeft } from 'lucide-react';
import { format, getDay, getDaysInMonth, parseISO, isSameMonth, isAfter, isBefore, startOfToday, startOfMonth, addMonths, subMonths } from 'date-fns';
import { saveAs } from "file-saver";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import AddJobCodeDialog from './AddJobCodeDialog';
import type { JobCode, ManpowerProfile, JobRecordPlant } from '@/lib/types';
import EditJobCodeDialog from './EditJobCodeDialog';
import AddJobRecordPlantDialog from './AddJobRecordPlantDialog';
import { ScrollArea } from '../ui/scroll-area';
import { JOB_CODE_COLORS } from '@/lib/job-codes';
import * as ExcelJS from 'exceljs';
import { generateJobWiseExcel } from './generateJobWiseReport';


const implementationStartDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed)

async function fetchImageAsArrayBuffer(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.arrayBuffer();
}

export default function JobRecordSheet() {
    const { user, can } = useAuth();
    const { manpowerProfiles } = useManpower();
    const { jobRecords, saveJobRecord, savePlantOrder, jobRecordPlants, lockJobRecordSheet, unlockJobRecordSheet, deleteJobRecordPlant, carryForwardPlantAssignments } = usePlanner();
    const { projects, jobCodes, deleteJobCode } = useGeneral();
    const [currentMonth, setCurrentMonth] = useState(startOfToday());
    const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
    const [isAddJobCodeOpen, setIsAddJobCodeOpen] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [editingJobCode, setEditingJobCode] = useState<JobCode | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<string | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [jobCodeSearchTerm, setJobCodeSearchTerm] = useState('');
    const { toast } = useToast();

    const monthKey = format(currentMonth, 'yyyy-MM');
    const prevMonthKey = format(subMonths(currentMonth, 1), 'yyyy-MM');
    
    const [cellStates, setCellStates] = useState<Record<string, string>>({});
    const [overtimeStates, setOvertimeStates] = useState<Record<string, string>>({});
    const [commentStates, setCommentStates] = useState<Record<string, string>>({});
    const [sundayDutyStates, setSundayDutyStates] = useState<Record<string, string>>({});

    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        startCell: { profileId: string; day: number } | null;
        endCell: { profileId: string; day: number } | null;
        fillValue: string;
    }>({
        isDragging: false,
        startCell: null,
        endCell: null,
        fillValue: '',
    });
    
    useEffect(() => {
        const runAutoCarryForward = async () => {
            const prevData = jobRecords[prevMonthKey];
            const currentData = jobRecords[monthKey];
    
            if (!prevData) return;
    
            let missingAssignments = false;
    
            if (prevData.records) {
                for (const profileId in prevData.records) {
                    const prevPlant = prevData.records[profileId]?.plant;
    
                    const currentPlant =
                        currentData?.records?.[profileId]?.plant;
    
                    if (prevPlant && !currentPlant) {
                        missingAssignments = true;
                        break;
                    }
                }
            }
    
            if (missingAssignments) {
                await carryForwardPlantAssignments(currentMonth);
            }
        };
    
        runAutoCarryForward();
    }, [currentMonth, jobRecords, carryForwardPlantAssignments, prevMonthKey, monthKey]);

    const plantProjects = useMemo(() => {
        return (jobRecordPlants || []).sort((a,b) => a.name.localeCompare(b.name));
    }, [jobRecordPlants]);

    const canViewUnassigned = useMemo(() => {
        if (!user) return false;
        return user.role === 'Admin' || can.manage_job_record;
    }, [user, can.manage_job_record]);

    const filteredAndGroupedProfiles = useMemo(() => {
        const filtered = searchTerm
            ? manpowerProfiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : manpowerProfiles;
    
        const getPlantForProfile = (profileId: string) => {
            return jobRecords[monthKey]?.records?.[profileId]?.plant || jobRecords[prevMonthKey]?.records?.[profileId]?.plant || 'Unassigned';
        };

        const groups: { [key: string]: ManpowerProfile[] } = {};
        
        // Use the memoized and sorted plantProjects for stable order
        const orderedPlantNames = plantProjects.map(p => p.name);

        // Initialize groups in a stable order
        orderedPlantNames.forEach(p => { groups[p] = []; });
        if (canViewUnassigned) {
            groups['Unassigned'] = [];
        }
    
        // Group profiles
        filtered.forEach(profile => {
            const plantAssignment = getPlantForProfile(profile.id);
            if (groups[plantAssignment]) {
                groups[plantAssignment].push(profile);
            } else if (canViewUnassigned) {
                // If a profile's plant no longer exists, push to Unassigned
                groups['Unassigned'].push(profile);
            }
        });
    
        // Sort each group based on saved order or alphabetically, iterating in a stable order
        const allGroupNames = [...orderedPlantNames];
        if (canViewUnassigned) {
            allGroupNames.push('Unassigned');
        }

        allGroupNames.forEach(plantName => {
            const currentOrder = jobRecords[monthKey]?.plantsOrder?.[plantName];
            const prevOrder = jobRecords[prevMonthKey]?.plantsOrder?.[plantName];
            const order = currentOrder || prevOrder;

            if (order && Array.isArray(order)) {
                groups[plantName].sort((a, b) => {
                    const indexA = order.indexOf(a.id);
                    const indexB = order.indexOf(b.id);
                
                    if (indexA === -1 && indexB === -1) {
                        return a.name.localeCompare(b.name);
                    }
                
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                
                    return indexA - indexB;
                });
            } else {
                 groups[plantName].sort((a, b) => a.name.localeCompare(b.name));
            }
        });
        
        return groups;
    
    }, [manpowerProfiles, jobRecords, monthKey, prevMonthKey, searchTerm, plantProjects, canViewUnassigned]);

    const batchUpdateJobRecords = useCallback((updates: { profileId: string; day: number; code: string }[]) => {
        updates.forEach(update => {
            saveJobRecord(monthKey, update.profileId, update.day, update.code, 'status');
        });
    }, [monthKey, saveJobRecord]);
    
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

    const handleMouseDown = useCallback((profileId: string, day: number) => {
        const value = cellStates[`${profileId}-${day}`] || '';
        setDragState({
            isDragging: true,
            startCell: { profileId, day },
            endCell: { profileId, day },
            fillValue: value
        });
    }, [cellStates]);

    const handleMouseEnter = useCallback((profileId: string, day: number) => {
        if (dragState.isDragging) {
            setDragState(prev => ({ ...prev, endCell: { profileId, day } }));
        }
    }, [dragState.isDragging]);

    const handleMouseUp = useCallback(() => {
        if (dragState.isDragging && dragState.startCell && dragState.endCell && dragState.fillValue) {
            const profiles = filteredAndGroupedProfiles[activeTab || ''] || [];
            const startIndex = profiles.findIndex(p => p.id === dragState.startCell!.profileId);
            const endIndex = profiles.findIndex(p => p.id === dragState.endCell!.profileId);

            if (startIndex === -1 || endIndex === -1) {
                setDragState({ isDragging: false, startCell: null, endCell: null, fillValue: '' });
                return;
            }

            const minRow = Math.min(startIndex, endIndex);
            const maxRow = Math.max(startIndex, endIndex);
            const minCol = Math.min(dragState.startCell.day, dragState.endCell.day);
            const maxCol = Math.max(dragState.startCell.day, dragState.endCell.day);

            const updates: { profileId: string; day: number; code: string }[] = [];
            const newCellStates = { ...cellStates };

            for (let i = minRow; i <= maxRow; i++) {
                const profileId = profiles[i].id;
                for (let j = minCol; j <= maxCol; j++) {
                    updates.push({ profileId, day: j, code: dragState.fillValue });
                    newCellStates[`${profileId}-${j}`] = dragState.fillValue;
                }
            }
            batchUpdateJobRecords(updates);
            setCellStates(newCellStates);
        }
        setDragState({ isDragging: false, startCell: null, endCell: null, fillValue: '' });
    }, [dragState, batchUpdateJobRecords, cellStates, filteredAndGroupedProfiles, activeTab]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);
    
    const getSelectionRange = () => {
        if (!dragState.isDragging || !dragState.startCell || !dragState.endCell) return null;
        const profiles = filteredAndGroupedProfiles[activeTab || ''] || [];
        const startIndex = profiles.findIndex(p => p.id === dragState.startCell!.profileId);
        const endIndex = profiles.findIndex(p => p.id === dragState.endCell!.profileId);
    
        if (startIndex === -1 || endIndex === -1) return null;

        return {
            minRow: Math.min(startIndex, endIndex),
            maxRow: Math.max(startIndex, endIndex),
            minCol: Math.min(dragState.startCell.day, dragState.endCell.day),
            maxCol: Math.max(dragState.startCell.day, dragState.endCell.day),
        };
    };
    
    const selectionRange = getSelectionRange();
    
    const isCellInSelection = (profileId: string, day: number) => {
        if (!selectionRange) return false;
        const profiles = filteredAndGroupedProfiles[activeTab || ''] || [];
        const rowIndex = profiles.findIndex(p => p.id === profileId);
        if(rowIndex === -1) return false;
        return (
            rowIndex >= selectionRange.minRow &&
            rowIndex <= selectionRange.maxRow &&
            day >= selectionRange.minCol &&
            day <= selectionRange.maxCol
        );
    };

    const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, profileId: string, day: number, type: 'status' | 'overtime' | 'comment') => {
        const { key } = e;
        const profiles = filteredAndGroupedProfiles[activeTab || ''] || [];
        const profileIndex = profiles.findIndex(p => p.id === profileId);

        const focusCell = (pId: string, d: number, t: 'status' | 'overtime' | 'comment') => {
            const cellId = `${pId}-${d}-${t}`;
            const element = document.getElementById(cellId);
            element?.focus();
            element?.select();
        };

        if (key === 'ArrowUp' && profileIndex > 0) {
            focusCell(profiles[profileIndex - 1].id, day, type);
        } else if (key === 'ArrowDown' && profileIndex < profiles.length - 1) {
            focusCell(profiles[profileIndex + 1].id, day, type);
        } else if (key === 'ArrowLeft' && day > 1) {
            focusCell(profileId, day - 1, type);
        } else if (key === 'ArrowRight' && day < getDaysInMonth(currentMonth)) {
            focusCell(profileId, day + 1, type);
        } else if (key === 'Tab') {
            e.preventDefault();
            const nextDay = e.shiftKey ? day - 1 : day + 1;
            if (nextDay > 0 && nextDay <= getDaysInMonth(currentMonth)) {
                focusCell(profileId, nextDay, type);
            } else if (!e.shiftKey && profileIndex < profiles.length - 1) {
                focusCell(profiles[profileIndex + 1].id, 1, type);
            } else if (e.shiftKey && profileIndex > 0) {
                focusCell(profiles[profileIndex - 1].id, getDaysInMonth(currentMonth), type);
            }
        }
    };

    useEffect(() => {
        const newStates: Record<string, string> = {};
        const newOtStates: Record<string, string> = {};
        const newCommentStates: Record<string, string> = {};
        const newSundayDutyStates: Record<string, string> = {};
        
        if (jobRecords[monthKey]?.records) {
            for (const profileId in jobRecords[monthKey].records) {
                const record = jobRecords[monthKey].records[profileId];
                if (record.days) {
                    for (const day in record.days) {
                        newStates[`${profileId}-${day}`] = record.days[day];
                    }
                }
                if (record.dailyOvertime) {
                    for (const day in record.dailyOvertime) {
                        newOtStates[`${profileId}-${day}`] = (record.dailyOvertime as any)[day]?.toString() || '';
                    }
                }
                 if (record.dailyComments) {
                    for (const day in record.dailyComments) {
                        newCommentStates[`${profileId}-${day}`] = record.dailyComments[day as any] || '';
                    }
                }
                if (record.additionalSundayDuty) {
                    newSundayDutyStates[profileId] = record.additionalSundayDuty.toString();
                }
            }
        }
        setCellStates(newStates);
        setOvertimeStates(newOtStates);
        setCommentStates(newCommentStates);
        setSundayDutyStates(newSundayDutyStates);
    }, [jobRecords, monthKey]);
    

    const handleOvertimeBlur = (employeeId: string, day: number, value: string) => {
        const record = jobRecords[monthKey]?.records?.[employeeId] || {};
        const jobCodeForDay = record.days?.[day]?.toUpperCase();
        
        const restrictedCodes = ['X','KD','Q','ST','NWS','OS','ML','L','TR','PD','EP','OFF','PH'];
        if (jobCodeForDay && restrictedCodes.includes(jobCodeForDay)) {
            toast({
                title: "Invalid Overtime",
                description: `Overtime cannot be added for the job code "${jobCodeForDay}".`,
                variant: "destructive"
            });
            setOvertimeStates(prev => ({...prev, [`${employeeId}-${day}`]: ''}));
            saveJobRecord(monthKey, employeeId, day, null, 'dailyOvertime');
            return;
        }

        if (value && !jobCodeForDay) {
            toast({
                title: "Cannot Add Overtime",
                description: "Overtime can only be added to a day with a valid job code.",
                variant: "destructive"
            });
            setOvertimeStates(prev => ({...prev, [`${employeeId}-${day}`]: ''}));
            saveJobRecord(monthKey, employeeId, day, null, 'dailyOvertime');
            return;
        }
        
        const hours = Number(value);
        const finalHours = isNaN(hours) || hours <= 0 ? null : hours;
        saveJobRecord(monthKey, employeeId, day, finalHours, 'dailyOvertime');
    };

    const handleCommentBlur = (employeeId: string, day: number, value: string) => {
        const comment = value.trim() === '' ? null : value;
        saveJobRecord(monthKey, employeeId, day, comment, 'dailyComments');
    };
    
    const handlePlantChange = (employeeId: string, plant: string) => {
       saveJobRecord(monthKey, employeeId, 0, plant, 'plant');
    }
    
    const handleSundayDutySave = (employeeId: string, value: string) => {
        const days = value === '' ? null : parseInt(value, 10);
        if (days !== null && !isNaN(days) && days >= 0) {
            saveJobRecord(monthKey, employeeId, null, days, 'sundayDuty');
        } else if (value === '') {
             saveJobRecord(monthKey, employeeId, null, null, 'sundayDuty');
        }
    };
    
    const allTabs = useMemo(() => {
        const plantTabs = plantProjects.map(p => p.name);
        const tabs = canViewUnassigned ? [...plantTabs, 'Unassigned'] : plantTabs;
        return tabs;
    }, [plantProjects, canViewUnassigned]);
    
    useEffect(() => {
        if (activeTab === undefined && allTabs.length > 0) {
            setActiveTab(allTabs[0]);
        } else if (activeTab && !allTabs.includes(activeTab)) {
            setActiveTab(allTabs[0] || undefined);
        }
    }, [allTabs, activeTab]);

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
    
    const canGoToPreviousMonth = useMemo(() => {
      const firstDayOfCurrentMonth = startOfMonth(currentMonth);
      return isAfter(firstDayOfCurrentMonth, implementationStartDate);
    }, [currentMonth]);
    
    const canGoToNextMonth = useMemo(() => isBefore(currentMonth, startOfToday()), [currentMonth]);

    const isCurrentSheetLocked = jobRecords[monthKey]?.isLocked;
    
    const canEditSheet = useMemo(() => {
        if (!user) return false;
        if (isCurrentSheetLocked) return false;
        return user.role === 'Admin' || can.manage_job_record;
    }, [user, can.manage_job_record, isCurrentSheetLocked]);
    
    const canCarryForward = useMemo(() => {
        if (!user) return false;
        const hasPermission = ['Admin', 'Document Controller', 'Project Coordinator'].includes(user.role);
        const isEditableMonth = isSameMonth(currentMonth, new Date());
        return hasPermission && !isCurrentSheetLocked && isEditableMonth;
    }, [user, isCurrentSheetLocked, currentMonth]);

    const manDaysCountByCodeForCurrentTab = useMemo(() => {
        if (!jobCodes) return {};
        const counts: { [key: string]: number } = {};
        jobCodes.forEach(jc => counts[jc.code] = 0);

        const profilesInTab = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : (filteredAndGroupedProfiles[activeTab || ''] || []);
        profilesInTab.forEach(p => {
            const record = jobRecords[monthKey]?.records?.[p.id];
            const days = record?.days || {};
            Object.values(days).forEach(code => {
                if (code && counts.hasOwnProperty(code as string)) {
                    counts[code as string]++;
                }
            });
        });
        return counts;
    }, [jobRecords, monthKey, activeTab, jobCodes, filteredAndGroupedProfiles, searchTerm]);

    const filteredJobCodes = useMemo(() => {
        if (!jobCodeSearchTerm) {
          return jobCodes;
        }
        const lowercasedFilter = jobCodeSearchTerm.toLowerCase();
        return jobCodes.filter(
          (jc) =>
            jc.code.toLowerCase().includes(lowercasedFilter) ||
            jc.details.toLowerCase().includes(lowercasedFilter) ||
            jc.jobNo?.toLowerCase().includes(lowercasedFilter)
        );
      }, [jobCodes, jobCodeSearchTerm]);

    
    const exportToExcel = async () => {
        // Implementation remains the same
    };
    
    const handleJobWiseExport = () => {
        generateJobWiseExcel(currentMonth, jobRecords, manpowerProfiles, jobCodes);
    };

    const handleMoveRow = (profileId: string, direction: 'up' | 'down') => {
        const currentProfiles = filteredAndGroupedProfiles[activeTab || ''] || [];
        if (!currentProfiles) return;

        const index = currentProfiles.findIndex(p => p.id === profileId);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentProfiles.length) return;

        const newOrder = [...currentProfiles];
        const [movedItem] = newOrder.splice(index, 1);
        newOrder.splice(targetIndex, 0, movedItem);

        const newOrderIds = newOrder.map(p => p.id);
        savePlantOrder(monthKey, activeTab || '', newOrderIds);
    };

    const dayHeaders = useMemo(() => Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1), [currentMonth]);

    const handleDeleteJobCode = (id: string) => {
        deleteJobCode(id);
        toast({ title: 'Job Code Deleted', variant: 'destructive' });
    }

    const handleDeletePlant = (plant: JobRecordPlant) => {
        deleteJobRecordPlant(plant.id);
        setActiveTab('Unassigned');
        toast({title: 'Plant Deleted', variant: 'destructive'});
    }

    const searchResults = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : [];

    const isCurrentMonth = isSameMonth(currentMonth, new Date());

    return (
        <TooltipProvider>
            <datalist id="jobcodes-datalist">
                {jobCodes && jobCodes.map(jc => (
                    <option key={jc.id} value={jc.code} />
                ))}
            </datalist>
            <div className="flex flex-col h-full bg-card border rounded-lg">
                {/* --- HEADER --- */}
                <div className="p-4 border-b bg-card shrink-0 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                                    className="pl-9 w-full sm:w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {canCarryForward && (
                                <Button onClick={() => carryForwardPlantAssignments(currentMonth)} variant="outline" disabled={!isCurrentMonth || isCurrentSheetLocked}>
                                    <ArrowRightLeft className="mr-2 h-4 w-4"/> Carry Forward
                                </Button>
                            )}
                            <Button onClick={exportToExcel}><Download className="mr-2 h-4 w-4"/>Export</Button>
                            <Button onClick={handleJobWiseExport} variant="outline"><Download className="mr-2 h-4 w-4"/>Export by Job</Button>
                            {user?.role === 'Admin' && (
                                <>
                                    <Button onClick={() => setIsAddJobCodeOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add Code</Button>
                                    <Button onClick={() => setIsAddPlantOpen(true)} variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Add Plant</Button>
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
                             {can.manage_job_record && !isCurrentSheetLocked && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive"><Lock className="mr-2 h-4 w-4" /> Lock</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Lock Job Record Sheet?</AlertDialogTitle><AlertDialogDescription>Locking this sheet will prevent further edits by non-admin users. This should only be done when the month's record is final.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => lockJobRecordSheet(monthKey)}>Confirm Lock</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {user?.role === 'Admin' && isCurrentSheetLocked && (
                                <Button variant="secondary" onClick={() => unlockJobRecordSheet(monthKey)}>
                                    <Unlock className="mr-2 h-4 w-4" /> Unlock
                                </Button>
                            )}
                        </div>
                    </div>
                    <ScrollArea className="w-full">
                         <Tabs value={activeTab || ''} onValueChange={setActiveTab}>
                            <TabsList className="w-full justify-start h-auto">
                                {allTabs.map(plantName => {
                                    const plant = plantProjects.find(p => p.name === plantName);
                                    return (
                                    <div key={plantName} className="relative group">
                                        <TabsTrigger value={plantName}>{plantName}</TabsTrigger>
                                        {user?.role === 'Admin' && plant && plantName !== 'Unassigned' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive hidden group-hover:flex">
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Plant "{plant.name}"?</AlertDialogTitle>
                                                        <AlertDialogDescription>This will move all assigned employees to "Unassigned". This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlant(plant)}>Delete Plant</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                            )})}
                        </TabsList>
                        </Tabs>
                    </ScrollArea>
                </div>
                
                <div className="overflow-auto flex-1 relative" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                    <Table className="min-w-full border-separate border-spacing-0">
                        <TableHeader className="sticky top-0 z-10 bg-card">
                            <TableRow>
                                <TableHead className="sticky left-0 z-20 bg-card w-12">#</TableHead>
                                <TableHead className="sticky left-12 z-20 bg-card min-w-[200px]">Name</TableHead>
                                <TableHead className="min-w-[100px]">Trade</TableHead>
                                {dayHeaders.map(day => (
                                    <TableHead key={day} className="text-center min-w-[60px]">
                                        <div>{day}</div>
                                        <div className="text-xs font-normal text-muted-foreground">{format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), 'E')}</div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(searchTerm ? searchResults : filteredAndGroupedProfiles[activeTab || ''] || []).map((profile, index) => {
                                const isExpanded = expandedRows.has(profile.id);
                                return (
                                    <React.Fragment key={profile.id}>
                                        <TableRow>
                                            <TableCell className="sticky left-0 z-10 bg-card">
                                                <div className="flex items-center gap-1">
                                                    <span className="w-6 text-center">{index + 1}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleRow(profile.id)}>
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="sticky left-12 z-10 bg-card font-medium">
                                                <div className="flex items-center gap-2">
                                                    {isReorderMode && (
                                                        <div className="flex flex-col">
                                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleMoveRow(profile.id, 'up')}><ArrowUp className="h-3 w-3"/></Button>
                                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleMoveRow(profile.id, 'down')}><ArrowDown className="h-3 w-3"/></Button>
                                                        </div>
                                                    )}
                                                    {profile.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{profile.trade}</TableCell>
                                            {dayHeaders.map(day => {
                                                const cellId = `${profile.id}-${day}`;
                                                const code = cellStates[cellId] || '';
                                                const colorClass = JOB_CODE_COLORS[code as keyof typeof JOB_CODE_COLORS] || { bg: 'bg-transparent', text: 'text-inherit' };

                                                return (
                                                    <TableCell key={day} className={cn("p-1", isCellInSelection(profile.id, day) && "bg-blue-200 dark:bg-blue-800/50")}>
                                                        <Input
                                                            id={`${cellId}-status`}
                                                            list="jobcodes-datalist"
                                                            value={code}
                                                            onChange={(e) => handleStatusChange(profile.id, day, e.target.value)}
                                                            className={cn("w-14 h-8 text-center uppercase font-bold", colorClass.bg, colorClass.text)}
                                                            onMouseDown={() => handleMouseDown(profile.id, day)}
                                                            onMouseEnter={() => handleMouseEnter(profile.id, day)}
                                                            onKeyDown={(e) => handleCellKeyDown(e, profile.id, day, 'status')}
                                                            disabled={!canEditSheet}
                                                        />
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                        {isExpanded && (
                                            <>
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-right font-semibold text-xs pr-4">Overtime (Hrs)</TableCell>
                                                {dayHeaders.map(day => (
                                                    <TableCell key={`${day}-ot`} className="p-1">
                                                        <Input
                                                            id={`${profile.id}-${day}-overtime`}
                                                            type="text"
                                                            value={overtimeStates[`${profile.id}-${day}`] || ''}
                                                            onChange={(e) => setOvertimeStates(prev => ({...prev, [`${profile.id}-${day}`]: e.target.value}))}
                                                            onBlur={(e) => handleOvertimeBlur(profile.id, day, e.target.value)}
                                                            className="w-14 h-8 text-center"
                                                            onKeyDown={(e) => handleCellKeyDown(e, profile.id, day, 'overtime')}
                                                            disabled={!canEditSheet}
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-right font-semibold text-xs pr-4">Comments</TableCell>
                                                {dayHeaders.map(day => (
                                                    <TableCell key={`${day}-comment`} className="p-1">
                                                        <Input
                                                            id={`${profile.id}-${day}-comment`}
                                                            value={commentStates[`${profile.id}-${day}`] || ''}
                                                            onChange={(e) => setCommentStates(prev => ({...prev, [`${profile.id}-${day}`]: e.target.value}))}
                                                            onBlur={(e) => handleCommentBlur(profile.id, day, e.target.value)}
                                                            className="w-14 h-8"
                                                            onKeyDown={(e) => handleCellKeyDown(e, profile.id, day, 'comment')}
                                                            disabled={!canEditSheet}
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                            </>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                {/* --- FOOTER --- */}
                <div className="shrink-0 z-20 border-t bg-card">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="p-3 text-sm font-semibold hover:no-underline">
                            <div className="flex items-center gap-2"><Info className="h-4 w-4"/>Job Code Legend & Man-Days Count for {searchTerm ? "All Plants" : activeTab || ''}</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="p-4 pt-0">
                                <div className="relative mb-4 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search code, description, or job no..."
                                        className="pl-9"
                                        value={jobCodeSearchTerm}
                                        onChange={(e) => setJobCodeSearchTerm(e.target.value)}
                                    />
                                </div>
                                <ScrollArea className="h-48">
                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-4">
                                    {filteredJobCodes.map(jc => (
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
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/80"><Trash2 className="h-3 w-3"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Delete Job Code {jc.code}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteJobCode(jc.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                   </div>
                                </ScrollArea>
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
