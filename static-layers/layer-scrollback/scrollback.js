  // sk-scrollback: new pages open at the top, but Back / Forward / reload return to where you were.
  (function () {
    var KEY = 'sk-scroll:', H = history, W = window;
    try { if ('scrollRestoration' in H) H.scrollRestoration = 'manual'; } catch (e) {}
    var here = function () { return KEY + location.pathname + location.search; };
    var save = function () { try { sessionStorage.setItem(here(), String(Math.round(W.scrollY || W.pageYOffset || 0))); } catch (e) {} };
    var navType = function () {
      try { var n = performance.getEntriesByType('navigation')[0]; if (n && n.type) return n.type; } catch (e) {}
      try { var t = performance.navigation.type; return t === 2 ? 'back_forward' : t === 1 ? 'reload' : 'navigate'; } catch (e) {}
      return 'navigate';
    };
    var saved = function () { try { var v = sessionStorage.getItem(here()); return v === null ? null : +v; } catch (e) { return null; } };
    // Content drawn by JS can make the page taller after load, so keep trying for a short while,
    // and stop as soon as the shopper scrolls on their own.
    var restore = function (y) {
      var stop = false, tries = 0;
      var quit = function () { stop = true; };
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { W.addEventListener(ev, quit, { once: true, passive: true }); });
      (function go() {
        if (stop) return;
        W.scrollTo(0, y);
        if (Math.abs((W.scrollY || 0) - y) < 2 && document.readyState === 'complete') return;
        if (++tries < 60) setTimeout(go, 50);
      })();
    };
    var type = navType();
    var start = function () {
      var y = saved();
      if ((type === 'back_forward' || type === 'reload') && y !== null) restore(y);
      else if (!location.hash) W.scrollTo(0, 0);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    // Page kept in the browser's back/forward cache: it already sits where it was, so leave it.
    W.addEventListener('pageshow', function (e) { if (e.persisted) { var y = saved(); if (y !== null && Math.abs((W.scrollY || 0) - y) > 2) W.scrollTo(0, y); } });
    var t = null;
    W.addEventListener('scroll', function () { if (t) return; t = setTimeout(function () { t = null; save(); }, 150); }, { passive: true });
    W.addEventListener('pagehide', save);
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href]')) save(); }, true);
  })();
