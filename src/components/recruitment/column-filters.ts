import type {RecordEntry,Field} from './model';
export type ColumnFilters=Record<string,string[]>;
export function columnValue(record:RecordEntry,key:string,people:readonly {id:string;name:string}[]=[]):string{
 if(key==='completion')return record.completedByName?record.completedByName+(record.completedAt?' · '+new Date(record.completedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):''):'';
 if(key==='assignedTo')return people.find(p=>p.id===record.values.assignedTo)?.name||record.assignedToName||record.values.assignedTo||'';
 return record.values[key as Field]||'';
}
export function matchesColumns(record:RecordEntry,filters:ColumnFilters,people:readonly {id:string;name:string}[]=[],except?:string){return Object.entries(filters).every(([key,selected])=>key===except||selected.includes(columnValue(record,key,people)));}
