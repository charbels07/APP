// Keyboard-only use of the web version: reach, operate, see where the focus is, close with Escape.
const { chromium } = require('playwright');
const fs = require('fs');
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
/** Where screenshots and results go: outside the project. */
const OUT = process.env.A11Y_OUT || require('path').join(require('os').tmpdir(), 'a11y-check');
const PORT = process.argv[2] || '8770';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1180, height: 900 }, locale: 'en-GB' });
  p.setDefaultTimeout(12000);
  const focused = () => p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return { role: e.getAttribute('role') || e.tagName.toLowerCase(), name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, shadow: cs.boxShadow === 'none' ? '' : 'shadow', visible: r.width > 0 && r.height > 0 }; });
  const body = async () => (await p.locator('body').innerText()).replace(/\n+/g, ' | ');
  await p.goto(`http://localhost:${PORT}/`);
  await p.getByRole('button').first().waitFor();
  console.log('== Welcome: Tab order');
  for (let i = 0; i < 7; i++) { await p.keyboard.press('Tab'); const f = await focused(); console.log(`  ${i + 1}.`, f ? `${f.role} "${f.name}" | focus mark: ${f.outline}${f.shadow ? ' + ' + f.shadow : ''}` : '(nothing)'); }
  await p.screenshot({ path: OUT + '/keys-welcome-focus.png' });
  // Enter on a button
  await p.getByRole('button', { name: 'Continue', exact: true }).focus();
  await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  console.log('== Enter on "Continue" opens the preview board:', /Preview/i.test(await body()));
  // An English board: through the demonstration team account, all with the keyboard.
  await p.goto(`http://localhost:${PORT}/`); await p.getByRole('button').first().waitFor();
  await p.getByRole('button', { name: 'Back office (demonstration)' }).focus(); await p.keyboard.press('Enter');
  await p.getByRole('tab').nth(1).waitFor();
  await p.getByRole('tab').nth(1).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  console.log('== Back office: Enter on the second tab selects it:', await p.getByRole('tab').nth(1).getAttribute('aria-selected'));
  await p.getByRole('button', { name: 'Open the app' }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  // First launch: a welcome card is open; it is a dialog, Escape closes it.
  const welcome = await p.evaluate(() => { const d = document.querySelector('[role=dialog]'); return d ? { label: d.getAttribute('aria-label'), focusInside: d.contains(document.activeElement), boardInert: !!document.querySelector('[inert]') } : null; });
  console.log('== Welcome card on first launch:', JSON.stringify(welcome));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  console.log('   after Escape: dialog gone:', (await p.locator('[role=dialog]').count()) === 0, '| board reachable again:', (await p.locator('[inert]').count()) === 0);
  // On the board: Enter and Space on a card
  const card = p.getByRole('button', { name: 'I', exact: true }).first();
  await card.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'want', exact: true }).first().focus(); await p.keyboard.press(' '); await p.waitForTimeout(500);
  const chips = await p.evaluate(() => [...document.querySelectorAll('[role=button][lang]')].filter((e) => e.getBoundingClientRect().top < 100).map((e) => e.getAttribute('aria-label')));
  console.log('== Enter / Space on cards add them to the sentence:', JSON.stringify(chips));
  await p.screenshot({ path: OUT + '/keys-board-focus.png' });
  // The sentence strip with words: automated check (nested buttons?)
  await p.evaluate(axeSrc);
  const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((x) => `${x.id}(${x.nodes.length})`));
  console.log('== Board with a sentence, automated check:', v.length ? v.join(', ') : 'no violation');
  // A panel: open with the keyboard, where does the focus go, Escape
  await p.getByRole('button', { name: 'Search', exact: true }).first().focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  let f = await focused();
  console.log('== Search opened with Enter. Focus is now on:', f ? `${f.role} "${f.name}"` : '(nothing)');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const stillOpen = await p.getByPlaceholder(/word|mot/i).count();
  console.log('== Escape closes the panel:', stillOpen === 0);
  f = await focused();
  console.log('   focus after closing:', f ? `${f.role} "${f.name}"` : '(lost: back to the top of the page)');
  // Help panel (a dialog over the board): is the background still reachable by Tab?
  await p.getByRole('button', { name: 'Guide', exact: true }).first().focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  const dlg = await p.evaluate(() => ({ dialogs: document.querySelectorAll('[role=dialog],[aria-modal=true]').length }));
  console.log('== Guide opened. Marked as a dialog for screen readers:', dlg.dialogs > 0);
  const names = [];
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); const x = await focused(); names.push(x ? x.name : '-'); }
  console.log('   next 6 Tab stops:', JSON.stringify(names));
  await b.close();
})().catch((e) => { console.error('FAILED', e.message.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
