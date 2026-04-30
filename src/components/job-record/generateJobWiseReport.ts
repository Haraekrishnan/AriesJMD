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
        // Row 1
worksheet.getCell('A1').value = "Project : JMD";
worksheet.getCell('A1').font = { bold: true, size: 14 };

worksheet.getCell('B1').value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plantName}`;
worksheet.getCell('B1').font = { size: 11 };

// Row 2
worksheet.getCell('A2').value = "Job No";
worksheet.getCell('A2').font = { bold: true };

worksheet.getCell('B2').value = sheetJobNo;
worksheet.getCell('B2').font = { bold: true };

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
                else if (['L', 'PH', 'OFF'].includes(cellCode)) {
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
                    } else {
                        value = '';
                    }
                }
            
                rowData.push(value);
            });

            const summary = dayHeadersExcel.reduce(
                (acc, day) => {
                    const code = (dayData as any)[day];
                    if (nonWorkCodes.includes(code)) {
                        if (["OFF", "PH", "OS"].includes(code)) acc.offDays++;
                        else if (["L", "X", "NWS"].includes(code)) acc.leaveDays++;
                        else if (code === "ML") acc.medicalLeave++;
                        else if (["ST", "TR", "EP", "PD", "Q"].includes(code)) acc.standbyTraining++;
                        else if (code === "R") acc.reptOffice++;
                    }
                    return acc;
                },
                { offDays: 0, leaveDays: 0, medicalLeave: 0, standbyTraining: 0, reptOffice: 0 }
            );

            const totalOvertime = Object.values(otData).reduce((sum, h) => sum + (h || 0), 0);
            const additionalSundays = fullRecord?.additionalSundayDuty || 0;
            const salaryDays = additionalSundays + summary.offDays + summary.medicalLeave + summary.standbyTraining + summary.reptOffice + workDaysForThisJob;
            
            rowData.push(
              summary.offDays,
              summary.leaveDays,
              summary.medicalLeave,
              summary.standbyTraining,
              summary.reptOffice,
              workDaysForThisJob,
              summary.offDays, 
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

            const summaryStart = 3 + totalDays;

            // Colors
            for (let i = summaryStart; i <= summaryStart + 4; i++) {
              dataRow.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
            }
            dataRow.getCell(summaryStart + 6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
            dataRow.getCell(summaryStart + 7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
            dataRow.getCell(summaryStart + 9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
        });
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber >= 4) {
                row.eachCell((cell) => {
                    cell.font = { name: 'Arial', size: 10 };
                    if (typeof cell.value === "string") {
                        const val = cell.value.trim().toUpperCase();
                        if (val === 'S') return;
                        const jobColor = JOB_CODE_COLORS[val as keyof typeof JOB_CODE_COLORS];
                        if (jobColor?.excelFill) {
                            if (jobColor.excelFill.fgColor) {
                                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: jobColor.excelFill.fgColor.argb } };
                            }
                            if (jobColor.excelFill.font?.color?.argb) {
                                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: jobColor.excelFill.font.color.argb } };
                            }
                        }
                    }
                });
            }
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
