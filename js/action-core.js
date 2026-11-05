/**
 * Action Core
 * © 2026 QWEL.DESIGN (https://qwel.design)
 * Released under the MIT License.
 * See LICENSE file for details.
 */

/**
 * Preset
 * Action Core に内包される全機能をまとめて初期化するプリセットクラス
 *
 * 使い方:
 * action-core.scss をバンドルしたcssを読み込み,
 * 下記2行のコードを記述するだけで利用可能
 * import ActionCore from './js/action-core.js';
 * new ActionCore.Preset();
 */
class Preset {
  constructor() {
    this.activeHeader = new ActiveHeader();
    this.scrollSpy = new ScrollSpy();
    this.readableOnScroll = new ReadableOnScroll();
    this.backToTop = new BackToTop();
    this.drawerMenu = new DrawerMenu();
    this.safeEmbed = new SafeEmbed();
  }
}

/**
 * Scroll To Anchor
 * header 高さをCSS変数にセットし, アンカーリンクのスクロール位置を補正する
 *
 * 使い方:
 * _scroll-offset.scss をバンドルしたcssを読み込み,
 * header 要素に [data-active-header] 属性を付与する
 *
 * オプション:
 * headerSelector: header セレクタ (既定で [data-active-header])
 * cssVar: header 高さを格納するCSS変数名
 * offset: header 高さのフォールバック値
 */
class ScrollToAnchor {
  constructor(options = {}) {
    // オプション
    this.headerSelector = options.headerSelector ?? '[data-active-header]';
    this.cssVar = options.cssVar ?? '--scroll-offset';
    this.fallbackOffset = options.offset ?? 0;

    // bind
    this.updateOffset = this.updateOffset.bind(this);
    this.onResize = this.onResize.bind(this);

    // resize throttle
    this.resizeTicking = false;

    // イベント登録
    this.handleEvents();

    // 初期表示
    this.updateOffset();
    this.correctInitialAnchor();
  }

  handleEvents() {
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  onResize() {
    if (this.resizeTicking) return;

    // requestAnimationFrame でスロットル
    this.resizeTicking = true;
    requestAnimationFrame(() => {
      this.updateOffset();
      this.resizeTicking = false;
    });
  }

  updateOffset() {
    // header 高さを取得してCSS変数にセット
    const offset = this.getHeaderOffset();
    document.documentElement.style.setProperty(this.cssVar, `${offset}px`);
  }

  getHeaderOffset() {
    const header = document.querySelector(this.headerSelector);
    return header ? header.offsetHeight : this.fallbackOffset;
  }

  // CSS変数反映後にアンカー位置を再計算させるため,
  // hash の対象要素へスクロールし直す
  // (replaceState はスクロールを発生させないため, 直接スクロールさせる)
  correctInitialAnchor() {
    const { hash } = window.location;
    if (!hash) return;

    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    target?.scrollIntoView();
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
  }
}

/**
 * Active Header:
 * ScrollToAnchor クラスを継承し, header 要素のクラス切り替えをスクロールで制御する
 *
 * 使い方:
 * header 要素に [data-active-header] 属性を付与し,
 * body 直下に [data-scroll-sentinel] 属性を持つ要素を配置する
 *
 * オプション:
 * ScrollToAnchor クラスの引数
 * targetSelector: 監視対象セレクタ (既定で [data-scroll-sentinel])
 */
class ActiveHeader extends ScrollToAnchor {
  constructor(options = {}) {
    super(options);

    // オプション
    const targetSelector = options.targetSelector ?? '[data-scroll-sentinel]';

    // 要素取得
    this.header = document.querySelector(this.headerSelector);
    this.target = document.querySelector(targetSelector);
    if (!this.header || !this.target) return;

    // IntersectionObserver 初期化
    this.observer = new IntersectionObserver(this.onIntersect.bind(this), { threshold: 0 });

    // 監視開始
    this.observer.observe(this.target);
  }

  onIntersect(entries) {
    const entry = entries[0];
    const shouldActive = entry.isIntersecting;
    // header クラス切り替え
    transitionEnd(this.header, () => {
      this.header.classList.toggle('is-active', shouldActive);
    }).then(() => {
      this.updateOffset();
    });
  }

