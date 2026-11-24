import { writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5180';
const routes = [
  ['/', 'Your Journey'],
  ['/explore', 'Find your next place'],
  ['/destinations/ooty', 'Ooty'],
  ['/create-trip', 'Create a trip'],
  ['/my-trips', 'My Trips'],
  ['/wishlist', 'Wishlist'],
  ['/assistant', 'AI Travel Assistant'],
  ['/profile', 'Sign in to see your profile'],
  ['/auth', 'Welcome back.'],
  ['/map', 'Explore the map'],
  ['/itinerary/nope', 'Trip not found'],
  ['/budget/nope', 'Trip not found'],
  ['/nonexistent', 'This route is off the map'],
];

const out = { routes: [], intro: {}, consoleErrors: [] };
const chrome = await launchChrome({ port: 9333, profile: 'qa-routes-profile' });
let cdp;
try {
  cdp = await CDP.connect(chrome.port, { width: 1440, height: 900 });

  // ---------- Intro (fresh session) ----------
  cdp.resetErrors();
  await cdp.navigate(`${BASE}/`, { waitFor: '.intro' });
  out.intro.freshVisible = await cdp.eval('!!document.querySelector(".intro[role=dialog]")');
  out.intro.scene = await cdp.eval('document.querySelector(".intro")?.getAttribute("data-scene")');
  out.intro.sessionKeyBefore = await cdp.eval('sessionStorage.getItem("tripo.intro.seen")');
  out.intro.initialFocus = await cdp.eval('document.activeElement?.textContent?.trim().slice(0,60) || document.activeElement?.tagName');
  await cdp.pressTab();
  out.intro.focusAfterTab = await cdp.eval('document.activeElement?.textContent?.trim().slice(0,60) || document.activeElement?.tagName');
  await cdp.click('text=Skip Intro');
  out.intro.afterSkipVisible = await cdp.eval('!!document.querySelector(".intro")');
  out.intro.sessionKeyAfter = await cdp.eval('sessionStorage.getItem("tripo.intro.seen")');
  out.intro.errors = { ...cdp.errorSummary('intro') };

  await cdp.navigate(`${BASE}/`, { waitFor: '#hero-title' });
  out.intro.replayAfterReload = await cdp.eval('!!document.querySelector(".intro")');
  out.intro.sessionKeyAfterReload = await cdp.eval('sessionStorage.getItem("tripo.intro.seen")');

  // Second page in the same browser profile: fresh sessionStorage, test ENTER TRIPO.
  const res = await fetch(`http://127.0.0.1:${chrome.port}/json/new?${encodeURIComponent(`${BASE}/`)}`, { method: 'PUT' });
  const target = await res.json();
  const ws2 = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws2.addEventListener('open', resolve, { once: true }); ws2.addEventListener('error', reject, { once: true }); });
  const cdp2 = new CDP(ws2, { width: 1440, height: 900 });
  await cdp2.send('Runtime.enable'); await cdp2.send('Page.enable'); await cdp2.send('Log.enable'); await cdp2.send('Network.enable');
  await cdp2.navigate(`${BASE}/`, { waitFor: '.intro' });
  await cdp2.eval('sessionStorage.clear()');
  await cdp2.navigate(`${BASE}/`, { waitFor: '.intro' });
  out.intro.secondPageVisible = await cdp2.eval('!!document.querySelector(".intro")');
  await cdp2.click('.intro__enter');
  out.intro.afterEnterVisible = await cdp2.eval('!!document.querySelector(".intro")');
  out.intro.afterEnterKey = await cdp2.eval('sessionStorage.getItem("tripo.intro.seen")');
  out.intro.enterErrors = { ...cdp2.errorSummary('intro-enter') };
  cdp2.close();

  // ---------- Route sweep (sessionStorage already marked) ----------
  for (const [route, expected] of routes) {
    cdp.resetErrors();
    let row;
    try {
      await cdp.navigate(`${BASE}${route}`, { waitFor: 'main h1' });
      row = await cdp.eval(`(function(){
        const h = document.querySelector('main h1');
        return {
          h1: h ? h.textContent.replace(/\\s+/g,' ').trim().slice(0,120) : null,
          viteOverlay: !!document.querySelector('vite-error-overlay'),
          intro: !!document.querySelector('.intro'),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyText: document.body.innerText.slice(0,160).replace(/\\s+/g,' ')
        };
      })()`);
      row.url = await cdp.eval('location.pathname + location.search');
    } catch (e) {
      row = { error: e.message, url: route };
    }
    row.expected = expected;
    row.h1Match = Boolean(row.h1 && row.h1.toLowerCase().includes(expected.toLowerCase()));
    row.errors = { ...cdp.errorSummary(route) };
    out.routes.push(row);
  }
  out.consoleErrors = cdp.consoleErrors;
} catch (e) {
  out.fatal = e.stack || e.message;
} finally {
  cdp?.close();
  await killChrome(chrome);
  await writeFile('qa/route-results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
