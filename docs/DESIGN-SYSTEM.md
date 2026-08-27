# Fovea — Design System Specification

**Version 1.0 · For implementation in vanilla HTML/CSS/JS on GitHub Pages**

> Fovea — *Open-source vision screening, right in your browser.*

This document is the source of truth for visual and interaction design. Every value here is
final: hex codes, rem values, milliseconds, pixel counts. Where a number is derived from a
clinical standard, the derivation is shown so it can be checked rather than trusted.

Contrast ratios in this document were computed with the WCAG 2.x relative-luminance formula
against the exact hex values listed. They are stated, not estimated.

---

## 0. The rule that outranks every other rule

> **Nothing that the design system does may change what the eye reports.**

Fovea measures perception. Any chrome, tint, gradient, shadow, animation, or accent inside a
test's field of view is a confound, not a decoration. When a rule in this document conflicts
with that sentence, that sentence wins.

Three consequences that shape everything below:

1. There are **two visual worlds**: the *product* (landing, suite, results, report, tools) and
   the *stage* (the live test surface). The product has a brand. The stage has none.
2. Colour is never the only carrier of meaning — not because it is a nice accessibility habit,
   but because roughly 1 in 12 men in Fovea's actual audience cannot resolve a red/green pair.
3. Motion near a target is banned outright, not softened.

---

## 1. Art direction

### The sentence

**Fovea looks like a precision optical instrument that happens to run in a browser** — machined
neutral greys, engraved labels, a rigorously logarithmic measure, and exactly one colour, the
blue-green bloom of an anti-reflective lens coating.

### Point of view

The old build was a *game*: starfield, gradients, pulsing score, `#007bff`. The new one is an
*instrument*. An instrument earns trust by looking calibrated, not by looking friendly. It shows
its units. It shows its uncertainty. It does not congratulate you.

The single organising idea, and the thing that makes this system not-generic:

> **The type scale steps by 0.1 log units — ratio 10^0.1 = 1.25893 — because that is the step
> between two lines of a LogMAR acuity chart.**

Every heading in Fovea is exactly one chart line larger than the one below it. The "large text"
accessibility mode is exactly one chart line up. This is not a metaphor bolted on afterwards;
it is the measurement system of the subject used as the measurement system of the interface.

### Adjacent design languages — and what we take from each

| Reference | What we take | What we leave |
|---|---|---|
| **Zeiss / Leica optical instrument graphics** (lens barrel engraving, trial-lens rims, the printed scales on a phoropter) | Achromatic machined greys; hairline index rules; tabular numerals; labels set small, uppercase, wide-tracked, as if etched. Colour used only where it is *data*. | The literal black-and-chrome hardware palette. We are lighter and airier than a lens barrel. |
| **Bailey–Lovie / ETDRS chart typography** (the modern LogMAR chart that replaced Snellen) | The logarithmic progression itself; five-per-row rhythm; equal legibility across sizes; the discipline that spacing scales *with* the glyph, not independently. | The literal chart look. Fovea is not a poster of letters. |
| **Braun / Vitsœ control-panel tradition (Rams, Gugelot)** | Restraint as a positive statement; a control looks like what it does; one accent, held back until it means something; flat surfaces separated by a line, not a shadow. | The nostalgic beige-and-orange pastiche. No retro cosplay. |

### Explicitly avoided

- Starfields, particle fields, nebulae, anything "space".
- Gamification: scores, streaks, confetti, badges, progress celebrations, "You got 12/14!"
- `#007bff` and the entire Bootstrap-blue / trust-blue-gradient register.
- Glassmorphism, frosted blur, neumorphism, glow, bloom, coloured drop shadows.
- Gradient text, gradient heroes, gradient buttons.
- Red-alert results styling. A screening result is never an error.
- Warm cream ground + high-contrast serif display + terracotta accent (the current house style of
  auto-generated design). Fovea's ground is cool and its accent is cyan-petrol.
- Near-black page with a single acid-green accent.
- Emoji as iconography or section markers.
- Pill-shaped everything. Radii here are small and deliberate.
- Full-width centred text columns. Fovea aligns left; instruments have a datum edge.

---

## 2. Colour system

### 2.1 Brand hue and its rationale

**Brand hue: OKLCH hue 222° — a petrol blue-green.** Named `--coating` in the source, after the
residual reflection of an anti-reflective coating on an ophthalmic lens: hold a coated spectacle
lens to the light and the bloom you see is this colour.

Three reasons this hue and not another:

1. **It survives dichromacy.** Protanopes and deuteranopes — 8% of men, Fovea's core audience —
   confuse hues along the red-green axis. A blue-cyan accent stays distinct from the neutral
   ground and from the amber status colour for every common CVD type. Tritan deficiency does
   collapse blue/yellow, but congenital tritanopia is on the order of 1 in 10,000 versus 1 in 12.
2. **It is not a health-tech blue.** 222° in OKLCH lands on petrol/teal, not the corporate
   `#007bff` register the old build used.
3. **It is subject-true.** It is the colour of a lens, from a project about lenses and retinas.

The brand colour **never appears on a test stage**. See §2.4.

### 2.2 Semantic model — *no good/bad axis*

Fovea does not have success and error states for results. Screening outcomes are three, and
none of them is a failure:

| Token family | Means | Hue | Always paired with |
|---|---|---|---|
| `--accent-*` (petrol) | **Typical** — result consistent with normal function | 222° | `check` icon + the word "Typical" |
| `--attention-*` (amber) | **Follow-up suggested** — see an eye care professional | 68–78° | `triangle-alert` icon + "Follow-up suggested" |
| *(neutral greys)* | **Inconclusive** — retake under better conditions | none | `minus` icon + "Inconclusive" |
| `--critical-*` (red) | **System error only** — upload failed, storage blocked | 28° | `x` icon + a fix instruction |

`--critical-*` is a UI colour. It is forbidden in any results context. A person's vision result
is never red.

Blue-vs-amber is the most dichromat-robust two-colour pair available, and both are still
redundantly encoded with icon *and* text. Hue is never load-bearing.

### 2.3 Light theme tokens

```css
:root {
  /* ── surfaces ────────────────────────────────────────────── */
  --surface-sunken:  #E7ECEE;   /* wells, inset tracks, code   */
  --surface-page:    #F1F5F7;   /* the document ground         */
  --surface-card:    #FCFEFE;   /* cards, panels               */
  --surface-raised:  #FFFFFF;   /* modals, popovers, sheets    */

  /* ── text ────────────────────────────────────────────────── */
  --text-primary:    #1A2225;   /* headings, body              */
  --text-secondary:  #4F595C;   /* supporting copy, captions   */
  --text-muted:      #687276;   /* metadata, disabled labels   */
  --text-on-accent:  #FFFFFF;

  /* ── borders ─────────────────────────────────────────────── */
  --border-hairline: #DDE2E4;   /* dividers inside a card      */
  --border-default:  #CAD1D3;   /* card edge, table rules      */
  --border-strong:   #9EA6AA;   /* emphasised separation       */
  --border-control:  #798285;   /* input & control outlines    */

  /* ── accent ramp (petrol, OKLCH H222) ────────────────────── */
  --accent-subtle:   #E0F4FB;   /* tinted fill                 */
  --accent-border:   #9EDCF2;   /* tinted fill's edge          */
  --accent:          #0A6E88;   /* primary fill, links         */
  --accent-hover:    #075C72;   /* hover / pressed             */

  /* ── attention (amber) ───────────────────────────────────── */
  --attention-subtle: #FBF0DD;
  --attention-border: #EFC895;
  --attention:        #845001;

  /* ── critical — UI errors only, never results ────────────── */
  --critical-subtle:  #FDEBE9;
  --critical:         #A8372E;

  /* ── focus ───────────────────────────────────────────────── */
  --focus-ring:       #4371C8;
}
```

**Contrast ratios — light theme.** All computed against the exact hexes above.

| Foreground | on `--surface-page` #F1F5F7 | on `--surface-card` #FCFEFE | on `--surface-sunken` #E7ECEE | on #FFFFFF | Verdict |
|---|---|---|---|---|---|
| `--text-primary` #1A2225 | **14.73** | **15.97** | **13.57** | **16.16** | AAA everywhere |
| `--text-secondary` #4F595C | **6.57** | **7.12** | **6.05** | **7.20** | AA everywhere; AAA on card |
| `--text-muted` #687276 | **4.50** | **4.87** | **4.14** | **4.93** | AA on page/card/white. **Not permitted on `--surface-sunken`** (4.14 < 4.5) — use `--text-secondary` there. |
| `--accent` #0A6E88 | **5.32** | **5.76** | **4.90** | **5.84** | AA everywhere |
| `--attention` #845001 | **6.12** | **6.63** | **5.63** | **6.71** | AA everywhere |
| `--critical` #A8372E | **5.89** | **6.38** | **5.42** | **6.46** | AA everywhere |
| `--focus-ring` #4371C8 | **4.32** | **4.68** | **3.98** | **4.74** | ≥3:1 non-text AA everywhere; not for body text |

| Pairing | Ratio | Requirement | Verdict |
|---|---|---|---|
| `--text-on-accent` #FFFFFF on `--accent` #0A6E88 | **5.84** | 4.5 (text) | Pass |
| `--accent` on `--accent-subtle` #E0F4FB | **5.14** | 4.5 | Pass |
| `--attention` on `--attention-subtle` #FBF0DD | **5.95** | 4.5 | Pass |
| `--critical` on `--critical-subtle` #FDEBE9 | **5.61** | 4.5 | Pass |
| `--border-control` #798285 on `--surface-page` | **3.58** | 3.0 (non-text, WCAG 1.4.11) | Pass |
| `--border-control` on `--surface-card` | **3.88** | 3.0 | Pass |
| `--border-strong` #9EA6AA on page | 2.26 | — | Decorative only. Never the sole outline of a control. |
| `--border-default` #CAD1D3 on page | 1.41 | — | Decorative only |

### 2.4 Dark theme tokens

