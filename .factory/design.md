# Archive Restore Rehearsal — visual thesis

## Direction: the recovery-room risograph

The product should feel like a careful paper procedure kept beside a box of old
drives: tactile, annotated, and reassuringly finite. A two-pass risograph
collage turns anonymous hardware into a legible archive map. Slight ink offsets,
stamped status lozenges, torn-paper edges, and graph-paper rules carry meaning:
this is evidence made by hand, not a glossy storage dashboard. Decoration is
concentrated in the welcome illustration and small ink textures; working views
remain quiet and information-led.

The light treatment is deliberately single-mode. It resembles a printed
recovery worksheet and avoids a dark theme that would undermine the paper/ink
metaphor. The background is always explicitly painted.

## Palette

All combinations used for body text meet WCAG AA.

| Token | Value | Role |
| --- | --- | --- |
| Paper | `#f2ead8` | page background, archival card stock |
| Paper light | `#fffaf0` | input and working surfaces |
| Carbon | `#20211f` | primary text and outlines |
| Muted carbon | `#5b5a52` | secondary copy (5.7:1 on paper) |
| Tomato ink | `#c3372c` | primary actions and urgent marks |
| Cobalt ink | `#254f9f` | links, focus, informational stamps |
| Pine ink | `#21624c` | verified/readable state |
| Ochre ink | `#8a5b09` | caution and uncertain identity |
| Faded red | `#8c2d28` | failure text |

Tomato is reserved for action, cobalt for orientation, and pine for evidence.
Status is always paired with words and symbols.

## Type

- Display: `Arial Black`, `Arial Narrow Bold`, sans-serif. Compressed, blocky
  headlines resemble screen-printed equipment labels without loading a font.
- Working text: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace. It
  makes paths, hashes, dates, and counts scan cleanly; body copy is at least
  16px with 1.55 line height.
- Scale: 14 (supporting labels only), 16, 20, 28, 44/60 responsive. Long text
  is capped at 68 characters.

No external fonts are used. The utility stays offline and saves the font
budget entirely.

## Spacing, shape, and depth

- 4px base rhythm; main intervals: 8, 12, 16, 24, 32, 48, 72.
- Content max width 1180px. Working copy max width 68ch.
- Corners are mostly 2–6px, like clipped paper, never pill-heavy.
- 2px carbon rules and offset 4px shadows establish physical layers. A
  `rotate(-0.4deg)` is used only on non-interactive paper notes.
- Controls are at least 44px tall with at least 8px between targets.
- On phones the rail becomes a horizontal section selector; file tables become
  stacked records; secondary explanatory copy is shortened but never hidden.

## Interaction grammar

- Primary verbs are explicit: “Choose archive folder”, “Start rehearsal”,
  “Mark as opened”, “Export archive data”.
- New catalogue evidence arrives as a sheet laid over the archive map.
- A rehearsal is a three-step physical loop: locate → open → record. One sample
  is visible at a time to keep the proof honest.
- Progress uses determinate text and a ruled meter, not a spinner, wherever the
  browser exposes counts.
- Errors name the affected drive/file and the next recovery step. Deleted local
  records require a confirmation; source media is never modified.

## Motion

Sheets enter with a 220ms translate-and-fade from their trigger; stamps settle
with a 180ms scale change. No animation loops. Under
`prefers-reduced-motion: reduce`, transforms and smooth scrolling are disabled
and state changes use instant opacity only.

## Asset plan and provenance

### Hero: `recovery-bench`

- Subject: an overhead archive workbench with three mismatched USB drives,
  handwritten paper tags, one open folder, and a magnifying glass revealing a
  clean file/check mark motif.
- World/materials: torn cream paper, grainy two-pass risograph ink, imperfect
  cobalt and tomato registration, carbon pencil rules.
- Light/lens: flat editorial overhead view, no photographic reflections.
- Palette words: warm archive paper, carbon black, tomato red, cobalt blue,
  small pine green verification mark.
- Negative list: no readable words, no logos, no branded hardware, no people,
  no UI screenshot, no gradients, no glossy 3D, no watermark.
- Prompt: “Use case: illustration-story. Asset type: offline utility welcome
  hero. A tactile overhead risograph paper collage of an archive recovery
  workbench: three distinct unbranded USB hard drives connected by simple
  cables, torn handwritten-style blank paper labels, a folder of files, and a
  magnifying glass framing one small green verification check. Two-pass
  screenprint texture with visibly imperfect ink registration, halftone grain,
  flat editorial shapes, warm cream paper, carbon black, tomato red and cobalt
  blue with a tiny pine-green accent. Wide landscape composition with calm
  negative space at upper left. No readable text, no letters, no logos, no
  brands, no people, no watermark, no glossy 3D, no gradients.”
- Generator: Azure AI Foundry factory image deployment via
  `/opt/fleet/lib/gen-image.sh`.
- License/provenance: original generated artwork commissioned for this product,
  generated 2026-08-28. Source PNG and prompt sidecar are retained under
  `assets/src/`; optimized WebP ships locally.

App marks, file-type glyphs, drive sketches, and status icons are authored as
inline CSS/SVG-like geometric shapes and text symbols; they contain no third-
party assets.