  destroy() {
    super.destroy();
    this.observer?.disconnect();
  }
}

/**
 * Scroll Spy
 * スクロール位置 (セクション) に応じてナビゲーションの状態を更新する
 *
 * 使い方:
 * 監視対象セクションに [data-spy-section] 属性を付与し,
 * ナビゲーション項目に [data-spy-nav] 属性を付与する
 *
 * オプション:
 * autoInit: 自動初期化 (既定でON)
 * spySectionSelector: 監視対象セクションセレクタ (既定で [data-spy-section])
 * spyNavSelector: ナビゲーション項目セレクタ (既定で [data-spy-nav])
 * rootMargin: 交差判定のマージン
 */
class ScrollSpy {
  constructor(options = {}) {
    this.options = options;
    this.autoInit = options.autoInit ?? true;

    if (this.autoInit) {
      if (document.readyState === 'loading') {
        // DOMContentLoaded を待って初期化
        document.addEventListener('DOMContentLoaded', () => this.init(), { once: true });
      } else {
        this.init();
      }
    }
  }

  init() {
    // 既に初期化されている場合は破棄
    if (this.observer) this.destroy();

    const options = this.options;
    // オプション
    const spySectionSelector = options.spySectionSelector ?? '[data-spy-section]';
    const spyNavSelector = options.spyNavSelector ?? '[data-spy-nav]';
    const rootMargin = options.rootMargin ?? '-40% 0px -60% 0px'; // ビューポート中央付近で交差判定

    // 要素取得
    this.sections = Array.from(document.querySelectorAll(spySectionSelector));
    this.navItems = Array.from(document.querySelectorAll(spyNavSelector));
    if (!this.sections.length || !this.navItems.length) return;

    // IntersectionObserver 初期化
    this.observer = new IntersectionObserver(this.onIntersect.bind(this), {
      threshold: 0, rootMargin
    });

    // セクション監視開始
    this.sections.forEach((section) => this.observer.observe(section));
  }

  onIntersect(entries) {
    // 交差しているセクションを抽出
    const intersectingEntries = entries.filter((entry) => entry.isIntersecting);
    if (!intersectingEntries.length) return;

    // 最初に交差したセクションを現在地に設定
    this.setCurrent(intersectingEntries[0].target.id);
  }

  setCurrent(sectionId) {
    this.navItems.forEach((item) => {
      // ナビゲーション項目にはハッシュ付きアンカーを含める必要あり
      const anchor = item.querySelector('a');
      const targetId = anchor?.getAttribute('href')?.replace('#', '');
      item.classList.toggle('is-current', targetId === sectionId);
    });
  }

  destroy() {
    this.observer?.disconnect();
  }
}

/**
 * Readable On Scroll
 * 画面内を出入りする要素のクラスを切り替える
 *
 * 使い方:
 * _scroll-inview.scss をバンドルしたcssを読み込み,
 * アニメーションさせたい要素に [data-readable] 属性を付与する
 *
 * オプション:
 * autoInit: 自動初期化 (既定でON)
 * readableSelector: 監視対象セレクタ (既定で [data-readable])
 * threshold: 交差判定の閾値
 * rootMargin: 交差判定のマージン
 * inviewClass: 画面内に入った時に付与するクラス名
 * toggle: 画面外に出た時にクラスを外すかどうか (既定でOFF)
 */
class ReadableOnScroll {
  constructor(options = {}) {
    this.options = options;
    this.autoInit = options.autoInit ?? true;

    if (this.autoInit) {
      if (document.readyState === 'loading') {
        // DOMContentLoaded を待って初期化
        document.addEventListener('DOMContentLoaded', () => this.init(), { once: true });
      } else {
        this.init();
      }
    }
  }

  init() {
    // 既に初期化されている場合は破棄
    if (this.observer) this.destroy();

    const options = this.options;
    // オプション
    const readableSelector = options.readableSelector ?? '[data-readable]';
    const threshold = options.threshold ?? 0.15;
    const rootMargin = options.rootMargin ?? '0px 0px -12% 0px';
    this.inviewClass = options.inviewClass ?? 'is-inview';
    this.toggle = options.toggle ?? false;

    // 要素取得
    this.targets = Array.from(document.querySelectorAll(readableSelector));
    if (!this.targets.length) return;

    // IntersectionObserver 初期化
    this.observer = new IntersectionObserver(this.onIntersect.bind(this), {
      threshold, rootMargin
    });

    // 要素監視開始
    this.targets.forEach((target) => this.observer.observe(target));
  }

