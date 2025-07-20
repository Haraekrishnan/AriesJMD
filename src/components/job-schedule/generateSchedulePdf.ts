
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { JobSchedule } from '@/lib/types';
import logo from '/public/aries_logo.png'; // Import the logo directly

export async function generateSchedulePdf(schedule: JobSchedule | undefined, projectName: string, selectedDate: Date) {
    
    const doc = new jsPDF({ orientation: 'landscape' });

    // Helper function to load image and add to canvas
    const addImageToPdf = (imgUrl: string): Promise<void> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    // Fallback to text if canvas fails
                    doc.setFontSize(16);
                    doc.setFont("helvetica", "bold");
                    doc.text("ARIES", 14, 20);
                    resolve();
                    return;
                }
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                doc.addImage(dataUrl, 'PNG', 14, 12, 50, 10);
                resolve();
            };
            img.onerror = () => {
                // If image fails to load, add text as a fallback
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.text("ARIES", 14, 20);
                resolve(); // Resolve anyway so the PDF can still be generated
            };
            img.src = imgUrl;
        });
    };

    // Add the logo using the helper and the imported static path
    await addImageToPdf(logo.src);
    
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
