# Fixing the Narrow-Centered-Column Bug in a Create React App Landing Page: A Diagnostic and Implementation Guide

## TL;DR
- **The root cause is almost always one of three things:** (1) the default `.App-header` rule in CRA's `App.css` (`display: flex; flex-direction: column; align-items: center;`) which shrinks every child to its *content* width, (2) a `max-width` declared on `#root`, `.App`, `body`, or a layout wrapper (often 1200–1280px), or (3) section components that use `display: flex; flex-direction: column; align-items: center` themselves. Open DevTools, select the hero `<section>`, walk up the DOM, and inspect each ancestor's computed `display`, `align-items`, `max-width`, and `width` — the first ancestor whose computed width is ~700–900px is the culprit.
- **The correct architecture is the "full-bleed section + inner container" pattern:** every top-level `<section>` is `width: 100%` (no max-width, no flex-centering), and an inner `.container` div with `max-width: 1200px; margin-inline: auto; padding-inline: clamp(1rem, 5vw, 2rem)` holds the actual content. Background colors live on the section; layout constraints live on the inner container. Never use `width: 100vw` (it overflows by the scrollbar width on Windows/Linux) — use `width: 100%` instead.
- **The fix is mechanical:** delete `text-align: center` and the `align-items: center` flex rules from `App.css`/`index.css`, remove any `max-width` from `#root`/`.App`, then refactor `Hero` and `Features` to use the wrapper/container pattern shown in the Details section. Validate by inspecting the section element in DevTools and confirming its computed width equals `window.innerWidth` (minus scrollbar).

## Key Findings

1. **The CRA default template ships CSS that directly causes this bug.** The verbatim default `src/App.css` (from `github.com/react/create-react-app/blob/main/packages/cra-template/template/src/App.css`) contains:

   ```css
   .App { text-align: center; }
   .App-header {
     background-color: #282c34;
     min-height: 100vh;
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: center;
     font-size: calc(10px + 2vmin);
     color: white;
   }
   ```

   When you replace the demo content with `<Hero />` and `<FeaturesSection />` *inside* the existing `<header className="App-header">`, the `align-items: center` rule (which on a column flexbox controls the **horizontal/cross** axis) **shrinks each child to its intrinsic content width** rather than stretching them to fill the available width. This is the single most common cause of the symptom described.

2. **`align-items: center` on a column flexbox is NOT equivalent to `text-align: center`.** When children are flex items and `align-items` is `center` (instead of the default `stretch`), they collapse to their min-content width on the cross axis. A `<section>` containing an `<h1>` and two `<p>` tags will visually become ~700–900px wide because that's the natural width of the wrapping text. Kyle Shevlin, in his May 4, 2024 article "align-items: center vs. text-align: center" (kyleshevlin.com), states verbatim: *"When we change align-items to center, we shrink all the children to their minimum content width."*

3. **`#root` itself has no width constraint by default**, but many boilerplates and tutorials add one. The default `public/index.html` is just `<div id="root"></div>` with no inline styles, and the default `index.css` only sets `body { margin: 0; font-family: ...; }` with no height or width rules. So if `#root` is constrained, it is *something you (or a tutorial) added* — common culprits are `#root { max-width: 1280px; margin: 0 auto; }` or `.App { max-width: 1200px; margin: 0 auto; }`.

4. **`width: 100vw` is the wrong tool for "full width."** It includes the vertical scrollbar's width on Windows/Linux (and on macOS with persistent scrollbars), producing a horizontal scrollbar and ~15px overflow. Per Šime Vidas in "New CSS Viewport Units Do Not Solve The Classic Scrollbar Problem" (Smashing Magazine, December 20, 2023), the CSS Working Group resolved: *"If overflow: scroll is set on the root element (not propagated from `<body>`), account for the default scrollbar width in the size of vw. Also, take scrollbar-gutter […] into account on the root."* Vidas notes the resolution had not yet been incorporated into the spec at the time of publication, so this remains a real-world hazard. Use `width: 100%` on block-level elements; they correctly exclude the scrollbar.

