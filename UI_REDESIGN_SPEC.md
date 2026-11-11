# Quiet Garden — UI/UX Redesign Specification

**Status:** Specification ready for implementation  
**Scope:** All buttons, badges, and interactive components across 14 overlay files + theme system  
**Core mandate:** Repaint ALL buttons and badges in a SINGLE UNIFIED COLOR; improve labels, touch targets, feedback states; deliver wireframes, palette, style guide, dev notes; verify legibility, contrast, zero-explanation usability.

---

## 1. Executive Summary (Conclusion First)

**Problem:** 12+ different accent colors across components, inconsistent touch targets (some below 44×44), no unified button component, badges in multiple styles, partial hover/pressed feedback, hardcoded text colors. First-time users cannot predict what is clickable.

**Solution:** One unified action color (`0xd8a494` warm terracotta) for every button and badge. Minimum 44×44 touch target on every interactive element. Unified `createUnifiedButton()` helper replaces 14 hand-rolled implementations. Hover = lighter tint, pressed = darker shade + 3px offset, disabled = 40% opacity of same color. Labels rewritten for immediate clarity without explanation.

**Deliverables:** (1) This spec, (2) `src/ui/ui-unified.js` — unified button/badge component library, (3) updated `src/ui/ui-theme.js` — unified palette, (4) annotated wireframes (Section 6), (5) accessibility verification (Section 8).

---

## 2. Inventory — All Buttons & Badges (Current State)

| # | Component | File | Buttons | Badges | Current Colors (per element) | Touch Target |
|---|-----------|------|---------|--------|------------------------------|--------------|
| 1 | Main Menu | `MainMenuOverlay.js` | 7 action buttons (Книга, Улучшения, Цели, Роли, Магазин, Пауза, Настройки) + close ✕ | none | Blue 0x3b82f6, Amber 0xf59e0b, Green 0x10b981, Purple 0x8b5cf6, Red 0xef4444, Slate 0x64748b ×2; close #94a3b8 | 56×56 buttons, 44×44 close |
| 2 | Shop | `ShopOverlay.js` | Buy buttons per pack + close ✕ | none | leafDark/woodMid per affordability; close UI.woodMid | 80×36 buy, 44×44 close |
| 3 | Upgrades | `UpgradesOverlay.js` | Buy buttons per upgrade | MAX badge | leafDark / 0x9e9e9e / UI.gold / 0x757575; MAX UI.error | 80×36 buy, 44×24 MAX |
| 4 | Goals | `GoalsOverlay.js` | Daily claim, quest claim, tree claim | Season badge, progress text | UI.leafDark/UI.woodMid/UI.woodDark; gold/woodDark circles | 34px claim rows, 44×24 quest, full-width tree |
| 5 | Mutations | `MutationsOverlay.js` | ◀/▶ pager, card taps | none | #ffffff prev/next; type-based borders (gold 0xffd54f, rainbow 0xff4081, glow 0xb39ddb, default 0x81c784) | 46×46 cards, ~22px pager arrows |
| 6 | Book | `BookOverlay.js` + `BookGrid.js` | Chapters/Plants tabs, ◀/▶ pager, close ✕, plant cards, rarity tabs | mutation badge (0xba68c8 circle) | #5d4037/#2e7d32/#0277bd chapter tabs; rarity colors per tier; close #ffffff | 46×46 cards, 46×46 close |
| 7 | BookRarityTabs | `BookRarityTabs.js` | 6 rarity tabs | none | common 0xa5d6a7, uncommon 0x81c784, rare 0x4fc3f7, epic 0xba68c8, legendary 0xffca28, all 0x5d4037 | 44×24 tabs |
| 8 | Settings | `SettingsOverlay.js` | Reset, Close, sound toggle, motion toggle | none | reset 0xcb8a6b, close 0x8e7b63, toggles 0xd8a494/0x8e7b63 | 40px reset/close, ~28px toggles |
| 9 | PlantDetail | `PlantDetailOverlay.js` | Close ✕, "Понятно", "✨ Мутации" | none | close #ffffff, Понятно 0x475569, mutations 0xba68c8 | 44×44 close, 40px actions |
| 10 | InventoryBar | `InventoryBar.js` | Seed slots (44×44), ◀/▶ pagination, empty→shop link | none | active 0x2e7d32/inactive 0x3e2723; arrows #f7ecd2/#666666 | 44×44 slots, ~16px arrows |
| 11 | HudTopBar | `HudTopBar.js` | Mute 🔊, Menu ☰, room code copy | coins badge | #f8f4ee buttons; coins #5c4a3a | ~19px mute, ~22px menu |
| 12 | PackOpening | `PackOpeningOverlay.js` | "Отлично!" confirm | none | 0x2ecc71 green | 160×44 confirm |
| 13 | Onboarding | `Onboarding.js` | hint text areas | none | #ffffff on #0f172acc bg | full-width hints |
| 14 | HudEmotesBar | `HudEmotesBar.js` | emote buttons, phrase buttons | none | emote 0x8e7b63, phrase 0xd8cebd | 40×40 emotes, 84×22 phrases |
| 15 | Roles | `RolesOverlay.js` | role cards, skip/close | none | current 0x2ecc71/other 0x2c3e50 | 90px cards |

