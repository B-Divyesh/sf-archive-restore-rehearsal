# Archive Restore Rehearsal — build handoff

## What shipped

A finished v1 local-first PWA for mapping offline archives and proving that a
rotating sample can still be restored:

- Explicit physical labels, storage locations, recovery notes, mounted folder
  names, content totals, scan dates, and fallible-identity fingerprints.
- User-initiated read-only folder access with a Chromium File System Access API
  path and a directory-upload fallback.
- Recursive, incremental 4 MB chunk processing and SHA-256 hashing so large
  files do not need to be loaded fully into memory.
- IndexedDB persistence for volume catalogues, file records, saved folder
  handles where supported, and drill history.
- Rotating samples biased toward files not rehearsed recently, with live
  locate/open/rehash/preview/record steps and explicit pass, unreadable,
  missing, and skipped outcomes.
- Previews for images, text, PDF, audio, and video, plus a new-tab handoff for
  other file types.
- Printable recovery card and portable JSON export/import, both free.
- Install manifest, 192/512/maskable icons, versioned service-worker caches,
  offline app-shell reload, and update-ready messaging.
- $29 one-time Archive keeper tier using only the Sociobot checkout and verify
  contract: unlimited locations and adjustable sample sizes. License return,
  local storage, once-daily verification cache, optimistic offline behavior,
  paste-to-restore, and revocation handling are implemented. Production API is
  the default; `VITE_BILLING_BASE` switches staging to the pilot API. No
  provider product ID is embedded.
- Responsive keyboard-accessible UI, explicit error/empty/offline/scanning
  states, reduced-motion treatment, privacy and terms pages, and no analytics,
  remote fonts, or third-party runtime scripts.
- Original recovery-bench risograph illustration. Source PNG and generation
  sidecars are in `assets/src/`; the reviewed shipping WebP is 124 KB. Full
  prompt and provenance are in `.factory/design.md`.

## How to run and verify

```sh
npm install
npm test
npm run build
npm run preview
```

The exact build command is `npm run build`; output is `dist/`, and
`dist/index.html` is present at its root.

Verification on 2026-08-28:

- `npm test`: passed — 5 unit assertions and 10 Playwright scenarios across
  desktop Chromium and a 390 × 844 Chromium mobile viewport. Coverage includes
  empty/error guidance, keyboard dialog focus, folder selection and hashing,
  drill recording, legal routes, axe serious/critical checks, and explicit
  `context.setOffline(true)` reload.
- `npm run build`: passed with Vite 6.4.3. Initial application JS is 39.99 KB
  (14.29 KB gzip), CSS is 18.19 KB (4.72 KB gzip), and hero WebP is 124 KB.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173 /tmp/arr-verify`:
  HTTP 200, 673 ms local load, no console errors, title and `lang` present, one
  `<h1>`, main landmark present, zero images missing alt, zero unlabeled
  buttons.
- Lighthouse 12.5.1, mobile preset against the production preview:
  performance 99, accessibility 100, best practices 100, SEO 100; FCP 1.1 s,
  LCP 2.0 s, total blocking time 0 ms, CLS 0.
- Desktop and 390 px full-page screenshots were visually reviewed. Text,
  controls, navigation, hero crop, and document flow remain intact.

## Known limits and next steps

- Browsers intentionally do not expose reliable USB serial numbers. Identity
  is therefore a user-visible combination of physical label, mounted name,
  size, and a catalogue-derived fingerprint; the UI never calls it certain.
- Persistent directory handles and in-place re-opening work best in Chromium.
  Safari and Firefox can catalogue through directory upload but do not provide
  a reusable handle, so a later open check requires reselecting/cataloguing the
  folder. A future File System Access implementation in those browsers can
  remove this limitation without changing stored exports.
- Hashing is incremental and yields between chunks, but the first full scan of
  a multi-terabyte archive is necessarily I/O-heavy. A future version could add
  resumable scan checkpoints and unchanged-file metadata reuse.
- The factory must register the product with Sociobot billing before checkout
  and verification succeed in production. For staging, build with
  `VITE_BILLING_BASE=https://pilot-api.sociobot.in` and the factory's registered
  test product.
- A sample is evidence for the selected files at the recorded moment, not a
  guarantee for the complete archive. This limitation is stated in the app and
  terms.
