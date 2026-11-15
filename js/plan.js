/* Plan view: week selector, phase info, sessions of the week, exercise library. */
window.FB = window.FB || {};
(() => {
  const h = FB.h, t = FB.t, L = FB.L;

  const phaseFor = (wk) => FB.prog.phases.find((p) => {
    const [a, b] = String(p.weeks).split('-').map(Number); return wk >= a && wk <= (b || a);
  });

  FB.renderPlan = (root) => {
    const p = FB.prog;
    const wk = FB.planWeek ||= FB.curWeek();
    const cw = FB.curWeek();
    const chips = h('div.week-chips', { role: 'tablist' });
    for (let i = 1; i <= p.weeks; i++) {
      const ss = FB.sessions.filter((s) => s.wk === i);
      const allDone = ss.length && ss.every(FB.sessComplete);
      chips.append(h('button', { className: (i === wk ? 'on ' : '') + (i === cw ? 'cur ' : '') + (allDone ? 'ok' : ''),
        role: 'tab', 'aria-selected': String(i === wk), onclick: () => { FB.planWeek = i; FB.render(); } }, `${t('wk')}${i}`));
    }
    root.append(chips);
    requestAnimationFrame(() => chips.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }));

    const ph = phaseFor(wk);
    root.append(h('section.card',
      h('div.sess-title', h('h2', `${t('week')} ${wk}`), h('span.muted', `${FB.fmtDate(FB.weekStart(wk))} – ${FB.fmtDate(FB.weekEnd(wk))}`)),
      ph ? [h('p', h('span.badge', L(ph.name))), h('p', L(ph.objective)), h('p.muted', L(ph.execution))] : null));

    for (const s of FB.sessions.filter((x) => x.wk === wk)) {
      const n = FB.sessDone(s);
      root.append(h('section.card.day-card', { onclick: () => { FB.viewDate = s.date; FB.go('today'); } },
        h('div.sess-title', h('h3', `${t(s.day.toLowerCase())} · ${FB.fmtDate(s.date)}`),
          h('span', { className: 'badge ' + (FB.sessComplete(s) ? 'ok' : n ? 'part' : '') }, `${n}/${s.rows.length}`)),
        h('ul.plan-list', s.rows.map((r) => {
          const kg = FB.loadKg(r), lg = FB.state.log.ex[r.id];
          return h('li', { className: lg?.done ? 'done' : '' }, h('span', L(r.ex)),
            h('span.muted.nowrap', r.sr + (kg != null ? ` · ${FB.fmtKg(kg)} kg` : '')));
        })), h('div.go', '›')));
    }
    root.append(FB.homeCard(wk));

    const lib = FB.details(`📘 ${t('guide')} (${Object.keys(p.guide).length})`);
    const body = lib.querySelector('.det-body');
    let grp = null;
    for (const [id, g] of Object.entries(p.guide)) {
      if (g.group && L(g.group) !== grp) { grp = L(g.group); body.append(h('h4', grp)); }
      body.append(h('button.lib-item', { onclick: () => FB.showGuide(id) }, h('img', { src: g.img, alt: '', loading: 'lazy' }), h('span', L(g.name))));
    }
    root.append(lib);
  };
})();
