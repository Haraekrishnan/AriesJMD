
'use client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAppContext } from '@/contexts/app-provider';

interface ExpiringDocumentsReportProps {
  expiringVehicles: any[];
  expiringDrivers: any[];
}

export default function ExpiringDocumentsReport({ expiringVehicles, expiringDrivers }: ExpiringDocumentsReportProps) {
    const { drivers } = useAppContext();
  
    const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Vehicles Sheet
    const vehicleSheet = workbook.addWorksheet('Expiring Vehicles');
    vehicleSheet.columns = [
        { header: 'Vehicle Number', key: 'number', width: 20 },
        { header: 'Driver', key: 'driver', width: 25 },
        { header: 'Expiring Document', key: 'doc', width: 30 },
    ];
    expiringVehicles.forEach(item => {
        vehicleSheet.addRow({
            number: item.vehicle.vehicleNumber,
            driver: drivers.find(d => d.id === item.vehicle.driverId)?.name || 'N/A',
            doc: item.expiringDocs.join(', '),
        });
    });

    // Drivers Sheet
    const driverSheet = workbook.addWorksheet('Expiring Drivers');
    driverSheet.columns = [
        { header: 'Driver Name', key: 'name', width: 25 },
        { header: 'License No.', key: 'license', width: 20 },
        { header: 'Expiring Document', key: 'doc', width: 40 },
    ];
    expiringDrivers.forEach(item => {
        driverSheet.addRow({
            name: item.driver.name,
            license: item.driver.licenseNumber,
            doc: item.expiringDocs.join(', '),
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Expiring_Fleet_Documents_Report.xlsx');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text('Expiring Fleet Documents Report', 14, 15);
    
    if (expiringVehicles.length > 0) {
        doc.text('Expiring Vehicles', 14, 25);
        (doc as any).autoTable({
            head: [['Vehicle No.', 'Driver', 'Expiring Document']],
            body: expiringVehicles.map(item => [
                item.vehicle.vehicleNumber,
                drivers.find(d => d.id === item.vehicle.driverId)?.name || 'N/A',
                item.expiringDocs.join(', '),
            ]),
            startY: 30,
        });
    }

    if (expiringDrivers.length > 0) {
        const startY = expiringVehicles.length > 0 ? (doc as any).lastAutoTable.finalY + 20 : 25;
        doc.text('Expiring Drivers', 14, startY);
        (doc as any).autoTable({
            head: [['Driver Name', 'License No.', 'Expiring Document']],
            body: expiringDrivers.map(item => [
                item.driver.name,
                item.driver.licenseNumber,
                item.expiringDocs.join(', '),
            ]),
            startY: startY + 5,
        });
    }
    
    doc.save('Expiring_Fleet_Documents_Report.pdf');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4"/>Excel</Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4"/>PDF</Button>
    </div>
  );
}
