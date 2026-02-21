
'use client';

import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO } from 'date-fns';
import type { JobProgress, JobStep } from '@/lib/types';
import { useAppContext } from '@/contexts/app-provider';

interface OngoingJobsReportProps {
  jobs: { job: JobProgress; step: any }[];
}

export default function OngoingJobsReport({ jobs }: OngoingJobsReportProps) {
  const { users, projects } = useAppContext();

  const handleExportExcel = async () => {
    if (jobs.length === 0) {
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('On-Going JMS Report');

    worksheet.columns = [
      { header: 'JMS Title', key: 'title', width: 40 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'JMS No.', key: 'jmsNo', width: 15 },
      { header: 'Creator', key: 'creator', width: 25 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Job Start Date', key: 'jobDateFrom', width: 20 },
      { header: 'Job End Date', key: 'jobDateTo', width: 20 },
      { header: 'Step No.', key: 'stepNo', width: 10 },
      { header: 'Step Name', key: 'stepName', width: 30 },
      { header: 'Step Status', key: 'stepStatus', width: 20 },
      { header: 'Assignee', key: 'assignee', width: 25 },
      { header: 'Acknowledged Date', key: 'ackDate', width: 20 },
      { header: 'Completed Date', key: 'compDate', width: 20 },
      { header: 'Last Updated', key: 'lastUpdated', width: 20 },
    ];
    
    worksheet.getRow(1).font = { bold: true };

    const dataToExport = jobs.flatMap(({ job }) => {
        const project = projects.find(p => p.id === job.projectId);
        const creator = users.find(u => u.id === job.creatorId);
        return job.steps.map((step, index) => {
            const assignee = users.find(u => u.id === step.assigneeId);
            return {
                title: job.title,
                project: project?.name || 'N/A',
                jmsNo: job.jmsNo || 'N/A',
                creator: creator?.name || 'N/A',
                createdAt: format(parseISO(job.createdAt), 'dd-MM-yyyy HH:mm'),
                jobDateFrom: job.dateFrom ? format(parseISO(job.dateFrom), 'dd-MM-yyyy') : 'N/A',
                jobDateTo: job.dateTo ? format(parseISO(job.dateTo), 'dd-MM-yyyy') : 'N/A',
                stepNo: index + 1,
                stepName: step.name,
                stepStatus: step.status,
                assignee: assignee?.name || 'Unassigned',
                ackDate: step.acknowledgedAt ? format(parseISO(step.acknowledgedAt), 'dd-MM-yyyy HH:mm') : 'N/A',
                compDate: step.completedAt ? format(parseISO(step.completedAt), 'dd-MM-yyyy HH:mm') : 'N/A',
                lastUpdated: format(parseISO(job.lastUpdated), 'dd-MM-yyyy HH:mm'),
            }
        })
    });
    
    worksheet.addRows(dataToExport);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Ongoing_JMS_Report.xlsx');
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={jobs.length === 0}>
        <FileDown className="mr-2 h-4 w-4" /> Export Report
    </Button>
  );
}
