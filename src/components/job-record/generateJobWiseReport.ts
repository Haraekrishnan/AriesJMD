
'use client';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, getDaysInMonth, parseISO } from 'date-fns';
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

    const jobCodeToEmployeeDays: { [jobNo: string]: { [profileId: string]: number[] } } = {};
    const nonWorkCodes = ["X", "Q", "ST", "NWS", "R", "OS", "ML", "L", "TR", "PD", "EP", "OFF", "PH", "S", "CQ", "RST"];

    for (const profileId in monthRecord.records) {
        const employeeDays = monthRecord.records[profileId].days;
        if (employeeDays) {
            for (const day in employeeDays) {
                const code = (employeeDays as any)[day];
                if (code && !nonWorkCodes.includes(code)) {
                    const jobCodeInfo = jobCodes.find(jc => jc.code === code);
                    const jobKey = jobCodeInfo?.jobNo || jobCodeInfo?.code || code;
                    
                    if (!jobCodeToEmployeeDays[jobKey]) {
                        jobCodeToEmployeeDays[jobKey] = {};
                    }
                    if (!jobCodeToEmployeeDays[jobKey][profileId]) {
                        jobCodeToEmployeeDays[jobKey][profileId] = [];
                    }
                    jobCodeToEmployeeDays[jobKey][profileId].push(parseInt(day));
                }
            }
        }
    }
    
    const uniqueJobNosWithData = Object.keys(jobCodeToEmployeeDays);

    if (uniqueJobNosWithData.length === 0) {
        toast({ title: "No job data found", description: "No employees have been assigned to any jobs this month." });
        return;
    }
    
    const workbook = new ExcelJS.Workbook();
    const logoBuffer = await fetchImageAsArrayBuffer('/images/Aries_logo.png');
    
    for (const sheetJobNo of uniqueJobNosWithData) {
        const sheetName = sheetJobNo.replace(/[\\/*?:[\]]/g, '_').substring(0, 31);
        if (workbook.getWorksheet(sheetName)) continue;
        
        const worksheet = workbook.addWorksheet(sheetName);
        const plantName = "MTF";
        const totalDays = getDaysInMonth(currentMonth);
        
        worksheet.mergeCells('A1:AJ1');
        worksheet.getCell('A1').value = "RIL JMD PROJECT";
        worksheet.getCell('A1').font = { bold: true, size: 16, name: 'Calibri' };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('A2:AJ2');
        worksheet.getCell('A2').value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plantName}`;
        worksheet.getCell('A2').font = { bold: true, size: 11, name: 'Calibri' };
        worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

        worksheet.mergeCells('B3:C3');
        worksheet.getCell('B3').value = 'Job Number';
        worksheet.getCell('B3').font = { bold: true, name: 'Calibri', size: 11 };
        worksheet.getCell('B3').alignment = { horizontal: 'center' };
        worksheet.getCell('B3').border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        worksheet.mergeCells('D3:E3');
        worksheet.getCell('D3').value = sheetJobNo;
        worksheet.getCell('D3').font = { bold: true, name: 'Calibri', size: 11 };
        worksheet.getCell('D3').alignment = { horizontal: 'center' };
        worksheet.getCell('D3').border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        if (logoBuffer) {
            const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
            worksheet.addImage(logoId, {
                tl: { col: 0, row: 0 },
                ext: { width: 100, height: 40 },
            });
        }
        worksheet.addRow([]);
        worksheet.addRow([]);
        
        const dayHeaders = Array.from({ length: totalDays }, (_, i) => i + 1);
        const header = ['S.No', 'Emp Code', 'Name', ...dayHeaders, 'Over Time', 'Salary Days', 'Additional Sunday'];
        const headerRow = worksheet.addRow(header);

        headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, name: 'Calibri', size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if(colNumber > 3 && colNumber <= 3 + totalDays) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
            } else {
                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
            }
        });

        const profileIdsForThisJob = Object.keys(jobCodeToEmployeeDays[sheetJobNo]);
        let slNo = 1;
        
        profileIdsForThisJob.forEach(profileId => {
            const profile = manpowerProfiles.find(p => p.id === profileId);
            if (profile) {
                const fullRecord = monthRecord.records[profileId];
                const dayData = fullRecord?.days || {};
                const otData = fullRecord?.dailyOvertime || {};
                
                const rowData: (string|number)[] = [slNo++, profile.epNumber || '', profile.name];
                
                // Build the daily attendance part of the row
                dayHeaders.forEach(day => {
                    const cellCode = (dayData[day] as string) || '';
                    if (!cellCode) {
                        rowData.push('');
                        return;
                    }
                    
                    const cellJobCodeInfo = jobCodes.find(jc => jc.code === cellCode);
                    const cellJobNo = cellJobCodeInfo?.jobNo || cellJobCodeInfo?.code;

                    if (cellJobNo === sheetJobNo) {
                        rowData.push('P');
                    } else if (nonWorkCodes.includes(cellCode)) {
                        rowData.push(cellCode);
                    } else {
                        rowData.push('');
                    }
                });

                // Calculate summary based on the generated row data, not the original data
                const workDays = rowData.slice(3, 3 + totalDays).filter(d => d === 'P').length;
                const offDays = Object.values(dayData).filter(c => ["OFF", "PH", "OS"].includes(c)).length;
                const leaveDays = Object.values(dayData).filter(c => ["L", "X", "NWS"].includes(c)).length;
                const mlDays = Object.values(dayData).filter(c => c === "ML").length;
                const standbyDays = Object.values(dayData).filter(c => ["ST", "TR", "EP", "PD", "Q"].includes(c)).length;
                const reptOfficeDays = Object.values(dayData).filter(c => c === "R").length;

                const totalOvertime = Object.values(otData).reduce((sum, h) => sum + (h || 0), 0);
                const additionalSundays = fullRecord?.additionalSundayDuty || 0;
                const salaryDays = additionalSundays + offDays + mlDays + standbyDays + reptOfficeDays + workDays;
                
                rowData.push(totalOvertime > 0 ? `${totalOvertime} Hours OT` : '', salaryDays, additionalSundays || '');
                const dataRow = worksheet.addRow(rowData);

                dataRow.eachCell((cell, colNumber) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
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
        });

        worksheet.getColumn('A').width = 5;
        worksheet.getColumn('B').width = 15;
        worksheet.getColumn('C').width = 30;
        for (let i = 4; i <= 3 + totalDays; i++) worksheet.getColumn(i).width = 4;
        for (let i = 4 + totalDays; i <= header.length; i++) worksheet.getColumn(i).width = 15;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JobWise_Attendance_${monthKey}.xlsx`);
    toast({ title: "Job-wise report generated." });
}
