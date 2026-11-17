import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../assets/auth.js', import.meta.url), 'utf8');

async function setup(overrides = {}) {
  const elements = new Map();
  for (const id of ['authForm', 'authStatus', 'authFields', 'authEmail', 'authPassword', 'signInBtn', 'signUpBtn', 'signOutBtn']) {
    elements.set(id, { value: '', style: {}, handlers: {}, setAttribute() {}, addEventListener(event, cb) { this.handlers[event] = cb; }, reportValidity() { return true; } });
  }
  const form = elements.get('authForm');
  form.querySelectorAll = () => [...elements.values()];
  const calls = [];
  const identity = {
    onAuthChange() {}, async handleAuthCallback() { calls.push('callback'); }, async getUser() { return null; },
    async login(email, password) { calls.push({ email, password }); return { email }; },
    async signup() { calls.push('signup'); return { emailVerified: false }; }, async logout() { calls.push('logout'); }, ...overrides
  };
  const run = new Function('document', 'sdk', 'window', `return (async () => { ${source.replace("await import('./netlify-identity.js')", 'sdk')}\nreturn { authenticate }; })()`);
  const api = await run({ getElementById: id => elements.get(id) }, identity, { location: { replace(path) { calls.push({ redirect: path }); } } });
  elements.get('authEmail').value = ' user@example.com ';
  elements.get('authPassword').value = 'example-password';
  return { elements, calls, ...api };
}

test('login trims email, clears password, displays signed in user and signs out', async () => {
  const { elements: e, calls, authenticate } = await setup();
  assert.equal(calls[0], 'callback');
  await authenticate('login');
  assert.equal(calls[1].email, 'user@example.com');
  assert.equal(e.get('authPassword').value, '');
  assert.ok(calls.some(call => call.redirect === '/learning-plan.html'));
  assert.equal(e.get('signOutBtn').hidden, false);
  assert.equal(e.get('authFields').hidden, true);
  await e.get('signOutBtn').handlers.click();
  assert.equal(calls.at(-1), 'logout');
  assert.equal(e.get('signInBtn').hidden, false);
});

test('signup prompts for email confirmation and rejects short passwords', async () => {
  const { elements: e, calls, authenticate } = await setup();
  e.get('authPassword').value = 'short';
  await authenticate('signup');
  assert.equal(calls.includes('signup'), false);
  e.get('authPassword').value = 'example-password';
  await authenticate('signup');
  assert.match(e.get('authStatus').textContent, /رابط التفعيل/);
  assert.equal(e.get('signInBtn').disabled, false);
});

test('invalid credentials display Arabic error and restore buttons', async () => {
  const { elements: e, authenticate } = await setup({ async login() { throw { status: 401 }; } });
  await authenticate('login');
  assert.match(e.get('authStatus').textContent, /غير صحيحة/);
  assert.equal(e.get('signInBtn').disabled, false);
});

test('confirmation callback restores session on page load', async () => {
  const { elements: e } = await setup({ async getUser() { return { email: 'confirmed@example.com' }; } });
  assert.equal(e.get('signOutBtn').hidden, false);
  assert.match(e.get('authStatus').textContent, /confirmed@example.com/);
});