Dark is a designed palette, not an inversion. Surfaces get *lighter* as they rise; shadows do
almost nothing in the dark and are replaced by surface lightness steps.

```css
:root:not([data-theme="light"]) { }              /* pattern, see §2.6 */

/* dark values */
  --surface-sunken:  #070C0E;
  --surface-page:    #0D1416;
  --surface-card:    #161D20;
  --surface-raised:  #1F272B;

  --text-primary:    #EEF3F5;
  --text-secondary:  #B3BCC0;
  --text-muted:      #879195;
  --text-on-accent:  #02141B;

  --border-hairline: #2A3337;
  --border-default:  #3B464A;
  --border-strong:   #556368;
  --border-control:  #5F6B70;

  --accent-subtle:   #0B2C36;
  --accent-border:   #0A5063;
  --accent:          #58CBEF;
  --accent-hover:    #80DEFE;

  --attention-subtle: #37240E;
  --attention-border: #674519;
  --attention:        #F4B854;

  --critical-subtle:  #3E1F1B;
  --critical:         #F98F82;

  --focus-ring:       #93B8FB;
```

**Contrast ratios — dark theme.**

| Foreground | on `--surface-page` #0D1416 | on `--surface-card` #161D20 | on `--surface-raised` #1F272B | Verdict |
|---|---|---|---|---|
| `--text-primary` #EEF3F5 | **16.63** | **15.25** | **13.57** | AAA everywhere |
| `--text-secondary` #B3BCC0 | **9.63** | **8.83** | **7.86** | AAA everywhere |
| `--text-muted` #879195 | **5.77** | **5.29** | **4.71** | AA everywhere |
| `--accent` #58CBEF | **9.93** | **9.10** | **8.10** | AAA everywhere |
| `--attention` #F4B854 | **10.48** | **9.61** | **8.55** | AAA everywhere |
| `--critical` #F98F82 | **8.22** | **7.54** | **6.71** | AAA everywhere |
| `--focus-ring` #93B8FB | **9.29** | **8.52** | — | Pass |

| Pairing | Ratio | Verdict |
|---|---|---|
| `--text-on-accent` #02141B on `--accent` #58CBEF | **10.02** | Pass |
| `--accent` on `--accent-subtle` #0B2C36 | **7.85** | Pass |
| `--attention` on `--attention-subtle` #37240E | **8.32** | Pass |
| `--critical` on `--critical-subtle` #3E1F1B | **6.55** | Pass |
| `--border-control` #5F6B70 on page / card | **3.39 / 3.11** | Pass (≥3.0) |

### 2.5 Test-mode palettes — the neutral world

Test surfaces are declared on the root element and **override every token above**. There are two.

```html
<html data-stage="neutral">   <!-- Ishihara, duochrome, colour arrangement -->
<html data-stage="photopic">  <!-- acuity, near vision, contrast, Amsler, astigmatism -->
```

#### A. `data-stage="neutral"` — the chromatic-neutral field

Every value is **strictly achromatic: R = G = B, chroma exactly 0.** Not "a grey with a hint of
blue". Zero. A hue bias in the surround shifts the observer's adaptation state and biases a
colour-vision result via simultaneous contrast.

```css
[data-stage="neutral"] {
  --n-000: #000000;   /* Y 0.0000 */
  --n-050: #0A0A0A;   /* Y 0.0030  — stage text            */
  --n-100: #1A1A1A;   /* Y 0.0103                          */
  --n-200: #333333;   /* Y 0.0331                          */
  --n-350: #595959;   /* Y 0.0999  — hairlines             */
  --n-500: #767676;   /* Y 0.1812  — Munsell N5 / 18% grey */
  --n-620: #969696;   /* Y 0.3050  — THE STAGE FIELD       */
  --n-750: #BFBFBF;   /* Y 0.5210                          */
  --n-880: #E0E0E0;   /* Y 0.7454                          */
  --n-100p:#FFFFFF;   /* Y 1.0000                          */

  --stage-field:  var(--n-620);
  --stage-ink:    var(--n-050);
  --stage-rule:   var(--n-350);
  --stage-chip:   var(--n-880);
}
```

**Why `#969696` (Y = 0.305) and not the 18% grey `#767676`.** `#767676` is the classic
photographic/Munsell N5 reference and is exactly 18.1% luminance — it is correct for a *printed*
plate under a lamp. On an emissive display it is too dark for the surrounding UI to reach AA
without introducing large bright patches beside the plate. `#969696` is achromatic, close to the
mean luminance of a generated Ishihara plate (so plate onset does not change the adaptation
state), and admits dark type at comfortable ratios:

| Stage pairing | Ratio | Note |
|---|---|---|
| `--stage-ink` #0A0A0A on `--stage-field` #969696 | **6.69** | AA / AAA-large. Primary stage text. |
| #000000 on #969696 | **7.10** | AAA. Reserved for the plate's own answer glyphs. |
| #333333 on #969696 | **4.27** | Below AA — **not permitted for text**; hairlines only. |
| `--stage-chip` #E0E0E0 on #969696 | 2.24 | Non-text surface only; needs a `--n-350` border. |
| `--stage-ink` on `--stage-chip` #E0E0E0 | **15.00** | Chip label text. |
| `--n-500` #767676 as an alternate field, ink #FFFFFF | 4.54 | Permitted only in the "darker surround" preference. |

Stage rules for `neutral`:
- The field covers 100% of the viewport. No card, no border, no shadow anywhere within
  **96 px** of the plate edge (48 px below the `md` breakpoint).
- Answer chips sit in a bar pinned to the bottom, separated from the plate by ≥ 96 px, on
  `--stage-chip` with a 1 px `--n-350` outline. Their fill is achromatic; selection is shown by
  a 2 px `--n-050` outline plus a `check` icon, never by colour.
- No image, logo, avatar, gradient, or brand element may render while `data-stage="neutral"`.
- The theme toggle is **disabled**; `data-theme` has no effect inside a stage.

#### B. `data-stage="photopic"` — the calibrated white field

```css
[data-stage="photopic"] {
  --stage-field: #FFFFFF;   /* Y 1.0000 */
  --stage-ink:   #000000;   /* Y 0.0000 — contrast 21.00:1 */
  --stage-rule:  #000000;
  --stage-chip:  #FFFFFF;
}
```

- Field is `#FFFFFF` exactly. Optotypes and Amsler lines are `#000000` exactly. **21.00:1.**
- No off-white, no `#FDFDFD`, no vignette, no subtle shadow, no rounded stage container.
- Dark theme is force-disabled. An acuity test on a dark ground measures a different thing
  (negative contrast polarity changes threshold); the app must not silently do that.
- The only chrome permitted on the field is a 44 px top strip with `#000000` text on `#FFFFFF`,
  separated by a single 1 px `#000000` hairline flush to the strip's bottom edge.
- Before entry, show the **luminance prompt**: "Set display brightness to comfortable maximum and
  turn off night shift / warm-light modes." Fovea cannot measure cd/m²; it must say so.

#### C. Duochrome red/green — the one place saturated colour is correct

The red/green duochrome test relies on longitudinal chromatic aberration, and it only works if
the two halves are **equal in luminance**. Naïve `#FF0000` / `#00FF00` are not: Y = 0.2126 vs
0.7152, a 3.4× luminance difference that produces a brightness judgement instead of a focus
judgement.

```css
--duo-red:   #FF0000;   /* Y = 0.2126 */
--duo-green: #009400;   /* Y = 0.2118 — matched to red within 0.4% */
--duo-ink:   #000000;   /* 5.25:1 on red, 5.24:1 on green — matched */
```

Split the field vertically, red left, green right, hard edge, no feather. Optotypes `#000000`,
identical set on both halves, vertically centred across the seam.

**Honesty note that must ship in the UI:** clinical duochrome uses ~620 nm and ~535 nm filters.
An sRGB display's red primary peaks near 610 nm and its green near 550 nm, and the actual
spectra vary by panel. Fovea's duochrome is indicative of a refractive tendency, not a
prescription. Say this on the results card, in `--text-secondary`, not hidden in a tooltip.

#### D. Ishihara plate generation — colour acceptance test

Plate colours are not tokens; they are generated per plate. The **rule** is a token:

- Figure and ground dot colours must have equal sRGB relative luminance Y, ± 2%.
- Per-dot luminance jitter of ± 4% Y is applied **independently of class**, so no luminance edge
  traces the figure.
- **Acceptance test (automated, run in CI):** render the plate, sample figure and ground dot
  colours, then
  - for a normal observer, mean ΔE00(figure, ground) **≥ 12**;
  - after a Brettel–Viénot–Mollon transform for the plate's target deficiency, mean ΔE00
    **≤ 2.0**.
  A plate that fails either bound is not shipped.
- Plate physical size: **74 mm diameter** when calibration is available (matches the printed
  Ishihara plate). Fallback 480 CSS px, floor 320 px.
- Dot radii: Poisson-disc sampled, r ∈ [0.9 mm, 3.6 mm], minimum gap 0.35 mm, field packed to
  ~ 86% coverage.

### 2.6 Theme wiring (the three-state pattern)

The viewer has three states, not two: explicit light, explicit dark, and *nothing stamped*
(system default). All three must resolve.

```css
:root { /* complete LIGHT palette lives here */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark token overrides */ }
}

:root[data-theme="dark"] { /* the same dark token overrides */ }

body { background: var(--surface-page); color: var(--text-primary); }
```

Never declare a colour whose only definition sits inside a media query or a `[data-theme]`
block. Components read tokens; they never read literals.

### 2.7 High-contrast and large-text modes

```css
:root[data-contrast="high"] {
  --surface-page: #FFFFFF; --surface-card: #FFFFFF; --surface-raised: #FFFFFF;
  --surface-sunken: #F2F2F2;
  --text-primary: #000000;      /* 21.00:1 */
  --text-secondary: #1A1A1A;    /* 17.40:1 */
  --text-muted: #333333;        /* 12.63:1 */
  --border-hairline: #000000; --border-default: #000000;
  --border-strong: #000000;   --border-control: #000000;
  --accent: #0A5063;            /* 8.97:1 on white */
  --attention: #673D00;         /* 9.36:1 on white */
  --focus-ring: #0A5063;
  --border-width: 2px;          /* every control outline doubles */
  --focus-width: 4px;
}
```

