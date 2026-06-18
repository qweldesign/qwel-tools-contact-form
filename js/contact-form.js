/**
 * Contact Form
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

export default class ContactForm {
  constructor() {
    // SessionStorage
    this.storageKey = 'contact-form';

    // 入力画面
    this.form = document.querySelector('[data-contact-form]');
    if (this.form) {
      this.formInit();
    }
    // 確認画面
    this.confirm = document.querySelector('[data-contact-confirm]')
    if (this.confirm) {
      this.confirmInit();
    }
  }

  formInit() {
    // 確認ボタンのイベント登録
    this.form.addEventListener('submit', event => {
      event.preventDefault();

      // フォームのデータを SessionStorage に格納
      const formData = new FormData(this.form); // FormData をそのまま扱う (重複キー対応)
      const data = {};

      for (const key of formData.keys()) {
        const values = formData.getAll(key); // 同じキーの値を全部取得
        data[key] = values.length === 1 ? values[0] : values; // 1つなら文字列, 複数なら配列
      }

      sessionStorage.setItem(this.storageKey, JSON.stringify(data));

      // 確認画面へ遷移
      location.href = 'confirm.html';
    })
  }

  confirmInit() {
    // 確認画面
    const data = sessionStorage.getItem(this.storageKey);
    if (data) {
      const values = JSON.parse(data);

      // values を順次処理
      for (const key in values) {
        const tr = document.createElement('tr');
        // キー: name属性
        const th = document.createElement('th');
        th.textContent = key;

        // 値
        const td = document.createElement('td');
        let value = values[key];
        // 配列対応
        if (Array.isArray(values[key])) {
          value = value.join(', ');
        }
        td.textContent = value;

        tr.appendChild(th);
        tr.appendChild(td);
        this.confirm.appendChild(tr);
      }
    }

    // 戻るボタン
    const backButton = document.querySelector('[data-contact-back]');
    if (backButton) {
      // 戻るボタンのイベント登録
      backButton.addEventListener('click', () => history.back());
    }

    // 送信ボタン
    const sendButton = document.querySelector('[data-contact-send]');
    if (sendButton) {
      // 送信ボタンのイベント登録
      sendButton.addEventListener('click', this.send.bind(this));
    }
  }

  async send() {
    const data = sessionStorage.getItem(this.storageKey);
    if (!data) return;

    // 二重送信防止
    const sendButton = document.querySelector('[data-contact-send]');
    if (sendButton) sendButton.disabled = true;

    // APIを使用して送信
    try {
      const res = await fetch('./api/send.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data
      });

      if (res.ok) {
        // 送信成功
        // SessionStorage を空に
        sessionStorage.removeItem(this.storageKey);
        // 完了画面へ遷移
        location.href = 'thanks.html';
      } else {
        // 送信失敗
        const errorText = await res.text(); // PHPのエラー内容も取得
        console.error('Server error:', errorText);
        alert('送信に失敗しました（サーバーエラー）');
        if (sendButton) sendButton.disabled = false;
      }
    } catch (err) {
      // ネットワークエラー
      console.error('Network error:', err);
      alert('送信に失敗しました（通信エラー）');
      if (sendButton) sendButton.disabled = false;
    }
  }
}
