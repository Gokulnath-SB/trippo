import { rm, writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5180';
const checks = [];
let email = null;
// Start from a signed-out demo profile so the auth steps exercise the form.
await rm('C:\\Users\\DELL\\AppData\\Local\\Temp\\opencode\\qa-flows-profile', { recursive: true, force: true });
const chrome = await launchChrome({ port: 9336, profile: 'qa-flows-profile', width: 1440, height: 900 });
let cdp;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function step(name, fn) {
  try { checks.push({ name, ok: true, ...(await fn()) }); }
  catch (e) { checks.push({ name, ok: false, error: e.message }); }
}

try {
  cdp = await CDP.connect(chrome.port, { width: 1440, height: 900 });
  await cdp.navigate(`${BASE}/`, { waitFor: '.intro' });
  await cdp.click('.intro__skip');

  // 1. Landing hero search
  await step('landing search Ooty', async () => {
    await cdp.setValue('#hero-search', 'Ooty');
    await cdp.click('form.hero-search button[type="submit"]');
    await cdp.navigate(`${BASE}/explore?q=Ooty`, { waitFor: '.tp-explore-grid' }); // direct deep link re-check
    const data = await cdp.eval(`(function(){
      const titles = Array.from(document.querySelectorAll('.tp-explore-grid .dest-card h3')).map(e=>e.textContent.trim());
      return { url: location.pathname + location.search, titles, count: document.querySelector('.tp-count[role=status]')?.textContent.trim() };
    })()`);
    return { data, pass: data.titles.length === 1 && data.titles[0] === 'Ooty' };
  });

  // 2. Explore chips / clear / wishlist toggle
  await step('explore Beaches filter', async () => {
    await cdp.navigate(`${BASE}/explore`, { waitFor: '.tp-explore-grid' });
    const all = await cdp.eval('document.querySelectorAll(".tp-explore-grid .dest-card").length');
    await cdp.click('text=Beaches');
    const data = await cdp.eval(`({
      titles: Array.from(document.querySelectorAll('.tp-explore-grid .dest-card h3')).map(e=>e.textContent.trim()),
      chipPressed: Array.from(document.querySelectorAll('.ui-chip[aria-pressed=true]')).map(e=>e.textContent.trim())
    })`);
    return { allCount: all, data, pass: data.titles.length > 0 && data.titles.length < all && data.chipPressed.includes('Beaches') };
  });
  await step('explore clear filters', async () => {
    await cdp.click('text=Clear filters');
    const n = await cdp.eval('document.querySelectorAll(".tp-explore-grid .dest-card").length');
    return { count: n, pass: n > 0 };
  });
  await step('wishlist heart add / remove', async () => {
    await cdp.click('button[aria-label="Save Ooty to wishlist"]');
    await sleep(350);
    const pressed = await cdp.eval('document.querySelector("button[aria-label=\\"Remove Ooty from wishlist\\"]")?.getAttribute("aria-pressed")');
    await cdp.navigate(`${BASE}/wishlist`, { waitFor: 'main' });
    const onList = await cdp.eval(`({
      titles: Array.from(document.querySelectorAll('.dest-card h3')).map(e=>e.textContent.trim()),
      count: document.querySelector('.wishlist__count')?.textContent.trim()
    })`);
    await cdp.navigate(`${BASE}/explore`, { waitFor: '.tp-explore-grid' });
    await cdp.click('button[aria-label="Remove Ooty from wishlist"]');
    await sleep(350);
    await cdp.navigate(`${BASE}/wishlist`, { waitFor: 'main' });
    const afterRemove = await cdp.eval(`({
      titles: Array.from(document.querySelectorAll('.dest-card h3')).map(e=>e.textContent.trim()),
      empty: document.body.innerText.includes('Your wishlist is empty')
    })`);
    return { pressed, onList, afterRemove, pass: pressed === 'true' && onList.titles.includes('Ooty') && !afterRemove.titles.includes('Ooty') && afterRemove.empty };
  });

  // 3. Auth register / profile / logout / login again
  email = `peter.qa.${Date.now()}@example.com`;
  const password = 'QaDemoPass123';
  const name = 'Peter Qa';
  await step('auth register + profile', async () => {
    await cdp.navigate(`${BASE}/auth`, { waitFor: '.auth-form' });
    await cdp.click('text=Register');
    await cdp.setValue('#auth-name', name);
    await cdp.setValue('#auth-email', email);
    await cdp.setValue('#auth-password', password);
    await cdp.click('.auth-form button[type="submit"]');
    await cdp.navigate(`${BASE}/profile`, { waitFor: 'main' });
    const data = await cdp.eval(`({
      path: location.pathname,
      heading: document.querySelector('main h1')?.textContent.trim(),
      body: document.body.innerText.slice(0,600)
    })`);
    return { email, data, pass: data.heading === 'Profile' && data.body.includes(name) && data.body.includes(email) };
  });
  await step('auth logout + login', async () => {
    await cdp.click('text=Log out');
    const signedOut = await cdp.eval('document.body.innerText.includes("Sign in to see your profile")');
    await cdp.navigate(`${BASE}/auth`, { waitFor: '.auth-form' });
    await cdp.setValue('#auth-email', email);
    await cdp.setValue('#auth-password', password);
    await cdp.click('.auth-form button[type="submit"]');
    await cdp.navigate(`${BASE}/profile`, { waitFor: 'main' });
    const signedIn = await cdp.eval('document.body.innerText.includes("' + name + '")');
    return { signedOut, signedIn, pass: signedOut && signedIn };
  });

  // 4. Create trip
  let tripId = null;
  await step('create trip 3 steps + save', async () => {
    await cdp.navigate(`${BASE}/create-trip`, { waitFor: '#trip-name' });
    await cdp.setValue('#trip-name', 'QA Ooty Trial');
    await cdp.setValue('#trip-origin', 'Chennai');
    await cdp.setValue('#trip-destination', 'ooty');
    await cdp.setValue('#trip-start', '2026-12-10');
    await cdp.setValue('#trip-end', '2026-12-12');
    await cdp.setValue('#trip-travellers', '2');
    await cdp.setValue('#trip-budget', '25000');
    await cdp.click('form button[type="submit"]');
    await cdp.click('#trip-pref-0');
    await cdp.setValue('#trip-type', 'Nature');
    await cdp.click('form button[type="submit"]');
    const review = await cdp.eval('document.body.innerText.includes("Review your trip")');
    await cdp.click('form button[type="submit"]');
    await sleep(600);
    const url = await cdp.eval('location.pathname');
    tripId = url.includes('/itinerary/') ? url.split('/').pop() : null;
    await cdp.navigate(`${BASE}/my-trips`, { waitFor: 'main' });
    const listed = await cdp.eval('document.body.innerText.includes("QA Ooty Trial")');
    return { url, tripId, review, listed, pass: Boolean(tripId) && listed };
  });

  // 5. Itinerary CRUD + persistence
  if (tripId) {
    await step('itinerary add / move / edit / remove / save / reload', async () => {
      await cdp.navigate(`${BASE}/itinerary/${tripId}`, { waitFor: 'main' });
      await cdp.click('text=Add first activity');
      await cdp.setValue('#tp-activity-title', 'Tea gardens');
      await cdp.setValue('#tp-activity-description', 'Morning walk');
      await cdp.setValue('#tp-activity-location', 'Ooty');
      await cdp.click('.tp-activity-edit__actions button');
      await cdp.click('text=Add morning');
      await cdp.setValue('#tp-activity-title', 'Botanical garden');
      await cdp.setValue('#tp-activity-location', 'Ooty');
      await cdp.click('.tp-activity-edit__actions button');
      const before = await cdp.eval('Array.from(document.querySelectorAll(".tp-activity__title")).map(e=>e.textContent.trim())');
      await cdp.click('button[aria-label="Move Botanical garden up"]');
      const afterMove = await cdp.eval('Array.from(document.querySelectorAll(".tp-activity__title")).map(e=>e.textContent.trim())');
      await cdp.click('button[aria-label="Edit Tea gardens"]');
      await cdp.setValue('#tp-activity-title', 'Tea gardens edited');
      await cdp.click('.tp-activity-edit__actions button');
      await cdp.click('button[aria-label="Remove Botanical garden"]');
      const afterEditRemove = await cdp.eval('Array.from(document.querySelectorAll(".tp-activity__title")).map(e=>e.textContent.trim())');
      await cdp.click('text=Save itinerary');
      await sleep(400);
      const savedMsg = await cdp.eval('document.querySelector(".tp-live[role=status]")?.textContent.trim()');
      await cdp.navigate(`${BASE}/itinerary/${tripId}`, { waitFor: 'main' });
      const reloaded = await cdp.eval('Array.from(document.querySelectorAll(".tp-activity__title")).map(e=>e.textContent.trim())');
      return {
        before, afterMove, afterEditRemove, savedMsg, reloaded,
        pass: before.length === 2 && afterMove[0] === 'Botanical garden' && afterEditRemove.length === 1
          && afterEditRemove[0] === 'Tea gardens edited' && savedMsg === 'Itinerary saved.' && reloaded[0] === 'Tea gardens edited'
      };
    });

    // 6. Budget CRUD + totals + persistence
    await step('budget add / edit / delete / totals / reload', async () => {
      await cdp.navigate(`${BASE}/budget/${tripId}`, { waitFor: 'main' });
      const stats = () => cdp.eval('Array.from(document.querySelectorAll(".ui-stat")).map(e=>e.innerText.replace(/\\s+/g," ").trim())');
      const initial = await stats();
      await cdp.click('text=Add expense');
      await cdp.setValue('#tp-expense-title', 'Train tickets');
      await cdp.setValue('#tp-expense-amount', '1500');
      await cdp.click('.ui-modal__foot button', { nth: 1 });
      const afterAdd = await stats();
      await cdp.click('button[aria-label="Edit Train tickets"]');
      await cdp.setValue('#tp-expense-amount', '2000');
      await cdp.check('#tp-expense-estimated', false);
      await cdp.click('.ui-modal__foot button', { nth: 1 });
      const afterEdit = await stats();
      await cdp.click('text=Save budget');
      await sleep(400);
      await cdp.navigate(`${BASE}/budget/${tripId}`, { waitFor: 'main' });
      const afterReload = await stats();
      const titlesAfterReload = await cdp.eval('Array.from(document.querySelectorAll(".tp-expense__title")).map(e=>e.textContent.trim())');
      await cdp.click('button[aria-label="Delete Train tickets"]');
      const afterDelete = await stats();
      await cdp.click('text=Save budget');
      await sleep(400);
      await cdp.navigate(`${BASE}/budget/${tripId}`, { waitFor: 'main' });
      const afterDeleteReload = await stats();
      return {
        initial, afterAdd, afterEdit, afterReload, titlesAfterReload, afterDelete, afterDeleteReload,
        pass: afterAdd.some(s => s.includes('₹1,500')) && afterEdit.some(s => s.includes('₹2,000'))
          && afterReload.some(s => s.includes('₹2,000')) && titlesAfterReload.includes('Train tickets')
          && afterDeleteReload.some(s => s.includes('₹0')) && afterDeleteReload.some(s => s.includes('₹25,000'))
      };
    });
  }

  // 7. Assistant
  await step('assistant sample prompt -> demo plan -> save as trip', async () => {
    await cdp.navigate(`${BASE}/assistant`, { waitFor: '#chat-input' });
    await cdp.click('.prompt-suggestion');
    const prompt = await cdp.eval('document.querySelector("#chat-input").value');
    await cdp.click('.chat-compose button[type="submit"]');
    let preview = null;
    for (let i = 0; i < 60; i += 1) {
      preview = await cdp.eval('document.querySelector(".plan-preview")?.innerText.slice(0,600) || null');
      if (preview) break;
      await sleep(150);
    }
    const demo = await cdp.eval('document.querySelector(".plan-preview")?.innerText.includes("DEMO GENERATED")');
    await cdp.click('text=Save as trip');
    await sleep(600);
    const url = await cdp.eval('location.pathname');
    const heading = await cdp.eval('document.querySelector("main h1")?.textContent.trim()');
    return { prompt, preview: preview?.slice(0, 240), demo, url, heading, pass: prompt.includes('Chennai') && preview && demo && url.startsWith('/itinerary/') && heading.includes('demo plan') };
  });

  // 8. Map
  await step('map tiles + markers + overflow', async () => {
    await cdp.navigate(`${BASE}/map?destination=ooty`, { waitFor: '.leaflet-container' });
    let tiles = 0;
    for (let i = 0; i < 60; i += 1) {
      tiles = await cdp.eval('document.querySelectorAll(".leaflet-tile-loaded").length');
      if (tiles > 0) break;
      await sleep(200);
    }
    const data = await cdp.eval(`({
      markers: document.querySelectorAll('.leaflet-marker-icon').length,
      tiles: document.querySelectorAll('.leaflet-tile').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    })`);
    await cdp.navigate(`${BASE}/map`, { waitFor: '.leaflet-container' });
    const bareMarkers = await cdp.eval('document.querySelectorAll(".leaflet-marker-icon").length');
    return { tiles, data, bareMarkers, pass: tiles > 0 && data.markers >= 1 && data.scrollWidth <= data.clientWidth };
  });

  // 9. Keyboard: modal Escape + focus return, focus ring
  await step('keyboard modal escape + focus return', async () => {
    await cdp.navigate(`${BASE}/my-trips`, { waitFor: '.trip-card' });
    await cdp.click('.trip-card__delete');
    const opened = await cdp.eval(`({
      hasModal: !!document.querySelector('.ui-modal'),
      focusInModal: !!document.querySelector('.ui-modal')?.contains(document.activeElement)
    })`);
    await cdp.pressEscape();
    const closed = await cdp.eval(`({
      hasModal: !!document.querySelector('.ui-modal'),
      focusClass: document.activeElement?.className,
      focusLabel: document.activeElement?.getAttribute('aria-label')
    })`);
    return { opened, closed, pass: opened.hasModal && opened.focusInModal && !closed.hasModal && String(closed.focusClass).includes('trip-card__delete') };
  });
  await step('form focus ring computed', async () => {
    await cdp.navigate(`${BASE}/auth`, { waitFor: '#auth-email' });
    await cdp.eval('document.querySelector("#auth-email").focus()');
    const ring = await cdp.eval(`(function(){
      const el = document.querySelector('#auth-email');
      const s = getComputedStyle(el);
      return { focused: document.activeElement === el, focusVisible: el.matches(':focus-visible'), outline: s.outlineWidth + ' ' + s.outlineStyle + ' ' + s.outlineColor, boxShadow: s.boxShadow };
    })()`);
    return { ring, pass: ring.focused && parseFloat(ring.outline) >= 2 && ring.outline.includes('solid') };
  });
} catch (e) {
  checks.push({ name: 'FATAL', ok: false, error: e.stack || e.message });
} finally {
  cdp?.close(); await killChrome(chrome);
  const report = { email, checks, consoleErrors: cdp?.consoleErrors, pageErrors: cdp?.pageErrors };
  await writeFile('qa/flow-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
