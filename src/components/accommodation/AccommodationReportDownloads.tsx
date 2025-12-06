
'use client';

import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Building, ManpowerProfile, Room } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export default function AccommodationReportDownloads() {
    const { buildings, manpowerProfiles } = useAppContext();

    const handleDownloadExcel = () => {
        if (!buildings) return;
        const dataToExport = buildings.flatMap(building => {
            const roomsArray: Room[] = building.rooms ? (Array.isArray(building.rooms) ? building.rooms : Object.values(building.rooms)) : [];
            if (roomsArray.length === 0) {
                return [{
                    'Building': building.buildingNumber,
                    'Room': 'N/A',
                    'Bed': 'N/A',
                    'Occupant Name': 'N/A',
                    'Trade': 'N/A',
                    'File No.': 'N/A',
                    'Joining Date': 'N/A',
                    'Mobile No.': 'N/A',
                }];
            }
            return roomsArray.flatMap(room => {
                const bedsArray = room.beds ? (Array.isArray(room.beds) ? room.beds : Object.values(room.beds)) : [];
                if (bedsArray.length === 0) {
                     return [{
                        'Building': building.buildingNumber,
                        'Room': room.roomNumber,
                        'Bed': 'N/A',
                        'Occupant Name': 'N/A',
                        'Trade': 'N/A',
                        'File No.': 'N/A',
                        'Joining Date': 'N/A',
                        'Mobile No.': 'N/A',
                    }];
                }
                return bedsArray.map(bed => {
                    const occupant = bed.occupantId ? manpowerProfiles.find(p => p.id === bed.occupantId) : null;
                    return {
                        'Building': building.buildingNumber,
                        'Room': room.roomNumber,
                        'Bed': bed.bedNumber,
                        'Occupant Name': occupant?.name || 'Available',
                        'Trade': occupant?.trade || 'N/A',
                        'File No.': occupant?.hardCopyFileNo || 'N/A',
                        'Joining Date': occupant?.joiningDate ? format(parseISO(occupant.joiningDate), 'dd-MM-yyyy') : 'N/A',
                        'Mobile No.': occupant?.mobileNumber || 'N/A',
                    };
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Accommodation Report');
        XLSX.writeFile(workbook, 'Accommodation_Report.xlsx');
    };

    return (
        <Button variant="outline" onClick={handleDownloadExcel} disabled={!buildings || buildings.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Excel
        </Button>
    );
}
