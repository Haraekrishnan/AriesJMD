
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';

export function generateScheduleExcel(schedule: JobSchedule | undefined, projectName: string, selectedDate: Date) {
    const wb = XLSX.utils.book_new();

    const header = [
      "Sr. No", "Name", "Job Type", "Job No.", "Project/Vessel's name", "Location", 
      "Reporting Time", "Client / Contact Person Number", "vehicle", "Special instruction/Remarks"
    ];
    
    const body = (schedule?.items || []).map((item, index) => [
        index + 1,
        item.manpowerIds.join(', '), // Placeholder, replace with actual names
        item.jobType,
        item.jobNo,
        item.projectVesselName,
        item.location,
        item.reportingTime,
        item.clientContact,
        item.vehicleId, // Placeholder, replace with actual vehicle number
        item.remarks
    ]);

    const ws_data = [
        ["ARIES", null, null, null, null, null, null, null, null, "Job Schedule"],
        [`Project: ${projectName}`, null, null, null, null, null, null, null, null, `Date: ${format(selectedDate, 'dd-MM-yyyy')}`],
        [],
        header,
        ...body
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, 
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];
    
    // Set column widths for better readability
    ws['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, 
        { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Job Schedule");
    
    XLSX.writeFile(wb, `JobSchedule_${projectName}_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
}
