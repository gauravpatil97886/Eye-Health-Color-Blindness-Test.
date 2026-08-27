/**
 * Fovea — the test catalogue.
 *
 * NOTE ON WORDING: user-facing copy says "check", never "screening". Both the
 * FDA and the EU MDR treat "screening" as naming a regulated medical purpose,
 * and the intended use we write is what determines whether this is a medical
 * device. Nothing here may reference occupational fitness (aviation, rail,
 * marine, defence) for the same reason.
 *
 * One entry per module. `requires` drives the prerequisite gate, `eyes` drives
 * the eye-cover flow, and `order` fixes the sequence used by a full screening.
 *
 * That order is not arbitrary. Three constraints set it:
 *   - colour discrimination is the most fatigue- and adaptation-sensitive thing
 *     we measure, so it runs first, before any bright stimulus
 *   - a full-screen white acuity chart light-adapts the eye and transiently
 *     depresses contrast sensitivity, so contrast is measured BEFORE acuity
 *   - changing viewing distance is expensive, so distance changes are grouped
 *
 * NAMING: the classic plate test is referred to generically. "Ishihara" is a
 * live trademark of Kanehara and appears nowhere in a test name, heading, route
 * or logo — only once, referentially, in the Learn copy.
 */

export const TEST_KINDS = {
  SCREENING: 'screening',   // internal id only; user-facing copy says "check"
  PERCEPTION: 'perception', // measurable, but framed as a game, not a diagnosis
  TOOL: 'tool',             // utilities that measure nothing
};

