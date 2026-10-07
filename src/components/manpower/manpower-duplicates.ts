export const duplicateFields = [
  ['name', 'Same name'], ['employeeCode', 'Same employee code'], ['epNumber', 'Same EP number'],
  ['aadharNumber', 'Same Aadhaar number'], ['uanNumber', 'Same UAN'], ['mobileNumber', 'Same mobile number'],
] as const;
type Candidate = Partial<Record<typeof duplicateFields[number][0], string>> & { id?: string };
function key(field: string, value?: string) {
  let normalized = (value || '').normalize('NFKC').trim().toLowerCase();
  if (/^(n\/?a|none|null|nil|not available|-+|0+)$/.test(normalized)) return '';
  normalized = field === 'name' ? normalized.replace(/[.]/g, '').replace(/\s+/g, ' ') : normalized.replace(/[^a-z0-9]/g, '');
  if (field === 'mobileNumber' && normalized.length === 12 && normalized.startsWith('91')) normalized = normalized.slice(2);
  return normalized;
}
export function findManpowerDuplicates<T extends Candidate>(candidate: Candidate, profiles: T[]) {
  return profiles.filter(p => !candidate.id || p.id !== candidate.id).map(profile => ({ profile, reasons: duplicateFields.filter(([field]) => {
    const value = key(field, candidate[field]); return !!value && value === key(field, profile[field]);
  }).map(([, label]) => label) })).filter(match => match.reasons.length);
}
export function manpowerDuplicateGroups<T extends Candidate>(profiles: T[]) {
  const groups: { reason: string; profiles: T[] }[] = [];
  for (const [field, reason] of duplicateFields) {
    const index = new Map<string, T[]>();
    profiles.forEach(profile => { const value = key(field, profile[field]); if (value) index.set(value, [...(index.get(value) || []), profile]); });
    index.forEach(matches => { if (matches.length > 1) groups.push({ reason, profiles: matches }); });
  }
  return groups;
}
