import {createHash, randomUUID, timingSafeEqual} from "node:crypto";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getDatabase} from "firebase-admin/database";
import {validateCandidate, saveCandidate, RecordEntry} from "./recruitment-core";
if (!getApps().length) initializeApp();
type PortalUser={name?:string;password?:string;role?:string;status?:string};
type PortalRole={name:string;permissions?:string[]};
type Store={records?:Record<string, RecordEntry>};
export const recruitment=onCall({region: "asia-south1", maxInstances: 10}, async (request)=>{
  const input=request.data||{};
  const session=input.portalSession;
  if (!session||typeof session.userId!=="string"||!/^[-A-Za-z0-9_]{1,128}$/.test(session.userId)||typeof session.password!=="string"||!session.password) {
    throw new HttpsError("unauthenticated", "Please sign in to the portal again.");
  }
  const db=getDatabase();
  const [userSnapshot, rolesSnapshot]=await Promise.all([db.ref("users/"+session.userId).get(), db.ref("roles").get()]);
  const user:PortalUser|null=userSnapshot.val();
  if (!user||!user.password||!timingSafeEqual(createHash("sha256").update(session.password).digest(), createHash("sha256").update(user.password).digest())||user.status==="locked"||user.status==="deactivated") {
    throw new HttpsError("unauthenticated", "Your portal session is no longer valid. Please sign in again.");
  }
  const roles=Object.values(rolesSnapshot.val()||{}) as PortalRole[];
  const assigned=roles.find((role)=>role.name===user.role)?.permissions||[];
  const manage=user.role==="Admin"||assigned.includes("manage_recruitment_sheet");
  const view=manage||assigned.includes("view_recruitment_sheet");
  const actor={id: session.userId, name: user.name||session.userId};
  if (input.action==="session") return {view, manage, name: actor.name};
  if (!view) throw new HttpsError("permission-denied", "View Recruitment Sheet permission is required.");
  const storeRef=db.ref("privateRecruitment");
  if (input.action==="list"||input.action==="history") {
    const store:Store=(await storeRef.get()).val()||{};
    if (input.action==="history") return Object.values(store.records?.[String(input.id||"")]?.history||{}).sort((a, b)=>a.at.localeCompare(b.at));
    return Object.values(store.records||{}).map((entry)=>{
      const {history: _history, ...record}=entry; void _history; return record;
    });
  }
  if (input.action!=="save") throw new HttpsError("invalid-argument", "Manage recruitment permissions in Account > Roles & permissions.");
  if (!manage) throw new HttpsError("permission-denied", "Manage Recruitment Sheet permission is required.");
  let values;
  try {
    values=validateCandidate(input.values);
  } catch (e) {
    throw new HttpsError("invalid-argument", (e as Error).message);
  }
  const id=input.id||randomUUID();
  if (typeof id!=="string"||!/^[-A-Za-z0-9_]{1,100}$/.test(id)||!Number.isInteger(input.revision)||input.revision<0) throw new HttpsError("invalid-argument", "Invalid record or revision.");
  const auditId=randomUUID(); const at=new Date().toISOString(); let failure="Unable to save.";
  const result=await storeRef.child("records/"+id).transaction((previous:RecordEntry|null)=>{
    try {
      if (input.id&&!previous) {
        failure="Candidate no longer exists."; return;
      }
      return saveCandidate(previous, values, input.revision, actor, id, auditId, at);
    } catch (e) {
      failure=(e as Error).message; return;
    }
  });
  if (!result.committed) throw new HttpsError("aborted", failure);
  return {id};
});
