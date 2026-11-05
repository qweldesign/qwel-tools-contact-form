/**
 * Slider
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

/**
 * スライドアニメーションで遷移するギャラリー
 * ドラッグ, ホイール操作対応
 *
 * 使い方:
 * _slider.scss をバンドルしたcssを読み込み,
 * 画面幅100%の要素内にギャラリーを配置する
 * ギャラリー本体 (div 等) に [data-gallery="slider"] 属性を付与し,
 * ギャラリーインナーに (ul 等) [data-gallery-main] 属性を付与し,
 * ギャラリーアイテムに (li 等) [data-gallery-item] 属性を付与する
 *
 * オプション (data 属性で指定):
 * data-flickable: ドラッグ, ホイール操作に対応 (既定でOFF, ONにする場合値は不要)
 * data-aspect-ratio: アスペクト比 (SCSSも修正が必要)
 * data-gap: アイテム間隔(px) SCSSで指定不可
 * data-interval: アニメーション時間間隔
 * data-duration: アニメーション所要時間
 */
export default class Slider {
  constructor(elem) {
    // 要素
    this.elem = elem ?? document.querySelector('[data-gallery="slider"]');
    if (!this.elem) return;
    this.inner = this.elem.querySelector('[data-gallery-main]');
    if (!this.inner) return;
    this.items = Array.from(this.elem.querySelectorAll('[data-gallery-item]'));
    if (!this.items.length) return;

    // オプションを data 属性から取得
    this.flickable = this.elem.hasAttribute('data-flickable');
    this.aspectRatio = Number(this.elem.dataset.aspectRatio) || 8 / 5;
    // Number(undefined) は NaN になり ?? では既定値に落ちないため, 変換前に既定値を当てる
    this.gap = Number(this.elem.dataset.gap ?? 96);
    this.interval = Number(this.elem.dataset.interval) || 3000; // 1000未満を指定すると自動再生しない
    this.duration = Number(this.elem.dataset.duration) || 500;

    // inner にスタイル適用
    this.inner.style.flexWrap = 'nowrap'; // .wp-block-gallery を Reset (WordPress 対応)
    this.inner.style.gap = `${this.gap}px`;

    // 状態管理
    this.currentIndex = 0;
    this.itemsCount = this.items.length;
    this.distance = 0; // インラインで translateX に適用する値
    this.dragDistance = []; // ドラッグ操作の軌跡を保持
    this.isAnimated = false;

    // 各種セットアップ
    this.setupNavs();
    this.setupItems();
    this.readyMove(-3, true); // 左に3つアイテムを足しておく
    this.setActiveTarget();
    this.handleEvents();

    // リサイズ
    this.windowResizeHandler();

    // 開始
    if (this.interval >= 1000) this.startInterval();
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

  // size を指定して, スライダーを動かす
  move(size, duration = this.duration) {
    // 予め引っ張られてくるアイテムを移動しておく
    this.readyMove(size);

    // 状態の更新
    const len = this.items.length;
    this.currentIndex += size;
    if (this.currentIndex < 0) this.currentIndex += len;
    if (this.currentIndex >= len) this.currentIndex -= len;

    // アニメーション開始
    this.isAnimated = true;
    this.start = this.distance;

    if (size < 0) {
      for (let i = 0; i > size; i--) {
        this.start -= this.items[(this.currentIndex - i - 3 + len) % len].clientWidth;
        this.start -= this.gap;
      }
    } else {
      for (let i = 0; i < size; i++) {
        this.start += this.items[(this.currentIndex - i - 4 + len) % len].clientWidth;
        this.start += this.gap;
      }
    }

    this.stop = this.getAdjustedDistance(this.currentIndex);
    this.flickDistance = this.stop - this.start;
    this.currentDuration = duration;
    this.timeStart = false;
    this.moving(performance.now());
  }

  readyMove(size, init = false) {
    const len = this.items.length;

    if (size < 0) {
      for (let i = 0; i > size; i--) {
        let j = (this.currentIndex + i - 4 + len) % len;
        if (init) j += 3;
        const order = window.getComputedStyle(this.items[j]).order;
        this.items[j].style.order = parseInt(order) - 1;
      }
    } else {
      for (let i = 0; i < size; i++) {
        let j = (this.currentIndex + i - 3 + len) % len;
        if (init) j += 3;
        const order = window.getComputedStyle(this.items[j]).order;
        this.items[j].style.order = parseInt(order) + 1;
      }
    }
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
      this.move(1);
    }
  }

