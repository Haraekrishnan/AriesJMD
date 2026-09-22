const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const file=path.resolve(__dirname,'../src/lib/ehs-observations.ts');
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {filterObservations,isObservationOverdue,observationCsv,EMPTY_OBSERVATION_FILTERS,observationText}=mod.exports;
const now=new Date('2026-09-20T12:00:00');
const make=(overrides={})=>({id:'case-EH2URQ',description:'<p>Blocked access</p>',status:'Open',category:'Unsafe Act',severity:'Medium',projectId:'site-a',location:'Kitchen',createdAt:'2026-09-17T10:00:00',currentStage:'Investigation',stages:{Investigation:{assigneeId:'owner'}},...overrides});
const filter=(rows,filters={},tab='all',user='owner')=>filterObservations(rows,{...EMPTY_OBSERVATION_FILTERS,...filters},tab,user,now);
test('search matches readable narrative, case ID and location',()=>{
 for(const search of ['blocked','CAPA-EH2URQ','kitchen'])assert.equal(filter([make()],{search}).length,1);
 assert.equal(filter([make()],{search:'missing'}).length,0);
});
test('high-priority KPI includes both High and Critical',()=>assert.equal(filter([make({severity:'High'}),make({severity:'Critical'}),make()],{risk:'high-priority'}).length,2));
test('active KPI matches the Open and In Progress counts',()=>assert.equal(filter([make(),make({status:'In Progress'}),make({status:'Closed'})],{status:'active'}).length,2));
test('overdue uses end of target day and excludes closed or invalid dates',()=>{
 assert.equal(isObservationOverdue(make({targetDate:'2026-09-19'}),now),true);
 for(const row of [make({targetDate:'2026-09-20'}),make({targetDate:'invalid'}),make({status:'Closed',targetDate:'2026-09-18'}),make()])assert.equal(isObservationOverdue(row,now),false);
 assert.equal(filter([make({targetDate:'2026-09-19'}),make()],{status:'Overdue'}).length,1);
});
test('assignment uses current-stage owner and hides children',()=>{
 const rows=[make(),make({id:'other',stages:{Investigation:{assigneeId:'other'}}}),make({parentId:'parent'})];
 assert.equal(filter(rows,{},'mine').length,1);
 assert.equal(filterObservations(rows,EMPTY_OBSERVATION_FILTERS,'mine',undefined).length,0);
});
test('site, category, exact severity, status and created date combine',()=>assert.equal(filter([make(),make({projectId:'site-b'})],{site:'site-a',category:'Unsafe Act',risk:'Medium',status:'Open',date:new Date('2026-09-17T00:00:00')}).length,1));
test('closed view and latest-first sorting',()=>{
 assert.equal(filter([make(),make({status:'Closed'})],{},'closed').length,1);
 assert.equal(filter([make(),make({id:'new',createdAt:'2026-09-20'})])[0].id,'new');
});
test('CSV quotes multiline fields and neutralizes spreadsheet formulas',()=>{
 const csv=observationCsv([make({description:'=HYPERLINK("bad")',location:'x'})],()=> 'Site, "North"');
 assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
 assert.ok(csv.includes('"Site, ""North"""'));
 assert.equal(csv.split('\r\n').length,2);
});
test('empty narrative and HTML are handled without rendering markup',()=>{
 assert.equal(observationText('<img src="image"><p>A &amp; B</p>'),'A & B');
 assert.equal(observationText(), '');
 assert.equal(filter([],{}).length,0);
});
