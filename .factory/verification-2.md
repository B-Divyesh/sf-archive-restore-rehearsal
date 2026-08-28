# Independent product verification — candidate `f82a0ce8b4f92546d48ff0e3cea352811b781edc`

## Verdict: FAIL

Candidate `f82a0ce8b4f92546d48ff0e3cea352811b781edc` is **not releasable**. The
deployed product is this candidate (the independently fetched production
files matched the production build byte-for-byte), but its demo isolation and
rehearsal persistence fail the offline-PWA and demo-sandbox contracts. Its
claims inventory also omits several visitor-facing promises.

- Tested commit: `f82a0ce8b4f92546d48ff0e3cea352811b781edc`
- Tested URL: <https://archive-restore-rehearsal.sociobot.in>
- Verification date: 2026-08-28 UTC
- Scope: static offline PWA; no product source files changed during this QA

## Mandatory gates

### Claims — declared commands PASS; coverage FAIL

`.factory/claims.json` exists. From a clean `npm ci`, each exact declared
command passed against the locally built demo entry point:

| Claim | Exact command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npm run test:e2e -- --grep @claim:demo-sandbox` | PASS (desktop + mobile) |
| `offline-reload` | `npm run test:e2e -- --grep @claim:offline-reload` | PASS (desktop + mobile) |
| `privacy-local` | `npm run test:e2e -- --grep @claim:privacy-local` | PASS (desktop + mobile) |

However, the claims contract also requires an entry and an observable sandbox
test for every claim a visitor can rely on. The three entries do not cover
these live/README/privacy claims:

- “Mapped, not copied” and “Archive mapping and rehearsal evidence are stored
  in this browser.”
- “Sample data stays in the demo. Your map stays in this browser.”
- Privacy page: ordinary **scanning, rehearsal, printing, export, and import**
  make no product network request; there is no analytics, advertising,
  fingerprinting, or account system.
- README: Chromium can retain a folder permission and other browsers can
  reconnect a selected folder.

`privacy-local` observes only the demo drill and only asserts same-origin
requests; it does not prove those broader real-data, storage, no-copy, or
full-workflow promises. This is a release-blocking unlisted-claim finding.

### Cold first read — PASS

Fresh desktop (1440 × 1000) and 390 × 844 mobile contexts showed, above the
fold:

- **What it does:** “Map drives. Test restores.”
- **For whom:** “For people with years of files across USB disks …”
- **What to click first:** the visible “Try it with sample data” action;
  nearby text says it shows a mapped drive, rehearsal, and recovery card.

The one-click `/demo` sample initially shows Blue family drive and the
persistent demo banner. No console error occurred on this cold read.

## Release-blocking defects

### Critical — demo navigation/reload abandons the isolated namespace and exposes the real map

The demo flag is derived only from `/demo` or `?demo=1`. While a user is in
demo mode, the Rehearse navigation changes the address to `/drill`; it does
not retain `/demo` or `?demo=1`. Reloading `/drill` starts the real namespace.

Reproduction on the live product:

1. Seeded a real local IndexedDB map with an archive label `Real private
   archive` in a fresh browser context.
2. Opened `/demo`: the real label was correctly absent.
3. Selected **Rehearse**. The URL became
   `https://archive-restore-rehearsal.sociobot.in/drill`.
4. Reloaded, selected Archive map, and observed `Real private archive`; the
   demo banner was absent.

This makes a demo session non-persistent and lets a visitor who reasonably
expects to remain in the sandbox land on their real sensitive archive map.
It violates the required separate demo namespace and the PWA refresh-state
contract. Demo routes must preserve a demo marker across every workspace URL
and restore the demo namespace before opening IndexedDB.

### High — a saved incomplete restore rehearsal cannot be resumed after refresh or tab close

On live `/demo`, I started the three-file rehearsal, recorded the first item
as missing, chose **Save & leave**, then reloaded and opened Rehearse. The app
showed only **Start restore rehearsal** and no resume/continue action. Evidence
also listed no past rehearsal because it only lists completed drills.

