# コーディング規約

QWEL.DESIGN とAIエージェントが、QWEL の Tools 群とサイト群を書くときの規約。

このファイルが規約の正。starter-template の履歴とともに各リポジトリへ渡る。派生したリポジトリの写しは自動では更新されないので、迷ったら starter-template の最新を確かめる。

既存のコードは、この規約のためだけに書き換えない。触る箇所を規約に合わせ、まとめて直すのは v2.0 のような区切りで行う。

---

## 1. 共通

- 文字コードはUTF-8 (BOMなし)。改行コードはリポジトリの中ではLF
- 字下げは空白 2 つ (CSS, JS, PHP, HTML)
- ファイルの最後は改行で終える。行末の空白は残さない
- 識別子は英語、コメントと文書は日本語
- コメントには「なぜそうするか」を書く。コードを読めば分かることは書かない

### 日本語の書き方

- コードのコメント: 読点は `, `、文の区切りは `. ` (半角)
- README, CHANGELOG, Issue などの文書: 読点は `、`、句点は `。`
- 初期値は「既定」と書く (「規定」は決まりごとの意味)
- 英字と日本語の間には空白を入れる (`Markdown を書く`)。ただし「Web」と略語 (URL, HTML, CSS, API など) は日本語に近い言葉として扱い、前後に空白を入れない (`Web制作`、`URLが変わる`、`HTMLに変換`)。識別子やファイル名は略語として扱わない

---

## 2. CSS / SCSS

### 2.1 軸の順序: y 軸 → x 軸

プロパティの記述順は y 軸 (block) → x 軸 (inline) で統一する。**ただし width → height は変えない。**

| 分類 | 順序 |
| --- | --- |
| 文字 | `line-height` → `vertical-align` → `letter-spacing` → `text-align` |
| 揃え | `align-items` → `justify-content` |
| 同上 | `align-content` → `justify-content` |
| 同上 | `align-items` → `justify-items` |
| 同上 | `align-self` → `justify-self` |
| 余白 | `margin-block` → `margin-inline` |
| 同上 | `padding-block` → `padding-inline` |
| 余白の片側 | `-block-start` → `-block-end` → `-inline-start` → `-inline-end` |
| Grid | `grid-template-rows` → `grid-template-columns` |
| 同上 | `grid-row` → `grid-column` |
| 同上 | `row-gap` → `column-gap` |
| はみ出し | `overflow-y` → `overflow-x` |

### 2.2 軸の順序の細かい決まり

- `flex-direction: column` のときも、`align` → `justify` のまま (プロパティ名で決める)
- `margin` を書き終えてから `padding` を書く (`margin-block`, `padding-block`, `margin-inline` のように混ぜない)
- 全部の指定を先に、片側の指定を後に書く (`margin-block` → `margin-block-end`)
- `transform` の中の順序は変えない (順序で結果が変わる)
- サイズは軸ごとに書く: `width` → `min-width` → `max-width` → `height` → `min-height` → `max-height` → `aspect-ratio`
- 論理プロパティのサイズは `inline-size` → `block-size` (`width` → `height` に合わせる)。基本は `width`, `height` を使う
- mixin のサイズの引数は `$width, $height`

**この規則の対象は記述の順序で、値の順序は仕様に従う。**

| 記述 | 値の順序 |
| --- | --- |
| `margin: 0 auto`, `padding: 1rem 2rem`, `gap: 1rem 2rem` | y → x |
| `place-items`, `place-content`, `place-self` | y → x |
| `overflow: hidden auto` | x → y |
| `background-position`, `object-position`, `transform-origin` | x → y |
| `background-size: 100% auto` | width → height |
| `translate(x, y)`, `scale(x, y)` | x → y |
| `inset: top right bottom left` | 時計回り |

**例外**

- `position` の `top`, `left`, `right`, `bottom` など、物理方向を並べるときは `top` → `left` → `right` → `bottom` の順 (論理プロパティは y → x の規則に従う)
- `row($horizontal-align, $vertical-align)` の引数は x → y のまま変えない。順序を変えると、エラーにならずに見た目だけ変わるため。出力するプロパティの順序は規則に従う
- `make-block()` の `line-height` は、`height` と同じ値で上下中央に揃える指定なので、`height` の直後に書く

### 2.3 プロパティ全体の順序

外側から内側、見た目、動きの順。グループの間に空行は入れない (下の例は説明のために入れている)。

```scss
.example {
  @include some-mixin();         // 1. mixin

  position: absolute;            // 2. 位置
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;

  display: flex;                 // 3. レイアウト
  flex-flow: row wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  width: 100%;                   // 4. サイズ
  height: 3rem;
  overflow: hidden;

  margin-block: 1rem;            // 5. 余白 (外 → 内)
  margin-inline: auto;
  padding-block: 1rem;
  padding-inline: 2rem;

  border: 1px solid;             // 6. 枠
  border-radius: 0.5rem;

  background-color: #fff;        // 7. 背景と文字の色
  color: #000;

  font-family: serif;            // 8. 文字
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.1em;
  text-align: center;
  text-decoration: none;

  outline: 0;                    // 9. その他
  user-select: none;
  cursor: pointer;

  transform: scale(1);           // 10. 動き
  transition: transform 0.5s ease;
}
```

