# Visual & Interaction Design Guide

## Theme: Dark Mode (Default for Both Roles)

### Color Palette
**Backgrounds:**
- `slate-950`: Main background (near-black)
- `slate-900`: Cards, input surfaces
- `slate-800`: Hover states

**Text:**
- `slate-50`: Primary text (almost white)
- `slate-400`: Secondary text (muted)
- `slate-300`: Tertiary text (even dimmer)

**Accent Colors:**
- `emerald-500`: Primary CTA (for installers)
- `emerald-600`: Hover state
- `green-600`: Success states (✅)
- `orange-500`: Warnings (⚠️)
- `red-500`: Errors/Danger (❌)
- `blue-500`: Info/Pending

**Borders:**
- `slate-700`: Strong borders
- `slate-600`: Subtle borders

---

## Typography
Font: **Geist Sans** (or system default)
Base size: 14px

**Hierarchy:**
- H1: 32px, font-bold (680 weight), letter-spacing -0.02em
- H2: 24px, font-semibold (600 weight)
- H3: 20px, font-semibold (600 weight)
- Body: 14px, font-normal (400 weight), line-height 1.5
- Small: 12px, font-normal, color `slate-400`
- Code: "Berkeley Mono" or Monaco, 12px, bg-slate-800, rounded

---

## Component Examples

### Button (Shadcn/UI)
- **Primary:** `bg-emerald-500 hover:bg-emerald-600 text-white`
- **Secondary:** `bg-slate-800 hover:bg-slate-700 text-slate-50`
- **Outline:** `border border-slate-700 bg-transparent text-slate-50`

### Card
- `bg-slate-900 border border-slate-700 rounded-lg shadow-md`
- Hover: shadow-lg (subtle lift)

### Input
- `bg-slate-800 border border-slate-700 text-slate-50 placeholder-slate-500`
- Focus: `border-emerald-500 ring-2 ring-emerald-500/30`

### Badge (Status)
- **Success:** `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
- **Warning:** `bg-orange-500/10 text-orange-400 border border-orange-500/20`
- **Error:** `bg-red-500/10 text-red-400 border border-red-500/20`
- **Pending:** `bg-blue-500/10 text-blue-400 border border-blue-500/20`

---

## Layout Breakpoints

### Mobile (< 768px)
- Single column, full-width
- Touch targets: min 44px height
- Bottom sheet for secondary menus
- Large fonts (16px body)
- Vertical scrolling

### Desktop (≥ 768px)
- 2-3 column layouts
- Hover states visible
- Keyboard shortcuts (Cmd+K)
- Dense tables (smaller text acceptable)
- Horizontal + vertical scrolling

---

## Animations

### Page Transitions
- Fade In + Slight Scale-Up
- Duration: 300ms
- Easing: cubic-bezier(0.16, 1, 0.3, 1) [Spring]

### Loading States
- Pulse animation on skeleton loaders
- Color: `slate-700` to `slate-600` (infinite loop)
- Duration: 2s
- Messages cycle every 2s:
  - "📸 Analyzing heater specs..."
  - "🔋 Checking regulations..."
  - "⚡ Calculating savings..."
  - "💡 Preparing documents..."

### Success Feedback
- Confetti animation (canvas-confetti) for 2 seconds
- Bounce scale: 0.9 → 1.1 → 1.0 (300ms)
- Green checkmark ✅ appears + sound effect (optional)

### Hover Effects
- Buttons: scale(1.02) + brightness(1.1)
- Cards: box-shadow increase (md → lg)
- Duration: 200ms

---

## Installer-Specific Design (Mobile)

**The Vibe:** Simple, forgiving, encouraging

**Visual Language:**
- Large cards (one decision per screen)
- Big green buttons (>44px height)
- Progress indicator (Step 1/4)
- Emoji + color for status (✅ green, ⏳ blue, ❌ red)
- Large readable fonts (16px+ body)

**Interaction:**
- "Back" button always visible
- "Save as Draft" for every step
- Playful loading messages
- Confetti when submitted
- Email confirmation link

---

## Admin-Specific Design (Desktop)

**The Vibe:** Power user, dense info, fast operations

**Visual Language:**
- Split-screen layouts (document + editor)
- Inline editing (hover to reveal edit icons)
- Keyboard shortcuts displayed in tooltips (Cmd+A for Approve)
- Color-coded status badges
- Sortable/filterable tables

**Interaction:**
- Drag-to-reorder in queue (optional)
- Bulk actions (select multiple projects)
- Right-click context menu on projects
- Search bar with fuzzy matching (Cmd+K)
- Hotkeys:
  - `Cmd+K` → Open project search
  - `Cmd+Shift+A` → Approve current project
  - `Cmd+Shift+R` → Request changes
  - `Escape` → Close modal
