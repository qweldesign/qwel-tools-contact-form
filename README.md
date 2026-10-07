## QWEL Contact Form

軽量・シンプルなお問い合わせフォーム

▶ Sample DEMO: [https://qwel.design/tools/contact-form/]

## セットアップ

1. `api/` で `composer install` を実行し、PHPMailer を導入する
2. `api/.env.example` を `api/.env` としてコピーし、サイト・SMTP・項目などの設定を書き換える
3. `api/` ごとサーバーにアップロードする

設定はすべて `api/.env` に書く（各項目の説明は `api/.env.example` を参照）。`.env` には SMTP のパスワードが含まれるため Git には含めない。`api/.htaccess` で Web から読めないようにしているが、可能であれば公開ディレクトリの外に置き、`api/send.php` の `$env_path` を書き換えるとより安全。

設定に不備があると `send.php` は 500 を返し、内容をサーバーのエラーログに残す。

## ライセンス | License

MIT License

詳しくは LICENSE ファイルをご覧ください。  
See the LICENSE file for details.  

---

## 制作者 | Author

[QWEL.DESIGN](https://qwel.design)  
福井を拠点に活動するフロントエンド開発者  
Front-end developer based in Fukui, Japan  
