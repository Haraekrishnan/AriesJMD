import * as XLSX from 'xlsx';

export const inwardColumns = [
  ['Item Name', 'name'], ['Serial Number', 'serialNumber'], ['Aries ID', 'ariesId'],
  ['Chest Croll No.', 'chestCrollNo'], ['ERP ID', 'erpId'], ['Certification', 'certification'],
  ['Purchase Date', 'purchaseDate'], ['Inspection Date', 'inspectionDate'],
  ['Inspection Due Date', 'inspectionDueDate'], ['TP Inspection Due Date', 'tpInspectionDueDate'],
  ['TP Certificate URL', 'certificateUrl'], ['Inspection Certificate URL', 'inspectionCertificateUrl'], ['Remarks', 'remarks'],
] as const;
export const inwardInstructions = [
  'Use the Items sheet. Keep the column headings in row 1; one serialized item per row.',
  'Item Name and Serial Number are required. All other columns are optional. Maximum 200 items per import.',
  'Format serial numbers and IDs as Text before entering data to preserve leading zeros and long numbers.',
  'Dates: DD-MM-YYYY (example: 07-10-2026), YYYY-MM-DD, or an Excel date cell. Leave unknown dates blank.',
  'Certificate links must be complete http:// or https:// URLs. Chest Croll No. is for harness items.',
  'Select Source / Reason and Project in the dialog; these apply to every imported row.',
  'Import adds rows to your draft. Review them, then click Create & Log Items. Import alone saves nothing.',
  'Do not use formulas, merged cells, totals, or password protection. Blank rows are ignored. Duplicate serials are rejected.',
];
export function inwardTemplate() {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([inwardColumns.map(([label]) => label)]);
  sheet['!cols'] = inwardColumns.map(() => ({ wch: 26 }));
  XLSX.utils.book_append_sheet(book, sheet, 'Items');
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['How to import'], ...inwardInstructions.map(s => [s])]), 'Instructions');
  book.Sheets.Instructions['!cols'] = [{ wch: 120 }];
  return book;
}
function dateValue(value: unknown, date1904: boolean): Date | null {
  if (value === '' || value == null) return null;
  let y: number, m: number, d: number;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value, { date1904 });
    if (!parsed) throw Error('Invalid Excel date');
    ({ y, m, d } = parsed);
  } else {
    const s = String(value).trim();
    let match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
    if (match) [, d, m, y] = match.map(Number);
    else { match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!match) throw Error('Use DD-MM-YYYY'); [, y, m, d] = match.map(Number); }
  }
  const date = new Date(y, m - 1, d);
  if (y < 1900 || y > 9999 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) throw Error('Invalid calendar date');
  return date;
}
export function parseInwardWorkbook(book: XLSX.WorkBook, existingSerials: string[]) {
  const sheet = book.Sheets.Items || book.Sheets[book.SheetNames[0]];
  if (!sheet?.['!ref']) throw Error('The workbook has no item rows.');
  if (sheet['!merges']?.length) throw Error('Remove merged cells from the Items sheet.');
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.e.r > 5000 || range.e.c > 50) throw Error('Use the template with at most 200 item rows and no extra formatted columns.');
  const positions = new Map<string, number>();
  for (let c = 0; c <= range.e.c; c++) {
    const label = String(sheet[XLSX.utils.encode_cell({ r: 0, c })]?.v || '').trim().toLowerCase();
    if (!label) continue;
    if (!inwardColumns.some(([heading]) => heading.toLowerCase() === label)) throw Error('Unknown heading: ' + label + '. Use the template headings.');
    if (positions.has(label)) throw Error('Duplicate heading: ' + label);
    positions.set(label, c);
  }
  for (const label of ['Item Name', 'Serial Number']) if (!positions.has(label.toLowerCase())) throw Error('Missing column: ' + label);
  const seen = new Set(existingSerials.filter(Boolean).map(s => s.trim().toLowerCase()));
  const rows: Record<string, any>[] = [];
  for (let r = 1; r <= range.e.r; r++) {
    if (!inwardColumns.some(([label]) => { const c = positions.get(label.toLowerCase()); return c !== undefined && sheet[XLSX.utils.encode_cell({r,c})]?.v != null && sheet[XLSX.utils.encode_cell({r,c})]?.v !== ''; })) continue;
    const row: Record<string, any> = {};
    for (const [label, key] of inwardColumns) {
      const c = positions.get(label.toLowerCase()); const cell = c === undefined ? undefined : sheet[XLSX.utils.encode_cell({r,c})];
      try {
        if (cell?.f) throw Error('Formulas are not supported');
        if (cell?.t === 'e') throw Error('Excel cell contains an error');
        row[key] = key.endsWith('Date') ? dateValue(cell?.v, !!book.Workbook?.WBProps?.date1904) : String(cell ? (cell.w ?? cell.v ?? '') : '').trim();
        if (key.endsWith('Url') && row[key] && !/^https?:\/\//i.test(row[key])) throw Error('Use a complete http:// or https:// link');
        if (key.endsWith('Url') && row[key]) new URL(row[key]);
      } catch (e) { throw Error('Row ' + (r + 1) + ', ' + label + ': ' + (e as Error).message); }
    }
    if (!row.name || !row.serialNumber) throw Error('Row ' + (r + 1) + ': Item Name and Serial Number are required.');
    const serial = row.serialNumber.toLowerCase();
    if (seen.has(serial)) throw Error('Row ' + (r + 1) + ': Serial Number ' + row.serialNumber + ' is already in inventory, this draft, or the workbook.');
    seen.add(serial); rows.push(row);
    if (rows.length > 200) throw Error('Import at most 200 items at a time.');
  }
  if (!rows.length) throw Error('No items found. Enter your items below the headings.');
  return rows;
}
