export const fields = ["name", "contact", "designation", "age", "experience", "salary", "allowance", "documents", "remark", "followUp", "followUpDate", "status", "travelDate", "travelNote", "stage", "lastFollowUpDate", "followUpOutcome", "followUpChannel", "followUpNote", "assignedTo"] as const;
export type Field = typeof fields[number] | `custom_${string}`;
export type Candidate = Record<Field, string>;
export type Audit = {id:string;action:string;actorId:string;actorName:string;at:string;changes:Record<string, {before:string;after:string}>};
export type CellFormat={color?:string;backgroundColor?:string};
export type RecordEntry = {addedOrder?:string;formatting?:Record<string,CellFormat>;finalizedUnlocked?:boolean;unlockedBy?:string;unlockedByName?:string;unlockedAt?:string;assignedToName?:string;assignedBy?:string;assignedByName?:string;assignedAt?:string;completedBy?:string;completedByName?:string;completedAt?:string;deletedAt?:string;deletedBy?:string;deletedByName?:string;id:string;values:Candidate;revision:number;createdBy:string;createdByName:string;createdAt:string;updatedBy:string;updatedByName:string;updatedAt:string;history:Record<string, Audit>};
export const isCandidateLocked=(record?:RecordEntry|null)=>record?.values.stage==='Finalized'&&record.finalizedUnlocked!==true;
/**
 * Validate and whitelist editable sheet values before persistence.
 * @param {unknown} input Untrusted request fields.
 * @return {Candidate} Validated candidate fields.
 */
export function validateCandidate(input:unknown):Candidate {
  if (!input||typeof input!=="object"||Array.isArray(input)) throw Error("Invalid candidate."); const data=input as Record<string, unknown>; const out={} as Candidate; for (const key of fields) {
    if (["lastFollowUpDate","followUpOutcome","followUpChannel","followUpNote","assignedTo"].includes(key)&&data[key]===undefined) {out[key]="";continue;}
    if (typeof data[key]!=="string") throw Error("Invalid field: "+key); out[key]=(data[key] as string).trim(); if (out[key].length>(["remark", "travelNote", "followUpNote"].includes(key)?4000:200)) throw Error(key+" is too long.");
  } if (!out.name) throw Error("Candidate name is required."); if (!out.stage||out.stage.length>31||/[.\/$#\[\]:*?\\]/.test(out.stage)) throw Error("Invalid recruitment stage."); if (out.age&&(!/^\d+$/.test(out.age)||Number(out.age)>120)) throw Error("Enter a valid age."); if (out.salary&&(!/^\d+(\.\d{1,2})?$/.test(out.salary)||Number(out.salary)>100000000)) throw Error("Enter a valid salary."); for (const key of ["travelDate", "followUpDate", "lastFollowUpDate"] as const) {
    if (out[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(out[key])||Number.isNaN(Date.parse(out[key]))||new Date(out[key]).toISOString().slice(0, 10)!==out[key])) throw Error("Invalid "+key);
  } for(const key of Object.keys(data).filter(k=>/^custom_[A-Za-z0-9_-]+$/.test(k))){if(typeof data[key]!=="string"||(data[key] as string).length>4000)throw Error("Invalid custom value.");out[key as Field]=data[key] as string;} return out;
}
/**
 * Apply a version-checked change and append its audit entry.
 * @param {RecordEntry|null} previous Existing record or null for creation.
 * @param {Candidate} values Validated input fields.
 * @param {number} revision Version observed by the editor.
 * @param {object} actor Current portal account.
 * @param {string} id Candidate identifier.
 * @param {string} auditId Unique audit identifier.
 * @param {string} at Database-clock-adjusted timestamp.
 * @return {RecordEntry} Updated record with complete audit history.
 */
export function saveCandidate(previous:RecordEntry|null, values:Candidate, revision:number, actor:{id:string;name:string}, id:string, auditId:string, at:string, action?:string, assigneeName?:string):RecordEntry {
  if (previous?.deletedAt) throw Error('This candidate has been deleted. Reload the sheet.');
  if ((previous?.revision||0)!==revision) throw Error("This candidate was changed by another user. Reload and try again."); if(isCandidateLocked(previous))throw Error("This finalized candidate is locked. Ask an Admin to unlock this row."); const changes:Audit["changes"]={}; for (const key of new Set([...fields,...Object.keys(values),...Object.keys(previous?.values||{})]) as Set<Field>) {
    const before=previous?.values[key]||""; if (before!==values[key])changes[key]={before, after: values[key]};
  } if(values.stage==='Finalized'&&previous?.values.stage!=='Finalized')changes.lock={before:'Unlocked',after:'Locked'}; if(action){for(const key of ["lastFollowUpDate","followUp","followUpOutcome","followUpChannel","followUpNote"] as const){if(!changes[key])changes[key]={before:previous?.values[key]||"",after:values[key]||""};}} if (previous&&!Object.keys(changes).length&&!action) return previous; const assignmentChanged=(previous?.values.assignedTo||"")!==(values.assignedTo||""); if(assignmentChanged)changes.assignedTo={before:previous?.assignedToName||previous?.values.assignedTo||"Unassigned",after:assigneeName||values.assignedTo||"Unassigned"}; const audit={id: auditId, action: action||(assignmentChanged?(values.assignedTo?"Assigned":"Unassigned"):(previous?"Updated":"Created")), actorId: actor.id, actorName: actor.name, at, changes}; return {...previous,finalizedUnlocked:values.stage==='Finalized'&&previous?.values.stage==='Finalized'&&previous.finalizedUnlocked===true,...(assignmentChanged?{assignedToName:assigneeName||values.assignedTo||"",assignedBy:actor.id,assignedByName:actor.name,assignedAt:at}:{}),...(action==="Followed up"?{completedBy:actor.id,completedByName:actor.name,completedAt:at}:{}),id, values, revision: revision+1, createdBy: previous?.createdBy||actor.id, createdByName: previous?.createdByName||actor.name, createdAt: previous?.createdAt||at, updatedBy: actor.id, updatedByName: actor.name, updatedAt: at, history: {...previous?.history, [auditId]: audit}};
}

export function changeCandidateLock(previous:RecordEntry|null,revision:number,actor:{id:string;name:string;role:string},unlock:boolean,auditId:string,at:string):RecordEntry{
 if(actor.role!=='Admin')throw Error('Only Admin can unlock or lock finalized candidates.');
 if(!previous||previous.deletedAt)throw Error('Candidate no longer exists.');
 if(previous.revision!==revision)throw Error('This candidate was changed by another user. Refresh and try again.');
 if(previous.values.stage!=='Finalized')throw Error('Only finalized candidates can be unlocked or locked.');
 if(isCandidateLocked(previous)!==unlock)throw Error(unlock?'Candidate is already unlocked.':'Candidate is already locked.');
 return {...previous,finalizedUnlocked:unlock,...(unlock?{unlockedBy:actor.id,unlockedByName:actor.name,unlockedAt:at}:{}),revision:revision+1,updatedBy:actor.id,updatedByName:actor.name,updatedAt:at,history:{...previous.history,[auditId]:{id:auditId,action:unlock?'Unlocked':'Locked',actorId:actor.id,actorName:actor.name,at,changes:{lock:{before:unlock?'Locked':'Unlocked',after:unlock?'Unlocked':'Locked'}}}}};
}
