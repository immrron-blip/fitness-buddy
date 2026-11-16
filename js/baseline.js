/* Baseline test guide: animated how-to sheets, test-day list with result inputs. Data: js/bt-data.js (FB.BT). */
window.FB = window.FB || {};
(() => {
  const h = FB.h, t = FB.t, L = FB.L;

  FB.btSession = (r) => FB.BT && r && r.ex && FB.BT.sessions.find((s) => r.ex.en.startsWith(s.prefix));
  FB.btFor = (testEn) => FB.BT && Object.keys(FB.BT.tests).find((id) => FB.BT.tests[id].match.some((m) => m[0] === testEn));
  FB.btRows = (id) => FB.BT.tests[id].match
    .map(([en, se, sv]) => ({ b: FB.prog.baseline.find((x) => x.test.en === en), label: { en: se, vi: sv } }))
    .filter((x) => x.b);

  FB.showBtRules = () => FB.sheet(t('btRules'), h('ol.bt-rules', FB.BT.general[FB.lang()].map((s) => h('li', s))));

  FB.showBt = (id, list) => {
    const x = FB.BT.tests[id];
    const i = list ? list.indexOf(id) : -1;
    const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
    const sec = (title, txt) => [h('h4', title), h('p.pre', L(txt))];
    const close = FB.sheet(`${i >= 0 ? `${i + 1}/${list.length} · ` : ''}${L(x.name)}`, [
      h('img.guide-img.bt-gif', { src: x.gif, alt: L(x.name) }),
      h('p.muted', L(x.what)),
      sec(`🧰 ${t('btEquip')}`, x.equip),
      sec(`👣 ${t('steps')}`, x.steps),
      sec(`📏 ${t('btMeasure')}`, x.measure),
      x.still ? h('img.guide-img', { src: x.still, alt: '', loading: 'lazy' }) : null,
      h('h4.warn-t', `✗ ${t('btInvalid')}`), h('p.pre.warn-box', L(x.invalid)),
      sec(`⚠ ${t('safety')}`, x.safety),
      next ? h('button.btn.primary.block.center', { onclick: () => { close(); setTimeout(() => FB.showBt(next, list), 320); } },
        `${t('btNext')}: ${L(FB.BT.tests[next].name)} →`) : null,
    ]);
  };

  FB.btInput = (b, col) => {
    const base = FB.state.log.base;
    const cur = base[b.id] || {};
    const lr = b.test.en.includes('(L / R)');
    const inp = h('input.bt-in', { type: 'text', inputMode: lr ? 'text' : 'decimal', value: cur[col] ?? '',
      placeholder: col === 'w12' && cur.w1 ? `W1: ${cur.w1}` : (lr ? 'L / R' : b.unit || ''), 'aria-label': L(b.test),
      onchange: () => { base[b.id] = FB.stamp({ ...(base[b.id] || {}), [col]: inp.value.trim() }); FB.save(); FB.toast(`✓ ${t('saved')}`); } });
    return inp;
  };

  FB.btSessionCard = (s) => h('div.bt-list',
    h('div.btn-row', h('button.btn', { onclick: FB.showBtRules }, `📋 ${t('btRules')}`),
      h('button.btn.primary', { onclick: () => FB.showBt(s.tests[0], s.tests) }, `▶ ${t('btStart')}`)),
    s.tests.map((id, n) => {
      const x = FB.BT.tests[id];
      return h('div.bt-item',
        h('div.bt-top', h('strong', `${n + 1}. ${L(x.name)}`),
          h('button.btn.sm', { onclick: () => FB.showBt(id, s.tests) }, `▶ ${t('btHowTo')}`)),
        FB.btRows(id).map(({ b, label }) => h('label.bt-row', h('span', L(label)), FB.btInput(b, s.col))));
    }));
})();
