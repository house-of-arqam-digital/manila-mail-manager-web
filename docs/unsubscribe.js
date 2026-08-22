(function() {
  // Emails sent from manilamail.app addresses link here as their unsubscribe
  // target (?brand=<sender>). The site is static, so there is no mailing-list
  // backend to update; support handles the removal from a manual list.
  var BRAND_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  var view = document.getElementById('unsubscribe-view');

  function render(nodes) {
    view.replaceChildren.apply(view, nodes);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function homeLink() {
    var a = el('a', 'btn', 'Back to Manila Mail Manager');
    a.href = '/';
    return a;
  }

  function readBrand() {
    var params = new URLSearchParams(window.location.search);
    return (params.get('brand') || '').trim();
  }

  var brand = readBrand();
  var confirmed = brand && BRAND_PATTERN.test(brand)
    ? 'You\u2019ve been unsubscribed from ' + brand + '.'
    : 'You\u2019ve been unsubscribed.';

  render([
    el('div', 'status', confirmed),
    el('p', 'hint', 'You won\u2019t receive further emails from this sender. If anything else shows up, forward it to support@manilamail.app and we\u2019ll take care of it.'),
    homeLink()
  ]);
})();
