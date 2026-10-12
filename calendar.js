// The Calendar: reads /sales.json, draws the month grid and the "next sale" strip.
// All text is inserted with textContent, never innerHTML, so sales.json can't inject markup.
(function () {
  var TYPES = {
    kwge:  { label: 'KWG&E sale',            ring: 'ring-kwge' },
    steam: { label: 'Major Steam sale',      ring: 'ring-steam' },
    other: { label: 'Sale on another store', ring: 'ring-other' }
  };
  var ORDER = ['kwge', 'steam', 'other'];
  var DAY = 86400000;

  function pd(s) {
    var p = String(s).split('-').map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    var d = new Date(p[0], p[1] - 1, p[2]);
    return isNaN(d) ? null : d;
  }
  function today0() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function daysBetween(a, b) { return Math.round((a - b) / DAY); }
  function fmt(d) { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function range(s) { return s.start.getTime() === s.end.getTime() ? fmt(s.start) : fmt(s.start) + ' – ' + fmt(s.end); }
  function safeUrl(u) {
    try { var x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; }
    catch (e) { return null; }
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function chip(type) { return el('span', 'chip chip-' + type, TYPES[type].label); }
  function plural(n) { return n + ' day' + (n === 1 ? '' : 's'); }

  function load() {
    return fetch('/sales.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        return ((j && j.sales) || []).map(function (s) {
          if (!s || !s.title || !TYPES[s.type]) return null;
          var a = pd(s.start), b = pd(s.end || s.start);
          if (!a || !b || b < a) return null;
          return {
            id: s.id || s.title, title: String(s.title), type: s.type, start: a, end: b,
            tentative: !!s.tentative, store: s.store || '', summary: s.summary || '',
            details: s.details || '', items: s.items || '', link: safeUrl(s.link || '')
          };
        }).filter(Boolean).sort(function (x, y) { return x.start - y.start; });
      });
  }

  // ---- "next sale" strip (Home + Calendar page) ----
  function initStrip() {
    var box = document.getElementById('sale-strip');
    if (!box) return;
    load().then(function (sales) {
      var t = today0(), pick, main, sub;
      var on = sales.filter(function (s) { return s.start <= t && s.end >= t; })
                    .sort(function (a, b) { return a.end - b.end; })[0];
      if (on) {
        var left = daysBetween(on.end, t);
        pick = on; main = 'On now: ' + on.title;
        sub = left === 0 ? 'ends today' : 'ends in ' + plural(left);
      } else {
        pick = sales.filter(function (s) { return s.start > t; })[0];
        if (!pick) return;
        main = 'Next sale: ' + pick.title;
        sub = 'in ' + plural(daysBetween(pick.start, t));
      }
      box.textContent = '';
      box.appendChild(chip(pick.type));
      box.appendChild(el('strong', null, main));
      box.appendChild(el('span', 'strip-sub', sub + (pick.tentative ? ' (dates may change)' : '')));
      box.appendChild(el('span', 'strip-go', 'Open the calendar →'));
      box.hidden = false;
    }).catch(function () { /* no strip if the data can't load */ });
  }

  // ---- full calendar page ----
  function initCalendar() {
    var grid = document.getElementById('cal-grid');
    if (!grid) return;
    var title = document.getElementById('cal-title');
    var details = document.getElementById('cal-details');
    var upcoming = document.getElementById('cal-upcoming');
    var emptyNote = document.getElementById('cal-empty');
    var sales = [], now = today0();
    var view = new Date(now.getFullYear(), now.getMonth(), 1);
    var selected = null;

    function eventsOn(d) { return sales.filter(function (s) { return s.start <= d && s.end >= d; }); }

    function renderGrid() {
      title.textContent = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      grid.textContent = '';
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (n) { grid.appendChild(el('div', 'cal-dow', n)); });
      var offset = (view.getDay() + 6) % 7;
      var n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      var any = false;
      for (var i = 0; i < offset; i++) grid.appendChild(el('div', 'cal-blank'));
      for (var d = 1; d <= n; d++) {
        (function (date) {
          var ev = eventsOn(date), cell;
          if (ev.length) {
            any = true;
            cell = el('button', 'cal-day has-events');
            cell.type = 'button';
            cell.setAttribute('aria-label', date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + ': ' + ev.length + ' sale' + (ev.length > 1 ? 's' : ''));
            ORDER.filter(function (t) { return ev.some(function (e) { return e.type === t; }); })
                 .forEach(function (t, idx) {
                   var r = el('span', 'ring ' + TYPES[t].ring);
                   r.style.setProperty('--i', idx);
                   cell.appendChild(r);
                 });
            cell.addEventListener('click', function () {
              selected = date; renderGrid(); renderDetails();
              var s = grid.querySelector('.selected'); if (s) s.focus();
            });
          } else {
            cell = el('div', 'cal-day');
          }
          cell.appendChild(el('span', 'num', String(date.getDate())));
          if (date.getTime() === now.getTime()) cell.classList.add('today');
          if (selected && date.getTime() === selected.getTime()) cell.classList.add('selected');
          grid.appendChild(cell);
        })(new Date(view.getFullYear(), view.getMonth(), d));
      }
      if (emptyNote) emptyNote.hidden = any;
    }

    function renderDetails() {
      details.textContent = '';
      if (!selected) { details.appendChild(el('p', 'cal-hint', 'Click a highlighted day to see the sale details.')); return; }
      details.appendChild(el('h2', null, selected.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })));
      eventsOn(selected).forEach(function (s) {
        var card = el('div', 'card cal-card');
        var top = el('div', 'cal-card-top');
        top.appendChild(chip(s.type));
        if (s.tentative) top.appendChild(el('span', 'chip chip-tent', 'Dates may change'));
        card.appendChild(top);
        card.appendChild(el('h3', null, s.title));
        card.appendChild(el('p', 'cal-dates', range(s) + (s.store ? ' · ' + s.store : '')));
        if (s.summary) card.appendChild(el('p', null, s.summary));
        if (s.details) card.appendChild(el('p', 'cal-more', s.details));
        if (s.items) card.appendChild(el('p', 'cal-more', 'Includes: ' + s.items));
        if (s.link) {
          var a = el('a', 'btn btn-primary', 'Visit ↗');
          a.href = s.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
          card.appendChild(a);
        }
        details.appendChild(card);
      });
    }

    function renderUpcoming() {
      upcoming.textContent = '';
      var list = sales.filter(function (s) { return s.end >= now; }).slice(0, 6);
      if (!list.length) { upcoming.appendChild(el('p', 'cal-hint', 'Nothing scheduled yet.')); return; }
      list.forEach(function (s) {
        var row = el('button', 'cal-up'); row.type = 'button';
        row.appendChild(chip(s.type));
        row.appendChild(el('strong', null, s.title));
        row.appendChild(el('span', 'cal-dates', range(s) + (s.tentative ? ' (may change)' : '')));
        row.addEventListener('click', function () {
          var d = s.start < now ? now : s.start;
          selected = d; view = new Date(d.getFullYear(), d.getMonth(), 1);
          renderGrid(); renderDetails();
          window.scrollTo({ top: grid.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
        });
        upcoming.appendChild(row);
      });
    }

    document.getElementById('cal-prev').addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderGrid(); });
    document.getElementById('cal-next').addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderGrid(); });
    document.getElementById('cal-today').addEventListener('click', function () { view = new Date(now.getFullYear(), now.getMonth(), 1); renderGrid(); });

    load().then(function (list) {
      sales = list;
      renderGrid(); renderDetails(); renderUpcoming();
    }).catch(function () {
      renderGrid();
      details.textContent = '';
      details.appendChild(el('p', 'cal-hint', "Couldn't load the sale data right now. Please try again in a bit."));
    });
  }

  document.addEventListener('DOMContentLoaded', function () { initStrip(); initCalendar(); });
})();
