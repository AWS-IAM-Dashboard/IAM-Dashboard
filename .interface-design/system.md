# Interface Design System
## AWS IAM Security Dashboard

**Aesthetic:** Sovereign Dark — enterprise cybersecurity. CrowdStrike/Wiz/Palo Alto register.
**User:** Security engineer. 2am incident response or 8am triage. Precision over comfort.
**Feel:** Cold like a terminal. Dense like a trading floor. Authoritative enough to trust at 3am.

---

## Intent

The product exists in a NOC-at-night world — server room darkness, phosphor glow, amber hardware LEDs, emergency-red alarm lights. Every visual decision should feel like it came from that world, not applied to it.

The signature of this product is the **workflow pipeline**: `NEW → TRIAGED → ASSIGNED → IN_PROGRESS → PENDING_VERIFY → REMEDIATED`. That progression — and the colour language that travels with it — is what separates this from a generic dashboard.

---

## Palette

### Foundation
```
Page background:   #000814              (near-black navy)
Body gradient:     linear-gradient(135deg, #000814 0%, #001d3d 100%)
Card surface:      rgba(15, 23, 42, 0.8)
Popover / overlay: #0f1729
Secondary surface: #1e293b
Glass surface:     rgba(15, 23, 42, 0.3) + backdrop-filter: blur(10px)
Input surface:     rgba(30, 41, 59, 0.8)
```

### Text hierarchy
```
Primary:    #e2e8f0                      (slate-200)
Secondary:  #94a3b8                      (slate-400)
Tertiary:   rgba(100, 116, 139, 0.75)   (slate-500 at 75%)
Muted:      rgba(71, 85, 105, 0.75)     (slate-600 at 75%)
```

### Accent — electric green
```
Solid:      #00ff88
10% bg:     rgba(0, 255, 136, 0.1)      (button/card background)
14% bg:     rgba(0, 255, 136, 0.14)     (icon box, active background)
28% border: rgba(0, 255, 136, 0.28)     (scan button border)
40% hover:  rgba(0, 255, 136, 0.4)      (hover border)
88% bar:    rgba(0, 255, 136, 0.88)     (top accent gradient start)
```

Green is signal, not decoration. Use it for: primary actions, active states, success/compliant/remediated, focus rings, sidebar active items, stat card accent when metric is healthy.

### Severity palette
```
CRITICAL:  #ff0040   bg: rgba(255,0,64,0.1)    border: rgba(255,0,64,0.3)
HIGH:      #ff6b35   bg: rgba(255,107,53,0.1)  border: rgba(255,107,53,0.3)
MEDIUM:    #ffb000   bg: rgba(255,176,0,0.1)   border: rgba(255,176,0,0.3)
LOW:       #00ff88   bg: rgba(0,255,136,0.08)  border: rgba(0,255,136,0.25)
INFO:      #94a3b8   bg: rgba(100,116,139,0.1) border: rgba(100,116,139,0.2)
```

### Workflow status palette
```
NEW:             #60a5fa   (blue)
TRIAGED:         #a78bfa   (purple)
ASSIGNED:        #38bdf8   (cyan)
IN_PROGRESS:     #ffb000   (amber)
PENDING_VERIFY:  #38bdf8   (cyan)
REMEDIATED:      #00ff88   (green)
RESOLVED:        #00ff88   (green)
SUPPRESSED:      #64748b   (gray)
FALSE_POSITIVE:  #64748b   (gray)
RISK_ACCEPTED:   #ff6b35   (orange)
```

### Compliance palette
```
COMPLIANT:       #00ff88   bg: rgba(0,255,136,0.08)    border: rgba(0,255,136,0.22)
NON_COMPLIANT:   #ff0040   bg: rgba(255,0,64,0.1)      border: rgba(255,0,64,0.28)
NOT_APPLICABLE:  #64748b   bg: rgba(100,116,139,0.08)  border: rgba(100,116,139,0.18)
```

