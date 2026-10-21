'use client';
import {useEffect, useRef, useState} from 'react';
import type {Candidate, Field, RecordEntry} from './model';
import {validateCandidate,fields,type Audit} from './model';
import {createPortal} from 'react-dom';
import {indiaToday,followUpState} from './followUp';
import styles from './recruitment.module.css';
import {parseClipboard,normalizePastedValue} from './clipboard';
type PastePatch={version:number;values:Partial<Candidate>};

type Call=<T>(data:Record<string,unknown>)=>Promise<T>;
const stages=['On Going','Finalized','Not Interested'];
const mainFields:Field[]=['name','contact','designation','documents','lastFollowUpDate','followUpDate','stage'];
const empty=(stage:string)=>({name:'',contact:'',designation:'',age:'',experience:'',salary:'',allowance:'',documents:'',remark:'',followUp:'',followUpDate:'',status:'',travelDate:'',travelNote:'',stage,lastFollowUpDate:'',followUpOutcome:'',followUpChannel:'',followUpNote:''});
const same=(a:Candidate,b:Candidate)=>fields.every(k=>(a[k]||'')===(b[k]||''));
export function RecruitmentSheetRow({record,stage,columns,labels,number,canManage,call,onSaved,onDirty,onHistory,canDelete=false,onDelete,patch,onPasteRange,onPasteApplied,panelHost,selected,onSelect,actorName=''}:{record?:RecordEntry;stage:string;columns:Field[];labels:Record<Field,string>;number:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onDirty:(dirty:boolean)=>void;onHistory:(record:RecordEntry)=>void;canDelete?:boolean;onDelete?:(record?:RecordEntry)=>void;patch?:PastePatch;onPasteRange?:(col:number,text:string)=>void;onPasteApplied?:()=>void;panelHost?:HTMLElement|null;selected?:boolean;onSelect?:()=>void;actorName?:string}){
 const [values,setValues]=useState<Candidate>({...empty(stage),...record?.values});
 const [status,setStatus]=useState('');
 const [localExpanded,setLocalExpanded]=useState(false);const expanded=selected??localExpanded;const toggle=()=>onSelect?onSelect():setLocalExpanded(!localExpanded);
 const [activity,setActivity]=useState<Audit[]>([]);const [activityError,setActivityError]=useState('');
 useEffect(()=>{let active=true;if(expanded&&record?.id){setActivityError('');call<Audit[]>({action:'history',id:record.id}).then(items=>{if(active)setActivity(items.slice(-3).reverse());}).catch(()=>{if(active)setActivityError('Could not load activity. Use View full history to retry.');});}return()=>{active=false;};},[expanded,record?.id,record?.revision]);
 const [error,setError]=useState('');
 const base=useRef(record),latest=useRef(values),running=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true);
 const callbacks=useRef({onSaved,onDirty});callbacks.current={onSaved,onDirty};
 const dirty=()=>!same(latest.current,base.current?.values||empty(stage));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 useEffect(()=>{if(record&&!dirty()&&!running.current){base.current=record;latest.current={...empty(stage),...record.values};setValues(latest.current);}},[record]);
 const save=async(action='save')=>{
  if(timer.current)clearTimeout(timer.current);
  if(running.current||(!dirty()&&action!=='followUp')||!canManage)return;
  let snapshot:Candidate;
  try{snapshot=validateCandidate(latest.current);}catch(e){setError(e instanceof Error?e.message:'Check this row.');setStatus('Not saved');return;}
  running.current=true;setStatus('Saving…');setError('');
  try{
   const saved=await call<{id:string;record:RecordEntry}>({action,...(base.current?{id:base.current.id}:{}),revision:base.current?.revision||0,values:snapshot});
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
 const mainColumns=mainFields.filter(k=>columns.includes(k));
 const panelField=(field:Field)=> <label key={field}>{labels[field]}{canManage?(field==='followUpNote'?<textarea aria-label={labels[field]} value={values[field]} maxLength={4000} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()}/>:<input aria-label={labels[field]} type={['lastFollowUpDate','followUpDate','travelDate'].includes(field)?'date':'text'} list={field==='followUpOutcome'?'recruitment-outcomes':field==='followUpChannel'?'recruitment-channels':undefined} value={values[field]||''} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()}/>):<span>{values[field]||'—'}</span>}</label>;
 const panel=<section className={styles.followPanel}><div className={styles.panelHeading}><h2>Follow-up</h2><button type="button" aria-label="Close follow-up" onClick={toggle}>×</button></div><h3>{values.name||'New candidate'}</h3><p>{values.designation||'No designation'} · {values.stage}</p><div className={styles.panelFields}>{(['lastFollowUpDate','followUpDate','followUp','followUpOutcome','followUpChannel','followUpNote'] as Field[]).map(panelField)}</div><datalist id="recruitment-outcomes">{['Contacted','No answer','Documents requested','Interview scheduled','Confirmed','Not interested'].map(v=><option key={v} value={v}/>)}</datalist><datalist id="recruitment-channels">{['Phone','WhatsApp','Email','In person'].map(v=><option key={v} value={v}/>)}</datalist>{canManage&&<button type="button" className={styles.primary} disabled={!base.current||status==='Saving…'} onClick={()=>{latest.current={...latest.current,lastFollowUpDate:indiaToday(),followUp:latest.current.followUp||actorName};setValues(latest.current);callbacks.current.onDirty(dirty());void save('followUp');}}>Mark followed up</button>}<small>{!base.current?'Enter a candidate name to save this row first.':'Records your name and date in history.'}</small><div className={styles.panelStatus} role="status">{status||'Saved'}{error&&<p role="alert">{error}</p>}</div><details className={styles.moreDetails}><summary>Candidate details & travel</summary><div className={styles.panelFields}>{(['age','experience','salary','allowance','remark','status','travelDate','travelNote'] as Field[]).map(panelField)}</div></details><h3>Recent activity</h3>{activityError&&<p>{activityError}</p>}{activity.map(item=><div className={styles.activityItem} key={item.id}><strong>{item.actorName}</strong><small>{new Date(item.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</small><p>{item.action}{item.changes?.followUpNote?.after?' · '+item.changes?.followUpNote.after:''}</p></div>)}{base.current&&<button type="button" onClick={()=>onHistory(base.current!)}>View full history</button>}</section>;
 return <><tr data-stage={values.stage} data-new={!base.current} data-error={!!error} data-selected={expanded}>
  <td>{number}</td>
  {mainColumns.map(field=>{const col=columns.indexOf(field);return <td key={field} data-label={labels[field]} className={`${field==='name'?styles.name:''} ${styles.editableCell}`}>
   {canManage?(field==='stage'?<select aria-label={`${labels[field]} row ${number}`} data-column={col} value={values[field]} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()} onKeyDown={e=>navigate(e,col)} onPaste={e=>paste(e,col)}>{stages.map(s=><option key={s}>{s}</option>)}</select>:<input title={values[field]} aria-label={`${labels[field]} row ${number}`} data-column={col} type={field==='lastFollowUpDate'||field==='followUpDate'?'date':'text'} value={values[field]} placeholder={!base.current&&field==='name'?'Type candidate name…':undefined} maxLength={field==='remark'||field==='travelNote'?4000:200} onChange={e=>change(field,e.target.value)} onBlur={()=>void save()} onKeyDown={e=>navigate(e,col)} onPaste={e=>paste(e,col)}/>):values[field]||'—'}
  {field==='followUpDate'&&followUpState(values.followUpDate,values.stage)&&<span className={styles.dueBadge} data-due={followUpState(values.followUpDate,values.stage)}>{followUpState(values.followUpDate,values.stage)}</span>}</td>;})}
  <td className={styles.rowActions} data-label="Actions"><button type="button" aria-label={`Details row ${number}`} aria-expanded={expanded} title="Follow-up, travel and history" onClick={toggle}>{expanded?'⌃':'⌄'}</button>{canDelete&&<button type="button" aria-label={`Delete row ${number}`} title="Delete row" disabled={running.current} onClick={()=>onDelete?.(base.current)}>×</button>}<span role="status" className={styles.saveDot} data-error={!!error} title={error||status||'Saved'}>{error?'!':status==='Saving…'?'…':dirty()?'○':base.current?'✓':''}</span></td>
 </tr>
 {expanded&&panelHost&&createPortal(panel,panelHost)}
 {error&&<tr className={styles.errorRow}><td colSpan={mainColumns.length+2}><div role="alert">Row {number}: {error} <button type="button" onClick={()=>void save()}>Retry</button><button type="button" onClick={discard}>Discard changes</button></div></td></tr>}
 </>;
}
function validateForCompare(values:Candidate){return Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.trim()])) as Candidate;}

