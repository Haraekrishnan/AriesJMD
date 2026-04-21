'use client';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, getDaysInMonth } from 'date-fns';
import type { JobCode, JobRecord, ManpowerProfile } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export async function generateJobWiseExcel(
    currentMonth: Date,
    jobRecords: { [key: string]: JobRecord },
    manpowerProfiles: ManpowerProfile[],
    jobCodes: JobCode[]
) {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const monthRecord = jobRecords[monthKey];

    if (!monthRecord || !monthRecord.records) {
        toast({ title: "No data to export for this month.", variant: "destructive" });
        return;
    }

    const jobCodeToEmployeeDays: { [code: string]: { [profileId: string]: number[] } } = {};

    for (const profileId in monthRecord.records) {
        const employeeDays = monthRecord.records[profileId].days;
        if (employeeDays) {
            for (const day in employeeDays) {
                const code = (employeeDays as any)[day];
                if (code) {
                    if (!jobCodeToEmployeeDays[code]) {
                        jobCodeToEmployeeDays[code] = {};
                    }
                    if (!jobCodeToEmployeeDays[code][profileId]) {
                        jobCodeToEmployeeDays[code][profileId] = [];
                    }
                    jobCodeToEmployeeDays[code][profileId].push(parseInt(day));
                }
            }
        }
    }

    const uniqueJobCodesWithData = jobCodes.filter(jc => jobCodeToEmployeeDays[jc.code]);

    if (uniqueJobCodesWithData.length === 0) {
        toast({ title: "No job data found", description: "No employees have been assigned to any jobs this month." });
        return;
    }
    
    const workbook = new ExcelJS.Workbook();
    
    for (const jobCode of uniqueJobCodesWithData) {
        // Use jobNo if available, otherwise code. Sanitize for sheet name.
        const sheetName = (jobCode.jobNo || jobCode.code).replace(/[\\/*?:[\]]/g, '_').substring(0, 31);
        if (workbook.getWorksheet(sheetName)) {
            // Sheet with this name already exists, skip or merge logic. For now, let's skip.
            continue;
        }
        
        const worksheet = workbook.addWorksheet(sheetName);

        // --- Headers ---
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = `ATTENDANCE RECORD FOR JOB NO: ${jobCode.jobNo || 'N/A'}`;
        worksheet.getCell('A1').font = { bold: true, size: 14 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A2').value = `JOB DETAILS: ${jobCode.details}`;
        worksheet.getCell('A2').font = { bold: true };
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        worksheet.mergeCells('A3:F3');
        worksheet.getCell('A3').value = `MONTH: ${format(currentMonth, 'MMMM yyyy')}`;
        worksheet.getCell('A3').font = { bold: true };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };

        worksheet.addRow([]); // Spacer

        // --- Table Headers ---
        const daysInMonth = getDaysInMonth(currentMonth);
        const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const header = ['Sl. No.', 'Name', 'EP No.', 'Trade', ...dayHeaders];
        const headerRow = worksheet.addRow(header);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };
        headerRow.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // --- Table Body ---
        const employeeDataForJob = jobCodeToEmployeeDays[jobCode.code];
        let slNo = 1;
        for (const profileId in employeeDataForJob) {
            const profile = manpowerProfiles.find(p => p.id === profileId);
            if (profile) {
                const daysPresent = employeeDataForJob[profileId];
                const rowData: (string | number)[] = [
                    slNo++,
                    profile.name,
                    profile.epNumber || '',
                    profile.trade,
                ];
                dayHeaders.forEach(day => {
                    rowData.push(daysPresent.includes(day) ? 'P' : '');
                });
                const row = worksheet.addRow(rowData);
                row.eachCell(cell => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    cell.alignment = { horizontal: 'center' };
                });
            }
        }
        
        // --- Column Widths ---
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 30;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 20;
        for (let i = 5; i <= 4 + daysInMonth; i++) {
            worksheet.getColumn(i).width = 4;
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JobWise_Attendance_${monthKey}.xlsx`);
    toast({ title: "Job-wise report generated." });
}
