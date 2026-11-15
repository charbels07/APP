// Accessibility check of the web version (WCAG 2.2 level AA), with axe-core and Playwright.
// Opens the main screens of the demo build (welcome, try-it board, sign-up, set-up and its last board, board, panels,
// caregiver mode, word editor, settings, back office) and lists what breaks a rule, a screen wider
// than its window included. Run it through `npm run test:a11y`.
// Locales: en-GB (every screen), ar-LB and fr-FR (welcome, try-it board, back office, board; in
// French also the board at the end of the set-up).
// Needs Playwright on the machine (it is not a dependency of the app).
// Usage: node scan.js [port] [locale] [width] [height] [tag]
const { chromium } = require('playwright');
const fs = require('fs');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const { sideways } = require('./sideways');
/** Where screenshots and results go: outside the project. */
const OUT = process.env.A11Y_OUT || require('path').join(require('os').tmpdir(), 'a11y-check');
const [port = '8770', locale = 'en-GB', W = '1180', H = '900', tag = 'en-desk'] = process.argv.slice(2);
const L = {
  'en-GB': { bo: 'Back office (demonstration)', openApp: 'Open the app', cont: 'Continue', create: 'Create my account', parent: /Parent/, pro: /Professional/, name: 'Your name', email: 'Email address', pw: 'Password', verify: 'Verify', caregiver: 'Caregiver', settings: 'Settings', guide: 'Guide', search: 'Search', keyboard: 'Keyboard', boards: 'Boards', schedule: 'Schedule', timer: 'Timer', help: 'Help', model: 'Model', have: 'I already have an account', tabs: ['Team', 'Progress', 'Account'], record: 'Record the pronunciation', done: 'Done', tryIt: /Try it first/, finish: 'Finish' },
  'ar-LB': { bo: 'لوحة الإدارة (عرض تجريبي)', openApp: 'فتح التطبيق', tryIt: /جرّب أولاً/ },
  // French has the longest names of the three languages: scanned on the very narrow screen.
  'fr-FR': { bo: 'Back-office (démonstration)', openApp: 'Ouvrir l’application', tryIt: /Essayer d’abord/, signUp: 'Créer un compte', parent: /Parent ou aidant/, create: 'Créer mon compte', codeIs: /Votre code est/, verify: 'Vérifier', cont: 'Continuer', finish: 'Terminer' },
}[locale];
const results = [];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, locale });
  const p = await ctx.newPage();
  p.setDefaultTimeout(12000);
  const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  const scan = async (screen) => {
    await p.waitForTimeout(500);
    await p.evaluate(axeSrc);
    const r = await p.evaluate(async () => {
      const out = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations', 'incomplete'] });
      const pick = (v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((x) => ({ html: x.html.slice(0, 180), why: (x.failureSummary || '').replace(/\s+/g, ' ').slice(0, 220), target: String(x.target[0]).slice(0, 80) })) });
      return { violations: out.violations.map(pick), incomplete: out.incomplete.map((v) => ({ id: v.id, n: v.nodes.length })) };
    });
    const extra = await p.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const noRole = [...document.querySelectorAll('[aria-label]:not([role])')].filter((e) => !['INPUT', 'TEXTAREA', 'IMG', 'BUTTON', 'A', 'SELECT'].includes(e.tagName) && vis(e)).map((e) => e.getAttribute('aria-label').slice(0, 40));
      const small = [...document.querySelectorAll('[role=button],[role=tab],[role=radio],[role=checkbox],[role=switch],[role=link],a,button,input')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), n: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30) }; }).filter((x) => x.w < 24 || x.h < 24);
      return { noRole: [...new Set(noRole)].slice(0, 12), noRoleN: noRole.length, small: small.slice(0, 10), lang: document.documentElement.lang, title: document.title };
    });
    Object.assign(extra, await p.evaluate(sideways));
    results.push({ screen, ...r, extra });
    // Wider than the window (WCAG 1.4.10): a rule break like the others, so the run fails on it.
    const found = [...r.violations.map((v) => `${v.id}(${v.n})`), ...(extra.overflowX > 0 ? [`wider than the screen (${extra.overflowX} px: ${extra.overflowBy})`] : [])];
    console.log(`${tag} · ${screen}: ${found.length ? found.join(', ') : 'no violation'}`);
    await p.screenshot({ path: `${OUT}/${tag}-${screen}.png` });
  };
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.log(`${tag} · ${name}: SKIPPED (${e.message.split('\n')[0].slice(0, 110)})`); } };
  const btn = (n, exact = true) => p.getByRole('button', { name: n, exact }).first();
  // From a question of the set-up to its last screen: the board to try, with "Finish" in its banner.
  const toSetupBoard = async () => { for (let i = 0; i < 25 && !(await btn(L.finish).count()); i++) { await btn(L.cont).last().click(); await p.waitForTimeout(350); } await btn(L.finish).waitFor(); await p.waitForTimeout(1500); };
  const centerOf = (word) => p.evaluate((w) => { const e = [...document.querySelectorAll('*')].find((x) => x.children.length === 0 && x.textContent.trim() === w); if (!e) return null; const r = (e.closest('[role="button"]') || e).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, word);
  fs.mkdirSync(OUT, { recursive: true });

  await p.goto(`http://localhost:${port}/`);
  await p.getByRole('button').first().waitFor();
  await scan('01-welcome');
  // The try-it board (its banner sits above the board), then the caregiver code keypad on it (the
  // team account used further down is never asked the code).
  await step('15b-try-it', async () => {
    await p.getByRole('button', { name: L.tryIt }).click(); await p.waitForTimeout(2000); await scan('15b-try-it-board');
    if (locale === 'en-GB') await step('16-pin', async () => { await btn(L.caregiver).click(); await p.waitForTimeout(400); await scan('16-pin'); });
  });
  await p.goto(`http://localhost:${port}/`); await p.getByRole('button').first().waitFor();
  if (locale === 'en-GB') {
    await step('02-role', async () => { await btn('Sign up').click(); await p.getByText('Who are you').first().waitFor().catch(() => {}); await scan('02-role'); });
    await step('03-signup', async () => { await p.getByText(L.parent).first().click(); await p.getByLabel(L.email).waitFor(); await scan('03-signup'); });
    await step('04-code', async () => {
      await p.getByLabel(L.name).fill('Rita'); await p.getByLabel(L.email).fill('rita@example.com'); await p.getByLabel(L.pw, { exact: true }).fill('secret123');
      await p.getByRole('button', { name: L.create }).last().click(); await p.getByText(/Your code is/).first().waitFor(); await scan('04-code');
      const code = (await p.getByText(/Your code is/).first().textContent()).match(/\d{6}/)[0];
      await p.getByLabel('Code', { exact: true }).fill(code); await btn(L.verify).click(); await p.waitForTimeout(1500); await scan('05-setup-child');
    });
    // The languages, then which Arabic (asked only once Arabic is ticked).
    await step('05b-languages', async () => {
      await p.getByLabel('Child’s first name').fill('Adam'); await btn('Continue').click(); await p.getByText('Communication languages').first().waitFor(); await scan('05b-setup-languages');
      // The "?" beside the question: its explanation, with the part of the guide.
      await p.getByRole('button', { name: /^Explain: / }).click(); await p.getByRole('dialog').waitFor(); await scan('05d-setup-help'); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.getByRole('checkbox', { name: /Arabic/ }).click(); await btn('Continue').click(); await p.getByText('Which Arabic?').first().waitFor(); await scan('05c-setup-arabic');
    });
    // The end of the set-up: the board to try before "Finish" (a banner above the board).
    await step('05e-setup-board', async () => { await p.getByRole('radio', { name: /^Lebanese/ }).first().click(); await toSetupBoard(); await scan('05e-setup-board'); });
    await p.evaluate(() => localStorage.removeItem('caa.session.v1')); await p.reload(); await p.getByRole('button').first().waitFor();
  }
  if (locale === 'fr-FR') {
    // In French only that last board of the set-up, reached the short way (nothing scanned before it).
    await step('05e-setup-board', async () => {
      await btn(L.signUp).click(); await p.getByText(L.parent).first().click();
      await p.getByRole('textbox').nth(1).waitFor(); await p.getByRole('textbox').nth(0).fill('Rita'); await p.getByRole('textbox').nth(1).fill('rita@example.com'); await p.locator('input[type=password]').first().fill('secret123');
      await p.getByRole('button', { name: L.create }).last().click();
      const code = (await p.getByText(L.codeIs).first().textContent()).match(/\d{6}/)[0];
      await p.getByRole('textbox').last().fill(code); await btn(L.verify).click(); await p.waitForTimeout(1500);
      await p.getByRole('textbox').first().fill('Adam'); await toSetupBoard(); await scan('05e-setup-board');
    });
    await p.evaluate(() => localStorage.removeItem('caa.session.v1')); await p.reload(); await p.getByRole('button').first().waitFor();
  }
  // The board, through the demo team account (a ready-made profile, no questions).
  await p.getByRole('button', { name: L.bo }).click();
  await p.getByRole('tab').nth(1).waitFor();
  await scan('20-backoffice-requests');
  await step('21-request', async () => { await p.getByText('Maya Haddad').first().click(); await p.waitForTimeout(500); await scan('21-backoffice-request'); });
  for (const [i, n] of [[1, '22-backoffice-overview'], [2, '23-backoffice-usage'], [3, '24-backoffice-messages'], [4, '25-backoffice-history']])
    await step(n, async () => { await p.getByRole('tab').nth(i).click(); await scan(n); });
  await p.getByRole('button').filter({ hasText: L.openApp }).click();
  await p.waitForTimeout(2500);
  await scan('06-board');
  if (locale === 'en-GB') {
    await step('07-folder', async () => { const c = await centerOf('food'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(400); await p.mouse.click(c.x, c.y); await p.waitForTimeout(600); await scan('07-folder'); await btn('AAC').click(); });
    // Search, Keyboard and Model share one panel, opened by the magnifying glass: the last two are its tabs.
    for (const [label, n, tab] of [[L.search, '08-search'], [L.search, '09-keyboard', L.keyboard], [L.help, '10-help'], [L.boards, '11-boards'], [L.schedule, '12-schedule'], [L.timer, '13-timer'], [L.search, '14-model', L.model], [L.guide, '15-guide']])
      await step(n, async () => { await btn(label).click(); await p.waitForTimeout(700); if (tab) { await p.getByRole('tab', { name: tab, exact: true }).click(); await p.waitForTimeout(500); } await scan(n); await p.keyboard.press('Escape').catch(() => {}); const x = p.getByRole('button', { name: /^(close|Close)$/ }).first(); if (await x.count()) await x.click().catch(() => {}); await btn('AAC').click().catch(() => {}); });
    await step('17-caregiver', async () => { await btn(L.caregiver).click(); await p.waitForTimeout(600); await scan('17-caregiver-mode'); });
    await step('18-editor', async () => { const c = await centerOf('want'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(900); await scan('18-word-editor'); const x = p.getByRole('button', { name: /^(close|Close)$/ }).first(); if (await x.count()) await x.click(); });
    await step('19-settings', async () => {
      await btn(L.settings).click(); await p.waitForTimeout(700); await scan('19-settings-board');
      for (const [i, t] of L.tabs.entries()) { const tb = p.getByRole('radio', { name: new RegExp(`^${t}`) }).first(); if (await tb.count()) { await tb.click(); await p.waitForTimeout(600); await scan(`19-settings-${t.toLowerCase()}`); } }
    });
  }
  fs.writeFileSync(`${OUT}/result-${tag}.json`, JSON.stringify(results, null, 1));
  console.log('page errors:', errs.slice(0, 3));
  await b.close();
})().catch((e) => { console.error('FAILED', e.message.split('\n').slice(0, 3).join(' | ')); fs.writeFileSync(`${OUT}/result-${tag}.json`, JSON.stringify(results, null, 1)); process.exit(1); });
