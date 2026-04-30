
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

function groupSorItems(items: any[]) {
    const grouped: Record<string, any> = {};

    items.forEach(item => {
        const key = `${item.serviceCode}_${item.rate}_${item.scopeDescription}`;

        if (!grouped[key]) {
            grouped[key] = { ...item };
        } else {
            grouped[key].eicApprovedQty =
                (grouped[key].eicApprovedQty || 0) +
                (item.eicApprovedQty || 0);
        }
    });

    return Object.values(grouped);
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
        const totalCols = 2 + totalDays + 11;

        // Row 1 – Title
        worksheet.mergeCells(1, 1, 1, totalCols);
        const cell1 = worksheet.getCell(1, 1);
        cell1.value = "RIL JMD PROJECT";
        cell1.font = { bold: true, size: 16 };
        cell1.alignment = { horizontal: "center", vertical: "middle" };
        cell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9D9D9" } };
        worksheet.getRow(1).height = 35;

        // Row 2 – Month / Plant
        worksheet.mergeCells(2, 1, 2, totalCols);
        const cell2 = worksheet.getCell(2, 1);
        cell2.value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plantName}`;
        cell2.font = { bold: true, size: 13 };
        cell2.alignment = { horizontal: "center", vertical: "middle" };
        cell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9D9D9" } };
        worksheet.getRow(2).height = 25;

        if (logoBuffer) {
            const logoId = workbook.addImage({
                buffer: logoBuffer,
                extension: "png",
            });
            worksheet.addImage(logoId, {
                tl: { col: 0.2, row: 0.3 },
                ext: { width: 160, height: 40 },
                editAs: "absolute",
            });
        }

        worksheet.addRow([]); // Row 3 empty spacer

        // Job Number Header
        worksheet.mergeCells('A4:B4');
        const labelCell = worksheet.getCell('A4');
        labelCell.value = 'Job Number';
        labelCell.font = { bold: true };
        labelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        worksheet.mergeCells('C4:D4');
        const valueCell = worksheet.getCell('C4');
        valueCell.value = sheetJobNo;
        valueCell.font = { bold: true, color: { argb: 'FFFF0000' } };
        valueCell.alignment = { horizontal: 'center' };
        valueCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        
        worksheet.getRow(4).height = 20;

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
        });
        
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 5) {
                row.eachCell((cell) => {
                    if (typeof cell.value === "string") {
                        const val = cell.value.trim().toUpperCase();
                        if (val === 'S') return;
                        const jobColor = JOB_CODE_COLORS[val as keyof typeof JOB_CODE_COLORS];
                        if (jobColor?.excelFill) {
                            if (jobColor.excelFill.fgColor) {
                                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: jobColor.excelFill.fgColor.argb } };
                            }
                            if (jobColor.excelFill.font?.color?.argb) {
                                cell.font = { bold: true, color: { argb: jobColor.excelFill.font.color.argb } };
                            }
                        }
                    }
                });
            }
        });

        worksheet.getColumn(1).width = 30;
        worksheet.getColumn(2).width = 20;

        for (let i = 3; i <= 2 + totalDays; i++) {
          worksheet.getColumn(i).width = 7;
        }

        for (let i = 3 + totalDays; i <= header.length; i++) {
          worksheet.getColumn(i).width = 15;
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JobWise_Attendance_${monthKey}.xlsx`);
    toast({ title: "Job-wise report generated." });
}
