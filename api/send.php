<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/lib/env.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

mb_language('Japanese');
mb_internal_encoding('UTF-8');

// 設定の読み込み（項目の説明は .env.example を参照）
// .env を公開ディレクトリの外に置く場合は、このパスを書き換える
$env_path = __DIR__ . '/.env';

try {
  $env = load_env($env_path);
  $site_title      = env_required($env, 'SITE_TITLE');
  $site_url        = env_required($env, 'SITE_URL');
  $admin_email     = env_required($env, 'ADMIN_EMAIL');
  $smtp = [
    'host'   => env_required($env, 'SMTP_HOST'),
    'user'   => env_required($env, 'SMTP_USER'),
    'pass'   => env_required($env, 'SMTP_PASS'),
    'port'   => (int) ($env['SMTP_PORT'] ?? 587),
    'secure' => strtolower($env['SMTP_SECURE'] ?? 'tls'),
  ];
  $require_fields  = env_list($env, 'REQUIRED_FIELDS');
  $Email           = $env['EMAIL_FIELD'] ?? 'Email';
  $mailFooter      = $env['MAIL_FOOTER'] ?? '';
} catch (RuntimeException $e) {
  // 設定ミスの内容はサーバーのログにだけ残す
  error_log('お問い合わせフォームの設定エラー: ' . $e->getMessage());
  http_response_code(500);
  exit;
}

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
  $mail1 = createMailer($smtp);

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
  $mail2 = createMailer($smtp);

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

// SMTP の設定を済ませた PHPMailer を作る
function createMailer(array $smtp): PHPMailer {
  $mail = new PHPMailer(true);
  $mail->isSMTP();
  $mail->Host       = $smtp['host'];
  $mail->SMTPAuth   = true;
  $mail->Username   = $smtp['user'];
  $mail->Password   = $smtp['pass'];
  if ($smtp['secure'] === 'none') {
    // 暗号化なし（ローカルのテスト用メールサーバー向け）
    $mail->SMTPSecure = '';
    $mail->SMTPAutoTLS = false;
  } else {
    $mail->SMTPSecure = $smtp['secure'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
  }
  $mail->Port       = $smtp['port'];
  $mail->CharSet    = 'UTF-8';

  return $mail;
}
