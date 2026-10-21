'use client';
import {get, onValue, push, ref, runTransaction} from 'firebase/database';
import {rtdb} from '@/lib/rtdb';
import type {User} from '@/lib/types';
import {saveCandidate, validateCandidate, type RecordEntry} from './model';
export type RecruitmentPermissions={view:boolean;manage:boolean};
const recordsPath='privateRecruitment/records';
// .info is local SDK metadata: get() sends an unsupported server path.
const databaseTime=()=>new Promise<string>((resolve,reject)=>{
  onValue(ref(rtdb,'.info/serverTimeOffset'),snapshot=>{
    const offset=snapshot.val();
    resolve(new Date(Date.now()+(typeof offset==='number'?offset:0)).toISOString());
  },reject,{onlyOnce:true});
});
export function createRecruitmentClient(user:User,permissions:RecruitmentPermissions){
  return async function recruitmentCall<T>(data:Record<string,unknown>):Promise<T>{
    const active=user.status!=='locked'&&user.status!=='deactivated';
    const manage=active&&(user.role==='Admin'||permissions.manage);
    const view=active&&(manage||permissions.view);
    if(data.action==='session')return {view,manage,name:user.name} as T;
    if(!view)throw new Error('View Recruitment Sheet permission is required.');
    if(data.action==='list'){
      const snapshot=await get(ref(rtdb,recordsPath));
      return Object.values(snapshot.val()||{}).filter(entry=>!(entry as RecordEntry).deletedAt).map(entry=>{const {history,...record}=entry as RecordEntry;return record;}) as T;
    }
    if(data.action==='history'){
      if(typeof data.id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(data.id))throw new Error('Invalid candidate.');
      const snapshot=await get(ref(rtdb,`${recordsPath}/${data.id}/history`));
      return Object.values(snapshot.val()||{}).sort((a,b)=>(a as {at:string}).at.localeCompare((b as {at:string}).at)) as T;
    }
    if(data.action==='delete'){
      if(user.role!=='Admin')throw new Error('Only Admin can delete recruitment rows.');
      if(typeof data.id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(data.id)||!Number.isInteger(data.revision))throw new Error('Invalid candidate or revision.');
      const recordRef=ref(rtdb,recordsPath+'/'+data.id);await get(recordRef);
      const auditId=push(ref(rtdb,recordsPath+'/'+data.id+'/history')).key!;
      const at=await databaseTime();
      let failure='Candidate no longer exists.';
      const result=await runTransaction(recordRef,(previous:RecordEntry|null)=>{
        if(!previous||previous.deletedAt)return;
        if(previous.revision!==data.revision){failure='This candidate was changed by another user. Refresh before deleting.';return;}
        return {...previous,deletedAt:at,deletedBy:user.id,deletedByName:user.name,updatedAt:at,updatedBy:user.id,updatedByName:user.name,revision:previous.revision+1,history:{...previous.history,[auditId]:{id:auditId,action:'Deleted',actorId:user.id,actorName:user.name,at,changes:{deleted:{before:'No',after:'Yes'}}}}};
      },{applyLocally:false});
      if(!result.committed)throw new Error(failure);
      return {id:data.id} as T;
    }
    if(data.action!=='save')throw new Error('Unknown recruitment action.');
    if(!manage)throw new Error('Manage Recruitment Sheet permission is required.');
    const values=validateCandidate(data.values);
    const id=data.id||push(ref(rtdb,recordsPath)).key;
    if(typeof id!=='string'||!/^[-A-Za-z0-9_]{1,128}$/.test(id)||!Number.isInteger(data.revision)||Number(data.revision)<0)throw new Error('Invalid candidate or revision.');
    const recordRef=ref(rtdb,`${recordsPath}/${id}`);
    // Prime the cache so an existing candidate is not mistaken for a missing one.
    await get(recordRef);
    const auditId=push(ref(rtdb,`${recordsPath}/${id}/history`)).key!;
    const at=await databaseTime();
    let failure='Could not save candidate.';
    const result=await runTransaction(recordRef,(previous:RecordEntry|null)=>{
      try{
        if(data.id&&!previous){failure='Candidate no longer exists. Reload the sheet.';return;}
        return saveCandidate(previous,values,Number(data.revision),{id:user.id,name:user.name},id,auditId,at);
      }catch(error){failure=error instanceof Error?error.message:failure;return;}
    },{applyLocally:false});
    if(!result.committed)throw new Error(failure);
    return {id,record:result.snapshot.val() as RecordEntry} as T;
  };
}
