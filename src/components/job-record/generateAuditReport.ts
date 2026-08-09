'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO, isValid } from 'date-fns';
import type { JobRecordAuditEntry, ManpowerProfile } from '@/lib/types';

/**
 * Generates an Excel report for the Job Record Audit Log.
 */
export async function generateAuditReportExcel(
    currentMonth: Date,
    auditLogs: JobRecordAuditEntry[],
    manpowerProfiles: ManpowerProfile[]
) {
    const monthKey = format(currentMonth, 'yyyy-MM');
    
    // Sort logs descending by timestamp
    const filteredLogs = (auditLogs || [])
        .filter(log => log && log.month === monthKey)
        .sort((a, b) => {
            const timeA = a.timestamp ? parseISO(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? parseISO(b.timestamp).getTime() : 0;
            return timeB - timeA;
        });

    if (filteredLogs.length === 0) {
        return; // Handled by component
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('History Log');

    // Header styling
    const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { 
            top: { style: 'thin' }, 
            left: { style: 'thin' }, 
            bottom: { style: 'thin' }, 
            right: { style: 'thin' } 
        }
    };

    sheet.columns = [
        { header: 'DATE & TIME OF CHANGE', key: 'timestamp', width: 25 },
        { header: 'MODIFIED BY', key: 'userName', width: 25 },
        { header: 'EMPLOYEE NAME', key: 'profileName', width: 30 },
        { header: 'DATE IN SHEET', key: 'day', width: 15 },
        { header: 'FIELD TYPE', key: 'field', width: 20 },
        { header: 'NEW VALUE / CODE', key: 'value', width: 35 },
    ];

    sheet.getRow(1).height = 25;
    sheet.getRow(1).eachCell((cell) => {
        cell.style = headerStyle as ExcelJS.Style;
    });

    filteredLogs.forEach(log => {
        const profile = manpowerProfiles.find(p => p.id === log.profileId);
        
        let displayField = log.field;
        switch(log.field) {
            case 'status': displayField = 'Attendance Code'; break;
            case 'dailyOvertime': displayField = 'Overtime Hours'; break;
            case 'dailyComments': displayField = 'Daily Comment'; break;
            case 'sundayDuty': displayField = 'Sunday Duty'; break;
            case 'plant': displayField = 'Plant Assignment'; break;
            case 'isHoliday': displayField = 'Holiday Toggle'; break;
        }

        const rowDate = log.day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), log.day) : null;

        const row = sheet.addRow({
            timestamp: log.timestamp ? format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm:ss') : 'N/A',
            userName: log.userName || 'Unknown',
            profileName: profile?.name || `ID: ${log.profileId}`,
            day: (rowDate && isValid(rowDate)) ? format(rowDate, 'dd MMM yyyy') : 'General',
            field: displayField,
            value: (log.value === null || log.value === '') ? '[CLEARED]' : String(log.value),
        });

        row.eachCell((cell) => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            cell.font = { name: 'Calibri', size: 10 };
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `JobRecord_AuditLog_${monthKey}.xlsx`);
}
