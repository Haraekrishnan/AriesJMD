'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {fields,validateCandidate,type Candidate,type Field,type RecordEntry} from './model';
import {followUpState} from './followUp';
import {parseClipboard,normalizePastedValue} from './clipboard';
import styles from './recruitment.module.css';

type Call=<T>(data:Record<string,unknown>)=>Promise<T>;
type Person={id:string;name:string};
type PastePatch={version:number;values:Partial<Candidate>};
const stages=['On Going','Finalized','Not Interested'];
const primary:Field[]=['name','designation','assignedTo','documents','lastFollowUpDate','followUpDate','followUpOutcome','followUpNote','stage'];
const extras:Field[]=['age','experience','salary','allowance','remark','followUp','followUpChannel','status','travelDate','travelNote'];
const empty=(stage:string)=>({...Object.fromEntries(fields.map(k=>[k,''])),stage}) as Candidate;
const same=(a:Candidate,b:Candidate)=>fields.every(k=>(a[k]||'')===(b[k]||''));
const stamp=(value?:string)=>value?new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}):'';
const normalize=(value:Candidate,stage:string)=>({...empty(stage),...value});

type RowProps={record?:RecordEntry;stage:string;columns:Field[];labels:Record<Field,string>;number:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onDirty:(dirty:boolean)=>void;onHistory:(record:RecordEntry)=>void;canDelete?:boolean;onDelete?:(record?:RecordEntry)=>void;patch?:PastePatch;onPasteRange?:(field:Field,text:string)=>void;onPasteApplied?:()=>void;panelHost?:HTMLElement|null;selected?:boolean;onSelect?:()=>void;assignees?:Person[]};
export function RecruitmentSheetRow({record,stage,columns,labels,number,canManage,call,onSaved,onDirty,onHistory,canDelete=false,onDelete,patch,onPasteRange,onPasteApplied,panelHost,selected=false,onSelect,assignees=[]}:RowProps){
 const [values,setValues]=useState<Candidate>(normalize(record?.values||empty(stage),stage));
 const [status,setStatus]=useState('');const [error,setError]=useState('');
 const base=useRef(record),latest=useRef(values),running=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true);
 const callbacks=useRef({onSaved,onDirty});callbacks.current={onSaved,onDirty};
 const dirty=()=>!same(latest.current,base.current?.values||empty(stage));
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 useEffect(()=>{if(record&&!dirty()&&!running.current){base.current=record;latest.current=normalize(record.values,stage);setValues(latest.current);}},[record]);
 const save=async(action='save')=>{
  if(timer.current)clearTimeout(timer.current);
  if(running.current||(!dirty()&&action!=='followUp')||!canManage)return;
  let snapshot:Candidate;
  try{snapshot=validateCandidate(latest.current);}catch(e){setError(e instanceof Error?e.message:'Check this row.');setStatus('Not saved');return;}
  running.current=true;setStatus('Saving…');setError('');
  try{
   const saved=await call<{id:string;record:RecordEntry}>({action,...(base.current?{id:base.current.id}:{}),revision:base.current?.revision||0,values:snapshot});
   base.current=saved.record;
   // Preserve edits made during the request, while taking authoritative completion fields.
   const unchanged=fields.every(k=>(latest.current[k]||'').trim()===snapshot[k]);
   if(unchanged){latest.current=saved.record.values;if(alive.current)setValues(latest.current);}
   else if(action==='followUp'){latest.current={...latest.current,lastFollowUpDate:saved.record.values.lastFollowUpDate,followUp:saved.record.values.followUp};if(alive.current)setValues(latest.current);}
   callbacks.current.onDirty(dirty());if(!dirty())callbacks.current.onSaved(saved.record);
   if(alive.current)setStatus(dirty()?'Unsaved changes':'Saved');
  }catch(e){if(alive.current){setError(e instanceof Error?e.message:'Could not save. Your changes remain in this row.');setStatus('Not saved');}return;}
  finally{running.current=false;}
  if(dirty()&&alive.current)void save();
 };
 const change=(field:Field,value:string)=>{
  latest.current={...latest.current,[field]:value};setValues(latest.current);setError('');setStatus(dirty()?'Unsaved changes':'');callbacks.current.onDirty(dirty());
  if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void save(),800);
 };
 useEffect(()=>{if(!patch||!canManage)return;latest.current={...latest.current,...patch.values};setValues(latest.current);setError('');setStatus('Unsaved changes');callbacks.current.onDirty(dirty());if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>void save(),800);onPasteApplied?.();},[patch]);
 const paste=(event:React.ClipboardEvent<HTMLInputElement|HTMLSelectElement>,field:Field)=>{const text=event.clipboardData.getData('text/plain');if(onPasteRange&&(text.includes('\t')||text.includes('\n')||text.includes('\r'))){event.preventDefault();onPasteRange(field,text);}};
 const discard=()=>{if(timer.current)clearTimeout(timer.current);latest.current=normalize(base.current?.values||empty(stage),stage);setValues(latest.current);setError('');setStatus('');callbacks.current.onDirty(false);};
 const navigate=(event:React.KeyboardEvent<HTMLInputElement|HTMLSelectElement>,field:Field)=>{
  if(event.key!=='Enter')return;event.preventDefault();void save();const row=event.currentTarget.closest('tr');let next=event.shiftKey?row?.previousElementSibling:row?.nextElementSibling;while(next&&!next.hasAttribute('data-new'))next=event.shiftKey?next.previousElementSibling:next.nextElementSibling;next?.querySelector<HTMLElement>(`[data-column="${field}"]`)?.focus();
 };
 const editor=(field:Field,context=false)=>{
  if(!canManage)return <span>{field==='assignedTo'?(assignees.find(p=>p.id===values.assignedTo)?.name||base.current?.assignedToName||values.assignedTo||'Unassigned'):values[field]||'—'}</span>;
  const common={'aria-label':context?'Assign selected candidate':`${labels[field]} row ${number}`,'data-column':field,value:values[field]||'',onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>change(field,e.target.value),onBlur:()=>void save(),onKeyDown:(e:React.KeyboardEvent<HTMLInputElement|HTMLSelectElement>)=>navigate(e,field),onPaste:(e:React.ClipboardEvent<HTMLInputElement|HTMLSelectElement>)=>paste(e,field)};
  if(field==='stage')return <select {...common}>{stages.map(s=><option key={s}>{s}</option>)}</select>;
  if(field==='assignedTo')return <select {...common}><option value="">Unassigned</option>{values.assignedTo&&!assignees.some(p=>p.id===values.assignedTo)&&<option value={values.assignedTo}>{base.current?.assignedToName||values.assignedTo} (unavailable)</option>}{assignees.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select>;
  return <input {...common} title={values[field]} list={field==='followUpOutcome'?'recruitment-outcomes':field==='followUpChannel'?'recruitment-channels':undefined} type={['lastFollowUpDate','followUpDate','travelDate'].includes(field)?'date':'text'} maxLength={['remark','travelNote','followUpNote'].includes(field)?4000:200} placeholder={!base.current&&field==='name'?'Type candidate name…':undefined}/>;
 };
 const completion=<td className={styles.completedCell} data-label="Completed by / time"><strong>{base.current?.completedByName||'—'}</strong><small>{stamp(base.current?.completedAt)}</small></td>;
 const toolbar=<div className={styles.selectionBar}><strong>{values.name||'New candidate'} selected</strong>{canManage&&<><label>Assign / Reassign {editor('assignedTo',true)}</label><button type="button" className={styles.completeButton} disabled={!base.current||status==='Saving…'} onClick={()=>void save('followUp')}>Complete follow-up</button></>}{base.current&&<button type="button" onClick={()=>onHistory(base.current!)}>View history</button>}{canDelete&&<button type="button" disabled={status==='Saving…'} onClick={()=>onDelete?.(base.current)}>Delete row</button>}<span role="status">{status||(!base.current?'New row':'Saved')}</span><div className={styles.selectionAudit}><span>Assigned to {assignees.find(p=>p.id===values.assignedTo)?.name||base.current?.assignedToName||'Unassigned'}{base.current?.assignedByName?` by ${base.current.assignedByName} · ${stamp(base.current.assignedAt)}`:''}</span><span>Last completed: {base.current?.completedByName?`${base.current.completedByName} · ${stamp(base.current.completedAt)}`:'Not recorded'}</span></div></div>;
 return <><tr data-stage={values.stage} data-new={!base.current} data-error={!!error} data-selected={selected} onFocus={()=>{if(!selected)onSelect?.();}}>
 <td className={styles.rowNumber}><button type="button" aria-label={`Select row ${number}`} aria-pressed={selected} onClick={onSelect}>{number}</button></td>
 {columns.map(field=><FragmentCell key={field}>{field==='stage'&&completion}<td data-label={field==='name'?'Candidate / Contact':labels[field]} className={`${styles.editableCell} ${field==='name'?styles.name:''}`}>{editor(field)}{field==='name'&&<div className={styles.contactLine}>{editor('contact')}</div>}{field==='followUpDate'&&followUpState(values.followUpDate,values.stage)&&<span className={styles.dueBadge} data-due={followUpState(values.followUpDate,values.stage)}>{followUpState(values.followUpDate,values.stage)}</span>}</td></FragmentCell>)}
 </tr>{selected&&panelHost&&createPortal(toolbar,panelHost)}
 {error&&<tr className={styles.errorRow}><td colSpan={columns.length+2}><div role="alert">Row {number}: {error} <button type="button" onClick={()=>void save()}>Retry</button><button type="button" onClick={discard}>Discard changes</button></div></td></tr>}</>;
}
function FragmentCell({children}:{children:React.ReactNode}){return <>{children}</>;}

