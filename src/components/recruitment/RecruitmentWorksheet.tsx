'use client';
import {useEffect, useRef, useState} from 'react';
import type {Candidate, Field, RecordEntry} from './model';
import {validateCandidate} from './model';
import styles from './recruitment.module.css';

type Call=<T>(data:Record<string,unknown>)=>Promise<T>;
const stages=['On Going','Finalized','Not Interested'];
const empty=(stage:string)=>({name:'',contact:'',designation:'',age:'',experience:'',salary:'',allowance:'',documents:'',remark:'',followUp:'',followUpDate:'',status:'',travelDate:'',travelNote:'',stage});
const same=(a:Candidate,b:Candidate)=>JSON.stringify(a)===JSON.stringify(b);
export function RecruitmentSheetRow({record,stage,columns,labels,number,canManage,call,onSaved,onDirty,onHistory}:{record?:RecordEntry;stage:string;columns:Field[];labels:Record<Field,string>;number:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onDirty:(dirty:boolean)=>void;onHistory:(record:RecordEntry)=>void}){
 const [values,setValues]=useState<Candidate>(record?.values||empty(stage));
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const base=useRef(record),latest=useRef(values),running=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true);
 const callbacks=useRef({onSaved,onDirty});callbacks.current={onSaved,onDirty};
 const dirty=()=>!same(latest.current,base.current?.values||empty(stage));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 useEffect(()=>{if(record&&!dirty()&&!running.current){base.current=record;latest.current=record.values;setValues(record.values);}},[record]);
 const save=async()=>{
  if(timer.current)clearTimeout(timer.current);
  if(running.current||!dirty()||!canManage)return;
  let snapshot:Candidate;
  try{snapshot=validateCandidate(latest.current);}catch(e){setError(e instanceof Error?e.message:'Check this row.');setStatus('Not saved');return;}
  running.current=true;setStatus('Saving…');setError('');
  try{
   const saved=await call<{id:string;record:RecordEntry}>({action:'save',...(base.current?{id:base.current.id}:{}),revision:base.current?.revision||0,values:snapshot});
   // Use the transaction result, including its audit metadata and revision.
   base.current=saved.record;
   if(same(latest.current,snapshot)||same(validateForCompare(latest.current),snapshot)){latest.current=saved.record.values;if(alive.current)setValues(saved.record.values);}
   callbacks.current.onDirty(dirty());
   if(!dirty())callbacks.current.onSaved(saved.record);
   if(alive.current)setStatus(dirty()?'Unsaved changes':'Saved');
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:'Could not save. Your changes are still in this row.');setStatus('Not saved');}return;}
  finally{running.current=false;}
  if(dirty()&&alive.current)void save();
 };
 const change=(field:Field,value:string)=>{
  latest.current={...latest.current,[field]:value};setValues(latest.current);setError('');setStatus(dirty()?'Unsaved changes':'');callbacks.current.onDirty(dirty());
  if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void save(),800);
 };
 const discard=()=>{if(timer.current)clearTimeout(timer.current);latest.current=base.current?.values||empty(stage);setValues(latest.current);setError('');setStatus('');callbacks.current.onDirty(false);};
 const navigate=(event:React.KeyboardEvent<HTMLInputElement|HTMLSelectElement>,col:number)=>{
  if(event.key!=='Enter')return;event.preventDefault();void save();
  const row=event.currentTarget.closest('tr');const target=(event.shiftKey?row?.previousElementSibling:row?.nextElementSibling)?.querySelector<HTMLElement>(`[data-column="${col}"]`);target?.focus();
 };
 return <tr data-stage={values.stage} data-new={!base.current}>
  <td>{number}</td>
  {columns.map((field,col)=><td key={field} className={`${field==='name'?styles.name:''} ${styles.editableCell}`}>
   {canManage?(field==='stage'?<select aria-label={`${labels[field]} row ${number}`} data-column={col} value={values[field]} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()} onKeyDown={e=>navigate(e,col)}>{stages.map(s=><option key={s}>{s}</option>)}</select>:<input aria-label={`${labels[field]} row ${number}`} data-column={col} type={field==='travelDate'||field==='followUpDate'?'date':'text'} value={values[field]} placeholder={!base.current&&field==='name'?'Type candidate name…':undefined} maxLength={field==='remark'||field==='travelNote'?4000:200} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()} onKeyDown={e=>navigate(e,col)}/>):values[field]||'—'}
  </td>)}
  <td className={styles.rowState}><span role="status">{status||(!base.current?'New row':'Saved')}</span>{base.current&&<small>{base.current.updatedByName}<br/>{new Date(base.current.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</small>}{error&&<><p role="alert">{error}</p><button type="button" onClick={()=>void save()}>Retry</button><button type="button" onClick={discard}>Discard changes</button></>}</td>
  <td>{base.current&&<button type="button" onClick={()=>onHistory(base.current!)}>History</button>}</td>
 </tr>;
}
function validateForCompare(values:Candidate){return Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.trim()])) as Candidate;}

export default function RecruitmentWorksheet({records,stage,columns,labels,offset,canManage,call,onSaved,onPendingChange,onHistory}:{records:RecordEntry[];stage:string;columns:Field[];labels:Record<Field,string>;offset:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onPendingChange:(pending:boolean)=>void;onHistory:(record:RecordEntry)=>void}){
 const [newRows,setNewRows]=useState<{key:number;record?:RecordEntry}[]>(()=>Array.from({length:5},(_,key)=>({key})));
 const dirtyRows=useRef(new Set<string>());
 const pending=(key:string,value:boolean)=>{if(value)dirtyRows.current.add(key);else dirtyRows.current.delete(key);onPendingChange(dirtyRows.current.size>0);};
 const createdIds=new Set(newRows.flatMap(r=>r.record?[r.record.id]:[]));
 const existing=records.filter(r=>!createdIds.has(r.id));
 return <div className={styles.tableWrap}><table><thead><tr><th>#</th>{columns.map(k=><th key={k}>{labels[k]}</th>)}<th>Save status / Updated by</th><th>History</th></tr></thead><tbody>
 {existing.map((r,i)=><RecruitmentSheetRow key={r.id} record={r} stage={stage} columns={columns} labels={labels} number={offset+i+1} canManage={canManage} call={call} onSaved={onSaved} onDirty={value=>pending(r.id,value)} onHistory={onHistory}/>)}
 {canManage&&newRows.map((row,i)=><RecruitmentSheetRow key={'new-'+row.key} record={row.record} stage={stage} columns={columns} labels={labels} number={offset+existing.length+i+1} canManage={canManage} call={call} onSaved={saved=>{setNewRows(previous=>{const next=previous.map(r=>r.key===row.key?{...r,record:saved}:r);if(next.every(r=>r.record))next.push({key:Math.max(...next.map(r=>r.key))+1});return next;});onSaved(saved);}} onDirty={value=>pending('new-'+row.key,value)} onHistory={onHistory}/>)}
 {!canManage&&!records.length&&<tr><td colSpan={columns.length+3}>No candidates match this view.</td></tr>}
 </tbody></table></div>;
}
