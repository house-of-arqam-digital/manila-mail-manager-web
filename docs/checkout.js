(function() {
  // Paddle client-side tokens are safe to expose publicly, and pinning them here
  // prevents a crafted checkout.html?token=... link from rendering an attacker's
  // Paddle checkout on this domain. Leave a value empty to fall back to the
  // ?token= parameter (still format-validated below).
  var PINNED_TOKENS = {
    production: '',
    sandbox: 'test_ada703cc3868f5deec2266c1f40'
  };

  var TXN_PATTERN = /^txn_[a-z0-9]{1,64}$/;
  var TOKEN_PATTERN = /^(live|test)_[a-z0-9]{16,80}$/;

  var params = new URLSearchParams(window.location.search);
  var txnId = params.get('txn');
  var env = params.get('env') === 'production' ? 'production' : 'sandbox';
  var token = PINNED_TOKENS[env] || params.get('token') || '';
  var statusEl = document.getElementById('status');

  function render(nodes) {
    statusEl.textContent = '';
    nodes.forEach(function(node) { statusEl.appendChild(node); });
  }

  function message(text, className, style) {
    var el = document.createElement('div');
    el.className = className;
    el.textContent = text;
    if (style) { el.setAttribute('style', style); }
    return el;
  }

  function retryButton() {
    var btn = document.createElement('button');
    btn.className = 'retry-btn';
    btn.textContent = 'Try Again';
    btn.addEventListener('click', function() { location.reload(); });
    return btn;
  }

  function showError(text) {
    render([message(text, 'error'), retryButton()]);
  }

  if (!txnId || !token) {
    render([message('Missing checkout parameters.', 'error')]);
    return;
  }

  if (!TXN_PATTERN.test(txnId) || !TOKEN_PATTERN.test(token)) {
    render([message('Invalid checkout parameters.', 'error')]);
    return;
  }

  try {
    if (env === 'sandbox') {
      Paddle.Environment.set('sandbox');
    }

    Paddle.Initialize({
      token: token,
      eventCallback: function(event) {
        if (event.name === 'checkout.completed') {
          var success = message('\u2713 Payment successful!', 'status', 'color:#10b981;');
          var detail = message(
            'You can close this tab and return to the extension. Your Pro features are now active.',
            'status',
            'font-size:14px;color:#666;'
          );
          render([success, detail]);
        }
        if (event.name === 'checkout.closed') {
          render([message('Checkout closed.', 'status'), retryButton()]);
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
  } catch (e) {
    showError('Failed to load checkout. Please try again.');
  }
})();
