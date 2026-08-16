// Sandbox copy of the extension for the home page: a mixed inbox of real mail and
// subscription mail, so a visitor can watch the scan tag only the subscriptions,
// then unsubscribe or hide them. Nothing here talks to Gmail or to any server.

const demoRoot = document.getElementById('demo');

if (demoRoot) {
  // perWeek is only meaningful for subscriptions; mail from people is left alone.
  const MESSAGES = [
    { sender: 'Maya Fernandez', subject: 'Re: dinner on Saturday?' },
    { sender: 'Medium Daily Digest', subject: "Today's highlights for you", perWeek: 7 },
    { sender: 'Old Navy', subject: '48 hours only — 50% off everything', perWeek: 6 },
    { sender: 'Dad', subject: 'photos from the trip' },
    { sender: 'Morning Brew', subject: 'Markets open higher ☕', perWeek: 5 },
    { sender: 'Amazon', subject: 'Deals picked for you this week', perWeek: 5 },
    { sender: 'Sam Chen', subject: 'Feedback on the Q3 deck' },
    { sender: 'Spotify', subject: 'Your Discover Weekly is ready', perWeek: 3 },
    { sender: 'Hacker Newsletter', subject: 'Issue #612', perWeek: 1 },
    { sender: 'Priya (landlord)', subject: 'Lease renewal paperwork' }
  ];

  const SUBS = MESSAGES.filter(message => message.perWeek);

  const reduceMotionDemo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = document.getElementById('demo-list');
  const scanBtn = document.getElementById('demo-scan');
  const bulkBtn = document.getElementById('demo-bulk');
  const wandBtn = document.getElementById('demo-wand');
  const resetBtn = document.getElementById('demo-reset');
  const countEl = document.getElementById('demo-count');
  const statusEl = document.getElementById('demo-status');

  // 'idle' before a scan, 'scanning' while rows get tagged, 'done' once scanned.
  let state = 'idle';
  let unsubscribed = [];
  let scanTimers = [];
  // Mirrors Magic Cleanup in the extension: a view filter, nothing more.
  let tidied = false;

  function clearList() {
    while (list.firstChild) list.removeChild(list.firstChild);
  }

  function silencedPerWeek() {
    return unsubscribed.reduce((total, message) => total + message.perWeek, 0);
  }

  function subsPerWeek() {
    return SUBS.reduce((total, message) => total + message.perWeek, 0);
  }

  // Only tagged subscription rows are ever selectable, tidyable or unsubscribable —
  // mail from people is untouched, exactly as in Gmail.
  function subRows() {
    return Array.from(list.querySelectorAll('.demo-row.is-sub'));
  }

  function selectedRows() {
    return subRows().filter(row => {
      const box = row.querySelector('input');
      return box && box.checked && !row.classList.contains('gone');
    });
  }

  function report(message) {
    statusEl.textContent = message;
  }

  function updateHeader() {
    if (state === 'idle') {
      countEl.textContent = MESSAGES.length + ' emails · none tagged yet';
      return;
    }
    const remaining = SUBS.length - unsubscribed.length;
    countEl.textContent = remaining + ' active · ' + silencedPerWeek() + ' emails a week silenced';
  }

  function updateWandButton() {
    wandBtn.disabled = state !== 'done' || subRows().length === 0;
    wandBtn.setAttribute('aria-pressed', tidied ? 'true' : 'false');
    wandBtn.lastChild.nodeValue = tidied ? ' Bring them back' : ' Hide them from view';
  }

  function updateBulkButton() {
    const count = selectedRows().length;
    bulkBtn.disabled = count === 0;
    bulkBtn.firstChild.nodeValue = count > 1
      ? 'Unsubscribe ' + count + ' selected '
      : 'Unsubscribe selected ';
  }

  function setTidied(next) {
    tidied = next;
    const rows = subRows();
    rows.forEach(row => row.classList.toggle('tidied', tidied));
    if (tidied) {
      // Selecting rows you can no longer see would make bulk unsubscribe fire blind.
      rows.forEach(row => { row.querySelector('input').checked = false; });
    }
    updateWandButton();
    updateBulkButton();

    const humans = MESSAGES.length - rows.length;
    if (tidied) {
      report('Hid ' + rows.length + ' subscription ' + (rows.length === 1 ? 'email' : 'emails') +
        ' from the view — the ' + humans + ' emails from actual people stayed put, and nothing was ' +
        'deleted, archived or unsubscribed. Tap the wand again to bring them back.');
    } else {
      report(rows.length + ' subscription ' + (rows.length === 1 ? 'email is' : 'emails are') +
        ' back, exactly as they were.');
    }
  }

  function markUnsubscribed(row) {
    if (row.classList.contains('gone')) return;
    const message = MESSAGES[Number(row.dataset.index)];
    row.classList.add('gone');
    unsubscribed.push(message);

    const box = row.querySelector('input');
    box.checked = false;
    box.disabled = true;

    const button = row.querySelector('.demo-unsub');
    const done = document.createElement('span');
    done.className = 'demo-done';
    done.textContent = 'Unsubscribed ✓';
    row.replaceChild(done, button);
  }

  function reportProgress() {
    const silenced = silencedPerWeek();
    if (unsubscribed.length === SUBS.length) {
      report('Inbox clear — all ' + SUBS.length + ' subscriptions gone, ' + silenced +
        ' fewer emails a week. That is roughly ' + Math.round(silenced * 52) + ' a year.');
      return;
    }
    report('Unsubscribed from ' + unsubscribed.length + ' of ' + SUBS.length + ' — ' +
      silenced + ' fewer emails a week.');
  }

  // Untagged row: what the inbox looks like before a scan, and what mail from
  // people keeps looking like afterwards.
  function addRow(message, index) {
    const row = document.createElement('li');
    row.className = 'demo-row';
    row.dataset.index = String(index);

    const slot = document.createElement('span');
    slot.className = 'demo-slot';

    const meta = document.createElement('span');
    meta.className = 'demo-meta';
    const sender = document.createElement('span');
    sender.className = 'demo-sender';
    sender.textContent = message.sender;
    const subject = document.createElement('span');
    subject.className = 'demo-subject';
    subject.textContent = message.subject;
    meta.append(sender, subject);

    const tag = document.createElement('span');
    tag.className = 'demo-tagslot';

    const action = document.createElement('span');
    action.className = 'demo-actionslot';

    row.append(slot, meta, tag, action);
    list.appendChild(row);
  }

  // The scan's payoff: a subscription row gains the badge, a checkbox and an
  // Unsubscribe button, which is what the extension adds to Gmail's own rows.
  function tagRow(index) {
    const message = MESSAGES[index];
    const row = list.querySelector('.demo-row[data-index="' + index + '"]');
    if (!row || !message.perWeek) return;

    row.classList.add('is-sub');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = 'demo-select-' + index;
    box.name = 'demo-select';
    box.setAttribute('aria-label', 'Select ' + message.sender);
    box.addEventListener('change', updateBulkButton);
    row.querySelector('.demo-slot').appendChild(box);

    const badge = document.createElement('span');
    badge.className = 'demo-tag';
    badge.textContent = 'Subscription · ' + message.perWeek + '/week';
    row.querySelector('.demo-tagslot').appendChild(badge);

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
    row.querySelector('.demo-actionslot').appendChild(button);

    if (tidied) row.classList.add('tidied');
  }

  function finishScan() {
    state = 'done';
    scanBtn.disabled = false;
    scanBtn.textContent = 'Re-scan inbox';
    updateHeader();
    updateWandButton();
    report('Tagged ' + SUBS.length + ' subscriptions sending you ' + subsPerWeek() +
      ' emails a week, and left the ' + (MESSAGES.length - SUBS.length) +
      ' emails from real people alone. Unsubscribe from one, tick a few for bulk, or ' +
      'hide them all from view with the wand.');
  }

  function renderInbox() {
    clearList();
    MESSAGES.forEach(addRow);
  }

  function scan() {
    scanTimers.forEach(clearTimeout);
    scanTimers = [];
    unsubscribed = [];
    state = 'scanning';
    tidied = false;
    renderInbox();
    scanBtn.disabled = true;
    scanBtn.textContent = 'Scanning…';
    bulkBtn.disabled = true;
    updateWandButton();
    report('Scanning your inbox — reading sender and subject lines only, all in this tab.');

    const subIndexes = MESSAGES
      .map((message, index) => (message.perWeek ? index : -1))
      .filter(index => index >= 0);

    if (reduceMotionDemo) {
      subIndexes.forEach(tagRow);
      finishScan();
      return;
    }

    subIndexes.forEach((index, order) => {
      scanTimers.push(setTimeout(() => {
        tagRow(index);
        if (order === subIndexes.length - 1) finishScan();
      }, 180 + order * 260));
    });
  }

  function reset() {
    scanTimers.forEach(clearTimeout);
    scanTimers = [];
    state = 'idle';
    unsubscribed = [];
    tidied = false;
    renderInbox();

    scanBtn.disabled = false;
    scanBtn.textContent = 'Scan inbox';
    bulkBtn.disabled = true;
    updateHeader();
    updateWandButton();
    report('An ordinary inbox: real mail mixed in with ' + SUBS.length +
      ' subscriptions. Click “Scan inbox” to see which is which — nothing leaves this page.');
  }

  bulkBtn.addEventListener('click', () => {
    const rows = selectedRows();
    rows.forEach(markUnsubscribed);
    updateHeader();
    updateBulkButton();
    if (rows.length > 1 && unsubscribed.length < SUBS.length) {
      report('Bulk unsubscribed from ' + rows.length + ' senders at once — ' +
        silencedPerWeek() + ' fewer emails a week. Bulk actions are a Pro feature.');
    } else {
      reportProgress();
    }
  });

  wandBtn.addEventListener('click', () => setTidied(!tidied));
  scanBtn.addEventListener('click', scan);
  resetBtn.addEventListener('click', reset);
  reset();
}