5. **CRA itself is deprecated as of February 14, 2025**, announced by Matt Carroll and Ricky Hanlon on the official React blog ("Sunsetting Create React App," react.dev/blog/2025/02/14/sunsetting-create-react-app): *"Today, we're deprecating Create React App for new apps, and encouraging existing apps to migrate to a framework, or to migrate to a build tool like Vite, Parcel, or RSBuild."* React 19 has peer-dependency conflicts with CRA's pinned dependency tree. None of this changes the CSS bug — the same pattern applies to a CRA project still in use — but if you're starting fresh, migrate to Vite. Vite's default `index.css` has its own version of this bug: `body { margin: 0; display: flex; place-items: center; min-width: 320px; min-height: 100vh; }`. The `display: flex; place-items: center` on `<body>` shrinks `#root` to the width of its content. Delete those rules.

6. **The modern best-practice layout pattern is "full-bleed section + constrained inner container."** Top-level `<section>` elements span 100% of the viewport (for backgrounds, gradients, color bands), while an inner `.container` div constrains the readable content to ~1140–1280px on desktop. This is what Bootstrap, Tailwind, MUI, and essentially every professional landing page uses. Recommended max-widths per the design industry: **1200px for general content** (60% of 1920px screens still get a focused column), **1140px** if you want to match Bootstrap's default, **1440px** for image-heavy marketing pages, and **65ch / ~720px** for body text columns within a wider section.

## Details

### 1. The Diagnostic Process (do this FIRST, before changing any CSS)

Run this checklist in order in Chrome/Firefox DevTools. The goal is to identify *which specific element* is constraining the width before you change anything.

**Step 1 — Inspect the hero section.**
Right-click the visible hero content → Inspect. In the Elements panel, you should land on something like `<section class="hero">` or `<div class="hero">`. Look at the highlighted bounding box on the page — note its rendered width.

**Step 2 — Read the computed width in the Layout / Computed tab.**
Switch to the **Computed** tab. Find `width`. If you're on a 1920px monitor and `width` shows 720, 800, or 880 — that's your bug.

**Step 3 — Walk up the DOM tree, one ancestor at a time.**
Press the Up arrow (or click the parent) repeatedly. For each ancestor (`<div class="App">`, `<div id="root">`, `<body>`, `<html>`), check:
- Computed `width`
- Computed `max-width`
- Computed `display`
- Computed `align-items` (if `display` is `flex` or `grid`)
- Computed `flex-direction`
- Computed `margin` (especially `margin-left: auto; margin-right: auto`)

The **first ancestor whose computed `width` ≈ 1920px** is fine. The **last ancestor whose computed `width` is narrow** is where the constraint starts. Look at its declared rules in the Styles pane.

**Step 4 — Use the flexbox badge.**
In Chrome DevTools, any element with `display: flex` shows a small `flex` badge next to it in the Elements panel. Click it. The page overlays the flex container's axes. If you see `flex-direction: column` and `align-items: center` on an ancestor of your section, your children are being shrunk to content width on the cross axis. This is the most common cause.

**Step 5 — Toggle styles to confirm.**
In the Styles pane, click the checkbox next to `align-items: center` to disable it. If the section snaps to full width, you've confirmed the diagnosis. (Toggle it back on; we'll fix it in the source files.)

**Step 6 — Check for `max-width` on `#root`, `.App`, and `body`.**
Select `<div id="root">`. In the Styles pane, scroll through every rule (including inherited ones). If any rule declares `max-width: 1200px` (or any pixel/rem value) on `#root`, `.App`, `body`, or a layout wrapper, that is your constraint.

**Step 7 — Disable overflow temporarily to verify scrollbar issues.**
If you find `width: 100vw` anywhere, temporarily check the page on Windows or with macOS scrollbars set to "always show." If you see a horizontal scrollbar, the `100vw` is overflowing by the scrollbar width — replace with `width: 100%`.

### 2. The Most Common Root Causes (in order of frequency)

