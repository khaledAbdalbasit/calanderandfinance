import { test } from 'node:test';
import assert from 'node:assert/strict';
import requireLogin, { config } from '../netlify/edge-functions/require-login.ts';

test('protected route pattern covers HTML, pretty URLs, and plan JSON', () => {
  assert.equal(config.path, '/learning-plan*');
});

test('anonymous, invalid, expired, and valid sessions are enforced before serving the plan', async () => {
  const originalFetch = globalThis.fetch;
  const originalNetlify = globalThis.Netlify;
  let cookie;
  let valid = false;
  let served = 0;
  let verified = 0;
  globalThis.Netlify = { context: {
    url: 'https://example.com/learning-plan.html',
    cookies: { get: () => cookie },
  } };
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://example.com/.netlify/identity/user');
    verified++;
    return valid
      ? Response.json({ id: 'test-user', email: 'member@example.com', confirmed_at: '2026-01-01T00:00:00Z' })
      : Response.json({ error: 'Unauthorized' }, { status: 401 });
  };
  const context = { async next() { served++; return new Response('protected plan'); } };
  const request = new Request('https://example.com/learning-plan.html');
  try {
    const anonymous = await requireLogin(request, context);
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.get('Location'), 'https://example.com/index.html');
    assert.equal(served, 0);
    assert.equal(verified, 0);

    cookie = 'invalid-test-session';
    const invalid = await requireLogin(request, context);
    assert.equal(invalid.status, 302);
    assert.equal(served, 0);
    assert.equal(verified, 1);

    cookie = 'expired-test-session';
    const expired = await requireLogin(new Request('https://example.com/learning-plan.json'), context);
    assert.equal(expired.status, 401);
    assert.equal(served, 0);

    valid = true;
    const authorized = await requireLogin(request, context);
    assert.equal(authorized.status, 200);
    assert.equal(await authorized.text(), 'protected plan');
    assert.equal(authorized.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(served, 1);

    globalThis.fetch = async () => { throw new Error('Network unavailable'); };
    const unavailable = await requireLogin(request, context);
    assert.equal(unavailable.status, 302);
    assert.equal(served, 1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Netlify = originalNetlify;
  }
});