### Border scale
```
Standard:  rgba(255, 255, 255, 0.07)    (cards, dividers)
Soft:      rgba(255, 255, 255, 0.06)    (sidebar, subtle separation)
Faint:     rgba(255, 255, 255, 0.04)    (nested elements)
Ghost:     rgba(255, 255, 255, 0.08)    (inputs, ghost buttons)
Emphasis:  rgba(255, 255, 255, 0.14)    (ghost button hover)
```

### Additional chart / UI colors
```
Blue:    #0ea5e9   (resources, informational)
Purple:  #8b5cf6   (chart-3)
Amber:   #f59e0b   (chart-4)
Red:     #ef4444   (destructive / shadcn)
```

### ARGUS overlay accent
```css
--argus-accent:  #00d4ff;   /* ARGUS Voice IR Agent identity color — panel borders, wordmark, active states */
```
Scoped exclusively to `VoiceIRAgent.tsx`. Do not use outside the ARGUS overlay.

---

## Typography

Two fonts. No exceptions.

```
UI / copy:   DM Sans, system-ui, -apple-system, sans-serif
Data / code: JetBrains Mono, Fira Code, monospace
```

**Rule:** Anything that reads as data — metrics, ARNs, timestamps, region names, scores, counts, badge labels, section headers — uses JetBrains Mono. Everything else uses DM Sans.

### Type scale
```
Page title (h1):     20px / 700 / DM Sans / tracking -0.02em
Section title (h2):  17px / 600 / DM Sans
Card title:          14px / 600 / DM Sans
Body:                13px / 400 / DM Sans / line-height 1.5
Small body:          12px / 400 / DM Sans / line-height 1.4
Metric value:        28px / 700 / JetBrains Mono / line-height 1.1
Button primary:      13px / 600 / DM Sans
Button ghost:        12px / 500 / DM Sans
Section label:       10px / 600 / JetBrains Mono / uppercase / tracking 0.08–0.12em
Badge:               10–11px / 700 / JetBrains Mono / tracking 0.04em
```

---

## Spacing

Base unit: **4px**

```
4   — micro (icon internal gaps, tight badges)
8   — component (button gap, element pairs)
12  — inner (select padding, filter controls)
16  — card padding (compact), table cells
20  — card padding (standard) — most common card horizontal padding
24  — section spacing, large card padding
32  — page section separation
40  — large section gaps
```

**Page wrapper padding:** `24px 28px` (vertical 24, horizontal 28)

---

## Depth strategy

**Borders-only.** No decorative drop shadows.

Hierarchy is created through:
1. Surface colour shifts (darker vs slightly lighter)
2. Border opacity (stronger border = more prominent surface)
3. Accent-coloured borders on interactive/active elements
4. Glass morphism (`.cyber-glass`) for overlaid surfaces

Only permitted shadow: ring shadow — `0 0 0 1px rgba(...)` for focus states.
Only permitted glow: `.cyber-glow` — `box-shadow: 0 0 20px rgba(0, 255, 136, 0.3)` — used sparingly on primary CTAs.

---

## Border radius scale

```
999px — pills (badges, chips, rounded buttons)
10px  — cards, stat cards, KPI cards, modals (default)
8px   — icon boxes, medium containers
6px   — buttons, selects, inputs, small controls
4px   — tiny elements
3px   — scrollbar thumb
```

---

## Component patterns

### ScanPageHeader
The standard header for all scanner tabs. Located at `src/components/ui/ScanPageHeader.tsx`.

```
Layout:  [40×40 Icon Box]  [Title 20px/700]     [Region Select] [Profile Select?]
         [12px subtitle]                          [children slot] [Refresh] [Export] [SCAN]
```