Dark high-contrast mirrors this with `#000000` surfaces, `#FFFFFF` primary text (21.00:1) and
`#7FDCFB` accent. Also honour `@media (forced-colors: active)`: drop all custom backgrounds,
keep `1px solid` on every control so Windows High Contrast can paint it, and never rely on
`box-shadow` for the focus ring there — use `outline`.

**Large text mode shifts the whole scale by exact chart lines:**

```css
:root                       { --fs-anchor: 1.0625rem; }  /* 17.00px — LogMAR 0.0 */
:root[data-text="large"]    { --fs-anchor: 1.3375rem; }  /* 21.40px — +0.1 log   */
:root[data-text="xlarge"]   { --fs-anchor: 1.6840rem; }  /* 26.94px — +0.2 log   */
```

---

## 3. Typography

### 3.1 The four families

| Role | Family | Source | Axes used | Why this one |
|---|---|---|---|---|
| **Operate** — UI, controls, labels, numerals, headings | **Archivo** | Google Fonts (variable) | `wght 100–900`, `wdth 62–125` | A grotesque built for high-performance signage and data. The `wdth` axis lets the wordmark and large numerals run *expanded* like an instrument panel while UI text stays normal — one family, two voices. Its figures are strong and it has real tabular support. |
| **Read** — body copy, results narrative, explanations, disclaimers | **Source Serif 4** | Google Fonts (variable) | `opsz 8–60`, `wght 200–900` | A sturdy low-contrast text serif with a genuine **optical size axis** — the type itself is corrected for viewing size, which is thematically exact for a vision app and practically better at 21 px. Signals "read this carefully", which is what health copy needs. |
| **Measure** — readouts, units, coordinates, log values, seeds | **JetBrains Mono** | Google Fonts (variable) | `wght 400–700` | Tuned for legibility at small sizes; unambiguous `0/O` and `1/l/I`, which matters when the readout is `0.10 logMAR` or `20/40`. |
| **Optotype** — acuity/near-vision letters only | **Optician Sans** | Self-hosted, SIL OFL 1.1 | 400 only | See §3.5. |

**The rule that decides which:** *sans to operate, serif to read, mono to measure.* A button is
Archivo. A paragraph explaining what deuteranomaly is, is Source Serif 4. `0.20 logMAR (20/32)`
is JetBrains Mono. There is no third case.

### 3.2 Loading

Self-host all four as `woff2` in `/fonts`. GitHub Pages serves them fine, it removes a
third-party dependency from a health-adjacent tool, and Optician Sans has to be self-hosted
anyway. If you prefer the CDN during development:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Source+Serif+4:opsz,wght@8..60,200..900&family=JetBrains+Mono:wght@400..700&display=swap">
```

```css
--font-ui:   "Archivo", "Helvetica Neue", Arial, system-ui, sans-serif;
--font-read: "Source Serif 4", Charter, "Bitstream Charter", Georgia, serif;
--font-data: "JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;
--font-opto: "Optician Sans", monospace;   /* see the gate in §3.5 */
```

`font-display: swap` for the first three. **`font-display: block` for Optician Sans** — an
optotype rendered in a fallback face is a silently corrupted measurement.

### 3.3 The scale — 0.1 log steps

Anchor `--fs-anchor` = 17.00 px. Ratio 10^0.1 = **1.25893**. Each step is one LogMAR chart line.

| Token | Multiplier | rem | px @ 16px root | Line height | Tracking | Use |
|---|---|---|---|---|---|---|
| `--fs--2` | ÷1.25893² | 0.670rem | 10.72 | 1.30 | +0.10em | Uppercase micro-labels only (chip counters, axis ticks). Minimum permitted size in the app. |
| `--fs--1` | ÷1.25893 | 0.844rem | 13.50 | 1.35 | +0.06em | Eyebrows, table headers, metadata, legend labels — set uppercase. |
| `--fs-0` | 1 | 1.0625rem | 17.00 | 1.45 (UI) / 1.55 (sans body) | 0 | Default UI text, buttons, inputs, chip labels. |
| `--fs-1` | ×1.25893 | 1.3375rem | 21.40 | 1.60 | 0 | **Body copy in Source Serif 4.** Lead paragraphs. |
| `--fs-2` | ×1.25893² | 1.684rem | 26.94 | 1.30 | −0.005em | `h3` — card titles, section subheads. |
| `--fs-3` | ×1.25893³ | 2.120rem | 33.92 | 1.22 | −0.012em | `h2` — section titles. |
| `--fs-4` | ×1.25893⁴ | 2.669rem | 42.70 | 1.15 | −0.018em | `h1` on interior pages; result headline. |
| `--fs-5` | ×1.25893⁵ | 3.360rem | 53.76 | 1.10 | −0.022em | Landing sub-headline; large readout numerals. |
| `--fs-6` | ×1.25893⁶ | 4.230rem | 67.68 | 1.06 | −0.026em | Landing headline, `md`+ only. |
| `--fs-7` | ×1.25893⁷ | 5.325rem | 85.19 | 1.02 | −0.030em | Landing headline, `xl` only. The single largest size in the product. |

```css
:root {
  --fs-anchor: 1.0625rem;
  --fs--2: calc(var(--fs-anchor) / 1.58489);
  --fs--1: calc(var(--fs-anchor) / 1.25893);
  --fs-0:  var(--fs-anchor);
  --fs-1:  calc(var(--fs-anchor) * 1.25893);
  --fs-2:  calc(var(--fs-anchor) * 1.58489);
  --fs-3:  calc(var(--fs-anchor) * 1.99526);
  --fs-4:  calc(var(--fs-anchor) * 2.51189);
  --fs-5:  calc(var(--fs-anchor) * 3.16228);
  --fs-6:  calc(var(--fs-anchor) * 3.98107);
  --fs-7:  calc(var(--fs-anchor) * 5.01187);
}
```

Because everything derives from `--fs-anchor`, the large-text modes in §2.7 move the entire
system by exactly one or two chart lines. No component needs a media query for it.

### 3.4 Weight, width, and feature rules

```css
/* Headings — Archivo, tightened, never light */
h1,h2,h3 { font-family: var(--font-ui); font-variation-settings: "wght" 620, "wdth" 100;
           text-wrap: balance; }

/* Landing headline & wordmark — the expanded voice */
.display  { font-variation-settings: "wght" 600, "wdth" 112; }

/* Eyebrow / engraved label */
.eyebrow  { font-family: var(--font-ui); font-size: var(--fs--1);
            font-variation-settings: "wght" 640, "wdth" 92;
            text-transform: uppercase; letter-spacing: .06em;
            color: var(--text-muted); }

/* Body — the reading register */
.prose p  { font-family: var(--font-read); font-size: var(--fs-1); line-height: 1.6;
            font-variation-settings: "opsz" 21, "wght" 400;
            max-width: 68ch; color: var(--text-primary); }

/* Readouts */
.readout  { font-family: var(--font-data); font-variation-settings: "wght" 500;
            font-variant-numeric: tabular-nums; letter-spacing: -.01em; }

/* Any column of numbers, anywhere */
table, .metric { font-variant-numeric: tabular-nums; }
```

- **Never** go below `wght 400` for body or below `wght 500` for anything at `--fs--1` or smaller.
- Measure: 68ch for serif body, 56ch for sans UI copy. Never full-bleed paragraphs.
- Uppercase is used *only* at `--fs--1` and `--fs--2`, always with ≥ +0.06em tracking.
- In `data-text="large"` / `"xlarge"`, `.prose p` switches to `var(--font-ui)` at `wght 450` —
  a sans is easier for low-vision readers at large sizes and the serif's optical-size correction
  stops helping past ~30 px.

### 3.5 Optotypes — the legal and technical answer

Research result, stated plainly:

| Candidate | License | Verdict |
|---|---|---|
| **Sloan.otf / Pelli.otf** (`github.com/denispelli/Eye-Chart-Fonts`) | CC BY-NC-SA 4.0. The repo README states: *"The Pelli and Sloan fonts are made available here for research purposes and may not be distributed further. Commercial use of these fonts would require a license from Denis Pelli."* | **Cannot ship.** Publishing to GitHub Pages *is* further distribution, and NC conflicts with an MIT-licensed public project. Do not use. |
| **Optician Sans** (`github.com/anewtypeofinterference/Optician-Sans`, optician-sans.com) | **SIL Open Font License 1.1.** Free to use, modify, embed and redistribute (may not be sold on its own). Ships OpenType-PS, OpenType-TT, and dedicated **Web-PS / Web-TT** folders. Single weight. | **Use this.** Drawn on Sloan optotype construction, one weight, includes digits. |

**Recommendation — a two-layer approach.**

1. **Chart appearance and the letter tests: Optician Sans, restricted to the Sloan set.**
   The ten Sloan letters — `C D H K N O R S V Z` — were selected in 1959 for approximately equal
   legibility. Optician Sans contains a full alphabet; using letters outside the Sloan ten
   silently makes some lines easier than others. Enforce it in code:

   ```js
   const SLOAN = ['C','D','H','K','N','O','R','S','V','Z'];
   ```

   Caveat that must appear in the app's methodology note: Optician Sans is a *display face built
   on* Sloan construction with optical adjustments; it is not a metrologically certified
   optotype. Fovea is a screening tool, and says so.

2. **The measured trials: draw a Landolt C geometrically, not as a glyph.**
   The Landolt C is defined exactly and needs no font at all, which removes every font-loading
   and hinting risk from the one thing that must be pixel-exact:

   ```
   Unit u = letterHeight / 5
   Outer radius  = 2.5u      Inner radius = 1.5u      Ring stroke = 1u      Gap = 1u
   Gap orientation ∈ {0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°}
   ```

   SVG: a `<circle r="2u" stroke-width="1u" fill="none">` with a `stroke-dasharray` computed so
   exactly `1u` of arc is missing, rotated to the trial's orientation. Eight-alternative forced
   choice, so guess rate is 12.5% rather than the ~10% of a ten-letter chart, and it is
   language- and literacy-independent.

**Font-ready gate — required before any acuity trial renders:**

```js
await document.fonts.ready;
if (!document.fonts.check('1em "Optician Sans"')) {
  // Do not start. Offer the Landolt C mode instead.
}
```

### 3.6 Optotype sizing from calibration

```
ID-1 credit card (ISO/IEC 7810):  85.60 mm × 53.98 mm,  corner radius 3.18 mm
pxPerMm  = calibratedRectWidthCssPx / 85.60
cssPpi   = pxPerMm × 25.4

