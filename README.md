# Switch 2 の言語設定を変更する

Switch 2 の `set` / `set:sys` を使って、本体の言語設定を書き換える実験コード。`pepsipu/ns2jb` をベースに、17言語の選択と日本語への復元を追加した。

試した環境は **FW 23.0.1 / SmileBASIC 4.4.9**。

## 実行

Node.js 22以降が必要。言語をダイアログから選ぶ場合は Zenity も必要。LinuxでINPUTを遮断する環境ではPython 3・`sudo -n nft`が必要。通常のNodeコマンドが、本体のLANアドレスに限定した一時許可を自動で付け、終了時に元へ戻す。

```sh
node set-language.cjs --boot-id NEW_BOOT_ID_123456                                  # 言語を選ぶ
node set-language.cjs --language ko --boot-id NEW_BOOT_ID_123456 --peer-ip SWITCH_IP  # 韓国語に変更
node enable-english.cjs --boot-id NEW_BOOT_ID_123456 --peer-ip SWITCH_IP              # 英語に変更
node restore-japanese.cjs --boot-id NEW_BOOT_ID_123456 --peer-ip SWITCH_IP            # 日本語に戻す
```

`SWITCH_IP` は本体のLAN側IPv4に置き換える。省略した場合はPCアドレスの選択後に本体IPを尋ねる（非対話では `--peer-ip` 必須）。PCのLAN IPv4が複数ある場合は末尾に `PC_IP` を付けるか、表示される一覧から選ぶ。コマンドは本体にSTARTを送らない。一時許可はこのpeer→PCのTCP 39380だけで、待受の終了・Ctrl-C時に元へ戻す。待受前の許可・権限・LAN経路検証に失敗した場合は、起動IDを消費せずに止まる。実際のTCP接続成功までは保証しない。`BOOT FAILED 58` はTCP接続失敗なので、その起動でSTARTを再送しない。`runs/` の原本を保管し、別の完全OS起動で原因を直してから新しいIDを使う。

上の4行は別々の実行例。`NEW_BOOT_ID_123456` を実際の新しい起動IDへ置き換える。同じ完全OS起動では**どれか1回だけ**使い、起動ごとに `--boot-id` を新しい値（英数字・`_`・`-` の16〜64文字）にする。使用済みIDは記録され、同じIDでの再実行は止まる。JSONファイルは不要。起動の新しさやSAVE内の残留物は自動判定しないので、START未使用と作業ファイルの有無を実行前に確認する。言語選択のキャンセルや不正な指定は、待受開始・起動ID消費前に止まる。

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

### 失敗して応答がなくなったら

1. **STARTを再送しない。** PC側の `runs/` を丸ごと手元に保管する。`connect.txt` / `connection.json` には接続情報があるので、公開Issueに添付しない。
2. まず `node recovery/recover-owned-save.cjs --check-only` を実行する。これは本体に接続せず、未回収の実行が**ちょうど1件**で、そのraw・作成元ソース・言語変更前の失敗記録から本コードの51個の作業ファイルを一意に特定できる場合だけ `pending:true` を表示する。対象外や記録の不一致では止まる。
3. `pending:true` の場合、失敗した起動とは**別の完全OS起動**でSmileBASIC Directを開き、保存済みNS2をLOAD/RUN/REMOVEして想定のOOM表示まで準備する。STARTがまだ未使用で、PCと本体が同じLANにあることを確認する。
4. PCのターミナルで次を実行する。`SWITCH_IP` は本体のLAN側IPv4、`--boot-id` は**回収専用の新しい起動ID**。PCのLANアドレスが複数ある場合は `--host-ip PC_IP` を付けるか一覧から選ぶ。

   ```sh
   node recovery/recover-owned-save.cjs --run --boot-id NEW_RECOVERY_BOOT_ID --peer-ip SWITCH_IP
   ```

5. 表示された新しい `V=START(...)` 1行をSmileBASICに入力して内容を確認し、Enterを**1回だけ**押す。このコマンドは本体へのキー入力を代行しない。`OWNED_SAVE_RECOVERY_VERIFIED` と51件の削除・commit・新しいSAVE参照での不在・セッション解放が出たときだけ回収完了。失敗・中断・応答なしなら `runs/` と `recovery-runs/` を保存し、同じ起動でSTARTや回収コマンドを再実行しない。次の言語変更には、さらに**別の完全OS起動**と新しいIDが必要。

この回収入口は、同じ作成元ソースによる**言語変更前のFS段階で失敗した完全な51件のSAVEツリー**だけを扱う。部分作成・設定変更後・複数の未回収実行には自動対応しない。削除前に全ディレクトリとファイル内容を照合し、異物があれば止まる。OS起動や画面の新しさはPCから自動証明できないため、3の確認なしに `--run` しない。再帰削除はしない。

90DNS／オフライン設定を維持する。Nintendoのオンライン接続や本体更新、PRODINFO・シリアル・鍵・DNSの変更は行わない。ログや接続トークンは公開Issueに貼らないこと。

## テスト

`bootstrap.bas` は上記FW・SmileBASICで使った起動ソース。SDK相対オフセットとハッシュを検査するので、別ビルドにオフセットだけ流用しないこと。`engine/` にFSメモリ・設定操作、`recovery/` に回収処理がある。

```sh
node run.cjs --check-only  # 本体に接続せずにチェック（ダイアログ・START送信なし）
node --test boot-journal.test.cjs host-network.test.cjs lan-firewall.test.cjs language-dialog.test.cjs recovery/*.test.cjs $(find engine -name '*.test.cjs' | sort)
```

元コード：[`pepsipu/ns2jb`（95f5525）](https://github.com/pepsipu/ns2jb/commit/95f5525089273c5fce0b95047f3600f8442e96ae) / [THIRD-PARTY.md](THIRD-PARTY.md)
