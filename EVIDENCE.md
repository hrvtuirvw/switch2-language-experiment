# What has actually been observed

This document separates the proven *settings operations* from the new
all-in-one wrapper. It contains no private console logs or pairing material.

- Real `switch2-USy2I1` and `switch2-UFdgPh` runs changed mutable settings
  from Japan/`ja` to region 1/`en-US`, then wrote `ja` and region 0 and read
  both originals back. Their setting reports ended with
  `LANGUAGE_AND_REGION_ROUNDTRIP_RESTORED`; both overall host runs failed at
  later/other stages, so this does not certify the launcher or FS cleanup.
- A third interrupted run `switch2-Cb2mZo` ended its setting stage with
  `ABORT_RESTORED`, also recording both original values on readback.
- `switch2-eiadiX` read back region 1/`en-US` and an independent HDMI image
  showed English System Settings. HOME immediately afterward remained Japanese.
  This run's top-level result was not verified because 51 exact-owned save
  scratch nodes remained. The later private cleanup-only run `switch2-XYz7IW`
  removed exactly those 51 nodes, committed, and verified root absence from a
  newly cloned SAVE (pipeline/result both `verified:true`); this does not
  retroactively turn the English-setting run into a verified all-in-one run.
  Following owner-authorized terms acceptance and a separately witnessed OS
  restart, fresh HDMI showed both HOME and System Settings in Japanese.
  English Settings UI **did not persist in that observed reboot path**.
  On a subsequent independently witnessed full OS reboot, a separate
  app-only, read-only `set` getter probe read RegionCode **1** and
  LanguageCode **ja** twice (private receipt SHA-256
  `e24a388152013d920380d26591f537ff558a2886ef6c6c23dea54071fbd44a39`).
  No setter or FS acquisition was attempted in that probe. This proves the
  mixed mutable state at that later observation, not which reboot caused the
  language reversion or any hardware SKU change.
- Separately from this all-in-one wrapper, a 2026-11-10 private continuous
  recording captured a Japanese Kirby Air Riders title, an `en-US` setter
  readback, and a later English Kirby Air Riders title **within one boot**.
  It is not an attached public video (it contains private pairing material),
  nor proof of persistence after reboot. Another observed post-reboot
  SmileBASIC launch returned to Japanese. These are game-launch observations,
  not proof for every title/language or this new multi-language wrapper.
- On 2026-11-10, a separate owner-operated wired run reached the mutable-
  language stage from region 1 / `ja` and read back region 1 / `en-US`. Its
  **top-level run failed during FS resource retirement**. A later, separate-
  boot cleanup-only run removed exactly its 51 source-owned SAVE scratch nodes,
  acknowledged commit, proved absence from a fresh SAVE clone and released
  the session (`verified:true` in the private cleanup result). This does not
  turn the earlier language trial into a complete launcher success. No
  game/HOME English display or reboot persistence is inferred from that getter.
  Private raw and cleanup receipts are not distributed.
- The acquisition/bootstrap/native payload in this tree derive from that
  exact English-settings trial. The executed acquisition probe SHA-256 is
  `428939bd5ed1798533f862c09fac1b863cf38cac85ed9a5bd8026ccc3e284e6e`;
  the executed English stage SHA-256 is
  `5813772586945d36a00771b822d410366ed3adf7d8ce4330ac22c872a47cbedc`.
  The new standalone reverse stage follows the historical Japanese-first
  setter order for `1`/`en-US`, and adds a host-tested no-language-write
  branch for `1`/`ja`. These source additions follow the prior console trials;
  the console results above come from their individually identified runs.

The reference Switch 2 settings NSO has an 18-unique-code conversion table
and a distinct legacy 20-slot compatibility table. The candidate selects the
17 non-Japanese conversion codes listed in [LANGUAGES.md](LANGUAGES.md), not
legacy-only `zh-CN`/`zh-TW`. The NSO was SHA/segment verified, but its binary identity with the live
unit is unproven. A prior Korean preflight reached FS and observed
`MakeLanguageCode(7) = nl` and `MakeLanguageCode(0) = ja`; it refused before
opening the Korean setter. Its 51 owned SAVE nodes were recovered on a
distinct boot, with commit, fresh-clone absence and session release.
Two further Korean-targeted runs failed earlier at FS acquisition, before
language census or setter; each owned tree was separately recovered.

A subsequent **application-only, read-only** owner-console trial on a new,
independently witnessed OS boot called `set` `GetLanguageCode` and then
`MakeLanguageCode(0..19)`. Every index's canonical code and 8-byte payload
matched the reference *conversion* table: live 6=`ko`, 7=`nl`, 16=`pl`,
17=`th`, and duplicate 18/19=`ja`/`en-US`. Private result receipt SHA-256
`488b982019196d9a9b9009c84ea1e9f6084eae2878d7b31b38153b30bca0f601`;
private IPC event journal SHA-256
`3c2e57a8ba5b2e91394ab57ef86447599b45792d2a4a06325e3515679dca9ea6`
contains only the `set` getter command 0 and conversion command 2 (20
successful replies), then owned handle close/allocation free. No `set:sys`
service or setting setter was opened. There is no FS acquisition/SAVE
scratch in this read-only probe, and the host firewall/port/input were
restored. The code's new bounded mismatch lookup and reverse mapping remain
host-mock tested, **not** live executed. No Korean setter/readback, Korean UI,
reboot persistence, or other language's console UI is claimed.

Host tests cover preflight/rollback logic; the console results above are
from the individually identified trials. The live-proven *private,
exact-eiadiX-owned* cleanup runner lives outside this source candidate and is
not a user-facing cleanup command.
The `recovery/handheld.cjs` entry selects one supported pre-language FS failure
from its raw/source and terminal pipeline, then uses a separate one-use boot
journal and exact-owned SAVE library for nonrecursive cleanup, commit and fresh
clone absence. Synthetic host tests pass; the new generic entry has not itself
been run on the console. It refuses other failure shapes. Its operator-supplied
boot ID is not independent proof of a new OS boot or Direct scene.
The integrated English/restore wrapper is distributed here as experimental
source; the observations above identify the earlier console stages precisely.
