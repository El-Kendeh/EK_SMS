---
name: Guardian Intelligence
colors:
  surface: '#f4fbf4'
  surface-dim: '#d4dcd5'
  surface-bright: '#f4fbf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef6ee'
  surface-container: '#e8f0e9'
  surface-container-high: '#e3eae3'
  surface-container-highest: '#dde4dd'
  on-surface: '#161d19'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#2b322d'
  inverse-on-surface: '#ebf3eb'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#535f74'
  on-secondary: '#ffffff'
  secondary-container: '#d4e0f9'
  on-secondary-container: '#576378'
  tertiary: '#a43a3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#d7e3fc'
  secondary-fixed-dim: '#bbc7df'
  on-secondary-fixed: '#101c2e'
  on-secondary-fixed-variant: '#3c475b'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#f4fbf4'
  on-background: '#161d19'
  surface-variant: '#dde4dd'
typography:
  display-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  h1:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
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
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  unit-1: 0.25rem
  unit-2: 0.5rem
  unit-4: 1rem
  unit-6: 1.5rem
  gutter: 1rem
  margin-mobile: 1rem
  margin-desktop: 2rem
---

## Brand & Style
This design system centers on the concept of **Institutional Trust**. It is a Corporate/Modern interpretation optimized for the educational sector, where clarity and security are paramount. The aesthetic is characterized by a "High-Utility Minimalism" that prioritizes information density and load performance over decorative flair. 

The target audience consists of students who require immediate access to grades, attendance, and schedules. The emotional response should be one of competence and reliability. To achieve this, the system utilizes a dark-mode sidebar to anchor the navigation, contrasting with a bright, card-based workspace that feels organized and air-tight. Trust indicators—such as locked states for grades and persistent alert banners—are treated as first-class citizens in the visual hierarchy, never hidden, always legible.

## Colors
The palette is functional and high-contrast to ensure accessibility and performance on low-end displays. 

- **Sidebar (#0F1B2D):** A deep navy used to provide a strong structural frame. It houses primary navigation and remains dark even in light mode to maintain brand authority.
- **Canvas (#F8F9FB):** A cool, off-white background that reduces eye strain while allowing white cards to pop with minimal shadowing.
- **Action Emerald (#10B981):** Used exclusively for primary actions, completion states, and "success" indicators.
- **Utility Palette:** Warning, Danger, and Info colors are used with high saturation to ensure that alerts are immediately recognizable.

In dark mode, the canvas shifts to #0B121E, and cards shift to #162235, maintaining the same contrast ratios.

## Typography
The system uses **Inter** exclusively to take advantage of its systematic, utilitarian nature and excellent legibility at small sizes. 

- **Hierarchy:** We use a tight scale to maximize screen real estate on mobile devices.
- **Numbers:** Tabular lining should be enabled for any grade-related or chronological data to ensure columns align perfectly in dashboards.
- **Weight:** Medium (500) and Semi-bold (600) weights are used for trust indicators and status labels to ensure they stand out against body copy.

## Layout & Spacing
The layout follows a **Fluid-to-Fixed Grid** model. On mobile, it is a single-column stack with 16px (unit-4) side margins. On desktop, the sidebar is fixed at 280px, while the main content area uses a fluid 12-column grid.

- **Mobile-First:** Spacing is compressed to minimize scrolling.
- **Rhythm:** An 8pt grid is used for vertical rhythm, but 4pt increments are permitted for tight component internals (e.g., icon-to-text spacing).
- **The "Safe Zone":** Cards are separated by 1rem (unit-4) gutters to maintain a clean, modular appearance without wasting space.

## Elevation & Depth
To ensure low-bandwidth friendliness, this design system avoids heavy blurs and complex shadows. Depth is communicated primarily through **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Canvas):** #F8F9FB.
- **Level 1 (Cards):** White (#FFFFFF) background with a 1px border of #E2E8F0. No shadow.
- **Level 2 (Active/Hover):** A very soft, 4px blur shadow with 5% opacity, used only to indicate interactivity.
- **Trust Overlays:** Modals and urgent alerts use a solid 1px border in the status color (e.g., Danger Red) to signify importance without relying on depth effects.

## Shapes
The shape language is **Soft (0.25rem)**. This provides a professional, "software-as-a-service" feel that is more approachable than sharp corners but more serious than highly rounded "bubbly" interfaces.

- **Standard Radius:** 4px for buttons, inputs, and small chips.
- **Container Radius:** 8px (rounded-lg) for main dashboard cards and modals.
- **Exceptions:** Pills are used only for status badges (e.g., "Enrolled") to distinguish them from actionable buttons.

## Components
Consistent component styling ensures the portal feels cohesive and secure.

- **Buttons:** Primary buttons are solid Emerald (#10B981) with white text. Secondary buttons use a ghost style with a subtle border. Icons from Material Symbols (Rounded) are always 20px.
- **Trust Indicators:** 
    - **Locked States:** Use a grayed-out background with a centered `lock` icon.
    - **Alerts:** Persistent banners at the top of the content area with a solid left-border (4px) in the status color.
- **Cards:** Dashboard cards must have a defined header area with `label-caps` typography. Content inside cards should be padded at 16px.
- **Input Fields:** Use a 1px border (#E2E8F0). On focus, the border transitions to Primary Emerald with a 2px outer ring of 10% opacity.
- **Chips/Badges:** Use a "Light Fill" approach—e.g., a Warning badge is 10% opacity orange background with 100% opacity orange text.
- **Material Symbols:** Use the 'Rounded' weight. For "Locked" indicators, use the `lock` symbol; for "Urgent" tasks, use `error` or `priority_high`.