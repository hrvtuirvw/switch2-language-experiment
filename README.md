# Switch 2 multilingual settings — experimental all-in-one source

Switch 2の可変な地域・言語設定を扱う、全部入りソースの実験版。英語設定、17言語からの選択、日本語への復元を一つのソースツリーにまとめています。固定の家庭内IPは含めず、実行PCのLANアドレスを選びます。Zenityの選択ダイアログ、または `--language` 引数で言語を指定できます。

この本体で `set` の `MakeLanguageCode(0..19)` を読取り、20件すべてのコードと8バイト応答が参照Switch 2設定NSOの**変換表**と一致しました。以前の別試行では地域1／`en-US` の読戻しと英語の本体設定画面、日本語の設定値への復元を確認しています。これらはそれぞれの実機記録であり、選択ダイアログを含む今回の統合版を実行した記録とは分けて [EVIDENCE.md](EVIDENCE.md) にまとめています。

## 言語コード / Language codes

| 番号 | コード | 言語 |
|---:|---|---|
| 0 | `ja` | 日本語（復元先） / Japanese |
| 1 | `en-US` | 米語 / US English |
| 2 | `fr` | フランス語 / French |
| 3 | `de` | ドイツ語 / German |
| 4 | `it` | イタリア語 / Italian |
| 5 | `es` | スペイン語 / Spanish |
| 6 | `ko` | 韓国語 / Korean |
| 7 | `nl` | オランダ語 / Dutch |
| 8 | `pt` | ポルトガル語 / Portuguese |
| 9 | `ru` | ロシア語 / Russian |
| 10 | `en-GB` | 英語（英国） / UK English |
| 11 | `fr-CA` | フランス語（カナダ） / Canadian French |
| 12 | `es-419` | スペイン語（中南米） / Latin American Spanish |
| 13 | `zh-Hans` | 中国語（簡体） / Simplified Chinese |
| 14 | `zh-Hant` | 中国語（繁体） / Traditional Chinese |
| 15 | `pt-BR` | ポルトガル語（ブラジル） / Brazilian Portuguese |
| 16 | `pl` | ポーランド語 / Polish |
| 17 | `th` | タイ語 / Thai |

`ja` は復元先、残る17コードが変更先です。番号18/19はそれぞれ `ja`/`en-US` の重複で、選択肢には入れません。別の旧互換表の番号を混ぜないでください（そちらの7は `ko`）。実行時にも、その起動の `MakeLanguageCode` 応答を確認し、番号が違えば0〜17を読取り、一意に対応する場合だけ書込みに進みます。対象タイトルの表示言語は、そのタイトルの翻訳資源にも依存します。変換表と実機での読取りの詳細は [LANGUAGES.md](LANGUAGES.md)。

## 使い方 / Commands

Node.js 22以降。ソースだけの検査は `node run.cjs --check-only`（本体への接続・選択ダイアログ・START送信なし）。

```sh
node set-language.cjs --admission admission.json                 # Zenityで選択 / dialog
node set-language.cjs --language ko --admission admission.json   # 引数で指定 / argument
node enable-english.cjs --admission admission.json               # 米語 / US English
node restore-japanese.cjs --admission admission.json             # 日本語へ復元 / restore
```

必要なら各コマンド末尾に実行PCの有効なLAN IPv4を指定できます。省略時はローカルのRFC1918 IPv4から選択し、複数あるときは尋ねます。Zenityの取消・GUI不足・タイムアウトや指定コードとadmissionの不一致は、起動IDの消費・listener開始前に停止します。非英語のadmissionには選択コードと同じ `language` を入れます。`bootId`、`mode`（変更=`english`、復元=`restore`）に加え、`confirmedFreshOsBoot`、`confirmedNoPendingOwnedScratch`、`confirmedSavedNs2`、`confirmedStartUnused` の4項目を `true` にします。これらはオペレーターの申告欄なので、実際の起動・画面・SAVE状態を別に確認してください。

**本体の完全OS起動ごとにSTARTは1回。** 応答不明のSTARTは再送しません。失敗して所有SAVE scratchが残った場合、該当runのraw・全ファイル内容を照合し、**別の完全起動**で所有物だけを非再帰で回収してください。`recovery/` は検査・回収のライブラリで、汎用の実機清掃コマンドではありません。runログや接続トークンを公開Issueへ貼らないでください。本体の90DNS／オフライン設定を維持し、Nintendoオンライン・本体更新・工場出荷情報・PRODINFO・シリアル・鍵・DNSの変更は行いません。

## 構成と観測範囲 / Source and observations

- `bootstrap.bas` は本体FW 23.0.1／SmileBASIC 4.4.9で使った起動ソース。SDK相対オフセットとハッシュを検査します。異なるビルドへ任意の単一オフセットだけを流用しないでください。
- `engine/` は実機試行で使った取得・保持・FSメモリ・設定段階に由来するソースと、言語選択・復元の分岐を含みます。`set` のgetterと変換コマンド、`set:sys` の可変言語・地域setterを扱います。成功判定は設定値の即時読戻しです。
- 過去の実機観測は英語の本体設定画面、日本語への設定値復元、カービィ エアライダーの英語タイトル（同一起動）、全20番号の読取りです。再起動後の別の観測では地域1／`ja` が返りました。実行単位・結果の区別は [EVIDENCE.md](EVIDENCE.md) に記録しています。
- 言語選択・起動分岐・復元と回収コアのホストテストは `node --test admission.test.cjs host-network.test.cjs language-dialog.test.cjs recovery/recovery.test.cjs $(find engine -name '*.test.cjs' | sort)` で実行できます。

このソースは `pepsipu/ns2jb` コミット `95f5525089273c5fce0b95047f3600f8442e96ae` を基に変更しています。出典は [THIRD-PARTY.md](THIRD-PARTY.md)、試行ごとの証拠は [EVIDENCE.md](EVIDENCE.md) を参照してください。It changes mutable settings, not the console's hardware region/SKU, account country, or title-local translation resources.
