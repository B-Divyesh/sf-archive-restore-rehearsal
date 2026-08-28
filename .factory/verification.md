# Independent product verification

## Verdict: FAIL

Candidate `024a7ad29e6353afa5f2317e16fd31c023abdf07` is not releasable.
The mandatory claims and first-read gates both fail, and destructive-import,
cross-browser, accessibility, routing, and deployment-policy defects remain.
The previously suggested deployment-only explanation is not supported: the
live files match the candidate build byte for byte.

- Tested commit: `024a7ad29e6353afa5f2317e16fd31c023abdf07`
- Tested URL: <https://archive-restore-rehearsal.sociobot.in>
- Verification date: 2026-08-28 UTC
- Starting state: clean `main` checkout at the candidate commit
- Artifact class: offline PWA

## Mandatory gates

### Claims gate — FAIL

`.factory/claims.json` is missing. Therefore there were no declared claim
commands to run through the demo entry point. The claims contract makes a
missing file release-blocking.

The live product and README also make many undeclared claims, including:

- “Nothing is copied or uploaded.”
- “Read-only by design” and “Source media is read, never changed.”
- “Files and paths stay in this browser” / “Local only.”
- “Offline. Scans, drills, and exports still work.”
- installability, incremental SHA-256 hashing, supported previews, JSON
  export/import, printable recovery cards, and no analytics/cloud sync.

None has the required one-to-one `@claim:<id>` test registration.

### Cold first-read — FAIL

Fresh desktop (1440 × 1000) and mobile (390 × 844) contexts were opened with no
stored data.

- What it does: catalogue folders on removable disks and rehearse a rotating
  restore sample.
- For whom: the first screen does not say. The intended person can only be
  inferred; it never plainly says “people with years of files across USB
  disks.”
- What to click first: “Choose your first archive folder,” but its top edge was
  at y=1063.7 px on desktop and y=1092.0 px on mobile, below both initial
  viewports.
- There is no “Try it with sample data” action. `/demo` serves the ordinary
  empty app, and `?demo=1` has no demo banner or sample data and opens the real
  IndexedDB database `archive-restore-rehearsal`.
- `.factory/demo.md` is missing; there is no separate `demo:` storage
  namespace, reset action, or “Start for real” path.

## Release-blocking findings

### Critical — a structurally invalid import erases existing data

`importBundle()` checks only the top-level version and array types, calls
`clearAll()`, then writes records one at a time. In a browser containing one
mapped location, importing this confirmed payload:

```json
{"version":1,"volumes":[null],"files":[],"drills":[]}
```

produced `Failed to execute 'put' on 'IDBObjectStore'...`, and after reload the
previous archive map was gone. Import needs complete schema validation and an
atomic transaction before replacing user data.

### High — directory-upload fallback cannot complete a real restore check

With `showDirectoryPicker` unavailable (the documented Firefox/Safari path), a
folder catalogued successfully. “Open and verify file” then said:
`Reconnect “Fallback drive” with Scan again...`. “Scan again” replied:
`Choose the folder using Add archive location in this browser.` No existing
location can be reconnected, so the user cannot open/hash-check the sample.
This contradicts the README/browser-support copy and breaks the core job in
that supported path.

### High — serious accessibility failures occur after the empty state

Axe 4.10.2 found zero serious/critical issues on empty home, add dialog,
privacy, terms, populated map, drill start, preview dialog, and settings. It
found:

- `aria-prohibited-attr` (serious) on `.progress-rule`: an `aria-label` is put
  on a generic `div` with no valid role.
- `scrollable-region-focusable` (serious) on mobile `.recovery-card`: its
  620 px table scrolls inside a 390 px viewport, but the region is not keyboard
  focusable.

Dialog behavior also fails keyboard focus management. Escape closes the
native dialog without clearing application modal state; the next render
reopens it. The visible Close action returns focus to `<body>`, not the opener.
Mobile footer links are only 15 px high, the wordmark is 42 px high, and the
privacy-page Sociobot link is 19 px high, below the 44 px touch target rule.

### High — app navigation is not real routing

The four workspace links prevent default navigation but do not call
`pushState` or update the hash. Selecting “Data & unlock” leaves the URL at
`/`; back/forward cannot restore views. Loading `/#settings` cold still renders
the archive map. The title also remains the home title for every workspace
view. This violates the required deep-link, history, focus-announcement, and
per-route-title behavior.

### High — required release policy and discovery files are absent

- No Content-Security-Policy header or repository deployment policy file
  (`staticwebapp.config.json`).
- No canonical URL, Open Graph metadata, Twitter card, or apple-touch icon.
- Unknown paths return HTTP 200 with the home app; there is no designed 404.
- Legal pages lack the common navigation/skip link/footer skeleton.
- The footer has no Param Factory attribution or build/version identity.
- `.factory/copy-audit.md` is missing.

## Other findings

- **Medium:** all live responses, including content-hashed JS/CSS, use
  `cache-control: public, must-revalidate, max-age=30`; hashed assets are not
  long-lived immutable. The manifest is served as `application/octet-stream`.
