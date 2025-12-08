

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

interface UpdateItemsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function UpdateItemsDialog({ isOpen, setIsOpen }: UpdateItemsDialogProps) {
    const { updateMultipleInventoryItems } = useAppContext();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpdate = () => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected', description: 'Please select an Excel file to import.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
                const updatedCount = updateMultipleInventoryItems(json);

                toast({ title: 'Update Complete', description: `${updatedCount} items were successfully updated. Items with non-matching serial numbers were ignored.` });
                setIsOpen(false);
            } catch (error) {
                console.error("Update error:", error);
                toast({ variant: 'destructive', title: 'Update Failed', description: 'The file format is invalid. Please check the console for details.' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Update Items from Excel</DialogTitle>
                <DialogDescription>
                    Upload an Excel file to update existing items in bulk. Items will be matched based on the 'SERIAL NUMBER' column.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>File Format Instructions</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">The file must contain a 'SERIAL NUMBER' column to match existing items. Other columns can be included to update their corresponding values. Columns with empty values will be ignored.</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            <li><b>ITEM NAME</b></li>
                            <li><b>SERIAL NUMBER</b> (Required for matching)</li>
                            <li><b>CHEST CROLL NO</b></li>
                            <li><b>ARIES ID</b></li>
                            <li><b>INSPECTION DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>INSPECTION DUE DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>TP INSPECTION DUE DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>STATUS</b> (e.g., In Use, In Store)</li>
                            <li><b>PROJECT</b> (Exact project name)</li>
                            <li><b>TP Certificate Link</b></li>
                            <li><b>Inspection Certificate Link</b></li>
                        </ul>
                    </AlertDescription>
                </Alert>
                <Input type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFileChange} />
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!file}><Upload className="mr-2 h-4 w-4"/> Update Items</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