  // ナビゲーション(.slider__prev, .slider__next, .sliderNav)を設置
  setupNavs() {
    // .slider__prev
    this.prev = document.createElement('a');
    this.prev.classList.add('slider__prev');
    this.prev.setAttribute('href', '#');
    let icon = document.createElement('div');
    icon.classList.add('icon', 'is-chevron-left', 'is-md');
    icon.innerHTML = '<span class="icon__span"></span>';
    this.prev.appendChild(icon);

    // .slider__next
    this.next = document.createElement('a');
    this.next.classList.add('slider__next');
    this.next.setAttribute('href', '#');
    icon = document.createElement('div');
    icon.classList.add('icon', 'is-chevron-right', 'is-md');
    icon.innerHTML = '<span class="icon__span"></span>';
    this.next.appendChild(icon);

    // .sliderNav
    this.nav = document.createElement('ul');
    this.nav.classList.add('sliderNav');

    // .sliderNav__item
    for (let i = 0; i < this.itemsCount; i++) {
      const li = document.createElement('li');
      li.classList.add('sliderNav__item');
      li.dataset.targetIndex = i; // data-target-index を挿入
      this.nav.appendChild(li);
    }

    this.elem.appendChild(this.prev);
    this.elem.appendChild(this.next);
    this.elem.after(this.nav);
  }

  // アイテムが7個未満の場合に予備を連ねておく
  setupItems() {
    while (this.items.length < 7) {
      for (let i = 0; i < this.itemsCount; i++) {
        const clone = this.items[i].cloneNode(true);
        this.inner.appendChild(clone);
        this.items.push(clone);
      }
    }
  }

  // アイテムのアクティブ状態を管理
  setActiveTarget() {
    // スライダー内アイテム
    if (this.inner.querySelector('.is-current')) {
      this.inner.querySelector('.is-current').classList.remove('is-current');
    }
    this.items[this.currentIndex].classList.add('is-current');
    // ナビゲーション
    if (this.nav.querySelector('.is-current')) {
      this.nav.querySelector('.is-current').classList.remove('is-current');
    }
    this.navItems = this.nav.children;
    this.navItems[this.currentIndex % this.itemsCount].classList.add('is-current');
  }

  handleEvents() {
    // タッチデバイスの判定
    const touchSupported = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
    // タップでも click は発火するため, ボタン類は常に click で扱う
    // (touchend にすると, タッチ対応PCでマウス操作した際に反応しない)
    const myTouch = 'click';

    // 状態
    this.x = 0;
    this.y = 0;
    this.isDragging = false;
    this.delta = 0;

    // ドラッグおよびホイール操作
    if (this.flickable) {
      if (touchSupported) {
        this.inner.addEventListener('touchstart', (event) => {
          this.x = event.touches[0].clientX;
          this.y = event.touches[0].clientY;
          this.isDragging = true;
          this.touchStartHandler();
        });

        this.inner.addEventListener('touchmove', (event) => {
          this.x = event.touches[0].clientX;
          this.y = event.touches[0].clientY;
          this.touchMoveHandler();
        });

        this.inner.addEventListener('touchend', () => {
          this.touchEndHandler();
          this.isDragging = false;
        });

        // touchcancel は, touchEnd 扱い
        this.inner.addEventListener('touchcancel', () => {
          this.touchEndHandler();
          this.isDragging = false;
        });
      }

      this.inner.addEventListener('mousedown', (event) => {
        this.x = event.clientX;
        this.y = event.clientY;
        this.isDragging = true;
        this.touchStartHandler();
        event.preventDefault();
      });

      this.inner.addEventListener('mousemove', (event) => {
        this.x = event.clientX;
        this.y = event.clientY;
        this.touchMoveHandler();
        event.preventDefault();
      });

      this.inner.addEventListener('mouseup', () => {
        this.touchEndHandler();
        this.isDragging = false;
      });

      // ポインターが外れたときは, touchEnd 扱い
      this.inner.addEventListener('mouseleave', () => {
        this.touchEndHandler();
        this.isDragging = false;
      });

      // ホイール操作
      this.inner.addEventListener('wheel', (event) => {
        this.delta = event.deltaY;
        this.myWheelHandler();
        event.preventDefault();
      });
    }

    // img > a リンク無効化 (WordPress 対応)
    this.inner.querySelectorAll('.post__image > a').forEach((elem) => {
      elem.addEventListener(myTouch, (event) => {
        event.preventDefault();
      });
    });

    // ナビゲーション操作
    this.nav.addEventListener(myTouch, (event) => {
      const target = event.target;
      if (target.dataset.targetIndex && !this.isAnimated) {
        this.move(target.dataset.targetIndex - this.currentIndex % this.itemsCount);
        this.stopInterval();
      }
    });

    // 前ボタン
    this.prev.addEventListener(myTouch, (event) => {
      if (!this.isAnimated) this.move(-1);
      this.stopInterval();
      event.preventDefault();
    });

    // 次ボタン
    this.next.addEventListener(myTouch, (event) => {
      if (!this.isAnimated) this.move(1);
      this.stopInterval();
      event.preventDefault();
    });

    // リサイズ
    window.addEventListener('resize', () => {
      this.windowResizeHandler();
    });
  }

