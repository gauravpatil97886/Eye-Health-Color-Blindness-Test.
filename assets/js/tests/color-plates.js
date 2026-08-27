/**
 * Fovea — colour vision plate test: presentation logic and scoring.
 *
 * TWO THINGS THAT MATTER
 *
 *  1. THERE IS A DELIBERATE INCONCLUSIVE BAND. Between "typical" and
 *     "difference indicated" sits a gap where the honest output is that a plate
 *     test cannot tell. Collapsing it into a binary verdict is how a self-check
 *     starts making claims it cannot support.
 *
 *  2. THE DEMONSTRATION PLATE IS A CONTROL, not a question. Everyone reads it
 *     regardless of colour vision, so failing it means the task was
 *     misunderstood, the screen was not showing the plate, or the run was
 *     rushed — and the whole thing is void rather than scored.
 *
 * TYPE ATTRIBUTION comes from comparing miss rates across plates targeted at
 * each axis: someone who misses the protan-targeted plates but reads the
 * deutan-targeted ones fits a protan pattern. An earlier design used dedicated
 * two-figure "diagnostic" plates for this; they rendered as unreadable mush and
 * were removed. Miss-rate comparison needs no special plate and works.
 */

import { buildPlateSet } from '../plate/generator.js';

/**
 * The verdict is decided PER AXIS, not on the overall score.
 *
 * With plates balanced across protan, deutan and tritan, someone with a strong
 * single-axis deficiency misses only the plates on their own axis — about a
 * third of the set. Their overall ratio then lands mid-band and reads as
 * "inconclusive" even though the pattern is unmistakable: they missed every
 * plate on one axis and read every plate on the others. Averaging across axes
 * dilutes exactly the signal that matters.
 *
 * So a run is judged on its WORST axis. Missing most of one axis while reading
 * the rest is the signature of a colour vision difference, and it is far more
 * informative than the total.
 */
const AXIS_MISS_INDICATED = 0.60;   // most of one axis missed
const AXIS_MISS_TYPICAL = 0.25;     // at most the odd slip on any axis

export function createPlateSession({ count = 24, figureKind = 'digits', sessionSeed } = {}) {
  const plates = buildPlateSet({
    count,
    figureKind,
    sessionSeed: sessionSeed ?? `${Date.now()}-${Math.random()}`,
  });
  return { plates, responses: new Map() };
}

/**
 * @param {object} session
 * @param {string} plateId
 * @param {string|null} answer  what the user reported, or null for "can't tell"
 * @param {number} ms           time taken, for the record only
 */
export function recordResponse(session, plateId, answer, ms) {
  session.responses.set(plateId, {
    answer: answer == null ? null : String(answer).trim().toLowerCase(),
    ms,
  });
}

/**
 * Turn a completed session into a result.
 * @returns {object} a result object ready for the store and the report
 */
export function scorePlateSession(session) {
  const perPlate = [];
  const tally = {
    demonstration: { presented: 0, correct: 0 },
    vanishing: { presented: 0, correct: 0 },
  };
  const axisMisses = { protan: 0, deutan: 0, tritan: 0 };
  const axisPresented = { protan: 0, deutan: 0, tritan: 0 };

  for (const plate of session.plates) {
    const response = session.responses.get(plate.id) ?? { answer: null, ms: null };
    const given = response.answer;
    const expected = String(plate.figure).toLowerCase();

    let outcome;

    if (plate.plateClass === 'demonstration') {
      tally.demonstration.presented++;
      outcome = given === expected ? 'correct' : 'incorrect';
      if (outcome === 'correct') tally.demonstration.correct++;
    } else {
      tally.vanishing.presented++;
      axisPresented[plate.targets]++;
      outcome = given === expected ? 'correct' : 'missed';
      if (outcome === 'correct') tally.vanishing.correct++;
      else axisMisses[plate.targets]++;
    }

    perPlate.push({
      id: plate.id,
      plateClass: plate.plateClass,
      targets: plate.targets ?? null,
      expected: plate.figure,
      given: given ?? null,
      outcome,
      ms: response.ms ?? null,
    });
  }

  /* ------------------------------------------------------- the verdict */

  const controlPassed = tally.demonstration.presented === 0 || tally.demonstration.correct > 0;

  const scoreable = tally.vanishing.presented;
  const typicalResponses = tally.vanishing.correct;
  const ratio = scoreable > 0 ? typicalResponses / scoreable : 0;

  const axisRates = {
    protan: axisPresented.protan ? axisMisses.protan / axisPresented.protan : 0,
    deutan: axisPresented.deutan ? axisMisses.deutan / axisPresented.deutan : 0,
    tritan: axisPresented.tritan ? axisMisses.tritan / axisPresented.tritan : 0,
  };
  const worstAxisRate = Math.max(axisRates.protan, axisRates.deutan, axisRates.tritan);

  let verdict;
  if (!controlPassed) verdict = 'void';
  else if (worstAxisRate >= AXIS_MISS_INDICATED) verdict = 'difference-indicated';
  else if (worstAxisRate <= AXIS_MISS_TYPICAL) verdict = 'typical';
  else verdict = 'inconclusive';

  /* ---------------------------------------------------------- the axis */

  const axisEvidence = normaliseAxis(axisMisses, axisPresented);
  const axis = pickAxis(axisEvidence, verdict);

  return {
    testId: 'color-plates',
    eye: 'both',
    verdict,
    controlPassed,
    ratio,
    axisRates,
    worstAxisRate,
    counts: {
      scoreable,
      typicalResponses,
      ...tally,
    },
    axisEvidence,
    axis,
    severity: estimateSeverity(worstAxisRate, verdict),
    perPlate,
    summary: summarise(verdict, axis),
  };
}

