/**
 * Modal
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

/**
 * モーダルウィンドウとして機能するギャラリー
 * ハッシュ(#)による履歴保持対応
 *
 * 使い方:
 * _modal.scss をバンドルしたcssを読み込み,
 * ギャラリー (画像リストを含むラッパー要素) に [data-gallery="modal"] 属性を付与し,
 * 画像を開くリンクには href 属性と [data-gallery-src="[imagepath]"] 属性を付与する
 *
 * オプション:
 * breakpoint: 指定のBP未満のビューポートでは発火しない
 * syncWithHistory: hash を使用して履歴を残す (既定でON)
 */

export default class Modal {
  constructor(elem, options = {}) {
    // 指定のBP未満のビューポートでは発火しない
    const breakpoint = options.breakpoint ?? 600;
    if (window.innerWidth < breakpoint) return;

    // hash を使用して履歴を残す (既定でON)
    const syncWithHistory = options.syncWithHistory ?? true;

    // 要素
    this.elem = elem ?? document.querySelector('[data-gallery="modal"]');
    if (!this.elem) return;
    this.links = Array.from(this.elem.querySelectorAll('[data-gallery-src]'));
    if (!this.links.length) return;

    // 状態管理
    this.isShown = false;
    this.index = 0;
    if (syncWithHistory) {
      // hash と data 属性の値のセットをマップとして保持
      this.map = [];
      this.links.forEach((elem, order) => {
        const hash = elem.getAttribute('href').slice(1);
        const src = elem.dataset.gallerySrc;
        this.map.push({ hash, src });
      });
    }

    // 各要素生成
    this.createModal();

    // イベント登録
    this.handleEvents(syncWithHistory);

    // 初期表示
    if (syncWithHistory && location.hash) this.hashChangeHandler();
  }

  createModal() {
    // .modal: body 末尾に挿入されるラッパー要素
    this.modal = document.createElement('div');
    this.modal.classList.add('modal', 'is-hidden'); // opacity: 0
    this.modal.setAttribute('aria-hidden', 'true'); // visibility: hidden
    document.body.appendChild(this.modal);

    // .modal__container: モーダル本体
    this.container = document.createElement('div');
    this.container.classList.add('modal__container');
    this.modal.appendChild(this.container);

    // .modal__image: モーダル内の拡大表示する画像
    this.image = document.createElement('img');
    this.image.classList.add('modal__image', 'is-loaded');
    this.container.appendChild(this.image);

    // .modal__overlay: オーバーレイ (クリック操作で閉じる)
    this.overlay = document.createElement('div');
    this.overlay.classList.add('modal__overlay');
    this.modal.appendChild(this.overlay);

    // .modal__close: 閉じるボタン
    this.close = document.createElement('div');
    this.close.classList.add('modal__close');
    const closeIcon = document.createElement('div');
    closeIcon.classList.add('icon', 'is-close', 'is-lg');
    const closeSpan = document.createElement('span');
    closeSpan.classList.add('icon__span');
    closeIcon.appendChild(closeSpan);
    this.close.appendChild(closeIcon);
    this.modal.appendChild(this.close);

    // .modal__prev: 前へボタン
    this.prev = document.createElement('div');
    this.prev.classList.add('modal__prev');
    const prevIcon = document.createElement('div');
    prevIcon.classList.add('icon', 'is-chevron-left', 'is-lg');
    const prevSpan = document.createElement('span');
    prevSpan.classList.add('icon__span');
    prevIcon.appendChild(prevSpan);
    this.prev.appendChild(prevIcon);
    this.modal.appendChild(this.prev);

    // .modal__next: 次へボタン
    this.next = document.createElement('div');
    this.next.classList.add('modal__next');
    const nextIcon = document.createElement('div');
    nextIcon.classList.add('icon', 'is-chevron-right', 'is-lg');
    const nextSpan = document.createElement('span');
    nextSpan.classList.add('icon__span');
    nextIcon.appendChild(nextSpan);
    this.next.appendChild(nextIcon);
    this.modal.appendChild(this.next);
  }

  // hash を使用して履歴を残す場合は, 各メソッドに pushState を追加
  handleEvents(withSync) {
    // 開く
    this.links.forEach((item, i) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        this.change(i, withSync);
      });
    });

    // 閉じる
    this.overlay.addEventListener('click', () => this.hide(withSync));
    this.close.addEventListener('click', () => this.hide(withSync));

    // 移動
    this.prev.addEventListener('click', () => this.change(this.index - 1, withSync));
    this.next.addEventListener('click', () => this.change(this.index + 1, withSync));

    // hashchange を監視
    if (withSync) {
      window.addEventListener('hashchange', this.hashChangeHandler.bind(this));
    }
  }

  change(index, withSync) {
    this.index = (index + this.links.length) % this.links.length;
    if (withSync) {
      history.pushState(this.map[this.index], '', `#${this.map[this.index].hash}`);
    }
    const item = this.links[this.index];
    const src = item.dataset.gallerySrc;
    this.show(src);
  }

  show(src) {
    if (!this.isShown) {
      // モーダルを開く
      this.modal.classList.remove('is-hidden');
      this.modal.setAttribute('aria-hidden', 'false');
      this.isShown = true;
    }

    // 画像切り替え
    if (this.image.getAttribute('src')) {
      this.transitionEnd(this.image, () => {
        this.image.classList.remove('is-loaded');
      }).then(() => {
        this.image.setAttribute('src', src);
        this.image.classList.add('is-loaded');
      });
    } else {
      // 初期
      this.image.setAttribute('src', src);
      this.image.classList.add('is-loaded');
    }
  }

  hide(withSync) {
    if (withSync) {
      history.pushState(null, '', location.pathname + location.search);
    }
    this.transitionEnd(this.modal, () => {
      this.modal.classList.add('is-hidden');
    }).then(() => {
      this.modal.setAttribute('aria-hidden', 'true');
    });
    this.isShown = false;
  }

  hashChangeHandler() {
    const hash = location.hash.slice(1);
    const index = this.map.findIndex(item => item.hash === hash);
    if (!hash || index === -1) {
      // hash が空 もしくは map に存在しない場合 (Modal と無関係の Anchor に移動する場合)
      if (this.isShown) this.hide(false);
    } else {
      this.change(index, false);
    }
  }

  transitionEnd(elem, func, timeout = 1000) {
    // CSS遷移の完了を監視
    // 遷移が発生しない場合でも timeout 後に必ず resolve する
    let callback;
    let timer;
    const promise = new Promise((resolve) => {
      callback = (event) => {
        // 子要素 (.modal__image 等) からバブリングしてきた transitionend は無視
        if (event && event.target !== elem) return;
        resolve(elem);
      };
      elem.addEventListener('transitionend', callback);
      timer = setTimeout(callback, timeout);
    });
    func();
    promise.then(() => {
      clearTimeout(timer);
      elem.removeEventListener('transitionend', callback);
    });
    return promise;
  }
}