/* A LogMAR 0.0 (6/6, 20/20) letter subtends 5 arcmin overall, 1 arcmin per stroke. */
heightMm(logMAR, distanceMm)
  = 2 × distanceMm × tan(2.5 arcmin)
  = distanceMm × 1.454442e-3 × 10^logMAR

heightPx = heightMm × pxPerMm
strokePx = heightPx / 5
snellenFt = 20 × 10^logMAR        /* logMAR 0.2 → 20/32 */
```

**Renderability guard.** If `strokePx × devicePixelRatio < 1.0`, the display physically cannot
draw that line. Refuse it and tell the truth:

> "At 100 cm this screen can resolve down to 20/25. Move to 200 cm to test 20/20, or accept
> 20/25 as the floor for this session."

Bailey–Lovie chart geometry when showing a full chart: 5 optotypes per row, inter-letter spacing
= one optotype width **of that row**, inter-row spacing = the height of the *smaller* row. The
spacing scales with the letters — that is the whole point of the LogMAR chart.

---

## 4. Space, radius, elevation, borders

### 4.1 Space — a 4 px grid, and why it is *not* logarithmic

Type is logarithmic because acuity is logarithmic. Space is a 4 px grid because layout is about
alignment, and a 1.25893 ratio produces values that never align. Forcing one system onto the
other would be theatre. Two systems, each honest about its job.

```css
--sp-0:  0;
--sp-1:  0.25rem;  /*  4px  — icon-to-label, hairline offsets      */
--sp-2:  0.5rem;   /*  8px  — inside a chip, tight stacks          */
--sp-3:  0.75rem;  /* 12px  — button padding-y, list-item gap      */
--sp-4:  1rem;     /* 16px  — default gap; card padding on mobile  */
--sp-5:  1.5rem;   /* 24px  — card padding; grid gutter            */
--sp-6:  2rem;     /* 32px  — card-to-card; section inner padding  */
--sp-7:  3rem;     /* 48px  — sub-section rhythm                   */
--sp-8:  4rem;     /* 64px  — section rhythm on mobile             */
--sp-9:  6rem;     /* 96px  — section rhythm ≥md; STAGE QUIET ZONE */
--sp-10: 8rem;     /* 128px — landing section rhythm ≥lg           */
```

`--sp-9` (96 px) is doubly load-bearing: it is the section rhythm *and* the minimum clear
distance between any test target and any other rendered element (48 px below `md`).

### 4.2 Radius

Small and deliberate. An instrument is not a bubble.

```css
--r-xs:   2px;   /* chip counters, badges, inline code            */
--r-sm:   4px;   /* inputs, selects, small buttons                */
--r-md:   6px;   /* buttons, choice chips, toasts                 */
--r-lg:  10px;   /* cards, panels, the calibration card outline*  */
--r-xl:  16px;   /* modals, bottom sheets                         */
--r-full: 999px; /* ONLY: step dots, the switch thumb & track      */
```

\* The calibration widget's rectangle uses a *computed* radius of `3.18mm × pxPerMm`, the real
ID-1 corner radius, not a token — the whole point is that it matches the physical card.

Test stages use `--r-xs: 0` and no radius anywhere on or near the field.

### 4.3 Elevation

Fovea separates surfaces with **a line first, a shadow second**. Shadows are tight and neutral,
tinted with the page ink so they never look purple.

```css
/* light */
--elev-0: none;                                     /* + 1px --border-default */
--elev-1: 0 1px 2px rgba(26,34,37,.06),
          0 1px 1px rgba(26,34,37,.04);             /* cards at rest         */
--elev-2: 0 2px 4px -1px rgba(26,34,37,.08),
          0 8px 16px -6px rgba(26,34,37,.07);       /* card hover, popover   */
--elev-3: 0 4px 8px -2px rgba(26,34,37,.10),
          0 20px 40px -12px rgba(26,34,37,.18);     /* modal, sheet          */

/* dark — shadows barely read; surfaces step up in lightness instead */
--elev-1: 0 1px 2px rgba(0,0,0,.40);
--elev-2: 0 2px 6px rgba(0,0,0,.50);
--elev-3: 0 8px 32px rgba(0,0,0,.62);
```

Rule: a card at `--elev-1` keeps its 1 px border. Elevation adds depth; it never replaces the
edge, because a shadow at 6% alpha is invisible to a low-vision user and invisible in forced-colors mode.

### 4.4 Borders

```css
--border-width:      1px;   /* 2px under [data-contrast="high"] */
--border-width-emph: 2px;
--hairline: 1px solid var(--border-hairline);
--edge:     1px solid var(--border-default);
--control:  1px solid var(--border-control);   /* 3.58:1 — the only compliant control edge */
```

Any element a user can click, type in, or drag uses `--control` or stronger. `--border-default`
and `--border-hairline` are below 3:1 and are for decorative separation only.

---

## 5. Motion

### 5.1 Tokens

```css
--dur-1:  80ms;   /* press / active state                        */
--dur-2: 140ms;   /* hover, chip select, toggle                   */
--dur-3: 220ms;   /* popover, toast in, accordion                 */
--dur-4: 320ms;   /* modal, bottom sheet, route transition        */
--dur-5: 560ms;   /* hero mosaic first paint — ONE use, landing   */

--ease-standard: cubic-bezier(.2, 0, 0, 1);     /* default, all state changes */
--ease-out:      cubic-bezier(.05, .7, .1, 1);  /* things entering             */
--ease-in:       cubic-bezier(.3, 0, 1, 1);     /* things leaving              */
--ease-emph:     cubic-bezier(.3, 0, 0, 1);     /* modal, sheet                */
```

`linear` is permitted only for opacity-only crossfades and for the break timer's ring sweep,
where any easing would misrepresent elapsed time.

### 5.2 What animates

| Element | Property | Duration | Easing |
|---|---|---|---|
| Button / chip hover | `background-color`, `border-color` | `--dur-2` | `--ease-standard` |
| Button press | `transform: translateY(1px)` | `--dur-1` | `--ease-standard` |
| Focus ring | **none** — appears instantly | 0ms | — |
| Test card hover | `box-shadow`, `border-color`, `transform: translateY(-2px)` | `--dur-2` | `--ease-standard` |
| Toast enter/exit | `opacity`, `translateY(8px)` | `--dur-3` | `--ease-out` / `--ease-in` |
| Modal | `opacity` + `scale(.98→1)`; scrim `opacity` | `--dur-4` | `--ease-emph` |
| Bottom sheet | `translateY(100%→0)` | `--dur-4` | `--ease-emph` |
| Progress bar fill | `width` | `--dur-3` | `--ease-standard` |
| Route change (product only) | `opacity` crossfade | `--dur-4` | `linear` |
| Hero mosaic first paint | `opacity 0→1` | `--dur-5` | `--ease-out` |

### 5.3 What must NOT animate — enforced, not requested

```css
/* Nothing inside a stage moves. Ever. Not a hover, not a fade, not a caret blink. */
.stage, .stage *,
[data-stage] .stage-field, [data-stage] .stage-field * {
  animation: none !important;
  transition: none !important;
  transform: none !important;
  will-change: auto !important;
}
```

Also banned globally:
- Any ambient/looping animation anywhere in the product (the old build's `pulse` countdown and
  `slide-in` score are both deleted).
- Parallax, scroll-jacking, scroll-linked transforms.
- Skeleton shimmer. Tests are generated locally in single-digit milliseconds; if something is
  genuinely slow, show a static `--text-muted` line of text.
- Number count-up on results. A result is a measurement, not a reveal.
- Any transition on `color` for text inside `.prose` (it causes perceptible flicker for readers
  using magnification).

Stage transitions between trials: the plate/optotype is swapped with **zero** transition. A
cross-fade between two plates creates a transient blended image that is a genuine confound.

### 5.4 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
  /* keep the one cue that carries meaning, at the cheapest possible cost */
  .toast, .modal { transition: opacity 100ms linear !important; }
}
```

Behavioural, not just CSS:
- The hero mosaic renders its **final frame immediately**; the 560 ms fade is skipped. The
  deficiency scrub still works — it is user-driven, not ambient.
- The 20-20-20 break timer swaps its sweeping ring for a static ring plus a numeric readout that
  updates once per second, and the completion cue becomes a text change plus an optional sound,
  never a flash. **Nothing in Fovea ever flashes** — flashing is a seizure risk and is
  categorically out of place in a vision app.
- Toasts do not slide; they appear and disappear.

---

## 6. Layout and information architecture

### 6.1 The shell — hub and spoke, with a hard mode boundary

Fovea has **two shells**, and moving between them is a deliberate, visible transition. This is
the central IA decision: persistent navigation during a vision test is a defect.

```
┌─ PRODUCT SHELL ──────────────────────────────────────────────┐
│  [◉ fovea]   Tests   Simulator   Tools   My results     [☀]  │  56px top bar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   #/            Landing — the mosaic hero                    │
│   #/tests       Suite index — the card grid                  │
│   #/simulator   Colour vision simulator                      │
│   #/tools       Break timer, calibration                     │
│   #/results     Session results across all tests             │
│   #/report      Printable / exportable summary               │
│   #/about       Method, limits, sources, licence             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                            │  entering a test replaces the shell
                            ▼
┌─ STAGE SHELL ────────────────────────────────────────────────┐
│ ✕ Exit    Ishihara plates              7 / 14           ⚙    │  48px strip
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                     [ THE TARGET ]                           │  the field
│                  ≥96px clear on all sides                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│        [ 5 ] [ 8 ] [ 3 ] [ Nothing ]     [ Skip ]            │  answer bar
└──────────────────────────────────────────────────────────────┘
```

