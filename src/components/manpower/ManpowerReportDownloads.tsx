'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { ManpowerProfile } from '@/types';
import { format } from 'date-fns';

type ManpowerReportDownloadsProps = {
    profiles: ManpowerProfile[];
};

export default function ManpowerReportDownloads({ profiles }: ManpowerReportDownloadsProps) {
    const handleDownload = () => {
        if (profiles.length === 0) {
            alert("No profiles to export.");
            return;
        }

        const data = profiles.map(p => ({
            "Name": p.name,
            "Trade": p.trade,
            "Status": p.status,
            "File No": p.hardCopyFileNo || 'N/A',
            "EP No": p.epNumber || 'N/A',
            "Plant": p.plantName || 'N/A',
            "EIC": p.eicName || 'N/A',
            "Joining Date": p.joiningDate ? format(new Date(p.joiningDate), 'dd-MM-yyyy') : 'N/A',
            "Pass Issue Date": p.passIssueDate ? format(new Date(p.passIssueDate), 'dd-MM-yyyy') : 'N/A',
            "WO Validity": p.woValidity ? format(new Date(p.woValidity), 'dd-MM-yyyy') : 'N/A',
            "WC Policy Validity": p.wcPolicyValidity ? format(new Date(p.wcPolicyValidity), 'dd-MM-yyyy') : 'N/A',
            "Labour Contract Validity": p.labourContractValidity ? format(new Date(p.labourContractValidity), 'dd-MM-yyyy') : 'N/A',
            "Medical Expiry": p.medicalExpiryDate ? format(new Date(p.medicalExpiryDate), 'dd-MM-yyyy') : 'N/A',
            "Safety Expiry": p.safetyExpiryDate ? format(new Date(p.safetyExpiryDate), 'dd-MM-yyyy') : 'N/A',
            "IRATA Validity": p.irataValidity ? format(new Date(p.irataValidity), 'dd-MM-yyyy') : 'N/A',
            "Contract Validity": p.contractValidity ? format(new Date(p.contractValidity), 'dd-MM-yyyy') : 'N/A',
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Manpower Report');
        
        const fileName = `Manpower_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <Button onClick={handleDownload} variant="outline" disabled={profiles.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export List
        </Button>
    );
}
