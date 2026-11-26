import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from './status-worker.mjs';
import { parseReport, state } from './report.mjs';

test('scheduled probes publish ordered, retained receipts and the public endpoint is read-only', async t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(readFileSync(new URL('./status-schema.sql', import.meta.url), 'utf8'));
  const prepare = (sql, args = []) => ({
    bind: (...values) => prepare(sql, values),
    run: () => db.prepare(sql).run(...args),
    first: () => db.prepare(sql).get(...args),
    all: () => ({ results: db.prepare(sql).all(...args) }),
  });
  const env = { STATUS_DB: { prepare, batch: queries => queries.map(query => query.run()) } };
  const requested = [];
  t.mock.method(globalThis, 'fetch', url => {
    requested.push(url);
    return new Response(null, { status: url.endsWith('/api/builder/projects') ? 401 : 200 });
  });
  t.mock.method(console, 'log', () => {});
  const base = 'https://example.test';
  const allowedOrigin = 'https://phillipthegenius.github.io';
  const read = (path, options) => worker.fetch(new Request(base + path, options), env);
  assert.equal((await read('/status.json')).status, 503);
  assert.equal((await read('/unrelated')).status, 404);
  assert.equal((await read('/status.json', { method: 'POST' })).status, 405);
  assert.equal(requested.length, 0);

  const slot = Date.now() - 60000;
  db.prepare('INSERT INTO public_checks VALUES (?, ?)').run(slot - 25 * 60 * 60 * 1000, '{}');
  await worker.scheduled({ scheduledTime: slot }, env);
  const result = await read('/status.json', { headers: { Origin: allowedOrigin } });
  const report = await result.json();
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
  assert.equal(report.scheduledAt, new Date(slot).toISOString());
  assert.equal(state(parseReport(report)), 'ok');
  assert.equal(requested.length, 5);
  assert.ok(requested.every(url => new URL(url).origin === 'https://mibbi.ai'));

  await worker.scheduled({ scheduledTime: slot - 60000 }, env);
  await worker.scheduled({ scheduledTime: slot }, env);
  const history = await (await read('/history.json')).json();
  assert.equal(history.length, 2);
  assert.deepEqual(history[0], report);
  assert.equal(history[1].scheduledAt, new Date(slot - 60000).toISOString());
  const head = await read('/status.json', { method: 'HEAD', headers: { Origin: 'https://other.test' } });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(await head.text(), '');
  assert.equal(requested.length, 15);
});