- Icon box: 40×40, radius 8, bg `{iconColor}14`, border `{iconColor}2e`
- Title: 20px / 700 / DM Sans / letter-spacing -0.02em / color #e2e8f0
- Subtitle: 12px / DM Sans / color rgba(100,116,139,0.75) / margin-top 4px / max-width 520px
- Region/profile selects: JetBrains Mono, 12px, bg rgba(15,23,42,0.8), border rgba(255,255,255,0.08), radius 6, padding 8px 12px
- Ghost buttons (Refresh/Export): padding 8px 12px, radius 6, `.ghost-btn` class for hover
- Scan button: padding **8px 20px**, radius 6, `.scan-btn` class for hover, green accent
- Stop button (scanning only): padding 8px 16px, red accent
- `marginBottom: 24` on the wrapper

### StatCard
Located at `src/components/ui/StatCard.tsx`.

```
┌──────────────────────────────────────────────┐
│ ▔▔▔▔▔▔ 2px gradient top bar ({accent}→transparent)
│                                              │
│  LABEL  10px / mono / uppercase / muted      │
│  28     28px / mono / bold / accent color    │
│  sub    optional children slot               │
│                          [ghost icon @ 0.1]  │
└──────────────────────────────────────────────┘
```

- Container: `rgba(15,23,42,0.8)`, border `{accent}26`, radius 10, padding 16px 20px
- Top bar: height 2, `linear-gradient(90deg, {accent}88, transparent)`
- Label: 10px / 600 / mono / uppercase / rgba(100,116,139,0.75) / tracking 0.08em / marginBottom 6
- Value: 28px / 700 / mono / line-height 1.1 / accent color
- Ghost icon: absolute right-14, top 50%, translateY(-50%), opacity 0.1, size 36

### SeverityBadge
Located at `src/components/ui/SeverityBadge.tsx`.

Handles: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL, plus all workflow and compliance states.

```
Display: inline-flex, align-items center
Shape:   border-radius 999 (pill)
Font:    JetBrains Mono, weight 700, tracking 0.04em
Size default: padding 4px 10px, fontSize 11
Size sm:      padding 2px 8px,  fontSize 10
Border: 1px solid {tok.border}
```

### Ghost button
```css
.ghost-btn {
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(148,163,184,0.7);
  font-size: 12px;
  font-weight: 500;
}
.ghost-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.14);
  color: #cbd5e1;
}
```

### Scan button
```css
.scan-btn {
  padding: 8px 20px;   /* wider than ghost for visual dominance */
  border-radius: 6px;
  background: rgba(0,255,136,0.1);
  border: 1px solid rgba(0,255,136,0.28);
  color: #00ff88;
  font-size: 13px;
  font-weight: 600;
}
.scan-btn:hover:not(:disabled) {
  background: rgba(0,255,136,0.16);
  border-color: rgba(0,255,136,0.4);
}
```

### KPI card (Dashboard)
Same surface pattern as StatCard but with `cursor: pointer` and `.kpi-card` hover class.

```tsx
background: rgba(15,23,42,0.8)
border: 1px solid {color}26
border-radius: 10
padding: 16px 20px
overflow: hidden
position: relative
```
Top accent bar + label (10px / mono / uppercase) + value (28px / mono / bold) + sub-label (11px / mono / muted).

### Standard card (shadcn `.cyber-card`)
```css
background: rgba(15, 23, 42, 0.8);
backdrop-filter: blur(15px);
border: 1px solid rgba(255, 255, 255, 0.07);
border-radius: 12px;
```
Used for charts, content sections, larger containers. Not for KPI/metric cards.

### Filter bar
```css
.filter-bar {
  background: rgba(15,23,42,0.8);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 12px 16px;
}
```

### Section label
```css
.section-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(100,116,139,0.65);   /* NOT rgba(51,65,85) — too dark */
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
}
```

### Table row
```css
.data-row {
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.1s;
}
.data-row:hover {
  background: rgba(255,255,255,0.025);
}
```

