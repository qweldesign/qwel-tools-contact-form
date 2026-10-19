/**
 * Contact Form
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

/**
 * お問い合わせフォーム (入力 → 確認 → 完了)
 * 入力内容は sessionStorage で確認画面へ渡し, 確認画面から api/send.php へ送信する
 *
 * 入力画面: form[data-contact-form]
 *   ボット対策の見えない入力欄: [data-contact-honeypot] (確認画面には表示しない)
 * 確認画面: table[data-contact-confirm]
 *   ボタン: [data-contact-send], [data-contact-back]
 *   メッセージ: [data-contact-message]
 *   入力内容があるとき / ないときに表示する要素: [data-contact-filled], [data-contact-empty]
 */
export default class ContactForm {
  constructor(options = {}) {
    // SessionStorage
    this.storageKey = 'contact-form';

    // 各画面の URL
    this.formUrl    = options.formUrl    || './';
    this.confirmUrl = options.confirmUrl || 'confirm.html';
    this.thanksUrl  = options.thanksUrl  || 'thanks.html';
    this.sendUrl    = options.sendUrl    || './api/send.php';

    // 入力画面
    this.form = document.querySelector('[data-contact-form]');
    if (this.form) {
      this.formInit();
    }
    // 確認画面
    this.confirm = document.querySelector('[data-contact-confirm]');
    if (this.confirm) {
      this.confirmInit();
    }
  }

  // SessionStorage の入力内容 ({ values, hidden } または null)
  load() {
    try {
      const data = sessionStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  formInit() {
    // 確認画面から戻ってきたときは, 入力内容を戻す
    const stored = this.load();
    if (stored) this.restore(stored.values);

    // 確認ボタンのイベント登録
    this.form.addEventListener('submit', event => {
      event.preventDefault();

      // フォームのデータを SessionStorage に格納
      const formData = new FormData(this.form); // FormData をそのまま扱う (重複キー対応)
      const values = {};

      for (const key of new Set(formData.keys())) {
        const items = formData.getAll(key); // 同じキーの値を全部取得
        values[key] = items.length === 1 ? items[0] : items; // 1つなら文字列, 複数なら配列
      }

      // 確認画面に表示しない項目 (ボット対策の見えない入力欄)
      const hidden = Array.from(this.form.querySelectorAll('[data-contact-honeypot]'), elem => elem.name);

      sessionStorage.setItem(this.storageKey, JSON.stringify({ values, hidden }));

      // 確認画面へ遷移
      location.href = this.confirmUrl;
    });
  }

  restore(values) {
    for (const elem of this.form.elements) {
      if (!elem.name || !(elem.name in values) || elem.hasAttribute('data-contact-honeypot')) continue;
      const value = values[elem.name];
      if (elem.type === 'checkbox') {
        elem.checked = [].concat(value).includes(elem.value);
      } else if (elem.type === 'radio') {
        elem.checked = elem.value === value;
      } else if (elem.type !== 'submit') {
        elem.value = value;
      }
    }
  }

  confirmInit() {
    const stored = this.load();
    const filled = document.querySelector('[data-contact-filled]');
    const empty = document.querySelector('[data-contact-empty]');
    this.message = document.querySelector('[data-contact-message]');
    this.sendButton = document.querySelector('[data-contact-send]');

    // 入力内容がない (確認画面を直接開いた) 場合
    if (!stored) {
      if (empty) empty.hidden = false;
      return;
    }
    if (filled) filled.hidden = false;

    // values を順次処理
    const { values, hidden = [] } = stored;
    for (const key in values) {
      if (hidden.includes(key)) continue;

      const tr = document.createElement('tr');
      // キー: name属性
      const th = document.createElement('th');
      th.textContent = key;

      // 値 (配列対応)
      const td = document.createElement('td');
      td.textContent = Array.isArray(values[key]) ? values[key].join(', ') : values[key];

      tr.appendChild(th);
      tr.appendChild(td);
      this.confirm.appendChild(tr);
    }

    // 戻るボタン (入力画面で SessionStorage から入力内容を戻す)
    const backButton = document.querySelector('[data-contact-back]');
    if (backButton) {
      backButton.addEventListener('click', () => {
        location.href = this.formUrl;
      });
    }

    // 送信ボタン
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => this.send(values));
    }
  }

  showMessage(text) {
    if (!this.message) return;
    this.message.textContent = text;
    this.message.hidden = false;
  }

  async send(values) {
    // 二重送信防止
    if (this.sendButton) this.sendButton.disabled = true;
    if (this.message) this.message.hidden = true;

    // APIを使用して送信
    try {
      const res = await fetch(this.sendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (res.ok) {
        // 送信成功: SessionStorage を空にして, 完了画面へ遷移
        sessionStorage.removeItem(this.storageKey);
        location.href = this.thanksUrl;
        return;
      }

      // 送信失敗 (send.php は入力の不備などを JSON で返す)
      const body = await res.json().catch(() => ({}));
      if (res.status === 400 && body.errors) {
        this.showMessage(Object.values(body.errors).join('\n') + '\n前画面に戻って修正してください。');
      } else if (res.status === 429) {
        this.showMessage(`続けて送信することはできません。${body.retryAfter ?? 60}秒ほど待ってから、もう一度お試しください。`);
      } else {
        this.showMessage('送信に失敗しました。時間をおいて、もう一度お試しください。');
      }
    } catch (err) {
      // ネットワークエラー
      console.error('Network error:', err);
      this.showMessage('通信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。');
    }

    if (this.sendButton) this.sendButton.disabled = false;
  }
}