export const TESTS = [
  {
    id: 'color-plates',
    kind: TEST_KINDS.SCREENING,
    order: 10,
    name: 'Colour Vision',
    tagline: 'Pseudoisochromatic plates',
    icon: 'palette',
    minutes: 3,
    eyes: 'both',
    requires: ['display-check'],
    measures: 'Red-green and blue-yellow discrimination, and which type of deficiency the pattern fits.',
    cannot: 'Grade severity precisely, or detect an eye disease that has begun to affect colour.',
    reportKey: 'colour',
  },
  {
    id: 'acuity',
    kind: TEST_KINDS.SCREENING,
    order: 40,
    name: 'Visual Acuity',
    tagline: 'How much detail you resolve',
    icon: 'target',
    minutes: 4,
    eyes: 'each',
    requires: ['screen-size', 'distance'],
    measures: 'The finest detail each eye can resolve, reported as 6/6, LogMAR and an indicative dioptre range.',
    cannot: 'Measure your actual spectacle prescription. Only a refraction can do that.',
    reportKey: 'acuity',
  },
  {
    id: 'contrast',
    kind: TEST_KINDS.SCREENING,
    order: 30,
    name: 'Contrast Sensitivity',
    tagline: 'Seeing faint edges',
    icon: 'contrast',
    minutes: 3,
    eyes: 'each',
    requires: ['screen-size', 'distance', 'display-check'],
    measures: 'The faintest contrast you can still detect — often affected before acuity is.',
    cannot: 'Substitute for a clinical chart under controlled luminance.',
    reportKey: 'contrast',
  },
  {
    id: 'astigmatism',
    kind: TEST_KINDS.SCREENING,
    order: 50,
    name: 'Astigmatism Dial',
    tagline: 'Are some lines darker?',
    icon: 'rays',
    minutes: 2,
    eyes: 'each',
    requires: ['distance'],
    measures: 'Whether some orientations look sharper or darker than others, and roughly along which axis.',
    cannot: 'Give a cylinder power or a precise axis.',
    reportKey: 'astigmatism',
  },
  {
    id: 'amsler',
    kind: TEST_KINDS.SCREENING,
    order: 80,
    name: 'Central Field Grid',
    tagline: 'Central vision check',
    icon: 'grid',
    minutes: 2,
    eyes: 'each',
    requires: [],
    measures: 'Distortion, blur or gaps in your central vision — the part a macular problem affects first.',
    cannot: 'Detect changes outside the central ~10 degrees.',
    reportKey: 'amsler',
    priority: true,
  },
  {
    id: 'near',
    kind: TEST_KINDS.SCREENING,
    order: 70,
    name: 'Near Vision',
    tagline: 'Reading range',
    icon: 'book',
    minutes: 2,
    eyes: 'each',
    requires: ['screen-size'],
    measures: 'The smallest print you can read comfortably at 40 cm, with an indicative reading add.',
    cannot: 'Replace a reading prescription.',
    reportKey: 'near',
  },
  {
    id: 'duochrome',
    kind: TEST_KINDS.SCREENING,
    order: 45,
    name: 'Red–Green Balance',
    tagline: 'Duochrome check',
    icon: 'contrast',
    minutes: 1,
    eyes: 'each',
    requires: ['distance', 'display-check'],
    measures: 'Whether letters look crisper on the red half or the green half, which hints at over- or under-correction.',
    cannot: 'Mean much if you have a red-green colour vision deficiency — we flag that automatically.',
    reportKey: 'duochrome',
  },
  {
    id: 'hue-arrangement',
    kind: TEST_KINDS.SCREENING,
    order: 20,
    name: 'Hue Arrangement',
    tagline: 'Put the colours in order',
    icon: 'layers',
    minutes: 4,
    eyes: 'both',
    requires: ['display-check'],
    measures: 'How cleanly you can order a hue circle — gives an axis and a severity estimate the plates cannot.',
    cannot: 'Match a calibrated physical cap test.',
    reportKey: 'hue',
  },
  {
    id: 'blindspot',
    kind: TEST_KINDS.PERCEPTION,
    order: 90,
    name: 'Find Your Blind Spot',
    tagline: 'The hole you never notice',
    icon: 'eye',
    minutes: 2,
    eyes: 'each',
    requires: ['screen-size', 'distance'],
    measures: 'Where your optic nerve leaves the retina — everyone has this gap, and your brain hides it.',
    cannot: 'Map a visual field defect. That needs perimetry.',
  },
  {
    id: 'reaction',
    kind: TEST_KINDS.PERCEPTION,
    order: 100,
    name: 'Reaction Time',
    tagline: 'How fast you respond to what you see',
    icon: 'timer',
    minutes: 2,
    eyes: 'both',
    requires: [],
    measures: 'Time from a stimulus appearing to your response, averaged over several trials.',
    cannot: 'Separate your eyes from your hands, your mouse, or your screen refresh rate.',
  },
  {
    id: 'stroop',
    kind: TEST_KINDS.PERCEPTION,
    order: 110,
    name: 'Stroop Test',
    tagline: 'When words fight colours',
    icon: 'layers',
    minutes: 3,
    eyes: 'both',
    requires: ['display-check'],
    measures: 'How much a mismatched colour word slows you down — a classic attention effect.',
    cannot: 'Mean anything if you have a colour vision deficiency. We check for that first.',
  },
  {
    id: 'peripheral',
    kind: TEST_KINDS.PERCEPTION,
    order: 120,
    name: 'Peripheral Awareness',
    tagline: 'Seeing without looking',
    icon: 'target',
    minutes: 3,
    eyes: 'both',
    requires: [],
    measures: 'How far from your point of focus you can still notice something appear.',
    cannot: 'Screen for glaucoma or any field loss.',
  },
];

export const TOOLS = [
  {
    id: 'simulator',
    kind: TEST_KINDS.TOOL,
    name: 'Colour Vision Simulator',
    tagline: 'See any image the way someone else does',
    icon: 'palette',
    route: '#/simulator',
  },
  {
    id: 'timer',
    kind: TEST_KINDS.TOOL,
    name: '20-20-20 Timer',
    tagline: 'A break reminder for screen work',
    icon: 'timer',
    route: '#/timer',
  },
];

export const byId = (id) => TESTS.find((t) => t.id === id) ?? null;

export const screeningTests = () =>
  TESTS.filter((t) => t.kind === TEST_KINDS.SCREENING).sort((a, b) => a.order - b.order);

export const perceptionTests = () =>
  TESTS.filter((t) => t.kind === TEST_KINDS.PERCEPTION).sort((a, b) => a.order - b.order);

/** The fixed order a full screening runs in. */
export const screeningOrder = () => screeningTests().map((t) => t.id);

export const REQUIREMENT_LABELS = {
  'screen-size': { label: 'Screen calibration', route: '#/calibrate/size', icon: 'ruler' },
  'distance': { label: 'Viewing distance', route: '#/calibrate/distance', icon: 'ruler' },
  'display-check': { label: 'Display check', route: '#/calibrate/display', icon: 'eye' },
};
