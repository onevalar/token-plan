import {chromium} from '../platforms/tauri/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'assets/showcase/';
await fs.mkdir(out,{recursive:true});await fs.mkdir(root+'dist/showcase-frames',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.TOKENPLAN_TEST_BROWSER||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1120,height:900},deviceScaleFactor:2});
const base=process.env.SHOWCASE_URL||'http://127.0.0.1:1432/';
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
await page.goto(base,{waitUntil:'networkidle'});
if(!process.env.CHECK_ONLY) await page.locator('#styles-capture').screenshot({path:out+'styles.png'});
if(!process.env.CHECK_ONLY) await page.locator('#history-capture').screenshot({path:out+'statistics.png'});
const styles=page.locator('#styles-capture');
for(const b of await styles.locator('.tp-style-option').all()){
 await b.click();if(await b.getAttribute('aria-pressed')!=='true')throw Error('Style selection failed');
}
const slider=styles.getByRole('slider');await slider.focus();await page.keyboard.press('End');
if(await slider.getAttribute('aria-valuenow')!=='100')throw Error('Slider failed');
const history=page.locator('.history-pane').first();
await history.getByRole('button',{name:'今天',exact:true}).click();
if(await history.locator('.tpc-daily').count())throw Error('Single-day graph should be hidden');
await history.getByRole('button',{name:'最近 30 天',exact:true}).click();
await history.locator('.tp-history-day-button').first().click();await history.locator('.tp-history-source').click();
if(!await history.locator('.history-model-breakdown').count())throw Error('Model breakdown missing');
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:root+'dist/showcase-mobile.png',fullPage:true});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);
await page.locator('#cover-capture').scrollIntoViewIfNeeded();await page.locator('#cover-capture').hover();
await page.waitForTimeout(300);
if(await page.locator('.tpb-scene').getAttribute('data-phase')!=='idle')throw Error('Reduced motion cover is not static');
await page.close();
if(errors.length)throw Error(errors.join('\n'));
console.log('PASS: eight styles, slider, ranges, model detail, mobile layout, reduced motion, no page errors');
if(process.env.CHECK_ONLY){await browser.close();process.exit(0);}
const film=await browser.newPage({viewport:{width:1000,height:900},deviceScaleFactor:1});
await film.clock.install();await film.goto(new URL('?cover-mode=mouse',base).href,{waitUntil:'networkidle'});
await film.locator('#cover-capture').scrollIntoViewIfNeeded();await film.clock.pauseAt(new Date());
await film.locator('#cover-capture').screenshot({path:out+'poster.png'});
await film.locator('#cover-capture').hover();
for(let i=0;i<125;i++){
 await film.clock.runFor(1000/15);
 await film.locator('#cover-capture').screenshot({path:root+`dist/showcase-frames/frame-${String(i).padStart(3,'0')}.png`});
}
console.log('Exported 125 cover frames at 15 fps');await browser.close();
