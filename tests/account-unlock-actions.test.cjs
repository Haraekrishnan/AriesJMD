const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup(user, requests) {
  const writes = [], logs = [];
  const source = fs.readFileSync('src/contexts/auth-provider.tsx', 'utf8');
  const block = source.slice(source.indexOf('  const requestUnlock ='), source.indexOf('  const addUser ='));
  const context = { user, can: { manage_user_lock_status: false }, rtdb: {},
    useCallback: fn => fn, ref: (_, path) => path, query: (...args) => args, orderByChild: x => x, equalTo: x => x,
    get: async path => { const value = Array.isArray(path) ? Object.fromEntries(Object.entries(requests).filter(([, r]) => r.userId === path[2])) : requests[path.split('/')[1]]; return { exists: () => !!value, val: () => value }; },
    update: async (path, value) => writes.push({ path, value }), push: () => 'new-request', set: async (path, value) => writes.push({ path, value }), addActivityLog: (...args) => logs.push(args)
  };
  vm.createContext(context);
  vm.runInContext(ts.transpile(block + '\nthis.actions = { requestUnlock, resolveUnlockRequest, cancelUnlockRequest };'), context);
  return { ...context.actions, writes, logs };
}
test('cancelling a pending request preserves account lock and logs handler', async () => {
 const app = setup({ id: 'admin', role: 'Admin' }, { a: { userId: 'u', userName: 'User', status: 'pending' } });
 await app.cancelUnlockRequest('a');
 assert.equal(app.writes.length, 1); assert.equal(app.writes[0].path, 'unlockRequests/a');
 assert.equal(app.writes[0].value.status, 'cancelled'); assert.equal(app.writes[0].value.handledBy, 'admin'); assert.equal(app.logs.length, 1);
});
test('unrelated users cannot cancel or resolve another account request', async () => {
 const app = setup({ id: 'other', role: 'Employee' }, { a: { userId: 'u', status: 'pending' } });
 await assert.rejects(app.cancelUnlockRequest('a'), /Permission denied/);
 await assert.rejects(app.resolveUnlockRequest('a', 'u'), /Permission denied/); assert.equal(app.writes.length, 0);
});
test('unlock resolves all pending duplicates in the same atomic write', async () => {
 const app = setup({ id: 'admin', role: 'Admin' }, { a: { userId: 'u', status: 'pending' }, b: { userId: 'u', status: 'pending' }, c: { userId: 'v', status: 'pending' } });
 await app.resolveUnlockRequest('a', 'u'); const write = app.writes[0].value;
 assert.equal(app.writes.length, 1); assert.equal(write['users/u/status'], 'active'); assert.equal(write['unlockRequests/a/status'], 'resolved'); assert.equal(write['unlockRequests/b/status'], 'resolved'); assert.equal(write['unlockRequests/c/status'], undefined);
});
test('existing pending request is reused and requester can cancel their own', async () => {
 const app = setup({ id: 'u', role: 'Employee' }, { a: { userId: 'u', status: 'pending' } });
 await app.requestUnlock('u', 'User'); assert.equal(app.writes.length, 0);
 await app.cancelUnlockRequest('a'); assert.equal(app.writes[0].value.status, 'cancelled');
});
