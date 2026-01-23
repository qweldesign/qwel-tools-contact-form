<?php
mb_language('Japanese');
mb_internal_encoding('UTF-8');

// 設定項目
// サイト設定
$site_title = 'QWEL.DESIGN';
$site_url = 'https://qwel.design';
$admin_email = 'webmaster@qwel.design';

// 署名設定
$mailFooter = <<< TEXT

後日ご返信致しますので今しばらくお待ちください。

────────────────────────────────────────────────
福井の物作りのためのweb制作&プログラミング教室
QWEL.DESIGN (クヴェル・デザイン)

伊藤 大悟 (代表)
────────────────────────────────────────────────

TEXT;

// 項目設定 (任意)
$require_fields = ['お名前', 'Email', '件名', 'メッセージ本文']; // 必須項目
$Email = 'Email'; // フォームのEmail入力箇所のname属性の値

// Originチェック & Refererチェック (CSRF対策)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
if (
  ($origin && strpos($origin, $site_url) !== 0) &&
  ($referer && strpos($referer, $site_url) !== 0)
) {
  http_response_code(403);
  exit;
}

// データ取得
$data = json_decode(file_get_contents('php://input'), true);

// バリデーション
foreach($require_fields as $key) {
  if (empty($data[$key])) {
    http_response_code(400);
    exit;
  }
}

// Emailの厳密バリデーション
if (!filter_var($data[$Email], FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  exit;
}

// ヘッダインジェクション対策
if (preg_match('/[\r\n]/', $data[$Email])) {
  http_response_code(400);
  exit('不正な入力が検出されました');
}

// メールヘッダ作成
$mailHeader = implode("\r\n", [
  "From: {$site_title} <{$admin_email}>",
  "Reply-To: {$data[$Email]}",
]);

// メール本文作成
$mailBody = postToMail($data);

// 管理者宛
mb_send_mail(
  $admin_email,
  "{$site_title} からのお問い合わせ",
  "以下の内容で受け付けました。\n\n" . $mailBody,
  $mailHeader
);

// 自動返信
mb_send_mail(
  $data[$Email],
  "{$site_title} へのお問い合わせありがとうございます",
  "以下の内容で受け付けました。\n\n" . $mailBody . $mailFooter,
  "From: {$site_title} <{$admin_email}>"
);

http_response_code(204);

// POSTデータをメール本文に変換
function postToMail(array $post) {
  $body = '';

  foreach ($post as $key => $value) {
    if ($key === 'csrf_token') continue;

    // 配列対応
    if (is_array($value)) {
      $value = implode(', ', $value);
    }

     $body .= "{$key}: {$value}\n";
  }

  return $body;
}
