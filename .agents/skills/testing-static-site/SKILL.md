---
name: testing-static-site
description: How to run and end-to-end test the manila-mail-manager-web static GitHub Pages site (docs/) locally in a browser — serving it, pixel-diffing against a baseline branch, animation/sprite-icon checks, the Paddle checkout page, and CSP verification.
---

# Testing the Manila Mail Manager website (docs/)

## Serving

Everything is static under `docs/` — no build step, no dependencies, no credentials.

```bash
cd docs && python3 -m http.server 8899
```

Then browse `http://localhost:8899/index.html`, `privacy.html`, `terms.html`, `support.html`,
`checkout.html`. Check the browser console on every page; a healthy run has zero errors and zero 404s.

## Devin Secrets Needed

None for local testing. A real Paddle client-side token (sandbox `test_...` or production
`live_...`) from the project owner is needed only to render a complete checkout form / payment flow.

## Pixel-diffing against a baseline branch

The most reliable way to prove a refactor is visually neutral is to serve both versions and diff
screenshots taken at the same scroll offset:

```bash
git worktree add /tmp/baseline main
cd /tmp/baseline/docs && python3 -m http.server 8900
```

Load each page on both ports, scroll the same number of clicks, screenshot, then:

```python
from PIL import Image, ImageChops
A = Image.open(a).convert('RGB').crop((0, 55, 1024, 730))  # crop out Chrome chrome + taskbar
B = Image.open(b).convert('RGB').crop((0, 55, 1024, 730))
print(ImageChops.difference(A, B).getbbox())
```

Expect a small residual diff around x≈235–262 near the top: that is the **port number text in the
address bar**, not page content. Zoom-crop it to confirm before reporting a real diff.

## Things that need explicit verification (they are easy to silently break)

Home-page behavior lives in `docs/assets/home.js` (inline in `index.html` before the asset
extraction landed):

- **Counters** (`.counter[data-target]`) animate to 47 / 68% / 2 hrs. Capture mid-animation
  (intermediate values like 19 / 28% / 1 hrs) — a screenshot of the final numbers does not prove
  the animation ran.
- **Hero roller** (`#hero-roller`) cycles values every 3 s from a fixed list; screenshot twice
  ~4 s apart and check the number changed.
- **Typing line** (`#typing-line`) cycles four phrases with a caret.
- **Scroll progress bar** (`#scroll-progress`) — zoom the top ~10 px strip; it is thin and easy to
  miss in a full screenshot.
- **IntersectionObserver reveals** — `.reveal`, `.pricing-features`, `.counter` fire once per
  element; reload the page to re-observe them.
- **SVG sprite icons** — `index.html` defines a hidden `<svg class="icon-sprite">` with
  `#icon-lock`, `#icon-check-circle`, `#icon-plus`, referenced via `<use href="#...">`. A broken
  sprite id renders as *blank space*, not a broken-image marker, and the stripped DOM still shows
  `<svg></svg>`. **Always confirm icons visually in a zoomed screenshot** — DOM inspection will not
  catch this class of bug.
- **FAQ accordion** — clicking one `.faq-question` closes all others; check both the visual state
  and `aria-expanded`.
- **Mobile nav** — resize the OS window (`wmctrl -r :ACTIVE: -e 0,0,0,430,760`) rather than using
  devtools device mode; `#nav-toggle` appears and `#nav-links` gets `.open`.

## checkout.html

`docs/checkout.html` loads real Paddle from `https://cdn.paddle.com/paddle/v2/paddle.js` and
branches on query params:

- No `txn`/`token` → `"Missing checkout parameters."` and **no** Try Again button.
- Any `txn`/`token` that Paddle rejects → Paddle shows its own "Something went wrong" overlay.
  **Close the overlay** (X, top-right) to fire `checkout.closed`, which renders `"Checkout closed."`
  **with** a Try Again button. This is the cheap way to exercise the retry render path without a
  real payment.
- The `checkout.completed` success state cannot be reached without a real Paddle transaction —
  report it as untested rather than claiming it works.

Once the param-validation work lands (checkout logic split into `docs/checkout.js`), the params are
also validated client-side before Paddle is touched:

- `txn` must match `/^txn_[a-z0-9]{1,64}$/`
- `token` must match `/^(live|test)_[a-z0-9]{16,80}$/`
- `env` is allowlisted to `production`; anything else falls back to `sandbox`
- invalid → `"Invalid checkout parameters."`; missing → `"Missing checkout parameters."`

A well-formed but fake token (e.g. `?txn=txn_01hzz&token=test_abcdefghijklmnop123456`) is enough to
prove paddle.js loads, the overlay iframe opens, and CSP allows frame/script/connect. Paddle will log
CORS/403 errors from `sandbox-checkout-service.paddle.com`; that is expected with a fake token, not a
site bug.

## Verifying CSP

CSP is delivered via `<meta http-equiv="Content-Security-Policy">` in each page (added by the
security-hardening work). When checking:

- Keep the DevTools Console open and look for `Refused to load/connect/frame ...` lines. Check *every*
  directive, not just `script-src` — third-party SDKs (e.g. Paddle) inject stylesheets and fonts too,
  so `style-src`/`font-src` gaps only show up in the console.
- `frame-ancestors` is always ignored in a `<meta>` CSP (Chrome logs an error). On GitHub Pages there
  is no way to set the header, so this directive is effectively dead — expect this console error on
  every page and don't treat it as a regression.
- To attribute a violation to the CSP change, copy the page with the meta tag stripped
  (`grep -v 'Content-Security-Policy' page.html > page-nocsp.html`) and compare. Delete the copy
  afterwards.

## Adversarial URL testing in Chrome's omnibox

Chrome inline-autocompletes previously visited URLs, which silently sends you to the wrong URL.
Always: click the omnibox → `ctrl+a` → type the URL → press `Delete` (kills the autocomplete suffix)
→ `Return`. Confirm the final URL in the screenshot before judging the result.

To prove nothing was injected, evaluate `document.getElementById('status').innerHTML` and check it
contains only the plain error `<div class="error">...</div>`.
