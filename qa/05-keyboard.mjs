import { writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5180';
const out = {};
const chrome = await launchChrome({ port: 9338, profile: 'qa-keyboard-profile', width: 1440, height: 900 });
let cdp;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function realClick(selector) {
  const box = await cdp.eval(`(function(){
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('missing ' + ${JSON.stringify(selector)});
    el.scrollIntoView({block:'center'});
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height };
  })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }
  await sleep(250);
  return box;
}
try {
  cdp = await CDP.connect(chrome.port, { width: 1440, height: 900 });
  await cdp.navigate(`${BASE}/`, { waitFor: '.intro' });
  await cdp.click('.intro__skip');

  // Create a trip via the assistant so My Trips has a delete trigger (no auth needed in demo mode).
  await cdp.navigate(`${BASE}/assistant`, { waitFor: '#chat-input' });
  await cdp.click('.prompt-suggestion');
  await cdp.click('.chat-compose button[type="submit"]');
  for (let i = 0; i < 60; i += 1) {
    if (await cdp.eval('!!document.querySelector(".plan-preview")')) break;
    await sleep(150);
  }
  await cdp.click('text=Save as trip');
  await sleep(500);

  await cdp.navigate(`${BASE}/my-trips`, { waitFor: '.trip-card__delete' });
  const box = await realClick('.trip-card__delete');
  out.modal = { triggerBox: box };
  out.modal.focusBeforeEscape = await cdp.eval(`({
    hasModal: !!document.querySelector('.ui-modal'),
    focusInModal: !!document.querySelector('.ui-modal')?.contains(document.activeElement),
    active: document.activeElement?.getAttribute('aria-label') || document.activeElement?.className
  })`);
  await cdp.pressEscape();
  out.modal.afterEscape = await cdp.eval(`({
    hasModal: !!document.querySelector('.ui-modal'),
    active: document.activeElement?.getAttribute('aria-label') || document.activeElement?.className || document.activeElement?.tagName,
    isTrigger: document.activeElement === document.querySelector('.trip-card__delete')
  })`);
  out.modal.pass = out.modal.focusBeforeEscape.hasModal && out.modal.focusBeforeEscape.focusInModal
    && !out.modal.afterEscape.hasModal && out.modal.afterEscape.isTrigger;

  // Focus ring: tab from the top until the email field is reached.
  await cdp.navigate(`${BASE}/auth`, { waitFor: '.auth-form' });
  await cdp.eval('document.body.focus()');
  out.focusRing = { tabs: 0 };
  for (let i = 0; i < 24; i += 1) {
    await cdp.pressTab();
    out.focusRing.tabs += 1;
    const id = await cdp.eval('document.activeElement?.id || ""');
    if (id === 'auth-email') break;
  }
  out.focusRing.style = await cdp.eval(`(function(){
    const el = document.querySelector('#auth-email');
    const s = getComputedStyle(el);
    return {
      focused: document.activeElement === el,
      focusVisible: el.matches(':focus-visible'),
      outline: s.outlineWidth + ' ' + s.outlineStyle + ' ' + s.outlineColor,
      outlineOffset: s.outlineOffset
    };
  })()`);
  out.focusRing.pass = out.focusRing.style.focused && parseFloat(out.focusRing.style.outline) >= 2 && out.focusRing.style.outline.includes('solid');
} catch (e) { out.fatal = e.stack || e.message; }
finally {
  cdp?.close(); await killChrome(chrome);
  await writeFile('qa/keyboard-results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
