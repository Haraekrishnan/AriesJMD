
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';

export async function generateSchedulePdf(schedule: JobSchedule | undefined, projectName: string, selectedDate: Date) {
    
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ARIES", 14, 20);
    
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
