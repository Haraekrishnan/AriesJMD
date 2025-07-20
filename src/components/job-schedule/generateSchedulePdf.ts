
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export function generateSchedulePdf(projectId: string, selectedDate: Date) {
    // This is a placeholder for where you'd fetch real data.
    // In a real app, you would pass the actual schedule data here.
    const scheduleData = {
        // Mock data for demonstration
        items: [
            { client: "Client A", jobDescription: "UT/MPI Inspection", location: "Area 1", manpower: "John (L1), Doe (L2)", equipment: "UT Kit, MPI Yoke", remarks: "Night shift" },
            { client: "Client B", jobDescription: "Anchor Point Testing", location: "Rooftop", manpower: "Peter (L3)", equipment: "Load Cell", remarks: "Requires permit" }
        ]
    };
    
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Placeholder for logo - In a real scenario, you'd load a base64 image
    doc.setFontSize(22);
    doc.setTextColor(255, 0, 0); // Red color for "ARIES"
    doc.text("ARIES", 14, 20);
    doc.setTextColor(0, 0, 0); // Reset color
    
    doc.setFontSize(18);
    doc.text("Job Schedule", 280, 20, { align: 'right' });
    
    doc.setDrawColor(0, 0, 255); // Blue line
    doc.setLineWidth(0.5);
    doc.line(10, 23, 287, 23);

    doc.setFontSize(10);
    doc.text("Division/Branch: I & M / Jamnagar", 14, 28);
    doc.text("Sub-Div: R.A", 150, 28, { align: 'center'});
    doc.text(`Date: ${format(selectedDate, 'dd-MM-yyyy')}`, 280, 28, { align: 'right' });
    
    doc.setDrawColor(0, 0, 0); // Black line
    doc.setLineWidth(0.2);
    doc.line(10, 31, 287, 31);
    
    const tableColumn = ["Sl.No", "Client", "Job Description", "Location", "Manpower", "Equipment", "Remarks"];
    const tableRows = scheduleData.items.map((item, index) => [
        index + 1,
        item.client,
        item.jobDescription,
        item.location,
        item.manpower,
        item.equipment,
        item.remarks
    ]);

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
    });
    
    doc.save(`JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