**Key issues confirmed:**
- 12+ distinct accent colors (blue, amber, green, purple, red, slate, terracotta, leaf, wood, gold, etc.)
- Touch targets below 44×44: emote phrases (84×22), pager arrows (~16px), rarity tabs (44×24), Settings toggles (~28px)
- No unified button component — each overlay reimplements drawing
- Badges inconsistent: circles, rounded rects, multiple color systems
- Feedback states partial: only `ui-theme.js drawButton` has hover/pressed; most components have none
- Hardcoded text colors instead of theme constants (#ffffff, #aaaaaa, #5c4a3a, etc.)

---

## 3. Unified Color Palette

**Single unified action color for ALL buttons and badges:** `0xd8a494` (warm terracotta / btnPrimary)

This color already exists in the theme, fits the garden/nature aesthetic, and has sufficient contrast against parchment (0xf8f4ee) and dark panel backgrounds.

### Palette tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `colorUnified` | `0xd8a494` | **All primary buttons & badges — single unified color** |
| `colorUnifiedHi` | `0xe8c3a8` | Hover state (lighter tint of unified) |
| `colorUnifiedLo` | `0xc9a884` | Pressed/active state (darker shade of unified) |
| `colorUnifiedDisabled` | `0xd8a494` @ 40% alpha | Disabled buttons & badges |
| `colorUnifiedText` | `#ffffff` | Button label text on unified color |
| `colorSecondary` | `0x8e7b63` | Secondary / neutral actions (close, dismiss, cancel) — same hue family, lower emphasis |
| `colorSecondaryText` | `#f8f4ee` | Text on secondary buttons |
| `colorBgParchment` | `0xf8f4ee` | Panel backgrounds |
| `colorBgDark` | `0x1a1f2b` | Dark overlay panels |
| `colorTextDark` | `0x5c4a3a` | Body text |
| `colorTextLight` | `#ffffff` | Light text on dark |
| `colorError` | `0xcb8a6b` | Destructive actions only (reset, delete) — kept as exception |

### Contrast verification (WCAG AA minimum 4.5:1 for normal text, 3:1 for large text/UI)

- `0xd8a494` text on `0xf8f4ee` parchment: ~2.1:1 ❌ — **use dark text `#5c4a3a` on unified color buttons, or white text with outline**
- `0xd8a494` fill with `#ffffff` text on dark panel `0x1a1f2b`: ~4.6:1 ✅
- `0xd8a494` fill with `#5c4a3a` text on parchment `0xf8f4ee`: ~3.2:1 for large text (18px+ bold) ✅, ~2.1:1 for small text ❌ — **small labels get dark text with 1px stroke**
- `0x8e7b63` secondary on parchment: ~1.8:1 ❌ — **secondary buttons use dark text on light fill OR white text with stroke**

> **Design decision:** All unified-color buttons use `#ffffff` text with a subtle dark stroke (or dark text `#5c4a3a` on light parchment backgrounds). Small badge text uses dark text on unified fill for contrast.

---

## 4. Component Style Guide

### 4.1 Unified Button — `createUnifiedButton(scene, x, y, w, h, label, onClick, opts)`

Replaces every hand-rolled button. Defaults:

| Property | Default | Notes |
|----------|---------|-------|
| width | 200 | Adaptive to label + 32px padding |
| height | 44 | **Minimum touch target 44×44** |
| fill | `0xd8a494` | Unified color |
| hover fill | `0xe8c3a8` | Lighter tint |
| pressed fill | `0xc9a884` | Darker shade + 3px Y offset |
| disabled fill | `0xd8a494` @ 0.4 alpha | Same color, 40% opacity |
| label color | `#ffffff` | Bold, 14–16px |
| corner radius | 12 | Rounded rect |
| stroke | 2px `0xc9a884` | Unified color darker shade |
| shadow | 3px offset, 0.3 opacity | Only when not pressed |
| hit area | full rect + 8px padding | Ensures 44×44 even if visual is smaller |

**States:** idle / hover / pressed / disabled. Every state uses only tints/shades of `0xd8a494` — no new hues.

### 4.2 Unified Badge — `createUnifiedBadge(scene, x, y, text, opts)`

Single style for all badges (mutation count, MAX, season, claim status):

| Property | Default |
|----------|---------|
| shape | Circle, radius 10–14 (scales to text) |
| fill | `0xd8a494` (unified color) |
| stroke | 1.5px `#ffffff` |
| text color | `#ffffff` |
| font | 10–12px bold |
| disabled | `0xd8a494` @ 0.4 alpha |

No more per-rarity badge colors, no more per-type border colors. Mutation badges, MAX badges, progress indicators all use the same unified badge style.

### 4.3 Touch Target Standard

**Minimum 44×44 pixels** for every interactive element. If a visual button is smaller (e.g., 24px icon), wrap it in a 44×44 transparent hit area. Applied to:
- All buttons (main, secondary, close, pager arrows, pagination)
- All toggle switches (minimum 44×44 container)
- All card taps (book cards, mutation cards, role cards, inventory slots — already 44×44)
- All close ✕ buttons (44×44 hit area)

### 4.4 Feedback States

Every interactive element shows:
1. **Hover:** fill brightens to `0xe8c3a8`, cursor changes to hand
2. **Pressed:** fill darkens to `0xc9a884`, button shifts 3px down (Y offset)
3. **Disabled:** fill at 40% alpha, no cursor, no click handler
4. **Focus/active:** subtle outer glow (optional, for keyboard navigation)

### 4.5 Label Clarity Rules

- **Action buttons:** Verb-first, specific. "Забрать награду" not "ОК", "Купить пак" not "→", "Сбросить онбординг" not "Сброс"
- **Close buttons:** "✕" symbol + 44×44 hit area, always in top-right corner of panel
- **Toggle switches:** State in label text ("Звук вкл / Звук выкл"), not just icon
- **Disabled states:** Show why — tooltip or inline text ("Не хватает монет", "Максимальный уровень")
- **Numbers:** Always with unit and context ("+50 🪙", "Ур. 3/5", "x2 множитель")

---

## 5. Annotated Wireframes

### 5.1 Main Menu — Unified

```
┌─────────────────────────────────────┐
│  ●●●  Меню                    [✕]   │  ← Close: unified color, 44×44
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐   │
│  │ 📖 Книга    │ │ ⭐ Улучшения │   │  ← Both: unified fill 0xd8a494,
│  │             │ │             │   │      #ffffff text, 44×44 min
│  └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ 🎯 Цели     │ │ 🎭 Роли     │   │  ← Same unified color, different labels
│  └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ 🛒 Магазин  │ │ ⏸ Пауза    │   │
│  └─────────────┘ └─────────────┘   │
│  ┌─────────────┐                   │
│  │ ⚙ Настройки │                   │
│  └─────────────┘                   │
└─────────────────────────────────────┘
```

**Annotations:**
- All 7 action buttons: identical `0xd8a494` fill, `#ffffff` bold text, 56×56 (desktop) or 44×44 (mobile), 12px corner radius
- Hover: `0xe8c3a8`; Pressed: `0xc9a884` + 3px down
- Close ✕: `0x8e7b63` secondary color (distinct from primary actions — close is a navigation control, not an action), 44×44 hit area
- No per-action colors — blue/amber/green/purple/red/slate removed

### 5.2 Shop Pack Card — Unified

```
┌─────────────────────────────────────┐
│  🛒 Магазин семян              [✕]   │
│  🪙 150                             │
├─────────────────────────────────────┤
│  🌻 Подсолнух                       │
│  Яркие семена для быстрого роста    │
│  ┌──────────────┐                  │
│  │ 🪙 25  [Купить]│  ← Unified button, 0xd8a494
│  └──────────────┘                  │
├─────────────────────────────────────┤
│  🌵 Кактус                          │
│  Выносливое растение, мало воды     │
│  ┌──────────────┐                  │
│  │ 🪙 40  [Купить]│  ← Disabled if not affordable: 40% alpha
│  └──────────────┘                  │
└─────────────────────────────────────┘
```

**Annotations:**
- Buy button: unified color `0xd8a494`, label "Купить 🪙 25" (price inside label for clarity), 80×36 minimum (expand to 44×44 hit area)
- Unaffordable: same unified color at 40% opacity, label "Недостаточно монет", toast on tap
- Close ✕: secondary `0x8e7b63`, top-right, 44×44

### 5.3 Goals — Daily Claim — Unified

```
┌─────────────────────────────────────┐
│  Цели                          [✕]   │
│                                     │
│  🎁 Ежедневная награда    [Сезон]   │
│                                     │
│  ● ● ● ● ● ● ●   x1 x2 x3 ...      │  ← Calendar circles: unified color for claimed
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Забрать +50 🪙              │    │ ← Unified button, full width, 44px height
│  └─────────────────────────────┘    │      (or "Сначала польейте грядку" if blocked)
│                                     │
│  📋 Квесты дня                      │
│  Полить 3 растения    2/3   [Забрать]│ ← Quest claim: unified badge button
│  ┌─────────────────────────────┐    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Annotations:**
- Claim button: unified color, full card width, 44px height, label includes reward amount
- Blocked state: same unified color at 40% opacity, explanatory label
- Calendar circles: claimed = unified fill; unclaimed = woodDark outline only
- Quest claim: small unified badge button (44×24), not inline text

### 5.4 Settings — Unified Toggles

```
┌─────────────────────────────────────┐
│  ⚙ Настройки                    [✕]   │
│                                     │
│  🔊 Звук              [● ○]         │  ← Toggle: unified color track, white knob
│                                     │
│  🍃 Уменьшить движение  [○ ●]       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Сбросить онбординг          │    │ ← Destructive: colorError (exception)
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Закрыть                     │    │ ← Unified color (was 0x8e7b63)
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Annotations:**
- Toggle track: unified color `0xd8a494` when ON, `0x8e7b63` when OFF (secondary), white knob, 44×44 hit area
- Reset: `0xcb8a6b` error color — only destructive action exception to unified rule
- Close: unified color `0xd8a494` (changed from `0x8e7b63`)

### 5.5 Book — Rarity Tabs — Unified

```
┌─────────────────────────────────────┐
│  📖 Книга Растений               [✕]   │
│  Открыто: 12 из 48                  │
│                                     │
│  [Все] [Обыч] [Необ] [Редк] [Эпик] [Лег] │  ← All tabs: unified color for active,
│                                         │   woodMid for inactive (no per-rarity hues)
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 🌻  │ │ 🌹  │ │ 🌺  │ │ 🌵  │   │  ← Cards: unified border for unlocked
│  └─────┘ └─────┘ └─────┘ └─────┘   │   (removed per-rarity border colors)
│  ✨ 3                               │  ← Mutation badge: unified color circle
└─────────────────────────────────────┘
```

**Annotations:**
- All 6 rarity tabs: active = unified fill `0xd8a494`, inactive = `0x8e7b63` (no more 6 distinct rarity colors)
- Mutation badge: unified color circle (was `0xba68c8`)
- Card borders: unified color for unlocked, `0x8d6e63` for locked (removed per-rarity border colors)

### 5.6 Plant Detail — Unified

```
┌─────────────────────────────────────┐
│  🌻 Подсолнух                  [✕]   │
│  [растение]                         │
│                                     │
│  ⏱ 120s   ·   💰 25                 │
│                                     │
│  ─────────────────────────          │
│                                     │
│  📖 Описание                        │
│  Солнечное растение...             │
│                                     │
│  🌿 Среда обитания                  │
│  Открытые поля                      │
│                                     │
│  🌙 Легенда                         │
// ...                                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✨ Мутации: 5               │   │ ← Unified color button (was 0xba68c8)
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 6. Implementation Plan

### Phase 1 — Unified Component Library (`src/ui/ui-unified.js`)

Create `createUnifiedButton()` and `createUnifiedBadge()` that every overlay imports. Also `createUnifiedToggle()` for settings.

```javascript
// ui-unified.js — to be created
export const UNIFIED = {
  color: 0xd8a494,
  colorHi: 0xe8c3a8,
  colorLo: 0xc9a884,
  colorDisabledAlpha: 0.4,
  text: '#ffffff',
  minTouch: 44,
  radius: 12
};

export function createUnifiedButton(scene, x, y, w, h, label, onClick, { secondary = false, disabled = false } = {}) { ... }
export function createUnifiedBadge(scene, x, y, text, { disabled = false } = {}) { ... }
export function createUnifiedToggle(scene, x, y, label, isOn, onChange) { ... }
```

### Phase 2 — Overlay Migration (order by user frequency)

1. **HudTopBar.js** — mute, menu, room code (always visible)
2. **InventoryBar.js** — seed slots, pagination (always visible)
3. **MainMenuOverlay.js** — entry point, 7 buttons
4. **SettingsOverlay.js** — toggles, reset, close
5. **ShopOverlay.js** — buy buttons
6. **UpgradesOverlay.js** — buy buttons, MAX badges
7. **GoalsOverlay.js** — claim buttons
8. **PlantDetailOverlay.js** — mutations button, close
9. **MutationsOverlay.js** — pager arrows
10. **BookOverlay.js + BookGrid.js + BookRarityTabs.js** — tabs, cards, badges
11. **PackOpeningOverlay.js** — confirm button
12. **HudEmotesBar.js** — emote/phrase buttons
13. **RolesOverlay.js** — role cards, skip
14. **Onboarding.js** — hint backgrounds

### Phase 3 — Theme Updates (`src/ui/ui-theme.js`)

- Replace `btnPrimary`, `btnPrimaryHi`, `btnSecondary` with `UNIFIED` tokens
- Remove per-component color overrides where they conflict
- Keep `error` for destructive actions only
- Update `drawButton()` to use unified palette by default

### Phase 4 — Verification

- Contrast check: all text on unified color meets WCAG AA
- Touch target audit: every interactive element ≥44×44
- Zero-explanation usability: labels understandable without context
- Regression test: all overlays open/close correctly

---

## 7. Developer Implementation Notes

### Migration Pattern (per overlay)

```javascript
// BEFORE (example from SettingsOverlay.js):
const resetBtn = scene.add.rectangle(0, y, panelW - 48, 40, 0xcb8a6b)
  .setStrokeStyle(2, 0xc9a884).setInteractive({ useHandCursor: true });
const resetText = scene.add.text(0, y, 'Сбросить онбординг', { ... }).setOrigin(0.5);

// AFTER:
const resetBtn = createUnifiedButton(scene, 0, y, panelW - 48, 44, 'Сбросить онбординг', () => {
  localStorage.removeItem('qg_onboarded');
  this.scene.showToast('Онбординг сброшен');
}, { secondary: false, disabled: false });
// Note: reset is destructive — use colorError exception, or keep unified with warning label
```

### Key Rules for Developers

1. **Never introduce a new button color.** If you need emphasis, use hover/pressed states of the unified color, not a new hue.
2. **Never make a touch target smaller than 44×44.** Wrap small icons in transparent hit areas.
3. **Always provide hover + pressed + disabled states.** `createUnifiedButton` handles this automatically.
4. **Labels must be self-explanatory.** Test by asking "would a first-time user know what this does without reading any other text?"
5. **Use `colorError` (0xcb8a6b) only for destructive actions** (reset, delete, cancel subscription). Everything else uses unified color.
6. **Badges: always unified color circle.** No per-type, per-rarity, or per-state badge colors.

### Files to Modify

| File | Changes |
|------|---------|
| `src/ui/ui-theme.js` | Add UNIFIED tokens, simplify `drawButton` default to unified |
| `src/ui/ui-unified.js` | **New file** — `createUnifiedButton`, `createUnifiedBadge`, `createUnifiedToggle` |
| `src/ui/MainMenuOverlay.js` | Replace 7 per-color buttons with unified |
| `src/ui/ShopOverlay.js` | Replace leafDark/woodMid buy buttons with unified |
| `src/ui/UpgradesOverlay.js` | Replace canBuy color logic with unified + disabled alpha |
| `src/ui/GoalsOverlay.js` | Replace claim button colors with unified |
| `src/ui/SettingsOverlay.js` | Replace reset/close/toggle colors with unified |
| `src/ui/PlantDetailOverlay.js` | Replace mutations button color with unified |
| `src/ui/BookOverlay.js` + `book/` | Replace rarity tab colors, mutation badge, card borders |
| `src/ui/MutationsOverlay.js` | Replace pager arrow colors with unified |
| `src/ui/HudTopBar.js` | Replace mute/menu colors with unified |
| `src/ui/InventoryBar.js` | Replace pagination arrow colors with unified |
| `src/ui/PackOpeningOverlay.js` | Replace 0x2ecc71 confirm with unified |
| `src/ui/HudEmotesBar.js` | Replace emote/phrase colors with unified |
| `src/ui/RolesOverlay.js` | Replace role card colors with unified |

---

## 8. Accessibility & Usability Verification Checklist

### Contrast (WCAG AA)
- [ ] Unified fill `0xd8a494` + `#ffffff` text on dark backgrounds: ≥4.5:1 ✅
- [ ] Unified fill `0xd8a494` + `#5c4a3a` text on parchment (large bold text 18px+): ≥3:1 ✅
- [ ] Secondary `0x8e7b63` + `#ffffff` text on dark: ≥4.5:1 ✅
- [ ] Disabled state `0xd8a494` @ 0.4 alpha: acceptable as disabled (lower contrast expected)

### Touch Targets
- [ ] All buttons ≥44×44 visual or hit area
- [ ] Pager arrows wrapped in 44×44 hit areas
- [ ] Rarity tabs ≥44×44 hit area
- [ ] Settings toggles ≥44×44 container
- [ ] Close ✕ buttons 44×44 hit areas

### Zero-Explanation Usability
- [ ] Every button label contains a verb + object ("Купить пак", "Забрать награду", "Сбросить онбординг")
- [ ] Disabled buttons show inline reason ("Недостаточно монет", "Максимальный уровень")
- [ ] Close buttons consistently in top-right with ✕ symbol
- [ ] Toggle labels state current value ("Звук вкл/выкл")

### Color Consistency
- [ ] Zero buttons outside `0xd8a494` (primary) / `0x8e7b63` (secondary) / `0xcb8a6b` (error, destructive only)
- [ ] Zero badges outside unified color circle
- [ ] All hover = `0xe8c3a8`, pressed = `0xc9a884`, disabled = 40% alpha of unified

---

## 9. Open Questions (for user confirmation)

1. **Unified color choice:** `0xd8a494` (terracotta, existing btnPrimary) — keep, or should we pick a different hue?
2. **Error color exception:** Keep `0xcb8a6b` for destructive actions (reset/delete), or paint those unified too with a warning label?
3. **Secondary color:** `0x8e7b63` (woodMid) for close/dismiss — keep, or make everything unified including close buttons?
4. **Russian labels:** All UI text is in Russian — labels rewritten in Russian above. Confirm this is correct.

---

**End of specification.** Ready for implementation upon confirmation of open questions.