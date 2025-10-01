
export const JOB_CODES = [
    { code: 'MCT', details: 'MTF-CRYOGENIC - PIPELINE BUFFING & THICKNESS SURVEY JOB' },
    { code: 'RRT', details: 'RRTF ROOF TOP SHEET STRENGTHENING JOB' },
    { code: 'SWP', details: 'SWRO. Structure Beam Manual Cleaning and Painting & loose sheet removing Job.' },
    { code: 'MTM', details: 'MTF PLANT - MECHANICAL ACTIVITIES' },
    { code: 'KD', details: 'KITCHEN DUTY' },
    { code: 'R', details: 'REPORTING / MATERIAL SHIFTING IN STORE' },
    { code: 'L', details: 'LEAVE' },
    { code: 'ML', details: 'MEDICAL LEAVE' },
    { code: 'S', details: 'STANDBY' },
    { code: 'CQ', details: 'COVID QUARANTINE' },
    { code: 'RST', details: 'RIL SAFETY TRAINING' },
    { code: 'EP', details: 'ENTRY PASS GENERATION / ANNUAL RENEWAL / NEW PASS GNERATION FOR EXISTING PERSON' },
    { code: 'OFF', details: 'SUNDAY DUTY OFF' },
    { code: 'PH', details: 'PUBLIC HOLIDAY' },
];

export const JOB_CODE_COLORS: { [key: string]: string } = {
    'L': 'bg-red-200 dark:bg-red-800',
    'ML': 'bg-red-300 dark:bg-red-700',
    'PH': 'bg-green-200 dark:bg-green-800',
    'OFF': 'bg-gray-300 dark:bg-gray-700',
    'S': 'bg-yellow-200 dark:bg-yellow-800',
    'CQ': 'bg-yellow-300 dark:bg-yellow-700',
    'RST': 'bg-blue-200 dark:bg-blue-800',
    'R': 'bg-indigo-200 dark:bg-indigo-800',
};