グループの中の順序は次のとおり。疑似要素の `content` は、mixin の直後 (位置の前) に書く。

| グループ | 順序 |
| --- | --- |
| 2. 位置 | `position` → `top` → `left` → `right` → `bottom` → `inset` → `z-index` |
| 3. レイアウト | `display` → `flex` → `flex-flow` → `flex-direction` → `flex-wrap` → `flex-grow` → `flex-shrink` → `flex-basis` → `order` → 揃え (2.1) → Grid (2.1) → `gap` |
| 4. サイズ | `box-sizing` → サイズ (2.2) → `object-fit` → `overflow` |
| 5. 余白 | `margin` → `padding` (それぞれ 2.1 の順序) |
| 6. 枠 | `border` → `border-width` → `border-style` → `border-color` → 片側の枠 (`border-block-start-width` なども含め、2.1 の順序) → `border-radius` → `border-collapse` → `border-spacing` → `box-shadow` |
| 7. 背景と文字の色 | `background` → `background-position` → `background-size` → `background-color` → `color` → `fill` |
| 8. 文字 | `font-family` → `font-weight` → `font-style` → `font-size` → `line-height` → `vertical-align` → `letter-spacing` → `text-align` → `text-decoration` → `text-transform` → `white-space` → `word-break` → `overflow-wrap` → `text-shadow` |
| 9. その他 | `outline` → `list-style` → `resize` → `user-select` → `cursor` → `pointer-events` → `visibility` → `scroll-behavior` → `scroll-margin` → `filter` |
| 10. 動き | `opacity` → `transform` → `transition` → `will-change` |

### 2.4 ブロックの中の順序

1. `@include`
2. プロパティ
3. `@media`
4. `&__element`, `&.is-state`, `&:hover` などの入れ子 (入れ子の前に空行を入れる)

### 2.5 論理プロパティと物理プロパティ

| 場面 | 書き方 |
| --- | --- |
| 上下左右をまとめて指定 | `margin: 0 auto` |
| 片方の軸だけ | `margin-block`, `margin-inline` |
| 片側だけ | `margin-block-end` (`margin-bottom` は使わない) |
| 位置 | `top`, `left` など (物理) |
| `text-align` | `left`, `right` (物理) |

### 2.6 命名

| 対象 | 書き方 | 例 |
| --- | --- | --- |
| ブロック | camelCase | `.postNav` |
| 要素 | `__` + camelCase | `.postNav__link` |
| 状態・種類 | `.is-` + 名前 (BEMの `--` は使わない) | `.is-next`, `.is-lg` |
| ユーティリティ | kebab-case | `.text-center`, `.my-large` |
| JSから触る目印 | `data-` 属性 (クラスと分ける) | `[data-contact-form]` |
| Sass の変数, mixin, 関数 | kebab-case | `$button-width`, `make-block()` |
| CSS変数 | `--` で区切る | `--color--dark--active` |

### 2.7 値の書き方

- 引用符はダブルクォート
- 0 には単位を付けない
- 色コードは小文字。`settings/_colorSystem.scss` に集め、`theme-color()` で使う
- 小数の先頭の 0 を省かない (`0.5s`)
- `&, &:active` のような複数指定は 1 行でよい
- `transition` には対象を書く (`all` は使わない)
- レスポンシブはモバイルファースト (`min-width`)。ブロックの中に入れ子で書く

### 2.8 ファイル

- 部品のファイルの先頭に `/** 種類 - 名前 */` を書く
- ファイル名は `_camelCase.scss`。`utilities/` は kebab-case でもよい

### 2.9 Sass のモジュール

`@import` は使わない。`@use` と `@forward` で読み込む。

| ファイル | 役割 |
| --- | --- |
| `_variables.scss` | 既定値を上書きする唯一の場所。`settings` と `mixins` をまとめて渡す |
| `settings/` | 変数と関数。部品の変数 (`!default`) は `settings/_components.scss` に書く |
| `mixins/` | 部品から使う mixin |
| 部品 (`_*.scss`, `utilities/`) | CSSを出す。先頭に `@use "variables" as *;` を書く (`utilities/` は `../variables`) |
| `style.scss` | CSSを出す部品を、出力したい順に `@use` で並べる |

既定値は次のように上書きする。

