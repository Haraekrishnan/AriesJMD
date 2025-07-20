
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';

// Draws a simplified vector logo directly onto the PDF
const addVectorLogo = (doc: jsPDF) => {
    const x = 14;
    const y = 15;
    const height = 10;
    
    doc.setDrawColor(33, 150, 243); // A nice blue color
    doc.setLineWidth(1.2);

    // Letter 'A'
    doc.line(x, y + height, x + height / 2, y);
    doc.line(x + height / 2, y, x + height, y + height);
    doc.line(x + height * 0.25, y + height / 2, x + height * 0.75, y + height / 2);

    // Simple wave/swoosh underneath
    doc.setLineWidth(0.8);
    const swooshY = y + height + 2;
    doc.arc(x + height / 2, swooshY, height / 2, 2.1, 3.14, 'S');
};


export async function generateSchedulePdf(schedule: JobSchedule | undefined, projectName: string, selectedDate: Date) {
    
    const doc = new jsPDF({ orientation: 'landscape' });

    // Add the logo
    addVectorLogo(doc);
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("Job Schedule", 280, 20, { align: 'right' });
    
    doc.setDrawColor(0, 0, 255); 
    doc.setLineWidth(0.5);
    doc.line(10, 23, 287, 23);

    doc.setFontSize(10);
    doc.text(`Project: ${projectName}`, 14, 28);
    doc.text(`Date: ${format(selectedDate, 'dd-MM-yyyy')}`, 280, 28, { align: 'right' });
    
    doc.setDrawColor(0, 0, 0); 
    doc.setLineWidth(0.2);
    doc.line(10, 31, 287, 31);
    
    const tableColumn = ["Sr.No", "Name", "Job Type", "Job No.", "Project/Vessel's", "Location", "Reporting Time", "Client/Contact", "Vehicle", "Remarks"];
    const tableRows = (schedule?.items || []).map((item, index) => [
        index + 1,
        Array.isArray(item.manpowerIds) ? item.manpowerIds.join(', ') : '', 
        item.jobType,
        item.jobNo,
        item.projectVesselName,
        item.location,
        item.reportingTime,
        item.clientContact,
        item.vehicleId,
        item.remarks
    ]);

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 8 },
    });
    
    doc.save(`JobSchedule_${projectName}_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
}
