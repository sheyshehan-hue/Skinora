# layer-scrollback: keep your place when you go Back

The features layer (`sk-feat-js`) set `history.scrollRestoration = 'manual'` and scrolled to the top on
every `DOMContentLoaded` and `pageshow`, including Back / Forward. So after opening a product from a long
list and pressing Back, shoppers landed at the top of the list.

`scrollback.js` replaces that snippet inside `sk-feat-js`:
- A new page (link click, typed URL) still opens at the top, unless the URL has a `#section`.
- Back, Forward and reload return to the saved position for that URL. The position is saved in
  `sessionStorage` while scrolling, on link clicks and on `pagehide`.
- It keeps retrying for up to 3 seconds while JS-drawn content makes the page taller, and stops at once
  if the shopper scrolls, taps or presses a key.
- Pages restored from the browser's back/forward cache are left where they were.

Run last, after the other layers (it also fixes pages that later layers add, as long as they carry the
features script):

    python3 static-layers/layer-scrollback/build.py preview-site

Idempotent: a second run reports "already current"; after editing `scrollback.js`, a rerun refreshes it.
