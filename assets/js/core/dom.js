/**
 * Fovea — tiny view helpers.
 *
 * Views are built in JS rather than templated, so we need one ergonomic
 * element factory. This is deliberately ~100 lines instead of a framework: the
 * app is a handful of screens and a lot of canvas, and a virtual DOM would earn
 * nothing here.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * h('div.card#main', { onclick, aria-label }, child, [children])
 *
 * The tag string accepts CSS-ish shorthand: `tag.class.class#id`.
 * Props: `on*` become listeners, `data`/`aria` objects expand to attributes,
 * `style` accepts an object, everything else becomes an attribute (or a
 * property when the key exists on the element, so `.value` and `.checked`
 * behave).
 */
export function h(tag, props = null, ...children) {
  const { name, classes, id } = parseTag(tag);
  const el = document.createElement(name);

  if (classes.length) el.classList.add(...classes);
  if (id) el.id = id;

  if (props && (typeof props !== 'object' || Array.isArray(props) || props instanceof Node)) {
    children.unshift(props);
    props = null;
  }

  if (props) applyProps(el, props);
  append(el, children);
  return el;
}

/** Same, for SVG — needs createElementNS or nothing renders. */
export function s(tag, props = null, ...children) {
  const { name, classes, id } = parseTag(tag);
  const el = document.createElementNS(SVG_NS, name);
  if (classes.length) el.setAttribute('class', classes.join(' '));
  if (id) el.setAttribute('id', id);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function parseTag(tag) {
  const [head, id] = tag.split('#');
  const [name, ...classes] = head.split('.');
  return { name: name || 'div', classes: classes.filter(Boolean), id };
}

function applyProps(el, props) {
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;

    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'class' || key === 'className') {
      el.classList.add(...String(value).split(/\s+/).filter(Boolean));
    } else if (key === 'dataset' || key === 'data') {
      Object.assign(el.dataset, value);
    } else if (key === 'aria' && typeof value === 'object') {
      for (const [a, v] of Object.entries(value)) {
        if (v != null) el.setAttribute(`aria-${a}`, String(v));
      }
    } else if (key === 'html') {
      el.innerHTML = value; // only ever called with strings we author
    } else if (key in el && key !== 'list' && key !== 'form') {
      // Direct property assignment, so `.value`, `.checked` and `.inert`
      // behave. NOTE: pass real booleans for boolean properties — `inert: ''`
      // assigns a falsy empty string and silently does nothing, where the
      // attribute form `inert=""` would have been true.
      el[key] = value;
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/* -------------------------------------------------------------- queries */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(el) {
  el.replaceChildren();
  return el;
}

/* ---------------------------------------------------------------- icons */

/** Inline sprite reference — the sprite is injected once in index.html. */
export function icon(name, { size = 20, label = null } = {}) {
  const svg = s('svg.icon', {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': label ? null : 'true',
    role: label ? 'img' : null,
    focusable: 'false',
  });
  if (label) svg.append(s('title', null, label));
  svg.append(s('use', { href: `#i-${name}` }));
  return svg;
}

/* ------------------------------------------------------------ lifecycle */

/**
 * Views return { el, destroy }. This collects teardown callbacks so a view can
 * register timers and listeners inline and still clean up on navigation.
 */
export function createView(el) {
  const teardown = [];
  return {
    el,
    /** @param {() => void} fn */
    onDestroy(fn) {
      teardown.push(fn);
      return this;
    },
    /** Auto-removed listener. */
    listen(target, type, handler, opts) {
      target.addEventListener(type, handler, opts);
      teardown.push(() => target.removeEventListener(type, handler, opts));
      return this;
    },
    /** Auto-cleared interval/timeout/rAF. */
    interval(fn, ms) {
      const id = setInterval(fn, ms);
      teardown.push(() => clearInterval(id));
      return id;
    },
    timeout(fn, ms) {
      const id = setTimeout(fn, ms);
      teardown.push(() => clearTimeout(id));
      return id;
    },
    raf(loop) {
      let id;
      let stopped = false;
      const tick = (t) => {
        if (stopped) return;
        loop(t);
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      teardown.push(() => { stopped = true; cancelAnimationFrame(id); });
      return () => { stopped = true; cancelAnimationFrame(id); };
    },
    destroy() {
      while (teardown.length) {
        try { teardown.pop()(); } catch (err) { console.error(err); }
      }
    },
  };
}

/* -------------------------------------------------------------- canvas */

/** Size a canvas for the device pixel ratio; returns the 2D context. */
export function fitCanvas(canvas, cssSize, { alpha = true } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  const ctx = canvas.getContext('2d', { alpha });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
