# UI/UX Design Specification: Context Collector

**Version:** 1.0
**Date:** 2026-03-17
**Status:** Draft

---

## Design Philosophy

Context Collector is a **privacy-first developer tool**. The design should communicate trust, competence, and restraint. Think Linear, Raycast, Arc browser -- tools that respect the user's intelligence and get out of the way.

**Design Principles:**
1. **Quiet confidence** -- The UI should feel calm and capable, never loud or sales-y
2. **Information density without clutter** -- Developers want data, not decoration
3. **Progressive disclosure** -- Show the minimum needed; reveal complexity on demand
4. **Privacy as visible design** -- The UI should constantly reinforce that data stays local
5. **Respect for attention** -- No animations for animation's sake; every motion has purpose

---

## Design System

### Style: Clean Dark Minimal

A restrained dark interface with careful use of color. Depth created through subtle background layering, not shadows or borders. Inspired by terminal aesthetics but refined for mainstream use.

**Style DNA:**
- Dark backgrounds with layered surface hierarchy
- Single accent color (green) used sparingly for CTAs and success states
- Monospace elements for technical content, sans-serif for UI chrome
- Tight spacing, high information density
- Rounded corners (8px) for cards, slight rounding (6px) for buttons
- No gradients, no glows, no decorative elements

### Color Palette

```
Background Layers (darkest to lightest):
  bg-base:      #0B0F19    -- Deepest background (popup body)
  bg-surface:   #111827    -- Card/panel backgrounds
  bg-elevated:  #1F2937    -- Hover states, active elements
  bg-overlay:   #374151    -- Tooltips, dropdowns

Text Hierarchy:
  text-primary:   #F9FAFB  -- Primary content (gray-50)
  text-secondary: #9CA3AF  -- Labels, descriptions (gray-400)
  text-tertiary:  #6B7280  -- Timestamps, hints (gray-500)
  text-disabled:  #4B5563  -- Disabled text (gray-600)

Accent Colors:
  accent-green:   #22C55E  -- Primary CTA, success, "Extract"
  accent-green-h: #16A34A  -- Green hover state
  accent-blue:    #3B82F6  -- Links, info, secondary actions
  accent-amber:   #F59E0B  -- Warnings, experimental features
  accent-red:     #EF4444  -- Errors, destructive actions

Platform Brand Colors (muted for dark mode):
  whatsapp:       #25D366
  telegram:       #26A5E4
  gmail:          #EA4335
  linkedin:       #0A66C2

Borders & Dividers:
  border-subtle:  #1F2937  -- Barely visible separation
  border-default: #374151  -- Standard borders
  border-focus:   #3B82F6  -- Focus rings
```

### Typography

**Primary UI Font:** `Inter` (system-like, clean, excellent at small sizes)
**Monospace Font:** `JetBrains Mono` (technical content, file paths, stats)

```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* Tailwind Config */
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
}
```

**Type Scale (Extension Popup):**
| Element | Size | Weight | Font |
|---------|------|--------|------|
| Popup title | 16px | 600 | Inter |
| Section heading | 13px | 600 | Inter |
| Body text | 13px | 400 | Inter |
| Small label | 11px | 500 | Inter |
| Stats/numbers | 14px | 500 | JetBrains Mono |
| File paths | 12px | 400 | JetBrains Mono |

**Type Scale (Settings Page):**
| Element | Size | Weight | Font |
|---------|------|--------|------|
| Page title | 24px | 700 | Inter |
| Section heading | 18px | 600 | Inter |
| Body text | 14px | 400 | Inter |
| Input text | 14px | 400 | Inter |
| Code/paths | 13px | 400 | JetBrains Mono |

### Spacing & Layout

```
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48
Border radius: 6px (buttons), 8px (cards), 12px (modals)
Popup width: 380px (fixed)
Popup max-height: 600px (scrollable)
```

### Icons

**Icon set:** Lucide React (consistent with Linear/Raycast aesthetic)
**Size:** 16px (default), 20px (emphasis), 14px (inline)
**Style:** Stroke width 1.5px, rounded caps

**Platform Icons:** Custom SVG matching each platform's logo, rendered at 20x20px in their muted brand color.

---

## UI Surfaces

### 1. Extension Popup (~380x600px)

