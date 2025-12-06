
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import type { JobSchedule } from '@/lib/types';

async function fetchImageAsArrayBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return response.arrayBuffer();
}


export async function generateScheduleExcel(
  schedule: JobSchedule | undefined,
  projectName: string,
  selectedDate: Date
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Job Schedule');

  ws.pageSetup.orientation = 'landscape';

  const formattedDate = format(selectedDate, 'dd-MM-yyyy');

  // === LOGO =============================================================
  try {
    const logoBuffer = await fetchImageAsArrayBuffer('/images/Aries_logo.png');
    const imgId = wb.addImage({
      buffer: logoBuffer,
      extension: 'png',
    });

    ws.addImage(imgId, {
      tl: { col: 0.2, row: 0.3 },
      ext: { width: 160, height: 40 },
      editAs: "absolute",
    });
  } catch (error) {
    console.error("Could not add logo to Excel:", error);
  }
  

  // === HEADER ===========================================================
  const totalCols = 10; 
  
  const row1 = ws.addRow([]);
  ws.mergeCells(1, 1, 1, totalCols);
  const cell1 = ws.getCell(1, 1);
  cell1.value = "ARIES";
  cell1.font = { bold: true, size: 16 };
  cell1.alignment = { horizontal: "center", vertical: "middle" };

  const row2 = ws.addRow([]);
  ws.mergeCells(2, 1, 2, totalCols);
  const cell2 = ws.getCell(2, 1);
  cell2.value = 'Division/Branch: I & M / Jamnagar';
  cell2.alignment = { vertical: "middle" };

  const row3 = ws.addRow([]);
  ws.mergeCells(3, 1, 3, totalCols);
  const cell3 = ws.getCell(3, 1);
  cell3.value = `Project/ Vessel’s name: ${projectName}`;
  cell3.alignment = { vertical: "middle" };
  
  ws.getRow(1).height = 35;


  // === TABLE HEADER =====================================================
  const headerRowIndex = 5;

  const headerRow = ws.getRow(headerRowIndex);
  headerRow.values = [
    'Sr. No',
    'Name',
    'Job Type',
    'Job No.',
    "Project/Vessel's name",
    'Location',
    'Reporting Time',
    'Client / Contact Person Number',
    'Vehicle',
    'Special instruction/Remarks',
  ];

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCDCDC' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // column widths
  ws.columns = [
    { width: 6 },
    { width: 30 },
    { width: 16 },
    { width: 16 },
    { width: 28 },
    { width: 20 },
    { width: 15 },
    { width: 26 },
    { width: 16 },
    { width: 30 },
  ];

  // === TABLE BODY =======================================================
  let rowIndex = headerRowIndex + 1;
  const items = schedule?.items || [];

  items.forEach((item, index) => {
    const row = ws.getRow(rowIndex);

    row.values = [
      index + 1,
      Array.isArray(item.manpowerIds) ? item.manpowerIds.join(', ') : '',
      item.jobType || '',
      item.jobNo || '',
      item.projectVesselName || '',
      item.location || '',
      item.reportingTime || '',
      item.clientContact || '',
      item.vehicleId || '',
      item.remarks || '',
    ];

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.font = { size: 9 };
    });

    row.getCell(1).alignment = { horizontal: 'center' };

    rowIndex++;
  });

  // === FOOTER ===========================================================
  rowIndex += 1;

  ws.mergeCells(`A${rowIndex}:C${rowIndex}`);
  ws.mergeCells(`D${rowIndex}:F${rowIndex}`);
  ws.mergeCells(`G${rowIndex}:J${rowIndex}`);

  ws.getCell(`A${rowIndex}`).value = 'Scheduled by:';
  ws.getCell(`G${rowIndex}`).value = `Date: ${formattedDate}`;
  ws.getCell(`G${rowIndex}`).alignment = { horizontal: 'right' };

  rowIndex += 2;

  ws.mergeCells(`A${rowIndex}:F${rowIndex}`);
  ws.mergeCells(`G${rowIndex}:J${rowIndex}`);

  ws.getCell(`A${rowIndex}`).value = 'Ref.: QHSE/P 11/ CL 09/Rev 06/ 01 Aug 2020';
  ws.getCell(`G${rowIndex}`).value = 'Page 1 of 1';
  ws.getCell(`G${rowIndex}`).alignment = { horizontal: 'right' };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `JobSchedule_${format(selectedDate, 'yyyy-MM-dd')}.xlsx`);
}
