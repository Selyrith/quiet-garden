# Quiet Garden — Co-op Farming Game Design Research Brief

## 1. Co-op That Isn't Just a Shared Wallet

**Complementarity over parallelism.** Project Horseshoe 2017 emphasizes "complementarity between the characters that players control… characters tend to settle better in one type of role" (fenix.tecnico.ulisboa.pt/downloadFile/395138343981/artigo.pdf). It Takes Two's design codex: "complementary verbs… each player's ability is incomplete alone; solutions require combining them — interdependence is mechanical, not social" (hayao.dev/docs/codex/anchor-it-takes-two).

**Concrete mechanics:**
- **Paired roles with divergent verbs** (Gameplay Atlas): "Identify needed abilities → choose who sets up → let partner use setup → pass obstacle and reassign" (gameplayatlas.loopyhop.com/mechanic/cooperation-complementary-abilities/). Example: Player A tills/weeds → creates "prepared soil" state → Player B plants/seeds gets 2× growth speed.
- **Proximity/adjacency bonuses**: Sky: Children of Light friendship tiers (4 levels per emote) unlock via *social activities* — candle lighting, heart gifting, completing Eden together — not currency (thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/1453...).
- **Gift economies**: Animal Crossing visitors buy rotated shop stock, share DIYs, water host's vegetables; unspoken etiquette: "walk don't run on flowers, ask before taking resources" (screenrant.com/animal-crossing-co-op-vist-islands-rules-resources/).
- **Asynchronous contribution**: Spiritfarer's "hug" mechanic — one player tends spirits while other manages ship; progress persists across sessions.

**What to avoid (user complaints):** Stardew Valley multiplayer: "I find multiplayer extremely boring… multiplayer doesn't really add anything… was generally a nuisance more than anything" (reddit.com/r/StardewValley/comments/9as7bw/); "Am I the only one who got bored with Stardew Valley multiplayer after a couple days?" (reddit.com/r/StardewValley/comments/8ihkt6/).

---

## 2. Harvest-Loop Economy: Avoiding the Death Spiral

**Root cause:** Seed cost > harvest yield over a cycle (Quiet Garden: −0.8 seeds/harvest, pack ROI −67% to −85%). Standard fixes (Department of Play, IdleMMO post-mortem):

| Fix | Mechanism | Example Numbers |
|-----|-----------|-----------------|
| **Vendor price floor** | Minimum sell-back value prevents collapse | IdleMMO: round-trip trade cost 400g → 440k for high-tier (galahadcreative.com/blog/idlemmo-economic-changes/) |
| **Byproducts / secondary yields** | Harvest returns seed + bonus (compost, essence) | Stardew: Keg ×3 fruit value, Jar ×2+50g, Casks ×2 after 56 days (teemo.dev/...) |
| **Tiered markets / artisan processing** | Raw → processed multipliers | Stardew g/day/tile: Parsnip 3.75 → Ancient Fruit 57.14 → Sweet Gem Berry 83.33 |
| **Secondary currencies** | Non-tradable "garden reputation" for cosmetics/upgrades | Sky: candles/hearts gate emotes, not gold |
| **Proportional tap/sink scaling** | Inflation managed by scaling both | Department of Play: Clash of Clans anchor = time; taps/sinks grow proportionally (departmentofplay.net/the-principles-of-building-a-game-economy/) |
| **Seed selling (shop sell-back)** | Recoup 30-50% of seed cost | Quiet Garden PLAN B3 |

**Quiet Garden specific:** PLAN.md B2 proposes seed return 20% → 35% + guaranteed return for common; B4 upgrades 100·1.45^n maxLv8 (~4k coins/branch vs 28k); B5 team tree 50·1.35^n with reward every level; B6 procedural team goals; B7 gardenRowsBonus expansion.

---

## 3. Anti-Stress / Cozy Pacing

**Three pillars (Project Horseshoe 2017, Designing for Coziness):**
1. **Safety** — no danger/risk, voluntary opt-in activities only
2. **Abundance** — lower needs met, space for higher needs
3. **Softness** — gentle stimuli, intimacy of space, slower tempo

**Negating factors to eliminate:** extrinsic rewards, danger/threat, **responsibility (mandatory maintenance)**, non-consensual distractions, intense stimuli, non-consensual social presence, confinement without choice. "Coziness is player dependent… you can encourage but can't force it" (projecthorseshoe.com/reports/ph17/ph17r3.htm; gamedeveloper.com/design/designing-for-coziness).

**Concrete pacing guidance:**
- **No action lockouts**: All verbs available at all times; waiting is visual (growth animation), not mechanical.
- **Wait times**: Perceived responsiveness > actual speed. Stardew watering = instant feedback + 24h growth; Animal Crossing fossil assess = instant + next-day result.
- **Busywork elimination**: Auto-water upgrade, batch harvest, "tend all" button. Spiritfarer: one hug tends all spirits in radius.
- **Session flexibility**: 5-min meaningful session (harvest + plant) to 1-hr relaxed play; no daily login pressure (Sky's candle run is optional).

---

## 4. Art Direction for Cozy Garden Games

**Techniques for polished 2D top-down (not programmer-art):**
- **Layered backgrounds**: Parallax sky → distant trees → garden frame → soil → paths → plants → foliage overlay → vignette.
- **Soil rendering**: Textured volumetric soil (lighter, warm tones) not flat tiles; Stardew uses 3-frame animated tilled soil.
- **Palette discipline**: Warm unified palette (remove dark-blue #1a1f2b per PLAN D1); 8-12 colors max per scene.
- **Lighting/phase**: Soft day/night gradient + vignette (PLAN D8); pulsing glow on ripe plants (D5); visible mutations in-field gold/rainbow sparkles (D6).
- **Animated foliage**: Wind shader on leaves (subtle, not wind.ogg duplicate music bug A12); butterflies/particles as ambient life.
- **Vector icons over emoji** (PLAN D7): Consistent stroke weight, readable at 16px.
- **Paths between plots + garden frame** (PLAN D3): Defines space, reduces "grid" feel.
- **Soft shadows/AO** (PLAN D4): Ground-contact shadows sell depth.

---

## 5. Co-op "Pairing" Mechanics (Action Synergy)

**Mechanical interdependence patterns:**
- **Setup → Payoff** (Gameplay Atlas): Player A creates condition (watered soil) → Player B exploits (instant sprout) → both get bonus (gameplayatlas.loopyhop.com/mechanic/cooperation-complementary-abilities/).
- **Simultaneous adjacent action**: Two players on orthogonal adjacent plots performing *different* verbs within 2s window → "Resonance" boost: +50% growth, rare mutation chance. PLAN C2: "paired action — two players on adjacent plots simultaneously → boosted growth."
- **Role specialization per-player** (not room-wide): PLAN C3 "roles made personal… to stop freeloading." Sky's friendship tiers are per-player, not shared.
- **Shared chore, divergent verbs**: Weed pulling (Player A) + Soil blessing (Player B) = "Pristine bed" state lasting 3 cycles.
- **Gift wrapping**: Player crafts "seed packet" from harvest → gifts to friend → friend plants for 2× XP; reciprocal gratitude tracked.

**Key principle:** Synergy must be *mechanical* (numbers change) not just *social* (chat). It Takes Two: "interdependence is mechanical, not social" (hayao.dev/docs/codex/anchor-it-takes-two).