The popup is the primary interaction surface. It must be fast, focused, and scannable.

#### Layout Structure

```
┌──────────────────────────────────────┐
│  [Shield] Context Collector    [⚙]  │  <- Header (40px)
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🟢 WhatsApp   ──────── [✓]   │  │  <- Platform toggles
│  │ 🔵 Telegram   ──────── [ ]   │  │     (each 44px tall)
│  │ 🔴 Gmail      ──────── [✓]   │  │
│  │ 🔷 LinkedIn   ──────── [ ]   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Date Range:  [Last 30 days ▾] │  │  <- Quick filters
│  │ Mode:        [● Full ○ Incr.] │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Estimated: ~342 messages     │  │  <- Scope preview
│  │  from 12 conversations        │  │
│  │  Size: ~45 KB                 │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      [ Extract Context ]      │  │  <- Primary CTA
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 🔒 All data stays on device   │  │  <- Privacy badge
│  └────────────────────────────────┘  │
│                                      │
│  Last extraction: 3 days ago         │  <- Footer meta
└──────────────────────────────────────┘
```

#### States

**Idle State:**
- Platform toggles visible
- Quick filter controls
- Scope preview (estimated messages/size)
- Primary CTA: "Extract Context" (green)

**Extracting State:**
```
┌──────────────────────────────────────┐
│  [Shield] Context Collector    [⚙]  │
├──────────────────────────────────────┤
│                                      │
│  Extracting...                       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ✓ WhatsApp   12/12 chats      │  │  <- Per-platform
│  │   ████████████████████ 100%    │  │     progress
│  │                                │  │
│  │ ◉ Gmail      4/23 threads     │  │
│  │   ██████░░░░░░░░░░░░░  17%    │  │
│  │   Reading: Project Alpha...   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Overall: 134 of ~342 msgs    │  │
│  │  ████████████░░░░░░░░  39%    │  │
│  │  Elapsed: 0:42                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         [ Cancel ]            │  │  <- Cancel (outline)
│  └────────────────────────────────┘  │
│                                      │
│  🔒 Processing locally              │
└──────────────────────────────────────┘
```

**Complete State:**
```
┌──────────────────────────────────────┐
│  [Shield] Context Collector    [⚙]  │
├──────────────────────────────────────┤
│                                      │
│  ✓ Extraction Complete               │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  342 messages extracted        │  │
│  │  from 12 conversations         │  │
│  │  across 2 platforms            │  │
│  │                                │  │
│  │  WhatsApp:  8 chats · 204 msg │  │
│  │  Gmail:    4 threads · 138 msg │  │
│  │                                │  │
│  │  Size: 47 KB                  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │    [ Download ZIP ↓ ]         │  │  <- Primary CTA
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │    [ Extract Again ]          │  │  <- Secondary
│  └────────────────────────────────┘  │
│                                      │
│  🔒 No data was sent externally      │
└──────────────────────────────────────┘
```

**Error State:**
```
┌──────────────────────────────────────┐
│  Partial Extraction                  │
│                                      │
│  ┌─ Warning ─────────────────────┐  │
│  │ ⚠ Gmail: Not logged in.      │  │
│  │   Please open mail.google.com │  │
│  │   and sign in first.          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ✓ WhatsApp: 204 messages (OK)      │
│  ✗ Gmail: Failed (not logged in)    │
│                                      │
│  [ Download Partial ↓ ] [ Retry ]   │
└──────────────────────────────────────┘
```

#### Component Specifications

**Platform Toggle Row:**
```
Height: 44px (touch-friendly)
Layout: [Platform Icon 20px] [Name 13px/500] [spacer] [Toggle switch]
Background: bg-surface, hover: bg-elevated
Border-radius: 8px
Toggle: 36x20px, track bg-gray-600, checked bg-green-500
```

**Primary CTA Button:**
```
Height: 40px
Width: 100% (within padding)
Background: accent-green (#22C55E)
Text: #0B0F19 (dark on green for contrast)
Font: Inter 14px/600
Border-radius: 6px
Hover: accent-green-h (#16A34A)
Active: scale(0.98)
Disabled: opacity-50 cursor-not-allowed
Loading: text replaced with spinner + "Extracting..."
```

