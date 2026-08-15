// Sandbox copy of the extension popup for the home page: it fakes a scan of a
// canned inbox so a visitor can try the scan -> review -> unsubscribe flow
// before installing. Nothing here talks to Gmail or to any server.

const demoRoot = document.getElementById('demo');

if (demoRoot) {
  const SENDERS = [
    { name: 'Medium Daily Digest', perWeek: 7 },
    { name: 'Amazon', perWeek: 5 },
    { name: 'Morning Brew', perWeek: 5 },
    { name: 'Spotify', perWeek: 3 },
    { name: 'Hacker Newsletter', perWeek: 1 },
    { name: 'Old Navy', perWeek: 6 }
  ];

  const reduceMotionDemo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = document.getElementById('demo-list');
  const scanBtn = document.getElementById('demo-scan');
  const bulkBtn = document.getElementById('demo-bulk');
  const resetBtn = document.getElementById('demo-reset');
  const countEl = document.getElementById('demo-count');
  const statusEl = document.getElementById('demo-status');

  // 'idle' before a scan, 'scanning' while rows appear, 'done' once scanned.
  let state = 'idle';
  let unsubscribed = [];
  let scanTimers = [];

  function clearList() {
    while (list.firstChild) list.removeChild(list.firstChild);
  }

  function silencedPerWeek() {
    return unsubscribed.reduce((total, sender) => total + sender.perWeek, 0);
  }

  function totalPerWeek() {
    return SENDERS.reduce((total, sender) => total + sender.perWeek, 0);
  }

  function selectedRows() {
    return Array.from(list.querySelectorAll('.demo-row')).filter(row => {
      const box = row.querySelector('input');
      return box && box.checked && !row.classList.contains('gone');
    });
  }

  function updateHeader() {
    const remaining = SENDERS.length - unsubscribed.length;
    if (state === 'idle') {
      countEl.textContent = totalPerWeek() + ' emails a week';
      return;
    }
    countEl.textContent = remaining + ' active · ' + silencedPerWeek() + ' emails a week silenced';
  }

  function updateBulkButton() {
    const count = selectedRows().length;
    bulkBtn.disabled = count === 0;
    bulkBtn.firstChild.nodeValue = count > 1
      ? 'Unsubscribe ' + count + ' selected '
      : 'Unsubscribe selected ';
  }

  function markUnsubscribed(row) {
    if (row.classList.contains('gone')) return;
    const index = Number(row.dataset.index);
    row.classList.add('gone');
    unsubscribed.push(SENDERS[index]);

    const box = row.querySelector('input');
    box.checked = false;
    box.disabled = true;

    const button = row.querySelector('.demo-unsub');
    const done = document.createElement('span');
    done.className = 'demo-done';
    done.textContent = 'Unsubscribed ✓';
    row.replaceChild(done, button);
  }

  function report(message) {
    statusEl.textContent = message;
  }

  function reportProgress() {
    const silenced = silencedPerWeek();
    if (unsubscribed.length === SENDERS.length) {
      report('Inbox clear — all ' + SENDERS.length + ' subscriptions gone, ' + silenced +
        ' fewer emails a week. That is roughly ' + Math.round(silenced * 52) + ' a year.');
      return;
    }
    report('Unsubscribed from ' + unsubscribed.length + ' of ' + SENDERS.length + ' — ' +
      silenced + ' fewer emails a week.');
  }

  function addRow(sender, index) {
    const row = document.createElement('li');
    row.className = 'demo-row';
    row.dataset.index = String(index);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = 'demo-select-' + index;
    box.name = 'demo-select';
    box.setAttribute('aria-label', 'Select ' + sender.name);
    box.addEventListener('change', updateBulkButton);

    const name = document.createElement('span');
    name.className = 'demo-sender';
    name.textContent = sender.name;

    const freq = document.createElement('span');
    freq.className = 'demo-freq';
    freq.textContent = sender.perWeek + '/week';

    const button = document.createElement('button');
    button.className = 'demo-unsub';
    button.type = 'button';
    button.textContent = 'Unsubscribe';
    button.addEventListener('click', () => {
      markUnsubscribed(row);
      updateHeader();
      updateBulkButton();
      reportProgress();
    });

    row.append(box, name, freq, button);
    list.appendChild(row);
  }

  function finishScan() {
    state = 'done';
    scanBtn.disabled = false;
    scanBtn.textContent = 'Re-scan inbox';
    updateHeader();
    report('Found ' + SENDERS.length + ' subscriptions sending you ' + totalPerWeek() +
      ' emails a week. Unsubscribe from one, or tick a few and use bulk unsubscribe.');
  }

  function scan() {
    scanTimers.forEach(clearTimeout);
    scanTimers = [];
    clearList();
    unsubscribed = [];
    state = 'scanning';
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';
    bulkBtn.disabled = true;
    report('Scanning your inbox — reading sender and subject lines only, all in this tab.');

    if (reduceMotionDemo) {
      SENDERS.forEach(addRow);
      finishScan();
      return;
    }

    SENDERS.forEach((sender, index) => {
      scanTimers.push(setTimeout(() => {
        addRow(sender, index);
        if (index === SENDERS.length - 1) finishScan();
      }, 180 + index * 260));
    });
  }

  function reset() {
    scanTimers.forEach(clearTimeout);
    scanTimers = [];
    state = 'idle';
    unsubscribed = [];
    clearList();

    const empty = document.createElement('li');
    empty.className = 'demo-empty';
    empty.textContent = 'This demo inbox has ' + SENDERS.length +
      ' subscriptions hiding in it. Scan to find them.';
    list.appendChild(empty);

    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan inbox';
    bulkBtn.disabled = true;
    updateHeader();
    report('Click “Scan inbox” — nothing leaves this page.');
  }

  bulkBtn.addEventListener('click', () => {
    const rows = selectedRows();
    rows.forEach(markUnsubscribed);
    updateHeader();
    updateBulkButton();
    if (rows.length > 1 && unsubscribed.length < SENDERS.length) {
      report('Bulk unsubscribed from ' + rows.length + ' senders at once — ' +
        silencedPerWeek() + ' fewer emails a week. Bulk actions are a Pro feature.');
    } else {
      reportProgress();
    }
  });

  scanBtn.addEventListener('click', scan);
  resetBtn.addEventListener('click', reset);
  reset();
}
