/* ===========================================================
   ui.js — DOM helpers, formatting, confetti, toasts, modals,
   SVG rings & bars. Exposes window.UI
   =========================================================== */
(function () {
  'use strict';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
    if (children != null) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function money(n, opts) {
    opts = opts || {};
    var v = Number(n) || 0;
    var s = v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 });
    return s;
  }
  function moneyShort(n) {
    var v = Number(n) || 0;
    if (Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
    return money(v);
  }
  function pct(x) { return Math.round((Number(x) || 0) * 100) + '%'; }

  function fmtDate(d) {
    var dt = (d instanceof Date) ? d : new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDay(d) {
    var dt = (d instanceof Date) ? d : new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /* ---------- SVG progress ring ---------- */
  function ring(value, opts) {
    opts = opts || {};
    var size = opts.size || 78, sw = opts.stroke || 11, r = (size - sw) / 2, c = 2 * Math.PI * r;
    var off = c * (1 - UI.clamp(value));
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ring'); svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    // gradient def (once)
    if (!document.getElementById('ringgrad')) {
      var defs = document.createElementNS(ns, 'defs');
      var g = document.createElementNS(ns, 'linearGradient');
      g.id = 'ringgrad'; g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '1'); g.setAttribute('y2', '1');
      [['0%', '#f7b5d3'], ['100%', '#c9b6f5']].forEach(function (st) {
        var s = document.createElementNS(ns, 'stop'); s.setAttribute('offset', st[0]); s.setAttribute('stop-color', st[1]); g.appendChild(s);
      });
      defs.appendChild(g); svg.appendChild(defs);
    }
    function circle(cls) {
      var el2 = document.createElementNS(ns, 'circle');
      el2.setAttribute('class', cls); el2.setAttribute('cx', size / 2); el2.setAttribute('cy', size / 2); el2.setAttribute('r', r);
      return el2;
    }
    var track = circle('track');
    var meter = circle('meter');
    meter.setAttribute('transform', 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')');
    meter.style.strokeDasharray = c;
    meter.style.strokeDashoffset = c; // start empty, animate
    svg.appendChild(track); svg.appendChild(meter);
    if (opts.label !== false) {
      var txt = document.createElementNS(ns, 'text');
      txt.setAttribute('x', size / 2); txt.setAttribute('y', size / 2 + 6); txt.setAttribute('text-anchor', 'middle');
      txt.textContent = opts.text != null ? opts.text : pct(value);
      svg.appendChild(txt);
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { meter.style.strokeDashoffset = off; }); });
    return svg;
  }

  function clamp(x) { return Math.max(0, Math.min(1, Number(x) || 0)); }

  function bar(value, color) {
    var span = el('span'); span.style.width = '0%';
    if (color) span.style.background = color;
    var wrap = el('div', { class: 'minibar' }, span);
    requestAnimationFrame(function () { requestAnimationFrame(function () { span.style.width = clamp(value) * 100 + '%'; }); });
    return wrap;
  }

  /* ---------- Confetti ---------- */
  function confetti(opts) {
    if (typeof window.confetti !== 'function') return;
    opts = opts || {};
    var colors = ['#f7b5d3', '#c9b6f5', '#a8e6cf', '#ffd6a5', '#a8d8f0', '#fdf2b6'];
    var count = opts.big ? 200 : 90;
    window.confetti({ particleCount: count, spread: opts.big ? 110 : 70, origin: { y: 0.6 }, colors: colors, scalar: 1.1 });
    if (opts.big) {
      setTimeout(function () { window.confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0 }, colors: colors }); }, 180);
      setTimeout(function () { window.confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1 }, colors: colors }); }, 320);
    }
  }

  /* ---------- Toast ---------- */
  function toast(msg, emoji) {
    var host = document.getElementById('toast-host');
    var t = el('div', { class: 'toast' }, [emoji ? el('span', { class: 'tem', text: emoji }) : null, el('span', { text: msg })]);
    host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, 2600);
  }

  /* ---------- Modal / sheet ---------- */
  function modal(title, contentNodes, opts) {
    opts = opts || {};
    var host = document.getElementById('modal-host');
    var sheet = el('div', { class: 'modal' });
    sheet.appendChild(el('div', { class: 'row between', style: 'margin-bottom:6px' }, [
      el('h3', { text: title }),
      el('button', { class: 'btn ghost sm', text: '✕', onclick: close })
    ]));
    (Array.isArray(contentNodes) ? contentNodes : [contentNodes]).forEach(function (n) { if (n) sheet.appendChild(n); });
    var scrim = el('div', { class: 'modal-scrim', onclick: function (e) { if (e.target === scrim) close(); } }, sheet);
    host.innerHTML = '';
    host.appendChild(scrim);
    function close() { scrim.style.animation = 'fade .2s reverse both'; sheet.style.transform = 'translateY(100%)'; setTimeout(function () { host.innerHTML = ''; }, 230); }
    return { close: close, sheet: sheet };
  }

  function field(label, inputNode) {
    return el('div', { class: 'field' }, [el('label', { text: label }), inputNode]);
  }
  function input(attrs) { return el('input', attrs || {}); }
  function segmented(options, value, onChange) {
    var wrap = el('div', { class: 'seg' });
    options.forEach(function (o) {
      var b = el('button', { class: o.value === value ? 'on' : '', text: o.label, type: 'button', onclick: function () {
        wrap.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on'); onChange(o.value);
      } });
      b.dataset.value = o.value;
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ---------- haptic (mobile) ---------- */
  function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms || 12); } catch (e) {} }

  window.UI = {
    el: el, money: money, moneyShort: moneyShort, pct: pct, fmtDate: fmtDate, fmtDay: fmtDay,
    ring: ring, bar: bar, confetti: confetti, toast: toast, modal: modal,
    field: field, input: input, segmented: segmented, clamp: clamp, buzz: buzz
  };
})();
