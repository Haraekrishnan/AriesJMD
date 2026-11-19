const {test} = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');
const context = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/vehicle-usage-summary/safe-save.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, context);
const {usageSnapshot, prepareUsageSave} = context.exports;
const record = {days:{1:{startKm:100,endKm:150}},lastUpdated:'first'};
test('loaded log saves and retains the previous version',()=>{
 const next = prepareUsageSave(record,usageSnapshot(record),{days:{1:{startKm:100,endKm:175}}},'user','second');
 assert.equal(next.days[1].endKm,175); assert.equal(next._previousVersion.days[1].endKm,150);assert.equal(next.lastUpdatedById,'user');
});
test('stale or unloaded sheets cannot overwrite current data',()=>{
 assert.throws(()=>prepareUsageSave(record,usageSnapshot(null),{days:{}},'user','second'),/changed/);
 assert.throws(()=>prepareUsageSave({...record,lastUpdated:'someone else'},usageSnapshot(record),record,'user','second'),/changed/);
});
test('an empty sheet cannot clear saved readings',()=>assert.throws(()=>prepareUsageSave(record,usageSnapshot(record),{days:{1:{startKm:0,endKm:0}}},'user','second'),/empty sheet/));
test('a newly locked sheet cannot be saved',()=>assert.throws(()=>prepareUsageSave({...record,isLocked:true},usageSnapshot(record),record,'user','second'),/locked/));
test('new records are supported and array/object day representation is equivalent',()=>{
 assert.equal(prepareUsageSave(null,usageSnapshot(null),record,'user','now').days[1].endKm,150);
 assert.equal(usageSnapshot({days:[null,{endKm:150,startKm:100}]}),usageSnapshot({days:{1:{startKm:100,endKm:150}}}));
});
test('previous versions do not recursively grow or affect conflict comparisons',()=>{
 const existing={...record,_previousVersion:{days:{},_previousVersion:{days:{}}}};
 assert.equal(usageSnapshot(existing),usageSnapshot(record));
 assert.equal(prepareUsageSave(existing,usageSnapshot(record),record,'user','now')._previousVersion._previousVersion,undefined);
});
