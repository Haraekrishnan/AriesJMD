const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs'),ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {REQUIRED_STAGE_FIELDS,validateStageData,workflowStatus,needsAction,reworkNote}=require('../src/lib/capa-workflow.ts');
const {transitionCase,validateHandoff}=require('../src/lib/capa-handoff.ts');
const {capaEmail}=require('../src/lib/capa-email.ts');
const {filterObservations,EMPTY_OBSERVATION_FILTERS}=require('../src/lib/ehs-observations.ts');
const users=[{id:'owner',name:'Owner',role:'Team Member',email:'owner@example.com'},{id:'reviewer',name:'Reviewer',role:'Senior Safety Supervisor',email:'reviewer@example.com'},{id:'pc',name:'Coordinator',role:'Project Coordinator',email:'pc@example.com'},{id:'old',name:'Inactive',role:'Senior Safety Supervisor',email:'old@example.com',status:'deactivated'}];
const now=new Date('2026-09-22T12:00:00Z');
const good=stage=>({...Object.fromEntries(Object.keys(REQUIRED_STAGE_FIELDS[stage]||{}).map(k=>[k,'Finding'])),whenDate:'2026-09-22',whenTime:'12:00',verdict:'Effective'});
const observation=(stage='Investigation')=>({id:'case-123456',reporterId:'pc',status:'Open',projectId:'site',category:'Unsafe Act',severity:'Medium',location:'Workshop',description:'Observation',createdAt:now.toISOString(),currentStage:stage,stages:{[stage]:{status:'Pending',assigneeId:'owner',data:good(stage)}}});
const submit=o=>transitionCase(o,o.currentStage,users[0],users,'submit',{assigneeId:'reviewer',targetDate:'2000-01-01'},o.stages[o.currentStage].data,'',now,'submit');
test('every required field blocks blank and whitespace submission and approval, drafts remain allowed',()=>{
 for(const [stage,fields] of Object.entries(REQUIRED_STAGE_FIELDS))for(const field of Object.keys(fields)){
  const o=observation(stage);o.stages[stage].data[field]='   ';
  assert.throws(()=>submit(o),/required fields/);
  assert.doesNotThrow(()=>transitionCase(o,stage,users[0],users,'draft',undefined,o.stages[stage].data,'',now,'draft'));
  o.stages[stage].status='In Progress';
  assert.throws(()=>transitionCase(o,stage,users[1],users,'approve',{assigneeId:'owner',targetDate:'2026-09-24'},undefined,'',now,'approve'),/required fields/);
 }
});
test('valid stage data passes including hidden investigation tabs; bad dates and verdicts fail',()=>{
 for(const stage of Object.keys(REQUIRED_STAGE_FIELDS))assert.doesNotThrow(()=>validateStageData(stage,good(stage)));
 for(const d of [{...good('Investigation'),whenDate:'2026-02-30'},{...good('Investigation'),whenTime:'27:00'}])assert.throws(()=>validateStageData('Investigation',d));
 assert.throws(()=>validateStageData('Effectiveness Review',{verdict:'unknown',findings:'test'}));
});
test('review deadline ignores manual input and is exactly 24 hours, including resubmission',()=>{
 const o=submit(observation());assert.equal(o.stages.Investigation.reviewTargetDate,'2026-09-23T12:00:00.000Z');
 assert.equal(validateHandoff({assigneeId:'reviewer',targetDate:''},users,true,now).targetDate,'2026-09-23T12:00:00.000Z');
 o.stages.Investigation.status='Returned';assert.equal(submit(o).stages.Investigation.reviewTargetDate,'2026-09-23T12:00:00.000Z');
});
test('action badge moves from owner to reviewer and back on rework; closed cases clear it',()=>{
 const o=observation();assert.equal(needsAction(o,'owner'),true);
 const review=submit(o);assert.equal(needsAction(review,'owner'),false);assert.equal(needsAction(review,'reviewer'),true);assert.equal(workflowStatus(review),'Awaiting review');
 const returned=transitionCase(review,'Investigation',users[1],users,'return',{assigneeId:'owner',targetDate:'2026-09-24'},undefined,'Explain cause\nAttach evidence',now,'return');
 assert.equal(workflowStatus(returned),'Rework required');assert.equal(needsAction(returned,'owner'),true);assert.equal(needsAction(returned,'reviewer'),false);assert.equal(reworkNote(returned.stages.Investigation),'Explain cause\nAttach evidence');
 assert.match(returned.activities.return.action,/Explain cause/);
 returned.status='Closed';assert.equal(needsAction(returned,'owner'),false);
});
test('register filters identify reviews and rework rather than overall Open status',()=>{
 const o=submit(observation());assert.equal(filterObservations([o],EMPTY_OBSERVATION_FILTERS,'review','reviewer').length,1);assert.equal(filterObservations([o],EMPTY_OBSERVATION_FILTERS,'mine','owner').length,0);
 assert.equal(filterObservations([o],{...EMPTY_OBSERVATION_FILTERS,status:'Awaiting review'},'all').length,1);
 o.stages.Investigation.status='Returned';assert.equal(filterObservations([o],{...EMPTY_OBSERVATION_FILTERS,status:'Rework required'},'all').length,1);
});
test('mail includes required roles, assignee and reporter once, excludes inactive users and escapes content',()=>{
 const o=observation();o.description='<p>Finding & details</p>';
 const mail=capaEmail(o,users,'created','Site <north>','https://portal.example');
 assert.deepEqual(mail.to.sort(),['owner@example.com','pc@example.com','reviewer@example.com']);assert.match(mail.htmlBody,/Site &lt;north&gt;/);assert.match(mail.htmlBody,/case=case-123456/);
 const reviewed=submit(o);reviewed.stages.Investigation.status='Returned';reviewed.stages.Investigation.reworkReason='<script>alert(1)</script>';
 const rework=capaEmail(reviewed,users,'returned','Site','https://portal.example');assert.match(rework.htmlBody,/&lt;script&gt;/);assert.ok(!rework.htmlBody.includes('<script>'));
});
