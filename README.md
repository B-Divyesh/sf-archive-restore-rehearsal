# Archive Restore Rehearsal

Archive Restore Rehearsal is for people with years of files across USB disks.
It provides an archive map and a restore rehearsal workspace.

Open [the demo](https://archive-restore-rehearsal.sociobot.in/demo) to inspect
the shipped sample workspace. See [`.factory/claims.json`](.factory/claims.json)
for tested product claims and their exact sandbox commands.

Live product: <https://archive-restore-rehearsal.sociobot.in>

## Who it is for

People who label and rotate offline drives and want evidence that a random
sample can still be found, read, hash-matched, and opened before a real loss.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open the printed local URL. Chromium can retain a folder permission. Other
browsers ask you to select a folder again when reconnecting it.

## Test and build

Playwright 1.58.2 is pinned. In a fresh environment, install its Chromium
browser once if it is not already supplied.

```sh
npx playwright install chromium
npm test
npm run build
```

The exact production build command is `npm run build`. Static output lands in
`dist/`, with `dist/index.html` at its root. Preview it with `npm run preview`.

## Data and privacy

The app stores archive records in IndexedDB. Exported archive records can
contain private paths, so store downloads carefully. Privacy details are on
the [privacy page](https://archive-restore-rehearsal.sociobot.in/privacy/).

The optional US$29 one-time Archive keeper unlock uses the Sociobot billing
API. Set `VITE_BILLING_BASE=https://pilot-api.sociobot.in` for registered test
products on staging; production defaults to `https://api.sociobot.in`. The
product slug is derived by the app contract, with no payment-provider embed or
hardcoded provider product ID.

See [`.factory/design.md`](.factory/design.md) for the visual system and asset
provenance, and [`.factory/handoff.md`](.factory/handoff.md) for verification.

## Deploy

Deploy the contents of `dist/` as a static site. `staticwebapp.config.json` is
included in the build output for headers, fallback routing, and asset caching.

## License

MIT. See [`LICENSE`](LICENSE).
