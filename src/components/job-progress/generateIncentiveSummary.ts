
'use client';
import { useToast } from '@/hooks/use-toast';

export function generateIncentiveSummaryExcel() {
    const { toast } = useToast();
    toast({ title: "Feature Not Implemented", description: "Incentive Summary Excel export is not yet available." });
}

export function generateIncentiveSummaryPdf() {
    const { toast } = useToast();
    toast({ title: "Feature Not Implemented", description: "Incentive Summary PDF export is not yet available." });
}
