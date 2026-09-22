const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'),
  path = require('path'),
  ts = require('typescript');
require.extensions['.ts'] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    file,
  );
const {
  transitionCase,
  validateHandoff,
} = require('../src/lib/capa-handoff.ts');
const stages = [
  'Initiation',
  'Investigation',
  'Resolution',
  'Implementation',
  'Effectiveness Review',
  'Reference',
  'Closure',
];
const now = new Date('2026-09-21T10:00:00Z');
const owner = { id: 'worker', name: 'Owner', role: 'Team Member' },
  supervisor = { id: 'reviewer', name: 'Reviewer', role: 'Admin' },
  other = { id: 'next', name: 'Next owner', role: 'Team Member' };
const users = [
  owner,
  supervisor,
  other,
  { id: 'inactive', name: 'Old user', role: 'Admin', status: 'deactivated' },
];
const handoff = { assigneeId: 'next', targetDate: '2026-09-22T10:00:00.000Z' };
const review = { ...handoff, assigneeId: 'reviewer' };
const {REQUIRED_STAGE_FIELDS}=require('../src/lib/capa-workflow.ts');
const validData=stage=>({...Object.fromEntries(Object.keys(REQUIRED_STAGE_FIELDS[stage]||{}).map(k=>[k,'Completed finding'])),whenDate:'2026-09-21',whenTime:'10:00',verdict:'Effective'});
const obs = (stage, status = 'In Progress') => ({
  id: 'case',
  status: 'Open',
  currentStage: stage,
  stages: Object.fromEntries(
    stages.map((s) => [
      s,
      {
        status: s === stage ? status : 'Pending',
        assigneeId: 'worker',
        data: { ...validData(s), existing: true },
      },
    ]),
  ),
});
test('every phase approval assigns the selected next owner and exact deadline', () => {
  for (const stage of stages.slice(0, -1)) {
    const input = obs(stage);
    const before = JSON.stringify(input);
    const result = transitionCase(
      input,
      stage,
      supervisor,
      users,
      'approve',
      handoff,
      undefined,
      'Approved',
      now,
      'event',
    );
    const next = stages[stages.indexOf(stage) + 1];
    assert.equal(result.currentStage, next);
    assert.equal(result.stages[stage].status, 'Completed');
    assert.equal(result.stages[next].assigneeId, 'next');
    assert.equal(result.stages[next].targetDate, handoff.targetDate);
    assert.match(result.activities.event.action, /Next owner/);
    assert.equal(JSON.stringify(input), before);
  }
});
test('missing, inactive, past, invalid and non-supervisor review assignments are rejected', () => {
  for (const h of [
    undefined,
    { ...handoff, assigneeId: '' },
    { ...handoff, assigneeId: 'inactive' },
    { ...handoff, targetDate: 'invalid' },
    { ...handoff, targetDate: '2026-09-20' },
  ])
    assert.throws(() => validateHandoff(h, users, false, now));
  assert.throws(() => validateHandoff(handoff, users, true, now));
  assert.throws(() =>
    transitionCase(
      obs('Implementation'),
      'Implementation',
      supervisor,
      users,
      'approve',
      undefined,
      undefined,
      '',
      now,
      'event',
    ),
  );
});
test('submission assigns a reviewer without advancing the phase', () => {
  const result = transitionCase(
    obs('Implementation', 'Pending'),
    'Implementation',
    owner,
    users,
    'submit',
    review,
    { ...validData('Implementation'), finding: 'Saved' },
    '',
    now,
    'event',
  );
  assert.equal(result.currentStage, 'Implementation');
  assert.equal(result.stages.Implementation.status, 'In Progress');
  assert.equal(result.stages.Implementation.reviewAssigneeId, 'reviewer');
  assert.equal(
    result.stages.Implementation.reviewTargetDate,
    review.targetDate,
  );
  assert.equal(result.stages.Implementation.data.finding, 'Saved');
});
test('rework stays in phase, assigns owner and deadline and retains findings', () => {
  const result = transitionCase(
    obs('Investigation'),
    'Investigation',
    supervisor,
    users,
    'return',
    handoff,
    undefined,
    'Add evidence',
    now,
    'event',
  );
  assert.equal(result.currentStage, 'Investigation');
  assert.equal(result.stages.Investigation.status, 'Returned');
  assert.equal(result.stages.Investigation.assigneeId, 'next');
  assert.equal(result.stages.Investigation.targetDate, handoff.targetDate);
  assert.equal(result.stages.Investigation.data.existing, true);
  assert.equal(result.reworkCount, 1);
  assert.throws(() =>
    transitionCase(
      obs('Investigation'),
      'Investigation',
      supervisor,
      users,
      'return',
      handoff,
      undefined,
      ' ',
      now,
      'event',
    ),
  );
});
test('Closure draft cannot close case; confirmed closure has no next assignment', () => {
  const input = obs('Closure', 'Pending');
  const draft = transitionCase(
    input,
    'Closure',
    owner,
    users,
    'draft',
    undefined,
    { notes: 'Draft' },
    '',
    now,
    'event',
  );
  assert.equal(draft.status, 'Open');
  assert.equal(draft.stages.Closure.status, 'Pending');
  assert.equal(draft.closedAt, undefined);
  const closed = transitionCase(
    input,
    'Closure',
    owner,
    users,
    'submit',
    undefined,
    { finalSummary: 'Final declaration' },
    '',
    now,
    'event',
  );
  assert.equal(closed.status, 'Closed');
  assert.equal(closed.stages.Closure.status, 'Completed');
  assert.equal(closed.closedAt, now.toISOString());
});
test('unauthorized and stale transitions are rejected', () => {
  assert.throws(() =>
    transitionCase(
      obs('Investigation'),
      'Investigation',
      owner,
      users,
      'approve',
      handoff,
      undefined,
      '',
      now,
      'event',
    ),
  );
  assert.throws(() =>
    transitionCase(
      obs('Resolution'),
      'Investigation',
      supervisor,
      users,
      'approve',
      handoff,
      undefined,
      '',
      now,
      'event',
    ),
  );
  assert.throws(() =>
    transitionCase(
      obs('Resolution', 'Pending'),
      'Resolution',
      other,
      users,
      'submit',
      review,
      {},
      '',
      now,
      'event',
    ),
  );
  assert.throws(() =>
    transitionCase(
      obs('Resolution', 'Completed'),
      'Resolution',
      supervisor,
      users,
      'approve',
      handoff,
      undefined,
      '',
      now,
      'event',
    ),
  );
});