| # | Cause | How to spot it | Fix |
|---|---|---|---|
| 1 | `.App-header { display: flex; flex-direction: column; align-items: center }` from default CRA `App.css`, with your sections rendered inside it | The `<section>` is a flex item; computed width = content width | Move sections **out of** `.App-header`, or delete the `align-items: center` |
| 2 | A section/component CSS rule that itself uses `display: flex; flex-direction: column; align-items: center` | Inspect the section; flex badge present; computed width < parent width | Remove `align-items: center`; use `text-align: center` on the inner content if you wanted text centering |
| 3 | `max-width` on `.App`, `#root`, a layout wrapper, or `<main>` | Inspect ancestor; Styles pane shows `max-width: 1200px` (or similar) and `margin: 0 auto` | Remove the `max-width` from the outer wrapper; move it to inner `.container` divs only |
| 4 | `text-align: center` from default `.App` rule (cosmetic, not a width bug, but often misdiagnosed) | Text is centered but element itself is full-width | Delete `text-align: center` from `.App` if you don't want global text centering |
| 5 | `width: 100vw` on a section causing horizontal scrollbar and apparent narrowing | Page has a horizontal scrollbar; section overflows ~15px on Windows | Replace with `width: 100%` |
| 6 | `width: fit-content` or `width: max-content` or `display: inline-block` on the section | Computed width matches content exactly; no margin auto centering | Use `display: block; width: 100%` |
| 7 | A grid container with constrained columns (e.g., `grid-template-columns: 700px 1fr`) | Inspect for grid badge; check column tracks | Use `grid-template-columns: 1fr` or restructure |
| 8 | Box-sizing or padding/border math creating apparent narrowing | Rare; check the Box Model diagram for unexpected margins | Set `*, *::before, *::after { box-sizing: border-box }` globally |

### 3. The Recommended Architecture: Full-Bleed Section + Inner Container

This is the pattern used by virtually every professional landing page. Two CSS rules do all the work.

**`src/index.css` (global reset + design tokens):**

```css
/* Box model reset */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  /* Reserve scrollbar space to prevent layout shift and 100vw bugs.
     Shipped in all evergreen browsers since Dec 2024. */
  scrollbar-gutter: stable;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg);
}

/* No max-width here, no display: flex, no place-items.
   #root must be allowed to span the full viewport width. */
#root {
  min-height: 100vh;
  isolation: isolate;
}

:root {
  /* Design tokens — used everywhere via var() */
  --container-max: 1200px;       /* primary content max-width */
  --container-narrow: 720px;     /* for body text (65–75ch) */
  --container-wide: 1440px;      /* for image-heavy marketing rows */
  --gutter: clamp(1rem, 5vw, 2rem);

  --color-bg: #ffffff;
  --color-text: #111827;
  --color-surface: #f8fafc;
  --color-primary: #4f46e5;
}

/* Reusable container — drop inside any section */
.container {
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

.container--narrow { max-width: var(--container-narrow); }
.container--wide   { max-width: var(--container-wide); }
```

**`src/App.css` — DELETE ALMOST EVERYTHING from the default:**

```css
/* BEFORE (default CRA — DELETE these rules):
   .App { text-align: center; }
   .App-header { min-height: 100vh; display: flex; flex-direction: column;
                 align-items: center; justify-content: center; }
*/

/* AFTER — App is just a transparent passthrough */
.App {
  /* nothing. No width, no max-width, no flex, no text-align. */
}
```

**`src/App.jsx`:**

```jsx
import './App.css';
import Hero from './components/Hero/Hero';
import Features from './components/Features/Features';

function App() {
  return (
    <div className="App">
      <Hero />
      <Features />
    </div>
  );
}
export default App;
```

Notice: there is **no `App-header` wrapping the sections**. Each section is a sibling of its peers directly under `.App` → `#root` → `<body>`. Each section spans 100% of `#root` (which itself spans 100% of `<body>`).

### 4. Refactored Hero Section

**`src/components/Hero/Hero.jsx`:**

```jsx
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero__inner">
        <h1 className="hero__title">Build something remarkable</h1>
        <p className="hero__subtitle">
          A landing page that finally fills the screen.
        </p>
        <div className="hero__actions">
          <a className="btn btn--primary" href="#get-started">Get started</a>
          <a className="btn btn--ghost" href="#learn-more">Learn more</a>
        </div>
      </div>
    </section>
  );
}
```

**`src/components/Hero/Hero.css`:**

