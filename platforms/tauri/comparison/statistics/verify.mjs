import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {startStatisticsComparison} from './run.mjs';

const output=fileURLToPath(new URL('../../../../.amp/in/artifacts/',import.meta.url));
mkdirSync(output,{recursive:true});
const running=await startStatisticsComparison();
const browser=await chromium.launch({headless:true,...(process.env.TOKENPLAN_TEST_BROWSER?{executablePath:process.env.TOKENPLAN_TEST_BROWSER}:{})});
const page=await browser.newPage({viewport:{width:1700,height:1200},reducedMotion:'reduce'}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const designs={overview:['Simple Totals','Arc Summary','Editorial Summary','Mini Instruments'],activity:['Activity Calendar','Folded Bands','Daily Bars','Pulse Calendar','Pixel Equalizer','Cumulative Paths'],sources:['Source Treemap','Source List','Concentric Tracks','Waffle Share','Additive Steps'],comparison:['Paired Dots','Parallel Trends','Change Waterfall'],budget:['Reference Dial','Reference Cells','Reference Ruler'],quota:['Quota Line','Observation List']};
async function ready(){
 const environments=[];
 for(const side of ['source','target']){
  await expect(page.locator(`#${side}-state`)).toContainText('ready:',{timeout:30000});
  const environment=await page.frameLocator(`#${side}`).locator('body').evaluate(()=>({now:Date.now(),constructed:new Date().getTime(),clock:Number(new URLSearchParams(location.search).get('clock')),width:innerWidth,height:innerHeight,locale:navigator.language,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}));
  expect(environment.now).toBe(environment.clock);expect(environment.constructed).toBe(environment.clock);environments.push(environment);
 }
 expect(environments[1]).toEqual(environments[0]);
}
async function choose(frame,row,style){await row.getByRole('combobox',{name:'Style',exact:true}).click();await frame.getByRole('option',{name:style,exact:true}).click();}
try{
 console.log(`Browser ${browser.version()}; each mount checks identical frozen Date.now/new Date, iframe viewport, locale and timezone.`);
 await page.goto(running.url);await ready();await page.getByRole('button',{name:'Reset Both Device Preferences'}).click();await ready();
 for(const side of ['source','target']){
  const frame=page.frameLocator(`#${side}`);
  await expect(frame.locator('[data-statistics-module]')).toHaveCount(5);
  await frame.getByRole('button',{name:'Display Settings',exact:true}).click();
  for(const [id,styles] of Object.entries(designs)){
   const row=frame.locator(`[data-sort-id="${id}"]`),enabled=row.getByRole('switch');
   if(await enabled.getAttribute('aria-checked')==='false')await enabled.click();
   const preview=row.getByRole('button',{name:'Preview',exact:true});if(await preview.count())await preview.click();
   for(const style of styles){await choose(frame,row,style);await expect(row.locator('.statistics-setting-preview')).toBeVisible();expect(await row.textContent()).not.toMatch(/NaN|Infinity/);}
  }
  const handle=frame.locator('[data-sort-id="activity"] .sort-handle');await handle.focus();await page.keyboard.press('ArrowDown');
  await expect(frame.locator('[data-sort-id]').nth(2)).toHaveAttribute('data-sort-id','activity');
  await choose(frame,frame.locator('[data-sort-id="activity"]'),'Pulse Calendar');
  await frame.getByRole('button',{name:'Done',exact:true}).click();
  const rows=frame.locator('.tp-compare-contributions button');await rows.first().focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await expect(rows.nth(2)).toBeFocused();
  expect(await frame.locator('.tp-source-detail').count()).toBe(0);
  await page.keyboard.press('Enter');await expect(frame.getByRole('region',{name:'Amp · Model Details'})).toBeFocused();await page.keyboard.press('Escape');await expect(rows.nth(2)).toBeFocused();
  const calendar=frame.getByRole('grid'),selected=calendar.locator('button[tabindex="0"]');await selected.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(calendar.locator('button[tabindex="0"]')).toBeFocused();
  const reference=frame.getByRole('spinbutton',{name:'Personal Reference (USD)'});await reference.fill('-4');await frame.getByRole('button',{name:'Apply',exact:true}).click();await expect(reference).toHaveAttribute('aria-invalid','true');
  await reference.fill('150');await frame.getByRole('button',{name:'Apply',exact:true}).click();await expect(frame.getByRole('button',{name:'Saved',exact:true})).toBeVisible();
  await frame.getByRole('slider',{name:'Drag to Adjust Reference'}).focus();await page.keyboard.press('ArrowRight');await expect(reference).toHaveValue('151');
  await frame.getByRole('slider',{name:'Drag to Adjust Reference'}).hover();await page.mouse.wheel(40,0);await expect(reference).toHaveValue('171');await expect(frame.getByRole('button',{name:'Saved',exact:true})).toBeVisible();
  await frame.getByRole('button',{name:'Last 7 Days',exact:true}).click();await expect(reference).toHaveValue('0');await frame.getByRole('button',{name:'Last 30 Days',exact:true}).click();await expect(reference).toHaveValue('171');
  await frame.getByRole('button',{name:'Next Page',exact:true}).click();await expect(frame.locator('.pagination')).toContainText('2 / 5');
  await frame.locator('.day-trigger').first().click();
  await frame.getByRole('button',{name:'Display Settings',exact:true}).click();await frame.getByRole('button',{name:'Done',exact:true}).click();
  await expect(frame.locator('.pagination')).toContainText('2 / 5');await expect(frame.locator('.day-trigger').first()).toHaveAttribute('aria-expanded','true');
  await frame.getByRole('button',{name:'Today',exact:true}).click();await expect(frame.locator('.statistics-toolbar,.statistics-modules')).toHaveCount(0);await expect(frame.locator('.day-record')).toHaveCount(1);
  await frame.locator('.day-trigger').click();await expect(frame.locator('.history-entry')).toHaveCount(3);await frame.locator('.entry-trigger').first().click();await expect(frame.locator('.history-model-composition')).toBeVisible();
  await frame.getByRole('button',{name:'Last 30 Days',exact:true}).click();
  console.log(`${side}: 23 design previews, keyboard order/calendar/source focus, input validation, ruler commit, range isolation, pagination and disclosure passed.`);
 }
 for(const theme of ['light','dark'])for(const width of ['390','760']){
  await page.locator('[name="theme"]').selectOption(theme);await page.locator('[name="width"]').selectOption(width);await page.getByRole('button',{name:'Apply and Remount'}).click();await ready();
  await page.screenshot({path:`${output}statistics-${theme}-${width}.png`,fullPage:true});
  for(const side of ['source','target'])expect(await page.frameLocator(`#${side}`).locator('.history-page').evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
 }
 for(const scenario of ['partial','unknown','zero','empty']){
  await page.locator('[name="scenario"]').selectOption(scenario);await page.getByRole('button',{name:'Apply and Remount'}).click();await ready();
  for(const side of ['source','target']){
   const frame=page.frameLocator(`#${side}`);expect(await frame.locator('.history-page').textContent()).not.toMatch(/NaN|Infinity/);
   const cost=frame.getByRole('group',{name:'Chart Measure',exact:true}).getByRole(side==='target'?'radio':'button',{name:'Estimated cost',exact:true});
   if(side==='target')await expect(cost).toHaveAttribute('aria-checked','false');
   await cost.click();
   if(side==='target')await expect(cost).toHaveAttribute('aria-checked','true');
   if(scenario==='partial'||scenario==='unknown')await expect(frame.getByText('Difference Unavailable',{exact:true})).toBeVisible();
   if(scenario==='zero')await expect(frame.locator('.tp-compare-waterfall')).toBeVisible();
   if(scenario==='empty')await expect(frame.locator('.tp-time-date[data-kind="missing"]')).toHaveCount(30);
  }
 }
 expect(errors).toEqual([]);console.log('Both real implementations mounted; four matched-width/theme captures, boundary fixtures and no uncaught page errors passed.');
}finally{await browser.close();await running.close();}
