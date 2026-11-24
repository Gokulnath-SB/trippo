import { writeFile } from 'node:fs/promises';
import { launchChrome, killChrome, CDP } from './cdp-lib.mjs';

const BASE = 'http://localhost:5180';
const routes = ['/profile', '/itinerary/nope', '/budget/nope', '/nonexistent', '/map'];
const out = { routes: [], introKeyboard: {}, http404: [] };
const chrome = await launchChrome({ port: 9334, profile: 'qa-routes2-profile' });
let cdp;
try {
  cdp = await CDP.connect(chrome.port, { width: 1440, height: 900 });
  cdp.ws.addEventListener('message', (event) => {
    let m; try { m = JSON.parse(event.data); } catch { return; }
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
      out.http404.push(`${m.params.response.status} ${m.params.response.url}`);
    }
  });
  await cdp.navigate(`${BASE}/`, { waitFor: '.intro' });
  // Wait for auto-advance to the ENTER scene, then test Tab focus.
  await new Promise((r) => setTimeout(r, 5000));
  out.introKeyboard.scene = await cdp.eval('document.querySelector(".intro")?.getAttribute("data-scene")');
  out.introKeyboard.focusBefore = await cdp.eval('({tag:document.activeElement?.tagName, text:document.activeElement?.textContent?.trim().slice(0,40)})');
  await cdp.pressTab();
  out.introKeyboard.focusAfterTab = await cdp.eval('({tag:document.activeElement?.tagName, text:document.activeElement?.textContent?.trim().slice(0,40)})');
  await cdp.click('.intro__skip');
  out.introKeyboard.overlayGone = await cdp.eval('!document.querySelector(".intro")');

  for (const route of routes) {
    cdp.resetErrors();
    await cdp.navigate(`${BASE}${route}`, { waitFor: 'main' });
    const row = await cdp.eval(`(function(){
      const heads = Array.from(document.querySelectorAll('main h1, main h2, main h3')).slice(0,8)
        .map(h => h.tagName + ':' + h.textContent.replace(/\\s+/g,' ').trim().slice(0,70));
      return {
        path: location.pathname,
        heads,
        h1: document.querySelectorAll('main h1').length,
        viteOverlay: !!document.querySelector('vite-error-overlay'),
        intro: !!document.querySelector('.intro'),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    })()`);
    row.errors = cdp.errorSummary(route);
    out.routes.push(row);
  }
} catch (e) { out.fatal = e.stack || e.message; }
finally {
  cdp?.close(); await killChrome(chrome);
  await writeFile('qa/route-detail.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}
