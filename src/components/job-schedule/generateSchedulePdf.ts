
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';

export async function generateSchedulePdf(schedule: JobSchedule | undefined, projectName: string, selectedDate: Date) {
    
    const doc = new jsPDF({ orientation: 'landscape' });

    // Helper function to load image via fetch and convert to Base64
    const addImageToPdf = async (): Promise<void> => {
        try {
            const response = await fetch('/aries_logo.png');
            if (!response.ok) {
                throw new Error('Logo not found');
            }
            const blob = await response.blob();
            const reader = new FileReader();
            
            return new Promise((resolve, reject) => {
                reader.onloadend = () => {
                    const base64data = reader.result;
                    if (typeof base64data === 'string') {
                        doc.addImage(base64data, 'PNG', 14, 12, 50, 10);
                        resolve();
                    } else {
                        reject(new Error('Failed to read image as Base64.'));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Failed to load image for PDF:", error);
            // Fallback to text if image loading fails
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("ARIES", 14, 20);
        }
    };

    // Add the logo
    await addImageToPdf();
    
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
        item.manpowerIds.join(', '), 
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
