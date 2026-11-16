/* Today view: session by date, exercise logging, session check, home sessions, guide sheet. */
window.FB = window.FB || {};
(() => {
  const h = FB.h, t = FB.t, L = FB.L;

  FB.showGuide = (gid) => {
    const g = FB.prog.guide[gid]; if (!g) return;
    const used = {};
    for (const r of FB.prog.plan) if (r.g === gid) (used[r.day] ||= new Set()).add(r.wk);
    const usedTxt = ['Mon', 'Wed', 'Fri'].filter((d) => used[d]).map((d) => `${t(d.toLowerCase())}: ${t('wk')}${ranges([...used[d]])}`).join(' · ');
    FB.sheet(L(g.name), [
      h('img.guide-img', { src: g.img, alt: L(g.name), loading: 'lazy' }),
      g.group ? h('p.muted', L(g.group)) : null,
      usedTxt ? h('p.chip-row', h('span.chip', `${t('usedFor')}: ${usedTxt}`)) : null,
      h('h4', t('purpose')), h('p', L(g.purpose)),
      h('h4', t('steps')), h('p.pre', L(g.steps)),
      h('h4', t('cues')), h('p.pre', L(g.cues)),
      h('h4.warn-t', t('safety')), h('p.pre.warn-box', L(g.safety)),
    ]);
  };
  const ranges = (a) => { a.sort((x, y) => x - y); const o = []; let s = a[0];
    for (let i = 0; i < a.length; i++) if (a[i + 1] !== a[i] + 1) { o.push(s === a[i] ? `${s}` : `${s}-${a[i]}`); s = a[i + 1]; } return o.join(','); };

  // Exercise families where a kg number is not meaningful (jumps, sprints, core, mobility, med-ball).
  const NO_LOAD = new Set(['box_jump', 'cmj', 'depth', 'broad', 'hop', 'mb_scoop', 'mb_oh', 'sprint', 'pallof', 'side_core',
    'deadbug', 'sl_stance', 'ankle', 'goblet', 'hip_mob']);

  const exCard = (r, onProgress) => {
    const log = FB.state.log.ex;
    const cur = () => log[r.id] || {};
    const upd = (patch) => { log[r.id] = FB.stamp({ ...cur(), ...patch }); FB.save(); onProgress(); };
    const planned = FB.loadKg(r);
    const g = r.g && FB.prog.guide[r.g];
    const isTest = !r.g;
    const showLoad = !isTest && !NO_LOAD.has(r.g);
    const meta = [h('span.chip', r.sr)];
    if (planned != null) meta.push(h('span.chip.load', `${FB.fmtKg(planned)} kg`, h('small', ` ${Math.round(r.pct * 100)}%`)));
    if (r.rpe) meta.push(h('span.chip', /\d/.test(r.rpe) ? `RPE ${r.rpe}` : r.rpe));
    if (r.rest) meta.push(h('span.chip', `⏱ ${r.rest}`));
    const card = h('article.ex', { className: 'ex' + (cur().done ? ' done' : '') });
    const check = h('button.check', { 'aria-label': t('markDone'), 'aria-pressed': String(!!cur().done), onclick: () => {
      const d = !cur().done;
      const patch = { done: d, date: d ? FB.viewDate : null };
      if (d && cur().load == null && planned != null && showLoad) { patch.load = planned; loadBox.querySelector('input').value = planned; }
      upd(patch); card.classList.toggle('done', d); check.setAttribute('aria-pressed', String(d));
    } }, '✓');
    const loadBox = FB.stepper(cur().load, 2.5, (v) => upd({ load: v }), { placeholder: planned ?? '', label: t('actual') });
    const rpeSel = h('select.rpe', { 'aria-label': t('rpe'), onchange: () => upd({ rpe: rpeSel.value ? +rpeSel.value : null }) },
      h('option', { value: '' }, 'RPE'), [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => h('option', { value: v, selected: cur().rpe === v }, String(v))));
    const note = h('input.note', { type: 'text', placeholder: t('note'), value: cur().note || '', onchange: () => upd({ note: note.value.trim() }) });
    card.append(
      h('div.ex-head', check,
        h('div.ex-title', h('strong', L(r.ex)), h('div.chip-row', meta)),
        g ? h('button.thumb', { onclick: () => FB.showGuide(r.g), 'aria-label': t('guide') }, h('img', { src: g.img, alt: '', loading: 'lazy' }), h('span', t('guide'))) : null),
      r.notes ? h('p.ex-note', L(r.notes)) : null,
      isTest ? h('div.ex-log', FB.btSession(r) ? FB.btSessionCard(FB.btSession(r))
        : h('button.btn.primary.block', { onclick: () => { FB.openBaseline = true; FB.go('progress'); } }, `🎯 ${t('baselineTests')} →`), note) :
      h('div.ex-log',
        showLoad ? h('div.ex-log-row', h('span.f-label', t('actual')), loadBox) : null,
        h('div.ex-log-row', rpeSel, FB.restSec(r.rest) ? h('button.btn.sm', { onclick: () => FB.startTimer(FB.restSec(r.rest)) }, `⏱ ${r.rest}`) : null),
        note));
    return card;
  };

  const sessionCheck = (s) => {
    const key = FB.sessKey(s);
    const cur = () => FB.state.log.sess[key] || {};
    const upd = (patch) => { FB.state.log.sess[key] = FB.stamp({ ...cur(), date: s.date, ...patch }); FB.save(); };
    const note = h('textarea', { rows: 2, value: cur().note || '', placeholder: t('sessionNote'), onchange: () => upd({ note: note.value.trim() }) });
    return FB.section(t('sessionCheck'),
      FB.field(t('painDuring'), FB.scale(0, 10, cur().pain ?? null, (v) => upd({ pain: v }), 'pain')),
      FB.field(t('painAm'), FB.scale(0, 10, cur().painAm ?? null, (v) => upd({ painAm: v }), 'pain'), t('painAmHint')),
      FB.field(t('energy'), FB.scale(1, 5, cur().energy ?? null, (v) => upd({ energy: v }))),
      FB.field(t('technique'), FB.scale(1, 5, cur().tech ?? null, (v) => upd({ tech: v }))),
      note);
  };

  FB.homeCard = (wk) => {
    const groups = {};
    for (const r of FB.prog.home) (groups[r.session.en] ||= []).push(r);
    return FB.details(`🏠 ${t('homeOptional')}`, h('p.muted', t('homeNote')),
      Object.values(groups).map((rows) => {
        const code = rows[0].session.en.split(' ')[0];
        const key = `${wk}-${code}`;
        const box = h('input', { type: 'checkbox', checked: !!FB.state.log.home[key], onchange: () => {
          if (box.checked) FB.state.log.home[key] = FB.viewDate || FB.todayIso(); else delete FB.state.log.home[key]; FB.save(); } });
        return h('div.home-group', h('label.home-head', box, h('strong', L(rows[0].session)), h('small.muted', ` · ${t('doneThisWeek')}`)),
          h('ul.home-list', rows.map((r) => h('li', { onclick: () => r.g && FB.showGuide(r.g) },
            h('span', L(r.ex)), h('span.chip', L(r.dose)), h('small.muted.block', L(r.cue))))));
      }));
  };

  FB.renderToday = (root) => {
    const d = FB.viewDate ||= FB.todayIso();
    root.append(FB.dateNav(d, (nd) => { FB.viewDate = nd; FB.render(); }));
    const rows = FB.byDate[d];
    if (!rows) {
      const p = FB.prog;
      const next = FB.sessions.find((s) => s.date > d);
      if (d < p.start) root.append(FB.section(`${t('beforeStart')}: ${FB.fmtLong(p.start)}`, h('p', L(p.title))));
      else if (d > FB.end) root.append(FB.section(t('afterEnd'), h('p', L(p.title))));
      else root.append(FB.section(`😴 ${t('restDay')}`, h('p', t('restDayMsg'))));
      if (next) root.append(FB.section(t('nextSession'),
        h('button.btn.block', { onclick: () => { FB.viewDate = next.date; FB.render(); } },
          `${t('week')} ${next.wk} · ${FB.fmtLong(next.date)} · ${L(next.phase)} →`),
        h('ul.mini', next.rows.map((r) => h('li', L(r.ex))))));
      if (d >= p.start && d <= FB.end) root.append(FB.homeCard(FB.weekOf(d)));
      return;
    }
    const s = FB.sessions.find((x) => x.date === d);
    const prog = h('div.progress', h('div.p-fill'));
    const progTxt = h('span');
    const onProgress = () => { const n = FB.sessDone(s); prog.firstChild.style.width = `${(n / s.rows.length) * 100}%`; progTxt.textContent = `${n} ${t('of')} ${s.rows.length} ${t('exercisesDone')}`; };
    root.append(h('section.card.sess-head',
      h('div.sess-title', h('h2', `${t('week')} ${s.wk} · ${t(s.day.toLowerCase())}`), h('span.badge', L(s.phase))),
      prog, progTxt, h('p.warn-sm', '⚠ ', t('backCareWarn'))));
    s.rows.forEach((r) => root.append(exCard(r, onProgress)));
    onProgress();
    root.append(sessionCheck(s));
  };
})();