- **Medium:** after installing the app shell, offline navigation to `/privacy/`
  returns the main app under the privacy URL/title instead of the privacy page
  or a truthful offline response.
- **Medium:** “Save & leave” does not provide any resume path. After reload an
  incomplete drill is invisible and the screen only offers a new drill.
- **Low:** axe reports the `region` rule at moderate impact on most app views
  because some content is outside landmarks.

## Passing evidence

### Clean install, tests, types, build

```text
npm ci                                  PASS (61 packages, 0 vulnerabilities)
npm test                                PASS (5 Vitest + 10 Playwright)
npm run build                           PASS (includes tsc --noEmit)
npm audit --audit-level=moderate        PASS (0 vulnerabilities)
```

No lint script exists. The production output contains `dist/index.html`.

Build sizes:

- JS: 39,992 B raw / 14.29 KB gzip
- CSS: 18,191 B raw / 4.72 KB gzip
- hero WebP: 126,496 B
- fonts: none

These pass the 200 KB JS, 50 KB CSS, 300 KB hero, and 120 KB font budgets.

### End-to-end behavior

A fresh isolated live context used a real browser-owned
`FileSystemDirectoryHandle` containing three representative files, including a
zero-byte file. Results:

- required drive label rejected empty submission and received focus;
- 80/120/240-character label/location/note boundaries were accepted;
- three files were hashed, counted, fingerprinted, and persisted after reload;
- all three were reopened, SHA-256/size matched, marked opened, and recorded;
- recovery history showed `3 passed · 3 sampled`;
- JSON export contained 1 volume, 3 files, and 1 drill and omitted the folder
  handle;
- valid JSON import and a 34,700-byte printable recovery-card PDF worked;
- malformed JSON produced an error without erasing data;
- no console or uncaught page errors occurred in the normal flow.

The full mapped-drive drill and export also passed after
`context.setOffline(true)` and reload.

### Accessibility and responsive checks

`/opt/fleet/lib/verify-url.sh` passed against the live URL: HTTP 200, 909 ms
load, no console errors, title and `lang`, one `<h1>`, main landmark, no image
missing alt, and no unlabeled button.

At 390 px there was no document-level horizontal overflow. Reduced-motion
emulation matched, changed smooth scrolling to `auto`, and reduced transitions
and animations to 0.01 ms. The initial desktop and mobile layouts were visually
reviewed; the visual system is distinctive and readable, aside from the
first-action and touch-target defects above.

### PWA behavior

Chrome parsed the manifest with no errors and found the required 192, 512, and
maskable icons. The active service worker controlled the page with the
`arr-v3-shell` cache. Offline home reload passed and displayed
“Offline · local.” An induced byte-changed service worker on a local production
server reached `waiting: installed` and displayed “An update is ready. Reload
when convenient.”

### Performance

Lighthouse 12.5.1 mobile against the live deployment:

| Category/metric | Result |
| --- | ---: |
| Performance | 99 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| FCP | 0.96 s |
| LCP | 1.736 s |
| Total blocking time | 72 ms |
| CLS | 0 |

INP is not produced by a one-load lab run; no field data was available. The
interactive E2E actions had no observed long-task or timeout issue in the
successful flow.

### Privacy, network, billing, and rate limiting

The full ordinary scan/drill/export flow contacted only the product origin.
No analytics, remote fonts, or third-party runtime scripts were observed.
IndexedDB holds archive data locally; the license token alone uses localStorage.

An invalid production license returned HTTP 200 with
`{"valid":false,"reason":"invalid"}`. Capture from `?license=` stored the token,
removed it from the URL, called only the Sociobot verify endpoint, and showed
the inactive notice. Checkout returned HTTP 303 to a Dodo-hosted Sociobot
session, as required.

A 120-request concurrent burst to the production verify endpoint yielded 30
HTTP 200 responses followed by 90 HTTP 429 responses. The first observed 429
was request index 30 (the 31st request), and every 429 included
`Retry-After: 4`. Rate limiting passes.

Live responses include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`,
and `X-Content-Type-Options: nosniff`; the missing CSP remains a blocker.

## Deployment identity

The live HTML references exactly `index-DBa-cRof.js` and
`index-BnPQPfb6.css`, the candidate's build outputs. SHA-256 values matched for
all of these candidate/live pairs: root HTML, JS, CSS, recovery artwork,
`sw.js`, manifest, privacy page, and terms page. The deployed product is the
candidate; this is not a deployment-only failure.

## Required remediation before reverification

1. Add `.factory/claims.json` and one observable demo-based test per claim;
   remove or test every claim-like sentence.
2. Add a one-click isolated sample-data demo and `.factory/demo.md`; make the
   primary action visible in the initial desktop and mobile viewport and name
   the intended user plainly.
3. Validate an entire import before an atomic replacement transaction.
4. Make fallback folder reconnection complete the open/hash/readability job.
5. Fix all serious axe results and dialog/touch-target behavior.
6. Implement real routes/history/titles, a 404, required metadata, security
   headers, and immutable hashed-asset caching.
