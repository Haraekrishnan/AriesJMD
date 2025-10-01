
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';

// Excel cell colors (ARGB format)
const colorMap: { [key: string]: string } = {
    'X': 'FFFFC7CE', 'ML': 'FFFFC7CE', // Light Red
    'ST': 'FFBDE2FF', 'Q': 'FFBDE2FF', 'KD': 'FFBDE2FF', // Light Blue
    'NWS': 'FFD9D2E9', // Light Purple
    'OS': 'FFFFF2CC', // Light Yellow
    'TR': 'FFFFD9E2', // Light Pink
    'EP': 'FFD9EAD3', 'PH': 'FFD9EAD3', 'PD': 'FFD9EAD3', // Light Green
    'OFF': 'FFE6E6E6', // Light Gray
    'L': 'FFFFC7CE', // Re-using Light Red for Leave
    'S': 'FFBDE2FF', // Standby as Light Blue
    'RST': 'FFFFD9E2', // Training as Light Pink
};


export function generateScheduleExcel(schedule: JobSchedule | undefined, projectName: string, selectedDate: Date) {
    const wb = XLSX.utils.book_new();

    const header = [
      "Sr. No", "Name", "Job Type", "Job No.", "Project/Vessel's name", "Location", 
      "Reporting Time", "Client / Contact Person Number", "vehicle", "Special instruction/Remarks"
    ];
    
    const body = (schedule?.items || []).map((item, index) => [
        index + 1,
        Array.isArray(item.manpowerIds) ? item.manpowerIds.join(', ') : '', 
        item.jobType || '',
        item.jobNo || '',
        item.projectVesselName || '',
        item.location || '',
        item.reportingTime || '',
        item.clientContact || '',
        item.vehicleId || 'N/A',
        item.remarks || ''
    ]);

    // Group rows by Project/Vessel's name if it's a master schedule
    const title = projectName === 'Master Schedule' ? 'MASTER JOB SCHEDULE' : 'Job Schedule';
    const projectTitle = projectName === 'Master Schedule' ? `All Projects` : `Project: ${projectName}`;
    
    const ws_data = [
        ["ARIES", null, null, null, null, null, null, null, null, title],
        [projectTitle, null, null, null, null, null, null, null, null, `Date: ${format(selectedDate, 'dd-MM-yyyy')}`],
        [],
        header,
        ...body
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Define merges for the header rows
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, 
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];
    
    // Apply styling to header cells
    const boldStyle = { font: { bold: true, sz: 16 } };
    const rightAlignStyle = { ...boldStyle, alignment: { horizontal: "right" } };

    if(!ws['A1']) ws['A1'] = {t:'s', v:''};
    ws['A1'].s = boldStyle;
    ws['A1'].v = "ARIES";
    
    if(!ws['J1']) ws['J1'] = {t:'s', v:''};
    ws['J1'].s = rightAlignStyle;
    ws['J1'].v = title;

    // Set column widths for better readability
    ws['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, 
        { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Job Schedule");
    
    const fileName = projectName === 'Master Schedule' 
        ? `Master_JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`
        : `JobSchedule_${projectName}_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
}
