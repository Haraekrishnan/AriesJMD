'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '@/contexts/inventory-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { FileWarning, Upload } from 'lucide-react';

interface ImportItemsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function ImportItemsDialog({ isOpen, setIsOpen }: ImportItemsDialogProps) {
    const { addMultipleInventoryItems } = useInventory();
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);
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

        if (isImporting) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                
                const importedCount = await addMultipleInventoryItems(json);

                toast({ title: 'Import Complete', description: `${importedCount} new items were successfully added to their project/location. Existing items were ignored.` });
                setIsOpen(false);
            } catch (error) {
                console.error("Import error:", error);
                toast({ variant: 'destructive', title: 'Import Failed', description: error instanceof Error ? error.message : 'The import could not be completed. Please check the file and your connection, then retry.' });
            } finally {
                setIsImporting(false);
            }
        };
        reader.onerror = () => { setIsImporting(false); toast({ variant: 'destructive', title: 'File could not be read', description: 'Please select an accessible Excel file and retry.' }); };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle>Import Items from Excel</DialogTitle>
                <DialogDescription>
                    Upload an Excel file to add additional items in bulk. Items use the Excel PROJECT name; a blank PROJECT defaults to Store. Items with existing serial numbers will be ignored.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>File Format Instructions</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">The first row of your Excel sheet must be the header row with the following columns in order:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                            <li><b>ITEM NAME</b> (e.g., Harness)</li>
                            <li><b>SERIAL NUMBER</b> (Unique identifier)</li>
                            <li><b>CHEST CROLL NO</b> (Optional, for Harnesses)</li>
                            <li><b>ARIES ID</b> (Optional, for Harnesses)</li>
                            <li><b>INSPECTION DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>INSPECTION DUE DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>TP INSPECTION DUE DATE</b> (Format: YYYY-MM-DD)</li>
                            <li><b>STATUS</b> (In Use, In Store, Damaged, Expired)</li>
                            <li><b>PROJECT</b> (Optional; existing project/location name. Leave blank for Store. Matching ignores case and surrounding spaces.)</li>
                            <li><b>TP Certificate Link</b> (Optional)</li>
                            <li><b>Inspection Certificate Link</b> (Optional)</li>
                        </ul>
                    </AlertDescription>
                </Alert>
                <Input type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={handleFileChange} />
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!file || isImporting}><Upload className="mr-2 h-4 w-4"/> {isImporting ? 'Importing…' : 'Import'}</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
