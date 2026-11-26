// Accessibility check of the web version (WCAG 2.2 level AA), with axe-core and Playwright.
// Opens the main screens of the demo build (welcome, sign-up, set-up, board, panels, caregiver mode,
// word editor, settings, back office) and lists what breaks a rule. Run it through `npm run test:a11y`.
// Needs Playwright on the machine (it is not a dependency of the app).
// Usage: node scan.js [port] [locale] [width] [height] [tag]
const { chromium } = require('playwright');
const fs = require('fs');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
/** Where screenshots and results go: outside the project. */
const OUT = process.env.A11Y_OUT || require('path').join(require('os').tmpdir(), 'a11y-check');
const [port = '8770', locale = 'en-GB', W = '1180', H = '900', tag = 'en-desk'] = process.argv.slice(2);
const L = {
  'en-GB': { bo: 'Back office (demonstration)', openApp: 'Open the app', cont: 'Continue', create: 'Create my account', parent: /Parent/, pro: /Professional/, name: 'Your name', email: 'Email address', pw: 'Password', verify: 'Verify', caregiver: 'Caregiver', settings: 'Settings', guide: 'Guide', search: 'Search', keyboard: 'A new word', boards: 'Boards', schedule: 'Schedule', timer: 'Timer', help: 'Help', model: 'Write to model', have: 'I already have an account', tabs: ['Team', 'Progress', 'Account'], record: 'Record the pronunciation', done: 'Done' },
  'ar-LB': { bo: 'لوحة الإدارة (عرض تجريبي)', openApp: 'فتح التطبيق' },
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
      return { noRole: [...new Set(noRole)].slice(0, 12), noRoleN: noRole.length, small: small.slice(0, 10), lang: document.documentElement.lang, title: document.title, overflowX: document.documentElement.scrollWidth - window.innerWidth };
    });
    results.push({ screen, ...r, extra });
    console.log(`${tag} · ${screen}: ${r.violations.length ? r.violations.map((v) => `${v.id}(${v.n})`).join(', ') : 'no violation'}`);
    await p.screenshot({ path: `${OUT}/${tag}-${screen}.png` });
  };
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.log(`${tag} · ${name}: SKIPPED (${e.message.split('\n')[0].slice(0, 110)})`); } };
  const btn = (n, exact = true) => p.getByRole('button', { name: n, exact }).first();
  const centerOf = (word) => p.evaluate((w) => { const e = [...document.querySelectorAll('*')].find((x) => x.children.length === 0 && x.textContent.trim() === w); if (!e) return null; const r = (e.closest('[role="button"]') || e).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, word);
  fs.mkdirSync(OUT, { recursive: true });

  await p.goto(`http://localhost:${port}/`);
  await p.getByRole('button').first().waitFor();
  await scan('01-welcome');
  if (locale === 'en-GB') {
    // The caregiver code keypad, on the try-it board (the team account used further down is never asked the code).
    await step('16-pin', async () => {
      await p.getByRole('button', { name: /Try it first/ }).click(); await p.waitForTimeout(2000);
      await btn(L.caregiver).click(); await p.waitForTimeout(400); await scan('16-pin');
      await p.goto(`http://localhost:${port}/`); await p.getByRole('button').first().waitFor();
    });
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
    // The family's own board: the code is chosen at the first opening; "Forgot the code?" on the
    // keypad (account password, or a code by e-mail), then the new code with its explanation.
    await step('16b-pin-forgot', async () => {
      const digits = async (c) => { for (const d of c) { await p.getByRole('button', { name: d, exact: true }).last().click(); await p.waitForTimeout(100); } };
      await p.getByRole('radio', { name: /Lebanese/ }).first().click();
      for (let i = 0; i < 25 && !(await p.getByRole('button', { name: 'Finish', exact: true }).count()); i++) {
        // The parent's consent, on the follow-up step, before the profile can be kept.
        const agree = p.getByRole('checkbox', { name: /legal guardian/ });
        if ((await agree.count()) && (await agree.first().getAttribute('aria-checked')) !== 'true') { await scan('15c-consent'); await agree.first().click(); }
        await btn('Continue').click(); await p.waitForTimeout(300);
      }
      await btn('Finish').click(); await p.getByText('The caregiver code protects', { exact: false }).first().waitFor();
      // The first keypad of a family's board: no cross, Escape does nothing; Help stays reachable on the bar.
      await scan('16a-pin-first'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.getByText('The caregiver code protects', { exact: false }).first().waitFor();
      await digits('2580'); await p.waitForTimeout(200); await digits('2580'); await p.waitForTimeout(1000); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await btn(L.caregiver).click(); await btn('Forgot the code?').click(); await p.getByLabel('Account password').waitFor(); await scan('16b-pin-forgot');
      await btn('Send the code').click(); await p.getByLabel('Code received').waitFor(); await scan('16c-pin-forgot-code');
      await btn('Back').click(); await btn('Forgot the code?').click();
      await p.getByLabel('Account password').fill('secret123'); await btn('Confirm').click(); await p.getByText('It is you.', { exact: false }).first().waitFor(); await scan('16d-pin-new-code');
    });
    // Payment switched on in the demo server, the free week over 10 days ago: the dot on the bar, the
    // message after the code (no "Later" while paused), then the Account page alone.
    await step('16e-payment', async () => {
      const digits = async (c) => { for (const d of c) { await p.getByRole('button', { name: d, exact: true }).last().click(); await p.waitForTimeout(100); } };
      await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.evaluate(() => {
        const k = 'caa.server.v1'; const db = JSON.parse(localStorage.getItem(k)); const since = Date.now() - 10 * 864e5;
        db.billing = { live: true, liveSince: since, family: {}, pro: [] };
        for (const a of Object.values(db.accounts)) a.createdAt = since;
        localStorage.setItem(k, JSON.stringify(db));
      });
      await p.reload(); await p.getByRole('button', { name: /^Settings, subscription reminder$/ }).first().waitFor({ timeout: 20000 });
      await scan('16e-board-payment-dot');
      await p.getByRole('button', { name: /^Settings, subscription reminder$/ }).first().click(); await p.waitForTimeout(400); await digits('2580');
      await p.getByText('everything is paused except the child talking', { exact: false }).first().waitFor(); await p.waitForTimeout(600); await scan('16f-payment-message');
      await btn('My account').click(); await p.waitForTimeout(800); await scan('16g-payment-account');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    });
    await p.evaluate(() => localStorage.removeItem('caa.session.v1')); await p.reload(); await p.getByRole('button').first().waitFor();
  }
  // The board, through the demo team account (a ready-made profile, no questions).
  await p.getByRole('button', { name: L.bo }).click();
  await p.getByRole('tab').nth(1).waitFor();
  await scan('20-backoffice-requests');
  await step('21-request', async () => { await p.getByText('Maya Haddad').first().click(); await p.waitForTimeout(500); await scan('21-backoffice-request'); });
  // The seven pages of the back office (the first one, Professionals, was scanned above).
  for (const [i, n] of [[1, '22-backoffice-administration'], [2, '23-backoffice-product'], [3, '24-backoffice-requests'], [4, '25-backoffice-bugs'], [5, '25b-backoffice-content'], [6, '25c-backoffice-security']])
    await step(n, async () => { await p.getByRole('tab').nth(i).click(); await scan(n); });
  await p.getByRole('button').filter({ hasText: L.openApp }).click();
  await p.waitForTimeout(2500);
  await scan('06-board');
  if (locale === 'en-GB') {
    await step('07-folder', async () => { const c = await centerOf('food'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(400); await p.mouse.click(c.x, c.y); await p.waitForTimeout(600); await scan('07-folder'); await btn('AAC').click(); });
    // Search, Keyboard and Model share one panel, opened by the magnifying glass: the last two are its tabs.
    for (const [label, n, tab] of [[L.search, '08-search'], [L.search, '09-keyboard', L.keyboard], [L.help, '10-help'], [L.boards, '11-boards'], [L.schedule, '12-schedule'], [L.timer, '13-timer'], [L.search, '14-model', L.model], [L.guide, '15-guide']])
      await step(n, async () => { await btn(label).click(); await p.waitForTimeout(700); if (tab) { await p.getByRole('tab', { name: tab, exact: true }).click(); await p.waitForTimeout(500); } await scan(n); await p.keyboard.press('Escape').catch(() => {}); const x = p.getByRole('button', { name: /^(close|Close)$/ }).first(); if (await x.count()) await x.click().catch(() => {}); await btn('AAC').click().catch(() => {}); });
    // The bar's Lock: "Lock the screen" (the device's own lock; a browser has no button to its settings).
    await step('15h-lock', async () => { await btn('Lock').click(); await p.getByText('Only the device can keep the child', { exact: false }).first().waitFor(); await scan('15h-lock-screen'); await p.keyboard.press('Escape'); await p.waitForTimeout(400); });
    await step('17-caregiver', async () => { await btn(L.caregiver).click(); await p.waitForTimeout(600); await scan('17-caregiver-mode'); });
    await step('18-editor', async () => { const c = await centerOf('want'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(900); await scan('18-word-editor'); const x = p.getByRole('button', { name: /^(close|Close)$/ }).first(); if (await x.count()) await x.click(); });
    // The word picker opened from the word editor: its search (type or say), its "Back", and the new-word form.
    await step('18b-word-picker', async () => {
      const c = await centerOf('want'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(900);
      await btn('Replace with another word').click(); await p.waitForTimeout(700); await scan('18b-word-picker');
      await btn('Create a new word').click(); await p.waitForTimeout(500); await scan('18c-new-word');
      await btn('Back').click(); await p.waitForTimeout(300); await btn('Back').click(); await p.waitForTimeout(400);
      const x = p.getByRole('button', { name: /^(close|Close)$/ }).first(); if (await x.count()) await x.click();
    });
    await step('19-settings', async () => {
      await btn(L.settings).click(); await p.waitForTimeout(700); await scan('19-settings-board');
      for (const [i, t] of L.tabs.entries()) { const tb = p.getByRole('radio', { name: new RegExp(`^${t}`) }).first(); if (await tb.count()) { await tb.click(); await p.waitForTimeout(600); await scan(`19-settings-${t.toLowerCase()}`); } }
    });
    // Settings → Touch with switch scanning chosen, then the board being scanned (the whole screen
    // is the switch), and stopped with Escape.
    await step('19e-scanning', async () => {
      await p.getByRole('radio', { name: /^Board/ }).first().click(); await p.waitForTimeout(500);
      await btn('Touch').click(); await p.waitForTimeout(300);
      await p.getByRole('radio', { name: 'Step by step' }).click(); await p.getByRole('switch', { name: 'The whole screen is the switch' }).click(); await p.waitForTimeout(300);
      await scan('19e-settings-touch');
      await btn('Save').click(); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await btn(L.caregiver).click(); await p.waitForTimeout(400); if (await btn('Later').count()) await btn('Later').click();
      await p.keyboard.press(' '); await p.waitForTimeout(300); await scan('19f-board-scanning');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300); await scan('19g-board-scanning-stopped');
    });
  }
  fs.writeFileSync(`${OUT}/result-${tag}.json`, JSON.stringify(results, null, 1));
  console.log('page errors:', errs.slice(0, 3));
  await b.close();
})().catch((e) => { console.error('FAILED', e.message.split('\n').slice(0, 3).join(' | ')); fs.writeFileSync(`${OUT}/result-${tag}.json`, JSON.stringify(results, null, 1)); process.exit(1); });
