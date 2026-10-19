// Merch: keeps price and stock in sync with /merch.json, and runs the "Purchase" pop-up.
// Edit prices and stock in merch.json only. Pages fill in the numbers automatically.
(function () {
  var DISCORD = 'https://discord.com/invite/GJVceufN6a';
  var items = {};

  function money(i) {
    var sym = { USD: '$' }[i.currency];
    return (sym || '') + Number(i.price).toFixed(2) + (sym ? '' : ' ' + i.currency);
  }
  function stockText(n) { return n <= 0 ? 'Sold out' : n === 1 ? 'Only 1 left' : n + ' in stock'; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function apply() {
    document.querySelectorAll('[data-price]').forEach(function (n) {
      var i = items[n.getAttribute('data-price')]; if (i) n.textContent = money(i);
    });
    document.querySelectorAll('[data-stock]').forEach(function (n) {
      var i = items[n.getAttribute('data-stock')]; if (i) n.textContent = stockText(i.stock);
    });
    document.querySelectorAll('[data-stock-badge]').forEach(function (n) {
      var i = items[n.getAttribute('data-stock-badge')]; if (!i) return;
      n.textContent = stockText(i.stock);
      n.className = 'status-badge ' + (i.stock <= 0 ? 'status-planned' : i.stock === 1 ? 'status-dev' : 'status-live');
      var tile = n.closest('.tile'); if (tile) tile.classList.toggle('sold-out', i.stock <= 0);
    });
    document.querySelectorAll('[data-buy]').forEach(function (b) {
      var i = items[b.getAttribute('data-buy')];
      if (i && i.stock <= 0) { b.disabled = true; b.textContent = 'Sold out'; }
    });
  }

  function openModal(id, fallbackName, opener) {
    var it = items[id] || {};
    var name = it.name || fallbackName || 'this item';
    var max = typeof it.stock === 'number' ? Math.max(1, it.stock) : 1;
    var qty = 1;

    function message() {
      return "Hi! I'd like to buy " + qty + ' × ' + name + (it.price != null ? ' (' + money(it) + ' each)' : '') + ". I'm in [your country].";
    }

    var overlay = el('div', 'modal-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'buy-title');
    var box = el('div', 'modal');
    overlay.appendChild(box);

    box.appendChild(el('h2', null, 'Request a purchase')).id = 'buy-title';
    box.appendChild(el('p', 'm-item', name + (it.price != null ? ' · ' + money(it) : '')));

    var qtyInput = null;
    if (max > 1) {
      var q = el('div', 'm-qty');
      var lab = el('label', null, 'Quantity'); lab.setAttribute('for', 'buy-qty');
      qtyInput = el('input'); qtyInput.type = 'number'; qtyInput.id = 'buy-qty';
      qtyInput.min = 1; qtyInput.max = max; qtyInput.value = 1;
      q.appendChild(lab); q.appendChild(qtyInput); q.appendChild(el('span', 'm-note-inline', '(up to ' + max + ')'));
      box.appendChild(q);
    }

    var steps = el('ol');
    var s1 = el('li'); s1.appendChild(document.createTextNode('Open our '));
    var dl = el('a', null, 'Discord server'); dl.href = DISCORD; dl.target = '_blank'; dl.rel = 'noopener';
    s1.appendChild(dl); s1.appendChild(document.createTextNode(' and join if you haven’t yet.'));
    steps.appendChild(s1);
    steps.appendChild(el('li', null, 'Send us the message below (fill in your country).'));
    steps.appendChild(el('li', null, 'We’ll reply with the total, shipping, and how to pay.'));
    box.appendChild(steps);

    var ta = el('textarea'); ta.readOnly = true; ta.value = message(); ta.setAttribute('aria-label', 'Message to send');
    box.appendChild(ta);

    var actions = el('div', 'm-actions');
    var copyBtn = el('button', 'btn', 'Copy message'); copyBtn.type = 'button';
    var go = el('a', 'btn btn-primary', 'Open Discord ↗'); go.href = DISCORD; go.target = '_blank'; go.rel = 'noopener';
    var close = el('button', 'btn', 'Close'); close.type = 'button';
    actions.appendChild(go); actions.appendChild(copyBtn); actions.appendChild(close);
    box.appendChild(actions);
    box.appendChild(el('p', 'm-note', 'Checkout isn’t live yet, so purchases are arranged in Discord for now.'));

    if (qtyInput) qtyInput.addEventListener('input', function () {
      var v = parseInt(qtyInput.value, 10);
      qty = isNaN(v) ? 1 : Math.min(max, Math.max(1, v));
      ta.value = message();
    });
    function flash(txt) { copyBtn.textContent = txt; setTimeout(function () { copyBtn.textContent = 'Copy message'; }, 1800); }
    copyBtn.addEventListener('click', function () {
      function fallback() { ta.select(); try { document.execCommand('copy'); flash('Copied!'); } catch (e) { flash('Press Ctrl+C'); } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function () { flash('Copied!'); }, fallback);
      else fallback();
    });

    function shut() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (opener && opener.focus) opener.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { shut(); return; }
      if (e.key !== 'Tab') return;
      var f = box.querySelectorAll('a[href],button,input,textarea');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    close.addEventListener('click', shut);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) shut(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    (qtyInput || go).focus();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-buy]');
    if (!b || b.disabled) return;
    e.preventDefault();
    openModal(b.getAttribute('data-buy'), b.getAttribute('data-buy-name'), b);
  });

  fetch('/merch.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) { (j.items || []).forEach(function (i) { items[i.id] = i; }); apply(); })
    .catch(function () { /* pages keep their built-in text if the file can't load */ });
})();
