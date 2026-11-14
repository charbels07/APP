// Accessibility check of the professional side (demo build): sign-up, the four verification steps,
// then every section of the workspace. Same rules as scan.js (WCAG 2.2 AA, axe-core).
// Usage: node scripts/a11y/scan-pro.js [port] [width] [height]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const OUT = process.env.A11Y_OUT || path.join(require('os').tmpdir(), 'a11y-check');
const [port = '8770', W = '1180', H = '900'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
// A 1 × 1 picture to send as "diploma" and "identity document".
const doc = path.join(OUT, 'document.png');
fs.writeFileSync(doc, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
let bad = 0;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +W, height: +H }, locale: 'en-GB' });
  p.setDefaultTimeout(12000);
  const scan = async (screen) => {
    await p.waitForTimeout(600);
    await p.evaluate(axeSrc);
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((x) => ({ id: x.id, n: x.nodes.length, html: x.nodes[0].html.slice(0, 150), why: (x.nodes[0].failureSummary || '').replace(/\s+/g, ' ').slice(0, 160) })));
    bad += v.length;
    console.log(`pro-${W} · ${screen}: ${v.length ? v.map((x) => `${x.id}(${x.n})`).join(', ') : 'no violation'}`);
    for (const x of v) console.log(`     ${x.html}\n     ${x.why}`);
    await p.screenshot({ path: `${OUT}/pro-${W}-${screen}.png` });
  };
  const btn = (n, exact = true) => p.getByRole('button', { name: n, exact }).first();
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.log(`pro-${W} · ${name}: SKIPPED (${e.message.split('\n')[0].slice(0, 120)})`); } };
  await p.goto(`http://localhost:${port}/`);
  await btn('Continue').click();
  await btn('Create my account', false).click();
  await p.getByText(/Professional/).first().click();
  await p.getByLabel('Your name').fill('Sarah Khoury');
  await p.getByLabel('Email address').fill('sarah@clinic.example');
  await p.getByLabel('Password', { exact: true }).fill('secret123');
  await p.getByRole('button', { name: 'Create my account' }).last().click();
  const code = (await p.getByText(/Your code is/).first().textContent()).match(/\d{6}/)[0];
  await p.getByLabel('Code', { exact: true }).fill(code);
  await btn('Verify').click();
  await p.getByText('Tell us about your professional practice').waitFor();
  await scan('01-verification-practice');
  await step('02-documents', async () => {
    await p.getByLabel(/Country/).fill('Lebanon');
    await btn('Continue').click();
    await scan('02-verification-certificate');
    let [fc] = await Promise.all([p.waitForEvent('filechooser'), btn(/^Add a document$/, false).click()]);
    await fc.setFiles(doc);
    await p.waitForTimeout(600);
    await btn('Continue').click();
    await scan('03-verification-identity');
    [fc] = await Promise.all([p.waitForEvent('filechooser'), btn(/^Add a document$/, false).click()]);
    await fc.setFiles(doc);
    await p.waitForTimeout(600);
    await btn('Continue').click();
    await scan('04-verification-status');
    await btn('Submit for verification').click();
    await p.getByText('Application under review').first().waitFor();
    await scan('05-verification-pending');
    await btn('Verified').click();
    await p.waitForTimeout(500);
    await btn('Explore the workspace').click();
    await p.waitForTimeout(1200);
    await scan('06-workspace-tour');
    await btn('Maybe later').click().catch(() => {});
  });
  for (const [name, label] of [['07-dashboard', 'Dashboard'], ['08-users', 'My AAC users'], ['09-create', 'Create materials'], ['10-library', 'My library'], ['11-collaborations', 'Collaborations'], ['12-learning', 'Learning center'], ['13-account', 'Account & licence']])
    await step(name, async () => { await p.getByRole('tab', { name: label }).first().click(); await scan(name); });
  await step('14-connect', async () => { await p.getByRole('tab', { name: 'My AAC users' }).first().click(); await btn('Connect a user', false).click(); await scan('14-connect-a-user'); });
  await step('15-material', async () => { await p.getByRole('tab', { name: 'Create materials' }).first().click(); await p.getByRole('radio').first().click(); await p.waitForTimeout(400); await scan('15-material-kind'); });
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('FAILED', e.message.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
