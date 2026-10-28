'use client';
import {get, onValue, push, ref, runTransaction} from 'firebase/database';
import {rtdb} from '@/lib/rtdb';
import type {User} from '@/lib/types';
import {fields, saveCandidate, isCandidateLocked, changeCandidateLock, validateCandidate, type RecordEntry} from './model';
export type RecruitmentPermissions={view:boolean;manage:boolean};
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
    if(data.action==='saveLayout'){
      if(!manage)throw Error('Manage Recruitment Sheet permission is required to save shared columns.');
      const extraColumns=validateColumns(data.extraColumns);if(!Number.isInteger(data.revision))throw Error('Invalid layout revision.');
      const at=await databaseTime();let failure='Could not save columns.';
      const result=await recordTransaction(ref(rtdb,layoutPath),(previous:SharedLayout|null)=>{if((previous?.revision||0)!==data.revision){failure='Someone saved a newer layout. Use saved layout before saving your changes.';return;}return {extraColumns,revision:(previous?.revision||0)+1,updatedBy:user.id,updatedByName:user.name,updatedAt:at};});
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
        return saveCandidate(previous,values,Number(data.revision),{id:user.id,name:user.name},id,auditId,at,data.action==='followUp'?'Followed up':undefined,values.assignedTo?(assignees.find(person=>person.id===values.assignedTo)?.name||previous?.assignedToName):'');
      }catch(error){failure=error instanceof Error?error.message:failure;return;}
    });
    if(!result.committed)throw new Error(failure);
    return {id,record:result.snapshot.val() as RecordEntry} as T;
  };
}
