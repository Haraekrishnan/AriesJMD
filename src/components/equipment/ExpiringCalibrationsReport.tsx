
'use client';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAppContext } from '@/contexts/app-provider';

interface ExpiringCalibrationsReportProps {
  expiringMachines: any[];
}

export default function ExpiringCalibrationsReport({ expiringMachines }: ExpiringCalibrationsReportProps) {
  const { projects } = useAppContext();

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const utSheet = workbook.addWorksheet('UT Machines');
    const dftSheet = workbook.addWorksheet('DFT Machines');
    const anemometerSheet = workbook.addWorksheet('Anemometers');

    const headers = [
      { header: 'Machine Name', key: 'name', width: 30 },
      { header: 'Serial No.', key: 'serial', width: 20 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'Calibration Due', key: 'dueDate', width: 20 },
    ];
    
    utSheet.columns = headers;
    dftSheet.columns = headers;
    anemometerSheet.columns = headers;

    expiringMachines.forEach(item => {
      const machine = item.machine;
      const projectName = projects.find(p => p.id === machine.projectId)?.name || 'N/A';
      const row = {
        name: machine.machineName || machine.make,
        serial: machine.serialNumber,
        project: projectName,
        dueDate: item.calibrationDueDate ? format(item.calibrationDueDate, 'dd-MM-yyyy') : 'N/A',
      };

      if (machine.probeDetails !== undefined) { // Likely UT or DFT
        if (machine.cableDetails !== undefined) utSheet.addRow(row);
        else dftSheet.addRow(row);
      } else { // Anemometer
        anemometerSheet.addRow(row);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Expiring_Calibrations_Report.xlsx');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text('Expiring Calibrations Report', 14, 15);
    
    (doc as any).autoTable({
        head: [['Machine Name', 'Serial No.', 'Project', 'Calibration Due']],
        body: expiringMachines.map(item => [
            item.machine.machineName || item.machine.make,
            item.machine.serialNumber,
            projects.find(p => p.id === item.machine.projectId)?.name || 'N/A',
            item.calibrationDueDate ? format(item.calibrationDueDate, 'dd-MM-yyyy') : 'N/A',
        ]),
        startY: 20,
    });
    
    doc.save('Expiring_Calibrations_Report.pdf');
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4"/>Excel</Button>
      <Button variant="outline" size="sm" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4"/>PDF</Button>
    </div>
  );
}
