# Parent / Guardian Dashboard — UI/UX, Modals, Responsiveness & Accessibility

Part 4 of the Parent Dashboard audit — generated 2026-07-03.

Based on reading ~30 parent CSS files plus the render logic. The verdict is split: the **shell and state-handling are genuinely well built**, but a theming mistake makes most screens look broken on the default light background, and there is **no accessible dialog anywhere** in the portal. None of this is a redesign — most are find-and-replace or small additions.

## What's good (preserve this)

- **Shell**: off-canvas sidebar with overlay dismiss, sticky glass header, grouped collapsible nav, deliberate dark-mode red-on-dark contrast fixes ([ParentDashboard.css:740-754](../../src/components/parent/ParentDashboard.css#L740)).
- **State coverage**: a shared skeleton shimmer ([ParentDashboard.css:566](../../src/components/parent/ParentDashboard.css#L566)), a consistent `.par-empty` pattern, and per-screen loading/empty/error handling (e.g. [ParentReportCards.js:147](../../src/components/parent/ParentReportCards.js#L147), [ParentMessages.js:69](../../src/components/parent/ParentMessages.js#L69)). The toast honors `prefers-reduced-motion`.

The design intent is strong. The findings below are what undercut it.

## Finding 1 (major) — dark-canvas surfaces on a light shell → invisible cards

The shell defaults to a **light** canvas (`--par-bg: #F8F9FB`, [ParentDashboard.css:8](../../src/components/parent/ParentDashboard.css#L8)), but **19 of ~30** parent CSS files style their surfaces with hardcoded translucent-**white** fills and borders meant for a dark background:

```
.pfee__summary-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06) }   /* ParentFees.css:266 */
```

On the light background these fills are white-on-near-white → cards, rows, and list items have **essentially no visible background and invisible borders**. Text stays legible (the text token resolves dark), so the structure disappears but the content floats. Confirmed across Fees, Compare, Messages, Donations, and more.

**Fix:** replace every hardcoded `rgba(255,255,255,0.0x)` surface/border with the theme tokens the shell already defines (`--par-surface`, `--par-surface-low`, `--par-border`). Find-and-replace per file; no redesign.

## Finding 2 (major) — modals/drawers hardcode a dark navy background

`.pfee-modal` and `.pfee-drawer` fall back to `#112239` and style inner form controls with dark-canvas assumptions (`rgba(0,0,0,0.18)` fills, `rgba(255,255,255,0.10)` borders — [ParentFees.css:332-382](../../src/components/parent/ParentFees.css#L332)). In light mode the dialog chrome and form controls are low-contrast. **Fix:** point modal/drawer backgrounds and input fills at the light-aware surface tokens.

## Finding 3 (major) — no dialog in the portal is accessible

Grepping the parent tree for `role="dialog" | aria-modal | focus-trap | Escape | aria-live` returns almost nothing (only `LiveParentToast` has `aria-live`). Every modal/drawer is a bare `<div>` + `motion.div`:

| Dialog | File | Missing |
|---|---|---|
| Report-card Verify modal | [ParentReportCards.js:40](../../src/components/parent/ParentReportCards.js#L40) | `role`, `aria-modal`, focus trap, Escape, focus restore |
| Fees Pay / Receipt / Audit | [ParentFees.css:325](../../src/components/parent/ParentFees.css#L325) | same |
| Grade-history drawer | [ParentGrades.css:2](../../src/components/parent/ParentGrades.css#L2) | same |
| Conference booking drawer | ParentTeacherConferences.js | same |

Keyboard and screen-reader users cannot escape or navigate any dialog; focus stays behind the overlay. **Fix:** build one shared accessible-dialog primitive (`role="dialog" aria-modal="true" aria-labelledby`, focus trap, Escape-to-close, focus-on-open + restore-on-close) and use it everywhere.

## Finding 4 (major/partial) — shell controls miss accessible names & states

- Icon-only buttons with no `aria-label`: menu toggle ([ParentDashboard.js:239](../../src/components/parent/ParentDashboard.js#L239), also no `aria-expanded`/`aria-controls`), notification bell ([:256](../../src/components/parent/ParentDashboard.js#L256)), theme toggle (relies on `title` only, [:251](../../src/components/parent/ParentDashboard.js#L251)).
- Active nav item styled by class but no `aria-current="page"` ([:209](../../src/components/parent/ParentDashboard.js#L209)); group toggles lack `aria-expanded` ([:202](../../src/components/parent/ParentDashboard.js#L202)).
- The mobile overlay is a bare `<div onClick>` ([:234](../../src/components/parent/ParentDashboard.js#L234)) — not keyboard-dismissible; the off-canvas sidebar has no focus trap, no Escape, and there's no skip-to-content link.

## Finding 5 (major) — nav-reachable screens that read as broken UI

Independent of the data layer, three surfaces mislead the user (detail in [01](01-CURRENT-STATE-INVENTORY.md)/[02](02-PLAN-GAP-ANALYSIS.md)):
- **"Verify a doc"** nav item → `VerifyPage hash={null}` → permanent "Missing verification code" error screen.
- **Profile → "Edit Profile"** toggles a boolean; no form ever renders.
- **Home → Recent Activity** hardcoded "No recent activity" despite a live `family-activity` API.

## Responsiveness

The project mandates `@media` rules at ≤600 / ≤400 / ≤360 with ≥44px touch targets. Most of the portal complies; the exceptions:

| Screen | Breakpoints present | Issue |
|---|---|---|
| Most parent CSS | ✅ ≤600 (some ≤800) | Compliant |
| [ParentFees.css](../../src/components/parent/ParentFees.css) | ⚠️ only 768/700 on live `.pfee-*` | Missing 600/400/360; **plus ~256 lines of dead `.par-fees__*` CSS** the component no longer uses |
| [CompareChildren.css](../../src/components/parent/CompareChildren.css) | ⚠️ only 800 | Missing 600/400/360; in-card `dl` stays `1fr 1fr` → cramped on a 360px phone |
| [ParentGrades.css](../../src/components/parent/ParentGrades.css) | ✅ 768 | Mobile stacks the grade table into unlabeled cells (header row hidden, no per-cell labels) → `72 / A / PASS` loses meaning |

**Dead bottom-nav costing 70px on every phone:** `.par-main` reserves `padding-bottom: 70px` and `.par-bottom-nav` is fully styled with correct 44px targets ([ParentDashboard.css:352-399](../../src/components/parent/ParentDashboard.css#L352)) — but **no `.par-bottom-nav` element is ever rendered**. Every mobile screen has ~70px of empty space under it and ships ~50 lines of dead CSS. Either render the bottom nav (it's built) or delete the block and the padding.

## Touch targets below 44px

Modal close buttons are 28×28 ([ParentFees.css:345](../../src/components/parent/ParentFees.css#L345)), drawer close 28×28 ([:385](../../src/components/parent/ParentFees.css#L385)), grade-history drawer close 32×32 ([ParentGrades.css:43](../../src/components/parent/ParentGrades.css#L43)), `.pfee-btn` ~32px tall, and the fee "pay" control is a tiny text link. Sidebar nav items compute to ~42px. All under the mandate. **Fix:** bump to ≥44×44 (or add hit-area padding) and set nav items `min-height: 44px`.

## Priority order for the UI pass

1. **Finding 1** (light-canvas surfaces) — this is what makes the whole portal look broken; highest visual ROI, lowest effort.
2. **Finding 3** (accessible dialogs) — one shared primitive fixes every modal.
3. **Finding 2** (modal theming) + **Finding 4** (shell a11y) — small, mechanical.
4. Responsiveness cleanup (dead CSS, missing breakpoints, bottom-nav decision, touch targets).
5. **Finding 5** overlaps with the functional fixes in [06](06-UPGRADE-ROADMAP-AND-ADDONS.md).

None of these is a redesign. The design system is sound; it's mostly hardcoded colors that should be tokens, and missing ARIA.
