/**
 * Fovea — minimal hash router.
 *
 * Routes are declared as patterns with `:param` segments, e.g. "/test/:id".
 * A route handler receives { params, query, path } and returns (or resolves to)
 * an Element that becomes the view. Handlers may be async so a test module can
 * be code-split behind a dynamic import.
 */

const PARAM = /^:(.+)$/;

export class Router {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.outlet   element the view is rendered into
   * @param {string} [opts.fallback]    path to redirect to when nothing matches
   */
  constructor({ outlet, fallback = '/' }) {
    this.outlet = outlet;
    this.fallback = fallback;
    this.routes = [];
    this.guards = [];
    this.current = null;
    this._onHash = this._onHash.bind(this);
  }

  /**
   * @param {string} pattern e.g. "/test/:id/result"
   * @param {(ctx: RouteContext) => Element|Promise<Element>} handler
   * @param {object} [meta] arbitrary data (title, chrome mode, ...)
   */
  add(pattern, handler, meta = {}) {
    this.routes.push({
      pattern,
      segments: pattern.split('/').filter(Boolean),
      handler,
      meta,
    });
    return this;
  }

  /** Guards run before every navigation. Return a path string to redirect. */
  guard(fn) {
    this.guards.push(fn);
    return this;
  }

  start() {
    window.addEventListener('hashchange', this._onHash);
    this._onHash();
    return this;
  }

  stop() {
    window.removeEventListener('hashchange', this._onHash);
  }

  /** Programmatic navigation. `replace` avoids a history entry. */
  go(path, { replace = false } = {}) {
    const url = `#${path}`;
    if (replace) {
      history.replaceState(null, '', url);
      this._onHash();
    } else {
      window.location.hash = url.slice(1);
    }
  }

  back() {
    history.back();
  }

  _parse() {
    const raw = window.location.hash.slice(1) || '/';
    const [pathname, search = ''] = raw.split('?');
    return {
      path: pathname.startsWith('/') ? pathname : `/${pathname}`,
      query: Object.fromEntries(new URLSearchParams(search)),
    };
  }

  _match(path) {
    const parts = path.split('/').filter(Boolean);
    for (const route of this.routes) {
      if (route.segments.length !== parts.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < parts.length; i++) {
        const seg = route.segments[i];
        const m = seg.match(PARAM);
        if (m) params[m[1]] = decodeURIComponent(parts[i]);
        else if (seg !== parts[i]) { ok = false; break; }
      }
      if (ok) return { route, params };
    }
    return null;
  }

  async _onHash() {
    const { path, query } = this._parse();
    const matched = this._match(path);

    if (!matched) {
      if (path !== this.fallback) this.go(this.fallback, { replace: true });
      return;
    }

    const ctx = { path, query, params: matched.params, meta: matched.route.meta };

    for (const g of this.guards) {
      const redirect = await g(ctx);
      if (typeof redirect === 'string' && redirect !== path) {
        this.go(redirect, { replace: true });
        return;
      }
    }

    // Let the previous view release timers, rAF loops and listeners.
    if (this.current?.destroy) {
      try { this.current.destroy(); } catch (err) { console.error(err); }
    }

    const view = await matched.route.handler(ctx);
    this.current = view;

    this.outlet.replaceChildren(view.el ?? view);
    this.outlet.scrollTop = 0;
    window.scrollTo(0, 0);

    document.dispatchEvent(
      new CustomEvent('fovea:navigated', { detail: { ...ctx, view } })
    );
  }
}
