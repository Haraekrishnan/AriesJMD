'use client';
import {get, onValue, push, ref, runTransaction} from 'firebase/database';
import {rtdb} from '@/lib/rtdb';
import type {User} from '@/lib/types';
import {fields, saveCandidate, isCandidateLocked, changeCandidateLock, validateCandidate, type RecordEntry} from './model';
export type RecruitmentPermissions={view:boolean;manage:boolean};
import {orderedCandidates,moveCandidateOrder} from './worksheet-view';
import {readLayout,validateColumns,type SharedLayout} from './layout';
const layoutPath='privateRecruitment/layout';
export function subscribeRecruitmentLayout(user:User,permissions:RecruitmentPermissions,onChange:(layout:SharedLayout)=>void,onError:(error:Error)=>void){if(user.status==='locked'||user.status==='deactivated'||!(user.role==='Admin'||permissions.view||permissions.manage))return ()=>{};return onValue(ref(rtdb,layoutPath),snapshot=>{try{onChange(readLayout(snapshot.val()));}catch(e){onError(e as Error);}},onError);}
const recordsPath='privateRecruitment/records';
// Keep the record's cache alive until the transaction completes. A one-shot
// get() removes its listener and may evict the value before the first update.
async function recordTransaction<T>(recordRef:ReturnType<typeof ref>,update:(previous:T|null)=>T|undefined){
  let stop:()=>void=()=>{};
  try{
    await new Promise<void>((resolve,reject)=>{
      stop=onValue(recordRef,()=>resolve(),reject);
    });
    return await runTransaction(recordRef,update,{applyLocally:false});
  }finally{stop();}
}
// .info is local SDK metadata: get() sends an unsupported server path.
const databaseTime=()=>new Promise<string>((resolve,reject)=>{
  onValue(ref(rtdb,'.info/serverTimeOffset'),snapshot=>{
    const offset=snapshot.val();
    resolve(new Date(Date.now()+(typeof offset==='number'?offset:0)).toISOString());
  },reject,{onlyOnce:true});
});
export function createRecruitmentClient(user:User,permissions:RecruitmentPermissions,assignees:readonly {id:string;name:string}[]=[]){
  return async function recruitmentCall<T>(data:Record<string,unknown>):Promise<T>{
    const active=user.status!=='locked'&&user.status!=='deactivated';
    const manage=active&&(user.role==='Admin'||permissions.manage);
    const view=active&&(manage||permissions.view);
    if(data.action==='session')return {view,manage,name:user.name} as T;
    if(!view)throw new Error('View Recruitment Sheet permission is required.');
    if(data.action==='resizeColumn'||data.action==='moveRow'){
      if(!manage)throw Error('Manage Recruitment Sheet permission is required.');
      const columnId=String(data.columnId||''),width=Number(data.width);
      if(data.action==='resizeColumn'&&(!/^[-A-Za-z0-9_]+$/.test(columnId)||!Number.isFinite(width)||width<70||width>800))throw Error('Column width must be between 70 and 800 pixels.');
      const measured=(data.widths&&typeof data.widths==='object'&&!Array.isArray(data.widths)?data.widths:{}) as Record<string,number>;if(Object.keys(measured).length>64||Object.entries(measured).some(([k,v])=>!/^[-A-Za-z0-9_]+$/.test(k)||!Number.isFinite(v)||v<70||v>800))throw Error('Invalid column widths.');
      const records=data.action==='moveRow'?Object.values((await get(ref(rtdb,recordsPath))).val()||{}).filter(r=>!(r as RecordEntry).deletedAt) as RecordEntry[]:[];
      const at=await databaseTime(),auditId=push(ref(rtdb,layoutPath+'/history')).key!;let failure='Could not save worksheet layout.';
      const result=await recordTransaction(ref(rtdb,layoutPath),(previous:SharedLayout|null)=>{try{const p=readLayout(previous);let next={...p},changes:Record<string,{before:string;after:string}>={};
        if(data.action==='resizeColumn'){next.columnWidths={...p.columnWidths,...measured,[columnId]:Math.round(width)};changes[columnId+' width']={before:String(p.columnWidths?.[columnId]||'Automatic'),after:String(Math.round(width))};}
        else{const before=orderedCandidates(records,p.rowOrder).map(r=>r.id);next.rowOrder=moveCandidateOrder(before,String(data.id),String(data.targetId),String(data.direction));const candidate=records.find(r=>r.id===data.id);changes[candidate?.values.name||String(data.id)]={before:String(before.indexOf(String(data.id))+1),after:String(next.rowOrder.indexOf(String(data.id))+1)};}
        return {...next,revision:p.revision+1,updatedBy:user.id,updatedByName:user.name,updatedAt:at,history:{...p.history,[auditId]:{id:auditId,action:data.action==='resizeColumn'?'Column resized':'Row reordered',actorId:user.id,actorName:user.name,at,changes}}};
      }catch(e){failure=(e as Error).message;return;}});if(!result.committed)throw Error(failure);return readLayout(result.snapshot.val()) as T;
    }
    if(data.action==='allHistory'){
      if(user.role!=='Admin')throw Error('Only Admin can view the complete activity log.');
      const [records,layout]=await Promise.all([get(ref(rtdb,recordsPath)),get(ref(rtdb,layoutPath))]);
      return [...Object.values(records.val()||{}).flatMap(entry=>{const r=entry as RecordEntry;return Object.values(r.history||{}).map(a=>({...a,candidateId:r.id,candidateName:r.values.name,deleted:!!r.deletedAt}));}),...Object.values((layout.val() as SharedLayout)?.history||{}).map(a=>({...a,candidateName:'Worksheet settings'}))].sort((a,b)=>b.at.localeCompare(a.at)) as T;
    }
    if(data.action==='customColumn'||data.action==='columnFormat'){
      if(user.role!=='Admin')throw Error('Only Admin can change custom columns or column formatting.');
      const at=await databaseTime(),auditId=push(ref(rtdb,layoutPath+'/history')).key!;let failure='Could not change columns.';
      const result=await recordTransaction(ref(rtdb,layoutPath),(previous:SharedLayout|null)=>{try{
        const p=readLayout(previous);if(p.revision!==data.revision)throw Error('Layout changed. Refresh and retry.');
        const custom=[...(p.customColumns||[])];let changes:Record<string,{before:string;after:string}>={},action='';let next={...p};
        if(data.action==='customColumn'){
          const id=String(data.columnId||'custom_'+auditId);if(!/^custom_[A-Za-z0-9_-]+$/.test(id))throw Error('Invalid column.');
          const index=custom.findIndex(c=>c.id===id),name=String(data.name||'').trim();
          if(data.operation!=='delete'&&(!name||name.length>60))throw Error('Column name must contain 1–60 characters.');
          if(data.operation!=='add'&&index<0)throw Error('Column no longer exists.');
          if(data.operation==='add'){if(custom.filter(c=>!c.deleted).length>=30)throw Error('Maximum 30 custom columns.');custom.push({id:id as typeof custom[number]["id"],name});next.extraColumns=[...p.extraColumns,id as typeof p.extraColumns[number]];action='Column created';}
          else if(data.operation==='delete'){custom[index]={...custom[index],deleted:true};next.extraColumns=p.extraColumns.filter(k=>k!==id);action='Column deleted';}
          else {custom[index]={...custom[index],name};action='Column renamed';}
          changes[id]={before:p.customColumns?.find(c=>c.id===id)?.name||'',after:data.operation==='delete'?'Deleted':name};next.customColumns=custom;
        }else{
          const id=String(data.columnId),property=String(data.property),value=String(data.value||'');
          if(!/^(color|backgroundColor)$/.test(property)||!/^$|^#[0-9a-fA-F]{6}$/.test(value)||!/^[-A-Za-z0-9_]+$/.test(id))throw Error('Invalid format.');
          const before=p.columnFormats?.[id]||{};next.columnFormats={...p.columnFormats,[id]:{...before,[property]:value}};changes[id+' '+property]={before:(before as Record<string,string>)[property]||'',after:value};action='Column formatted';
        }
        return {...next,revision:p.revision+1,updatedBy:user.id,updatedByName:user.name,updatedAt:at,history:{...p.history,[auditId]:{id:auditId,action,actorId:user.id,actorName:user.name,at,changes}}};
      }catch(e){failure=(e as Error).message;return;}});if(!result.committed)throw Error(failure);return readLayout(result.snapshot.val()) as T;
    }
    if(data.action==='format'){
      if(!manage)throw Error('Manage Recruitment Sheet permission is required.');
      if(typeof data.id!=='string'||!/^[-A-Za-z0-9_]+$/.test(data.id))throw Error('Invalid candidate.');
      const key=String(data.columnId||'row'),property=String(data.property),value=String(data.value||'');if(!/^[-A-Za-z0-9_]+$/.test(key)||!['color','backgroundColor'].includes(property)||!/^$|^#[0-9a-fA-F]{6}$/.test(value))throw Error('Invalid format.');
      const at=await databaseTime(),auditId=push(ref(rtdb,recordsPath+'/'+data.id+'/history')).key!;let failure='Could not format row.';
      const result=await recordTransaction(ref(rtdb,recordsPath+'/'+data.id),(p:RecordEntry|null)=>{if(!p||p.deletedAt||p.revision!==data.revision||isCandidateLocked(p)){failure='Row changed or is locked. Refresh or unlock before formatting.';return;}const before=p.formatting?.[key]||{};return {...p,formatting:{...p.formatting,[key]:{...before,[property]:value}},revision:p.revision+1,updatedAt:at,updatedBy:user.id,updatedByName:user.name,history:{...p.history,[auditId]:{id:auditId,action:'Formatted',actorId:user.id,actorName:user.name,at,changes:{[key+' '+property]:{before:(before as Record<string,string>)[property]||'',after:value}}}}};});if(!result.committed)throw Error(failure);return {record:result.snapshot.val()} as T;
    }
    if(data.action==='saveLayout'){
      if(!manage)throw Error('Manage Recruitment Sheet permission is required to save shared columns.');
      const extraColumns=validateColumns(data.extraColumns);if(!Number.isInteger(data.revision))throw Error('Invalid layout revision.');
      const at=await databaseTime(),auditId=push(ref(rtdb,layoutPath+'/history')).key!;let failure='Could not save columns.';
      const result=await recordTransaction(ref(rtdb,layoutPath),(previous:SharedLayout|null)=>{if((previous?.revision||0)!==data.revision){failure='Someone saved a newer layout. Use saved layout before saving your changes.';return;}return {...previous,history:{...previous?.history,[auditId]:{id:auditId,action:'Visible columns changed',actorId:user.id,actorName:user.name,at,changes:{columns:{before:(previous?.extraColumns||[]).join(', '),after:extraColumns.join(', ')}}}},extraColumns,revision:(previous?.revision||0)+1,updatedBy:user.id,updatedByName:user.name,updatedAt:at};});
      if(!result.committed)throw Error(failure);return readLayout(result.snapshot.val()) as T;
    }
    if(data.action==='list'){

      const snapshot=await get(ref(rtdb,recordsPath));
      return Object.values(snapshot.val()||{}).filter(entry=>!(entry as RecordEntry).deletedAt).map(entry=>{const {history,...record}=entry as RecordEntry;const completion=Object.values(history||{}).filter(item=>item.action==='Followed up').sort((a,b)=>b.at.localeCompare(a.at))[0];return {...record,...(!record.completedAt&&completion?{completedBy:completion.actorId,completedByName:completion.actorName,completedAt:completion.at}:{}),values:{...Object.fromEntries(fields.map(k=>[k,''])),...record.values}};}) as T;
    }
    if(data.action==='history'){
      if(typeof data.id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(data.id))throw new Error('Invalid candidate.');
      const snapshot=await get(ref(rtdb,`${recordsPath}/${data.id}/history`));
      return Object.values(snapshot.val()||{}).sort((a,b)=>(a as {at:string}).at.localeCompare((b as {at:string}).at)) as T;
    }
    if(data.action==='unlock'||data.action==='lock'){
      if(user.role!=='Admin')throw Error('Only Admin can unlock or lock finalized candidates.');
      if(typeof data.id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(data.id)||!Number.isInteger(data.revision))throw Error('Invalid candidate or revision.');
      const recordRef=ref(rtdb,recordsPath+'/'+data.id),auditId=push(ref(rtdb,recordsPath+'/'+data.id+'/history')).key!,at=await databaseTime();let failure='Could not change candidate lock.';
      const result=await recordTransaction(recordRef,(previous:RecordEntry|null)=>{try{return changeCandidateLock(previous,Number(data.revision),user,data.action==='unlock',auditId,at);}catch(e){failure=e instanceof Error?e.message:failure;return;}});
      if(!result.committed)throw Error(failure);return {id:data.id,record:result.snapshot.val()} as T;
    }
    if(data.action==='delete'){

      if(user.role!=='Admin')throw new Error('Only Admin can delete recruitment rows.');
      if(typeof data.id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(data.id)||!Number.isInteger(data.revision))throw new Error('Invalid candidate or revision.');
      const recordRef=ref(rtdb,recordsPath+'/'+data.id);
      const auditId=push(ref(rtdb,recordsPath+'/'+data.id+'/history')).key!;
      const at=await databaseTime();
      let failure='Candidate no longer exists.';
      const result=await recordTransaction(recordRef,(previous:RecordEntry|null)=>{
        if(!previous||previous.deletedAt)return;
        if(isCandidateLocked(previous)){failure='This finalized candidate is locked. Unlock the row before deleting it.';return;}
        if(previous.revision!==data.revision){failure='This candidate was changed by another user. Refresh before deleting.';return;}
        return {...previous,deletedAt:at,deletedBy:user.id,deletedByName:user.name,updatedAt:at,updatedBy:user.id,updatedByName:user.name,revision:previous.revision+1,history:{...previous.history,[auditId]:{id:auditId,action:'Deleted',actorId:user.id,actorName:user.name,at,changes:{deleted:{before:'No',after:'Yes'}}}}};
      });
      if(!result.committed)throw new Error(failure);
      return {id:data.id} as T;
    }
    if(data.action!=='save'&&data.action!=='followUp')throw new Error('Unknown recruitment action.');
    if(!manage)throw new Error('Manage Recruitment Sheet permission is required.');
    const values=validateCandidate(data.values);
    if(data.action==='followUp'&&!data.id)throw new Error('Save the candidate before recording a follow-up.');
    const id=data.id||push(ref(rtdb,recordsPath)).key;
    if(typeof id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(id)||!Number.isInteger(data.revision)||Number(data.revision)<0)throw new Error('Invalid candidate or revision.');
    const recordRef=ref(rtdb,`${recordsPath}/${id}`);
    const auditId=push(ref(rtdb,`${recordsPath}/${id}/history`)).key!;
    const at=await databaseTime();
    let failure='Could not save candidate.';
    const result=await recordTransaction(recordRef,(previous:RecordEntry|null)=>{
      try{
        if(data.id&&!previous){failure='Candidate no longer exists. Reload the sheet.';return;}
        if(values.assignedTo&&values.assignedTo!==previous?.values.assignedTo&&!assignees.some(person=>person.id===values.assignedTo)){failure='Select an active user with Manage Recruitment Sheet access.';return;}
        if(data.action==='followUp'){values.followUp=user.name;values.lastFollowUpDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
        const saved=saveCandidate(previous,values,Number(data.revision),{id:user.id,name:user.name},id,auditId,at,data.action==='followUp'?'Followed up':undefined,values.assignedTo?(assignees.find(person=>person.id===values.assignedTo)?.name||previous?.assignedToName):'');
        return previous?saved:{...saved,addedOrder:typeof data.addedOrder==='string'&&/^\d{13}-\d{6}$/.test(data.addedOrder)?data.addedOrder:at};
      }catch(error){failure=error instanceof Error?error.message:failure;return;}
    });
    if(!result.committed)throw new Error(failure);
    return {id,record:result.snapshot.val() as RecordEntry} as T;
  };
}
