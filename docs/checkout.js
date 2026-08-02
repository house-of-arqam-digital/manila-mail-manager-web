(function() {
  // Paddle client-side tokens are public, but pinning ours here stops anyone from
  // opening a checkout on this domain that pays into their own Paddle account.
  // Both environments are pinned, so ?token= is never honoured.
  var PINNED_TOKENS = {
    production: 'live_71ddd802c4fbd34916ef9b59dc8',
    sandbox: 'test_ada703cc3868f5deec2266c1f40'
  };
  var TXN_PATTERN = /^txn_[a-z0-9]{1,64}$/;
  var LOAD_TIMEOUT_MS = 15000;

  var params = new URLSearchParams(window.location.search);
  var txnId = params.get('txn');
  var env = params.get('env') || 'production';
  var token = Object.prototype.hasOwnProperty.call(PINNED_TOKENS, env) ? PINNED_TOKENS[env] : '';
  var statusEl = document.getElementById('status');
  var settled = false;
  var errorShown = false;

  function render(nodes) {
    settled = true;
    statusEl.replaceChildren.apply(statusEl, nodes);
  }

  function message(className, text) {
    var el = document.createElement('div');
    el.className = className;
    el.textContent = text;
    return el;
  }

  function hint(text) {
    var el = document.createElement('p');
    el.className = 'hint';
    el.textContent = text;
    return el;
  }

  function retryButton() {
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.type = 'button';
    btn.textContent = 'Try Again';
    btn.addEventListener('click', function() { location.reload(); });
    return btn;
  }

  function homeLink() {
    var a = document.createElement('a');
    a.className = 'btn';
    a.href = '/';
    a.textContent = 'Back to Manila Mail Manager';
    return a;
  }

  function showError(text) {
    errorShown = true;
    render([message('error', text), retryButton()]);
  }

  if (!token) {
    render([message('error', 'Unknown checkout environment.'), homeLink()]);
    return;
  }

  if (!txnId) {
    render([
      message('error', 'This checkout link is incomplete.'),
      hint('Start your upgrade from the extension: open Manila Mail Manager, go to Settings and choose Upgrade to Pro.'),
      homeLink()
    ]);
    return;
  }

  if (!TXN_PATTERN.test(txnId)) {
    render([message('error', 'This checkout link is not valid.'), homeLink()]);
    return;
  }

  var loadTimer = setTimeout(function() {
    if (!settled) {
      showError('Could not reach our payment provider. Check your connection or any ad blocker, then try again.');
    }
  }, LOAD_TIMEOUT_MS);

  try {
    if (typeof Paddle === 'undefined') throw new Error('the payment provider did not load');

    Paddle.Environment.set(env);
    Paddle.Initialize({
      token: token,
      eventCallback: function(event) {
        if (event.name === 'checkout.loaded') {
          settled = true;
          clearTimeout(loadTimer);
        }
        if (event.name === 'checkout.completed') {
          clearTimeout(loadTimer);
          var done = message('status', '\u2713 Payment successful!');
          done.style.color = '#15803d';
          render([
            done,
            hint('You can close this tab and return to the extension. Your Pro features are now active.')
          ]);
        }
        if (event.name === 'checkout.error') {
          clearTimeout(loadTimer);
          var detail = event && event.detail;
          if (detail && typeof detail === 'object') {
            detail = detail.message || detail.detail || JSON.stringify(detail);
          }
          showError('Checkout error: ' + (detail || 'An unexpected error occurred during checkout.'));
        }
        if (event.name === 'checkout.closed' && !errorShown) {
          clearTimeout(loadTimer);
          render([message('status', 'Checkout closed.'), retryButton()]);
        }
      }
    });

    Paddle.Checkout.open({
      transactionId: txnId,
      settings: {
        displayMode: 'overlay',
        theme: 'light'
      }
    });
  } catch (_e) {
    clearTimeout(loadTimer);
    showError('Failed to load checkout. Please try again.');
  }
})();
