

'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Download, Clock, UserX, PlusCircle, ChevronsUpDown, ChevronDown, ChevronUp, MoreHorizontal, Info, Edit, Trash2, Lock, Unlock, ArrowUp, ArrowDown, Settings, Search, MessageSquare, ArrowRightLeft } from 'lucide-react';
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
import { JOB_CODE_COLORS } from '@/lib/job-codes';

const implementationStartDate = new Date(2025, 9, 1); // October 2025 (Month is 0-indexed)

async function fetchImageAsArrayBuffer(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.arrayBuffer();
}

export default function JobRecordSheet() {
    const { user, manpowerProfiles, jobRecords, saveJobRecord, savePlantOrder, jobRecordPlants, projects, jobCodes, deleteJobCode, can, lockJobRecordSheet, unlockJobRecordSheet, deleteJobRecordPlant, carryForwardPlantAssignments } = useAppContext();
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
    
        const getPlantForProfile = (profileId: string) => {
            return jobRecords[monthKey]?.records?.[profileId]?.plant || jobRecords[prevMonthKey]?.records?.[profileId]?.plant || 'Unassigned';
        };

        const groups: { [key: string]: ManpowerProfile[] } = {};
        const plantNames = (jobRecordPlants || []).map(p => p.name);
        const availablePlants = new Set(plantNames);
        availablePlants.add('Unassigned');
    
        availablePlants.forEach(p => { groups[p] = []; });
    
        filtered.forEach(profile => {
            const plantAssignment = getPlantForProfile(profile.id);
            if (groups[plantAssignment]) {
                groups[plantAssignment].push(profile);
            } else {
                groups['Unassigned'].push(profile);
            }
        });
    
        Object.keys(groups).forEach(plantName => {
            const currentOrder = jobRecords[monthKey]?.plantsOrder?.[plantName];
            const prevOrder = jobRecords[prevMonthKey]?.plantsOrder?.[plantName];
            const order = currentOrder || prevOrder;

            if (order && Array.isArray(order)) {
                groups[plantName].sort((a, b) => {
                    const indexA = order.indexOf(a.id);
                    const indexB = order.indexOf(b.id);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return 0; // Keep original order for those not in the list
                });
            }
        });
        
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

        const profilesInTab = searchTerm ? Object.values(filteredAndGroupedProfiles).flat() : (filteredAndGroupedProfiles[activeTab] || []);
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
        try {
            const workbook = new ExcelJS.Workbook();
            const logoBuffer = await fetchImageAsArrayBuffer('/images/Aries_logo.png');
            
            for (const plant of allTabs) {
                const profiles = filteredAndGroupedProfiles[plant];
                if (!profiles || profiles.length === 0) continue;
    
                const sheet = workbook.addWorksheet(plant);
                const totalDays = getDaysInMonth(currentMonth);

                // ---- Add Merged Header Section First ----
                const totalCols = 2 + totalDays + 9;
                const endCol = totalCols;

                // Row 1 – Title
                const row1 = sheet.addRow([]);
                sheet.mergeCells(1, 1, 1, endCol);
                const cell1 = sheet.getCell(1, 1);
                cell1.value = "RIL JMD PROJECT";
                cell1.font = { bold: true, size: 16 };
                cell1.alignment = { horizontal: "center", vertical: "middle" };
                cell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9D9D9" } };

                // Row 2 – Month / Plant
                const row2 = sheet.addRow([]);
                sheet.mergeCells(2, 1, 2, endCol);
                const cell2 = sheet.getCell(2, 1);
                cell2.value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plant}`;
                cell2.font = { bold: true, size: 13 };
                cell2.alignment = { horizontal: "center", vertical: "middle" };
                cell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9D9D9" } };
                
                // 🔥 Set row height to match logo
                sheet.getRow(1).height = 35;
                sheet.getRow(2).height = 25;

                // 🔥 STEP 2 — Insert the logo AFTER the rows exist
                const logoId = workbook.addImage({
                    buffer: logoBuffer,
                    extension: "png",
                });
                
                // Pixel size → perfect match (4.23 cm × 1.05 cm)
                const logoWidth = 160;
                const logoHeight = 40;
                
                // 🔥 Now place logo EXACTLY spanning rows 1–2 vertically centered
                sheet.addImage(logoId, {
                    tl: { col: 0.2, row: 0.3 },
                    ext: { width: logoWidth, height: logoHeight },
                    editAs: "absolute",
                });
                
                // Optional: blank spacer row
                sheet.addRow([]);
    
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
    
                    // Add comments to day cells
                    dayHeadersExcel.forEach((day, dIndex) => {
                        const notes: string[] = [];
                        if (dailyOvertime[day]) notes.push(`Overtime: ${dailyOvertime[day]} Hours`);
                        if (dailyComments[day]) notes.push(`Comment: ${dailyComments[day]}`);
                        if (notes.length > 0) row.getCell(dIndex + 3).note = notes.join("\n");
                    });
    
                    // Borders
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
                sheet.getColumn(2).width = 32;
                for (let i = 3; i <= 2 + totalDays; i++) { sheet.getColumn(i).width = 7; }
                for (let i = 3 + totalDays; i <= header.length; i++) { sheet.getColumn(i).width = 12; }
    
                 // ---- Enable Wrap Text Globally ----
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
    
                // ---- Apply Conditional Job Code Colors ----
                sheet.eachRow((row) => {
                    row.eachCell((cell) => {
                        if (typeof cell.value === "string") {
                            const val = cell.value.trim().toUpperCase();
                            const jobColor = JOB_CODE_COLORS[val as keyof typeof JOB_CODE_COLORS];
                            if (jobColor && jobColor.excelFill) {
                                if (jobColor.excelFill.fgColor) {
                                    cell.fill = {
                                        type: 'pattern',
                                        pattern: 'solid',
                                        fgColor: { argb: jobColor.excelFill.fgColor.argb }
                                    };
                                }
                                if (jobColor.excelFill.font?.color?.argb) {
                                    cell.font = { bold: true, color: { argb: jobColor.excelFill.font.color.argb } };
                                }
                            }
                        }
                    });
                });
    
                 // ---- Legend ----
                 const manDaysCount: Record<string, number> = {};
                 const uniqueJobCodes = Array.from(new Map(jobCodes.map(item => [item.code, item])).values());
                 uniqueJobCodes.forEach(jc => (manDaysCount[jc.code] = 0));
                 
                 profiles.forEach(p => {
                     const rec = jobRecords[monthKey]?.records?.[p.id];
                     const days = rec?.days || {};
                     Object.values(days).forEach(code => {
                         if (code && manDaysCount[code as string] !== undefined) manDaysCount[code as string]++;
                     });
                 });
                 
                 const legendRows = uniqueJobCodes.map(jc => ({ jc, count: manDaysCount[jc.code] || 0 })).filter(x => x.count > 0);
     
                 if (legendRows.length > 0) {
                    sheet.addRow([]); // spacing before legend
                    const headerRowLegend = sheet.addRow([]);

                    const legendStartCol = Math.floor((totalCols - (1 + 15 + 2 + 3)) / 2) + 1;
                    const codeCol = legendStartCol;
                    const detailsCol = codeCol + 1;
                    const jobNoCol = detailsCol + 15;
                    const manDayCol = jobNoCol + 2;

                    sheet.mergeCells(headerRowLegend.number, detailsCol, headerRowLegend.number, jobNoCol - 1);
                    sheet.mergeCells(headerRowLegend.number, jobNoCol, headerRowLegend.number, jobNoCol + 1);
                    sheet.mergeCells(headerRowLegend.number, manDayCol, headerRowLegend.number, manDayCol + 2);

                    const legendHeaders = ["Code", "Job Details", "Job No", "Man-Days"];
                    [codeCol, detailsCol, jobNoCol, manDayCol].forEach((c, i) => {
                        const cell = headerRowLegend.getCell(c);
                        cell.value = legendHeaders[i];
                        cell.font = { bold: true };
                        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                    });

                    legendRows.forEach(({ jc, count }) => {
                        const r = sheet.addRow([]);
                        sheet.mergeCells(r.number, detailsCol, r.number, jobNoCol - 1);
                        sheet.mergeCells(r.number, jobNoCol, r.number, jobNoCol + 1);
                        sheet.mergeCells(r.number, manDayCol, r.number, manDayCol + 2);
        
                        const codeCell = r.getCell(codeCol);
                        const detailsCell = r.getCell(detailsCol);
                        const jobNoCell = r.getCell(jobNoCol);
                        const manDaysCell = r.getCell(manDayCol);
        
                        codeCell.value = jc.code;
                        detailsCell.value = jc.details || "";
                        jobNoCell.value = jc.jobNo || "";
                        manDaysCell.value = count;

                        const jobColor = JOB_CODE_COLORS[jc.code as keyof typeof JOB_CODE_COLORS];
                        if (jobColor && jobColor.excelFill) {
                            if (jobColor.excelFill.fgColor) {
                                codeCell.fill = {
                                    type: 'pattern',
                                    pattern: 'solid',
                                    fgColor: { argb: jobColor.excelFill.fgColor.argb }
                                };
                            }
                            if (jobColor.excelFill.font?.color?.argb) {
                                codeCell.font = { bold: true, color: { argb: jobColor.excelFill.font.color.argb } };
                            }
                        } else {
                          codeCell.font = { bold: true };
                        }
                    
                        [detailsCell, jobNoCell, manDaysCell].forEach(c => {
                          c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                          c.font = { size: 11 };
                        });
                    
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
                                <Button onClick={() => carryForwardPlantAssignments(monthKey)} variant="outline" disabled={!isCurrentMonth || isCurrentSheetLocked}>
                                    <ArrowRightLeft className="mr-2 h-4 w-4"/> Carry Forward
                                </Button>
                            )}
                            <Button onClick={exportToExcel}><Download className="mr-2 h-4 w-4"/>Export</Button>
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
                         <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlant(plant)}>Delete Plant</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                            )})}
                        </TabsList>
                        </Tabs>
                    </ScrollArea>
                </div>
                
                <div className="overflow-auto flex-1 relative">
                    <Table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-30 bg-card">
                            <TableRow>
                                <TableHead className="sticky left-0 bg-card z-30 border-r" style={{ minWidth: '120px', width: '120px' }}>S.No / Actions</TableHead>
                                <TableHead className="sticky bg-card z-30 border-r" style={{ left: '120px', minWidth: '200px', width: '200px' }}>Name / EP No.</TableHead>
                                <TableHead className="sticky bg-card z-30 border-r" style={{ left: '320px', minWidth: '150px', width: '150px' }}>Plant</TableHead>
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
                                const record = jobRecords[monthKey]?.records?.[profile.id] || {};
                                const prevMonthRecord = jobRecords[prevMonthKey]?.records?.[profile.id] || {};
                                const plant = record.plant ?? prevMonthRecord.plant ?? 'Unassigned';
                                const employeeRecord = record.days || {};
                                const dailyOvertime = record.dailyOvertime || {};
                                const dailyComments = record.dailyComments || {};
                                
                                const workCodes = jobCodes ? jobCodes.filter(jc => !['X', 'Q', 'ST', 'NWS', 'R', 'OS', 'ML', 'L', 'TR', 'PD', 'EP', 'OFF', 'PH', 'S', 'CQ', 'RST'].includes(jc.code)).map(jc => jc.code) : [];
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
                                    else if (workCodes.includes(code) || code === 'KD') acc.workDays++;
                                    return acc;
                                }, { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0, workDays: 0 });

                                const totalOvertime = Object.values(dailyOvertime).reduce((sum, hours) => sum + (Number(hours) || 0), 0);
                                const additionalSundays = Number(sundayDutyStates[profile.id] || record.additionalSundayDuty || 0);
                                const salaryDays = (additionalSundays || 0) + (summary.offDays || 0) + (summary.medicalLeave || 0) + (summary.standbyTraining || 0) + (summary.reptOffice || 0) + (summary.workDays || 0);
                                const isExpanded = expandedRows.has(profile.id);

                                return (
                                    <React.Fragment key={profile.id}>
                                    <TableRow>
                                        <TableCell className="sticky left-0 z-20 flex items-center bg-card border-r" style={{width: '120px'}}>
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
                                        <TableCell className="sticky bg-card z-20 font-medium whitespace-nowrap border-r" style={{ left: '120px', width: '200px' }}>
                                            <p>{profile.name}</p>
                                            <p className="text-xs text-muted-foreground">{profile.epNumber || 'No EP No.'}</p>
                                        </TableCell>
                                        <TableCell className="sticky bg-card z-20 font-medium whitespace-nowrap border-r" style={{ left: '320px', width: '150px' }}>
                                        <Select value={plant} onValueChange={(value) => handlePlantChange(profile.id, value)} disabled={!canEditSheet}>
                                                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                                                    {plantProjects.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        {dayHeaders.map(day => {
                                            const code = cellStates[`${profile.id}-${day}`] || '';
                                            const overtimeForDay = dailyOvertime[day] || 0;
                                            const commentForDay = dailyComments[day] || '';
                                            const colorInfo = JOB_CODE_COLORS[code as keyof typeof JOB_CODE_COLORS] || {};
                                            const isInSelection = isCellInSelection(profile.id, day);

                                            return (
                                                <TableCell 
                                                    key={day} 
                                                    className={cn(
                                                        "p-0 text-center relative min-w-[100px] border-r group",
                                                        isInSelection && "bg-blue-100 dark:bg-blue-900/50"
                                                    )}
                                                    onMouseEnter={() => handleMouseEnter(profile.id, day)}
                                                >
                                                    <div className="relative h-10 w-full">
                                                        <Input
                                                            id={`${profile.id}-${day}-status`}
                                                            type="text"
                                                            list="jobcodes-datalist"
                                                            value={code}
                                                            onChange={(e) => setCellStates(prev => ({...prev, [`${profile.id}-${day}`]: e.target.value}))}
                                                            onBlur={(e) => handleStatusChange(profile.id, day, e.target.value)}
                                                            onKeyDown={(e) => handleCellKeyDown(e, profile.id, day, 'status')}
                                                            className={cn(
                                                                "absolute inset-0 w-full h-full text-center font-bold rounded-none border-0 focus:ring-1 focus:ring-offset-0 focus:ring-ring",
                                                                code ? colorInfo.bg : 'bg-transparent',
                                                                code ? colorInfo.text : 'text-foreground'
                                                            )}
                                                            style={{ boxShadow: 'none' }}
                                                            disabled={!canEditSheet}
                                                        />
                                                        <div className="absolute right-1 top-1 flex items-center gap-0.5">
                                                            {overtimeForDay > 0 && (
                                                                <Tooltip>
                                                                    <TooltipTrigger className="h-3 w-3">
                                                                        <Clock className="h-full w-full text-blue-500" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{overtimeForDay} hours OT</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {commentForDay && (
                                                                <Tooltip>
                                                                    <TooltipTrigger className="h-3 w-3">
                                                                        <MessageSquare className="h-full w-full text-green-500" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{commentForDay}</p></TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                        {canEditSheet && (
                                                             <div 
                                                                onMouseDown={() => handleMouseDown(profile.id, day)}
                                                                className="absolute bottom-0 right-0 w-4 h-4 cursor-crosshair z-30 opacity-0 group-hover:opacity-100"
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
                                                value={sundayDutyStates[profile.id] ?? ''}
                                                onChange={(e) => handleSundayDutyChange(profile.id, e.target.value)}
                                                onBlur={(e) => handleSundayDutySave(profile.id, e.target.value)}
                                                className="w-16 h-8 text-center"
                                                placeholder="0"
                                                disabled={!canEditSheet}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                       <>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableCell
                                                    colSpan={3}
                                                    className="sticky left-0 bg-muted/50 text-right font-semibold text-xs pr-4 z-20 border-r"
                                                    style={{ left: 0, width: '470px' }}
                                                >
                                                    Overtime Hours
                                                </TableCell>
                                                {dayHeaders.map(day => {
                                                    const overtimeValue = overtimeStates[`${profile.id}-${day}`] || '';
                                                    return (
                                                        <TableCell key={`ot-${day}`} className="p-0 border-r">
                                                            <Input
                                                                id={`${profile.id}-${day}-overtime`}
                                                                type="number"
                                                                placeholder="0"
                                                                value={overtimeValue}
                                                                onChange={(e) => handleOvertimeChange(profile.id, day, e.target.value)}
                                                                onBlur={(e) => handleOvertimeBlur(profile.id, day, e.target.value)}
                                                                onKeyDown={(e) => handleCellKeyDown(e, profile.id, day, 'overtime')}
                                                                className="w-full h-8 text-center border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                                                                disabled={!canEditSheet}
                                                            />
                                                        </TableCell>
                                                    )
                                                })}
                                                <TableCell colSpan={9}></TableCell>
                                            </TableRow>
                                             <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableCell
                                                    colSpan={3}
                                                    className="sticky left-0 bg-muted/50 text-right font-semibold text-xs pr-4 z-20 border-r"
                                                    style={{ left: 0, width: '470px' }}
                                                >
                                                    Comments
                                                </TableCell>
                                                {dayHeaders.map(day => {
                                                    const commentValue = commentStates[`${profile.id}-${day}`] || '';
                                                    return (
                                                        <TableCell key={`comment-${day}`} className="p-0 border-r">
                                                            <Input
                                                                id={`${profile.id}-${day}-comment`}
                                                                type="text"
                                                                placeholder="Comment"
                                                                value={commentValue}
                                                                onChange={(e) => handleCommentChange(profile.id, day, e.target.value)}
                                                                onBlur={(e) => handleCommentBlur(profile.id, day, e.target.value)}
                                                                onKeyDown={(e) => handleCellKeyDown(e, profile.id, day, 'comment')}
                                                                className="w-full h-8 text-center border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                                                                disabled={!canEditSheet}
                                                            />
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell colSpan={9}></TableCell>
                                            </TableRow>
                                       </>
                                    )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                {/* --- FOOTER --- */}
                <div className="shrink-0 z-20 border-t bg-card">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="p-3 text-sm font-semibold hover:no-underline">
                            <div className="flex items-center gap-2"><Info className="h-4 w-4"/>Job Code Legend & Man-Days Count for {searchTerm ? "All Plants" : activeTab}</div>
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