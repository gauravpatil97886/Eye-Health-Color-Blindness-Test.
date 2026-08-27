<div align="center">

<img src="assets/icons/favicon.svg" width="76" alt="">

# Fovea

**Open-source vision checks that run entirely in your browser.**

Colour vision · Visual acuity · Astigmatism · Central field · Perception games
<br>No account. No tracking. Nothing you do here is uploaded.

[**Try it →**](https://gauravpatil97886.github.io/Eye-Health-Color-Blindness-Test./)
&nbsp;·&nbsp; [Methodology](#methodology-what-makes-this-different)
&nbsp;·&nbsp; [Privacy](#privacy)
&nbsp;·&nbsp; [Contributing](#contributing)

<sub>MIT licensed · No dependencies · No build step · Works offline</sub>

</div>

---

> [!IMPORTANT]
> **Fovea is a screening tool, not a medical diagnosis.**
> It runs on a screen whose brightness and colour profile it cannot measure, in a room it
> cannot see. It can suggest that something is worth looking at. It cannot confirm or rule
> out anything, and it does not produce a spectacle prescription.
> **A clear result here is not reassurance** — several serious eye conditions cause no
> symptoms until they are advanced and would not appear in any test on this site.
> See an eye care professional about any concern with your vision.

---

## Why this exists

Most online eye tests are built to capture an email address or sell a product. Almost none
of them mention that a browser cannot read your screen's brightness, cannot detect a
blue-light filter, and usually has no idea how far away you are sitting — all of which
change the answer.

Fovea takes the opposite position. **State the conditions, refuse to render a stimulus the
screen cannot honestly draw, and say plainly when a result should not be trusted.** The
honest thing and the differentiating thing turn out to be the same thing.

---

## What's inside

### Vision checks

| Check | What it measures | What it cannot do |
|---|---|---|
| **Colour Vision** | Red-green and blue-yellow discrimination, plus which type of deficiency the pattern fits | Grade severity precisely, or detect disease that has begun to affect colour |
| **Central Field Grid** | Distortion, blur or gaps in central vision — where macular problems show first | Detect anything outside the central ~10° |
| **Astigmatism Dial** | Whether some orientations look sharper than others, and roughly along which axis | Give a cylinder power or a precise axis |
| **Visual Acuity** | The finest detail each eye resolves, in 6/6 and LogMAR | Measure your actual prescription — only a refraction can |
| **Contrast Sensitivity** | The faintest contrast you can still detect | Substitute for a chart under controlled luminance |
| **Near Vision** | Smallest print readable at 40 cm | Replace a reading prescription |
| **Red–Green Balance** | Whether letters look crisper on red or green | Mean much if you have a red-green deficiency — flagged automatically |
| **Hue Arrangement** | How cleanly you can order a hue circle | Match a calibrated physical cap test |

### Eye & brain games

**Find Your Blind Spot** · **Reaction Time** · **Stroop Test** · **Peripheral Awareness**

Real perceptual measurements, framed as what they are: interesting, shareable, and not a
statement about anyone's health.

### Tools

**Colour Vision Simulator** — see any image as someone with a deficiency does. Processed in
your browser; there is no upload endpoint.
**20-20-20 Timer** — a break reminder, with an honest note about how well the rule is
actually supported.

### The report

Every check feeds one printable report: your (optional) name, the date, per-eye findings,
**and the conditions the test ran under** — because a result without its conditions cannot
be interpreted. Save as PDF, or export the raw JSON.

---

## Methodology: what makes this different

### Plates are generated, never loaded

The old version of this project shipped ten JPEGs. That was wrong three ways: the answers
were literally the filenames (`images/45.webp` → "45"), the images were
reverse-image-searchable and memorisable, and clinical plates are not public domain.

Fovea draws every plate on a canvas at run time, with the figure randomised per session.

**How the colours are chosen.** A dichromat is missing one cone class, which collapses their
colour space to two dimensions. The set of colours that collapse to the same point forms a
line — a *confusion line* — and two colours on it are indistinguishable to that person while
being obvious to everyone else.

Most implementations derive that line from published copunctal points. Fovea derives it from
the **null space of the simulation it validates against**: the Brettel–Viénot–Mollon
transform is a rank-2 linear map in linear RGB, so its null space is exactly the set of
directions the deficiency cannot see. Deriving it this way makes the generator and its
validator provably consistent. Using published copunctal points instead left a residual
separation of up to 0.06 OKLab — meaning "hidden" figures were still faintly visible.

**On luminance.** A confusion line is *not* equiluminant, and cannot be made so: the line is
one-dimensional and the equiluminant plane is two-dimensional, so they meet at a point.
Real plates solve this with mottle, not with equal luminance — each palette scatters its
dots' lightness by 2.5× its own systematic luminance difference, which is what
*pseudoisochromatic* ("falsely of the same colour") actually means.

**Every plate is validated before display.** A plate whose figure is still separable to the
deficiency it targets, or readable from brightness alone, is worse than no plate — it
produces a confident wrong answer. The test suite asserts this over 8 randomised sessions.

### Scoring follows the clinical structure

Three things most web implementations get wrong, and Fovea doesn't:

1. **Hidden plates score inverted.** On a hidden plate, *reading* the figure is the atypical
   response. Marking it "correct" misclassifies people with typical colour vision.
2. **Type-identifying plates are excluded from the pass count.** They establish *which* type
   once a difference is indicated; folding them in double-counts the same evidence.
3. **There is a deliberate inconclusive band.** Between "typical" and "difference indicated"
   sits a gap where the honest output is *this test cannot tell*. Collapsing it into a binary
   verdict is where a screening tool starts making claims it cannot support.

### The screen resolution limit

A 6/6 optotype at 60 cm is under a millimetre tall, so its stroke lands on well under one
physical pixel on a typical laptop. **Any site reporting 6/6 under those conditions is
measuring its own anti-aliasing.**

Fovea computes what your screen and distance can actually render, and asks you to move back
rather than reporting a number it cannot draw:

| Display | Distance | Finest honest acuity |
|---|---|---|
| 96 dpi laptop | 60 cm | **6/15** |
| 96 dpi laptop | 2 m | 6/3.8 |
| Retina / phone | 60 cm | 6/7.5 |
| Retina / phone | 1 m | 6/3.8 |

### What cannot be checked at all

A web page cannot read screen brightness, and **cannot detect Night Shift, Night Light,
f.lux or an OS colour filter** — those are applied after the browser has finished drawing,
so reading pixels back reveals nothing. Anything claiming otherwise is measuring its own
output. Fovea asks instead, and records your answer alongside the result.

### Naming

Classic test names are used descriptively where they explain what something is modelled on,
never as feature names. Fovea is not affiliated with, endorsed by, or connected to Kanehara
Trading, the Isshinkai Foundation, X-Rite, Pantone, Precision Vision, Good-Lite, Richmond
Products or Lea-Test. All plates and optotypes here are generated by this software.

---

## Privacy

**Fovea has nowhere to send your data. There is no server.**

This is an architectural fact, not a policy promise:

- No accounts, no cookies, no analytics — not Google Analytics, not a privacy-friendly one,
  not a self-hosted one.
- No fonts, scripts or images loaded from another company.
- A `Content-Security-Policy` that structurally forbids contacting any other origin. Your
  browser enforces it; we don't have to be trusted.
- Results, calibration and preferences live in `localStorage` on your device only.
- The simulator processes your image in memory and never uploads it.

**Verify it yourself:** open your browser's network tab and use the whole site. You'll see
the initial file loads and nothing else.

The one thing outside our control is the host — GitHub Pages sees what any web host sees
when it serves you a file. We never receive those logs. If that matters, clone the repo and
open it locally, or install Fovea and use it offline.

---

## Accessibility

An app for people with vision impairments that is itself inaccessible is a self-refuting
product. Fovea targets **WCAG 2.2 AA** for all chrome, navigation, instructions and results.

- Every colour token pairing is contrast-tested **in CI, parsed from the stylesheet**, so a
  token cannot be edited without its contrast being checked.
- Status is never carried by hue alone — every badge pairs colour with an icon and a word.
- Full keyboard navigation; a focus ring that survives the mid-grey test field.
- Large-text and high-contrast modes as first-class settings.
- No timed stimuli by default (WCAG 2.2.1), and nothing on the site ever flashes.

**One documented exception:** the test stimuli themselves deliberately violate contrast
minimums, because low contrast *is the measurement*. That falls under the WCAG "essential"
exception, and it is written down rather than left unstated.

---

## Running locally

No build step, no dependencies, no bundler.

```bash
git clone https://github.com/gauravpatil97886/Eye-Health-Color-Blindness-Test.
cd Eye-Health-Color-Blindness-Test.
python3 -m http.server 8080     # or: npx serve, or any static server
```

Then open <http://localhost:8080>. `file://` will not work — ES modules need an origin.

```bash
npm test        # colour-science and contrast regression tests (no install needed)
```

The tests need Node 18+ and have no dependencies. `package.json` exists only so Node treats
the source as ES modules; the site itself is plain files served as-is.

---

## Architecture

```
index.html              app shell — icon sprite inlined, CSP, no inline script
sw.js                   offline precache; never touches another origin
assets/
  css/
    tokens.css          design tokens. Type scale steps by 0.1 log units —
                        the gap between two lines of a LogMAR acuity chart
    base.css            reset, typography, print stylesheet
    components.css      buttons, cards, badges, test-surface overrides
    app.css             screen-level styles
  js/
    core/               router · store · dom · a11y · prefs · calibration
    color/              convert.js (sRGB↔linear↔XYZ↔LMS↔OKLab, WCAG contrast)
                        cvd.js    (Brettel simulation, confusion lines)
    plate/              packing.js · glyph.js · generator.js
    tests/              registry.js, scoring, and one runner per check
    ui/                 mosaic.js (the hero), cards.js
    views/              one module per screen, lazily imported
test/                   contrast + plate-validity regression tests
docs/                   design system and research notes
```

**Design principles**

- **No brand colour on a test surface.** A tinted element beside a colour plate shifts its
  perceived hue through simultaneous contrast. Test surfaces are strictly achromatic and
  override the theme entirely — enforced by a unit test.
- **Nothing animates inside a measurement.** A transition between plates would cross-fade
  two stimuli into a third the observer should never have seen.
- **Results carry no good/bad colour axis.** A colour vision difference is a difference, not
  a failure. Red is reserved for system errors and banned from any result.

---

## Contributing

Corrections are welcome, **particularly from anyone with clinical training**. The content
here is written by a developer working from published sources, not by a clinician, and the
About page says so.

Especially valuable:

- Clinical review of the scoring thresholds and result wording
- Translations — Hindi and Marathi first
- The unbuilt runners: acuity, contrast, near vision, duochrome, hue arrangement, blind spot
- Accessibility testing with real assistive technology

Please don't send screenshots of your results — we don't want them.

---

## Licence

Code is **MIT**. Written content is **CC BY-SA 4.0**. See [LICENSE.md](LICENSE.md).

---

<div align="center">
<sub>

Built by **[Gaurav Patil](https://github.com/gauravpatil97886)**
<br>
Originally a college project from 2020, rebuilt from scratch in 2026.

</sub>
</div>
