/* App shell: routing, header, tab bar, welcome screen, backup reminder, service worker. */
window.FB = window.FB || {};
(() => {
  const h = FB.h, t = FB.t;
  const TABS = [['today', '📅'], ['plan', '🗂'], ['food', '🍽'], ['progress', '📈'], ['more', '⚙']];
  const VIEWS = { today: () => FB.renderToday, plan: () => FB.renderPlan, food: () => FB.renderFood, progress: () => FB.renderProgress, more: () => FB.renderMore };

  FB.route = () => { const r = location.hash.replace(/^#\/?/, ''); return VIEWS[r] ? r : 'today'; };
  FB.go = (r) => { if (FB.route() === r) FB.render(); else location.hash = '#/' + r; };

  const welcome = (root) => {
    root.append(h('section.card.welcome', h('img', { src: 'icons/icon-192.png', alt: '', width: 72, height: 72 }),
      h('h2', `${t('welcome')} 👋`), h('p', t('welcomeMsg')), h('p.muted', t('privacy')),
      h('button.btn.primary.block', { onclick: FB.importProgram }, `📥 ${t('importProgram')}`),
      h('div.seg', ['en', 'vi'].map((c) => h('button', { className: FB.state.lang === c ? 'on' : '', onclick: () => { FB.state.lang = c; FB.save(); FB.render(); } }, c === 'en' ? 'English' : 'Tiếng Việt')))));
  };

  const backupBanner = () => {
    if (FB.route() === 'more') return null;
    const lg = FB.state.log;
    const dates = [...Object.keys(lg.nutri), ...Object.values(lg.ex).map((e) => e.date).filter(Boolean)].sort();
    if (!dates.length) return null;
    const last = FB.state.lastBackup ? FB.iso(new Date(FB.state.lastBackup)) : null;
    const since = last || dates[0];
    if (FB.diffDays(since, FB.todayIso()) < 7) return null;
    return h('div.banner', h('span', `💾 ${t('backupDue')}`), h('button.btn.sm.primary', { onclick: () => FB.exportBackup(!!navigator.share) }, t('backupNow')));
  };

  FB.render = async (keepScroll = false) => {
    const y = window.scrollY;
    const r = FB.route();
    document.documentElement.lang = FB.lang();
    const head = document.getElementById('head'), view = document.getElementById('view'), nav = document.getElementById('tabs');
    head.replaceChildren(h('div.brand', h('img', { src: 'icons/icon-192.png', alt: '' }), h('span', FB.prog ? `${FB.prog.code}` : t('appName'))),
      h('h1', FB.prog ? t(r) : t('appName')),
      h('button.lang-btn', { 'aria-label': t('language'), onclick: () => { FB.state.lang = FB.lang() === 'en' ? 'vi' : 'en'; FB.save(); FB.render(true); } }, FB.lang() === 'en' ? 'VI' : 'EN'));
    view.replaceChildren();
    nav.replaceChildren(...TABS.map(([k, ic]) => h('a', { href: '#/' + k, className: k === r ? 'on' : '', 'aria-current': k === r ? 'page' : null },
      h('span.ic', ic), h('span', t(k)))));
    nav.hidden = !FB.prog;
    if (!FB.prog) { welcome(view); return; }
    const b = backupBanner(); if (b) view.append(b);
    try { await VIEWS[r]()(view); } catch (e) { console.error(e); view.append(h('p.warn-box', String(e))); }
    window.scrollTo(0, keepScroll ? y : 0);
  };

  window.addEventListener('hashchange', () => FB.render());
  document.addEventListener('visibilitychange', () => {
    // a new day while the app stayed open: jump "today" forward
    if (document.visibilityState === 'visible' && FB.openedOn !== FB.todayIso()) { FB.openedOn = FB.todayIso(); FB.viewDate = FB.foodDate = null; FB.render(); }
  });

  FB.load();
  FB.openedOn = FB.todayIso();
  FB.render();
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            document.body.append(h('div.banner.update', h('span', t('updateReady')), h('button.btn.sm.primary', { onclick: () => location.reload() }, t('reload'))));
          }
        });
      });
    }).catch(() => {});
  }
})();
