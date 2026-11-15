/* Food view: daily targets, body weight, water, meals (quick estimates), checklist, guidelines. */
window.FB = window.FB || {};
(() => {
  const h = FB.h, t = FB.t, L = FB.L;
  // Rough per-serving estimates (labelled "~"); user can edit numbers after adding.
  const QUICK = [
    { en: 'Whey, 1 scoop', vi: 'Whey, 1 muỗng', p: 24, kcal: 120 },
    { en: 'Chicken rice, 1 plate', vi: 'Cơm gà, 1 đĩa', p: 30, kcal: 650 },
    { en: 'Beef pho, 1 bowl', vi: 'Phở bò, 1 tô', p: 28, kcal: 480 },
    { en: 'Banh mi with egg', vi: 'Bánh mì trứng', p: 15, kcal: 400 },
    { en: 'Chicken breast 150 g', vi: 'Ức gà 150 g', p: 45, kcal: 250 },
    { en: '2 eggs', vi: '2 quả trứng', p: 12, kcal: 140 },
    { en: 'Milk 250 ml', vi: 'Sữa tươi 250 ml', p: 8, kcal: 150 },
    { en: 'Banana', vi: 'Chuối, 1 quả', p: 1, kcal: 100 },
  ];
  const CHK = ['protein', 'carbs', 'caffeine', 'veg', 'creatine', 'alcohol'];

  const bar = (label, val, [lo, hi], unit, fmt = (x) => Math.round(x)) => {
    const pct = Math.min(100, (val / hi) * 100);
    const cls = val >= lo && val <= hi * 1.1 ? 'ok' : val > hi * 1.1 ? 'over' : '';
    return h('div.target', h('div.t-top', h('span', label), h('strong', `${fmt(val)} / ${fmt(lo)}-${fmt(hi)} ${unit}`)),
      h('div.progress', h('div.p-fill', { className: 'p-fill ' + cls, style: { width: `${pct}%` } })));
  };

  FB.renderFood = (root) => {
    const d = FB.foodDate ||= FB.todayIso();
    const pf = FB.prog.profile;
    root.append(FB.dateNav(d, (nd) => { FB.foodDate = nd; FB.render(); }));
    const n = FB.nutriPeek(d) || { meals: [], chk: {}, water: 0 };
    const upd = (fn) => { const x = FB.nutri(d); fn(x); FB.stamp(x); FB.save(); FB.render(true); };
    const tot = FB.dayTotals(n);
    const training = !!FB.byDate[d];

    root.append(FB.section(`${t('targets')} · ${training ? '🏋 ' + t('trainingDay') : t('nonTrainingDay')}`,
      bar(t('kcal'), tot.kcal, pf.kcal, 'kcal'),
      bar(t('protein'), tot.p, pf.protein, 'g'),
      bar(t('water'), (n.water || 0) / 1000, pf.water, 'L', (x) => (+x).toFixed(1)),
      h('p.muted', `Carb ~${pf.carbs[0]}-${pf.carbs[1]} g · Fat ~${pf.fat[0]}-${pf.fat[1]} g · ${t('estimate')}`)));

    const wInp = FB.stepper(n.wt ?? null, 0.1, (v) => upd((x) => { x.wt = v; }), { placeholder: FB.avgOver(d, 7, FB.wt)?.toFixed(1) ?? pf.bw, label: t('bodyWeight'), max: 300 });
    const avg = FB.avgOver(d, 7, FB.wt);
    root.append(FB.section(null, FB.field(`⚖ ${t('bodyWeight')}`, wInp, avg ? `${t('avg7')}: ${avg.toFixed(1)} kg · ${pf.weightBand[0]}-${pf.weightBand[1]} kg` : null)));

    const addWater = (ml) => upd((x) => { x.water = Math.max(0, (x.water || 0) + ml); });
    root.append(FB.section(`💧 ${t('water')}: ${((n.water || 0) / 1000).toFixed(2)} L`,
      h('div.btn-row', h('button.btn', { onclick: () => addWater(-250) }, '−250'), h('button.btn.primary', { onclick: () => addWater(250) }, '+250 ml'),
        h('button.btn.primary', { onclick: () => addWater(500) }, '+500 ml'))));

    const txt = h('input', { type: 'text', placeholder: t('mealText') });
    const pIn = h('input.num', { type: 'number', inputMode: 'decimal', placeholder: `${t('protein')} g` });
    const kIn = h('input.num', { type: 'number', inputMode: 'decimal', placeholder: 'kcal' });
    const addMeal = (m) => upd((x) => { x.meals.push({ id: Date.now().toString(36), time: new Date().toTimeString().slice(0, 5), ...m }); });
    root.append(FB.section(`🍽 ${t('meals')} · ${Math.round(tot.p)} g ${t('protein')} · ${Math.round(tot.kcal)} kcal`,
      h('ul.meals', (n.meals || []).map((m, i) => h('li', h('div', h('small.muted', m.time || ''), ' ', m.text),
        h('span.nowrap', `${m.p || 0} g · ${m.kcal || 0}`),
        h('button.icon-btn.sm', { 'aria-label': t('delete'), onclick: () => upd((x) => { x.meals.splice(i, 1); }) }, '✕')))),
      h('div.meal-form', txt, h('div.btn-row', pIn, kIn, h('button.btn.primary', { onclick: () => {
        if (!txt.value.trim() && !pIn.value && !kIn.value) return;
        addMeal({ text: txt.value.trim(), p: +pIn.value || 0, kcal: +kIn.value || 0 });
      } }, '+'))),
      h('p.f-label', `${t('quickAdd')} (~, ${t('estimate')})`),
      h('div.chip-row.quick', QUICK.map((q) => h('button.chip.btn-chip', { onclick: () => addMeal({ text: L(q), p: q.p, kcal: q.kcal }) }, L(q))))));

    root.append(FB.section(`✅ ${t('checklist')}`, CHK.map((k) => {
      const c = h('input', { type: 'checkbox', checked: !!n.chk?.[k], onchange: () => { const x = FB.nutri(d); x.chk = { ...x.chk, [k]: c.checked }; FB.stamp(x); FB.save(); } });
      return h('label.chk', c, h('span', t('chk_' + k)));
    })));

    const note = h('textarea', { rows: 2, placeholder: t('note'), value: n.note || '', onchange: () => { const x = FB.nutri(d); x.note = note.value.trim(); FB.stamp(x); FB.save(); } });
    root.append(FB.section(null, note));

    root.append(FB.details(`📋 ${t('guidelines')}`, FB.prog.nutrition.map((r) =>
      h('div.guide-row', h('strong', L(r.area)), h('p', L(r.target)), h('small.muted', L(r.why))))));
  };
})();
