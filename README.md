# Mibbi public status

Only these public files are copied to the separate public `PhillipTheGenius/mibbi-status` repository. Never copy the Mibbi application checkout, environment files, internal audit reports or customer data there.

Publish index.html, monitor.mjs, this README, an empty .nojekyll, status.json and history.json. Install monitor.yml as .github/workflows/monitor.yml in that repository. GitHub Pages serves main at /. The monitor uses no account credentials for Mibbi, makes no purchases or AI calls, and stores only allowlisted check metadata. The workflow token can write only this status repository.

Failure causes a failed Actions run after writing results. GitHub email delivery is controlled by the owner's notification settings; a failed job is not proof that someone received an alert. Results older than 25 minutes show as stale, including when schedules stop. GitHub schedules can be delayed. This is not 24/7 staffed incident response or a contractual uptime promise.

Run `node monitor.mjs` from this directory for a real read-only check. A nonzero exit means a check failed. Do not change a failed result into a passing one. Only test outage transitions with injected fictional responses in the unit tests; do not take production offline.