**Stage shell rules**
- No logo, no nav, no theme toggle, no footer, no accent colour.
- The strip is 48 px, sits on `--stage-field`, and carries only: exit, test name, step counter,
  display-settings gear.
- Exit is `✕` + the word "Exit", top-left; `Escape` also exits and always asks for confirmation
  mid-test ("Leave the test? Your answers so far are kept.").
- The step counter is JetBrains Mono, tabular, `--fs--1`, `7 / 14`. It is a *count*, never a
  score and never a percentage.
- Entering the stage sets `data-stage`, locks `data-theme`, and hides the product shell entirely
  (`display:none`, not opacity) so no stray pixel of chrome renders.

**Navigation pattern recommendation:** top bar + hub-and-spoke, not a sidebar and not a wizard.
- A sidebar wastes horizontal room the stage needs and implies parallel tasks; tests are serial.
- A forced wizard through all eight tests is wrong: people arrive for *one* test. The suite is a
  menu, and completing several builds a report as a by-product, never as a requirement.
- Between-test flow is always **Test → its own result → back to the suite**, with the suite card
  now marked "Done · 14/14 seen". Never auto-advance into the next test.

### 6.2 Grid and containers

```css
--container-max:   1160px;   /* product content            */
--container-prose:  68ch;    /* reading measure            */
--container-wide:  1440px;   /* landing hero, simulator    */
--gutter:  var(--sp-5);      /* 24px, 20px below md        */
```

| Range | Name | Columns | Gutter | Container padding |
|---|---|---|---|---|
| 0–479 | `xs` | 4 | 16px | 20px |
| 480–767 | `sm` | 6 | 20px | 24px |
| 768–1023 | `md` | 12 | 24px | 32px |
| 1024–1359 | `lg` | 12 | 24px | 40px |
| 1360+ | `xl` | 12 | 32px | 48px |

```css
@custom-media --sm (min-width: 480px);
@custom-media --md (min-width: 768px);
@custom-media --lg (min-width: 1024px);
@custom-media --xl (min-width: 1360px);
```

Suite grid: `repeat(auto-fill, minmax(288px, 1fr))` with `gap: var(--sp-5)` → 1 column at `xs`,
2 at `sm`/`md`, 3 at `lg`, 4 at `xl`. Cards keep a consistent height via `grid-auto-rows: 1fr`.

### 6.3 Stage layout

```css
.stage {
  display: grid;
  grid-template-rows: 48px 1fr auto;
  min-height: 100svh;              /* svh, so mobile URL bars can't crop the target */
  background: var(--stage-field);
}
.stage-field {
  display: grid; place-items: center;
  padding: var(--sp-9);            /* 96px quiet zone   */
}
@media (max-width: 767px) { .stage-field { padding: var(--sp-7); } } /* 48px */
```

