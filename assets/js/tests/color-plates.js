/**
 * Fovea — colour vision plate test: presentation logic and scoring.
 *
 * The scoring follows the structure of the classic clinical rule rather than
 * the naive "count the right answers" that most web versions use. Three things
 * matter and are routinely got wrong:
 *
 *  1. HIDDEN PLATES SCORE INVERTED. On a hidden plate, reading the figure is
 *     the abnormal response. A scorer that marks it "correct" misclassifies
 *     people with typical colour vision.
 *
 *  2. DIAGNOSTIC PLATES ARE EXCLUDED FROM THE PASS COUNT. They establish which
 *     type once a deficiency is already indicated; folding them into the total
 *     double-counts the same evidence.
 *
 *  3. THERE IS A DELIBERATE INDETERMINATE BAND. The clinical rule leaves a gap
 *     between "typical" and "deficient" where the honest output is "this test
 *     cannot tell". Collapsing that gap into a binary verdict is how a
 *     screening tool starts making claims it cannot support.
 *
 * The demonstration plate is a control: everyone reads it regardless of colour
 * vision, so failing it means the user misunderstood the task, could not see
 * the screen, or was not really trying — and the whole run is void.
 */

import { buildPlateSet } from '../plate/generator.js';

/** Fractions taken from the clinical thresholds (17/21 and 13/21). */
const TYPICAL_AT_OR_ABOVE = 0.81;
const DEFICIENT_AT_OR_BELOW = 0.62;

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
    hidden: { presented: 0, readFigure: 0 },
    diagnostic: { presented: 0, protan: 0, deutan: 0, both: 0, neither: 0 },
  };
  const axisMisses = { protan: 0, deutan: 0, tritan: 0 };
  const axisPresented = { protan: 0, deutan: 0, tritan: 0 };

  for (const plate of session.plates) {
    const response = session.responses.get(plate.id) ?? { answer: null, ms: null };
    const given = response.answer;
    const expected = String(plate.figure).toLowerCase();
    const alt = plate.altFigure ? String(plate.altFigure).toLowerCase() : null;

    let outcome;

    switch (plate.plateClass) {
      case 'demonstration':
        tally.demonstration.presented++;
        outcome = given === expected ? 'correct' : 'incorrect';
        if (outcome === 'correct') tally.demonstration.correct++;
        break;

      case 'vanishing':
        tally.vanishing.presented++;
        axisPresented[plate.targets]++;
        outcome = given === expected ? 'correct' : 'missed';
        if (outcome === 'correct') tally.vanishing.correct++;
        else axisMisses[plate.targets]++;
        break;

      case 'hidden':
        // Inverted: reporting the figure is the atypical response.
        tally.hidden.presented++;
        outcome = given === expected ? 'read-hidden-figure' : 'saw-nothing';
        if (outcome === 'read-hidden-figure') {
          tally.hidden.readFigure++;
          axisMisses[plate.targets] += 0.5; // weaker evidence than a vanishing miss
          axisPresented[plate.targets] += 0.5;
        }
        break;

      case 'diagnostic':
        // primary is hidden along the protan line, so reading it implies deutan;
        // secondary is hidden along the deutan line, so reading it implies protan.
        tally.diagnostic.presented++;
        if (given === expected && given === alt) outcome = 'both';
        else if (given === expected) { tally.diagnostic.deutan++; outcome = 'deutan-consistent'; }
        else if (given === alt) { tally.diagnostic.protan++; outcome = 'protan-consistent'; }
        else if (given == null) { tally.diagnostic.neither++; outcome = 'no-answer'; }
        else { tally.diagnostic.neither++; outcome = 'other'; }
        break;

      default:
        outcome = 'unscored';
    }

    perPlate.push({
      id: plate.id,
      plateClass: plate.plateClass,
      targets: plate.targets ?? null,
      expected: plate.figure,
      alternate: plate.altFigure ?? null,
      given: given ?? null,
      outcome,
      ms: response.ms ?? null,
    });
  }

  /* ------------------------------------------------------- the verdict */

  const controlPassed = tally.demonstration.presented === 0 || tally.demonstration.correct > 0;

  const scoreable = tally.vanishing.presented + tally.hidden.presented;
  const typicalResponses = tally.vanishing.correct + (tally.hidden.presented - tally.hidden.readFigure);
  const ratio = scoreable > 0 ? typicalResponses / scoreable : 0;

  let verdict;
  if (!controlPassed) verdict = 'void';
  else if (ratio >= TYPICAL_AT_OR_ABOVE) verdict = 'typical';
  else if (ratio <= DEFICIENT_AT_OR_BELOW) verdict = 'difference-indicated';
  else verdict = 'inconclusive';

  /* ---------------------------------------------------------- the axis */

  const axisEvidence = normaliseAxis(axisMisses, axisPresented, tally.diagnostic);
  const axis = pickAxis(axisEvidence, verdict);

  return {
    testId: 'color-plates',
    eye: 'both',
    verdict,
    controlPassed,
    ratio,
    counts: {
      scoreable,
      typicalResponses,
      ...tally,
    },
    axisEvidence,
    axis,
    severity: estimateSeverity(ratio, verdict),
    perPlate,
    summary: summarise(verdict, axis),
  };
}

function normaliseAxis(misses, presented, diagnostic) {
  // Vanishing misses give a rate per axis; diagnostic plates give a direct vote.
  const rate = (k) => (presented[k] > 0 ? misses[k] / presented[k] : 0);
  const raw = {
    protan: rate('protan') + diagnostic.protan * 0.5,
    deutan: rate('deutan') + diagnostic.deutan * 0.5,
    tritan: rate('tritan'),
  };
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
function estimateSeverity(ratio, verdict) {
  if (verdict !== 'difference-indicated') return null;
  const band = ratio > 0.5 ? 'slight' : ratio > 0.3 ? 'moderate' : 'strong';
  return { band, confidence: 'low', basis: 'proportion of plates read as expected' };
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