  onIntersect(entries) {
    for (const entry of entries) {
      const elem = entry.target;

      if (entry.isIntersecting) {
        // 画面内に入った時
        elem.classList.add(this.inviewClass);
        if (!this.toggle) {
          // 既定では監視解除
          this.observer.unobserve(elem);
        }
      } else if (this.toggle) {
        // 画面外に出た時
        elem.classList.remove(this.inviewClass);
      }
    }
  }

  destroy() {
    this.observer?.disconnect();
  }
}

/**
 * Back To Top:
 * トップへ戻るボタンの生成と制御
 *
 * 使い方:
 * _backToTop.scss をバンドルしたcssを読み込み,
 * インスタンス化するだけで自動的にボタンが生成・制御される
 *
 * オプション:
 * offsetRatio: ボタンが出現する位置 (window.innerHeight の何倍か)
 */
class BackToTop {
  constructor(options = {}) {
    // オプション
    this.offsetRatio = options.offsetRatio ?? 0;

    // 状態管理
    this.isShown = false;

    // bind
    this.onScroll = this.onScroll.bind(this);
    this.onClick = this.onClick.bind(this);

    // ボタン生成
    this.createButton();

    // イベント登録
    this.handleEvents();

    // 初期表示
    this.updateVisibility();
  }

  createButton() {
    // ボタン要素
    // button 要素にすることで, キーボード (Enter/Space) でも操作可能にする
    this.btn = document.createElement('button');
    this.btn.setAttribute('type', 'button');
    this.btn.classList.add('backToTop');
    this.btn.setAttribute('aria-label', 'トップへ戻る');

    // アイコン要素
    const icon = document.createElement('div');
    icon.classList.add('icon', 'is-chevron-up', 'is-lg');

    // span 要素
    const span = document.createElement('span');
    span.classList.add('icon__span');

    // body に挿入
    icon.appendChild(span);
    this.btn.appendChild(icon);
    document.body.appendChild(this.btn);
  }

  handleEvents() {
    // ボタン操作
    this.btn.addEventListener('click', this.onClick);

    // ボタン表示制御
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  onClick(event) {
    event.preventDefault();
    this.backToTop();
  }

  onScroll() {
    this.updateVisibility();
  }

  backToTop() {
    window.scroll({ top: 0, behavior: 'smooth' });
  }

  updateVisibility() {
    const shouldShow = window.innerHeight * this.offsetRatio < window.scrollY;
    if (shouldShow !== this.isShown) {
      this.isShown = shouldShow;
      this.btn.classList.toggle('is-active', shouldShow);
      // 非表示中はフォーカスできないようにする
      this.btn.tabIndex = shouldShow ? 0 : -1;
    }
  }

  destroy() {
    this.isShown = false;
    this.btn?.removeEventListener('click', this.onClick);
    this.btn?.remove();
    window.removeEventListener('scroll', this.onScroll);
  }
}

/**
 * Drawer Menu
 * ドロワーメニューの生成と制御
 *
 * 使い方:
 * _drawerMenu.scss をバンドルしたcssを読み込み,
 * インスタンス化するだけで自動的にボタンが生成・制御される
 *
 * オプション:
 * siteBrandSelector: クローンする SiteBrand セレクタ (既定で [data-site-brand])
 * primaryMenuSelector: クローンする PrimaryMenu セレクタ (既定で [data-primary-menu])
 * socialMenuSelector: クローンする SocialMenu セレクタ (既定で [data-social-menu])
 * templateId: 独自にテンプレートを使用する場合のIDセレクタ (既定で false)
 */
class DrawerMenu {
  constructor(options = {}) {
    // オプション
    this.siteBrandSelector = options.siteBrandSelector ?? '[data-site-brand]';
    this.primaryMenuSelector = options.primaryMenuSelector ?? '[data-primary-menu]';
    this.socialMenuSelector = options.socialMenuSelector ?? '[data-social-menu]';
    this.templateId = options.templateId ?? false;

    // 状態管理
    this.isShown = false;

    // bind (destroy で removeEventListener できるよう参照を保持)
    this.onDrawerClick = this.onDrawerClick.bind(this);
    this.hide = this.hide.bind(this);
    this.windowScrollHandler = this.windowScrollHandler.bind(this);

    // 各要素生成
    this.createElements();

    // メニューインポート
    this.importMenu();

    // イベント登録
    this.handleEvents();

    // 出現アニメーション
    setTimeout(() => {
      this.drawer.classList.remove('is-ready');
    }, 1000);
  }

