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

// メール本文作成
$mailBody = postToMail($data);

// メール送信
try {
  $mail = new PHPMailer(true);
  $mail->isSMTP();
  $mail->Host       = $smtp_host;
  $mail->SMTPAuth   = true;
  $mail->Username   = $smtp_user;
  $mail->Password   = $smtp_pass;
  $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  $mail->Port       = $smtp_port;

  $mail->CharSet = 'UTF-8';

  // 管理者宛
  $mail->setFrom($admin_email, $site_title);
  $mail->addAddress($admin_email);
  $mail->addReplyTo($data[$Email]);

  $mail->Subject = "{$site_title} からのお問い合わせ";
  $mail->Body    = "以下の内容で受け付けました。\n\n" . $mailBody;
  $mail->send();

  $mail->clearAddresses();
  $mail->clearReplyTos();

  // 自動返信
  $mail->setFrom($admin_email, $site_title);
  $mail->addAddress($data[$Email]);

  $mail->Subject = "{$site_title} へのお問い合わせありがとうございます";
  $mail->Body    = "以下の内容で受け付けました。\n\n" . $mailBody . $mailFooter;
  $mail->send();

} catch (Exception $e) {
  http_response_code(500);
  exit;
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