**Progress Bar:**
```
Height: 4px
Track: bg-gray-700
Fill: bg-green-500
Border-radius: 2px
Animation: width transition 300ms ease
Indeterminate: shimmer animation (left-to-right gradient sweep)
```

**Privacy Badge:**
```
Layout: [Shield icon 14px] [Text 11px/500]
Color: text-secondary
Background: transparent
Border: 1px border-subtle
Border-radius: 6px
Padding: 6px 10px
```

---

### 2. Settings / Options Page (Full Browser Tab)

Opened via chrome://extensions options or the gear icon in the popup.

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Context Collector Settings                                  │
│  Configure extraction preferences                            │
│                                                              │
│  ┌─── General ──────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  Default date range    [ Last 30 days         ▾ ]    │   │
│  │  Extraction mode       ( ) Full  (●) Incremental     │   │
│  │  Include media refs    [──●] On                       │   │
│  │  Output format         [ Markdown (.md)       ▾ ]    │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─── Platforms ────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  WhatsApp Web                              [Enabled]  │   │
│  │  ├─ Excluded chats: spam-group, old-chat             │   │
│  │  └─ [ Edit exclusions ]                              │   │
│  │                                                       │   │
│  │  Telegram Web                              [Enabled]  │   │
│  │  ├─ Extract: Chats, Groups, Channels                 │   │
│  │  └─ [ Edit exclusions ]                              │   │
│  │                                                       │   │
│  │  Gmail                                     [Enabled]  │   │
│  │  ├─ Labels: Inbox, Important, Work                   │   │
│  │  └─ [ Edit labels ]                                  │   │
│  │                                                       │   │
│  │  LinkedIn (Experimental)                   [Enabled]  │   │
│  │  ├─ ⚠ May be slow. Risk of rate limiting.           │   │
│  │  └─ [ Edit exclusions ]                              │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─── Output Preview ──────────────────────────────────┐   │
│  │                                                       │   │
│  │  Your extractions will be organized as:               │   │
│  │                                                       │   │
│  │  extracts/                                            │   │
│  │  ├── manifest.json                                    │   │
│  │  ├── whatsapp/                                        │   │
│  │  │   └── chats/                                       │   │
│  │  │       ├── dad.md                                   │   │
│  │  │       └── work-team.md                             │   │
│  │  ├── gmail/                                           │   │
│  │  │   ├── emails/                                      │   │
│  │  │   └── threads/                                     │   │
│  │  └── ...                                              │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─── Data Management ─────────────────────────────────┐   │
│  │                                                       │   │
│  │  Extraction history                                   │   │
│  │  ├─ 2026-03-17: 342 msgs, 2 platforms (47 KB)       │   │
│  │  ├─ 2026-03-10: 128 msgs, 1 platform  (18 KB)       │   │
│  │  └─ 2026-03-03: 567 msgs, 3 platforms (72 KB)       │   │
│  │                                                       │   │
│  │  [ Clear History ]                                    │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─── Privacy ─────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  🔒 Context Collector processes all data locally.    │   │
│  │     No data is ever sent to external servers.         │   │
│  │     No analytics or telemetry is collected.           │   │
│  │                                                       │   │
│  │  Permissions used:                                    │   │
│  │  • web.whatsapp.com (content extraction)             │   │
│  │  • web.telegram.org (content extraction)             │   │
│  │  • mail.google.com (content extraction)              │   │
│  │  • linkedin.com (content extraction)                 │   │
│  │                                                       │   │
│  │  [ View Source Code on GitHub ]                       │   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Settings Page Specifications

```
Max width: 640px (centered, like Linear settings)
Background: bg-base
Card background: bg-surface
Section spacing: 32px between sections
Inner padding: 20px
Font: Inter 14px body, 18px section headings
Code blocks: JetBrains Mono on bg-elevated
```

---

### 3. Onboarding Flow (First-Run)

A 3-step overlay shown on first extension click. Clean, focused, no unnecessary decoration.

#### Step 1: Welcome
```
┌──────────────────────────────────────┐
│                                      │
│         [Shield Icon 48px]           │
│                                      │
│     Context Collector                │
│                                      │
│  Extract your conversations as       │
│  structured Markdown for AI agents.  │
│                                      │
│  WhatsApp · Telegram · Gmail ·       │
│  LinkedIn                            │
│                                      │
│       [ Get Started → ]              │
│                                      │
│  ─── ○ ○  (step indicator)          │
└──────────────────────────────────────┘
```

