// Public UI acceptance checks. Reuses the one agent-browser dr-lab/dr session.
// Start it with the command in README; this script creates no browser or tabs.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,expect} from '@playwright/test';

const cdp=execFileSync('agent-browser',['--session','dr','get','cdp-url'],{encoding:'utf8',env:{...process.env,AGENT_BROWSER_NAMESPACE:'dr-lab'}}).trim();
const browser=await chromium.connectOverCDP(cdp);
const page=browser.contexts()[0].pages()[0];
const base='http://127.0.0.1:1420/explorations/daily-records/';
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const window=page.locator('.dr-window');
const day=(date)=>page.locator(`[data-day="${date}"]`);
const dayTrigger=(date)=>day(date).locator('button').first();
async function open(v,state='normal') {
 await page.goto(`${base}?v=${v}&state=${state}`);
 await expect(window).toHaveAttribute('data-variant',String(v));
 await expect(window).toHaveAttribute('data-scenario',state);
 await page.evaluate(()=>document.fonts.ready);
}
async function noOverflow() {
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'page overflow');
 assert.equal(await page.locator('.dr-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'panel overflow');
}
async function select(label,option) {
 await page.getByRole('combobox',{name:label}).click();
 await page.getByRole('option',{name:option,exact:true}).click();
}
try {
 for(const variant of [1,2,3]) {
  await open(variant);
  await expect(page.locator('[data-day]')).toHaveCount(7);
  await expect(dayTrigger('2026-10-22')).toContainText('$3.92');
  await dayTrigger('2026-10-22').click();
  await expect(dayTrigger('2026-10-22')).toHaveAttribute('aria-expanded','true');
  await expect(day('2026-10-22').locator('.history-entry')).toHaveCount(2);
  await day('2026-10-22').locator('.entry-trigger').first().click();
  await expect(day('2026-10-22').locator('.model-record')).toHaveCount(2);
  await day('2026-10-22').locator('.model-record summary').click();
  await expect(day('2026-10-22').locator('details')).toHaveAttribute('open','');
  await dayTrigger('2026-10-21').click();
  await expect(dayTrigger('2026-10-22')).toHaveAttribute('aria-expanded',variant===1?'false':'true');
  await page.getByRole('button',{name:'下一页',exact:true}).click();
  await expect(page.locator('[data-day]')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'上一页',exact:true}).click();
  await expect(page.locator('[data-day]')).toHaveCount(7);

  await open(variant,'dedupe');
  await expect(page.locator('.dr-context')).toContainText('16 条来源记录');
  await expect(dayTrigger('2026-10-22')).toContainText('$3.92');
  await dayTrigger('2026-10-22').click();
  await expect(day('2026-10-22').locator('.history-entry')).toHaveCount(2);
  await expect(day('2026-10-22').locator('.history-entry').first()).not.toContainText('@');

  await open(variant,'mixed');
  await expect(page.locator('.dr-notice')).toContainText('部分记录尚不完整');
  await expect(dayTrigger('2026-10-22')).toContainText('$2.64');
  await expect(dayTrigger('2026-10-21')).toContainText('—');
  await expect(dayTrigger('2026-10-21')).not.toContainText('$0.00');
  if(variant>1)await expect(dayTrigger('2026-10-22')).toContainText('部分');
  await open(variant,'zero');
  await expect(page.locator('[data-day]')).toHaveCount(1);
  await expect(dayTrigger('2026-10-22')).toContainText('$0.00');
  await dayTrigger('2026-10-22').click();
  await expect(day('2026-10-22').locator('.entry-trigger').first()).toBeDisabled();
  await open(variant,'gaps');
  await expect(page.locator('[data-day]')).toHaveCount(5);
  await expect(day('2026-10-20')).toHaveCount(0);

  await open(variant,'many');
  const dates=[];
  for(let i=0;i<6;i++) {
   dates.push(...await page.locator('[data-day]').evaluateAll(els=>els.map(el=>el.dataset.day)));
   if(i<5)await page.getByRole('button',{name:'下一页',exact:true}).click();
  }
  assert.equal(dates.length,40);assert.equal(new Set(dates).size,40);
  await expect(page.locator('[data-day]')).toHaveCount(5);
  await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();

  for(const [state,button] of [['empty','载入示例记录'],['error','重新载入示例'],['loading','完成模拟读取']]) {
   await open(variant,state);
   await expect(page.locator('[data-day]')).toHaveCount(0);
   if(state==='error')await expect(page.getByRole('alert')).toContainText('读取失败');
   await page.getByRole('button',{name:button,exact:true}).click();
   await expect(window).toHaveAttribute('data-scenario','normal');
   await expect(page.locator('[data-day]')).toHaveCount(7);
  }
  await open(variant,'long');
  await dayTrigger('2026-10-22').click();
  await day('2026-10-22').locator('.entry-trigger').first().click();
  for(const viewport of [390,768,1024,1440]) {
   await page.setViewportSize({width:viewport,height:1000});await noOverflow();
  }
  await page.getByRole('switch',{name:'深色外观'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  for(const width of ['360','390','480']) {
   await select('面板宽度',`${width}px`);await noOverflow();
   assert.equal(Math.round((await window.boundingBox()).width),Number(width));
  }
  await page.evaluate(()=>document.documentElement.dataset.accent='blue');await noOverflow();
  await page.evaluate(()=>delete document.documentElement.dataset.accent);
  console.log(`PASS variant ${variant}: expansion, model detail, dedupe, unknown/partial, zero, missing dates, 40 rows, recovery, widths, dark`);
 }
 await open(1);
 await page.keyboard.press('2');await expect(window).toHaveAttribute('data-variant','2');
 await page.keyboard.press('ArrowRight');await expect(window).toHaveAttribute('data-variant','3');
 await page.keyboard.press('ArrowLeft');await expect(window).toHaveAttribute('data-variant','2');
 await page.reload();await expect(window).toHaveAttribute('data-variant','2');
 await expect(page.locator('.proto-picker [data-active]')).toHaveCount(1);
 await expect(page.locator('.proto-picker [aria-current="true"]')).toHaveCount(1);
 await page.getByRole('combobox',{name:'检验场景'}).focus();await page.keyboard.press('3');
 await expect(window).toHaveAttribute('data-variant','2');
 await page.keyboard.press('Escape');
 await dayTrigger('2026-10-22').focus();await page.keyboard.press('ArrowDown');
 await expect(dayTrigger('2026-10-21')).toBeFocused();
 await page.keyboard.press('Home');await expect(dayTrigger('2026-10-22')).toBeFocused();
 await page.keyboard.press('End');await expect(dayTrigger('2026-10-16')).toBeFocused();
 await page.keyboard.press('Enter');await expect(dayTrigger('2026-10-16')).toHaveAttribute('aria-expanded','true');
 await page.emulateMedia({reducedMotion:'reduce'});await open(3);
 await dayTrigger('2026-10-22').focus();await page.keyboard.press('Enter');
 await day('2026-10-22').locator('.entry-trigger').first().focus();await page.keyboard.press('Escape');
 await expect(dayTrigger('2026-10-22')).toBeFocused();
 await expect(dayTrigger('2026-10-22')).toHaveAttribute('aria-expanded','false');
 const panel=day('2026-10-22').locator('[inert]');await expect(panel).toHaveCount(1);
 await expect.poll(()=>panel.evaluate(el=>el.getBoundingClientRect().height),{timeout:250}).toBe(0);
 await dayTrigger('2026-10-22').click();await dayTrigger('2026-10-22').click();
 await expect(dayTrigger('2026-10-22')).toHaveAttribute('aria-expanded','false');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Fixed reference remains meaningful even if the wall clock advances.
 await page.clock.setFixedTime(new Date('2031-06-14T12:00:00Z'));
 await open(1);await expect(day('2026-10-22')).toHaveCount(1);
 await page.clock.resume();
 await noOverflow();assert.deepEqual(errors,[]);
 console.log('PASS keyboard, URL reload, control shortcut exclusion, reduced motion, inert, future clock, no console/page errors');
 // Do not close the externally owned browser. The script exits and drops its CDP connection.
 process.exit(0);
} catch(error) {console.error(error);process.exit(1);}
