const site = 'https://mibbi.ai';
const pagesOrigin = 'https://phillipthegenius.github.io';
const retentionMs = 24 * 60 * 60 * 1000;

export const targets = [
  { id: 'website', label: 'Public website', path: '/home', expected: 200 },
  { id: 'signin', label: 'Sign-in page', path: '/login', expected: 200 },
  { id: 'help', label: 'Help centre', path: '/help', expected: 200 },
  { id: 'security', label: 'Security information', path: '/security', expected: 200 },
  { id: 'project-guard', label: 'Signed-out project access check', path: '/api/builder/projects', expected: 401 },
];

export async function probe(target, fetcher = fetch) {
  const start = Date.now();
  let httpStatus = null;

  try {
    const response = await fetcher(site + target.path, {
      // Workers reject the Fetch API's 'error' mode. Read 3xx as failed checks.
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mibbi-Public-Status/1.0' },
    });
    httpStatus = response.status;
    await response.body?.cancel();
    return { id: target.id, label: target.label, ok: httpStatus === target.expected, httpStatus, durationMs: Date.now() - start };
  } catch {
    return { id: target.id, label: target.label, ok: false, httpStatus, durationMs: Date.now() - start };
  }
}

export async function collectReport(fetcher = fetch) {
  const checks = await Promise.all(targets.map(async target => {
    const first = await probe(target, fetcher);
    if (first.ok) return first;
    await new Promise(resolve => setTimeout(resolve, 1500));
    return probe(target, fetcher);
  }));
  return { version: 1, checkedAt: new Date().toISOString(), checks };
}

export default {
  async scheduled(event, env) {
    const scheduledAt = new Date(event.scheduledTime).toISOString();
    const report = { ...await collectReport(), scheduledAt };
    const db = env.STATUS_DB;
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO public_checks (scheduled_at, report) VALUES (?, ?)')
        .bind(event.scheduledTime, JSON.stringify(report)),
      db.prepare('DELETE FROM public_checks WHERE scheduled_at < ?')
        .bind(Date.now() - retentionMs),
    ]);

    const failed = report.checks.filter(check => !check.ok).map(check => check.id);
    console.log(JSON.stringify({ scheduledAt, checkedAt: report.checkedAt, checkCount: report.checks.length, failed }));
    if (failed.length) throw Error('A public availability check failed');
  },

  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const path = new URL(request.url).pathname;
    if (path !== '/status.json' && path !== '/history.json') {
      return new Response(null, { status: 404 });
    }

    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
    const origin = request.headers.get('origin');
    if (origin === pagesOrigin || origin === site) headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
    try {
      const db = env.STATUS_DB;
      let body;
      if (path === '/status.json') {
        const row = await db.prepare('SELECT report FROM public_checks ORDER BY scheduled_at DESC LIMIT 1').first();
        if (!row) return new Response(null, { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' } });
        body = row.report;
      } else {
        const { results } = await db.prepare('SELECT report FROM public_checks ORDER BY scheduled_at DESC LIMIT 12').all();
        body = JSON.stringify(results.map(row => JSON.parse(row.report)));
      }
      return new Response(request.method === 'HEAD' ? null : body, { headers: { ...headers, 'Cache-Control': 'public, max-age=30' } });
    } catch {
      return new Response(null, { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' } });
    }
  },
};