  createElements() {
    // .drawer
    this.drawer = document.createElement('button');
    this.drawer.setAttribute('type', 'button');
    this.drawer.setAttribute('aria-label', 'メニュー');
    this.drawer.setAttribute('aria-expanded', 'false');
    this.drawer.classList.add('drawer', 'is-ready');

    // .drawer__navicon
    this.navicon = document.createElement('div');
    this.navicon.classList.add('drawer__navicon');
    let icon = document.createElement('div');
    icon.classList.add('icon', 'is-menu', 'is-lg');
    icon.innerHTML = '<span class="icon__span"></span>';
    this.navicon.appendChild(icon);
    this.drawer.appendChild(this.navicon);

    // .drawer__close
    this.close = document.createElement('div');
    this.close.classList.add('drawer__close');
    icon = document.createElement('div');
    icon.classList.add('icon', 'is-close', 'is-lg');
    icon.innerHTML = '<span class="icon__span"></span>';
    this.close.appendChild(icon);
    this.drawer.appendChild(this.close);

    // .drawerMenu
    this.drawerMenu = document.createElement('div');
    this.drawerMenu.classList.add('drawerMenu', 'is-hidden');

    // .drawerMenu__inner
    this.inner = document.createElement('div');
    this.inner.classList.add('drawerMenu__inner', 'is-hidden');
    this.drawerMenu.appendChild(this.inner);

    // .drawerMenuOverlay
    this.overlay = document.createElement('div');
    this.overlay.classList.add('drawerMenuOverlay', 'is-collapsed');

    // body 要素に挿入
    const body = document.body;
    body.appendChild(this.drawer);
    body.appendChild(this.drawerMenu);
    body.appendChild(this.overlay);
  }

  importMenu() {
    if (!this.templateId) {
      // 既存の構造からクローンする場合
      this.siteBrand = document.querySelector(this.siteBrandSelector);
      if (this.siteBrand) this.importSiteBrand();
      this.primaryMenu = document.querySelector(this.primaryMenuSelector);
      if (this.primaryMenu) this.importPrimaryMenu();
      this.socialMenu = document.querySelector(this.socialMenuSelector);
      if (this.socialMenu) this.importSocialMenu();
    } else {
      // 独自にテンプレートを使用する場合
      const template = document.getElementById(this.templateId);
      if (template) {
        const clone = template.content.cloneNode(true);
        this.inner.appendChild(clone);
      }
    }
  }

  importSiteBrand() {
    // SiteBrand をインポート
    const siteBrand = document.createElement('div');
    siteBrand.classList.add('drawerMenu__item', 'is-siteBrand');
    siteBrand.innerHTML = this.siteBrand.innerHTML;
    this.inner.appendChild(siteBrand);
  }

  importPrimaryMenu() {
    // PrimaryMenu をインポート
    const primaryMenu = document.createElement('ul');
    primaryMenu.classList.add('drawerMenu__primaryMenu');

    // li 要素を順次インポート
    const menuItems = this.primaryMenu.querySelectorAll('li');
    menuItems.forEach((menuItem) => {
      const primaryMenuItem = document.createElement('li');
      primaryMenuItem.classList.add('drawerMenu__item');
      primaryMenuItem.innerHTML = menuItem.innerHTML;
      primaryMenu.appendChild(primaryMenuItem);
    });
    this.inner.appendChild(primaryMenu);
  }

  importSocialMenu() {
    // SocialMenu をインポート
    const socialMenu = document.createElement('ul');
    socialMenu.classList.add('drawerMenu__socialMenu');

    // li 要素を順次インポート
    const menuItems = this.socialMenu.querySelectorAll('li');
    menuItems.forEach((menuItem) => {
      const socialMenuItem = document.createElement('li');
      socialMenuItem.classList.add('drawerMenu__item', 'is-social');
      socialMenuItem.innerHTML = menuItem.innerHTML;
      socialMenu.appendChild(socialMenuItem);
    });
    this.inner.appendChild(socialMenu);
  }

  toggle() {
    // 状態から判別して, 表示/非表示を切り替え
    if (this.isShown) this.hide();
    else this.show();
  }

