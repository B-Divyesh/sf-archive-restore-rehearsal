# Archive Restore Rehearsal

Archive Restore Rehearsal is a local-first, installable web app for people with
years of files spread across USB disks. It creates a physical archive map,
catalogues chosen folders with incremental SHA-256 hashes, proposes rotating
restore samples, previews supported files, records evidence, and prints a
recovery card.

It does **not** copy, repair, sync, or back up files. Source folders are opened
read-only and archive data stays in the browser. Removable-drive identity is
explicitly treated as fallible.

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

Open the printed local URL in a Chromium browser for persistent folder-handle
support. Firefox and Safari can catalogue a folder through their directory file
picker, but will require it to be selected again for later access.

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

IndexedDB stores archive labels, physical locations, folder handles where the
browser supports them, file paths, sizes, SHA-256 hashes, and drill history.
The JSON export/import path is always free. Exports can reveal private paths
and should be stored carefully. No analytics, remote fonts, or third-party
runtime scripts are included.

The optional US$29 one-time Archive keeper unlock uses the Sociobot billing
API. Set `VITE_BILLING_BASE=https://pilot-api.sociobot.in` for registered test
products on staging; production defaults to `https://api.sociobot.in`. The
product slug is derived by the app contract, with no payment-provider embed or
hardcoded provider product ID.

See [`.factory/design.md`](.factory/design.md) for the visual system and asset
provenance, and [`.factory/handoff.md`](.factory/handoff.md) for verification.

## Deploy

Deploy the contents of `dist/` as a static site. Configure clean static folder
routes so `/privacy/` and `/terms/` serve their `index.html` files. Do not add
infra, secrets, analytics, or billing configuration to this repository.

## License

MIT. See [`LICENSE`](LICENSE).
