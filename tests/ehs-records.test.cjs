const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  Module = require('node:module'),
  ts = require('typescript');
const file = path.resolve(__dirname, '../src/lib/ehs-records.ts');
const mod = new Module(file, module);
mod.paths = Module._nodeModulePaths(path.dirname(file));
mod._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  file,
);
const { recordsCsv, safeDocumentUrl, caseDocuments, displayDate } = mod.exports;
test('CSV preserves multiline text and quotes and prevents formula execution', () => {
  assert.equal(
    recordsCsv([
      ['a,b', 'Say "hello"', 'line\nbreak', '=SUM(A1)', '  +cmd', '@name'],
    ]),
    '"a,b","Say ""hello""","line\nbreak","\'=SUM(A1)","\'  +cmd","\'@name"',
  );
});
test('document links reject executable and malformed URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<script>',
    'file:///private',
    'not a URL',
  ])
    assert.equal(safeDocumentUrl(url), null);
  assert.equal(
    safeDocumentUrl('https://example.com/document.pdf'),
    'https://example.com/document.pdf',
  );
});
test('document index tolerates absent stage data and retains case and site provenance', () => {
  const a = {
    id: 'one',
    name: 'Evidence.pdf',
    url: 'https://example.com/a',
    uploadedAt: '2026-09-17',
    uploadedBy: 'user',
  };
  const input = [
    {
      id: 'case-a',
      projectId: 'site-a',
      stages: { Initiation: {}, Investigation: { attachments: { one: a } } },
    },
    { id: 'empty', stages: {} },
    { id: 'missing' },
    {
      id: 'case-b',
      projectId: 'site-b',
      stages: {
        Resolution: {
          attachments: { one: { ...a, uploadedAt: '2026-09-18' } },
        },
      },
    },
  ];
  const before = JSON.stringify(input);
  const docs = caseDocuments(input);
  assert.equal(docs.length, 2);
  assert.equal(docs[0].caseId, 'case-b');
  assert.equal(docs[1].projectId, 'site-a');
  assert.notEqual(docs[0].key, docs[1].key);
  assert.equal(JSON.stringify(input), before);
});
test('invalid and missing dates display an explicit fallback', () => {
  assert.equal(displayDate(), 'Not recorded');
  assert.equal(displayDate('bad-date'), 'Not recorded');
  assert.equal(displayDate('2026-09-17'), '17 Sep 2026');
});
