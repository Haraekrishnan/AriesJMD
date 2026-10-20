export const fields = ["name", "contact", "designation", "age", "experience", "salary", "allowance", "documents", "remark", "followUp", "followUpDate", "status", "travelDate", "travelNote", "stage"] as const;
export type Field = typeof fields[number];
export type Candidate = Record<Field, string>;
export type Audit = {id:string;action:string;actorId:string;actorName:string;at:string;changes:Record<string, {before:string;after:string}>};
export type RecordEntry = {id:string;values:Candidate;revision:number;createdBy:string;createdByName:string;createdAt:string;updatedBy:string;updatedByName:string;updatedAt:string;history:Record<string, Audit>};
/**
 * Validate and whitelist editable sheet values before persistence.
 * @param {unknown} input Untrusted request fields.
 * @return {Candidate} Validated candidate fields.
 */
export function validateCandidate(input:unknown):Candidate {
  if (!input||typeof input!=="object"||Array.isArray(input)) throw Error("Invalid candidate."); const data=input as Record<string, unknown>; const out={} as Candidate; for (const key of fields) {
    if (typeof data[key]!=="string") throw Error("Invalid field: "+key); out[key]=(data[key] as string).trim(); if (out[key].length>(["remark", "travelNote"].includes(key)?4000:200)) throw Error(key+" is too long.");
  } if (!out.name) throw Error("Candidate name is required."); if (!["On Going", "Finalized", "Not Interested"].includes(out.stage)) throw Error("Invalid recruitment stage."); if (out.age&&(!/^\d+$/.test(out.age)||Number(out.age)>120)) throw Error("Enter a valid age."); if (out.salary&&(!/^\d+(\.\d{1,2})?$/.test(out.salary)||Number(out.salary)>100000000)) throw Error("Enter a valid salary."); for (const key of ["travelDate", "followUpDate"] as const) {
    if (out[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(out[key])||Number.isNaN(Date.parse(out[key]))||new Date(out[key]).toISOString().slice(0, 10)!==out[key])) throw Error("Invalid "+key);
  } return out;
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
export function saveCandidate(previous:RecordEntry|null, values:Candidate, revision:number, actor:{id:string;name:string}, id:string, auditId:string, at:string):RecordEntry {
  if ((previous?.revision||0)!==revision) throw Error("This candidate was changed by another user. Reload and try again."); const changes:Audit["changes"]={}; for (const key of fields) {
    const before=previous?.values[key]||""; if (before!==values[key])changes[key]={before, after: values[key]};
  } if (previous&&!Object.keys(changes).length) return previous; const audit={id: auditId, action: previous?"Updated":"Created", actorId: actor.id, actorName: actor.name, at, changes}; return {id, values, revision: revision+1, createdBy: previous?.createdBy||actor.id, createdByName: previous?.createdByName||actor.name, createdAt: previous?.createdAt||at, updatedBy: actor.id, updatedByName: actor.name, updatedAt: at, history: {...previous?.history, [auditId]: audit}};
}