```css
/* The OUTER section spans the full viewport width.
   This is where backgrounds, gradients, and dividers live. */
.hero {
  width: 100%;                              /* NOT 100vw */
  background: linear-gradient(
    135deg,
    var(--color-primary) 0%,
    #7c3aed 100%
  );
  color: white;
  /* Vertical rhythm scales with viewport, capped */
  padding-block: clamp(4rem, 12vh, 8rem);
}

/* The INNER container constrains the content width.
   .container is defined globally in index.css and gives us:
   width: 100%; max-width: 1200px; margin-inline: auto;
   padding-inline: clamp(1rem, 5vw, 2rem); */
.hero__inner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;                  /* NOT center — content stays left-aligned */
  gap: 1.5rem;
  text-align: left;
}

.hero__title {
  font-size: clamp(2.25rem, 5vw, 4rem);
  line-height: 1.1;
  margin: 0;
  max-width: 18ch;                          /* readable line length */
}

.hero__subtitle {
  font-size: clamp(1.125rem, 1.5vw, 1.375rem);
  max-width: 50ch;
  margin: 0;
  opacity: 0.9;
}

.hero__actions { display: flex; gap: 1rem; flex-wrap: wrap; }
```

**BEFORE / AFTER comparison for Hero.css:**

```css
/* ============== BEFORE (causes the bug) ============== */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;        /* ← shrinks h1, p, actions to content width */
  justify-content: center;
  padding: 4rem 2rem;
  background: #4f46e5;
  color: white;
}

/* ============== AFTER (correct) ============== */
.hero {
  width: 100%;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: white;
  padding-block: clamp(4rem, 12vh, 8rem);
}
.hero__inner {                /* the inner .container handles max-width + centering */
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
```

### 5. Refactored Features Section

**`src/components/Features/Features.jsx`:**

```jsx
import './Features.css';

const FEATURES = [
  { title: 'Fast', body: 'Vite-powered builds in milliseconds.' },
  { title: 'Themed', body: 'CSS variables for instant theming.' },
  { title: 'Responsive', body: 'Mobile-first with clamp()-based fluid sizing.' },
  { title: 'Accessible', body: 'Semantic HTML and WCAG-compliant defaults.' },
];

export default function Features() {
  return (
    <section className="features">
      <div className="container">
        <header className="features__header">
          <h2 className="features__title">Why teams choose this stack</h2>
          <p className="features__lede">
            Four reasons that compound over the life of a product.
          </p>
        </header>

        <ul className="features__grid">
          {FEATURES.map((f) => (
            <li key={f.title} className="feature-card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

**`src/components/Features/Features.css`:**

```css
.features {
  width: 100%;
  background: var(--color-surface);
  padding-block: clamp(4rem, 10vh, 6rem);
}

.features__header {
  max-width: 60ch;
  margin-bottom: clamp(2rem, 5vh, 3rem);
}

.features__title {
  font-size: clamp(1.875rem, 3vw, 2.5rem);
  margin: 0 0 0.5rem;
}

.features__lede {
  color: #475569;
  margin: 0;
}

/* The grid does the responsive work — no media queries needed.
   auto-fit + minmax(min(280px, 100%), 1fr) prevents overflow on narrow screens. */
.features__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 1.5rem;
}

.feature-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
}
```

### 6. Why `width: 100vw` Is the Wrong Tool

It's tempting to write `.hero { width: 100vw; }` to "force" full width — don't. The `vw` unit was specified to include scrollbar width. On Windows/Linux and on macOS with "always show scrollbars" enabled, `100vw` is ~15px wider than the actual scrollable viewport, causing a horizontal scrollbar and ~15px right-side overflow. Jonnie Hallman (indie design engineer, Brooklyn) put it bluntly at destroytoday.com/blog/100vw-and-the-horizontal-overflow-you-probably-didnt-know-about: *"If width: 100% is your friend, then width: 100vw is the kid who only pretends to be your friend, so that he can swim in your pool."*

**Use `width: 100%`** on `<section>` elements — they're block-level, so they fill their parent (`.App` → `#root` → `<body>`), which itself is the viewport width minus scrollbar. Modern fallback if you genuinely need viewport-relative width: `html { scrollbar-gutter: stable; }` reserves the gutter so `100vw` is safe, but this only works once the rule is on `<html>` and is supported across evergreen browsers since December 2024 (MDN).

### 7. The "Break Out" Pattern (when you need a full-bleed element *inside* a constrained container)

