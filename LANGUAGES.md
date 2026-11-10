# Language selection / 言語選択

The source covers the 20 `nn::settings::Language` entries documented for Switch 2, **not** 20 console-proven language changes. `ja` is the restoration target; 19 other codes can be selected. The host validates the exact code returned by this boot's `set` `MakeLanguageCode(enum)` before opening `set:sys`. It refuses an unsupported/mismatched mapping (including FW returning `ja`/`en-US` for S2 enum 18/19). Success means an immediate mutable getter readback; a game's resources, HOME, SKU restrictions and persistence across reboot are separate.

| Enum | Code | Language |
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

Source: [switchbrew Settings services: Language and LanguageCode](https://switchbrew.org/wiki/Settings_services#Language). This is a source-level enum inventory, **not a list of languages the Japanese-only console or any game will display**. The release's existing region-1 experiment is retained for all targets, not a claim that region 1 is each language's geographical region. The stage starts from region 0 / `ja`; restore accepts region 1 with a documented language (or mixed region 1 / `ja`) and returns to region 0 / `ja` after source-firmware mapping verification. Other starting states fail closed. A title must contain its own translation.

## Commands / コマンド形状（ホスト側・実験用）

- English compatibility entry: `node enable-english.cjs --admission admission.json [computer-LAN-IPv4]`.
- Other language: `node set-language.cjs --language fr --admission admission.json [computer-LAN-IPv4]`; replace `fr` with a supported non-`ja` code **and bind the same code in admission JSON's `language` field**. For English, the optional `language` field is `en-US` or omitted for older admission files. The code is case-sensitive.
- Japanese restoration: `node restore-japanese.cjs --admission admission.json [computer-LAN-IPv4]`.
- No IP is compiled into the release. Only active RFC1918 private IPv4 interfaces are eligible; with one the host chooses it, with several it prompts or requires an explicit *local* interface address. Choosing an IP does not establish a trusted console peer or firewall allowance; do not expose the pairing listener to an untrusted network.
- `admission.json` is a **manual claim**, not a proof of a new boot, independent SAVE cleanup, controller state or target identity. Use the `mode` value `english` even when selecting another language; include the new `language` field for a non-English target. The one-use START and exact-owned scratch/recovery restrictions in README still apply.

日本語: 対応するのは設定サービスの言語コード20種類（変更先19＋日本語復元）をソース上で選び、**その起動のファームウェアから返るコードと照合して書く**ところまで。各言語のゲーム画面が変わったことや再起動後の保持は未検証。IPはPCのローカルインターフェースから選択し、固定値や持ち主のLANアドレスは配布しない。現行の一般向けscratch回収手段は未完成なので、実機操作はREADMEの制限を先に確認してください。