Orientation: for acuity and Amsler, lock guidance to landscape on phones ("Turn your phone
sideways for a wider chart") but never hard-block portrait — blocking is worse than a smaller
chart.

---

## 7. Component specifications

Shared control heights:

```css
--ctl-sm: 32px;   --ctl-md: 40px;   --ctl-lg: 48px;   --ctl-xl: 56px;
--tap-min: 44px;  /* every interactive target, including on desktop */
```

### 7.1 Focus — one definition, used by everything

```css
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: inherit;
}
[data-contrast="high"] :focus-visible { outline-width: 4px; outline-offset: 3px; }
[data-stage] :focus-visible { outline-color: var(--stage-ink); }   /* achromatic on stage */
```

The 2 px offset means the ring always sits on the *page ground*, never on a filled button, so its
contrast is the value in the tables (4.32:1 light, 9.29:1 dark) regardless of what it surrounds.
**Focus is distinguished by form, not hue** — the ring is a shape that exists in no other state,
so it reads for a dichromat identically to a trichromat. `:focus-visible` only; never `:focus`,
never `outline: none` without a replacement.

### 7.2 Button

**Anatomy:** `[optional leading icon 20px] [label] [optional trailing icon 20px]`, `gap: --sp-2`,
`border-radius: --r-md`, `font: --font-ui / --fs-0 / wght 560`, `padding-inline: --sp-4` (`--sp-5`
at `lg` size), single line, `white-space: nowrap`.

| Size | Height | Padding-x | Font | Icon | Use |
|---|---|---|---|---|---|
| `sm` | 32px | 12px | `--fs--1` | 16px | Table row actions, toast action |
| `md` | 40px | 16px | `--fs-0` | 20px | Default |
| `lg` | 48px | 24px | `--fs-0` | 20px | Primary page action |
| `xl` | 56px | 32px | `--fs-1` | 24px | "Start test" on a test's intro screen |

`sm` buttons must sit inside a 44 px tap area (use padding on the wrapper, not the button).

| Variant | Default | Hover | Focus-visible | Active | Disabled |
|---|---|---|---|---|---|
| **Primary** | bg `--accent`, text `--text-on-accent` (5.84:1 light / 10.02:1 dark), border none | bg `--accent-hover` | + focus ring | bg `--accent-hover`, `translateY(1px)` | bg `--border-default`, text `--text-muted`, `cursor: not-allowed`, `opacity` untouched |
| **Secondary** | bg `--surface-card`, text `--text-primary`, border `--control` (3.58:1) | bg `--surface-sunken`, border `--border-strong` | + focus ring | bg `--surface-sunken`, `translateY(1px)` | text `--text-muted`, border `--border-default` |
| **Ghost** | transparent, text `--accent` (5.32:1 on page), no border | bg `--accent-subtle` | + focus ring | bg `--accent-subtle`, `translateY(1px)` | text `--text-muted` |
| **Ghost-neutral** | transparent, text `--text-secondary` | bg `--surface-sunken` | + focus ring | as hover + `translateY(1px)` | text `--text-muted` |

Rules:
- **Never disable a submit button silently.** If the answer is required, keep it enabled and
  explain on activation. Disabled buttons are invisible to many screen-reader flows.
- Destructive actions ("Clear all results") use **Secondary** styling plus a confirmation modal —
  not a red button. There is exactly one red button in Fovea: none.
- Loading state: label stays, a 16 px spinner replaces the leading icon, `aria-busy="true"`,
  width is locked to prevent reflow.
- Inside a stage, only **Ghost-neutral** and **Secondary** exist, recoloured to `--stage-ink` /
  `--stage-chip`.

### 7.3 Test card (suite grid)

**Anatomy** (top to bottom, `padding: --sp-5`, `gap: --sp-3`):

```
┌──────────────────────────────────────────┐
│ ┌────┐                       ┌─────────┐ │  icon 40×40 in a --r-sm well
│ │ ◉  │                       │ ✓ Done  │ │  status chip, top-right
│ └────┘                       └─────────┘ │
│                                          │
│ Colour vision                            │  eyebrow, --fs--1 uppercase
│ Ishihara plates                          │  title, --fs-2, wght 620
│ Fourteen procedurally generated plates   │  --font-read, --fs-0, --text-secondary
│ screening for red-green deficiency.      │  clamped to 2 lines
│                                          │
│ ─────────────────────────────────────────│  --hairline
│ ⏱ ~3 min   ◇ Needs calibration           │  --fs--1, --text-muted, icon+label
└──────────────────────────────────────────┘
```

- Size: `min-width 288px`, `border-radius --r-lg`, `border --edge`, `background --surface-card`,
  `--elev-0`.
- Whole card is the target: a stretched-link pattern (`a::after { position:absolute; inset:0 }`)
  so the accessible name is the title, not "click here".
- **States**

| State | Treatment |
|---|---|
| Default | `--edge`, `--elev-0` |
| Hover | `border-color: --border-control`, `--elev-2`, `translateY(-2px)`, icon well fills `--accent-subtle`, `--dur-2` |
| Focus-visible | ring per §7.1 on the card, no transform |
| Active | `translateY(0)`, `--elev-1` |
| Completed | status chip `✓ Done · 14/14` on `--accent-subtle` with `--accent-border`; card body unchanged (do **not** dim a completed card) |
| Needs calibration | footer meta shows `◇ Needs calibration` in `--attention`; clicking opens the calibration sheet first |
| Unavailable (e.g. no camera) | `--surface-sunken` background, `--text-muted` copy, footer states the reason in words |

- The icon well is 40×40, `--r-sm`, `background --surface-sunken`, icon 24 px at
  `--text-secondary`. Each test has a distinct icon (§10) — **the icon, not colour, identifies
  the test.** All test cards use identical colour.

### 7.4 Progress indicator (multi-step test)

Two forms, chosen by step count.

**A. Step dots — ≤ 20 steps.** Lives in the stage strip, right of the counter.
- Each dot 8 px, `--r-full`, gap 6 px, in a `role="group" aria-label="Progress"` container.
- Answered: filled `--stage-ink`. Current: 8 px ring, 2 px `--stage-ink`, unfilled centre, plus
  a **10 px width** (a slightly wider capsule) so position is legible without colour. Unanswered:
  filled `--n-350`. Skipped: filled `--n-350` with a 1 px `--stage-ink` diagonal slash.
- Four states, four *shapes*. No hue anywhere.
- Screen readers get the text form only: `<span class="sr-only">Plate 7 of 14</span>`.

**B. Bar — > 20 steps or continuous (contrast staircase).**
- Height 4 px, `--r-full`, track `--n-350`, fill `--stage-ink`, `transition: width --dur-3`.
- Always accompanied by the tabular text counter; the bar alone is never the only indicator.
- `role="progressbar"` with `aria-valuenow/min/max` and `aria-valuetext="Plate 7 of 14"`.

Never show a percentage. Never show a score during a test.

### 7.5 Choice chips (the answer input)

The primary answer control for Ishihara, duochrome, astigmatism, and Landolt orientation.

**Anatomy:** `min-height 56px`, `min-width 56px`, `padding: 0 --sp-4`, `--r-md`,
`font --font-ui / --fs-1 / wght 600`, `border 2px solid`. For numeric answers the glyph is
centred and the chip is square (56×56).

| State | Stage (`neutral`) | Product |
|---|---|---|
| Default | bg `--stage-chip` #E0E0E0, border `--n-350`, text `--stage-ink` (15.00:1) | bg `--surface-card`, border `--border-control`, text `--text-primary` |
| Hover | bg `--n-750` #BFBFBF, border `--n-200` | bg `--surface-sunken`, border `--border-strong` |
| Focus-visible | ring per §7.1, colour `--stage-ink` | ring `--focus-ring` |
| Selected | border 2px `--n-050`, bg `--n-880`, **plus a 16 px `check` icon** in the top-right corner and `aria-pressed="true"` | border 2px `--accent`, bg `--accent-subtle`, `check` icon |
| Disabled | bg `--n-750`, text `--n-350`, no border | bg `--surface-sunken`, text `--text-muted` |

- Selection is carried by **border weight + an icon + `aria-pressed`**. Under `data-stage="neutral"`
  it is carried by those alone, since there is no colour available at all — which is exactly why
  the pattern is built this way everywhere.
- Always include a `Nothing / I can't see a figure` chip. Forcing a guess destroys the data.
  It is the same size as the others and is never styled as a lesser option.
- Keyboard: chips are a roving-tabindex radio group. `←/→/↑/↓` move, `Space`/`Enter` select,
  `1–9` select by position, `N` selects "Nothing", `S` skips. Show the shortcuts in the `⚙` sheet.
- Chip row: `flex-wrap`, `gap --sp-3`, centred, pinned ≥ 96 px below the target.

### 7.6 Result card

**Anatomy:**

```
┌──────────────────────────────────────────────────────────┐
│ COLOUR VISION · ISHIHARA PLATES        27 Aug 2026 14:02 │ eyebrow + timestamp
│                                                          │
│  ⚠  Follow-up suggested                                  │ icon 28px + --fs-3
│                                                          │
│  Twelve of fourteen plates were read as expected. The    │ --font-read --fs-1
│  two that were not are both on the red-green axis. This  │ max 68ch
│  pattern is consistent with a mild deuteranomaly.        │
│                                                          │
│  ┌────────────┬────────────┬────────────┐                │
│  │ 12/14      │ 0 / 4      │ 6 s        │                │ metric row
│  │ PLATES OK  │ TRITAN     │ MEDIAN     │                │ --font-data --fs-4
│  └────────────┴────────────┴────────────┘                │ label --fs--2 upper
│                                                          │
│  ────────────────────────────────────────────────────────│
│  Fovea is a screening tool, not a diagnosis. Only an eye │ --fs-0 --text-secondary
│  care professional can diagnose a colour vision          │
│  deficiency. → Find an optometrist                       │
│                                                          │
│  [ Retake test ]  [ See all results ]        [ ⬇ Report ]│
└──────────────────────────────────────────────────────────┘
```

- Container: `--surface-card`, `--r-lg`, `--edge`, `padding --sp-6`, `--elev-1`.
- **Status band:** a 4 px bar along the *left* edge in `--accent` (typical) / `--attention`
  (follow-up) / `--border-strong` (inconclusive), and the icon+word headline. The bar is
  reinforcement; the icon and the word are the message.
- Headline vocabulary, fixed, no variants: `Typical` · `Follow-up suggested` · `Inconclusive`.
  Never "Passed", "Failed", "You are colourblind", "Perfect score".
- Tone rules for the narrative paragraph: state what was observed, then what it is consistent
  with, then what it is not. Present tense, no second-person accusation. "Two plates were not
  read as expected" — not "you failed two plates".
- The disclaimer is **part of the card**, not a footnote, and uses `--attention-subtle` only when
  the status is follow-up; otherwise it is plain `--text-secondary` on the card. It is never red.
- Metrics use `--font-data`, `--fs-4`, `tabular-nums`, with `--fs--2` uppercase labels beneath.
- Confidence: if fewer than 8 plates were answered, or calibration is missing, the card shows
  `Inconclusive` with a `minus` icon and a one-line reason. Fovea reports uncertainty rather than
  guessing.

### 7.7 Modal and bottom sheet

One component, two presentations by breakpoint.

- **≥ md — centred modal.** `max-width 560px` (`720px` for the calibration flow),
  `border-radius --r-xl`, `background --surface-raised`, `--elev-3`, `padding --sp-6`.
  Scrim `rgba(13,20,22,.48)` light / `rgba(0,0,0,.64)` dark, no blur.
- **< md — bottom sheet.** Full width, `border-radius --r-xl --r-xl 0 0`,
  `max-height 88svh`, a 40×4 px `--border-strong` grab handle at `--sp-3` from the top,
  content scrolls, actions pinned to the bottom with a `--hairline` above.
- **Anatomy:** header (`--fs-2` title + `✕` 40 px ghost button) / body / footer (actions right-
  aligned at `md`+, full-width stacked below, primary on top when stacked).
- **Behaviour:** `<dialog>` with `showModal()` for free focus trapping and top-layer stacking.
  Focus moves to the first interactive element, or the title if none. `Escape` closes. Focus
  returns to the trigger. `inert` on the background. Body scroll locked with
  `overflow: hidden` + a scrollbar-gutter compensation so the page does not jump.
- Motion: scrim `opacity` and panel `opacity` + `scale(.98→1)` over `--dur-4` `--ease-emph`;
  sheet `translateY(100%→0)`.
- **A modal may never open while a stage is live**, with one exception: the exit-confirmation
  dialog. Everything else queues until the test ends.

### 7.8 Toast

- Position: bottom-centre at `xs`/`sm`, bottom-right at `md`+, `--sp-5` from the edges.
- Size: `min-height 48px`, `max-width 420px`, `padding --sp-3 --sp-4`, `--r-md`,
  `background --surface-raised`, `border --edge`, `--elev-2`.
- Anatomy: `[status icon 20px] [message --fs-0] [optional text button sm] [✕ 32px]`.
- Status is icon + wording, not fill colour. The whole toast keeps a neutral background; only the
  icon takes `--accent` / `--attention` / `--critical`.
- Duration: 5 s default, 8 s if it has an action, **never auto-dismissing** if it reports a
  failure the user must act on. Hovering or focusing pauses the timer.
- `role="status"` `aria-live="polite"` for confirmations; `role="alert"` `aria-live="assertive"`
  reserved for genuine failures. Max 3 stacked; older ones are dropped, newest at the bottom.
- **Suppressed entirely while a stage is live.** Queue and show on exit.

### 7.9 Toggle / switch

For binary settings that apply immediately (theme, high contrast, sound cue).

- Track 44×24, `--r-full`. Thumb 20 px, `--r-full`, `--surface-raised`, `--elev-1`,
  2 px inset from the track.
- Off: track `--border-strong` (2.26:1 vs page — acceptable because the *thumb position* carries
  the state, not the track colour). On: track `--accent`.
- **Position is the state.** Additionally, render a 2 px `--text-on-accent` check mark inside the
  thumb when on, and a 2 px dash when off, so the state survives at any colour vision.
- Thumb travel: `transform: translateX(20px)` over `--dur-2` `--ease-standard`.
- Label sits to the *left*, `--fs-0`, and is part of the same `<label>`. Tap target spans the
  whole row, `min-height 44px`.
- Focus ring on the track. Disabled: track `--border-default`, thumb `--surface-sunken`, no shadow.
- Markup: `<button role="switch" aria-checked>`, never a styled checkbox — `role="switch"`
  announces "on/off" rather than "checked".

### 7.10 Slider

Used for: simulator severity, contrast staircase manual mode, break-timer interval, and the hero
deficiency scrub.

- Track 6 px, `--r-full`, `--surface-sunken` with a 1 px inset `--border-default`.
- Fill (origin → thumb) `--accent`, 6 px.
- Thumb 24 px, `--r-full`, `--surface-raised`, `border 2px solid --accent`, `--elev-1`.
  Hit area 44×44 via a transparent pseudo-element.
- Hover: thumb border `--accent-hover`, `--elev-2`. Active: thumb scales to 28 px over `--dur-1`.
- Focus-visible: ring per §7.1 around the thumb, plus a persistent value bubble above it.
- **A slider is never the only readout.** A `--font-data` `--fs-0` tabular value sits to the right
  of the track at all times (e.g. `Severity 62%`, `Interval 20 min`), and a text input is offered
  beside it for exact entry.
- Ticks: 2 px × 8 px `--border-strong` marks at named stops (0 / 25 / 50 / 75 / 100), labelled
  `--fs--2` uppercase.
- Keyboard: `←/→` step 1, `Shift+←/→` step 10, `Home`/`End` to bounds, `PageUp/Down` step 10.
- Native `<input type="range">` with a custom skin — the accessibility is free and correct.
- On the hero scrub, no `transition` on the thumb at all: it must track the pointer exactly.

### 7.11 Calibration widget — the credit card

The single most important non-test component. Everything metric depends on it.

**Anatomy**

```
   ┌───────────────────────────────────────────┐
   │  RULER  Calibrate your screen             │  eyebrow + --fs-2 title
   │                                           │
   │  Hold any bank card, ID card or transit   │  --font-read --fs-1
   │  card flat against the screen and drag    │
   │  the corner until the outline matches it. │
   │                                           │
   │   ┌─────────────────────────────────╮     │
   │   │                                 │     │  the outline: 2px dashed
   │   │                                 │     │  --border-control, r = 3.18mm
   │   │        85.60 × 53.98 mm         │     │  --font-data --fs--1 centred
   │   │                                 │◤    │  drag handle 32px bottom-right
   │   ╰─────────────────────────────────┘     │
   │        ├──────── drag ────────┤           │
   │                                           │
   │   ◂ ▬▬▬▬▬▬●▬▬▬▬▬▬▬▬ ▸    Width 341 px     │  slider fallback + readout
   │                          96.4 px / inch   │  --font-data --text-muted
   │                                           │
   │   [ Looks right ]      [ Skip for now ]   │
   └───────────────────────────────────────────┘
```

**Geometry and behaviour**
- Aspect ratio is **locked** at 85.60 / 53.98 = 1.58577. Only width is adjustable.
- Corner radius updates live to `3.18 × pxPerMm` px — when it is right, the outline's corners
  match the card's corners, which is a second, independent visual check.
- Range: 180 px – 900 px width. Default 341 px (≈ 96 CSS ppi, the spec-nominal value).
- Three synchronised inputs, all live: **drag the corner handle**, **the slider**, **arrow keys**
  (`←/→` ±1 px, `Shift` ±10 px) while the outline has focus.
- The outline is `2px dashed var(--border-control)`; **dashed, not solid**, so the card's own
  edge stays visible against it while the user compares.
- No card image, no photo of a card, no skeuomorphic card graphic — a filled rectangle would
  hide the physical card behind it.
- Below `sm`, the widget scrolls horizontally inside its own `overflow-x: auto` container rather
  than shrinking the target below its real size.

**Output and persistence**

```js
localStorage['fovea.calibration'] = JSON.stringify({
  pxPerMm: 3.9836,
  cssPpi: 101.2,
  method: 'card',                    // 'card' | 'default'
  screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
  savedAt: '2026-08-27T14:02:11Z'
});
```

Invalidate and re-prompt when `screen` no longer matches — moving to an external monitor
silently invalidates every acuity measurement, and the app must notice rather than lie.

**States**

| State | Treatment |
|---|---|
| Uncalibrated | Outline `--border-control` dashed; a `--attention-subtle` note: "Not calibrated — sizes are estimated." |
| Dragging | Outline `--accent`, handle `--elev-2`, live `--font-data` readout updates every frame |
| Handle focus-visible | Ring per §7.1 on the handle + a persistent `Width 341 px` bubble |
| Saved | Outline `--accent`, a `check` icon + "Calibrated — 101.2 px per inch", and a "Recalibrate" ghost button |
| Skipped | Falls back to `pxPerMm = 3.7795` (96 ppi). Every dependent result is then labelled `Estimated` in `--attention`, on the result card, in the report, everywhere. Never silently. |

**Viewing distance** is collected on the same screen: a numeric input in cm with presets
(`40 cm — reading` / `100 cm — desk` / `300 cm — across the room`) and one honest line: "Measure
it if you can. A guess here is the largest source of error in your result."

---

## 8. The hero — "The Mosaic"

### The idea

The landing screen is a rendering of **the foveal cone mosaic**: the actual hexagonal-ish packing
of L, M and S cones in the pit the product is named after. Latent inside it, readable only by
hue, is a numeral — an Ishihara plate hidden in a retina. A single slider labelled
**"See it the way a deuteranope does"** applies a live dichromacy transform. As you drag, the
numeral dissolves.

That is the entire product in one gesture, using the product's own subject matter, with nothing
invented for decoration. It is also honest: it does not simulate an experience for the viewer,
it shows them a transformation and names it.

### Construction — exact

**Geometry.** Poisson-disc (Bridson) sampling over the hero rect, with the minimum radius growing
with eccentricity, which reproduces the real fall-off in cone density away from the foveola:

```
r(d) = r0 × (1 + d / k)
r0 = 7px          (spacing at the foveola)
k  = 420px        (fall-off constant)
d  = distance from the focal point in px
```

Focal point sits at **62% of the hero width, 46% of its height** (right of centre, above the
optical middle — so the type block can occupy the left third without collision). Target count
≈ 2,400 discs on a 1440×760 hero; cap at 3,200. Disc drawn radius = `r(d) × 0.42`.

**Cone class assignment.**

```
L : 63%     M : 31%     S : 6%
```

with one anatomical rule that gives the centre its subtle warmth for free: **no S-cones within
90 px of the focal point** (the real foveola is tritanopic — there are no S-cones in the central
~0.35°). Assign by weighted random, reject S inside the radius and reroll.

**Colour — equal luminance, computed.**

```css
--cone-l: #BF8780;   /* Y = 0.2996 */
--cone-m: #759F7A;   /* Y = 0.2998 */
--cone-s: #8094C8;   /* Y = 0.2994 */
```

All three are matched to sRGB relative luminance **Y = 0.300 ± 0.02%**, so the mosaic has hue
texture but no luminance texture — the hidden numeral cannot be found by brightness, exactly as
in a real Ishihara plate. Per-disc luminance jitter of ±4% Y is applied independently of class.

A pleasing consequence worth keeping: the achromatic equivalent of Y = 0.300 is `#949494`, one
step from the test-mode field `#969696`. **The brand image and the test surround are the same
tone.** The landing page and the stage are the same grey with the colour put back in.

**The latent figure.** Render the numeral **6** (Ishihara's classic demonstration plate) at
~340 px cap height in Optician Sans into an offscreen mask. Discs whose centre falls inside the
mask are biased toward M (`L 20% / M 74% / S 6%`); outside, toward L (`L 74% / M 20% / S 6%`).
The figure is therefore carried purely along the red-green axis.

**The interaction.** One slider, 0–100%, `Severity 0%` → `Severity 100%`, label
`See it the way a deuteranope does`, with a small select for `Deuteranopia / Protanopia /
Tritanopia`. Apply the **Brettel–Viénot–Mollon** transform at the given severity.

Performance: precompute the three class colours *once per slider value* (there are only three
distinct source colours), then repaint by batching — `fillStyle` set three times, 2,400 `arc()`
calls, one `fill()` per class. That is well inside a frame at 60 fps on a phone. Store positions
and class once; never re-sample geometry on scrub.

**Copy on the hero**

```
eyebrow   OPEN SOURCE · RUNS ENTIRELY IN YOUR BROWSER
headline  Eight vision tests. No account, no upload, no server.
sub       Fovea generates every plate and chart on your own device.
          Nothing you see or answer ever leaves it.
actions   [ Start with colour vision ]   [ Browse all eight tests ]
caption   Above: the cone mosaic of a human fovea — about 2,400 photoreceptors,
          six percent of them blue-sensitive, none of those in the very centre.
          Drag to see it through a deuteranope's eyes.
```

The caption is doing real work: it teaches the anatomy, states the interaction, and quietly
establishes that this project knows its subject.

### Guard rails

- The mosaic is mounted **only on `#/`**. On any route change the canvas is destroyed
  (`canvas.width = 0`, RAF cancelled, handle nulled). It may never coexist with a stage.
- Entry: static render, then `opacity 0→1` over `--dur-5`. No auto-animation ever after that.
- `prefers-reduced-motion: reduce` → final frame drawn immediately, fade skipped, scrub retained.
- The canvas has `aria-hidden="true"` and a `role="img"` wrapper with the caption as its
  accessible description. It is never the only place a piece of information appears.
- Fallback: if the canvas context is unavailable, render a static WebP of the default state at
  `1440×760`, `< 90 KB`.

---

## 9. Logo and brand mark

### The mark — a Landolt C with a foveal contour inside it

The Landolt C is the international standard optotype: a ring with a gap, where the whole task is
"which way does the gap face". Inside its aperture, three contour rings compress toward a centre
dot — the cross-section profile of the foveal pit, which is literally a depression in the retina.

The mark therefore reads, correctly, as three things at once: **a vision test**, **a target /
reticle**, and **the fovea itself**.

### Construction — 24 × 24 grid

Landolt C proportions are fixed by standard: outer diameter 5 units, stroke 1 unit, gap 1 unit.
On a 24 grid with 2 units of padding, the outer diameter is 20 px, so **1 unit = 4 px**.

```
viewBox                0 0 24 24
centre                 (12, 12)

Landolt C
  path radius          8      (mid-stroke: outer 10, inner 6)
  stroke-width         4      (= 1 unit)
  gap half-angle       14.32°  →  endpoints (19.75, 10.02) and (19.75, 13.98)
  gap chord width      3.957px  (= 2 × 8 × sin 14.32°  ≈ 1 unit)
  gap orientation      facing right (0°), centred on the +x axis
  stroke-linecap       butt          ← square ends; a round cap breaks the standard

Foveal contour (inside the C's 6px-radius aperture)
  ring 1   r = 4.20   stroke-width 1
  ring 2   r = 2.60   stroke-width 1     (ratio ≈ 0.62 — spacing compresses inward)
  centre   r = 1.20   filled
```

The compressing radii are what make it read as a *pit* rather than a bullseye: even spacing
would be a target, accelerating spacing is a depression.

```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
  <!-- Landolt C: full circle minus a 28.65° gap on the +x axis -->
  <path d="M 19.75 10.02 A 8 8 0 1 1 19.75 13.98"
        stroke-width="4" stroke-linecap="butt"/>
  <circle cx="12" cy="12" r="4.20" stroke-width="1"/>
  <circle cx="12" cy="12" r="2.60" stroke-width="1"/>
  <circle cx="12" cy="12" r="1.20" fill="currentColor" stroke="none"/>
</svg>
```

**Sizes and simplification**

| Context | Size | Rendering |
|---|---|---|
| Favicon 16 / app 20 | 16–20px | Drop ring 2. Landolt C stroke 3.5, ring 1 at r 4.2 stroke 1.25, centre dot r 1.4. |
| Nav bar | 28px | Full mark |
| Landing lockup | 44px | Full mark |
| Print / report header | 32px | Full mark, `--text-primary` only |

**Colour**
- Default `currentColor`, so it inherits and works in both themes and in forced-colors mode.
- Brand lockup: the Landolt C in `--accent`, the contour rings and centre dot in `--text-primary`.
  Two colours maximum, never a gradient.
- **The mark never appears inside a stage.** In the report header and print stylesheet it is
  single-colour `--text-primary`.
- Monochrome is the primary form. If the mark only works in colour, it is not a mark.

### The wordmark

```css
.wordmark {
  font-family: var(--font-ui);              /* Archivo */
  font-variation-settings: "wght" 600, "wdth" 108;
  font-size: var(--fs-2);                   /* 26.94px at nav scale */
  letter-spacing: -0.005em;
  text-transform: lowercase;
  color: var(--text-primary);
}
```

Set **`fovea`**, lowercase. Rationale: the round lowercase `o` and `e` echo the mark's rings, and
lowercase reads as an instrument label rather than a corporate logotype. The slightly expanded
width (`wdth 108`) is the "instrument panel" voice from §3.4 — used here and on the landing
headline, nowhere else.

**Lockup:** mark and wordmark on a shared horizontal baseline, with the mark's centre aligned to
the wordmark's **x-height centre** (not the cap-height centre — the mark is a circle and needs
optical, not metric, alignment). Gap = 0.42 × mark height (at 28 px mark → 11.8 px). Mark height
= 1.05 × wordmark cap height.

Clear space on all sides = the mark's radius (0.5 × mark height). Nothing enters it.

**Never:** outline the wordmark, letterspace it wide, set it uppercase, place it on a coloured
plate, or add a tagline lock-up. The tagline lives in copy, not in the logo.

---

## 10. Iconography

### The recommendation

**Lucide** (`lucide.dev`, **ISC licence**, ~1,600 icons). Chosen because the geometry is drawn on
a strict 24×24 grid with consistent optical weight, the licence is unambiguously
commercial-and-redistribution safe, and — decisively for Fovea — it is distributed as plain SVG
paths, so the icons ship as an inline sprite with **zero JavaScript and zero network requests**.
A vision app must not have icons that arrive late or fail to arrive.

**Do not** ship the npm package, a webfont, or a runtime. Copy the ~24 needed paths into one
`<symbol>` sprite inlined at the top of `<body>`.

```html
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="..."/></symbol>
  <!-- ~24 symbols, ≈6 KB total, gzips to ≈2 KB -->
</svg>
```

```html
<svg class="icon" aria-hidden="true"><use href="#i-eye"/></svg>
```

```css
.icon {
  width: 1.25em; height: 1.25em;      /* scales with its text */
  fill: none; stroke: currentColor;
  stroke-width: 1.75;                 /* Lucide default 2 is soft at instrument scale */
  stroke-linecap: round; stroke-linejoin: round;   /* keep Lucide's own construction */
  flex: none; vertical-align: -0.15em;
}
.icon--lg { stroke-width: 1.5; }      /* ≥32px, thins optically */
.icon--sm { stroke-width: 2; }        /* ≤16px, thickens optically */
```

Keep Lucide's round caps and joins. Switching to butt/miter for an "instrument" feel breaks the
drawing — the icons were constructed with round terminals and re-capping them produces visible
artefacts at corners. The instrument register is carried by the stroke weight and the type, not
by the caps.

Sizes: 16 / 20 / 24 / 32 / 40 px. Nothing between. Icons are `aria-hidden="true"` and always
accompanied by a text label or an `aria-label` on the parent control — **never an icon-only
control without an accessible name**.

### The set — 24 icons

| # | Lucide slug | Fovea use |
|---|---|---|
| 1 | `arrow-left` | Back to suite; previous step |
| 2 | `x` | Exit test; close modal, sheet, toast |
| 3 | `check` | Chip selected; step answered; "Typical" result; calibration saved |
| 4 | `minus` | Skipped step; "Inconclusive" result |
| 5 | `chevron-right` | Advance; list-item affordance; breadcrumb |
| 6 | `eye` | Test the right eye / currently tested eye |
| 7 | `eye-off` | Cover this eye / occluded eye |
| 8 | `circle-dot` | **Ishihara plates** (test identity) |
| 9 | `type` | **Visual acuity** (test identity) |
| 10 | `grid-3x3` | **Amsler grid** (test identity) |
| 11 | `contrast` | **Contrast sensitivity** (test identity) |
| 12 | `sun-medium` | **Duochrome** (test identity); display brightness prompt |
| 13 | `asterisk` | **Astigmatism dial** (test identity — the radiating spokes) |
| 14 | `book-open` | **Near vision** (test identity) |
| 15 | `timer` | **20-20-20 break timer** (tool identity) |
| 16 | `palette` | **Colour vision simulator** (tool identity) |
| 17 | `image-up` | Upload an image to the simulator |
| 18 | `ruler` | Screen calibration; viewing distance |
| 19 | `monitor-check` | Calibration verified for this display |
| 20 | `settings-2` | Display & accessibility settings sheet |
| 21 | `info` | Method note; "what does this mean" |
| 22 | `triangle-alert` | "Follow-up suggested"; estimated-result warning |
| 23 | `file-text` | Results report |
| 24 | `download` | Export report (PDF / JSON) |
| 25 | `rotate-ccw` | Retake test |
| 26 | `keyboard` | Keyboard shortcuts help |

Icons 8–16 are **test identity** icons and carry a load no colour is allowed to carry: in the
suite grid every card is visually identical apart from its icon and its words. That is the
system's answer to "never encode meaning in hue alone", applied at the top level.

---

## 11. Accessibility conformance — the checklist that must pass

Target: **WCAG 2.2 Level AA**, with AAA text contrast wherever it costs nothing.

| SC | Requirement | How Fovea meets it |
|---|---|---|
| 1.4.1 Use of Colour | Colour is never the only carrier | Every status = icon + word + colour. Test identity = icon + name. Chip selection = border weight + `check` + `aria-pressed`. Step dots = four distinct *shapes*. §2.2, §7.3, §7.5, §7.4 |
| 1.4.3 Contrast (Min) | 4.5:1 text, 3:1 large | Full matrices in §2.3, §2.4, §2.5. Lowest shipping text pair is `--text-muted` at 4.50:1; the one sub-threshold combination (`--text-muted` on `--surface-sunken`, 4.14) is explicitly forbidden. |
| 1.4.11 Non-text Contrast | 3:1 for controls & state | `--border-control` 3.58:1 light / 3.39:1 dark. Focus ring 4.32:1 / 9.29:1. |
| 1.4.4 Resize Text | 200% without loss | Everything derives from `--fs-anchor`; `data-text="large"`/`"xlarge"` give +1 and +2 chart lines; no fixed-height text containers. |
| 1.4.12 Text Spacing | User overrides tolerated | No `!important` on line-height/letter-spacing; no fixed-height rows. |
| 2.1.1 / 2.1.2 Keyboard | Full operation, no traps | Every test is completable by keyboard alone. Chips are a roving-tabindex radio group with digit shortcuts. `<dialog>` handles trap + release. |
| 2.4.7 / 2.4.11 Focus | Visible, not obscured | 3 px ring, 2 px offset, `:focus-visible`; sticky headers use `scroll-padding-top: 72px`. |
| 2.4.13 Focus Appearance | Thick enough, contrasty enough | 3 px, ≥ 3:1 against the adjacent ground by construction (offset puts it on the page, not on the fill). |
| 2.3.1 Three Flashes | No flashing | Nothing in Fovea flashes. §5.3. |
| 2.5.8 Target Size (Min) | 24×24 minimum | `--tap-min: 44px` everywhere, well past the requirement. |
| 3.3.x Input | Clear labels, no traps | Every control has a visible label. No answer is ever required to proceed — "Nothing" and "Skip" always exist. |
| 2.2.1 Timing | Adjustable | No test is timed. The break timer is user-set and pausable. Toasts pause on hover/focus. |
| 2.3.3 Animation | Motion-triggered animation avoidable | §5.4 — reduced motion is honoured behaviourally, not just in CSS. |

**Additional, self-imposed:**
- The whole app is operable and legible **in greyscale**. Screenshot the suite, the stage and the
  results in greyscale as a release gate; anything that becomes ambiguous is a bug.
- Simulate protanopia, deuteranopia and tritanopia over every product screen (not the stages —
  the stages are already achromatic) as a release gate.
- The app must be usable at 320 px width and at 400% browser zoom.
- `prefers-contrast: more` maps to `data-contrast="high"` automatically on first load, and
  `forced-colors: active` drops every custom background.

---

## 12. Implementation notes

### File layout

```
/css
  tokens.css        §2 §3 §4 §5 — custom properties only, no selectors but :root
  base.css          reset, typography defaults, focus, .sr-only
  layout.css        containers, grid, product shell, stage shell
  components/*.css  one file per component in §7
  stage.css         [data-stage] overrides — loaded last, wins the cascade
/fonts              archivo.woff2, source-serif-4.woff2, jetbrains-mono.woff2,
                    optician-sans.woff2  + LICENSE-OFL.txt
/js
  router.js         hash routes, shell swap, canvas teardown
  calibration.js    §7.11
  optotype.js       §3.6 — sizing, Landolt C geometry, renderability guard
  plates.js         §2.5D — generation + the ΔE00 acceptance test
  hero-mosaic.js    §8
  simulate.js       Brettel–Viénot–Mollon, shared by hero and simulator
```

### Cascade discipline

Load order is `tokens → base → layout → components → stage`. `stage.css` is last and is the only
file permitted to use `!important` (for the motion ban in §5.3). Components are single-class
selectors (`.btn`, `.btn--primary`); no element selectors carry spacing, so a `.section` /
`.cta` collision cannot occur. Use `:where()` for base resets so component classes always win
without specificity escalation.

### Print stylesheet (the report)

`#/report` must print cleanly on A4/Letter: force the light palette, `--surface-page: #FFFFFF`,
drop the mark to single-colour, `page-break-inside: avoid` on every result card, expand every
collapsed method note, and print the calibration state and viewing distance in the header. A
printed Fovea report that omits "estimated — not calibrated" would be worse than no report.

### The three things a reviewer should check first

1. Put `data-stage="neutral"` on the root and confirm that **not one pixel of hue** renders
   anywhere on screen, including the focus ring, the scrollbar, and the selection highlight.
2. Set `prefers-reduced-motion: reduce` and confirm the hero draws its final frame at once, the
   break timer switches to numerals, and no `transition` remains on any stage element.
3. Screenshot the suite grid in greyscale and confirm every card is still distinguishable and
   every status still readable.
