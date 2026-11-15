/* UI helpers: DOM builder, toast, sheet modal, rest timer, file I/O. */
window.FB = window.FB || {};
(() => {
  /* h('div.card#id', {onclick, ...attrs}, ...children) */
  FB.h = (sel, attrs, ...kids) => {
    const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, t, v) => (t === '.' ? el.classList.add(v) : (el.id = v)));
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k in el && k !== 'list' && k !== 'type') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    const add = (c) => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : document.createTextNode(String(c))); };
    kids.forEach(add);
    return el;
  };
  const h = FB.h;

  FB.toast = (msg, ms = 1800) => {
    const t = h('div.toast', msg); document.body.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
  };

  /* bottom sheet modal */
  FB.sheet = (title, body, { onClose } = {}) => {
    let open = true;
    const hide = () => { if (!open) return; open = false; window.removeEventListener('popstate', hide);
      wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 250); onClose && onClose(); };
    const close = () => { if (history.state?.sheet) history.back(); else hide(); };
    const wrap = h('div.sheet-wrap', { onclick: (e) => e.target === wrap && close() },
      h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('div.sheet-head', h('h2', title), h('button.icon-btn', { onclick: close, 'aria-label': FB.t('close') }, '✕')),
        h('div.sheet-body', body)));
    document.body.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    history.pushState({ sheet: 1 }, '');
    window.addEventListener('popstate', hide);
    return close;
  };

  /* number input with − / + stepper */
  FB.stepper = (value, step, onChange, { min = 0, max = 9999, placeholder = '', label = '' } = {}) => {
    const inp = h('input.num', { type: 'number', inputMode: 'decimal', step: 'any', value: value ?? '', placeholder, 'aria-label': label,
      onchange: () => onChange(inp.value === '' ? null : +inp.value) });
    const bump = (d) => { const v = Math.min(max, Math.max(min, Math.round(((+inp.value || +placeholder || 0) + d) * 100) / 100)); inp.value = v; onChange(v); };
    return h('div.stepper', h('button', { type: 'button', onclick: () => bump(-step), 'aria-label': '−' }, '−'), inp,
      h('button', { type: 'button', onclick: () => bump(step), 'aria-label': '+' }, '+'));
  };

  /* segmented scale e.g. 0-10 or 1-5 */
  FB.scale = (from, to, value, onChange, cls = '') => {
    const row = h('div.scale' + (cls ? '.' + cls : ''));
    for (let i = from; i <= to; i++) {
      const b = h('button', { type: 'button', className: value === i ? 'on' : '', onclick: () => {
        const nv = value === i ? null : i; value = nv;
        row.querySelectorAll('button').forEach((x, j) => x.classList.toggle('on', from + j === nv)); onChange(nv);
      } }, String(i));
      row.append(b);
    }
    return row;
  };

  /* rest timer (persistent bar) */
  let timer = null;
  FB.startTimer = (sec) => {
    FB.stopTimer();
    if (!sec) return;
    const end = Date.now() + sec * 1000;
    const label = h('span.t-time'); const bar = h('div.t-fill');
    const el = h('div.timer', h('div.t-bar', bar), h('span', '⏱'), label,
      h('button', { onclick: () => { timer.end += 30000; } }, '+30s'), h('button', { onclick: FB.stopTimer }, FB.t('skip')));
    document.body.append(el);
    timer = { el, end, total: sec * 1000, id: setInterval(tick, 250) };
    function tick() {
      const left = Math.max(0, timer.end - Date.now());
      const s = Math.ceil(left / 1000);
      label.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      bar.style.width = `${Math.min(100, (left / timer.total) * 100)}%`;
      if (left <= 0) { navigator.vibrate && navigator.vibrate([300, 150, 300]); FB.toast(FB.t('timerDone'), 2500); FB.stopTimer(); }
    }
    tick();
  };
  FB.stopTimer = () => { if (timer) { clearInterval(timer.id); timer.el.remove(); timer = null; } };

  /* files */
  FB.pickFile = (accept = '.json,application/json') => new Promise((res) => {
    const i = h('input', { type: 'file', accept, style: { display: 'none' } });
    i.onchange = async () => { const f = i.files[0]; i.remove(); if (!f) return res(null); try { res(JSON.parse(await f.text())); } catch { res(undefined); } };
    document.body.append(i); i.click();
  });
  FB.download = (name, obj) => {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  FB.share = async (name, obj) => {
    const file = new File([JSON.stringify(obj)], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
    FB.download(name, obj); return false;
  };

  FB.section = (title, ...kids) => h('section.card', title ? h('h3', title) : null, ...kids);
  FB.details = (title, ...kids) => h('details.card', h('summary', title), h('div.det-body', ...kids));
  FB.field = (label, input, hint) => h('label.field', h('span.f-label', label), input, hint ? h('small.hint', hint) : null);
  FB.dateNav = (iso, onChange) => {
    const inp = h('input.date-inp', { type: 'date', value: iso, onchange: () => inp.value && onChange(inp.value), 'aria-label': 'date' });
    return h('div.date-nav',
      h('button.icon-btn', { onclick: () => onChange(FB.addDays(iso, -1)), 'aria-label': 'previous day' }, '‹'),
      h('div.date-mid', h('strong', FB.fmtLong(iso) + (iso === FB.todayIso() ? ` · ${FB.t('today')}` : '')), inp),
      h('button.icon-btn', { onclick: () => onChange(FB.addDays(iso, 1)), 'aria-label': 'next day' }, '›'));
  };
})();
