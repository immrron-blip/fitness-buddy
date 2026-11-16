/* Progress view: summary, lifts, weight trend, weekly check-in (readiness), baseline tests, monitoring. */
window.FB = window.FB || {};
(() => {
  const h = FB.h, t = FB.t, L = FB.L;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  const weightChart = (end) => {
    const days = 28, W = 320, H = 120, P = 6;
    const pts = [], avg = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = FB.addDays(end, -i), x = days - 1 - i;
      const w = FB.wt(d); if (w != null) pts.push([x, w]);
      const a = FB.avgOver(d, 7, FB.wt); if (a != null) avg.push([x, a]);
    }
    if (!pts.length) return h('p.muted', t('noData'));
    const band = FB.prog.profile.weightBand;
    const vals = [...pts.map((p) => p[1]), ...band];
    const lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5;
    const X = (x) => P + (x / (days - 1)) * (W - 2 * P), Y = (y) => H - P - ((y - lo) / (hi - lo)) * (H - 2 * P);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': t('weightTrend') });
    s.append(svg('rect', { x: P, y: Y(band[1]), width: W - 2 * P, height: Y(band[0]) - Y(band[1]), class: 'band' }));
    if (avg.length > 1) s.append(svg('polyline', { points: avg.map(([x, y]) => `${X(x)},${Y(y)}`).join(' '), class: 'avg' }));
    for (const [x, y] of pts) s.append(svg('circle', { cx: X(x), cy: Y(y), r: 2.5, class: 'pt' }));
    const last = avg[avg.length - 1];
    return h('div', s, h('p.muted', `${t('avg7')}: ${last ? last[1].toFixed(1) : '–'} kg · ${t('last28')} · ▭ ${band[0]}-${band[1]} kg`));
  };

  const liftRow = (name, start, best, target, goal) => {
    const pct = (v) => `${Math.min(100, (v / goal) * 100)}%`;
    return h('div.lift', h('div.t-top', h('strong', name), h('span', best ? `${FB.fmtKg(best)} kg` : '–')),
      h('div.progress.lift-bar', h('div.p-fill', { style: { width: pct(best || start) } }), h('i.mark', { style: { left: pct(start) } })),
      h('small.muted', `${t('baseline1rm')} ${start} · ${t('blockTarget')} ${target} · ${t('goal12')} ${goal} kg`));
  };

  const fmt = (v, d = 1) => (v == null ? '–' : (+v).toFixed(d).replace(/\.0+$/, ''));

  FB.renderProgress = (root) => {
    const p = FB.prog, pf = p.profile, today = FB.todayIso(), cw = FB.curWeek();
    const past = FB.sessions.filter((s) => s.date <= today);
    const done = past.filter((s) => FB.sessDone(s) > 0).length;
    const allDone = FB.sessions.filter((s) => FB.sessDone(s) > 0).length;
    root.append(FB.section(`📊 ${t('summary')}`, h('div.stats',
      h('div.stat', h('b', `${cw}/${p.weeks}`), h('small', t('currentWeek'))),
      h('div.stat', h('b', `${allDone}/${FB.sessions.length}`), h('small', t('sessionsDone'))),
      h('div.stat', h('b', past.length ? `${Math.round((done / past.length) * 100)}%` : '–'), h('small', t('adherence'))))));

    root.append(FB.section(`🏋 ${t('bestLifts')}`,
      liftRow(t('snatch'), pf.sn1rm, FB.bestLift('snatch'), pf.blockTargets.sn, pf.snGoal),
      liftRow(t('cj'), pf.cj1rm, FB.bestLift('cj'), pf.blockTargets.cj, pf.cjGoal)));

    const wa = FB.avgOver(today, 7, (d) => { const n = FB.nutriPeek(d); return n?.water ? n.water / 1000 : null; });
    const pa = FB.avgOver(today, 7, (d) => { const n = FB.nutriPeek(d); return n?.meals?.length ? FB.dayTotals(n).p : null; });
    root.append(FB.section(`⚖ ${t('weightTrend')}`, weightChart(today),
      h('div.stats', h('div.stat', h('b', wa ? `${wa.toFixed(1)} L` : '–'), h('small', t('avgWater'))),
        h('div.stat', h('b', pa ? `${Math.round(pa)} g` : '–'), h('small', t('avgProtein'))))));

    // weekly check-in
    const wk = FB.checkWeek ||= cw;
    const sum = FB.weekSummary(wk);
    const wsel = h('select', { onchange: () => { FB.checkWeek = +wsel.value; FB.render(true); }, 'aria-label': t('week') },
      Array.from({ length: p.weeks }, (_, i) => h('option', { value: i + 1, selected: i + 1 === wk }, `${t('week')} ${i + 1}`)));
    const wl = () => (FB.state.log.week[wk] ||= {});
    const updW = (patch) => { Object.assign(wl(), patch); FB.stamp(wl()); FB.save(); FB.render(true); };
    const note = h('textarea', { rows: 2, placeholder: t('note'), value: sum.note, onchange: () => updW({ note: note.value.trim() }) });
    const rows = [[t('sessionsDone'), `${sum.done}/${sum.planned}`], [t('adherence'), sum.adherence == null ? '–' : `${Math.round(sum.adherence * 100)}%`],
      [t('avgWeight'), sum.avgWt ? `${sum.avgWt.toFixed(1)} kg` : '–'], [t('snatch'), sum.bestSn ? `${FB.fmtKg(sum.bestSn)} kg` : '–'],
      [t('cj'), sum.bestCj ? `${FB.fmtKg(sum.bestCj)} kg` : '–'], [t('avgPain'), fmt(sum.pain)], [t('avgPainAm'), fmt(sum.painAm)],
      [t('energy'), fmt(sum.energy)], [t('technique'), fmt(sum.tech)]];
    root.append(FB.section(`🗓 ${t('weeklyCheck')}`, h('div.row-between', wsel, h('small.muted', `${t('weekEnding')} ${FB.fmtDate(sum.end)}`)),
      h('table.kv', rows.map(([k, v]) => h('tr', h('td', k), h('td', v)))),
      FB.field(t('sleep'), FB.stepper(sum.sleep, 0.25, (v) => updW({ sleep: v }), { placeholder: '7', max: 14, label: t('sleep') })),
      note,
      sum.ready ? h('div', { className: 'ready ' + sum.ready }, h('strong', `${t('readiness')}: ${t(sum.ready)}`), h('p', t('act_' + sum.ready)))
        : h('p.muted', t('needData'))));

    // baseline tests
    const base = FB.state.log.base;
    const root2 = FB.details(`🎯 ${t('baselineTests')}`, h('table.base', h('tr', h('th', ''), h('th', t('w1')), h('th', t('w12')), h('th', '')),
      p.baseline.map((b) => {
        const cur = base[b.id] || {};
        const inp = (k, ph) => { const i = h('input', { type: 'text', inputMode: 'decimal', value: cur[k] ?? '', placeholder: ph || '',
          onchange: () => { base[b.id] = FB.stamp({ ...(base[b.id] || {}), [k]: i.value.trim() }); FB.save(); } }); return i; };
        const bt = FB.btFor(b.test.en);
        return [h('tr.b-head', h('td', { colSpan: 4 }, h('div.bt-top', h('strong', L(b.test)),
            bt ? h('button.btn.sm', { onclick: () => FB.showBt(bt) }, `▶ ${t('btHowTo')}`) : null),
          h('small.muted.block', `${L(b.quality)} · ${L(b.protocol)}`))),
          h('tr', h('td', b.unit || ''), h('td', inp('w1', b.w1)), h('td', inp('w12')), h('td.muted', L(b.target)))];
      })));
    root.append(root2);
    if (FB.openBaseline) { FB.openBaseline = false; root2.open = true; requestAnimationFrame(() => root2.scrollIntoView({ block: 'start' })); }

    root.append(FB.details(`🚦 ${t('monitoring')}`, p.monitoring.map((m) => h('div.guide-row', h('strong', L(m.metric)), h('small.muted.block', L(m.how)),
      h('div.chip-row', h('span.chip.g', L(m.green)), h('span.chip.a', L(m.amber)), h('span.chip.r', L(m.red)))))));
    root.append(FB.details(`🩺 ${t('backCare')}`, p.backCare.map((b) => h('div.guide-row', h('strong', L(b.situation)), h('p', L(b.action)), h('small.muted', L(b.notes))))));
  };
})();
