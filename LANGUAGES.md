# Language indices / 言語番号

The SHA-256-verified **reference Switch 2 settings NSO** (`76230b9a78f10f968e135498a4329a29c585464e4da28bd6effcffc8c3e453e1`, title `0400000000000009`, build ID `dd1025c709e627972c919042a08507c84a73ed7e`) contains two distinct tables. Its *conversion table* at module VA `0xa945a` yields the following 18 unique codes. The separate legacy *compatibility table* at `0xa94ea` has 20 entries: `zh-CN` at 6, `ko` at 7, `zh-TW` at 11, `pl` at 18, `th` at 19. **Do not use that compatibility numbering for this conversion call.** Conversion slots 18/19 repeat `ja`/`en-US` and are not extra languages. A separate owner-console, application-only **read-only** census returned `MakeLanguageCode(0..19)` on one verified new boot. All 20 reply codes and canonical 8-byte payloads match this conversion table exactly, including live 6=`ko`, 7=`nl`, 16=`pl`, 17=`th` and duplicate slots 18/19. Private receipt SHA-256 `488b982019196d9a9b9009c84ea1e9f6084eae2878d7b31b38153b30bca0f601`; its actual IPC event journal contains only `set` commands 0/2 and cleanup, no setter. This verifies the **API mapping on that unit/boot**, not its NSO binary identity, language writes, UI or reboot persistence.

| Conversion index | Code | Language |
|---:|---|---|
| 0 | `ja` | Japanese / 日本語（復元先） |
| 1 | `en-US` | US English / 米語 |
| 2 | `fr` | French / フランス語 |
| 3 | `de` | German / ドイツ語 |
| 4 | `it` | Italian / イタリア語 |
| 5 | `es` | Spanish / スペイン語 |
| 6 | `ko` | Korean / 韓国語 |
| 7 | `nl` | Dutch / オランダ語 |
| 8 | `pt` | Portuguese / ポルトガル語 |
| 9 | `ru` | Russian / ロシア語 |
| 10 | `en-GB` | UK English / 英語（英国） |
| 11 | `fr-CA` | Canadian French / フランス語（カナダ） |
| 12 | `es-419` | Latin American Spanish / スペイン語（中南米） |
| 13 | `zh-Hans` | Chinese (simplified) / 中国語（簡体） |
| 14 | `zh-Hant` | Chinese (traditional) / 中国語（繁体） |
| 15 | `pt-BR` | Brazilian Portuguese / ポルトガル語（ブラジル） |
| 16 | `pl` | Polish / ポーランド語 |
| 17 | `th` | Thai / タイ語 |

`ja` is the restore target; 17 other codes are selectable. Legacy-only `zh-CN`/`zh-TW` are *not* menu choices. Each target and reverse operation checks the code returned by this boot's `set` `MakeLanguageCode(index)` before opening `set:sys`. If the candidate index mismatches, a bounded read-only scan of 0–17 requires exactly one matching canonical code; absent, duplicate or malformed responses refuse before setter. Only immediate mutable getter readback can establish a setting-stage result; the game's language resources, HOME, SKU restriction and reboot persistence are separate. A title must contain its own translations. The region-1 experiment is not a claim that region 1 is the geographical region of every selected language.

The reference table was re-decoded from the original NSO after checking its file SHA-256 and all three decompressed segment hashes, with a private offline verifier (`findings.py`); no firmware image or private credentials are packaged. The original NSO and disassembly are static evidence; the **separate** full-index console API census above is the live mapping evidence. Neither alone proves the setter/UI or another unit's firmware compatibility. See [EVIDENCE.md](EVIDENCE.md).

## Commands / コマンド形状（ホスト側・実験用）

- English compatibility entry: `node enable-english.cjs --admission admission.json [computer-LAN-IPv4]`.
- Dialog: `node set-language.cjs --admission admission.json [computer-LAN-IPv4]` opens a Zenity list of **17** non-Japanese targets; US English initially selected. Cancel, missing Zenity or timeout stops before this command's boot receipt, token or listener. `--check-only` never opens a dialog.
- Argument: `node set-language.cjs --language ko --admission admission.json [computer-LAN-IPv4]` skips the GUI. The selected code must match the admission JSON `language` field for a non-English target. For US English, `en-US` or omission supports older admission files. Codes are case-sensitive.
- Japanese restoration: `node restore-japanese.cjs --admission admission.json [computer-LAN-IPv4]`.
- No owner IP is compiled in; only active local RFC1918 IPv4 interfaces are eligible. Choosing one does not authenticate the console or create a firewall exception. The admission JSON contains a unique operator-supplied `bootId`, `mode`, and a `language` for non-English targets; it does not independently prove boot/scene/SAVE state. Internal `mode` remains `english` for any non-Japanese target, `restore` for Japanese. Do not reuse START in the same OS boot or remove a future run's SAVE scratch without its exact separate-boot ownership proof. This is experimental source, not a general-use live cleanup tool.

日本語: 参照Switch 2設定NSOの**変換表**と、別起動で得た実機の読取り専用 `MakeLanguageCode(0..19)` 全20応答が一致。実機で6=`ko`、7=`nl`、16=`pl`、17=`th`、18/19=`ja`／`en-US` 重複を確認した。別の互換表にある「7=`ko`、18=`pl`、19=`th`」は使用しない。変更時にも同一起動の応答を読取り、番号が違えば0〜17から一意に決まる場合だけ書く。変更先17＋日本語復元。`zh-CN`／`zh-TW` は旧互換表だけにあるため選択肢から除外。Zenityの取消・GUI不足やadmissionとの言語不一致は起動枠とlistener前に停止する。コード一覧はREADMEにも掲載した。ゲーム内表示はタイトル側の翻訳資源に依存し、SAVEの回収は試行ごとのrawと別起動の所有照合が必要。
