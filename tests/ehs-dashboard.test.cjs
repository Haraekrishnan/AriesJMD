const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const file=path.resolve(__dirname,'../src/lib/ehs-dashboard.ts');const mod=new Module(file,module);mod.paths=Module._nodeModulePaths(path.dirname(file));
mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
const {dashboardSummary,dashboardCsv}=mod.exports;const now=new Date(2026,8,20,12);
test('selected site and date range apply to incidents and LTI counts',()=>{
 const rows=[{date:'2026-09-01',type:'LTI',projectId:'a'},{date:'2026-08-01',type:'Near Miss',projectId:'a'},{date:'2026-09-01',type:'LTI',projectId:'b'},{date:'2026-01-01',type:'LTI',projectId:'a'},{date:'2026-09-25',type:'LTI',projectId:'a'}];
 const s=dashboardSummary(rows,[],[],'a','six-months',now);assert.equal(s.incidents,2);assert.equal(s.ltis,1);assert.equal(s.months.length,6);assert.equal(s.months[0].month,'Apr');assert.equal(s.months[5].incidents,1);
});
test('audit averages include valid approved audits only and keep missing months null',()=>{
 const rows=[{date:'2026-08-02',projectId:'a',status:'Approved',score:80},{date:'2026-08-03',projectId:'a',status:'Approved',score:100},{date:'2026-08-04',projectId:'a',status:'Rejected',score:30},{date:'2026-08-05',projectId:'a',status:'Approved',score:200}];
 const s=dashboardSummary([],rows,[],'all','six-months',now);assert.equal(s.auditScore,90);assert.equal(s.auditCount,2);assert.equal(s.months[4].auditScore,90);assert.equal(s.months[0].auditScore,null);
});
test('training reports sessions without invented hours or site allocation',()=>{
 const rows=[{date:'2026-09-01'},{date:'2026-10-01'},{date:'invalid'}];
 assert.equal(dashboardSummary([],[],rows,'all','six-months',now).trainingSessions,1);
 assert.equal(dashboardSummary([],[],rows,'a','six-months',now).trainingSessions,null);
});
test('year boundary and this-year ranges use calendar months',()=>{
 const date=new Date(2026,1,10,12);const six=dashboardSummary([],[],[],'all','six-months',date);
 assert.equal(six.months[0].key,'2025-09');assert.equal(six.months[5].key,'2026-02');
 assert.equal(dashboardSummary([],[],[],'all','this-year',date).months.length,2);
 assert.equal(dashboardSummary([],[],[],'all','twelve-months',date).months.length,12);
});
test('empty metrics and CSV distinguish missing audit scores from zero',()=>{
 const s=dashboardSummary([],[],[],'all','six-months',now);assert.equal(s.auditScore,null);assert.equal(s.incidents,0);
 assert.equal(dashboardCsv(s).split('\r\n').length,7);assert.ok(dashboardCsv(s).includes('2026-04,0,,0'));
});
