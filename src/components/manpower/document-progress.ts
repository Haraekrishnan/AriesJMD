import type { ManpowerProfile } from '@/lib/types';
export function manpowerDocumentProgress(profile: Pick<ManpowerProfile, 'trade' | 'documents'>) {
 const names = ['Aadhar Card', 'CV', 'Personal Details', 'Form A', 'Induction', 'Signed Contract', 'Medical Report'];
 if (['RA Level 1','RA Level 2','RA Level 3','RA + Supervisor'].includes(profile.trade)) names.push('IRATA Certificate');
 const documents = profile.documents || [];
 // First Aid is required for RA Level 3. For other trades, count it only
 // when the profile actually contains that document (matching the form).
 if (profile.trade === 'RA Level 3' || documents.some(d => d.name === 'First Aid Certificate')) names.push('First Aid Certificate');
 // Optional documents enter the denominator only when explicitly applicable.
 for (const name of ['Pan Card', 'NDT Certificate', 'Trade Validation', 'Appointment Letter']) {
  const doc = documents.find(d => d.name === name);
  if (doc && doc.status !== 'Not Applicable') names.push(name);
 }
 const collected: string[] = [], pending: string[] = [];
 names.forEach(name => {
  const doc = documents.find(d => d.name === name);
  (doc && ['Collected','Submitted','Received'].includes(doc.status) ? collected : pending).push(name);
 });
 return {collected, pending, total:names.length, percent:Math.min(100, Math.max(0, names.length ? collected.length / names.length * 100 : 100))};
}
