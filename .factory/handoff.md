# Archive Restore Rehearsal — independent QA handoff

## Status: FAIL

Independent verification of candidate
`f82a0ce8b4f92546d48ff0e3cea352811b781edc` against
<https://archive-restore-rehearsal.sociobot.in> failed on 2026-08-28 UTC.
The live deployment matches this candidate byte-for-byte; this is not a
deployment-only failure.

The complete evidence is in `.factory/verification-2.md`.

## Blocking defects

1. Demo navigation changes `/demo` to ordinary `/drill`; reloading then opens
   the real IndexedDB namespace and can reveal a real archive map. Demo mode
   is neither route-persistent nor reliably isolated through a refresh.
2. **Save & leave** writes an incomplete rehearsal but there is no resume path
   after refresh/tab close. It disappears from both Rehearse and Evidence.
3. The declared claims tests pass, but important live/README privacy, local
   storage/no-copy, and browser-support promises have no individual registered
   demo-sandbox test. This is release-blocking under the claims contract.

## What passed

`npm ci`, every exact `.factory/claims.json` command, `npm test` (6 unit and
24 Playwright cases), `npm run build`, and `npm audit --audit-level=moderate`
passed. The build produced `dist/`; current raw/gzip bundle sizes are within
the static budgets. Live basic accessibility, serious/critical axe checks,
keyboard focus, 390 px layout, reduced motion, headers/cache policy, same-origin
demo requests, offline shell reload, and billing verify rate limiting passed.

## Reverify after repair

```sh
npm ci
npm run test:e2e -- --grep @claim:demo-sandbox
npm run test:e2e -- --grep @claim:offline-reload
npm run test:e2e -- --grep @claim:privacy-local
npm test
npm run build
```

Then explicitly exercise `/demo → Rehearse → reload` with a real-map record
present, and save an incomplete rehearsal before refresh and browser restart.
Both must remain in the demo namespace or resume safely, respectively.