function normaliseAxis(misses, presented) {
  // Miss RATE per axis, not raw count — the axes carry different plate counts.
  const rate = (k) => (presented[k] > 0 ? misses[k] / presented[k] : 0);
  const raw = { protan: rate('protan'), deutan: rate('deutan'), tritan: rate('tritan') };
  const total = raw.protan + raw.deutan + raw.tritan;
  if (total === 0) return { protan: 0, deutan: 0, tritan: 0 };
  return {
    protan: round3(raw.protan / total),
    deutan: round3(raw.deutan / total),
    tritan: round3(raw.tritan / total),
  };
}

const round3 = (v) => Math.round(v * 1000) / 1000;

function pickAxis(evidence, verdict) {
  if (verdict === 'typical' || verdict === 'void') return null;
  const entries = Object.entries(evidence).sort((a, b) => b[1] - a[1]);
  const [topName, topValue] = entries[0];
  const [, secondValue] = entries[1];

  // Without clear separation between the top two axes we cannot claim a type.
  if (topValue < 0.45 || topValue - secondValue < 0.12) {
    return { type: null, confidence: 'none', label: 'type not separable' };
  }
  const confidence = topValue - secondValue > 0.30 ? 'moderate' : 'low';
  return {
    type: topName,
    confidence,
    label: {
      protan: 'red-weak (protan-type)',
      deutan: 'green-weak (deutan-type)',
      tritan: 'blue-yellow (tritan-type)',
    }[topName],
  };
}

/**
 * Severity is reported as a coarse band and flagged low-confidence on purpose.
 * A plate test separates "likely a difference" from "likely not" far better
 * than it grades how strong that difference is.
 */
function estimateSeverity(worstAxisRate, verdict) {
  if (verdict !== 'difference-indicated') return null;
  const band = worstAxisRate >= 0.95 ? 'strong' : worstAxisRate >= 0.75 ? 'moderate' : 'slight';
  return {
    band,
    confidence: 'low',
    basis: 'share of plates missed on the affected axis',
  };
}

function summarise(verdict, axis) {
  switch (verdict) {
    case 'void': return 'Not completed';
    case 'typical': return 'No difference detected';
    case 'inconclusive': return 'Inconclusive';
    case 'difference-indicated':
      return axis?.type ? `Consistent with ${axis.label}` : 'Colour difference indicated';
    default: return '';
  }
}

/**
 * Result copy. Deliberately never says "you are", never names a condition as a
 * diagnosis, and always states what a typical result does NOT mean.
 */
export function interpret(result) {
  const base = {
    typical: {
      headline: 'This check did not detect a colour vision difference.',
      tone: 'ok',
      means: [
        'You read the plates the way someone with typical colour vision usually does.',
        'The common inherited red-green differences would most likely have shown up here.',
      ],
      notMeans: [
        'It does not mean your eyes are healthy — this test looks at colour discrimination and nothing else.',
        'It cannot rule out a mild difference, especially on an uncalibrated screen.',
        'Many serious eye conditions cause no symptoms at all until they are advanced, and none of them would appear here.',
      ],
    },
    'difference-indicated': {
      headline: 'Your responses are consistent with a colour vision difference.',
      tone: 'watch',
      means: [
        'You read several plates differently from the typical pattern.',
        'Inherited colour vision differences are lifelong, common, and not a disease.',
      ],
      notMeans: [
        'It is not a diagnosis. Only an eye care professional can confirm this.',
        'It cannot tell you how strong the difference is with any precision.',
        'A screen with night mode, a colour filter, or low brightness can produce this result on its own.',
      ],
    },
    inconclusive: {
      headline: 'This check could not reach a clear answer.',
      tone: 'info',
      means: [
        'Your answers fell between the typical and atypical patterns.',
        'This band exists on purpose — the honest answer here is that a plate test cannot tell.',
      ],
      notMeans: [
        'It does not mean something is wrong.',
        'It does not mean nothing is wrong either. If you have a reason to wonder, get it checked properly.',
      ],
    },
    void: {
      headline: 'This run could not be scored.',
      tone: 'info',
      means: ['The control plate — the one everyone can read — was not read correctly.'],
      notMeans: [
        'This usually means the plate was not visible, the instructions were misread, or the run was rushed.',
        'It says nothing at all about your colour vision. Please try again.',
      ],
    },
  }[result.verdict];

  return base;
}
