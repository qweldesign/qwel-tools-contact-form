<?php
// PHPの部品と Composer のライブラリは inc/ に置く (inc/.htaccess でWebから読めない)
require dirname(__DIR__) . '/inc/vendor/autoload.php';
require dirname(__DIR__) . '/inc/env.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

mb_language('Japanese');
mb_internal_encoding('UTF-8');
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

// 1項目あたりの最大文字数
const MAX_LENGTH = 5000;

// レスポンスを返して終了する (入力の不備などはJSONで返す)
function respond(int $status, array $body = []): void {
  http_response_code($status);
  if ($body) echo json_encode($body, JSON_UNESCAPED_UNICODE);
  exit;
}

// URLの scheme://host[:port] (Origin, Referer の照合用)
function originOf(string $url): string {
  $parts = parse_url($url);
  if (empty($parts['scheme']) || empty($parts['host'])) return '';
  return strtolower($parts['scheme'] . '://' . $parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('Allow: POST');
  respond(405);
}

// 設定の読み込み (項目の説明は inc/.env.example を参照)
// .env を公開ディレクトリの外に置く場合は, このパスを書き換える
$envPath = dirname(__DIR__) . '/inc/.env';

try {
  $env = loadEnv($envPath);
  $siteTitle      = envRequired($env, 'SITE_TITLE');
  $siteUrl        = envRequired($env, 'SITE_URL');
  $adminEmail     = envRequired($env, 'ADMIN_EMAIL');
  $smtp = [
    'host'   => envRequired($env, 'SMTP_HOST'),
    'user'   => envRequired($env, 'SMTP_USER'),
    'pass'   => envRequired($env, 'SMTP_PASS'),
    'port'   => (int)($env['SMTP_PORT'] ?? 587),
    'secure' => strtolower($env['SMTP_SECURE'] ?? 'tls'),
  ];
  $requiredFields  = envList($env, 'REQUIRED_FIELDS');
  $emailField           = $env['EMAIL_FIELD'] ?? 'Email';
  $mailFooter      = $env['MAIL_FOOTER'] ?? '';
  $honeypot        = $env['HONEYPOT_FIELD'] ?? 'website_url';
  $sendInterval   = (int)($env['SEND_INTERVAL'] ?? 60);
} catch (RuntimeException $e) {
  // 設定ミスの内容はサーバーのログにだけ残す
  error_log('お問い合わせフォームの設定エラー: ' . $e->getMessage());
  respond(500);
}

// Origin チェック & Referer チェック (CSRF対策)
// scheme://host[:port] が SITE_URL と完全に一致しない送信元は弾く
// (先頭一致だと https://qwel.design.example.com なども通ってしまうため)
$siteOrigin = originOf($siteUrl);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
// Origin が不正 OR Referer が不正 → 弾く
if (
  ($origin !== '' && strtolower($origin) !== $siteOrigin) ||
  ($referer !== '' && originOf($referer) !== $siteOrigin)
) {
  respond(403);
}

// データ取得
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
  respond(400);
}

// ボット対策: 見えない入力欄 (ハニーポット) に値があれば, 送ったふりをして破棄する
if ($honeypot !== '' && trim((string) ($data[$honeypot] ?? '')) !== '') {
  respond(204);
}
unset($data[$honeypot]);

// 送信間隔の制限 (同じセッションから続けて送信できないようにする. 0 で制限しない)
if ($sendInterval > 0) {
  session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Lax',
    'cookie_secure'   => strpos($siteUrl, 'https://') === 0,
  ]);
  $wait = $sendInterval - (time() - (int)($_SESSION['contactSentAt'] ?? 0));
  if ($wait > 0) {
    respond(429, ['retryAfter' => $wait]);
  }
}

// バリデーション
$errors = [];

// 値は文字列, または文字列の配列 (チェックボックス) のみ受け付ける
foreach ($data as $key => $value) {
  $items = is_array($value) ? $value : [$value];
  foreach ($items as $item) {
    if (!is_string($item)) {
      $errors[$key] = "{$key}の値が正しくありません";
    } elseif (mb_strlen($item) > MAX_LENGTH) {
      $errors[$key] = "{$key}が長すぎます";
    }
  }
}

// 必須項目
foreach ($requiredFields as $key) {
  $value = $data[$key] ?? '';
  if (is_array($value) ? !array_filter($value, 'strlen') : trim((string) $value) === '') {
    $errors[$key] = "{$key}を入力してください";
  }
}

// Email の厳密バリデーション (ヘッダインジェクション対策を兼ねて, 改行を含むものも弾く)
$userEmail = $data[$emailField] ?? '';
if (!isset($errors[$emailField]) && (!is_string($userEmail) || preg_match('/[\r\n]/', $userEmail) || !filter_var($userEmail, FILTER_VALIDATE_EMAIL))) {
  $errors[$emailField] = "{$emailField}の形式が正しくありません";
}

if ($errors) {
  respond(400, ['errors' => $errors]);
}

// メール本文作成
$mailBody = postToMail($data);

// メール送信
try {
  // 管理者宛
  $mail1 = createMailer($smtp);

  $mail1->setFrom($adminEmail, $siteTitle);
  $mail1->addAddress($adminEmail);
  $mail1->addReplyTo($data[$emailField]);
  $mail1->Subject = "{$siteTitle} からのお問い合わせ";
  $mail1->Body    = "以下の内容で受け付けました。\n\n" . $mailBody;
  $mail1->send();

} catch (Exception $e) {
  // 管理者宛が失敗したらエラー
  error_log('お問い合わせフォームの送信に失敗しました: ' . $e->getMessage());
  respond(500);
}

// 自動返信は別で処理 (失敗してもユーザーにはエラーを返さない)
try {
  $mail2 = createMailer($smtp);

  $mail2->setFrom($adminEmail, $siteTitle);
  $mail2->addAddress($data[$emailField]);
  $mail2->Subject = "{$siteTitle} へのお問い合わせありがとうございます";
  $mail2->Body    = "以下の内容で受け付けました。\n\n" . $mailBody . $mailFooter;
  $mail2->send();

} catch (Exception $e) {
  // 自動返信失敗はログだけ残して続行 (ユーザーにはエラーにしない)
  error_log('自動返信失敗: ' . $e->getMessage() . ' 宛先: ' . $data[$emailField]);
}

// 送信間隔の制限のため, 送信した時刻を記録する
if ($sendInterval > 0) {
  $_SESSION['contactSentAt'] = time();
}

respond(204);

// POST データをメール本文に変換
function postToMail(array $post): string {
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
    // 暗号化なし (ローカルのテスト用メールサーバー向け)
    $mail->SMTPSecure = '';
    $mail->SMTPAutoTLS = false;
  } else {
    $mail->SMTPSecure = $smtp['secure'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
  }
  $mail->Port       = $smtp['port'];
  $mail->CharSet    = 'UTF-8';

  return $mail;
}
