## QWEL Contact Form

軽量・シンプルなお問い合わせフォーム

▶ Sample DEMO: [https://qwel.design/tools/contact-form/]

## セットアップ

1. `inc/` で `composer install` を実行し、PHPMailer を導入する
2. `inc/.env.example` を `inc/.env` としてコピーし、サイト・SMTP・項目などの設定を書き換える
3. `api/` と `inc/` (`inc/vendor/` を含む) をサーバーにアップロードする

設定はすべて `inc/.env` に書く (各項目の説明は `inc/.env.example` を参照)。`.env` には SMTP のパスワードが含まれるため Git には含めない。`inc/.htaccess` で `inc/` ごと Web から読めないようにしているが、可能であれば公開ディレクトリの外に置き、`api/send.php` の `$env_path` を書き換えるとより安全。

### 構成

```
index.html, confirm.html, thanks.html  入力・確認・完了の画面
api/send.php                           送信 (確認画面から JSON で POST される. Web に公開する)
inc/                                   PHP の部品・設定 (Web からは読めない)
  env.php                              .env の読み込み
  composer.json                        PHPMailer (composer install で inc/vendor/ に入る)
  .env.example                         設定の見本 (.env としてコピーして使う)
```

設定に不備があると `send.php` は 500 を返し、内容をサーバーのエラーログに残す。

## 迷惑メール対策

- Origin / Referer のチェック: 送信元の `scheme://host[:port]` が `SITE_URL` と完全に一致しない送信は 403 で弾く
- ハニーポット: 人には見えない入力欄 (`index.html` の `data-contact-honeypot`) に値があれば、送ったふりをして破棄する。name 属性は `.env` の `HONEYPOT_FIELD` と合わせる
- 送信間隔の制限: 同じセッションから `SEND_INTERVAL` 秒以内に続けて送信すると 429 を返す (`0` で制限しない)

入力の不備 (必須項目が空、メールアドレスの形式など) は 400 と、項目ごとのメッセージを JSON で返し、確認画面に表示する。

## ライセンス | License

MIT License

詳しくは LICENSE ファイルをご覧ください。  
See the LICENSE file for details.  

---

## 制作者 | Author

[QWEL.DESIGN](https://qwel.design)  
福井を拠点に活動するフロントエンド開発者  
Front-end developer based in Fukui, Japan  
