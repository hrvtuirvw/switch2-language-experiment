# Switch 2 の言語設定を変更する

Switch 2 の `set` / `set:sys` を使って、本体の言語設定を書き換える実験コード。`pepsipu/ns2jb` をベースに、17言語の選択と日本語への復元を追加した。

試した環境は **FW 23.0.1 / SmileBASIC 4.4.9**。

## 実行

Node.js 22以降が必要。言語をダイアログから選ぶ場合は Zenity も必要。

```sh
node set-language.cjs --admission admission.json                  # 言語を選ぶ
node set-language.cjs --language ko --admission admission.json    # 韓国語に変更
node enable-english.cjs --admission admission.json                # 英語に変更
node restore-japanese.cjs --admission admission.json              # 日本語に戻す
```

PCのLAN側IPv4アドレスは自動で選ぶ。候補が複数ある場合はターミナルで番号を選ぶ。手動指定するならコマンド末尾にIPv4アドレスを付ける。

`admission.json` には `bootId`、`mode`（変更は `english`、復元は `restore`）を指定。英語以外に変更するときは `language` に選択した言語コードを入れる。以下の4項目はすべて `true` にする。

- `confirmedFreshOsBoot`
- `confirmedNoPendingOwnedScratch`
- `confirmedSavedNs2`
- `confirmedStartUnused`

これは実機の状態を自動確認する機能ではない。4項目を満たしているか、自分で確認してから実行する。言語選択のキャンセルや指定不一致は、待受開始・起動ID消費前に止まる。

## 言語コード

| 番号 | コード | 言語 |
| ---: | --- | --- |
| 0 | `ja` | 日本語（復元用） |
| 1 | `en-US` | 英語（米国） |
| 2 | `fr` | フランス語 |
| 3 | `de` | ドイツ語 |
| 4 | `it` | イタリア語 |
| 5 | `es` | スペイン語 |
| 6 | `ko` | 韓国語 |
| 7 | `nl` | オランダ語 |
| 8 | `pt` | ポルトガル語 |
| 9 | `ru` | ロシア語 |
| 10 | `en-GB` | 英語（英国） |
| 11 | `fr-CA` | フランス語（カナダ） |
| 12 | `es-419` | スペイン語（中南米） |
| 13 | `zh-Hans` | 中国語（簡体字） |
| 14 | `zh-Hant` | 中国語（繁体字） |
| 15 | `pt-BR` | ポルトガル語（ブラジル） |
| 16 | `pl` | ポーランド語 |
| 17 | `th` | タイ語 |

`0` は復元用。`18` と `19` はそれぞれ `ja` / `en-US` の重複なので選択肢から外した。

旧互換表とは番号が違う（旧表の `7` は `ko`）。実行時に `MakeLanguageCode` を照合し、対応が異なる場合は `0`〜`17` を読み直す。一意に特定できない言語には書き込まない。詳しくは [LANGUAGES.md](LANGUAGES.md)。

## どこまで動いたか

過去の実機試行では、次の結果を得ている。

- `MakeLanguageCode(0..19)` の20件すべてが、参照した設定NSOの変換表と一致（言語コード・8バイト応答）。
- 地域 `1` / `en-US` を読戻し、本体設定画面が英語になった。
- 別の実機試行では、同じ起動中に `en-US` の読戻しと『カービィ エアライダー』の英語タイトルを確認した。
- 日本語の設定値への復元も確認。
- 再起動後の別の試行では地域 `1` / `ja` が返った。

**この統合版を最初から最後まで動かした記録はまだない。** 設定変更の判定は書込み直後の読戻しで行う。再起動後に日本語へ戻った観測もある。実行ごとの記録は [EVIDENCE.md](EVIDENCE.md)。

書き換えるのは本体の可変設定値だけ。ハードウェアの地域区分やアカウントの国設定、ゲームの翻訳データは変わらない。

## 注意

**STARTは本体の完全OS起動1回につき1回。** 応答がなくても再送しない。

失敗してSAVE内に作業ファイルが残った場合は、その実行のraw記録とファイル内容を照合し、次の完全起動で本コードが作成したものだけ回収する。再帰削除はしない。`recovery/` は回収処理のライブラリで、一括削除コマンドではない。

90DNS／オフライン設定を維持する。Nintendoのオンライン接続や本体更新、PRODINFO・シリアル・鍵・DNSの変更は行わない。ログや接続トークンは公開Issueに貼らないこと。

## テスト

`bootstrap.bas` は上記FW・SmileBASICで使った起動ソース。SDK相対オフセットとハッシュを検査するので、別ビルドにオフセットだけ流用しないこと。`engine/` にFSメモリ・設定操作、`recovery/` に回収処理がある。

```sh
node run.cjs --check-only  # 本体に接続せずにチェック（ダイアログ・START送信なし）
node --test admission.test.cjs host-network.test.cjs language-dialog.test.cjs recovery/recovery.test.cjs $(find engine -name '*.test.cjs' | sort)
```

元コード：[`pepsipu/ns2jb`（95f5525）](https://github.com/pepsipu/ns2jb/commit/95f5525089273c5fce0b95047f3600f8442e96ae) / [THIRD-PARTY.md](THIRD-PARTY.md)
