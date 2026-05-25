---
name: Technological Authority
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#c4c5d7'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#303034'
  outline: '#8e90a0'
  outline-variant: '#444655'
  surface-tint: '#b8c3ff'
  primary: '#b8c3ff'
  on-primary: '#002388'
  primary-container: '#6d88ff'
  on-primary-container: '#001e77'
  inverse-primary: '#294fdb'
  secondary: '#c2c7d0'
  on-secondary: '#2c3138'
  secondary-container: '#42474f'
  on-secondary-container: '#b1b5bf'
  tertiary: '#ffb68e'
  on-tertiary: '#532200'
  tertiary-container: '#e37020'
  on-tertiary-container: '#491d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c3ff'
  on-primary-fixed: '#001355'
  on-primary-fixed-variant: '#0035bd'
  secondary-fixed: '#dee2ec'
  secondary-fixed-dim: '#c2c7d0'
  on-secondary-fixed: '#171c23'
  on-secondary-fixed-variant: '#42474f'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  display-lg:
    fontFamily: Syne
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Syne
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Syne
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: DM Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: DM Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.0'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  sidebar-width: 280px
  container-padding: 32px
  gutter: 24px
  card-gap: 24px
---

## Brand & Style

This design system is engineered for high-stakes administrative environments where precision, speed, and technical clarity are paramount. The brand personality is **authoritative, high-tech, and sophisticated**, designed to make the user feel like they are operating a command center.

The aesthetic follows a **Modern Corporate** approach with a **Technical/Developer-centric** edge. It utilizes deep layering, high-contrast accents, and monospaced utilitarian elements to evoke a sense of "systemic control." The UI remains focused on data density and legibility while maintaining a premium, "dark-mode-first" executive feel.

## Colors

The palette is anchored by a deep charcoal-navy base (`#0C0D10`), providing a high-contrast foundation for the "Electric Indigo" accent (`#4A6CF7`). 

- **Primary:** Electric Indigo for primary actions, focus states, and active navigation indicators.
- **Surface Tiers:** 
  - Level 0: `#0C0D10` (Background)
  - Level 1: `#161B22` (Cards/Sidebar)
  - Level 2: `#21262D` (Inputs/Popovers)
- **Status Indicators:** Strict semantic coloring for data states:
  - **Gray (Upcoming):** Neutral status for pending or future items.
  - **Green (Active):** High visibility for healthy/live states.
  - **Red (Archived):** Critical or terminal state.
  - **Blue (Completed):** Informational success state.

## Typography

The typography strategy creates a deliberate tension between expressive headings and technical metadata.

1.  **Headlines (Syne):** Used in heavy weights (700-800) for page titles and section headers. Its geometric, slightly avant-garde structure gives the dashboard a modern, premium feel.
2.  **Body (Geist):** A neutral, highly readable sans-serif for long-form data and descriptions.
3.  **Utility & Metadata (DM Mono):** All labels, badges, table data, and hints use DM Mono. This reinforces the "system-level" personality and ensures that numerical data is perfectly aligned and easy to scan. Use uppercase for `label-md` to increase visual hierarchy in navigation headers.

## Layout & Spacing

This design system utilizes a **Fixed Sidebar** layout with a fluid content area. 

- **Sidebar:** Fixed at 280px. It should collapse to a 64px icon-only rail on smaller viewports or be hidden behind a hamburger menu on mobile.
- **Grid:** A 12-column grid for the main content area. Gaps are strictly 24px (`3rem`) to maintain high-density information without visual clutter.
- **Margins:** Standard page padding is 32px. On mobile, this reduces to 16px.
- **Rhythm:** All spacing (margins, padding, gaps) should be multiples of the 8px base unit to ensure mathematical harmony across the dashboard.

## Elevation & Depth

Depth is established through **Tonal Layering** rather than heavy shadows. In a dark environment, light is used sparingly to define hierarchy.

- **Bottom Layer:** The deep navy background (`#0C0D10`).
- **Surface Layer:** Cards and navigation elements use a slightly lighter fill (`#161B22`) with a subtle 1px border (`#30363D`) to define edges.
- **Interactive Layer:** Modals and dropdowns use the lightest surface (`#21262D`) and a soft, large-spread ambient shadow (Black, 40% opacity, 20px blur) to appear "lifted" above the data.
- **Dividers:** Use low-contrast 1px lines (`rgba(255, 255, 255, 0.05)`) for internal card separation.

## Shapes

The design system uses a mixed-radius approach to distinguish between containers and controls.

- **Containers (Cards/Modals):** 16px radius. This provides a softer, modern frame for complex data.
- **Controls (Inputs/Buttons):** 10px radius. A slightly sharper corner that feels more "precise" and technical.
- **Utility (Badges/Toggles):** Full pill-shape (999px) to differentiate these from interactive buttons or input fields.

## Components

### Buttons & Toggles
- **Primary Button:** Solid Electric Indigo fill, white text, 10px radius.
- **Toggles:** Pill-shaped track. Grey-dark when off; Electric Indigo when on. The switch "thumb" should be white.
- **Navigation Items:** Active state indicated by a vertical 4px Indigo bar on the left edge and a subtle Indigo tint in the background (10% opacity).

### Forms
- **Inputs:** Dark filled (`#161B22`) with a 1px border (`#30363D`). 
- **Focus State:** 2px solid Electric Indigo ring with a 2px offset to maintain clarity.
- **Labels:** Always use DM Mono in `label-sm` style, positioned above the field.

### Cards
- **Structure:** 16px radius, Level 1 surface. 
- **Header:** Cards should include a header section with a 1px bottom divider if they contain complex data tables or multiple action sets.

### Status Indicators
- **Badges:** Use a subtle background tint of the status color (e.g., 15% opacity Green) with a solid colored dot (8px x 8px) on the left side of the DM Mono label.
- **Dots:** Used inside dropdown menus to indicate status without needing full labels.

### Tables
- **Header:** `label-md` (DM Mono, Uppercase) for column headers.
- **Rows:** Alternate row stripping is not used; use subtle 1px dividers between rows to maintain the high-tech, clean look.