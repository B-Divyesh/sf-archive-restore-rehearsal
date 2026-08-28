# Archive Restore Rehearsal — independent verification handoff

## Status: FAIL

Candidate `024a7ad29e6353afa5f2317e16fd31c023abdf07` was independently tested on
2026-08-28 at <https://archive-restore-rehearsal.sociobot.in>. The live HTML,
JS, CSS, artwork, service worker, manifest, privacy page, and terms page are
byte-identical to the candidate production build. This is not a deployment-only
failure.

Full evidence and reproduction details are in the
[verification report](verification.md).

## Release blockers

- `.factory/claims.json` is missing; no claim tests exist, while the product
  and README make many privacy/offline/feature claims.
- There is no one-click sample-data demo, isolated demo namespace,
  `.factory/demo.md`, demo banner, or reset/start-real path. `/demo` and
  `?demo=1` open the real empty app/database.
- The cold first screen does not plainly name its audience, and its first
  action is below both the 1440 × 1000 and 390 × 844 viewports.
- A structurally invalid but top-level-valid import clears the existing
  IndexedDB map before failing, causing confirmed data loss after reload.
- The Firefox/Safari directory-upload fallback can catalogue but cannot
  reconnect/open/hash-check a sampled file.
- Axe finds serious ARIA and non-focusable-scroll-region violations in the
  live drill and mobile evidence views. Escape/close dialog focus behavior is
  also broken.
- Workspace views do not change history/URL/title and cannot be deep-linked or
  restored with back/forward.
- Required CSP/deployment config, discovery metadata, designed 404, consistent
  legal-page skeleton, copy audit, and build identity are absent.

## Verification summary

```sh
npm ci
npm test
npm run build
npm audit --audit-level=moderate
```

- `npm test`: PASS — 5 unit tests and 10 Playwright scenarios.
- `npm run build`: PASS — TypeScript and Vite; `dist/index.html` present.
- Audit: PASS — zero vulnerabilities.
- Build budget: PASS — 39.99 KB JS raw (14.29 KB gzip), 18.19 KB CSS raw
  (4.72 KB gzip), 126.5 KB hero, no fonts.
- Lighthouse mobile: 99 performance, 100 accessibility, 100 best practices,
  100 SEO; FCP 0.96 s, LCP 1.736 s, TBT 72 ms, CLS 0.
- Normal Chromium flow: PASS — hash, persistence, reopen, match, evidence,
  print, JSON export/import, and full offline drill/export.
- Privacy: PASS for ordinary use — only same-origin requests; no analytics,
  remote fonts, or third-party scripts.
- Billing: PASS — production verify and checkout respond correctly.
- Rate limiting: PASS — a 120-request burst produced 30 × 200 and 90 × 429;
  every 429 had `Retry-After: 4`.
- PWA root reload/update: PASS — offline reload works, and an induced service
  worker update shows the update-ready toast.

## Next step

Do not release this candidate. Address every blocker above, add the mandatory
claims/demo artifacts and tests, then request fresh independent verification.