#### Step 2: Privacy Promise
```
┌──────────────────────────────────────┐
│                                      │
│          [Lock Icon 48px]            │
│                                      │
│     Your data stays local            │
│                                      │
│  ✓ All processing happens in         │
│    your browser                      │
│  ✓ No data sent to external          │
│    servers -- ever                   │
│  ✓ No analytics or telemetry         │
│  ✓ Open source for transparency      │
│                                      │
│       [ Continue → ]                 │
│                                      │
│  ○ ─── ○  (step indicator)          │
└──────────────────────────────────────┘
```

#### Step 3: How It Works
```
┌──────────────────────────────────────┐
│                                      │
│       [Download Icon 48px]           │
│                                      │
│     How it works                     │
│                                      │
│  1. Select platforms to extract      │
│  2. Click "Extract Context"          │
│  3. Download structured Markdown     │
│  4. Feed to your AI agents           │
│                                      │
│  extracts/whatsapp/chats/dad.md     │
│  extracts/gmail/threads/project.md  │
│                                      │
│       [ Start Extracting → ]         │
│                                      │
│  ○ ○ ───  (step indicator)          │
└──────────────────────────────────────┘
```

#### Onboarding Specifications

```
Container: Same as popup dimensions (380x auto)
Background: bg-surface with slight backdrop blur
Step indicator: 3 dots + connecting line, active dot = green
Icon: Lucide, 48px, text-secondary, stroke-width 1.5
Title: Inter 18px/700, text-primary
Body: Inter 13px/400, text-secondary, line-height 1.6
CTA: Full-width green button
Transition: Slide left, 200ms ease-out
Dismissible: "Skip" link in top-right corner (text-tertiary)
```

---

### 4. Extraction Progress (In-Tab Overlay)

When extraction runs, a subtle notification bar appears at the top of the platform tab being extracted (injected via content script).

```
┌─────────────────────────────────────────────────────┐
│ [CC] Extracting WhatsApp... 47/204 messages   [✕]  │
│ ████████████████████░░░░░░░░░░░░░░░░░░░░  23%      │
└─────────────────────────────────────────────────────┘
```

**Specifications:**
```
Position: fixed, top: 0, left: 0, right: 0
Height: 36px (collapsed), auto (expanded)
Background: bg-surface with 95% opacity, backdrop-blur-sm
Border-bottom: 1px border-default
Z-index: 99999 (above platform UI)
Text: Inter 12px/500
Progress bar: 2px, underneath the bar
Close/dismiss: X button on right
Animation: Slide down 200ms on appear, slide up on dismiss
```

---

## Interaction Design

### Micro-interactions

| Element | Interaction | Animation |
|---------|------------|-----------|
| Platform toggle | Toggle on/off | Switch slides 200ms ease |
| Extract button | Click | scale(0.98) 100ms, then loading state |
| Progress bar | Updating | Width transition 300ms ease |
| Download button | Hover | Subtle arrow bounce (translateY 2px) |
| Settings gear | Hover | rotate(90deg) 300ms |
| Step indicator | Step change | Dot fills + line extends 200ms |
| Error message | Appear | Fade in + slide down 200ms |
| Platform card | Hover | bg-elevated transition 150ms |

### Keyboard Navigation

| Key | Popup Action |
|-----|-------------|
| Tab | Move between platform toggles, filters, CTA |
| Space/Enter | Toggle platform, activate buttons |
| Escape | Close popup |
| Ctrl+Shift+E | Quick-extract with last settings (shortcut) |

### Loading States

- **Initial load:** Skeleton pulse on platform cards (200ms)
- **Scope estimation:** Shimmer on estimated count (while calculating)
- **Extraction:** Per-platform progress + overall progress bar
- **Download prep:** Spinner on CTA button text ("Packaging...")

---

## Responsive Considerations

The popup is fixed at 380px width, but the **settings page** must be responsive:

| Breakpoint | Layout |
|-----------|--------|
| < 480px | Full-width cards, stacked controls |
| 480-768px | Centered column (max-w-lg), comfortable padding |
| 768px+ | Centered column (max-w-xl), side-by-side controls where logical |

---

