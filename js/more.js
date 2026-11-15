/* More view: language, training maxes, program file, backup/restore, install, storage. */
window.FB = window.FB || {};
(() => {
  const h = FB.h, t = FB.t;

  FB.importProgram = async () => {
    const p = await FB.pickFile();
    if (p === null) return;
    if (!FB.isProgram(p)) return alert(t('badFile'));
    FB.setProgram(p); FB.toast(`${t('programLoaded')}: ${p.code}`); FB.go('today');
  };
  FB.exportBackup = async (share) => {
    const b = FB.backupObj(), name = FB.backupName();
    try { if (share) await FB.share(name, b); else FB.download(name, b); FB.markBackup(); FB.toast(`✓ ${name}`); FB.render(true); }
    catch (e) { if (e.name !== 'AbortError') alert(e.message); }
  };

  FB.renderMore = async (root) => {
    const p = FB.prog;
    const langBtn = (code, label) => h('button', { className: FB.state.lang === code ? 'on' : '', onclick: () => { FB.state.lang = code; FB.save(); FB.render(true); } }, label);
    root.append(FB.section(`🌐 ${t('language')}`, h('div.seg', langBtn('en', 'English'), langBtn('vi', 'Tiếng Việt'))));

    const last = FB.state.lastBackup;
    root.append(FB.section(`💾 ${t('backup')}`, h('p.muted', t('backupHint')),
      h('p', `${t('lastBackup')}: `, h('strong', last ? new Date(last).toLocaleString(FB.lang() === 'vi' ? 'vi-VN' : 'en-GB') : t('never'))),
      h('div.btn-col',
        navigator.share ? h('button.btn.primary.block', { onclick: () => FB.exportBackup(true) }, `📤 ${t('shareBackup')}`) : null,
        h('button.btn.block', { onclick: () => FB.exportBackup(false) }, `⬇ ${t('exportBackup')}`),
        h('button.btn.block', { onclick: async () => {
          const b = await FB.pickFile(); if (b === null) return;
          try { FB.restore(b, confirm(t('restoreMode'))); FB.toast(t('restored')); FB.render(); } catch { alert(t('badFile')); }
        } }, `♻ ${t('importBackup')}`))));

    const tmBox = h('div');
    for (const basis of Object.keys(p.tm)) {
      const over = FB.state.tm[basis];
      tmBox.append(h('div.tm-row', h('span', basis), FB.stepper(over ?? p.tm[basis], 2.5, (v) => {
        if (v == null || v === p.tm[basis]) delete FB.state.tm[basis]; else FB.state.tm[basis] = v; FB.save();
      }, { label: basis }), over != null ? h('small.muted', `(${p.tm[basis]})`) : null));
    }
    root.append(FB.details(`🏋 ${t('trainingMaxes')}`, h('p.muted', t('tmHint')), tmBox,
      h('button.btn.sm', { onclick: () => { FB.state.tm = {}; FB.save(); FB.render(true); } }, t('reset'))));

    root.append(FB.section(`📄 ${t('programFile')}`, h('p', h('strong', `${p.code} · `), FB.L(p.title)),
      h('small.muted.block', `${FB.fmtDate(p.start, { day: 'numeric', month: 'short', year: 'numeric' })} → ${FB.fmtDate(FB.end, { day: 'numeric', month: 'short', year: 'numeric' })} · ${p.generated || ''}`),
      h('button.btn.block', { onclick: FB.importProgram }, `📥 ${t('importProgram')}`)));

    let persisted = false;
    try { persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false; } catch { /* ignore */ }
    root.append(FB.section(`📱 ${t('install')}`, h('p', t('installIos')), h('p', t('installAndroid')),
      h('p.muted', `${t('storage')}: ${persisted ? '🔒 ' + t('persisted') : '⚠ ' + t('notPersisted')}`), h('p.muted', t('privacy'))));

    root.append(h('div.danger-zone', h('button.btn.danger.block', { onclick: () => { if (confirm(t('confirmClear'))) { FB.eraseAll(); FB.go('today'); } } }, t('clearAll')),
      h('p.muted.center', `${t('version')} ${FB.VERSION}`)));
  };
})();
