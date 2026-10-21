'use client';
import {useEffect, useRef, useState} from 'react';
import type {Candidate, Field, RecordEntry} from './model';
import {validateCandidate} from './model';
import styles from './recruitment.module.css';
import {parseClipboard,normalizePastedValue} from './clipboard';
type PastePatch={version:number;values:Partial<Candidate>};

type Call=<T>(data:Record<string,unknown>)=>Promise<T>;
const stages=['On Going','Finalized','Not Interested'];
const detailFields:Field[]=['followUp','followUpDate','status','travelDate','travelNote'];
const empty=(stage:string)=>({name:'',contact:'',designation:'',age:'',experience:'',salary:'',allowance:'',documents:'',remark:'',followUp:'',followUpDate:'',status:'',travelDate:'',travelNote:'',stage});
const same=(a:Candidate,b:Candidate)=>JSON.stringify(a)===JSON.stringify(b);
export function RecruitmentSheetRow({record,stage,columns,labels,number,canManage,call,onSaved,onDirty,onHistory,canDelete=false,onDelete,patch,onPasteRange,onPasteApplied}:{record?:RecordEntry;stage:string;columns:Field[];labels:Record<Field,string>;number:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onDirty:(dirty:boolean)=>void;onHistory:(record:RecordEntry)=>void;canDelete?:boolean;onDelete?:(record?:RecordEntry)=>void;patch?:PastePatch;onPasteRange?:(col:number,text:string)=>void;onPasteApplied?:()=>void}){
 const [values,setValues]=useState<Candidate>(record?.values||empty(stage));
 const [status,setStatus]=useState('');
 const [expanded,setExpanded]=useState(false);
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
 useEffect(()=>{if(!patch||!canManage)return;latest.current={...latest.current,...patch.values};setValues(latest.current);setError('');setStatus('Unsaved changes');callbacks.current.onDirty(dirty());if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void save(),800);onPasteApplied?.();},[patch]);
 const paste=(event:React.ClipboardEvent<HTMLInputElement|HTMLSelectElement>,col:number)=>{const text=event.clipboardData.getData('text/plain');if(onPasteRange&&(text.includes('\t')||text.includes('\n')||text.includes('\r'))){event.preventDefault();onPasteRange(col,text);}};
 const discard=()=>{if(timer.current)clearTimeout(timer.current);latest.current=base.current?.values||empty(stage);setValues(latest.current);setError('');setStatus('');callbacks.current.onDirty(false);};
 const navigate=(event:React.KeyboardEvent<HTMLInputElement|HTMLSelectElement>,col:number)=>{
  if(event.key!=='Enter')return;event.preventDefault();void save();
  const row=event.currentTarget.closest('tr');let next=event.shiftKey?row?.previousElementSibling:row?.nextElementSibling;while(next&&!next.hasAttribute("data-new"))next=event.shiftKey?next.previousElementSibling:next.nextElementSibling;const target=next?.querySelector<HTMLElement>(`[data-column="${col}"]`);target?.focus();
 };
 const mainColumns=columns.filter(k=>!detailFields.includes(k));
 return <><tr data-stage={values.stage} data-new={!base.current} data-error={!!error}>
  <td>{number}</td>
  {mainColumns.map(field=>{const col=columns.indexOf(field);return <td key={field} data-label={labels[field]} className={`${field==='name'?styles.name:''} ${styles.editableCell}`}>
   {canManage?(field==='stage'?<select aria-label={`${labels[field]} row ${number}`} data-column={col} value={values[field]} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()} onKeyDown={e=>navigate(e,col)} onPaste={e=>paste(e,col)}>{stages.map(s=><option key={s}>{s}</option>)}</select>:<input title={values[field]} aria-label={`${labels[field]} row ${number}`} data-column={col} type={field==='travelDate'||field==='followUpDate'?'date':'text'} value={values[field]} placeholder={!base.current&&field==='name'?'Type candidate name…':undefined} maxLength={field==='remark'||field==='travelNote'?4000:200} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()} onKeyDown={e=>navigate(e,col)} onPaste={e=>paste(e,col)}/>):values[field]||'—'}
  </td>;})}
  <td className={styles.rowActions} data-label="Actions"><button type="button" aria-label={`Details row ${number}`} aria-expanded={expanded} title="Follow-up, travel and history" onClick={()=>setExpanded(!expanded)}>{expanded?'⌃':'⌄'}</button>{canDelete&&<button type="button" aria-label={`Delete row ${number}`} title="Delete row" disabled={running.current} onClick={()=>onDelete?.(base.current)}>×</button>}<span role="status" className={styles.saveDot} data-error={!!error} title={error||status||'Saved'}>{error?'!':status==='Saving…'?'…':dirty()?'○':base.current?'✓':''}</span></td>
 </tr>
 {expanded&&<tr className={styles.detailsRow} data-stage={values.stage}><td colSpan={mainColumns.length+2}><div className={styles.detailsGrid}>{columns.filter(k=>detailFields.includes(k)).map(field=><label key={field}>{labels[field]}{canManage?<input aria-label={`${labels[field]} row ${number}`} type={field==='travelDate'||field==='followUpDate'?'date':'text'} value={values[field]} maxLength={field==='travelNote'?4000:200} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()} onPaste={e=>paste(e,columns.indexOf(field))}/>:<span>{values[field]||'—'}</span>}</label>)}<div className={styles.auditInfo}><span>{status||(!base.current?'New row':'Saved')}</span>{base.current&&<><small>Updated by {base.current.updatedByName} · {new Date(base.current.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</small><button type="button" onClick={()=>onHistory(base.current!)}>History</button></>}</div></div></td></tr>}
 {error&&<tr className={styles.errorRow}><td colSpan={mainColumns.length+2}><div role="alert">Row {number}: {error} <button type="button" onClick={()=>void save()}>Retry</button><button type="button" onClick={discard}>Discard changes</button></div></td></tr>}
 </>;
}
function validateForCompare(values:Candidate){return Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.trim()])) as Candidate;}

