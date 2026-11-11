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

The 20-code selection inventory in [LANGUAGES.md](LANGUAGES.md) is not a live
enum table. A subsequent owner-run Korean preflight reached FS and observed
`MakeLanguageCode(7) = nl` and `MakeLanguageCode(0) = ja`; it refused before
opening the Korean setter. Its 51 owned SAVE nodes were subsequently recovered
on a distinct boot, with commit, fresh-clone absence and session release.
Two further Korean-targeted runs failed earlier at FS acquisition, before
language census or setter; each owned tree was recovered separately in the
same strict manner. The local settings image suggests index 6 for `ko`, but
the live unit's exact image was not established. The new bounded mismatch
lookup and reverse mapping are host-mock tested, **not** console-accepted.
Neither a Korean getter nor Korean UI or reboot persistence has been observed.
No other language's console UI is claimed.

Host tests cover preflight/rollback logic; the console results above are
from the individually identified trials. The live-proven *private,
exact-eiadiX-owned* cleanup runner lives outside this source candidate and is
not a user-facing cleanup command.
The added `recovery/` library derives an exact SAVE tree from a **new** run's
SHA-bound raw and producer and checks content/foreign nodes before journaled
nonrecursive cleanup. Synthetic host tests pass; there is no live recovery CLI,
independent current-boot admission, or fresh-SAVE absence proof for a new run.
The integrated English/restore wrapper is distributed here as experimental
source; the observations above identify the earlier console stages precisely.
