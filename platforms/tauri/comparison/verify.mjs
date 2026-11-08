import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const artifacts=fileURLToPath(new URL('../../../.amp/in/artifacts/',import.meta.url));
mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true,...process.env.TOKENPLAN_TEST_BROWSER?{executablePath:process.env.TOKENPLAN_TEST_BROWSER}:{}});
const evidence={browser:browser.version(),viewport:{width:390,height:680},clock:'2026-11-07T04:00:00Z',results:[]};
const normalize=value=>value.replace(/\s+/g,' ').trim();
try{
 for(const theme of ['light','dark']){
  const readings=[];
  for(const [side,port] of [['original',1451],['target',1452]]){
   const context=await browser.newContext({viewport:evidence.viewport,locale:'zh-CN',timezoneId:'Asia/Shanghai',colorScheme:theme,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(`http://127.0.0.1:${port}/?theme=${theme}&language=zh-Hans&style=bars&scenario=normal&side=${side}`);
   await page.locator('.dashboard').waitFor();await page.evaluate(()=>document.fonts.ready);
   const environment=await page.evaluate(()=>({now:Date.now(),constructed:new Date().getTime(),width:innerWidth,height:innerHeight,locale:navigator.language,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}));
   expect(environment.now).toBe(Date.parse(evidence.clock));expect(environment.constructed).toBe(environment.now);
   const reading={side,environment,home:normalize(await page.locator('.dashboard').innerText()),accounts:await page.locator('.dashboard .account-block').count(),errors};
   await page.screenshot({path:`${artifacts}svelte-compare-home-${side}-${theme}.png`,animations:'disabled'});
   const menu=page.getByRole('button',{name:'更多',exact:true});await menu.focus();await menu.press('Enter');
   await page.getByRole('menuitem',{name:'通用设置',exact:true}).click();await expect(page.locator('h1')).toHaveText('通用设置');
   const visible=page.locator('.preview-page:not([hidden])');
   // Arc keeps a hidden visual animation clone. Compare the exposed selection,
   // not that source-specific duplicate DOM text.
   reading.choices=await visible.getByRole('combobox').evaluateAll(nodes=>nodes.map(node=>{
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode:text=>text.parentElement?.closest('[aria-hidden="true"]')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let text='',part;while(part=walker.nextNode())text+=part.textContent;return text.replace(/\s+/g,' ').trim();
   }));
   reading.switches=await visible.getByRole('switch').evaluateAll(nodes=>nodes.map(node=>({name:node.getAttribute('aria-label')??document.querySelector(`label[for="${CSS.escape(node.id)}"]`)?.textContent??node.textContent,checked:node.getAttribute('aria-checked')})));
   await page.screenshot({path:`${artifacts}svelte-compare-settings-${side}-${theme}.png`,animations:'disabled'});
   await page.getByRole('button',{name:'返回',exact:true}).click();await expect(page.locator('h1')).toHaveText('TokenPlan');
   reading.returnFocus=await menu.evaluate(node=>node===document.activeElement);
   await page.getByRole('button',{name:'刷新',exact:true}).click();
   await expect(page.locator('.refresh-button')).toHaveAttribute('data-result','success');
   reading.refresh=await page.evaluate(()=>window.__requests.filter(request=>request.method==='refresh'));
   expect(errors).toEqual([]);readings.push(reading);await context.close();
  }
  expect(readings[1].environment).toEqual(readings[0].environment);
  expect(readings[1].home).toBe(readings[0].home);expect(readings[1].accounts).toBe(readings[0].accounts);
  expect(readings[1].choices).toEqual(readings[0].choices);expect(readings[1].refresh).toEqual(readings[0].refresh);
  expect(readings[1].switches.map(item=>item.checked)).toEqual(readings[0].switches.map(item=>item.checked));
  expect(readings[1].returnFocus).toBe(true);evidence.results.push({theme,readings});
 }
 const shell=await browser.newPage({viewport:{width:960,height:1080}});await shell.goto('http://127.0.0.1:1453/');
 await expect(shell.locator('#original-status')).toHaveText('已挂载真实界面');await expect(shell.locator('#target-status')).toHaveText('已挂载真实界面');
 await shell.screenshot({path:`${artifacts}svelte-live-comparison.png`,animations:'disabled'});await shell.close();
 writeFileSync(`${artifacts}svelte-comparison-results.json`,JSON.stringify(evidence,null,2));
 console.log(JSON.stringify({browser:evidence.browser,viewport:evidence.viewport,themes:evidence.results.map(item=>item.theme),result:'Matched home data, settings choices, forced refresh payload and keyboard return focus; both live panes mounted.'}));
}finally{await browser.close();}
