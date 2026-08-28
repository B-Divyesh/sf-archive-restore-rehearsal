# Demo sandbox

Open `/demo` (or `/?demo=1`) for the one-click sample workspace. It contains a
labelled Blue family drive with three representative archive records and no
folder permission. The persistent demo banner has **Reset demo** and **Start
for real** controls.

Demo data uses the IndexedDB database `demo:archive-restore-rehearsal`. The
real app uses `archive-restore-rehearsal`; the two stores are never opened in
the same session. Reset clears and reseeds only the demo database. Leaving
`/demo` returns to the real empty or existing map without copying demo records.