```scss
@use "sass:math";

$-grid-base: 5.33rem; // 上書きの中で使い回す値

@forward "settings" with (
  $colors: (primary: #1b6698, secondary: #cc5200),
  $font-family-sans: ("Zen Kaku Gothic New", sans-serif),
  $grid-base: $-grid-base,
  $gutter: math.div($-grid-base, 4)
);
@forward "mixins";
```

- `settings/` と `mixins/` からはCSSを出さない。部品どうしも `@use` しない (CSSの出力順が変わるため)
- `@forward` は依存先を先に書く。`_variables.scss` は `settings` → `mixins` の順 (逆はエラーになる)
- `with` の中でカンマ区切りの値は括弧で囲む。使い回す値は `-` で始まる変数にする
- `with` に存在しない変数を書くとエラーになる (変数名の誤りに気づける)
- `/` の除算は `math.div()`、`map-get()` は `map.get()`。明度は `shift-lightness()` で変える (`color.adjust()` は 0%〜100% の範囲で止まらない)
- Live Sass の Sass の版は拡張機能の更新で変わる。移行を確かめた版は 1.97.3

---

## 3. JavaScript

- ES Modules で、ビルドなしでそのまま動かす
- 機能ごとに `class`。`export default class Name`
- `import` はファイルの先頭にまとめる
- シングルクォート。埋め込みはテンプレートリテラル
- セミコロンを付ける
- `const` を基本に、再代入するときだけ `let`。`var` は使わない
- 比較は `===`, `!==`
- 変数とメソッドは camelCase、クラスは PascalCase、ファイル名は kebab-case
- コールバックはアロー関数。引数が 1 つでも括弧を付ける (`(event) => ...`)
- 早期 return など 1 文の `if` は 1 行でよい (`if (!el) return;`)
- オプションの既定値は `??` を使う (`||` は 0 や空文字を上書きする)
- クラスの上に「使い方」「オプション」をコメントで書く
- 軸の順序の規則は当てはめない。`x, y` と `width, height` の順

---

## 4. PHP

- PHP 8.0 以上で動く書き方にする
- シングルクォート。変数の埋め込みはダブルクォート
- 配列は `[]`
- 引数と戻り値に型を書く
- 関数とメソッドは camelCase (`getPosts()`)
- クラスは PascalCase
- 定数は `SITE_` で始まる大文字 (`const SITE_NAME`)
- 変数は camelCase (`$baseUrl`)
- 配列のキーは camelCase (`showDate`)
- 自分で付ける名前に snake_case を使わない (定数を除く)。PHP、WordPress、JSON-LDなど、外部で決まっている名前はそのまま使う (`cookie_httponly`, `datePublished`)
- WordPress のテーマの関数は、WordPress の慣習に合わせて snake_case でもよい
- 波括弧は関数もクラスも同じ行 (`function x(): void {`)
- 早期 return など 1 文の `if` は 1 行でよい
- PHPだけのファイルには `?>` を書かない
- ファイル名は、クラスが `PascalCase.php`、テンプレートが `camelCase.php`
- HTMLに出す値は `e()` を通す
- コメントは `//` または `/** */` で日本語。オプションは一覧で書き、`@param` は使わない
- 新しい設定は `defined()` や既定値で、古い `config.php` でも動くようにする
- テンプレートの制御は `<?php if (...) { ?>` ... `<?php } ?>`、値の出力は `<?= e($value) ?>`

---

## 5. HTML (テンプレート)

- 引用符はダブルクォート
- 属性の順序は `id` → `class` → `src`/`href` → `alt` → `width`/`height` → `loading` など → `data-` → `aria-`
- 画像には `alt` を必ず書く (飾りなら `alt=""`)
- `target="_blank"` には `rel="noopener"` を付ける

---

## 6. Git とドキュメント

- コミットは短い英文。`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `release:`
- `Closes #番号` / `Refs #番号` を書く。ただし、履歴を使い回す starter-template には書かない (番号が派生先で意味を持たないため)
- ブランチは `feat/番号-内容`
- release は `release: vX.Y.Z - 内容`。CHANGELOG と README を含める
- CHANGELOG は古い版を上に書き、日付は書かない

---

## 7. 一般的な慣習と違う点 (意図した書き方)

次の点は意図して選んでいる。ツールや一般的な規約に合わせて「直さない」。

| この規約 | 一般的な慣習 |
| --- | --- |
| y → x の記述順、`width` → `height` は例外 | 順序を決めない、アルファベット順、Concentric CSSなど |
| `.postNav__link`, `.is-next` | BEMの `post-nav__link`, `--next` |
| PHPの字下げが空白 2 つ、波括弧が同じ行 | PSR-12は空白 4 つ、次の行 |
| `<?php if () { ?>` | `if: ... endif;` |
| 早期 return の 1 行の `if` | PSR-12などは波括弧を求める |
| コメントの半角 `, ` と `. ` | 日本語は `、` `。` |
| `strict_types` なし、`@param` なし | 新しいPHPでは宣言や PHPDoc が多い |
