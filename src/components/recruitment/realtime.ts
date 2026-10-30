'use client';
import {onValue,onDisconnect,push,ref,set,remove,serverTimestamp} from 'firebase/database';
import {rtdb} from '@/lib/rtdb';
import {fields,type RecordEntry} from './model';
export type EditorPresence={userId:string;name:string;candidateId:string;field:string;at:number};
export function connectRecruitment(user:{id:string;name:string},manage:boolean,callbacks:{records:(records:RecordEntry[])=>void;editors:(editors:EditorPresence[])=>void;status:(status:string)=>void}){
 const session=push(ref(rtdb,'privateRecruitment/presence')),sessionId=session.key!;
 let closed=false,connected=false,offset=0,editing={candidateId:'',field:''},lastActivity=0,entries:Record<string,EditorPresence>={};
 const fail=(e:Error)=>callbacks.status('Live connection error: '+e.message);
 const publish=()=>{if(closed||!connected||!manage)return;if(!editing.candidateId||Date.now()-lastActivity>60000){void remove(session).catch(fail);return;}void set(session,{userId:user.id,name:user.name,...editing,at:serverTimestamp()}).catch(fail);};
 const show=()=>{if(!closed)callbacks.editors(Object.entries(entries).filter(([id,p])=>id!==sessionId&&typeof p.at==='number'&&Date.now()+offset-p.at<45000).map(([,p])=>p));};
 const stops=[onValue(ref(rtdb,'.info/serverTimeOffset'),s=>{offset=Number(s.val())||0;}),onValue(ref(rtdb,'.info/connected'),s=>{connected=s.val()===true;callbacks.status(connected?'Live updates connected':'Offline · reconnecting');if(connected&&manage)void onDisconnect(session).remove().then(()=>{if(closed){void remove(session);return;}publish();}).catch(fail);}),onValue(ref(rtdb,'privateRecruitment/records'),s=>{const records=Object.values(s.val()||{}) as RecordEntry[];callbacks.records(records.filter(r=>!r.deletedAt).map(r=>{const {history,...record}=r;const completion=Object.values(history||{}).filter(a=>a.action==='Followed up').sort((a,b)=>b.at.localeCompare(a.at))[0];return {...record,history:{},...(!record.completedAt&&completion?{completedBy:completion.actorId,completedByName:completion.actorName,completedAt:completion.at}:{}),values:{...Object.fromEntries(fields.map(k=>[k,''])),...record.values}};}));},fail),onValue(ref(rtdb,'privateRecruitment/presence'),s=>{entries=s.val()||{};show();},fail)];
 const heartbeat=setInterval(()=>{publish();show();},15000);
 return {editing(candidateId:string,field:string){const changed=editing.candidateId!==candidateId||editing.field!==field||Date.now()-lastActivity>15000;editing={candidateId,field};lastActivity=Date.now();if(changed)publish();},stop(){closed=true;stops.forEach(stop=>stop());clearInterval(heartbeat);if(manage)void remove(session).catch(()=>{});}};
}
