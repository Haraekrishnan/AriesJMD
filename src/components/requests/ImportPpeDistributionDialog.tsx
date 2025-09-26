'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { FileWarning, Upload } from 'lucide-react';

interface ImportPpeDistributionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function ImportPpeDistributionDialog({ isOpen, setIsOpen }: ImportPpeDistributionDialogProps) {
    const { addPpeHistoryFromExcel } = useAppContext();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected', description: 'Please select an Excel file to import.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
                if (json.length === 0) {
                    toast({ variant: 'destructive', title: 'Empty File', description: 'The selected Excel file is empty or has no data.' });
                    return;
                }
                
                const { importedCount, notFoundCount } = await addPpeHistoryFromExcel(json);

                toast({ title: 'Import Complete', description: `${importedCount} records imported. ${notFoundCount} names not found.` });
                setIsOpen(false);
            } catch (error) {
                console.error("Import error:", error);
                toast({ variant: 'destructive', title: 'Import Failed', description: 'The file format is invalid. Please check the file and try again.' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Import PPE Distribution</DialogTitle>
                <DialogDescription>
                    Upload an Excel file to bulk-add coverall distribution history to employee profiles.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>File Format Instructions</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">Your Excel file must have a header row with the following exact column names:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            <li><b>Employee Name</b></li>
                            <li><b>Size</b> (e.g., S, M, L, XL)</li>
                            <li><b>Date</b> (Format: YYYY-MM-DD or DD-MM-YYYY)</li>
                        </ul>
                    </AlertDescription>
                </Alert>
                <Input type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!file}><Upload className="mr-2 h-4 w-4"/> Import</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