type WorksheetProps={records:RecordEntry[];stage:string;columns:Field[];labels:Record<Field,string>;offset:number;canManage:boolean;call:Call;onSaved:(record:RecordEntry)=>void;onPendingChange:(pending:boolean)=>void;onHistory:(record:RecordEntry)=>void;canDelete?:boolean;onDeleted?:(id:string)=>void;assignees?:Person[]};
export default function RecruitmentWorksheet({records,stage,columns,labels,offset,canManage,call,onSaved,onPendingChange,onHistory,canDelete=false,onDeleted,assignees=[]}:WorksheetProps){
 const [panelHost,setPanelHost]=useState<HTMLElement|null>(null),[selected,setSelected]=useState<string|null>(null);
 const [extraColumns,setExtraColumns]=useState<Field[]>([]),[pasteMode,setPasteMode]=useState('visible');
 const visibleColumns=[...primary.slice(0,-1),...extraColumns,'stage'] as Field[];
 const pasteColumns=pasteMode==='original'?columns:visibleColumns.flatMap(k=>k==='name'?['name','contact'] as Field[]:[k]);
 const [newRows,setNewRows]=useState<{key:number;record?:RecordEntry}[]>(()=>Array.from({length:5},(_,key)=>({key})));
 const [patches,setPatches]=useState<Record<string,PastePatch>>({}),[sheetError,setSheetError]=useState('');const pasteVersion=useRef(0),dirtyRows=useRef(new Set<string>());const [deleting,setDeleting]=useState(false);
 const pending=(key:string,value:boolean)=>{if(value)dirtyRows.current.add(key);else dirtyRows.current.delete(key);onPendingChange(dirtyRows.current.size>0);};
 const createdIds=new Set(newRows.flatMap(r=>r.record?[r.record.id]:[])),existing=records.filter(r=>!createdIds.has(r.id));
 const drafts=newRows.filter(r=>!r.record||r.record.values.stage===stage);
 useEffect(()=>{if(selected&&!existing.some(r=>r.id===selected)&&!drafts.some(r=>'new-'+r.key===selected))setSelected(null);},[selected,records,newRows,stage]);
 const pasteRange=(key:string,field:Field,text:string)=>{
  if(!canManage)return;
  try{const matrix=parseClipboard(text),col=pasteColumns.indexOf(field);if(col<0||matrix.some(row=>row.length>pasteColumns.length-col))throw new Error('The pasted range extends beyond the last column. Choose the matching Paste order and omit serial numbers and completion metadata.');
   const sequence=[...existing.map(r=>r.id),...drafts.map(r=>'new-'+r.key)],start=sequence.indexOf(key);if(start<0)return;
   const extras=[] as {key:number;record?:RecordEntry}[];let nextKey=Math.max(-1,...newRows.map(r=>r.key))+1;
   while(sequence.length<start+matrix.length){extras.push({key:nextKey});sequence.push('new-'+nextKey++);}
   const version=++pasteVersion.current,changes:Record<string,PastePatch>={};matrix.forEach((cells,index)=>{const values:Partial<Candidate>={};cells.forEach((value,j)=>{const k=pasteColumns[col+j];if(k==='assignedTo'&&value.trim()&&value.trim().toLowerCase()!=='unassigned'){const matches=assignees.filter(p=>p.id===value.trim()||p.name.toLowerCase()===value.trim().toLowerCase());if(matches.length!==1)throw new Error('Assigned to must match one eligible user name or ID: '+value);values[k]=matches[0].id;}else values[k]=k==='assignedTo'?'':normalizePastedValue(k,value);});changes[sequence[start+index]]={version,values};});
   if(extras.length)setNewRows(previous=>[...previous,...extras]);setPatches(previous=>({...previous,...changes}));setSheetError('');
  }catch(e){setSheetError(e instanceof Error?e.message:'Could not paste cells.');}
 };
 const deleteRow=async(key:string,record?:RecordEntry)=>{
  if(!canDelete||deleting)return;if(!window.confirm(record?'Delete '+record.values.name+' from recruitment? Its history will be retained.':'Remove this blank row?'))return;
  setDeleting(true);setSheetError('');try{if(record){await call({action:'delete',id:record.id,revision:record.revision});onDeleted?.(record.id);}setNewRows(previous=>{const remaining=previous.filter(r=>'new-'+r.key!==key);return remaining.length?remaining:[{key:Math.max(-1,...previous.map(r=>r.key))+1}];});setSelected(null);pending(key,false);}catch(e){setSheetError(e instanceof Error?e.message:'Could not delete row.');}finally{setDeleting(false);}
 };
 const rowProps=(key:string)=>({panelHost,assignees,selected:selected===key,onSelect:()=>setSelected(key),columns:visibleColumns,labels,stage,canManage,call,canDelete:canDelete&&!deleting,onDirty:(v:boolean)=>pending(key,v),onHistory,onDelete:(r?:RecordEntry)=>void deleteRow(key,r),patch:patches[key],onPasteApplied:()=>setPatches(previous=>{const next={...previous};delete next[key];return next;}),onPasteRange:(field:Field,text:string)=>pasteRange(key,field,text)});
 const widths:Partial<Record<Field,number>>={name:19,designation:7,assignedTo:12,documents:9,lastFollowUpDate:10,followUpDate:11,followUpOutcome:12,followUpNote:16,stage:10};
 const headers=visibleColumns.flatMap(k=>k==='stage'?['Completed by / time',labels[k]]:[k==='name'?'Candidate / Contact':k==='designation'?'Trade':labels[k]]);
 return <><div className={styles.gridTools}><details><summary>More columns</summary><div className={styles.columnMenu}>{extras.map(k=><label key={k}><input type="checkbox" checked={extraColumns.includes(k)} onChange={e=>setExtraColumns(previous=>e.target.checked?[...previous,k]:previous.filter(v=>v!==k))}/>{labels[k]}</label>)}</div></details>{canManage&&<label>Paste order <select aria-label="Paste order" value={pasteMode} onChange={e=>setPasteMode(e.target.value)}><option value="visible">Visible columns</option><option value="original">Original Excel sheet</option></select></label>}<span>Click a cell to edit · Tab to move · Paste from Excel</span></div>
 <div className={styles.contextHost} ref={setPanelHost}>{!selected&&<div className={styles.selectionBar}>Select a row to assign responsibility, complete a follow-up or view history.</div>}</div>
 {sheetError&&<p role="alert" className={styles.error}>{sheetError}</p>}
 <datalist id="recruitment-outcomes">{['Contacted','No answer','Documents requested','Interview scheduled','Confirmed','Not interested'].map(v=><option key={v} value={v}/>)}</datalist><datalist id="recruitment-channels">{['Phone','WhatsApp','Email','In person'].map(v=><option key={v} value={v}/>)}</datalist>
 <div className={`${styles.tableWrap} ${styles.excelGrid}`} data-extra={extraColumns.length>0}><table><colgroup><col style={{width:'3%'}}/>{visibleColumns.map(k=><FragmentCell key={k}>{k==='stage'&&<col style={{width:'13%'}}/>}<col style={{width:(widths[k]||10)+'%'}}/></FragmentCell>)}</colgroup><thead><tr className={styles.letters}><th></th>{headers.map((h,i)=><th key={h}>{String.fromCharCode(65+i)}</th>)}</tr><tr><th>#</th>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
 {existing.map((r,i)=><RecruitmentSheetRow key={r.id} {...rowProps(r.id)} record={r} number={offset+i+1} onSaved={saved=>{if(saved.values.stage!==stage)setSelected(null);onSaved(saved);}}/>)}
 {canManage&&drafts.map((row,i)=><RecruitmentSheetRow key={'new-'+row.key} {...rowProps('new-'+row.key)} record={row.record} number={offset+existing.length+i+1} onSaved={saved=>{if(saved.values.stage!==stage)setSelected(null);setNewRows(previous=>{const next=previous.map(r=>r.key===row.key?{...r,record:saved}:r);if(next.every(r=>r.record))next.push({key:Math.max(...next.map(r=>r.key))+1});return next;});onSaved(saved);}}/>)}
 {!canManage&&!records.length&&<tr><td colSpan={headers.length+1}>No candidates match this view.</td></tr>}
 </tbody></table></div><p className={styles.gridHint}>Assignment changes and completed follow-ups are recorded automatically. Completion details cannot be edited or pasted.</p></>;
}
