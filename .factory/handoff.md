# Archive Restore Rehearsal — repair handoff

## Status

Repaired the independent-verifier release blockers from commit
`0dad1f3ad53f4d5f59f92441d2e0ff082681d1cd`. This remains a Vite + TypeScript,
static, offline PWA with `dist/index.html` at the build root.

## Repairs

- Added `/demo` and `?demo=1`: a one-click Blue family drive sample, a
  persistent reset/start-real banner, and an isolated
  `demo:archive-restore-rehearsal` IndexedDB namespace. Details are in
  `.factory/demo.md`.
- Rewrote the first screen so the audience and first action are visible on
  desktop and 390 px mobile.
- Added full export-schema validation before any IndexedDB mutation and a
  one-transaction replacement import. Invalid structural payloads now leave
  the existing map intact.
- Kept fallback directory-picker `File` references for the active session and
  added a reconnect picker for a specific sample, so Firefox/Safari-style
  selections can complete a file hash/readability check.
- Added path-based workspace URLs (`/`, `/drill`, `/history`, `/settings`),
  browser history restoration, route titles, and focus movement.
- Fixed ARIA progress semantics, made the recovery table scroll region
  keyboard-focusable, corrected native-dialog Escape/return-focus handling,
  and increased footer targets. Axe checks now cover empty, populated drill,
  and evidence views at desktop and mobile.
- Added CSP, immutable hashed-asset cache policy, manifest MIME policy,
  canonical/OG/Twitter/apple metadata, sitemap routes, a designed 404, and
  consistent privacy/terms skeletons. Service-worker navigation now caches
  legal routes separately when offline.
- Added `claims.json`, copy audit, regression tests, and build identity in the
  footer.

## Verification

Executed from a clean dependency install:

```text
npm ci                                      PASS (0 vulnerabilities)
npm test                                    PASS (6 unit + 24 browser cases)
npm run build                               PASS
npm audit --audit-level=moderate            PASS (0 vulnerabilities)
/opt/fleet/lib/verify-url.sh <local> <dir>  PASS
```

`verify-url.sh` against the production preview reported 644 ms load, no
console errors, `lang=en`, one h1, a main landmark, no missing image alt text,
and no unlabeled buttons. Playwright runs desktop Chromium and 390 × 844
mobile; it tests keyboard focus/Escape, offline reload, demo isolation,
same-origin demo networking, populated axe scans, import preservation,
fallback open/hash checking, and route back/forward behavior. Each registered
claim command in `.factory/claims.json` was also run independently and passed.

Current build output: 46.05 KB raw JavaScript (15.99 KB gzip) and 19.32 KB raw
CSS (4.92 KB gzip), below the static-product budgets. The hero remains 126.5
KB. No new Lighthouse run is included because the provided browser suite
exercises the repaired PWA states; pre-repair live Lighthouse was 99/100/100/100.

## Run / deploy

```sh
npm ci
npm test
npm run build
npm run preview
```

Deploy `dist/` using the committed `staticwebapp.config.json`; it is also
copied into `dist/` by Vite through `public/`. No secrets or third-party
runtime assets are needed.

## Known limits

Browsers without persistent directory handles need the user to reselect the
archive folder after a tab/browser restart. That selection is used only to
reconnect the sample; it does not cross into the real/demo storage namespace.