  touchStartHandler() {
    // 配列をリセット
    this.dragDistance = [this.x];
    // 自動再生を止める
    this.stopInterval();
  }

  touchMoveHandler() {
    if (this.isDragging && !this.isAnimated) {
      // 配列に x 座標を push する
      this.dragDistance.push(this.x);
      const len = this.dragDistance.length;
      let distance = 0;
      // インラインスタイルを書き換える
      for (let i = 0; i < len; i++) {
        if (i > 0) {
          distance = this.dragDistance[i] - this.dragDistance[i - 1];
          this.inner.style.transform = `translateX(${this.distance + distance}px)`;
        }
      }
      this.distance += distance;
    }
  }

  touchEndHandler() {
    // フリック操作
    if (this.isDragging) {
      // 移動距離
      const distance = this.dragDistance[0] - this.dragDistance[this.dragDistance.length - 1];
      if (Math.abs(distance) > 10) { // 僅かな移動距離で, move()を頻発させない
        const len = this.items.length;
        let size = 0;
        // 移動距離とアイテムの幅から, どれだけ move()させるか計測
        if (distance < 0) {
          const w1 = this.items[(this.currentIndex - 3 + len) % len].clientWidth;
          const w2 = this.items[(this.currentIndex - 2 + len) % len].clientWidth;
          if (w1 / 3 < Math.abs(distance)) size--;
          if ((w1 * 2 + w2) / 3 < Math.abs(distance)) size--;
        } else {
          const w1 = this.items[(this.currentIndex - 4 + len) % len].clientWidth;
          const w2 = this.items[(this.currentIndex - 5 + len) % len].clientWidth;
          if (w1 / 3 < Math.abs(distance)) size++;
          if ((w1 * 2 + w2) / 3 < Math.abs(distance)) size++;
        }
        this.move(size, this.duration / 2); // 既に引っ張ってきているので, 半分の時間
      } else {
        // 僅かな移動距離の場合は元の位置に戻す
        this.windowResizeHandler();
      }
    }
  }

  myWheelHandler() {
    const delta = this.delta;
    if (delta < 0 && !this.isAnimated) this.move(-1);
    if (delta > 0 && !this.isAnimated) this.move(1);
    this.stopInterval();
  }

  windowResizeHandler() {
    // 再計算
    this.inner.style.width = `${this.getInnerWidth()}px`;
    this.distance = this.getAdjustedDistance(this.currentIndex);
    this.inner.style.transform = `translateX(${this.distance}px)`;
  }

  getInnerWidth() {
    const len = this.items.length;
    return this.elem.clientHeight * this.aspectRatio * len + this.gap * (len - 1);
  }

  getAdjustedDistance(index) {
    const len = this.items.length;
    let result = window.innerWidth / 2;
    result -= this.items[index % len].clientWidth / 2;
    for (let i = 0; i > -3; i--) {
      const j = (index + i - 1 + len) % len;
      result -= this.items[j].clientWidth;
      result -= this.gap;
    }
    return result;
  }

  moving(timeCurrent) {
    if (!this.timeStart) {
      this.timeStart = timeCurrent;
    }

    const timeElapsed = timeCurrent - this.timeStart;
    const next = this.easing(timeElapsed, this.start, this.flickDistance, this.currentDuration);
    this.inner.style.transform = `translateX(${next}px)`;

    timeElapsed < this.currentDuration
      ? window.requestAnimationFrame(this.moving.bind(this))
      : this.moved();
  }

  moved() {
    this.inner.style.transform = `translateX(${this.start + this.flickDistance}px)`;
    this.timeStart = false;
    this.isAnimated = false;
    this.setActiveTarget();
    this.windowResizeHandler();
  }

  easing(t, b, c, d) {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  }
}
