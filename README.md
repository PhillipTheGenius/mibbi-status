# Mibbi public status

Only these public files are copied to the separate public `PhillipTheGenius/mibbi-status` repository. Never copy the Mibbi application checkout, environment files, internal audit reports or customer data there.

GitHub Pages serves main. `status-worker.mjs` is the Cloudflare Worker and shares its probe definitions with the existing GitHub fallback. The monitor uses no account credentials for Mibbi, makes no purchases or AI calls, and stores only the five public check outcomes, timings and HTTP status codes. The GitHub workflow token can write only this status repository.

The always-dark page matches mibbi.ai/status. Its logo and Montserrat font are hosted here so rendering does not depend on the Mibbi application being available. The font's SIL Open Font License is included in assets/FONT-LICENSE.txt. Run `node --test report.test.mjs` to verify report-state handling. Refreshing the page retrieves existing results; it does not start a monitoring run.

The `mibbi-public-status` Worker uses the dedicated D1 database of the same name. Apply `status-schema.sql`, bind it as `STATUS_DB`, and set the Worker Cron Trigger to `*/10 * * * *` UTC. The read-only `/status.json` and `/history.json` endpoints serve recorded results. Cron errors remain visible after the failed result is saved. The database keeps up to one day of results. The page falls back to GitHub when the Worker has no fresh result and shows results older than 25 minutes as stale.

GitHub Actions still writes fallback reports and signals its own failures. GitHub email delivery depends on the owner's notification settings. To verify scheduling, compare the Worker report's `scheduledAt` and `checkedAt` with the live page's displayed check time following an actual Cron invocation.

Run `node --test report.test.mjs status-worker.test.mjs` to test the report and schedule code locally. Run `node monitor.mjs` from a checkout only when you intend to record a real manual fallback report. Test outage transitions with fictional responses instead of taking production offline.
