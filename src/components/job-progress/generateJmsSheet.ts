
'use client';
import { useToast } from '@/hooks/use-toast';

export function generateJmsSheetExcel() {
    const { toast } = useToast();
    toast({ title: "Feature Not Implemented", description: "JMS Sheet Excel export is not yet available." });
}

export function generateJmsSheetPdf() {
    const { toast } = useToast();
    toast({ title: "Feature Not Implemented", description: "JMS Sheet PDF export is not yet available." });
}
