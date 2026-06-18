<?php
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

mb_language('Japanese');
mb_internal_encoding('UTF-8');

// 設定項目
// サイト設定
$site_title = 'QWEL.DESIGN';
$site_url = 'https://qwel.design';
$admin_email = 'webmaster@qwel.design';

// SMTP設定（heteml想定）
$smtp_host = 'smtp.hetemail.jp';
$smtp_user = 'webmaster@qwel.design';
$smtp_pass = '******'; // ← 必ず書き換える!!
$smtp_port = 587;

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
// Originが不正 OR Refererが不正 → 弾く
if (
  ($origin && strpos($origin, $site_url) !== 0) ||
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

// メール本文作成
$mailBody = postToMail($data);

// メール送信
try {
  // 管理者宛
  $mail1 = new PHPMailer(true);
  $mail1->isSMTP();
  $mail1->Host       = $smtp_host;
  $mail1->SMTPAuth   = true;
  $mail1->Username   = $smtp_user;
  $mail1->Password   = $smtp_pass;
  $mail1->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  $mail1->Port       = $smtp_port;
  $mail1->CharSet    = 'UTF-8';

  $mail1->setFrom($admin_email, $site_title);
  $mail1->addAddress($admin_email);
  $mail1->addReplyTo($data[$Email]);
  $mail1->Subject = "{$site_title} からのお問い合わせ";
  $mail1->Body    = "以下の内容で受け付けました。\n\n" . $mailBody;
  $mail1->send();

} catch (Exception $e) {
  // 管理者宛が失敗したらエラー
  http_response_code(500);
  exit;
}

// 自動返信は別で処理 (失敗してもユーザーにはエラーを返さない)
try {
  $mail2 = new PHPMailer(true);
  $mail2->isSMTP();
  $mail2->Host       = $smtp_host;
  $mail2->SMTPAuth   = true;
  $mail2->Username   = $smtp_user;
  $mail2->Password   = $smtp_pass;
  $mail2->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  $mail2->Port       = $smtp_port;
  $mail2->CharSet    = 'UTF-8';

  $mail2->setFrom($admin_email, $site_title);
  $mail2->addAddress($data[$Email]);
  $mail2->Subject = "{$site_title} へのお問い合わせありがとうございます";
  $mail2->Body    = "以下の内容で受け付けました。\n\n" . $mailBody . $mailFooter;
  $mail2->send();

} catch (Exception $e) {
  // 自動返信失敗はログだけ残して続行 (ユーザーにはエラーにしない)
  error_log('自動返信失敗: ' . $e->getMessage() . ' 宛先: ' . $data[$Email]);
}

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