### Scrollbar
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
```

---

## Layout

### App shell
```
Header (64px fixed)
└── Sidebar (224px expanded / 56px collapsed) + Main (flex-1 overflow-auto)
```

### Page wrapper
All scanner/operation tab pages: `padding: 24px 28px`

### Stat card grid
```
display: grid;
grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
gap: 12px;
margin-bottom: 24px;
```

### Sidebar
- Background: `rgba(6,9,18,0.98)` — darker than card surfaces
- Border-right: `1px solid rgba(255,255,255,0.06)`
- Section labels: `rgba(100,116,139,0.65)` in JetBrains Mono 9.5px
- Active item: `color: #00ff88`, `background: rgba(0,255,136,0.07)`, 3px left accent bar
- Inactive item: `color: rgba(100,116,139,0.8)` — NOT rgba(71,85,105) which is too dark
- Collapse toggle: transitions width `0.25s cubic-bezier(0.4, 0, 0.2, 1)`
- Bottom status: animated green ping dot + "All Systems Operational" in green

---

## Interaction states

All interactive elements must have explicit hover states. Transitions: `0.1s–0.15s`, no spring/bounce.

```
Ghost button hover:  bg +0.03, border +0.06, text brightens to #cbd5e1
Scan button hover:   bg rgba(0,255,136,0.16), border rgba(0,255,136,0.4)
Stop button hover:   bg rgba(255,0,64,0.12)
KPI card hover:      bg rgba(20,32,56,0.95)
Table row hover:     bg rgba(255,255,255,0.025)
Scrollbar hover:     rgba(255,255,255,0.14)
```

---

## Animations

```
spin:              1s linear infinite     (loading spinners)
pulse-slow:        8s ease-in-out         (background orbs)
pulse-slower:      12s ease-in-out        (background orbs, offset)
scan-progress:     width transition 0.4s ease
grid-move:         20s linear infinite    (bg-grid-pattern)
sidebar width:     0.25s cubic-bezier(0.4, 0, 0.2, 1)
```

---

## CSS variables (key tokens)

```css
--primary:          #00ff88
--background:       #000814
--foreground:       #e2e8f0
--card:             rgba(15, 23, 42, 0.8)
--border:           rgba(255, 255, 255, 0.07)
--muted-foreground: #94a3b8
--destructive:      #ef4444
--ring:             #00ff88
--radius:           0.625rem   (10px)
--cyber-danger:     #ff0040
--cyber-warning:    #ffb000
--cyber-safe:       #00ff88
```

---

## Shared components

| Component | Path | Purpose |
|-----------|------|---------|
| `ScanPageHeader` | `src/components/ui/ScanPageHeader.tsx` | Standard header for all 11 scanner tabs |
| `StatCard` | `src/components/ui/StatCard.tsx` | KPI metric card with accent top bar |
| `SeverityBadge` | `src/components/ui/SeverityBadge.tsx` | Severity + workflow + compliance badges |

---

## Anti-patterns

- No white or light backgrounds
- No drop shadows on containers — `.cyber-glow` is the only permitted shadow
- No border-radius > 10px on cards
- No font sizes > 20px except display stat values (28px)
- No colored fills on buttons — tinted borders + ghost fills only
- No sans-serif for numeric/technical values — JetBrains Mono mandatory
- No opacity < 0.03 for backgrounds (invisible noise)
- No spring/bounce animations — transitions only, 0.1–0.15s

---

## Decisions made — do not revisit

- **`borderLeft` severity cards are gone.** All cards use the 2px top accent gradient bar. Consistent with StatCard.
- **Section labels use `rgba(100,116,139,0.65)`, not `rgba(51,65,85,0.9)`.** The dark value is black-on-black.
- **Scan button padding is `8px 20px`**, ghost buttons `8px 12px`. The difference is intentional — scan is the primary action.
- **JetBrains Mono is mandatory for all data.** ARNs, timestamps, metrics, region names, badge labels, section headers. DM Sans is for prose only.
- **Ghost buttons require `.ghost-btn` class** (not inline transition) to get hover states.
- **No drop shadows on cards.** `.cyber-glow` (ring glow) is the only permitted shadow.
