---
name: testing-static-site
description: How to run and test the manila-mail-manager-web static GitHub Pages site (docs/), including the Paddle checkout page and CSP verification.
---

# Testing the Manila Mail Manager website (docs/)

## Serving
Everything is static under `docs/`. Serve with:
```
cd docs && python3 -m http.server 8899
```
Then browse `http://localhost:8899/index.html`, `privacy.html`, `terms.html`, `support.html`, `checkout.html`.
No build step, no dependencies, no credentials needed.

## Checkout page
`docs/checkout.html` loads `https://cdn.paddle.com/paddle/v2/paddle.js` plus `docs/checkout.js`, which reads URL params:
- `txn` must match `/^txn_[a-z0-9]{1,64}$/`
- `token` must match `/^(live|test)_[a-z0-9]{16,80}$/`
- `env` is allowlisted to `production`; anything else falls back to `sandbox`
- invalid → "Invalid checkout parameters."; missing → "Missing checkout parameters."

A well-formed but fake token (e.g. `?txn=txn_01hzz&token=test_abcdefghijklmnop123456`) is enough to prove
paddle.js loads, the overlay iframe opens and CSP allows frame/script/connect — Paddle will render its own
"Something went wrong" panel and log CORS/403 errors from `sandbox-checkout-service.paddle.com`; that is expected
with a fake token, not a site bug. To exercise a *real* checkout form you need a genuine Paddle client-side token
(sandbox `test_...` or live `live_...`) from the project owner.

Useful trick: the `checkout.closed` event (and therefore the "Try Again" retry button) is reachable without a real
token — just click the X in Paddle's overlay.

## Verifying CSP
CSP is delivered via `<meta http-equiv="Content-Security-Policy">` in each page. When checking:
- Keep the DevTools Console open and look for `Refused to load/connect/frame ...` lines. Check *every* directive,
  not just `script-src` — third-party SDKs (e.g. Paddle) inject stylesheets and fonts too, so `style-src`/`font-src`
  gaps are easy to miss and only show up in the console.
- `frame-ancestors` is always ignored in a `<meta>` CSP (Chrome logs an error). On GitHub Pages there is no way to
  set the header, so this directive is effectively dead — expect this console error on every page and don't treat
  it as a regression.
- To attribute a violation to the CSP change, copy the page with the meta tag stripped
  (`grep -v 'Content-Security-Policy' page.html > page-nocsp.html`) and compare. Delete the copy afterwards.

## Adversarial URL testing in Chrome's omnibox
Chrome inline-autocompletes previously visited URLs, which silently sends you to the wrong URL. Always:
click the omnibox → `ctrl+a` → type the URL → press `Delete` (kills the autocomplete suffix) → `Return`.
Confirm the final URL in the screenshot before judging the result.

To prove nothing was injected, evaluate `document.getElementById('status').innerHTML` and check it contains only
the plain error `<div class="error">...</div>`.

## Devin Secrets Needed
None for basic testing. A real Paddle client-side token (sandbox and/or production) would be needed to test a
complete checkout form render/payment flow.
