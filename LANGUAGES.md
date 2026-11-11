# Language selection / 言語選択

The source covers 20 selectable language codes, **not** 20 console-proven language changes. `ja` is the restoration target; 19 other codes can be selected. The indices below are documented/legacy *starting candidates*, not a firmware-independent mapping: a real FW 23.0.1 preflight returned `nl` for index 7 rather than `ko`. The host checks this boot's `set` `MakeLanguageCode(enum)` and, on mismatch, scans base indices 0–17 read-only for exactly one matching canonical code before opening `set:sys`. If none, more than one, or a malformed reply is found, no setter is opened. For S2-only 18/19 it fails closed if the FW returns a fallback or no unique base match. Success means immediate mutable getter readback; game resources, HOME, SKU restrictions and persistence across reboot are separate.

| Documented candidate enum | Code | Language |
|---:|---|---|
| 0 | `ja` | Japanese / 日本語（復元先） |
| 1 | `en-US` | US English / 米語 |
| 2 | `fr` | French / フランス語 |
| 3 | `de` | German / ドイツ語 |
| 4 | `it` | Italian / イタリア語 |
| 5 | `es` | Spanish / スペイン語 |
| 6 | `zh-CN` | Chinese (legacy simplified) / 中国語（簡体・旧コード） |
| 7 | `ko` | Korean / 韓国語 |
| 8 | `nl` | Dutch / オランダ語 |
| 9 | `pt` | Portuguese / ポルトガル語 |
| 10 | `ru` | Russian / ロシア語 |
| 11 | `zh-TW` | Chinese (legacy traditional) / 中国語（繁体・旧コード） |
| 12 | `en-GB` | UK English / 英語（英国） |
| 13 | `fr-CA` | Canadian French / フランス語（カナダ） |
| 14 | `es-419` | Latin American Spanish / スペイン語（中南米） |
| 15 | `zh-Hans` | Chinese (simplified) / 中国語（簡体） |
| 16 | `zh-Hant` | Chinese (traditional) / 中国語（繁体） |
| 17 | `pt-BR` | Brazilian Portuguese / ポルトガル語（ブラジル） |
| 18 | `pl` | Polish / ポーランド語（Switch 2 / FW 21+） |
| 19 | `th` | Thai / タイ語（Switch 2 / FW 21+） |

Source: [switchbrew Settings services: Language and LanguageCode](https://switchbrew.org/wiki/Settings_services#Language). The locally inspected Switch 2 settings image maps index 6 to `ko` and index 7 to `nl`, consistent with the observed index-7 `nl`; its identity with the live image is unproved. This table is a source-level code inventory, **not a live enum map or a list of languages the console/game will display**. The release's existing region-1 experiment is retained for all targets, not a claim that region 1 is each language's geographical region. The stage starts from region 0 / `ja`; restore accepts region 1 with a documented language (or mixed region 1 / `ja`) and returns to region 0 / `ja` after source-firmware mapping verification. Other starting states fail closed. A title must contain its own translation.

## Commands / コマンド形状（ホスト側・実験用）

- English compatibility entry: `node enable-english.cjs --admission admission.json [computer-LAN-IPv4]`.
- Dialog: `node set-language.cjs --admission admission.json [computer-LAN-IPv4]` opens a Zenity radio-list of 19 non-Japanese targets, with US English initially selected. Cancelling, missing Zenity or timing out stops before a boot receipt, pairing token or listener. Requires a local graphical session. `--check-only` never opens a dialog.
- Argument instead: `node set-language.cjs --language fr --admission admission.json [computer-LAN-IPv4]`; replace `fr` with any supported non-`ja` code. Explicit `--language` skips Zenity and works in a terminal without a GUI. In **both** paths, bind the exact selected non-English code in admission JSON's `language` field or the command refuses before consuming the boot. For US English, the `language` field is `en-US` or omitted for older admission files. The code is case-sensitive.
- Japanese restoration: `node restore-japanese.cjs --admission admission.json [computer-LAN-IPv4]`.
- No IP is compiled into the release. Only active RFC1918 private IPv4 interfaces are eligible; with one the host chooses it, with several it prompts or requires an explicit *local* interface address. Choosing an IP does not establish a trusted console peer or firewall allowance; do not expose the pairing listener to an untrusted network.
- `admission.json` is a **manual claim**, not a proof of a new boot, independent SAVE cleanup, controller state or target identity. Use the `mode` value `english` even when selecting another language; include the new `language` field for a non-English target. The one-use START and exact-owned scratch/recovery restrictions in README still apply.

日本語: 上表は**実機の番号対応表ではなく候補**。実機で番号7は `nl` だったため、`ko` をその番号のまま書かない。不一致時は番号0〜17を読取り、要求コードが一意でなければsetter前に停止する。この探索の実機成功と韓国語表示は未確認。`set-language.cjs` は言語引数を省くとZenityの選択画面を開き、`--language ko` なら省略。取消・GUI不足・admission JSONの言語不一致は起動ID・token・listener前に停止。選択先19＋日本語復元をソース上で扱うが、各言語のゲーム表示や再起動後の保持は未検証。IPはPCのローカルインターフェースから選択し、持ち主の固定値を配布しない。一般向けscratch回収手段は未完成なのでREADMEの制限を先に確認してください。