export default function RecruitmentWorksheet({records,stage,columns,labels,offset,canManage,call,onSaved,onPendingChange,onHistory,canDelete=false,onDeleted,actorName=''}:{records:RecordEntry[];stage:string;columns:Field[];labels:Record<Field,string>;offset:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onPendingChange:(pending:boolean)=>void;onHistory:(record:RecordEntry)=>void;canDelete?:boolean;onDeleted?:(id:string)=>void;actorName?:string}){
 const [panelHost,setPanelHost]=useState<HTMLElement|null>(null);const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{if(selected&&panelHost&&typeof window.matchMedia==='function'&&window.matchMedia('(max-width:1250px)').matches)panelHost.scrollIntoView({behavior:'smooth',block:'start'});},[selected,panelHost]);
 const [newRows,setNewRows]=useState<{key:number;record?:RecordEntry}[]>(()=>Array.from({length:5},(_,key)=>({key})));
 const [patches,setPatches]=useState<Record<string,PastePatch>>({});const [sheetError,setSheetError]=useState('');const pasteVersion=useRef(0);const [deleting,setDeleting]=useState(false);
 const dirtyRows=useRef(new Set<string>());
 const pending=(key:string,value:boolean)=>{if(value)dirtyRows.current.add(key);else dirtyRows.current.delete(key);onPendingChange(dirtyRows.current.size>0);};
 const createdIds=new Set(newRows.flatMap(r=>r.record?[r.record.id]:[]));
 const existing=records.filter(r=>!createdIds.has(r.id));
 useEffect(()=>{if(selected&&!existing.some(r=>r.id===selected)&&!newRows.some(r=>'new-'+r.key===selected&&(!r.record||r.record.values.stage===stage)))setSelected(null);},[selected,records,newRows,stage]);
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
 return <>{sheetError&&<p role="alert" className={styles.error}>{sheetError}</p>}<div className={styles.worksheetSplit}><div className={styles.tableWrap}><table><colgroup><col style={{width:"3%"}}/>{mainFields.filter(k=>columns.includes(k)).map(k=><col key={k} style={{width:({name:19,contact:14,designation:11,documents:12,lastFollowUpDate:15,followUpDate:16,stage:12} as Partial<Record<Field,number>>)[k]+"%"}}/>)}<col style={{width:"6%"}}/></colgroup><thead><tr><th>#</th>{mainFields.filter(k=>columns.includes(k)).map(k=><th key={k}>{k==='contact'?'Contact':labels[k]}</th>)}<th>Actions</th></tr></thead><tbody>
 {existing.map((r,i)=><RecruitmentSheetRow panelHost={panelHost} actorName={actorName} selected={selected===r.id} onSelect={()=>setSelected(selected===r.id?null:r.id)} key={r.id} record={r} stage={stage} columns={columns} labels={labels} number={offset+i+1} canManage={canManage} call={call} onSaved={saved=>{if(saved.values.stage!==stage)setSelected(null);onSaved(saved);}} onDirty={value=>pending(r.id,value)} onHistory={onHistory} canDelete={canDelete&&!deleting} onDelete={record=>void deleteRow(r.id,record)} patch={patches[r.id]} onPasteApplied={()=>setPatches(previous=>{const next={...previous};delete next[r.id];return next;})} onPasteRange={(col,text)=>pasteRange(r.id,col,text)}/>)}
 {canManage&&newRows.filter(row=>!row.record||row.record.values.stage===stage).map((row,i)=><RecruitmentSheetRow panelHost={panelHost} actorName={actorName} selected={selected==='new-'+row.key} onSelect={()=>setSelected(selected==='new-'+row.key?null:'new-'+row.key)} key={'new-'+row.key} record={row.record} stage={stage} columns={columns} labels={labels} number={offset+existing.length+i+1} canManage={canManage} call={call} onSaved={saved=>{if(saved.values.stage!==stage)setSelected(null);setNewRows(previous=>{const next=previous.map(r=>r.key===row.key?{...r,record:saved}:r);if(next.every(r=>r.record))next.push({key:Math.max(...next.map(r=>r.key))+1});return next;});onSaved(saved);}} onDirty={value=>pending('new-'+row.key,value)} onHistory={onHistory} canDelete={canDelete&&!deleting} onDelete={record=>void deleteRow('new-'+row.key,record)} patch={patches['new-'+row.key]} onPasteApplied={()=>setPatches(previous=>{const next={...previous};delete next['new-'+row.key];return next;})} onPasteRange={(col,text)=>pasteRange('new-'+row.key,col,text)}/>)}
 {!canManage&&!records.length&&<tr><td colSpan={mainFields.filter(k=>columns.includes(k)).length+2}>No candidates match this view.</td></tr>}
 </tbody></table></div><aside className={styles.panelHost} ref={setPanelHost}>{!selected&&<div className={styles.panelEmpty}><h2>Follow-up</h2><p>Select a row’s arrow to manage follow-up dates, notes and candidate details.</p></div>}</aside></div></>;
}
