export type QuotationNumberRegistry = { next: number; byId: Record<string,string> };
export function allocateQuotationNumbers(current: QuotationNumberRegistry | null, records: {id:string;createdAt?:string}[]): QuotationNumberRegistry {
 const byId={...(current?.byId || {})};
 const numbers=Object.values(byId);
 if(numbers.some(n=>!/^\d{6,}$/.test(n)) || new Set(numbers).size!==numbers.length) throw new Error('Request number registry is invalid. Contact the administrator; existing numbers were not changed.');
 let next=Math.max(1,current?.next || 1,...numbers.map(n=>Number(n)+1));
 const time=(value?:string)=>{const parsed=Date.parse(value || '');return Number.isFinite(parsed)?parsed:Number.MAX_SAFE_INTEGER;};
 for(const record of [...records].sort((a,b)=>time(a.createdAt)-time(b.createdAt)||a.id.localeCompare(b.id))) {
  if(byId[record.id])continue;
  if(!Number.isSafeInteger(next))throw new Error('Request number sequence is out of range.');
  byId[record.id]=String(next++).padStart(6,'0');
 }
 return {next,byId};
}
