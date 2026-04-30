'use client';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, getDaysInMonth, parseISO, isValid } from 'date-fns';
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

    const uniqueJobNosWithData: { [jobNo: string]: { code: string; details: string; profileIds: Set<string>; } } = {};
    const nonWorkCodes = ["X", "Q", "ST", "NWS", "R", "OS", "ML", "L", "TR", "PD", "EP", "OFF", "PH", "S", "CQ", "RST"];
    const allJobCodesForJobNo: { [jobNo: string]: string[] } = {};

    jobCodes.forEach(jc => {
      const jobKey = jc.jobNo || jc.code;
      if (jobKey) {
        if (!allJobCodesForJobNo[jobKey]) {
            allJobCodesForJobNo[jobKey] = [];
        }
        allJobCodesForJobNo[jobKey].push(jc.code);
      }
    });

    for (const profileId in monthRecord.records) {
        const employeeDays = monthRecord.records[profileId].days;
        if (employeeDays) {
            for (const day in employeeDays) {
                const code = (employeeDays as any)[day];
                if (code && !nonWorkCodes.includes(code)) {
                    const jobCodeInfo = jobCodes.find(jc => jc.code === code);
                    const jobKey = jobCodeInfo?.jobNo || jobCodeInfo?.code || code;
                    
                    if (!uniqueJobNosWithData[jobKey]) {
                        uniqueJobNosWithData[jobKey] = {
                            code: jobCodeInfo?.code || code,
                            details: jobCodeInfo?.details || 'Unknown Job',
                            profileIds: new Set()
                        };
                    }
                    uniqueJobNosWithData[jobKey].profileIds.add(profileId);
                }
            }
        }
    }
    
    if (Object.keys(uniqueJobNosWithData).length === 0) {
        toast({ title: "No job data found", description: "No employees have been assigned to any jobs this month." });
        return;
    }
    
    const workbook = new ExcelJS.Workbook();
    const logoBuffer = await fetchImageAsArrayBuffer('/images/Aries_logo.png').catch(() => null);

    for (const sheetJobNo in uniqueJobNosWithData) {
        const worksheet = workbook.addWorksheet(sheetJobNo.replace(/[\\/*?:[\]]/g, "").substring(0, 31));

        const profileIdsForThisJob = Array.from(uniqueJobNosWithData[sheetJobNo].profileIds);
        const plantSet = new Set<string>();
        profileIdsForThisJob.forEach(id => {
            const plant = monthRecord.records?.[id]?.plant;
            if (plant) plantSet.add(plant);
        });
        const plantName = Array.from(plantSet).join(", ") || "Multiple Plants";

        const totalDays = getDaysInMonth(currentMonth);
        const dayHeadersExcel = Array.from({ length: totalDays }, (_, i) => i + 1);
        const totalCols = 2 + totalDays + 10;

        // HEADER
        worksheet.mergeCells(1, 1, 1, totalCols);
        const titleCell = worksheet.getCell('A1');
        titleCell.value = "Project : JMD";
        titleCell.font = { bold: true, size: 14 };

        worksheet.mergeCells(2, 1, 2, totalCols);
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plantName}`;
        subtitleCell.font = { size: 11 };

        worksheet.mergeCells(3, 1, 3, totalCols);
        const jobNoCell = worksheet.getCell('A3');
        jobNoCell.value = `Job No: ${sheetJobNo}`;
        jobNoCell.font = { bold: true };

        const header = [
          "Name",
          "Employee Code",
          ...dayHeadersExcel.map(String),
          "Total OFF",
          "Total Leave",
          "Total ML",
          "Total Standby",
          "Total Reporting",
          "Total Site Days",
          "Total PH or FH",
          "Salary Days",
          "Overtime Hours",
          "Remarks"
        ];
    
        const headerRow = worksheet.addRow(header);
        headerRow.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB7DEE8" } };
            cell.font = { bold: true, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        const profilesOnThisJob = manpowerProfiles
          .filter(p => profileIdsForThisJob.includes(p.id))
          .sort((a,b) => (a.employeeCode || '').localeCompare(b.employeeCode || ''));

        profilesOnThisJob.forEach(profile => {
            const fullRecord = monthRecord.records?.[profile.id];
            const dayData = fullRecord?.days || {};
            const otData = fullRecord?.dailyOvertime || {};
            
            const rowData: (string|number)[] = [
              profile.name,
              profile.employeeCode || ''
            ];
            
            let workDaysForThisJob = 0;
            let offDays = 0;
            let leaveDays = 0;
            let medicalLeave = 0;
            let standbyDays = 0;
            let reportingDays = 0;
            let phfhDays = 0;

            dayHeadersExcel.forEach(day => {
                const cellCode = (dayData[day] as string) || '';
                const cellJobCodeInfo = jobCodes.find(jc => jc.code === cellCode);
                const cellJobNo = cellJobCodeInfo?.jobNo || cellJobCodeInfo?.code;
            
                let value = ''; 
            
                if (
                  cellJobNo === sheetJobNo ||
                  (allJobCodesForJobNo[sheetJobNo] &&
                    allJobCodesForJobNo[sheetJobNo].includes(cellCode))
                ) {
                  value = 'S';
                  workDaysForThisJob++;
                } 
                else if (['L', 'PH', 'OFF', 'ML', 'ST', 'R'].includes(cellCode)) {
                    let previousJobNo = null;
                    for (let d = day - 1; d >= 1; d--) {
                        const prevCode = dayData[d];
                        if (prevCode && !nonWorkCodes.includes(prevCode)) {
                            const prevJobInfo = jobCodes.find(jc => jc.code === prevCode);
                            previousJobNo = prevJobInfo?.jobNo || prevJobInfo?.code;
                            break;
                        }
                    }
                
                    if (previousJobNo === sheetJobNo) {
                        value = cellCode;
                        if (value === 'OFF') offDays++;
                        else if (value === 'L') leaveDays++;
                        else if (value === 'ML') medicalLeave++;
                        else if (value === 'ST') standbyDays++;
                        else if (value === 'R') reportingDays++;
                        else if (value === 'PH') phfhDays++;
                    }
                }
                rowData.push(value);
            });

            const totalOvertime = Object.values(otData).reduce((sum: number, h: any) => sum + (Number(h) || 0), 0);
            const additionalSundays = fullRecord?.additionalSundayDuty || 0;
            const salaryDays = additionalSundays + offDays + medicalLeave + standbyDays + reportingDays + workDaysForThisJob;
            
            rowData.push(
              offDays,
              leaveDays,
              medicalLeave,
              standbyDays,
              reportingDays,
              workDaysForThisJob,
              phfhDays, 
              salaryDays,
              totalOvertime,
              "" // Remarks
            );
            
            const dataRow = worksheet.addRow(rowData);

            dataRow.eachCell({ includeEmpty: true }, (cell) => {
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            });

            dataRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
            dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        });
        
        worksheet.getColumn(1).width = 30;
        worksheet.getColumn(2).width = 20;
        for (let i = 3; i <= 2 + totalDays; i++) worksheet.getColumn(i).width = 4.5;
        for (let i = 3 + totalDays; i <= header.length; i++) worksheet.getColumn(i).width = 7.8;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JobWise_Attendance_${monthKey}.xlsx`);
    toast({ title: "Job-wise report generated." });
}