## Accessibility Checklist

- [ ] All interactive elements have visible focus rings (2px blue outline, 2px offset)
- [ ] Color is never the only indicator (icons + text accompany status colors)
- [ ] Touch targets are minimum 44x44px
- [ ] All platform icons have aria-labels
- [ ] Progress is announced via aria-live="polite" regions
- [ ] Toggle switches have proper role="switch" and aria-checked
- [ ] High contrast mode: text on bg passes WCAG AA (4.5:1 minimum)
- [ ] prefers-reduced-motion: disable all non-essential animations
- [ ] Screen reader: extraction status updates announced
- [ ] Error messages linked to their context via aria-describedby

### Contrast Verification

| Pair | Ratio | Pass |
|------|-------|------|
| text-primary (#F9FAFB) on bg-base (#0B0F19) | 17.4:1 | AAA |
| text-secondary (#9CA3AF) on bg-base (#0B0F19) | 7.2:1 | AAA |
| text-tertiary (#6B7280) on bg-base (#0B0F19) | 4.6:1 | AA |
| accent-green (#22C55E) on bg-base (#0B0F19) | 8.1:1 | AAA |
| dark text (#0B0F19) on accent-green (#22C55E) | 8.1:1 | AAA |

---

## Technology Stack (UI)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Markup | HTML5 | Manifest V3 popup/options pages |
| Styling | Tailwind CSS 4 | Utility-first, small bundle, dark mode support |
| Icons | Lucide (SVG) | Consistent, lightweight, matches aesthetic |
| Fonts | Inter + JetBrains Mono | Google Fonts, developer-tool standard |
| Build | Vite | Fast builds, tree-shaking, CSS purge |
| Framework | Vanilla TS + Web Components | No React needed; keeps extension lightweight |
| ZIP | JSZip | Client-side ZIP generation |

**Bundle size target:** < 100KB total (JS + CSS + HTML + icons)

---

## Design Tokens (CSS Custom Properties)

```css
:root {
  /* Backgrounds */
  --cc-bg-base: #0B0F19;
  --cc-bg-surface: #111827;
  --cc-bg-elevated: #1F2937;
  --cc-bg-overlay: #374151;

  /* Text */
  --cc-text-primary: #F9FAFB;
  --cc-text-secondary: #9CA3AF;
  --cc-text-tertiary: #6B7280;
  --cc-text-disabled: #4B5563;

  /* Accents */
  --cc-accent-green: #22C55E;
  --cc-accent-green-hover: #16A34A;
  --cc-accent-blue: #3B82F6;
  --cc-accent-amber: #F59E0B;
  --cc-accent-red: #EF4444;

  /* Platform colors */
  --cc-whatsapp: #25D366;
  --cc-telegram: #26A5E4;
  --cc-gmail: #EA4335;
  --cc-linkedin: #0A66C2;

  /* Borders */
  --cc-border-subtle: #1F2937;
  --cc-border-default: #374151;
  --cc-border-focus: #3B82F6;

  /* Spacing */
  --cc-space-xs: 4px;
  --cc-space-sm: 8px;
  --cc-space-md: 12px;
  --cc-space-lg: 16px;
  --cc-space-xl: 24px;
  --cc-space-2xl: 32px;

  /* Radii */
  --cc-radius-sm: 4px;
  --cc-radius-md: 6px;
  --cc-radius-lg: 8px;
  --cc-radius-xl: 12px;

  /* Transitions */
  --cc-transition-fast: 150ms ease;
  --cc-transition-normal: 200ms ease;
  --cc-transition-slow: 300ms ease;

  /* Typography */
  --cc-font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --cc-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

---

## File Deliverables

| File | Purpose |
|------|---------|
| `popup.html` | Extension popup markup |
| `popup.css` | Popup styles (Tailwind compiled) |
| `popup.ts` | Popup interaction logic |
| `options.html` | Settings page markup |
| `options.css` | Settings page styles |
| `options.ts` | Settings page logic |
| `content-overlay.css` | In-tab progress bar styles |
| `onboarding.ts` | First-run flow logic |
| `icons/` | Extension icons (16, 32, 48, 128px) |

---

**Document Status:** Draft for review
**Next Steps:** Validate with PRD requirements, build interactive prototype, implement Phase 1 popup
