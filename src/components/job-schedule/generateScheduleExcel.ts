
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export function generateScheduleExcel(projectId: string, selectedDate: Date) {
    // This is a placeholder for where you'd fetch real data.
    // In a real app, you would pass the actual schedule data here.
    const scheduleData = {
        // Mock data for demonstration
        items: [
            { client: "Client A", jobDescription: "UT/MPI Inspection", location: "Area 1", manpower: "John (L1), Doe (L2)", equipment: "UT Kit, MPI Yoke", remarks: "Night shift" },
            { client: "Client B", jobDescription: "Anchor Point Testing", location: "Rooftop", manpower: "Peter (L3)", equipment: "Load Cell", remarks: "" }
        ]
    };
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Create the main data array for the sheet
    let ws_data = [
        // Header Row 1 (Merged)
        ["Aries Marine", null, null, null, null, null, null, "Job Schedule"],
        // Header Row 2
        ["Division/Branch: I & M / Jamnagar", null, null, "Sub-Div: R.A", null, null, null, `Date: ${format(selectedDate, 'dd-MM-yyyy')}`],
        // Empty row for spacing
        [],
        // Table Header
        ["Sl. No", "Client", "Job Description / Scope of Work", "Location", "Manpower Assigned", "Equipment Required", "Remarks"]
    ];

    // Add schedule items to the data array
    scheduleData.items.forEach((item, index) => {
        ws_data.push([
            index + 1,
            item.client,
            item.jobDescription,
            item.location,
            item.manpower,
            item.equipment,
            item.remarks
        ]);
    });
    
    // Footer - can be added here if needed

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    
    // Define merges
    ws['!merges'] = [
        // Header 1
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Merge A1:G1 for logo/company
        // Header 2
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Merge A2:C2 for Division
        { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } }, // Merge D2:G2 for Sub-Div
    ];
    
    // Set column widths (optional, but good for formatting)
    ws['!cols'] = [
        { wch: 8 },  // Sl. No
        { wch: 20 }, // Client
        { wch: 40 }, // Job Description
        { wch: 20 }, // Location
        { wch: 30 }, // Manpower
        { wch: 30 }, // Equipment
        { wch: 30 }  // Remarks
    ];

    // Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Job Schedule");
    
    // Generate and download the file
    XLSX.writeFile(wb, `JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
}
