/**
 * Fovea — persistent state.
 *
 * Everything lives in localStorage under a single versioned key. There is no
 * backend and no analytics; this file is the only place that touches storage,
 * which makes the privacy claim in PRIVACY.md auditable in one screen of code.
 */

const KEY = 'fovea.v1';
const SCHEMA_VERSION = 1;

/** Cap history so a long-lived profile cannot grow without bound. */
const MAX_SESSIONS = 50;

const EMPTY = () => ({
  version: SCHEMA_VERSION,
  /** Identity is optional and only ever used to label an exported report. */
  profile: {
    name: '',
    ageBand: '',
    wearsCorrection: null, // true | false | null (not answered)
    createdAt: null,
  },
  calibration: {
    pxPerMm: null,
    viewingDistanceMm: null,
    calibratedAt: null,
  },
  prefs: {
    theme: 'system',      // 'system' | 'light' | 'dark'
    largeText: false,
    highContrast: false,
    reduceMotion: 'system',
    lang: 'en',
  },
  /** Newest first. */
  sessions: [],
  /** Conditions the user confirmed on the validity gate, per session. */
  lastChecklist: null,
});

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY();
    const parsed = JSON.parse(raw);
    if (parsed.version !== SCHEMA_VERSION) return migrate(parsed);
    // Merge over EMPTY so a key added in a later build is never undefined.
    return { ...EMPTY(), ...parsed, profile: { ...EMPTY().profile, ...parsed.profile },
             calibration: { ...EMPTY().calibration, ...parsed.calibration },
             prefs: { ...EMPTY().prefs, ...parsed.prefs } };
  } catch {
    // Private mode, disabled storage, or corrupted JSON — run stateless.
    return EMPTY();
  }
}

function migrate(old) {
  // Only one schema version exists so far; future migrations chain from here.
  const fresh = EMPTY();
  if (old && typeof old === 'object' && Array.isArray(old.sessions)) {
    fresh.sessions = old.sessions.slice(0, MAX_SESSIONS);
  }
  return fresh;
}

let state = read();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Storage full or blocked — the in-memory state still drives this session. */
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get() {
    return state;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** True when storage is actually writable (used to warn about private mode). */
  get available() {
    try {
      const probe = '__fovea_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  },

  setProfile(patch) {
    state.profile = { ...state.profile, ...patch };
    if (!state.profile.createdAt) state.profile.createdAt = new Date().toISOString();
    persist();
    return state.profile;
  },

  setCalibration({ pxPerMm, viewingDistanceMm }) {
    state.calibration = {
      pxPerMm: pxPerMm ?? state.calibration.pxPerMm,
      viewingDistanceMm: viewingDistanceMm ?? state.calibration.viewingDistanceMm,
      calibratedAt: new Date().toISOString(),
    };
    persist();
    return state.calibration;
  },

  get isCalibrated() {
    return Boolean(state.calibration.pxPerMm && state.calibration.viewingDistanceMm);
  },

  setPrefs(patch) {
    state.prefs = { ...state.prefs, ...patch };
    persist();
    return state.prefs;
  },

  setChecklist(checklist) {
    state.lastChecklist = { ...checklist, confirmedAt: new Date().toISOString() };
    persist();
  },

  /** Opens a screening session that one or more test results attach to. */
  startSession({ mode = 'single' } = {}) {
    const session = {
      id: cryptoId(),
      mode,                                  // 'single' | 'full'
      startedAt: new Date().toISOString(),
      completedAt: null,
      calibration: { ...state.calibration },
      checklist: state.lastChecklist,
      results: [],
    };
    state.sessions.unshift(session);
    state.sessions = state.sessions.slice(0, MAX_SESSIONS);
    persist();
    return session;
  },

  getSession(id) {
    return state.sessions.find((s) => s.id === id) ?? null;
  },

  get latestSession() {
    return state.sessions[0] ?? null;
  },

  /**
   * Attach a result. Re-running the same test on the same eye within a session
   * replaces the earlier attempt rather than stacking duplicates.
   */
  addResult(sessionId, result) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    const record = { ...result, recordedAt: new Date().toISOString() };
    const idx = session.results.findIndex(
      (r) => r.testId === record.testId && r.eye === record.eye
    );
    if (idx >= 0) session.results[idx] = record;
    else session.results.push(record);
    persist();
    return record;
  },

  completeSession(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    session.completedAt = new Date().toISOString();
    persist();
    return session;
  },

  deleteSession(sessionId) {
    state.sessions = state.sessions.filter((s) => s.id !== sessionId);
    persist();
  },

  /** Full export — the same payload the report screen offers as a download. */
  exportAll() {
    return JSON.parse(JSON.stringify(state));
  },

  /** Wipes everything. The settings screen exposes this. */
  clearAll() {
    state = EMPTY();
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    persist();
  },
};

function cryptoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(8);
  (globalThis.crypto ?? { getRandomValues: (a) => a.forEach((_, i) => (a[i] = (Math.random() * 256) | 0)) })
    .getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