The drill is written to IndexedDB before it is left, but startup reads drills
only for sample selection and never restores an incomplete one. Consequently
the saved progress is inaccessible after refresh/tab close, contrary to the
PWA requirement that state survive refresh/close and to the explicit
**Save & leave** control. Restore a single incomplete drill with a clear
continue/discard choice, or do not imply that it is saved.

### High — visitor-facing privacy/storage and browser-support claims are not all registered and proved

See the Claims gate above. The strict claims contract says an unlisted claim
fails review until it is removed or has its own demo-based observable test.
Add focused tests (including the real archive import/export/scan flow’s
request log) or narrow the copy to the existing tested promises.

## Passing evidence

### Clean build and automated tests

```text
npm ci                                      PASS (61 packages; 0 vulnerabilities)
npm run test:e2e -- --grep @claim:*         PASS individually as listed above
npm test                                    PASS (6 unit tests; 24 Playwright cases)
npm run build                               PASS (tsc --noEmit + Vite; dist/ produced)
npm audit --audit-level=moderate            PASS (0 vulnerabilities)
```

No lint script is provided. The production bundle is 46,052 B raw / 15.99 KB
gzip; CSS is 19,322 B raw / 4.92 KB gzip; the hero image is 126,496 B. These
meet the stated static budgets.

### Live identity, headers, cache, privacy, and rate allowance

SHA-256 comparisons matched between `dist/` and live for root HTML, app JS,
CSS, hero artwork, service worker, manifest, privacy, and terms. The
deployment is not an older/deployment-only artifact.

The live root returned CSP, HSTS, `Referrer-Policy`, and
`X-Content-Type-Options`. Hashed JS/CSS/WebP returned
`Cache-Control: public, max-age=31536000, immutable`; the manifest had
`application/manifest+json`; an unknown route returned a designed HTTP 404.

Live request recording across `/`, `/demo`, the demo rehearsal, and legal
pages observed only `https://archive-restore-rehearsal.sociobot.in`. There
were no third-party fonts/scripts or console/page errors in that flow.

The optional billing verify endpoint enforced an observed allowance of 30
successful responses in a 40-request concurrent verification burst; 10
responses were HTTP 429 and every 429 included `Retry-After: 4`.

### Accessibility, keyboard, mobile, motion, and PWA shell

- `/opt/fleet/lib/verify-url.sh` passed live: HTTP 200, 785 ms load, title,
  `lang=en`, one h1, a main landmark, no missing image alt, no unlabeled
  buttons, and no console errors.
- Axe 4.10.2 found no serious/critical violations on live home, demo, active
  demo rehearsal, privacy, or terms at 390 px.
- Keyboard Tab reached the skip link, wordmark, all four workspace links,
  both demo actions, folder action, and footer links; each showed the 4 px
  cobalt visible-focus outline. Reduced-motion emulation changed transitions
  to `0.01ms` and scrolling to `auto`.
- The live PWA controlled the page after first visit. Offline reload of a
  populated demo rehearsal rendered successfully with the `Offline · local`
  status. The service worker contains versioned caches, `skipWaiting`, and
  `clientsClaim` update handling. The incomplete-drill defect above remains a
  failure of persisted product state, not of shell loading.

### Visual, metadata, and performance note

The recovery-room risograph system matches `.factory/design.md`, is
responsive at 390 px without document-level horizontal overflow, uses local
assets only, and has the required title/lang/main/heading structure. A current
Lighthouse CLI attempt could not establish a debugging connection to the
container’s supplied Chromium, so no new Lighthouse score is claimed; the
measured bundle budgets above pass.

## Required remediation before another verification

1. Keep demo identity in every demo workspace URL (or use a durable demo
   query marker) and prove a refresh never opens the real IndexedDB namespace.
2. Add a resume/discard path for a persisted incomplete drill and test refresh
   and tab-close recovery.
3. Register and test every privacy/storage/browser-support claim, or remove
   the unprovable copy. Use request logs during real scan, rehearsal,
   export/import, and demo navigation—not only the happy-path demo drill.
4. Re-run the exact claims commands, full test/build, live identity comparison,
   offline reload, and the demo reload isolation regression before release.
