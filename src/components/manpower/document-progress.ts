import type { ManpowerProfile } from '@/lib/types';
export function manpowerDocumentProgress(profile: Pick<ManpowerProfile, 'trade' | 'documents'>) {
 const names = ['Aadhar Card', 'CV', 'Pan Card', 'Personal Details', 'Form A', 'Induction', 'Signed Contract', 'Medical Report', 'First Aid Certificate'];
 if (['RA Level 1','RA Level 2','RA Level 3','RA + Supervisor'].includes(profile.trade)) names.push('IRATA Certificate');
 const documents = profile.documents || [];
 const ndt = documents.find(d => d.name === 'NDT Certificate');
 // Existing profiles without an NDT choice retain their previous progress.
 if (ndt && ndt.status !== 'Not Applicable') names.push('NDT Certificate');
 const collected: string[] = [], pending: string[] = [];
 names.forEach(name => {
  const doc = documents.find(d => d.name === name);
  (doc && ['Collected','Submitted','Received'].includes(doc.status) ? collected : pending).push(name);
 });
 return {collected, pending, total:names.length, percent:Math.min(100, Math.max(0, names.length ? collected.length / names.length * 100 : 100))};
}