export default function RecruitmentWorksheet({records,stage,columns,labels,offset,canManage,call,onSaved,onPendingChange,onHistory,canDelete=false,onDeleted}:{records:RecordEntry[];stage:string;columns:Field[];labels:Record<Field,string>;offset:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onPendingChange:(pending:boolean)=>void;onHistory:(record:RecordEntry)=>void;canDelete?:boolean;onDeleted?:(id:string)=>void}){
 const [newRows,setNewRows]=useState<{key:number;record?:RecordEntry}[]>(()=>Array.from({length:5},(_,key)=>({key})));
 const [patches,setPatches]=useState<Record<string,PastePatch>>({});const [sheetError,setSheetError]=useState('');const pasteVersion=useRef(0);const [deleting,setDeleting]=useState(false);
 const dirtyRows=useRef(new Set<string>());
 const pending=(key:string,value:boolean)=>{if(value)dirtyRows.current.add(key);else dirtyRows.current.delete(key);onPendingChange(dirtyRows.current.size>0);};
 const createdIds=new Set(newRows.flatMap(r=>r.record?[r.record.id]:[]));
 const existing=records.filter(r=>!createdIds.has(r.id));
 const pasteRange=(key:string,col:number,text:string)=>{
  if(!canManage)return;
  try{const matrix=parseClipboard(text);if(matrix.some(row=>row.length>columns.length-col))throw new Error('The pasted range extends beyond the last column. Select the matching starting cell and exclude serial numbers or extra columns.');
   const sequence=[...existing.map(r=>r.id),...newRows.map(r=>'new-'+r.key)];const start=sequence.indexOf(key);if(start<0)return;
   const extras=[] as {key:number;record?:RecordEntry}[];let nextKey=Math.max(-1,...newRows.map(r=>r.key))+1;
   while(sequence.length<start+matrix.length){extras.push({key:nextKey});sequence.push('new-'+nextKey++);}
   if(extras.length)setNewRows(previous=>[...previous,...extras]);
   const version=++pasteVersion.current;const changes:Record<string,PastePatch>={};matrix.forEach((cells,index)=>{const values:Partial<Candidate>={};cells.forEach((value,j)=>{values[columns[col+j]]=normalizePastedValue(columns[col+j],value);});changes[sequence[start+index]]={version,values};});setPatches(previous=>({...previous,...changes}));setSheetError('');
  }catch(e){setSheetError(e instanceof Error?e.message:'Could not paste cells.');}
 };
 const deleteRow=async(key:string,record?:RecordEntry)=>{
  if(!canDelete||deleting)return;
  if(!window.confirm(record?'Delete '+record.values.name+' from the recruitment sheet? Its change history will be retained.':'Remove this blank row?'))return;
  setDeleting(true);setSheetError('');try{if(record){await call({action:'delete',id:record.id,revision:record.revision});onDeleted?.(record.id);}setNewRows(previous=>{const remaining=previous.filter(r=>'new-'+r.key!==key);return remaining.length?remaining:[{key:Math.max(-1,...previous.map(r=>r.key))+1}];});pending(key,false);}catch(e){setSheetError(e instanceof Error?e.message:'Could not delete row.');}finally{setDeleting(false);}
 };
 return <>{sheetError&&<p role="alert" className={styles.error}>{sheetError}</p>}<div className={styles.tableWrap}><table><colgroup><col style={{width:"3%"}}/>{columns.filter(k=>!detailFields.includes(k)).map(k=><col key={k} style={{width:({name:15,contact:11,designation:7,age:4,experience:7,salary:7,allowance:7,documents:9,remark:14,stage:10} as Partial<Record<Field,number>>)[k]+"%"}}/>)}<col style={{width:"6%"}}/></colgroup><thead><tr><th>#</th>{columns.filter(k=>!detailFields.includes(k)).map(k=><th key={k}>{k==='contact'?'Contact':labels[k]}</th>)}<th>Actions</th></tr></thead><tbody>
 {existing.map((r,i)=><RecruitmentSheetRow key={r.id} record={r} stage={stage} columns={columns} labels={labels} number={offset+i+1} canManage={canManage} call={call} onSaved={onSaved} onDirty={value=>pending(r.id,value)} onHistory={onHistory} canDelete={canDelete&&!deleting} onDelete={record=>void deleteRow(r.id,record)} patch={patches[r.id]} onPasteApplied={()=>setPatches(previous=>{const next={...previous};delete next[r.id];return next;})} onPasteRange={(col,text)=>pasteRange(r.id,col,text)}/>)}
 {canManage&&newRows.map((row,i)=><RecruitmentSheetRow key={'new-'+row.key} record={row.record} stage={stage} columns={columns} labels={labels} number={offset+existing.length+i+1} canManage={canManage} call={call} onSaved={saved=>{setNewRows(previous=>{const next=previous.map(r=>r.key===row.key?{...r,record:saved}:r);if(next.every(r=>r.record))next.push({key:Math.max(...next.map(r=>r.key))+1});return next;});onSaved(saved);}} onDirty={value=>pending('new-'+row.key,value)} onHistory={onHistory} canDelete={canDelete&&!deleting} onDelete={record=>void deleteRow('new-'+row.key,record)} patch={patches['new-'+row.key]} onPasteApplied={()=>setPatches(previous=>{const next={...previous};delete next['new-'+row.key];return next;})} onPasteRange={(col,text)=>pasteRange('new-'+row.key,col,text)}/>)}
 {!canManage&&!records.length&&<tr><td colSpan={columns.filter(k=>!detailFields.includes(k)).length+2}>No candidates match this view.</td></tr>}
 </tbody></table></div></>;
}
