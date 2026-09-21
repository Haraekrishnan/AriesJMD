import { format, isValid, parseISO } from 'date-fns';
import type { EhsObservation } from './types';

export function displayDate(value?: string, pattern = 'dd MMM yyyy') {
  const date = value ? parseISO(value) : null;
  return date && isValid(date) ? format(date, pattern) : 'Not recorded';
}

export function recordsCsv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let text = String(value ?? '');
          // Keep spreadsheet applications from executing user-entered formulas.
          if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
          return '"' + text.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
}

export function downloadRecords(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + recordsCsv(rows)], {
      type: 'text/csv;charset=utf-8;',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeDocumentUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function caseDocuments(observations: EhsObservation[]) {
  return observations
    .flatMap((observation) =>
      Object.entries(observation.stages || {}).flatMap(([stage, record]) =>
        Object.values(record.attachments || {}).map((attachment) => ({
          ...attachment,
          key: observation.id + ':' + stage + ':' + attachment.id,
          caseId: observation.id,
          stage,
          projectId: observation.projectId,
        })),
      ),
    )
    .sort(
      (a, b) =>
        (Date.parse(b.uploadedAt) || 0) - (Date.parse(a.uploadedAt) || 0),
    );
}
