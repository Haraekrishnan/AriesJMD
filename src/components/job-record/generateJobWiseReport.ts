
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

    const uniqueJobNosWithData: { [jobNo: string]: { code: string; details: string; profileIds: Set<string>; } } = {};
    const nonWorkCodes = ["X", "Q", "ST", "NWS", "R", "OS", "ML", "L", "TR", "PD", "EP", "OFF", "PH", "S", "CQ", "RST"];
    const allJobCodesForJobNo: { [jobNo: string]: string[] } = {};

    jobCodes.forEach(jc => {
      if (jc.jobNo) {
        if (!allJobCodesForJobNo[jc.jobNo]) {
          allJobCodesForJobNo[jc.jobNo] = [];
        }
        allJobCodesForJobNo[jc.jobNo].push(jc.code);
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
    const logoBuffer = await fetchImageAsArrayBuffer('/images/Aries_logo.png');
    
    for (const sheetJobNo in uniqueJobNosWithData) {
        const sheetName = sheetJobNo.replace(/[\\/*?:[\]]/g, '_').substring(0, 31);
        if (workbook.getWorksheet(sheetName)) continue;
        
        const worksheet = workbook.addWorksheet(sheetName);

// ✅ FIRST declare
const profileIdsForThisJob = Array.from(uniqueJobNosWithData[sheetJobNo].profileIds);

// ✅ THEN use
const plantSet = new Set<string>();

profileIdsForThisJob.forEach(id => {
    const plant = monthRecord.records?.[id]?.plant;
    if (plant) plantSet.add(plant);
});

const plantName = Array.from(plantSet).join(", ");
        const totalDays = getDaysInMonth(currentMonth);
        const totalCols = 3 + totalDays + 3;
        
        if (logoBuffer) {
            const logoId = workbook.addImage({ buffer: logoBuffer, extension: 'png' });
            worksheet.addImage(logoId, {
              tl: { col: 0.2, row: 0.3 },
              ext: { width: 160, height: 40 },
              editAs: "absolute",
          });
        }

        worksheet.mergeCells(1, 1, 1, totalCols);
        const cell1 = worksheet.getCell('A1');
        cell1.value = "RIL JMD PROJECT";
        cell1.font = { bold: true, size: 16, name: 'Calibri' };
        cell1.alignment = { horizontal: 'center', vertical: 'middle' };
        cell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9D9D9" } };

        worksheet.mergeCells(2, 1, 2, totalCols);
        const cell2 = worksheet.getCell('A2');
        cell2.value = `Job Record for ${format(currentMonth, "MMMM yyyy")} - Plant: ${plantName}`;
        cell2.font = { name: 'Calibri', size: 11 };
        cell2.alignment = { horizontal: 'center', vertical: 'middle' };
        cell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D9D9D9" } };
        
        worksheet.getRow(1).height = 35;
        worksheet.getRow(2).height = 25;

        worksheet.mergeCells('A4:B4');
        worksheet.getCell('A4').value = 'Job Number';
        worksheet.getCell('A4').font = { bold: true, name: 'Calibri', size: 11 };
        worksheet.getCell('A4').border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        worksheet.mergeCells('C4:D4');
        worksheet.getCell('C4').value = sheetJobNo;
        worksheet.getCell('C4').font = { bold: true, name: 'Calibri', size: 11, color: { argb: 'FF0000' } };
        worksheet.getCell('C4').alignment = { horizontal: 'center' };
        worksheet.getCell('C4').border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        worksheet.getRow(3).height = 10; // spacing row
worksheet.getRow(4).height = 20;
        
        const dayHeaders = Array.from({ length: totalDays }, (_, i) => i + 1);
        const header = ['S.No', 'Emp Code', 'Name', ...dayHeaders, 'Over Time', 'Salary Days', 'Additional Sunday'];
        const headerRow = worksheet.addRow(header);

        headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, size: 11 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDDEBF7" }
            };
        });

               
        const profilesOnThisJob = manpowerProfiles
          .filter(p => profileIdsForThisJob.includes(p.id))
          .sort((a,b) => (a.epNumber || '').localeCompare(b.epNumber || ''));

        let slNo = 1;
        
        profilesOnThisJob.forEach(profile => {
            const fullRecord = monthRecord.records?.[profile.id];
            const dayData = fullRecord?.days || {};
            const otData = fullRecord?.dailyOvertime || {};
            
            const rowData: (string|number)[] = [slNo++, '', profile.name];
            
            let workDaysForThisJob = 0;

            dayHeaders.forEach(day => {

    const cellCode = (dayData[day] as string) || '';
    const cellJobCodeInfo = jobCodes.find(jc => jc.code === cellCode);
    const cellJobNo = cellJobCodeInfo?.jobNo || cellJobCodeInfo?.code;

    let value = ''; // ✅ default ensures alignment

    // ✅ CASE 1: Working in this job
    if (
        cellJobNo === sheetJobNo ||
        (allJobCodesForJobNo[sheetJobNo] &&
         allJobCodesForJobNo[sheetJobNo].includes(cellCode))
    ) {
        value = 'P';
        workDaysForThisJob++;
    }

    // ✅ CASE 2: Leave (controlled logic)
    // ✅ CASE 2A: Leave (L)
else if (cellCode === 'L') {

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
      value = 'L';
  } else {
      value = '';
  }
}

// ✅ CASE 2B: Public Holiday (PH)
else if (cellCode === 'PH') {

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
      value = 'PH'; // ✅ explicitly PH
  } else {
      value = '';
  }
}

    // ✅ CASE 3: Other codes (OFF, PH, etc.)
    else if (nonWorkCodes.includes(cellCode)) {
        value = cellCode;
    }

    // ✅ ALWAYS PUSH ONCE
    rowData.push(value);
});

            const offDays = Object.values(dayData).filter(c => ["OFF", "PH", "OS"].includes(c)).length;
            const mlDays = Object.values(dayData).filter(c => c === "ML").length;
            const standbyDays = Object.values(dayData).filter(c => ["ST", "TR", "EP", "PD", "Q"].includes(c)).length;
            const reptOfficeDays = Object.values(dayData).filter(c => c === "R").length;

            const totalOvertime = Object.values(otData).reduce((sum, h) => sum + (h || 0), 0);
            const additionalSundays = fullRecord?.additionalSundayDuty || 0;
            const salaryDays = additionalSundays + offDays + mlDays + standbyDays + reptOfficeDays + workDaysForThisJob;
            
            rowData.push(totalOvertime > 0 ? `${totalOvertime} Hours OT` : '', salaryDays, additionalSundays || '');
            const dataRow = worksheet.addRow(rowData);

            dataRow.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
            dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
        });
        
        worksheet.eachRow({ includeEmpty: true }, row => {
            row.eachCell({ includeEmpty: true }, cell => {
              if (!cell.alignment) {
                cell.alignment = {
                  vertical: "middle",
                  horizontal: "center",
                  wrapText: true
                };
              }
            });
        });

        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
              if (typeof cell.value === "string") {
                const val = cell.value.trim().toUpperCase();
                const jobColor = JOB_CODE_COLORS[val as keyof typeof JOB_CODE_COLORS];
          
                if (jobColor?.excelFill) {
                  if (jobColor.excelFill.fgColor) {
                    cell.fill = {
                      type: "pattern",
                      pattern: "solid",
                      fgColor: { argb: jobColor.excelFill.fgColor.argb }
                    };
                  }
          
                  if (jobColor.excelFill.font?.color?.argb) {
                    cell.font = {
                      bold: true,
                      color: { argb: jobColor.excelFill.font.color.argb }
                    };
                  }
                }
              }
            });
        });

        worksheet.getColumn(2).width = 20;
        worksheet.getColumn(3).width = 32;

        for (let i = 4; i <= 3 + totalDays; i++) {
          worksheet.getColumn(i).width = 7;
        }

        for (let i = 4 + totalDays; i <= header.length; i++) {
          worksheet.getColumn(i).width = 15;
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JobWise_Attendance_${monthKey}.xlsx`);
    toast({ title: "Job-wise report generated." });
}
