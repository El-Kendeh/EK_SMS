---
name: Kinetic Ledger
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#ff5451'
  on-tertiary-container: '#5c0008'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
The design system for this product is engineered for high-stakes financial environments within the educational sector. The brand personality is **authoritative, precise, and high-performance**. It targets Finance Officers and Administrators who require immediate clarity on complex fiscal data.

The design style follows a **Premium SaaS / Modern Corporate** aesthetic. It utilizes a deep dark mode to reduce eye strain during long sessions of data analysis. The interface relies on a rigorous "Information First" hierarchy, where data is prioritized over decorative elements. Visual interest is generated through vibrant, functional accents and surgical precision in layout, rather than ornamental flourishes. The goal is to evoke a sense of total control and absolute accuracy.

## Colors
The palette is rooted in a "Deep Navy" ecosystem to provide a more sophisticated alternative to pure black.

- **Primary (#3B82F6):** Used for interaction points, active states, and primary actions. It represents the "system intelligence."
- **Secondary / Success (#10B981):** Reserved strictly for positive financial indicators, growth metrics, and "Paid" statuses.
- **Tertiary / Error (#EF4444):** Used for alerts, overdue payments, and budget deficits.
- **Neutral / Surface:** The background layers use a tiered navy-charcoal scale to create depth without relying on heavy shadows.

## Typography
This design system utilizes **Inter** for its exceptional legibility in dense UI environments. For financial data and numerical strings (account numbers, currency amounts), **JetBrains Mono** is introduced to ensure tabular numerals align perfectly, facilitating easier vertical scanning of ledger entries.

- **Headlines:** Use tighter letter spacing and semi-bold weights to anchor the page.
- **Data Mono:** Specifically for currency and IDs.
- **Label Caps:** Used for small metadata and category headers to provide a structural "frame" for the content blocks.

## Layout & Spacing
The layout employs a **12-column fluid grid** for desktop, transitioning to a single-column stack for mobile devices. 

- **Sidebar:** A fixed 280px navigation rail on desktop.
- **Canvas:** The main workspace uses a 24px gutter between cards to maintain a high-density, professional "dashboard" feel.
- **Rhythm:** An 8px linear scale is used for all internal component spacing (padding/margins).
- **Margins:** Desktop pages have a 32px safe-area margin. Mobile screens scale down to 16px.

## Elevation & Depth
In this dark mode environment, depth is communicated through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows.

- **Level 0 (Canvas):** The deepest navy (#020617), used for the background.
- **Level 1 (Cards):** Slightly lighter (#0F172A) with a 1px solid border (#1E293B) to define the container limits.
- **Level 2 (Popovers/Modals):** High contrast against the canvas, using a #1E293B background with a subtle ambient glow (0px 8px 24px rgba(0,0,0,0.5)).
- **Interactive States:** Hovering over a card or list item should trigger a border color shift to the Primary Blue at 50% opacity, rather than an elevation lift.

## Shapes
This design system uses a **Soft (0.25rem)** corner radius for standard components like input fields and small buttons. Larger containers like KPI cards use **rounded-lg (0.5rem)**. This keeps the interface feeling modern but maintains the "rectilinear" precision associated with accounting and financial software. Circular shapes are reserved strictly for user avatars and status pips.

## Components
- **KPI Cards:** Feature a Title-MD label, a Display-LG numerical value (using Data-Mono), and a "Trend Badge" in the footer (using Green/Red variants).
- **Data Tables:** High-density rows (48px height). Header cells use Label-Caps. Text-based cells use Inter, while Currency columns use JetBrains Mono for alignment.
- **Status Badges:** Subtle background tints (10% opacity) with high-contrast text. For example, "Paid" uses 10% Secondary Green background with 100% Secondary Green text.
- **Input Fields:** Darker than the card surface (#020617) with a 1px border. On focus, the border transitions to Primary Blue.
- **Buttons:** 
  - *Primary:* Solid Blue background, white text. 
  - *Secondary:* Ghost style with Primary Blue border and text.
- **Progress Bars:** Thin 8px tracks. The "unfilled" portion uses the border color (#1E293B) while the "filled" portion uses vibrant Primary or Secondary colors to show goal completion.