  show() {
    // 表示
    if (!this.isShown) {
      transitionEnd(this.drawerMenu, () => {
        this.drawerMenu.classList.remove('is-hidden');
        this.drawer.classList.add('is-active');
        this.drawer.setAttribute('aria-expanded', 'true');
        this.inner.classList.remove('is-collapsed');
        this.overlay.classList.remove('is-collapsed');
      }).then(() => {
        this.inner.classList.remove('is-hidden');
      });
    }
    this.isShown = true;
  }

  hide() {
    // 非表示
    if (this.isShown) {
      transitionEnd(this.drawerMenu, () => {
        this.drawerMenu.classList.add('is-hidden');
        this.drawer.classList.remove('is-active');
        this.drawer.setAttribute('aria-expanded', 'false');
        this.inner.classList.add('is-hidden');
      }).then(() => {
        this.inner.classList.add('is-collapsed');
        this.overlay.classList.add('is-collapsed');
      });
    }
    this.isShown = false;
  }

  handleEvents() {
    // ドロワーのイベント登録
    this.drawer.addEventListener('click', this.onDrawerClick);

    // オーバーレイのイベント登録
    this.overlay.addEventListener('click', this.hide);

    // スクロール時のイベント登録
    window.addEventListener('scroll', this.windowScrollHandler, { passive: true });
  }

  onDrawerClick(event) {
    event.preventDefault();
    this.toggle();
  }

  windowScrollHandler() {
    // スクロール時にメニューを非表示
    if (this.isShown) this.hide();
  }

  destroy() {
    this.isShown = false;
    this.drawer?.removeEventListener('click', this.onDrawerClick);
    this.drawer?.remove();
    this.inner?.remove();
    this.drawerMenu?.remove();
    this.overlay?.removeEventListener('click', this.hide);
    this.overlay?.remove();
    window.removeEventListener('scroll', this.windowScrollHandler);
  }
}

/**
 * SafeEmbed
 * 主に GoogleMap 等の埋め込みをロックし, クリックでロック解除するカバーを生成する
 *
 * 使い方:
 * _safe-embed.scss をバンドルしたcssを読み込み,
 * 監視対象要素に [data-safe-embed] 属性を付与する
 *
 * オプション:
 * autoInit: 自動初期化 (既定でON)
 * embedSelector: 監視対象セレクタ (既定で [data-safe-embed])
 * infoText: カバーに表示させる文字列
 */
class SafeEmbed {
  constructor(options = {}) {
    this.options = options;
    this.autoInit = options.autoInit ?? true;

    if (this.autoInit) this.init();
  }

  init() {
    // 既に初期化されている場合は破棄
    if (this.covers?.length) this.destroy();

    const options = this.options;
    // オプション
    const embedSelector = options.embedSelector ?? '[data-safe-embed]';
    const infoText = options.infoText ?? 'クリックするとマップを<br>拡大/縮小できるようになります。';

    // 要素取得
    this.targets = Array.from(document.querySelectorAll(embedSelector));
    this.covers = [];
    if (!this.targets.length) return;

    this.targets.forEach((target) => {
      // .safe-embed-cover
      const cover = document.createElement('div');
      cover.classList.add('safe-embed-cover', 'is-active');
      target.appendChild(cover);

      // info テキスト
      const info = document.createElement('p');
      info.innerHTML = infoText;
      cover.appendChild(info);

      // イベント登録
      const handler = () => {
        transitionEnd(cover, () => {
          cover.classList.remove('is-active');
        }).then(() => {
          cover.removeEventListener('click', handler);
          cover.remove();
        });
      };
      cover.addEventListener('click', handler);

      // 破棄用に保持
      this.covers.push({ cover, handler });
    });
  }

  destroy() {
    this.targets = [];
    this.covers.forEach(({ cover, handler }) => {
      cover.removeEventListener('click', handler);
      cover.remove();
    });
    this.covers = [];
  }
}

// Utility functions
function transitionEnd(elem, func, timeout = 1000) {
  // CSS遷移の完了を監視
  // 遷移が発生しない場合 (値が変化しない, prefers-reduced-motion 等) でも
  // timeout 後に必ず resolve する
  let callback;
  let timer;
  const promise = new Promise((resolve) => {
    callback = (event) => {
      // 子要素からバブリングしてきた transitionend は無視
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

// Export modules
const ActionCore = {
  Preset,
  ScrollToAnchor,
  ActiveHeader,
  ScrollSpy,
  ReadableOnScroll,
  BackToTop,
  DrawerMenu,
  SafeEmbed
};

export default ActionCore;