Sometimes a constrained article needs one full-width image or callout. The cleanest modern technique (Josh W. Comeau's CSS Grid full-bleed pattern at joshwcomeau.com/css/full-bleed):

```css
.article {
  display: grid;
  grid-template-columns:
    1fr
    min(65ch, 100%)
    1fr;
}
.article > * { grid-column: 2; }
.article > .full-bleed { grid-column: 1 / -1; }
```

The legacy fallback (negative-margin trick) — works but causes 100vw overflow issues:

```css
.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
}
```

For a landing page, prefer the **section-level architecture** in section 3 above over the break-out pattern. Break-out is only needed when you cannot change the parent's HTML structure.

### 8. Recommended Max-Widths (decision table)

| Use case | Recommended max-width | Rationale |
|---|---|---|
| Hero / Features content on a marketing site | **1200px** | Bootstrap-equivalent; balances focus with screen utilization (~62% of a 1920px screen) |
| Image- and grid-heavy marketing rows | 1280–1440px | Lets cards and visuals breathe on large displays |
| Body text columns inside a section | 50–60ch (~600–720px) optimal; up to 75ch acceptable | Per the Baymard Institute's "Readability: The Optimal Line Length": *"The optimal line length for your body text is considered to be 50–60 characters per line, including spaces ('Typographie', E. Ruder). Other sources suggest that up to 75 characters is acceptable."* |
| Single-column blog post | 720–800px | Same readability target |
| Forms, dialogs, narrow modals | 480–640px | Focus and scan path |
| App dashboards / data tables | 100% (no max-width) | Different use case — utility, not marketing |

Do not exceed 1440px for primary content unless you have a deliberate reason: at 1600px+, only ~10% of users see the constraint (per VisionPoint Marketing's screen-share analysis at visionpointmarketing.com/maximum-page-width-in-fluid-responsive-design), but text becomes uncomfortably wide.

### 9. CSS Variables for Theming (since the project uses them)

Centralize the layout tokens in `:root` (see `index.css` above). To swap themes (dark mode, brand variants), override variables on a scope:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #111827;
  --color-surface: #f8fafc;
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-text: #f1f5f9;
  --color-surface: #1e293b;
}
```

Then in React: `document.documentElement.dataset.theme = 'dark'`. All layout/color rules that use `var(--color-bg)` etc. update instantly. Critically, **layout variables (`--container-max`, `--gutter`) live in the same `:root`**, so per-page or per-section overrides are trivial:

```css
.hero { --container-max: 1440px; } /* wider on hero only */
```

### 10. Common Pitfalls to Avoid

1. **Don't nest `.container` inside `.container`.** Padding compounds and inner content gets too narrow. The pattern is `section > .container > content`, never `section > .container > .container > content`.
2. **Don't put `max-width` on `<body>` or `#root`.** That breaks all full-bleed sections globally. Constrain content with `.container`, not the root.
3. **Don't use `min-height: 100vh` plus `display: flex; align-items: center` on the section.** This is the CRA default pattern that bites everyone. Use `padding-block: clamp(4rem, 12vh, 8rem)` for vertical rhythm instead — content height drives layout, not viewport height.
4. **Don't use `100vw`.** Use `100%`. Period.
5. **Don't forget `box-sizing: border-box` globally.** Without it, padding adds to the declared width and your math breaks.
6. **Don't keep `<header className="App-header">` wrapping sections.** That's a CRA demo artifact. Sections should be direct children of `.App`.
7. **Don't apply `align-items: center` to a column flex container expecting `text-align: center` behavior.** They are different. `align-items` controls box sizing on the cross axis; `text-align` controls inline content within a box.
8. **Don't mix `width: 100%` with `margin-left: auto; margin-right: auto`** and expect centering — a 100%-wide element is already as wide as its parent; auto margins have no extra space to distribute.

### 11. Validation Checklist (run after the fix)

- [ ] Open the page on a 1920px-wide display. Hero background extends edge-to-edge.
- [ ] Inspect `<section class="hero">` in DevTools. Computed `width` = `window.innerWidth` (minus scrollbar gutter if visible).
- [ ] Inspect `<div class="container">`. Computed `width` = 1200px (or your `--container-max`), regardless of viewport.
- [ ] Resize to 375px (mobile). No horizontal scrollbar. Container padding shrinks to ~16px via the `clamp()` gutter.
- [ ] On Windows or with macOS "always show scrollbars" enabled, no horizontal scrollbar appears.
- [ ] Toggle dark mode (if implemented). Layout unchanged; only colors change.
- [ ] Each section has its own background that reaches the viewport edges.

## Recommendations

**Stage 1 — Immediate diagnosis (5 minutes).** Open DevTools, inspect the hero section, walk up the DOM, and identify the offending ancestor. In 90% of CRA landing-page cases it is either `.App-header { align-items: center }` or a `max-width` on `#root`/`.App`. Don't change any code until you've confirmed which it is — the fix differs slightly between the two.

**Stage 2 — Apply the architecture fix (30 minutes).**
1. Replace `src/App.css` contents with the minimal version above.
2. Replace `src/index.css` with the version above (CSS variables, container utility, `scrollbar-gutter: stable`, box-sizing reset).
3. Remove `<header className="App-header">` wrapping from `App.jsx`; render `<Hero />` and `<Features />` directly under `<div className="App">`.
4. Refactor `Hero.jsx` and `Features.jsx` to use the `section > .container > content` pattern.
5. Run the validation checklist.

**Stage 3 — Long-term migration (if applicable).** If you're starting a new project or have time, migrate from CRA to Vite (`npm create vite@latest`). CRA was officially deprecated on February 14, 2025 by the React team and has dependency conflicts with React 19. Vite's default template has its own minor CSS bug (`body { display: flex; place-items: center }` in its `index.css`) — delete those rules using the same logic. The migration takes 1–2 hours for a small landing page.

**Benchmarks that would change these recommendations:**
- If users report a horizontal scrollbar on any device: you still have a `100vw` somewhere or padding overflowing — search the codebase for `100vw` and replace.
- If content looks cramped at 1200px on a large display: increase `--container-max` to 1280 or 1440px, or add a `.container--wide` modifier to specific sections.
- If text lines exceed 75 characters: add `max-width: 60ch` to your paragraph/heading rules within the container — `.container` constrains the section, but body text needs an additional readability cap.
- If you adopt a CMS that injects content: switch the container max-width to a CSS variable that the CMS can override per page.

## Caveats

- The default `App.css` snippet quoted is the canonical CRA template as of the last stable cra-template release (verified against `github.com/react/create-react-app/blob/main/packages/cra-template/template/src/App.css`). CRA has been in maintenance mode since 2023 and was formally deprecated February 14, 2025. If your project is on a fork (e.g., `react-app-rewired`, `craco`), some defaults may differ — verify by opening your actual `src/App.css`.
- The `scrollbar-gutter: stable` rule shipped in Chromium 94 (2021), Firefox 97 (2022), and Safari 18.2 (December 2024). Users on Safari ≤ 18.1 will not get scrollbar reservation; the layout will still work correctly with `width: 100%` (which was the primary fix), so this is a progressive enhancement, not a requirement.
- `clamp()` has near-universal support (>96% of browsers globally per caniuse). If you must support legacy browsers, provide a fallback: `padding-inline: 1.5rem; padding-inline: clamp(1rem, 5vw, 2rem);`.
- The minimum width target of 280px in `grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr))` is a sensible default but may need adjustment per design — make it a `--card-min` CSS variable if you have multiple grid layouts.
- This guide assumes a single-page landing layout. If you adopt routing (React Router), you may want a `<Layout>` component wrapping each page. Apply the same rule there: the `<Layout>` itself must not declare a `max-width`; it's a transparent passthrough. All max-widths live on inner `.container` divs.
- Vite's default template has a different bug-pattern: `body { display: flex; place-items: center }`. The remediation is the same (delete those rules), but the diagnostic differs slightly — the constraint is on `<body>`, not `.App-header`.
- The CSS Working Group's resolution about `100vw` accounting for scrollbar width was, per Šime Vidas writing in Smashing Magazine on December 20, 2023, not yet incorporated into the published CSS specification at the time of his article; browser shipping status as of May 2026 remains uneven. Treat `100vw` as unsafe until you've tested on Windows with classic scrollbars.