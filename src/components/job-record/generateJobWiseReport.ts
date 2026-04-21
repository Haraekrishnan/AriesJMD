
'use client';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, getDaysInMonth } from 'date-fns';
import type { JobCode, JobRecord, ManpowerProfile } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { JOB_CODE_COLORS } from '@/lib/job-codes';

async function fetchImageAsArrayBuffer(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return response.arrayBuffer();
}

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
                    const jobCodeInfo = jobCodes.find(jc => jc.code === code);
                    const key = jobCodeInfo?.jobNo || jobCodeInfo?.code || code;
                    if (!jobCodeToEmployeeDays[key]) {
                        jobCodeToEmployeeDays[key] = {};
                    }
                    if (!jobCodeToEmployeeDays[key][profileId]) {
                        jobCodeToEmployeeDays[key][profileId] = [];
                    }
                    jobCodeToEmployeeDays[key][profileId].push(parseInt(day));
                }
            }
        }
    }

    const jobCodesWithData = jobCodes.filter(jc => jobCodeToEmployeeDays[jc.jobNo || jc.code]);

    if (jobCodesWithData.length === 0) {
        toast({ title: "No job data found", description: "No employees have been assigned to any jobs this month." });
        return;
    }
    
    const workbook = new ExcelJS.Workbook();
    const logoBuffer = await fetchImageAsArrayBuffer('/images/Aries_logo.png');
    
    for (const jobCode of jobCodesWithData) {
        const sheetName = (jobCode.jobNo || jobCode.code).replace(/[\\/*?:[\]]/g, '_').substring(0, 31);
        if (workbook.getWorksheet(sheetName)) continue;
        
        const worksheet = workbook.addWorksheet(sheetName);
        const plantName = "MTF"; // This seems static from the image
        const totalDays = getDaysInMonth(currentMonth);
        
        // --- Headers ---
        worksheet.mergeCells('A1:AJ1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = "RIL JMD PROJECT";
        titleCell.font = { bold: true, size: 16, name: 'Calibri' };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.mergeCells('A2:AJ2');
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plantName}`;
        subtitleCell.font = { bold: true, size: 11, name: 'Calibri' };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('B3:C3');
        const jobNoLabelCell = worksheet.getCell('B3');
        jobNoLabelCell.value = 'Job Number';
        jobNoLabelCell.font = { bold: true, name: 'Calibri', size: 11 };
        jobNoLabelCell.alignment = { horizontal: 'center' };
        jobNoLabelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };


        worksheet.mergeCells('D3:E3');
        const jobNoValueCell = worksheet.getCell('D3');
        jobNoValueCell.value = jobCode.jobNo || jobCode.code;
        jobNoValueCell.font = { bold: true, name: 'Calibri', size: 11 };
        jobNoValueCell.alignment = { horizontal: 'center' };
        jobNoValueCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        if (logoBuffer) {
            const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
            worksheet.addImage(logoId, {
                tl: { col: 0, row: 0 },
                ext: { width: 100, height: 40 },
            });
        }
        worksheet.addRow([]);
        worksheet.addRow([]);
        
        // --- Table Headers ---
        const dayHeaders = Array.from({ length: totalDays }, (_, i) => i + 1);
        const header = ['S.No', 'Emp Code', 'Name', ...dayHeaders, 'Over Time', 'Salary Days', 'Additional Sunday'];
        const headerRow = worksheet.addRow(header);

        headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, name: 'Calibri', size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if(colNumber > 3 && colNumber <= 3 + totalDays) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } }; // Green fill
            } else {
                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Grey fill
            }
        });

        // --- Table Body ---
        const employeeDataForJob = jobCodeToEmployeeDays[jobCode.jobNo || jobCode.code];
        let slNo = 1;
        for (const profileId in employeeDataForJob) {
            const profile = manpowerProfiles.find(p => p.id === profileId);
            if (profile) {
                const fullRecord = monthRecord.records[profileId];
                const dayData = fullRecord?.days || {};
                const otData = fullRecord?.dailyOvertime || {};
                const additionalSunday = fullRecord?.additionalSundayDuty || 0;
                
                let salaryDays = additionalSunday;
                let workDays = 0, offDays = 0, leaveDays = 0, mlDays = 0, standbyDays = 0, reptOfficeDays = 0;
                let totalOvertime = 0;

                const rowData = [slNo++, profile.epNumber || '', profile.name];

                dayHeaders.forEach(day => {
                    const code = dayData[day] as string;
                    if(code === jobCode.code) {
                        rowData.push('P');
                        workDays++;
                    } else {
                        rowData.push(code || '');
                    }
                    if(['OFF','PH','OS'].includes(code)) offDays++;
                    if(['L','X','NWS'].includes(code)) leaveDays++;
                    if(code === 'ML') mlDays++;
                    if(['ST','TR','EP','PD','Q'].includes(code)) standbyDays++;
                    if(code === 'R') reptOfficeDays++;
                    if(code && !['X', 'Q', 'ST', 'NWS', 'R', 'OS', 'ML', 'L', 'TR', 'PD', 'EP', 'OFF', 'PH', 'S', 'CQ', 'RST'].includes(code)) workDays++;

                    totalOvertime += Number(otData[day] || 0);
                });

                salaryDays += offDays + mlDays + standbyDays + reptOfficeDays + workDays;
                
                rowData.push(totalOvertime > 0 ? `${totalOvertime} Hours OT` : '', salaryDays, additionalSunday || '');
                const dataRow = worksheet.addRow(rowData);
                dataRow.eachCell((cell, colNumber) => {
                    cell.alignment = { horizontal: 'center' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    if (colNumber > 3 && colNumber <= 3 + totalDays) {
                        const cellCode = String(cell.value);
                        const colorInfo = JOB_CODE_COLORS[cellCode as keyof typeof JOB_CODE_COLORS];
                        if (colorInfo?.excelFill) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: colorInfo.excelFill.fgColor };
                            if (colorInfo.excelFill.font) cell.font = { ...cell.font, color: colorInfo.excelFill.font.color };
                        }
                    }
                });
            }
        }

        // --- Column Widths ---
        worksheet.getColumn('A').width = 5;
        worksheet.getColumn('B').width = 15;
        worksheet.getColumn('C').width = 30;
        for (let i = 4; i <= 3 + totalDays; i++) worksheet.getColumn(i).width = 4;
        worksheet.getColumn(4 + totalDays).width = 12;
        worksheet.getColumn(5 + totalDays).width = 12;
        worksheet.getColumn(6 + totalDays).width = 12;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JobWise_Attendance_${monthKey}.xlsx`);
    toast({ title: "Job-wise report generated." });
}
