# Experimental source prerelease gates (not general-use acceptance)

- [x] Include the complete **exact successful trial's** source tree,
      bootstrap and native payload (not a pristine-upstream substitute).
- [x] Decode the SHA-verified reference Switch 2 settings conversion table,
      separate its legacy compatibility table, and expose 17 unique
      non-Japanese conversion targets plus the Japanese restore wrapper;
      exclude legacy-only `zh-CN`/`zh-TW`. Separately read all 20 indices on
      the owner console: every code/payload matches the conversion table,
      including live 6=`ko`, 7=`nl`, 16=`pl`, 17=`th`, duplicates 18/19.
      Require a firmware-matched mapping before target write, bind non-English
      selected target to the boot receipt, document mutable IPC limits and remove owner-local
      IP/UI helper paths. Add an optional host-only Zenity selection dialog to
      set-language.cjs, with --language bypass and cancel/missing-GUI refusal
      before boot consumption. Locale paths other than English are host-mock only.
- [x] Confirm historical Japan/`ja` restoration in multiple real readbacks;
      match the new reverse stage's Japanese-first setter order.
- [x] Run the current complete host suite and source-only preflight.
- [x] Recover exact eiadiX 51-node SAVE scratch on an independently new boot;
      validated all entries, nonrecursive deletion, commit and fresh-clone absence.
      Future-run source-only raw-bound planner/cleanup core/adapter are included
      and host-tested; **a live recovery CLI, distinct-boot admission and fresh
      SAVE absence proof for a new run remain unimplemented.**
- [x] Recover the later English-getter trial's exact-owned SAVE scratch 51
      nodes on a separately verified boot: 51 removals, commit, fresh-clone
      absence and session release verified. This does not verify its original
      forward run or the newly generalized launcher.
- [x] Check the latest three Korean-targeted runs separately: one reached
      enum7=`nl` and refused before setter; two failed at FS acquisition.
      Their distinct cleanup-only boots each verified 51 exact removals,
      commit, fresh SAVE absence and session release. These receipts do not
      authorize deletion for any future run.
- [ ] Recover any *future* owner-private exact-owned SAVE scratch on its own
      separately verified boot; do not reuse prior cleanup receipts.
- [ ] Execute the assembled wrapper and new mixed-state restore stage on a
      console; independently check UI and reboot persistence. Record this run
      separately from host tests and the earlier setting-stage proof.
- [ ] Test a second console/build or clearly restrict to the observed firmware
      and SmileBASIC version; never claim arbitrary-offset compatibility.
- [x] Include upstream revision attribution in `THIRD-PARTY.md` and the README.
- [x] Preserve the requested all-in-one source shape; do not replace it with
      an adapter-only or patch-only archive.
- [ ] Live-verify additional language targets and per-title resources before
      claiming any non-English language's actual game UI is changed.
- [x] Live-read `set` `MakeLanguageCode(0..19)` in a separate app-only
      one-START trial, independently compare all 20 reply wires with source,
      and verify no `set:sys`/setter, full session cleanup and host restore.
      This does not execute the assembled wrapper's mismatch fallback.
- [ ] Live-verify the assembled wrapper's mismatch fallback/reverse mapping,
      Korean setter readback, UI and reboot persistence. Host tests and the
      separate read-only API census alone are not that proof.
- [ ] Complete assembled launcher and future-run cleanup live acceptance before
      claiming a working general-use release. Preserve separate run receipts.
- [ ] Provide and test a usable recovery command that binds an individual run's
      raw/source, independently checks a new full OS boot and live SAVE ownership,
      journals exact nonrecursive removals, commits, verifies fresh-mount absence
      and restores the connection. Until then, README explicitly tells users to
      preserve `runs/` and stop; this source package is not self-service recovery.
