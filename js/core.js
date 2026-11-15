/* Core: storage, dates, program helpers, backup. */
window.FB = window.FB || {};
(() => {
  const KEY_STATE = 'fb.state.v1', KEY_PROG = 'fb.program.v1';
  FB.VERSION = '1.0.0';

  const blank = () => ({ v: 1, lang: 'en', tm: {}, lastBackup: null,
    log: { ex: {}, sess: {}, home: {}, nutri: {}, week: {}, base: {} } });

  FB.load = () => {
    let s;
    try { s = JSON.parse(localStorage.getItem(KEY_STATE)); } catch { s = null; }
    FB.state = Object.assign(blank(), s || {});
    FB.state.log = Object.assign(blank().log, FB.state.log || {});
    try { FB.prog = JSON.parse(localStorage.getItem(KEY_PROG)); } catch { FB.prog = null; }
    if (!s) FB.state.lang = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
    FB.index();
  };
  FB.save = () => { FB.state.updated = new Date().toISOString(); localStorage.setItem(KEY_STATE, JSON.stringify(FB.state)); };
  FB.setProgram = (p) => { localStorage.setItem(KEY_PROG, JSON.stringify(p)); FB.prog = p; FB.index(); };
  FB.eraseAll = () => { localStorage.removeItem(KEY_STATE); localStorage.removeItem(KEY_PROG); FB.load(); };

  /* ---------- dates (local, YYYY-MM-DD) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  FB.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  FB.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  FB.todayIso = () => FB.iso(new Date());
  FB.addDays = (s, n) => { const d = FB.parse(s); d.setDate(d.getDate() + n); return FB.iso(d); };
  FB.diffDays = (a, b) => Math.round((FB.parse(b) - FB.parse(a)) / 864e5);
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  FB.dow = (s) => FB.t(DAYS[FB.parse(s).getDay()]);
  FB.fmtDate = (s, opts = { day: 'numeric', month: 'short' }) =>
    FB.parse(s).toLocaleDateString(FB.lang() === 'vi' ? 'vi-VN' : 'en-GB', opts);
  FB.fmtLong = (s) => `${FB.dow(s)} ${FB.fmtDate(s)}`;

  /* ---------- program helpers ---------- */
  FB.index = () => {
    const p = FB.prog; FB.byDate = {}; FB.sessions = [];
    if (!p) return;
    for (const r of p.plan) (FB.byDate[r.date] ||= []).push(r);
    FB.sessions = Object.keys(FB.byDate).sort().map((d) => ({ date: d, wk: FB.byDate[d][0].wk, day: FB.byDate[d][0].day,
      phase: FB.byDate[d][0].phase, rows: FB.byDate[d] }));
    FB.end = FB.addDays(p.start, p.weeks * 7 - 1);
  };
  FB.weekOf = (iso) => { const n = FB.diffDays(FB.prog.start, iso); return Math.floor(n / 7) + 1; };
  FB.curWeek = () => Math.min(FB.prog.weeks, Math.max(1, FB.weekOf(FB.todayIso())));
  FB.weekStart = (wk) => FB.addDays(FB.prog.start, (wk - 1) * 7);
  FB.weekEnd = (wk) => FB.addDays(FB.prog.start, (wk - 1) * 7 + 6);
  FB.sessKey = (s) => `${s.wk}-${s.day}`;
  FB.tmVal = (basis) => (FB.state.tm[basis] ?? FB.prog.tm[basis]);
  FB.loadKg = (r) => {
    if (r.pct == null || !r.basis) return null;
    const tm = FB.tmVal(r.basis);
    return tm ? Math.round(tm * r.pct * 2) / 2 : null;
  };
  FB.fmtKg = (v) => (v == null || v === '' ? '' : (+v).toLocaleString(FB.lang() === 'vi' ? 'vi-VN' : 'en-GB', { maximumFractionDigits: 1 }));
  FB.restSec = (rest) => { const m = /(\d+(?:\.\d+)?)\s*(min|s)/.exec(rest || ''); return m ? Math.round(+m[1] * (m[2] === 'min' ? 60 : 1)) : 0; };
  FB.sessDone = (s) => s.rows.filter((r) => FB.state.log.ex[r.id]?.done).length;
  FB.sessComplete = (s) => FB.sessDone(s) >= Math.max(1, Math.round(0.6 * s.rows.length));

  /* best valid single per lift family, by week (null = all) */
  FB.bestLift = (g, wk = null) => {
    let best = null;
    for (const r of FB.prog.plan) {
      if (r.g !== g || (wk && r.wk !== wk)) continue;
      const l = FB.state.log.ex[r.id];
      if (l?.done && l.load > 0) best = Math.max(best ?? 0, +l.load);
    }
    return best;
  };

  /* ---------- nutrition helpers ---------- */
  FB.nutri = (d) => (FB.state.log.nutri[d] ||= { meals: [], chk: {}, water: 0 });
  FB.nutriPeek = (d) => FB.state.log.nutri[d];
  FB.dayTotals = (n) => (n?.meals || []).reduce((a, m) => ({ p: a.p + (+m.p || 0), kcal: a.kcal + (+m.kcal || 0) }), { p: 0, kcal: 0 });
  FB.avgOver = (endIso, days, fn) => {
    const v = [];
    for (let i = 0; i < days; i++) { const x = fn(FB.addDays(endIso, -i)); if (x != null && !isNaN(x)) v.push(+x); }
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  FB.wt = (d) => { const n = FB.nutriPeek(d); return n && n.wt > 0 ? +n.wt : null; };

  /* ---------- weekly check-in (mirrors Excel readiness formula) ---------- */
  FB.weekSummary = (wk) => {
    const ss = FB.sessions.filter((s) => s.wk === wk);
    const logged = ss.map((s) => FB.state.log.sess[FB.sessKey(s)] || {});
    const avg = (k) => { const v = logged.map((l) => l[k]).filter((x) => x !== undefined && x !== null && x !== ''); return v.length ? v.reduce((a, b) => a + +b, 0) / v.length : null; };
    const w = FB.state.log.week[wk] || {};
    const done = ss.filter((s) => FB.sessDone(s) > 0).length;
    const end = FB.weekEnd(wk);
    const sum = { wk, end, planned: ss.length, done, adherence: ss.length ? done / ss.length : null,
      avgWt: FB.avgOver(end, 7, FB.wt), bestSn: FB.bestLift('snatch', wk), bestCj: FB.bestLift('cj', wk),
      pain: avg('pain'), painAm: avg('painAm'), energy: avg('energy'), tech: avg('tech'), sleep: w.sleep ?? null, note: w.note || '' };
    const I = sum.pain, J = sum.painAm, K = sum.sleep, L = sum.energy, M = sum.tech, F = sum.adherence;
    if ([I, J, K, L, M].some((x) => x == null)) sum.ready = null;
    else if (I >= 5 || J >= 5 || L <= 1) sum.ready = 'red';
    else if (I >= 3 || J >= 3 || F < 0.67 || K < 6.5 || L <= 2) sum.ready = 'amber';
    else sum.ready = 'green';
    return sum;
  };

  /* ---------- backup ---------- */
  FB.backupObj = () => ({ app: 'fitness-buddy', kind: 'backup', schema: 1, code: FB.prog?.code, appVersion: FB.VERSION,
    exported: new Date().toISOString(), lang: FB.state.lang, tm: FB.state.tm, log: FB.state.log });
  FB.backupName = () => `${FB.prog?.code || 'FB'}_app_backup_${FB.todayIso()}.json`;
  FB.markBackup = () => { FB.state.lastBackup = new Date().toISOString(); FB.save(); };
  FB.restore = (b, merge) => {
    if (!b || b.app !== 'fitness-buddy' || b.kind !== 'backup' || !b.log) throw new Error('bad');
    if (!merge) { FB.state.log = Object.assign(blank().log, b.log); FB.state.tm = b.tm || {}; }
    else {
      for (const k of Object.keys(blank().log)) {
        const src = b.log[k] || {}, dst = FB.state.log[k];
        for (const id of Object.keys(src)) {
          const a = dst[id], c = src[id];
          dst[id] = !a ? c : ((c.t || '') > (a.t || '') ? c : a); // newest edit wins
        }
      }
      FB.state.tm = Object.assign({}, b.tm, FB.state.tm);
    }
    FB.save();
  };
  FB.isProgram = (p) => p && p.schema === 'fitness-buddy-program/1' && Array.isArray(p.plan) && p.start;
  FB.stamp = (o) => { o.t = new Date().toISOString(); return o; };
})();
