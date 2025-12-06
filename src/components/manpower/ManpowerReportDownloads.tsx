
'use client';
import type { ManpowerProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface ManpowerReportDownloadsProps {
  profiles: ManpowerProfile[];
}

export default function ManpowerReportDownloads({ profiles }: ManpowerReportDownloadsProps) {
  
  const handleDownloadExcel = () => {
    if (profiles.length === 0) {
        alert("No data available for the selected filters.");
        return;
    }

    const dataToExport = profiles.flatMap(p => {
        const baseData = {
          'Name': p.name,
          'Trade': p.trade,
          'Status': p.status,
          'Hard Copy File No': p.hardCopyFileNo || 'N/A',
          'Emergency Contact Number': p.emergencyContactNumber || 'N/A',
          'Emergency Contact Relation': p.emergencyContactRelation || 'N/A',
          'EP Number': p.epNumber || 'N/A',
          'Plant Name': p.plantName || 'N/A',
          'EIC': p.eic || 'N/A',
          'Pass Issue Date': p.passIssueDate ? format(new Date(p.passIssueDate), 'dd-MM-yyyy') : 'N/A',
          'Joining Date': p.joiningDate ? format(new Date(p.joiningDate), 'dd-MM-yyyy') : 'N/A',
          'WO Expiry': p.workOrderExpiryDate ? format(new Date(p.workOrderExpiryDate), 'dd-MM-yyyy') : 'N/A',
          'WC Policy Expiry': p.wcPolicyExpiryDate ? format(new Date(p.wcPolicyExpiryDate), 'dd-MM-yyyy') : 'N/A',
          'Labour Contract Expiry': p.labourContractValidity ? format(new Date(p.labourContractValidity), 'dd-MM-yyyy') : 'N/A',
          'Medical Expiry': p.medicalExpiryDate ? format(new Date(p.medicalExpiryDate), 'dd-MM-yyyy') : 'N/A',
          'Safety Expiry': p.safetyExpiryDate ? format(new Date(p.safetyExpiryDate), 'dd-MM-yyyy') : 'N/A',
          'IRATA Expiry': p.irataValidity ? format(new Date(p.irataValidity), 'dd-MM-yyyy') : 'N/A',
          'Contract Expiry': p.contractValidity ? format(new Date(p.contractValidity), 'dd-MM-yyyy') : 'N/A',
          'Remarks': p.remarks || '',
          'Termination Date': p.terminationDate ? format(new Date(p.terminationDate), 'dd-MM-yyyy') : 'N/A',
          'Resignation Date': p.resignationDate ? format(new Date(p.resignationDate), 'dd-MM-yyyy') : 'N/A',
          'Feedback': p.feedback || '',
          'Document Folder URL': p.documentFolderUrl || '',
        };

        const docsData = (p.documents || []).reduce((acc, doc) => {
            acc[`Doc: ${doc.name} (Status)`] = doc.status;
            acc[`Doc: ${doc.name} (Details)`] = doc.details || '';
            return acc;
        }, {} as {[key: string]: any});
        
        const skillsData = (p.skills || []).reduce((acc, skill, index) => {
            acc[`Skill ${index+1} Name`] = skill.name;
            acc[`Skill ${index+1} Details`] = skill.details;
            acc[`Skill ${index+1} Link`] = skill.link || '';
            return acc;
        }, {} as {[key: string]: any});

        const leaveHistoryArray = Array.isArray(p.leaveHistory)
          ? p.leaveHistory
          : p.leaveHistory ? Object.values(p.leaveHistory) : [];

        if (leaveHistoryArray.length === 0) {
            return { ...baseData, ...docsData, ...skillsData };
        }

        return leaveHistoryArray.map(leave => ({
            ...baseData,
            ...docsData,
            ...skillsData,
            'Leave Type': leave.leaveType || 'N/A',
            'Leave Start Date': leave.leaveStartDate ? format(new Date(leave.leaveStartDate), 'dd-MM-yyyy') : 'N/A',
            'Leave End Date': leave.leaveEndDate ? format(new Date(leave.leaveEndDate), 'dd-MM-yyyy') : 'N/A',
            'Rejoined Date': leave.rejoinedDate ? format(new Date(leave.rejoinedDate), 'dd-MM-yyyy') : 'N/A',
        }));
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Manpower Report');
    XLSX.writeFile(workbook, `Manpower_Report.xlsx`);
  };

  return (
    <Button variant="outline" onClick={handleDownloadExcel} disabled={profiles.length === 0}>
        <FileDown className="mr-2 h-4 w-4" />
        Export Excel
    </Button>
  );
}
