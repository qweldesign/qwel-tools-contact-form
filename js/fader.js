/**
 * Fader
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

/**
 * フェードアニメーションで遷移するギャラリー
 *
 * 使い方:
 * _fader.scss をバンドルしたcssを読み込み,
 * ギャラリー本体に [data-gallery="fader"] 属性を付与し,
 * ギャラリーアイテムに [data-gallery-item] 属性を付与する
 *
 * オプション:
 * data-interval: アニメーション時間間隔 (data 属性で指定)
 */
export default class Fader {
  constructor(elem) {
    // 要素
    this.elem = elem ?? document.querySelector('[data-gallery="fader"]');
    if (!this.elem) return;
    this.items = Array.from(this.elem.querySelectorAll('[data-gallery-item]'));
    if (!this.items.length) return;

    // オプションを data 属性から取得
    this.interval = Number(this.elem.dataset.interval) || 5000;

    // 状態管理
    this.currentIndex = 0;
    this.itemsCount = this.items.length;
    this.items[0].classList.add('is-current');

    // ナビゲーション
    this.setupNav();

    // 開始
    this.startInterval();
  }

  // 再生
  startInterval() {
    this.isPlay = true;
    this.timeStart = null;
    this.loop(performance.now());
  }

  // 停止
  stopInterval() {
    this.isPlay = false;
  }

  setupNav() {
    // .faderNav
    this.nav = document.createElement('ul');
    this.nav.classList.add('faderNav');

    // .faderNav__item
    for (let i = 0; i < this.itemsCount; i++) {
      const li = document.createElement('li');
      li.classList.add('faderNav__item');
      li.dataset.targetIndex = i; // data-target-index を挿入
      this.nav.appendChild(li);
    }

    // 現アイテムに .is-current を付与
    this.navItems = this.nav.children;
    this.navItems[this.currentIndex].classList.add('is-current');

    // 挿入
    this.elem.appendChild(this.nav);

    // イベント登録
    this.handleEvents();
  }

  handleEvents() {
    this.nav.addEventListener('click', (event) => {
      const target = event.target;
      if (target.dataset.targetIndex) {
        this.update(target.dataset.targetIndex - 0); // 数値型へパース
        this.stopInterval();
      }
    });
  }

  update(index) {
    this.currentIndex = index % this.itemsCount;
    this.fade(this.currentIndex);
    this.updateNav(this.currentIndex);
  }

  fade(index) {
    this.items.forEach((item, i) => {
      item.classList.toggle('is-current', i === index);
    });
  }

  updateNav(index) {
    if (this.nav.querySelector('.is-current')) {
      this.nav.querySelector('.is-current').classList.remove('is-current');
    }
    this.navItems = this.nav.children;
    this.navItems[index].classList.add('is-current');
  }

  loop(timeCurrent) {
    if (!this.timeStart) {
      this.timeStart = timeCurrent;
    }
    const timeElapsed = timeCurrent - this.timeStart;

    timeElapsed < this.interval
      ? window.requestAnimationFrame(this.loop.bind(this))
      : this.done();
  }

  done() {
    if (this.isPlay) {
      this.startInterval();
      this.update((this.currentIndex + 1) % this.itemsCount);
    }
  }
}
