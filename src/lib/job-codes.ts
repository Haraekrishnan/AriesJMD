
export const JOB_CODES: { code: string; details: string; jobNo: string; }[] = [];

export const JOB_CODE_COLORS: { [key: string]: { bg: string, text?: string, excelFill?: any } } = {
    'X':   { bg: 'bg-white', text: 'text-red-500', excelFill: { font: { color: { argb: "FFFF0000" }}} },
    'ML':  { bg: 'bg-job-code-yellow', text: 'text-black', excelFill: { fgColor: { argb: 'FFFFFF00' } } },
    'ST':  { bg: 'bg-job-code-fluorescent-blue', text: 'text-black', excelFill: { fgColor: { argb: 'FF00BFFF' } } },
    'NWS': { bg: 'bg-job-code-violet', text: 'text-white', excelFill: { fgColor: { argb: 'FF8A2BE2' }, font: { color: { argb: 'FFFFFFFF' } } } },
    'Q':   { bg: 'bg-job-code-bright-blue', text: 'text-white', excelFill: { fgColor: { argb: 'FF0000FF' }, font: { color: { argb: 'FFFFFFFF' } } } },
    'OS':  { bg: 'bg-job-code-dark-orange', text: 'text-black', excelFill: { fgColor: { argb: 'FFFF8C00' } } },
    'KD':  { bg: 'bg-job-code-light-pink', text: 'text-black', excelFill: { fgColor: { argb: 'FFFFB6C1' } } },
    'TR':  { bg: 'bg-job-code-pink', text: 'text-black', excelFill: { fgColor: { argb: 'FFDB7093' } } },
    'EP':  { bg: 'bg-job-code-light-blue', text: 'text-black', excelFill: { fgColor: { argb: 'FFB0C4DE' } } },
    'PH':  { bg: 'bg-job-code-green', text: 'text-black', excelFill: { fgColor: { argb: 'FF22C55E' } } },
    'OFF': { bg: 'bg-job-code-dark-gray', text: 'text-black', excelFill: { fgColor: { argb: 'FFA9A9A9' } } },
    'L':   { bg: 'bg-job-code-red-light', text: 'text-white', excelFill: { fgColor: { argb: 'FFFF0000' }, font: { color: { argb: 'FFFFFFFF' } } } },
    'PD':  { bg: 'bg-job-code-fluorescent-green', text: 'text-black', excelFill: { fgColor: { argb: 'FF00FF00' } } },
    'S':   { bg: 'bg-job-code-blue', text: 'text-black', excelFill: { fgColor: { argb: 'FFbde2ff' } } },
    'CQ':  { bg: 'bg-job-code-blue', text: 'text-black', excelFill: { fgColor: { argb: 'FFbde2ff' } } },
    'RST': { bg: 'bg-job-code-pink', text: 'text-black', excelFill: { fgColor: { argb: 'FFDB7093' } } },
    'R':   { bg: 'bg-transparent', text: 'text-black', excelFill: { fgColor: { argb: 'FFFFFFFF' } } },
};
