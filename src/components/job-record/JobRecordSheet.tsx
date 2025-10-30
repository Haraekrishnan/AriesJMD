
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Clock, UserX, PlusCircle, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal, Info, Edit, Trash2, Lock, Unlock, ArrowUp, ArrowDown, Settings, Search, MessageSquare } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths, isAfter, isBefore, startOfToday, parseISO, isSameMonth, isValid, parse, sub } from 'date-fns';
import ExcelJS from "exceljs";
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

const implementationStartDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed)

export default function JobRecordSheet() {
    const { user, manpowerProfiles, jobRecords, saveJobRecord, savePlantOrder, jobRecordPlants, projects, jobCodes, JOB_CODE_COLORS, deleteJobCode, can, lockJobRecordSheet, unlockJobRecordSheet, deleteJobRecordPlant } = useAppContext();
    const [currentMonth, setCurrentMonth] = useState(startOfToday());
    const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
    const [isAddJobCodeOpen, setIsAddJobCodeOpen] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [editingJobCode, setEditingJobCode] = useState<JobCode | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState('Unassigned');
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
            const plantForCurrentMonth = jobRecords[monthKey]?.records?.[profile.id]?.plant;
            const plantForPrevMonth = jobRecords[prevMonthKey]?.records?.[profile.id]?.plant;
            const plantAssignment = plantForCurrentMonth ?? plantForPrevMonth ?? 'Unassigned';

            if (groups[plantAssignment]) {
                groups[plantAssignment].push(profile);
            } else {
                groups['Unassigned'].push(profile);
            }
        });

        if (!searchTerm) {
            Object.keys(groups).forEach(plantName => {
                const currentOrder = jobRecords[monthKey]?.plantsOrder?.[plantName];
                const prevOrder = jobRecords[prevMonthKey]?.plantsOrder?.[plantName];
                const order = currentOrder || prevOrder;

                groups[plantName].sort((a, b) => {
                    const plantForA_current = jobRecords[monthKey]?.records?.[a.id]?.plant;
                    const plantForA_prev = jobRecords[prevMonthKey]?.records?.[a.id]?.plant;
                    const a_isNew = plantForA_current && plantForA_current !== plantForA_prev && plantForA_prev !== undefined;

                    const plantForB_current = jobRecords[monthKey]?.records?.[b.id]?.plant;
                    const plantForB_prev = jobRecords[prevMonthKey]?.records?.[b.id]?.plant;
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

    }, [manpowerProfiles, jobRecords, monthKey, prevMonthKey, searchTerm, jobRecordPlants]);

    const batchUpdateJobRecords = useCallback((updates: { profileId: string; day: number; code: string }[]) => {
        updates.forEach(update => {
            saveJobRecord(monthKey, update.profileId, update.day, update.code, 'status');
        });
    }, [monthKey, saveJobRecord]);

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
            const profiles = filteredAndGroupedProfiles[activeTab] || [];
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
    
    const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, profileId: string, day: number, type: 'status' | 'overtime' | 'comment') => {
        const { key } = e;
        const profiles = filteredAndGroupedProfiles[activeTab] || [];
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

    const getSelectionRange = () => {
        if (!dragState.isDragging || !dragState.startCell || !dragState.endCell) return null;
        const profiles = filteredAndGroupedProfiles[activeTab] || [];
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
        setOvertimeStates(prev => ({...prev, [`${employeeId}-${day}`]: value}));
    }

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

    const handleCommentChange = (employeeId: string, day: number, value: string) => {
        setCommentStates(prev => ({...prev, [`${employeeId}-${day}`]: value}));
    };

    const handleCommentBlur = (employeeId: string, day: number, value: string) => {
        const comment = value.trim() === '' ? null : value;
        saveJobRecord(monthKey, employeeId, day, comment, 'dailyComments');
    };
    
    const handlePlantChange = (employeeId: string, plant: string) => {
       saveJobRecord(monthKey, employeeId, 0, plant, 'plant');
    }
    
    const handleSundayDutyChange = (profileId: string, value: string) => {
        setSundayDutyStates(prev => ({ ...prev, [profileId]: value }));
    }

    const handleSundayDutySave = (employeeId: string, value: string) => {
        const days = value === '' ? null : parseInt(value, 10);
        if (days !== null && !isNaN(days) && days >= 0) {
            saveJobRecord(monthKey, employeeId, null, days, 'sundayDuty');
        } else if (value === '') {
             saveJobRecord(monthKey, employeeId, null, null, 'sundayDuty');
        }
    };
    
    const plantProjects = useMemo(() => {
        return (jobRecordPlants || []).sort((a,b) => a.name.localeCompare(b.name));
    }, [jobRecordPlants]);

    useEffect(() => {
        if (plantProjects.length > 0 && !plantProjects.some(p => p.name === activeTab) && activeTab !== 'Unassigned') {
            setActiveTab('Unassigned');
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
    
    const canViewUnassigned = useMemo(() => {
        if (!user) return false;
        return user.role === 'Admin' || can.manage_job_record;
    }, [user, can.manage_job_record]);

    const allTabs = useMemo(() => {
        const plantTabs = plantProjects.map(p => p.name);
        return canViewUnassigned ? ['Unassigned', ...plantTabs] : plantTabs;
    }, [plantProjects, canViewUnassigned]);
    
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
    
    const manDaysCountByCodeForCurrentTab = useMemo(() => {
        if (!jobCodes) return {};
        const counts: { [key: string]: number } = {};
        jobCodes.forEach(jc => counts[jc.code] = 0);

        const profilesInTab = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : (filteredAndGroupedProfiles[activeTab] || []);
        profilesInTab.forEach(p => {
            const record = jobRecords[monthKey]?.records?.[p.id];
            const days = record?.days || {};
            Object.values(days).forEach(code => {
                if (counts.hasOwnProperty(code as string)) {
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
        try {
            const workbook = new ExcelJS.Workbook();
            const colorMap: Record<string, { bg: string; text?: string }> = {
                "X": { bg: "FFFF0000", text: "FFFFFFFF" },
                "EP": { bg: "FF00B0F0" },
                "PD": { bg: "FF00FF00" },
                "ML": { bg: "FFFFFF00" },
                "OFF": { bg: "FFBFBFBF" },
                "ST": { bg: "FF00B0F0" },
                "PH": { bg: "FF92D050" },
                "KD": { bg: "FFFFC000" },
                "Q": { bg: "FF00B0F0" },
                "TR": { bg: "FFEAD1DC" },
                "OS": { bg: "FFFF9900" },
                "L": { bg: "FFFF0000", text: "FFFFFFFF" },
                "NWS": { bg: "FF7030A0", text: "FFFFFFFF" },
            };
    
            for (const plant of allTabs) {
                const profiles = filteredAndGroupedProfiles[plant];
                if (!profiles || profiles.length === 0) continue;
    
                const sheet = workbook.addWorksheet(plant);
                const totalDays = getDaysInMonth(currentMonth);
    
                // ---- Title ----
                sheet.mergeCells("A1", "N1");
                const titleCell = sheet.getCell("A1");
                titleCell.value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plant}`;
                titleCell.font = { bold: true, size: 14 };
                titleCell.alignment = { horizontal: "center", vertical: "middle" };
    
                // ---- Headers ----
                const dayHeadersExcel = Array.from({ length: totalDays }, (_, i) => i + 1);
                const header = [
                    "S.No",
                    "Name",
                    ...dayHeadersExcel.map(String),
                    "Total OFF",
                    "Total Leave",
                    "Total ML",
                    "Over Time",
                    "Total Standby/Training",
                    "Total Working Days",
                    "Total Rept/Office",
                    "Salary Days",
                    "Additional Sunday Duty",
                ];
    
                sheet.addRow([]);
                const headerRow = sheet.addRow(header);
                headerRow.font = { bold: true };
                headerRow.alignment = { vertical: "middle", horizontal: "center" };
    
                headerRow.eachCell(cell => {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" },
                    };
                });
    
                // ---- Employee Rows ----
                profiles.forEach((profile, index) => {
                    const record = jobRecords[monthKey]?.records?.[profile.id] || {};
                    const employeeRecord = record.days || {};
                    const dailyOvertime = record.dailyOvertime || {};
                    const dailyComments = record.dailyComments || {};
    
                    const offCodes = ["OFF", "PH", "OS"];
                    const leaveCodes = ["L", "X", "NWS"];
                    const standbyCodes = ["ST", "TR", "EP", "PD", "Q"];
                    const workCodes = jobCodes
                        ? jobCodes
                            .filter(
                                jc =>
                                    ![
                                        "X",
                                        "Q",
                                        "ST",
                                        "NWS",
                                        "R",
                                        "OS",
                                        "ML",
                                        "L",
                                        "TR",
                                        "PD",
                                        "EP",
                                        "OFF",
                                        "PH",
                                        "S",
                                        "CQ",
                                        "RST",
                                    ].includes(jc.code)
                            )
                            .map(jc => jc.code)
                        : [];
    
                    // Summary calculations
                    const summary = dayHeadersExcel.reduce(
                        (acc, day) => {
                            const code = employeeRecord[day];
                            if (offCodes.includes(code)) acc.offDays++;
                            else if (leaveCodes.includes(code)) acc.leaveDays++;
                            else if (code === "ML") acc.medicalLeave++;
                            else if (standbyCodes.includes(code)) acc.standbyTraining++;
                            else if (code === "R") acc.reptOffice++;
                            else if (workCodes.includes(code) || code === "KD") acc.workDays++;
                            return acc;
                        },
                        { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0 }
                    );
    
                    const totalOvertime = Object.values(dailyOvertime).reduce((sum, h) => sum + (h || 0), 0);
                    const additionalSundays = Number(sundayDutyStates[profile.id] || record.additionalSundayDuty || 0);
                    const salaryDays =
                        additionalSundays +
                        summary.offDays +
                        summary.medicalLeave +
                        summary.standbyTraining +
                        summary.reptOffice +
                        summary.workDays;
    
                    const rowData = [
                        index + 1,
                        profile.name,
                        ...dayHeadersExcel.map(day => employeeRecord[day] || ""),
                        summary.offDays,
                        summary.leaveDays,
                        summary.medicalLeave,
                        totalOvertime > 0 ? `${totalOvertime} Hours OT` : "",
                        summary.standbyTraining,
                        summary.workDays,
                        summary.reptOffice,
                        salaryDays,
                        additionalSundays > 0 ? additionalSundays : "",
                    ];
    
                    const row = sheet.addRow(rowData);
    
                    // ---- Apply colors & notes ----
                    dayHeadersExcel.forEach((day, dIndex) => {
                        const code = (employeeRecord[day] || "").toUpperCase();
                        const cell = row.getCell(dIndex + 3);
                        const color = colorMap[code];
    
                        if (color) {
                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color.bg } };
                            cell.font = { bold: true, color: { argb: color.text || "FF000000" } };
                        }
    
                        // Add comments/notes
                        const notes: string[] = [];
                        if (dailyOvertime[day]) notes.push(`Overtime: ${dailyOvertime[day]} Hours`);
                        if (dailyComments[day]) notes.push(`Comment: ${dailyComments[day]}`);
                        if (notes.length > 0) cell.note = notes.join("\n");
                    });
    
                    // ---- Borders & alignment ----
                    row.eachCell(cell => {
                        cell.border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" },
                        };
                        cell.alignment = { vertical: "middle", horizontal: "center" };
                    });
                });
    
                // ---- Column Widths ----
                const nameColIndex = 2;
                const startDayIndex = 3;
                const endDayIndex = startDayIndex + totalDays - 1;

                sheet.getColumn(nameColIndex).width = 32;

                for (let i = startDayIndex; i <= endDayIndex; i++) {
                sheet.getColumn(i).width = 7;
                }

                const firstSummaryCol = endDayIndex + 1;
                const lastSummaryCol = header.length;
                for (let i = firstSummaryCol; i <= lastSummaryCol; i++) {
                sheet.getColumn(i).width = 12;
                }

                sheet.eachRow({ includeEmpty: true }, row => {
                row.eachCell({ includeEmpty: true }, cell => {
                    if (!cell.alignment) cell.alignment = {};
                    cell.alignment = {
                    ...cell.alignment,
                    wrapText: true,
                    vertical: "middle",
                    horizontal: cell.alignment?.horizontal || "center",
                    };
                });
                });
    
                // ---- Legend Section ----
                // ------------------ LEGEND (REPLACEMENT BLOCK) ------------------ //
                // Compute man-days count only for current plant (profiles array)
                const manDaysCount: Record<string, number> = {};
                // Deduplicate jobCodes by code to avoid repeat rows
                const uniqueJobCodesMap = new Map<string, any>();
                (jobCodes || []).forEach(jc => {
                if (!uniqueJobCodesMap.has(jc.code)) uniqueJobCodesMap.set(jc.code, jc);
                });
                const uniqueJobCodes = Array.from(uniqueJobCodesMap.values());

                // initialize counts
                uniqueJobCodes.forEach(jc => (manDaysCount[jc.code] = 0));

                // Count occurrences only among current plant's profiles
                profiles.forEach(p => {
                const rec = jobRecords[monthKey]?.records?.[p.id];
                const days = rec?.days || {};
                Object.values(days).forEach(code => {
                    if (code && manDaysCount[code as string] !== undefined) {
                    manDaysCount[code as string]++;
                    }
                });
                });

                // Build list of legend rows (only codes with >0 man-days)
                const legendRows = uniqueJobCodes
                .map(jc => ({ jc, count: manDaysCount[jc.code] || 0 }))
                .filter(x => x.count > 0);

                // If there are no legend rows, skip legend creation
                if (legendRows.length > 0) {
                    // Determine table geometry
                    const legendColsConfig = {
                        code: 1,      // Code = 1 cell
                        details: 15,  // Job Details merged across 15 cells
                        jobNo: 2,     // Job No merged across 2 cells
                        manDays: 3,   // Man-Days merged across 3 cells
                    };
                    const legendWidth = legendColsConfig.code + legendColsConfig.details + legendColsConfig.jobNo + legendColsConfig.manDays;

                    // Determine how many columns the main table used
                    const totalColsUsed = header.length; // header is the header array used earlier to create columns
                    // Center the legend: pick startCol so legend block is centered across totalColsUsed
                    const legendStartCol = Math.floor((totalColsUsed - legendWidth) / 2) + 1;
                    const legendEndCol = legendStartCol + legendWidth - 1;

                    // Blank row separator
                    sheet.addRow([]);

                    // Title row: merge across legendWidth and center
                    const titleRow = sheet.addRow([]);
                    sheet.mergeCells(titleRow.number, legendStartCol, titleRow.number, legendEndCol);
                    const titleCell = sheet.getCell(titleRow.number, legendStartCol);
                    titleCell.value = "Job Code Legend";
                    titleCell.font = { bold: true, size: 13 };
                    titleCell.alignment = { horizontal: "center", vertical: "middle" };
                    titleCell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" }
                    };

                    // Header row for the legend (Code | Job Details | Job No | Man-Days)
                    const legendHeaderRow = sheet.addRow([]);
                    // merge header columns exactly like the data rows will be merged
                    const detailsStart = legendStartCol + legendColsConfig.code;
                    const detailsEnd = detailsStart + legendColsConfig.details - 1;
                    const jobNoStart = detailsEnd + 1;
                    const jobNoEnd = jobNoStart + legendColsConfig.jobNo - 1;
                    const manDaysStart = jobNoEnd + 1;
                    const manDaysEnd = manDaysStart + legendColsConfig.manDays - 1;

                    // Merge header cells
                    sheet.mergeCells(legendHeaderRow.number, legendStartCol, legendHeaderRow.number, legendStartCol); // Code (single)
                    sheet.mergeCells(legendHeaderRow.number, detailsStart, legendHeaderRow.number, detailsEnd); // Details (15)
                    sheet.mergeCells(legendHeaderRow.number, jobNoStart, legendHeaderRow.number, jobNoEnd); // Job No (2)
                    sheet.mergeCells(legendHeaderRow.number, manDaysStart, legendHeaderRow.number, manDaysEnd); // Man-Days (3)

                    // Set header values and styles
                    const codeHeaderCell = sheet.getCell(legendHeaderRow.number, legendStartCol);
                    const detailsHeaderCell = sheet.getCell(legendHeaderRow.number, detailsStart);
                    const jobNoHeaderCell = sheet.getCell(legendHeaderRow.number, jobNoStart);
                    const manDaysHeaderCell = sheet.getCell(legendHeaderRow.number, manDaysStart);

                    codeHeaderCell.value = "Code";
                    detailsHeaderCell.value = "Job Details";
                    jobNoHeaderCell.value = "Job No";
                    manDaysHeaderCell.value = "Man-Days";

                    [codeHeaderCell, detailsHeaderCell, jobNoHeaderCell, manDaysHeaderCell].forEach(c => {
                        c.font = { bold: true };
                        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                        c.border = {
                        top: { style: "thin" }, left: { style: "thin" },
                        bottom: { style: "thin" }, right: { style: "thin" }
                        };
                    });

                    // Add legend rows (only codes with count > 0), merging columns per row exactly like header
                    legendRows.forEach(({ jc, count }) => {
                        const r = sheet.addRow([]);

                        // Merge data cells per the same ranges
                        sheet.mergeCells(r.number, legendStartCol, r.number, legendStartCol); // Code (single)
                        sheet.mergeCells(r.number, detailsStart, r.number, detailsEnd); // Details (15)
                        sheet.mergeCells(r.number, jobNoStart, r.number, jobNoEnd); // Job No (2)
                        sheet.mergeCells(r.number, manDaysStart, r.number, manDaysEnd); // Man-Days (3)

                        // Assign cell objects
                        const codeCell = sheet.getCell(r.number, legendStartCol);
                        const detailsCell = sheet.getCell(r.number, detailsStart);
                        const jobNoCell = sheet.getCell(r.number, jobNoStart);
                        const manDaysCell = sheet.getCell(r.number, manDaysStart);

                        codeCell.value = jc.code;
                        detailsCell.value = jc.details || "";
                        jobNoCell.value = jc.jobNo || "";
                        manDaysCell.value = count;

                        // Color only the Code cell (use same colorMap)
                        const jobColor = colorMap[jc.code];
                        if (jobColor) {
                        codeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: jobColor.bg } };
                        codeCell.font = { bold: true, color: { argb: jobColor.text || "FF000000" } };
                        } else {
                        codeCell.font = { bold: true };
                        }

                        // Styling for other cells
                        [detailsCell, jobNoCell, manDaysCell].forEach(c => {
                        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                        c.font = { size: 11 };
                        });

                        // Borders for all
                        [codeCell, detailsCell, jobNoCell, manDaysCell].forEach(c => {
                        c.border = {
                            top: { style: "thin" }, left: { style: "thin" },
                            bottom: { style: "thin" }, right: { style: "thin" }
                        };
                        });
                    });
                }
            }
    
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `JobRecord_${monthKey}.xlsx`);
            toast({ title: "Export Complete", description: "Excel file generated successfully." });
        } catch (err) {
            console.error(err);
            toast({
                variant: "destructive",
                title: "Export Failed",
                description: "Error generating Excel file.",
            });
        }
    };