import type {RecordEntry} from './model';
export const indiaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function followUpState(date:string,stage:string,today=indiaToday()){
  if(!date||stage!=='On Going')return '';
  return date<today?'Overdue':date===today?'Today':'Scheduled';
}
export const shortDate=(date:string)=>date?new Date(date+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
export function workbookRows(records:RecordEntry[],columns:readonly string[],labels:Record<string,string>){
  const stamp=(value:string)=>new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
  return ['On Going','Finalized','Not Interested'].map(stage=>({stage,rows:[
    ['SR.NO',...columns.map(key=>labels[key]),'Created by','Created at','Updated by','Updated at'],
    ...records.filter(r=>!r.deletedAt&&r.values.stage===stage).map((r,i)=>[i+1,...columns.map(key=>r.values[key as keyof typeof r.values]||''),r.createdByName,stamp(r.createdAt),r.updatedByName,stamp(r.updatedAt)])
  ]}));
}
