import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
import {statisticsDesktop} from './fixtures/statisticsDesktop';
import {defaultStatistics,statisticsKey} from '../src/statisticsModel';
const active=(page:Page)=>page.locator('.preview-page:not([hidden])');
async function open(page:Page){await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'用量统计',exact:true}).click();}
async function openEnglish(page:Page){await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('menuitem',{name:'Usage Statistics',exact:true}).click();}
test.beforeEach(async({page},info)=>{await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));await page.setViewportSize({width:390,height:680});});
test('statistics modules toggle, reorder, change style and persist across reload',async({page},info)=>{
 await mockDesktop(page,'zh-Hans',true,largeDesktop());await page.goto('/');await open(page);
 await expect(active(page).locator('[data-statistics-module]')).toHaveCount(5);
 await page.getByRole('button',{name:'显示设置',exact:true}).click();
 const activity=active(page).locator('[data-sort-id=activity]');await activity.getByRole('combobox').click();await page.getByRole('option',{name:'折叠色带',exact:true}).click();
 await active(page).getByRole('switch',{name:'来源构成',exact:true}).click();
 const handle=activity.getByRole('button',{name:'拖动排序 使用活动'});await handle.focus();await page.keyboard.press('ArrowDown');
 await expect(active(page).locator('[data-sort-id]').nth(1)).toHaveAttribute('data-sort-id','sources');
 await page.getByRole('button',{name:'完成',exact:true}).click();await expect(active(page).locator('.statistics-horizon')).toBeVisible();
 await page.reload();await open(page);await expect(active(page).locator('.statistics-horizon')).toBeVisible();await expect(active(page).locator('[data-statistics-module=sources]')).toHaveCount(0);
 await page.getByRole('button',{name:'显示设置',exact:true}).click();
 const from=active(page).locator('[data-sort-id=activity] .sort-handle');const to=active(page).locator('[data-sort-id=sources]');await from.scrollIntoViewIfNeeded();const a=(await from.boundingBox())!,b=(await to.boundingBox())!,row=(await activity.boundingBox())!;
 // Cross the target row's centre even when enabled and disabled rows have different heights.
 const start=a.y+a.height/2,delta=b.y+b.height/2-(row.y+row.height/2)-8;
 await page.mouse.move(a.x+a.width/2,start);await page.mouse.down();await page.mouse.move(a.x+a.width/2,start+delta,{steps:12});await expect(active(page).locator('[data-sort-dragging=true]')).toHaveCount(1);await page.mouse.up();await expect(active(page).locator('[data-sort-id]').nth(1)).toHaveAttribute('data-sort-id','activity');
 await page.screenshot({path:info.outputPath('statistics-settings.png')});
 await page.getByRole('button',{name:'完成',exact:true}).click();
 for(const theme of ['light','dark']){await page.emulateMedia({colorScheme:theme as 'light'|'dark'});await expect(active(page)).toBeVisible();expect(await active(page).evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);}
});
test('statistics missing history stays missing and empty quota never becomes a fabricated line',async({page},info)=>{
 const data=largeDesktop();for(const a of data.accounts){a.history=[];a.observations=[];a.fetchedAt="";}
 await mockDesktop(page,'zh-Hans',true,data);await page.goto('/');await open(page);
 await expect(active(page).locator('.statistics-day[data-missing=true]')).toHaveCount(30);
 await expect(active(page).locator('.statistics-tree')).toHaveCount(0);
 await page.getByRole('button',{name:'显示设置',exact:true}).click();await page.getByRole('button',{name:'完成',exact:true}).click();
 await expect(active(page).locator('[data-statistics-module=quota]')).toContainText('暂无记录数据');await expect(active(page).locator('.statistics-line')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('statistics-empty.png')});
});
test('statistics quota uses real samples, separates accounts and breaks gaps and resets',async({page},info)=>{
 const data=largeDesktop(),now=Date.now();for(const a of data.accounts){a.observations=[];a.fetchedAt="";}
 data.accounts[0].observations=[0,1,2,3,6].map((hour,i)=>({date:new Date(now-(6-hour)*3600000).toISOString(),label:'Session',value:[20,40,null,10,30][i],unit:'percent'}));
 data.accounts[1].observations=[{date:new Date(now).toISOString(),label:'Session',value:90,unit:'percent'}];
 await mockDesktop(page,'zh-Hans',true,data);await page.goto('/');await open(page);await page.getByRole('button',{name:'显示设置',exact:true}).click();
 await page.getByRole('button',{name:'完成',exact:true}).click();
 const quota=active(page).locator('[data-statistics-module=quota]');await quota.scrollIntoViewIfNeeded();await expect(quota.locator('circle')).toHaveCount(4);await expect(quota.locator('line')).toHaveCount(1);
 expect(Number(await quota.locator('circle').first().getAttribute('cy'))).toBeCloseTo(31.2);
 await quota.getByRole('combobox').click();await page.getByRole('option').last().click();await expect(quota.locator('circle')).toHaveCount(1);await expect(quota.locator('line')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('statistics-quota.png')});
});
test('detailed modules stay separate from single-day records and calendar exposes exact readings',async({page},info)=>{
 await mockDesktop(page,'zh-Hans',true,largeDesktop());await page.goto('/');await open(page);
 await expect(active(page).getByRole('heading',{name:'详细统计',exact:true})).toBeVisible();
 await expect(active(page).locator('.statistics-bars')).toBeVisible();await expect(active(page).locator('.statistics-tree')).toHaveCount(0);
 await expect(active(page).locator('[data-statistics-module=quota]')).toHaveCount(1);
 await page.getByRole('button',{name:'显示设置',exact:true}).click();const activity=active(page).locator('[data-sort-id=activity]');
 await activity.getByRole('combobox').click();await page.getByRole('option',{name:'活动热力日历',exact:true}).click();await page.getByRole('button',{name:'完成',exact:true}).click();
 const module=active(page).locator('[data-statistics-module=activity]'),day=module.locator('.statistics-day').first();
 await day.hover();await expect(module.getByRole('tooltip')).toHaveText((await day.getAttribute('aria-label'))!);await expect(module.locator('details')).toHaveCount(0);
 await day.focus();await page.keyboard.press('Escape');await expect(module.getByRole('tooltip')).toHaveCount(0);await day.blur();await day.focus();await expect(module.getByRole('tooltip')).toBeVisible();
 await page.screenshot({path:info.outputPath('calendar-tooltip.png')});
 for(const label of ['今天','昨天']){await page.getByRole('button',{name:label,exact:true}).click();await expect(active(page).locator('.statistics-modules,.statistics-settings,.statistics-toolbar')).toHaveCount(0);await expect(active(page).locator('.day-record')).toHaveCount(1);}
 await page.getByRole('button',{name:'最近 30 天',exact:true}).click();await expect(active(page).locator('.statistics-calendar')).toBeVisible();await expect(page.getByRole('button',{name:'显示设置',exact:true})).toBeVisible();
});

test('every new statistics style previews actual records and survives saving',async({page})=>{
 const data=statisticsDesktop(),tokens=data.accounts.flatMap(a=>a.history.slice(0,30)).reduce((sum,day)=>sum+day.tokens,0);
 await mockDesktop(page,'en',false,data);await page.goto('/');await openEnglish(page);
 await page.getByRole('button',{name:'Display Settings',exact:true}).click();
 const designs={overview:['Arc Summary','Editorial Summary','Mini Instruments'],activity:['Pulse Calendar','Pixel Equalizer','Cumulative Paths'],sources:['Concentric Tracks','Waffle Share','Additive Steps'],comparison:['Paired Dots','Parallel Trends','Change Waterfall'],budget:['Reference Dial','Reference Cells','Reference Ruler']};
 for(const [id,styles] of Object.entries(designs)){
  const row=active(page).locator(`[data-sort-id="${id}"]`),enabled=row.getByRole('switch');
  if(await enabled.getAttribute('aria-checked')!=='true')await enabled.click();
  for(const style of styles){
   await row.getByRole('combobox',{name:'Style',exact:true}).click();await page.getByRole('option',{name:style,exact:true}).click();
   const preview=row.getByLabel('Style Preview');await expect(preview).toBeVisible();
   if(id==='overview'||id==='comparison')await expect(preview.getByTestId('hero-total')).toHaveAttribute('data-value',String(tokens));
   expect(await active(page).evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
  }
 }
 await page.getByRole('button',{name:'Done',exact:true}).click();
 await page.reload();await openEnglish(page);await page.getByRole('button',{name:'Display Settings',exact:true}).click();
 for(const [id,styles] of Object.entries(designs))await expect(active(page).locator(`[data-sort-id="${id}"]`).getByRole('combobox')).toContainText(styles.at(-1)!);
});

test('comparison keeps fractional costs and source navigation restores the activated control',async({page})=>{
 const preferences=defaultStatistics();preferences.enabled.comparison=true;preferences.styles.comparison='Change Waterfall';
 const data=statisticsDesktop();
 for(const account of data.accounts)for(const row of account.history)row.cost=row.cost!/1000;
 const current=data.accounts.flatMap(a=>a.history.slice(0,30)).reduce((sum,day)=>sum+day.cost!,0),prior=data.accounts.flatMap(a=>a.history.slice(30)).reduce((sum,day)=>sum+day.cost!,0);
 await page.addInitScript(({key,preferences})=>localStorage.setItem(key,JSON.stringify(preferences)),{key:statisticsKey,preferences});
 await mockDesktop(page,'en',false,data);await page.goto('/');await openEnglish(page);
 await page.getByRole('group',{name:'Chart Measure',exact:true}).getByRole('button',{name:'Estimated cost',exact:true}).click();
 const module=active(page).locator('[data-statistics-module="comparison"]');
 expect(Number(await module.getByTestId('hero-total').getAttribute('data-value'))).toBeCloseTo(current,12);
 const changes=await module.locator('.tp-compare-contribution-value').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('data-delta'))));
 expect(changes).toHaveLength(3);expect(changes.reduce((sum,value)=>sum+value,0)).toBeCloseTo(current-prior,12);
 const rows=module.locator('.tp-compare-contributions button');await rows.first().focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
 await expect(rows.nth(2)).toBeFocused();await expect(module.getByRole('region',{name:'Amp · Model Details'})).toHaveCount(0);
 await page.keyboard.press('Enter');await expect(module.getByRole('region',{name:'Amp · Model Details'})).toBeFocused();
 await page.keyboard.press('Escape');await expect(rows.nth(2)).toBeFocused();
 await page.getByRole('button',{name:'Last 7 Days',exact:true}).click();await expect(module).toBeVisible();
 await expect(module.locator('.tp-compare-waterfall')).toBeVisible();
});

test('incomplete source days suppress comparisons instead of becoming zero',async({page})=>{
 const preferences=defaultStatistics();preferences.enabled.comparison=true;preferences.styles.comparison='Change Waterfall';preferences.styles.activity='Pulse Calendar';
 const data=statisticsDesktop(new Date(),'partial');
 await page.addInitScript(({key,preferences})=>localStorage.setItem(key,JSON.stringify(preferences)),{key:statisticsKey,preferences});
 await mockDesktop(page,'en',false,data);await page.goto('/');await openEnglish(page);
 const module=active(page).locator('[data-statistics-module="comparison"]');
 await expect(module.getByText('Difference Unavailable',{exact:true})).toBeVisible();await expect(module.locator('.tp-compare-waterfall')).toHaveCount(0);
 await page.getByRole('group',{name:'Chart Measure'}).getByRole('button',{name:'Estimated cost'}).click();
 await expect(module.getByText('Difference Unavailable',{exact:true})).toBeVisible();
 const calendar=active(page).getByRole('grid',{name:'Daily Usage, Monday to Sunday'}),selected=calendar.locator('button[tabindex="0"]');
 await selected.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(calendar.locator('button[tabindex="0"]')).toBeFocused();
 await expect(active(page).getByTestId('day-readout')).toContainText(data.accounts[0].history[28].date);
});

test('personal reference validates input, persists, and stays separate by account and range',async({page})=>{
 const preferences=defaultStatistics();preferences.enabled.budget=true;preferences.styles.budget='Reference Ruler';
 await page.addInitScript(({key,preferences})=>localStorage.setItem(key,JSON.stringify(preferences)),{key:statisticsKey,preferences});
 await mockDesktop(page,'en',false,statisticsDesktop());await page.goto('/');await openEnglish(page);
 const reference=active(page).getByRole('spinbutton',{name:'Personal Reference (USD)'});
 await expect(reference).toHaveValue('0');await reference.fill('-4');await active(page).getByRole('button',{name:'Apply',exact:true}).click();
 await expect(reference).toHaveAttribute('aria-invalid','true');
 await reference.fill('150');await active(page).getByRole('button',{name:'Apply',exact:true}).click();await expect(active(page).getByRole('button',{name:'Saved',exact:true})).toBeVisible();
 const slider=active(page).getByRole('slider',{name:'Drag to Adjust Reference'});await slider.focus();await page.keyboard.press('ArrowRight');await expect(reference).toHaveValue('151');
 await page.reload();await openEnglish(page);await expect(reference).toHaveValue('151');
 await page.getByRole('button',{name:'Last 7 Days',exact:true}).click();await expect(reference).toHaveValue('0');
 await page.getByRole('button',{name:'Last 30 Days',exact:true}).click();await expect(reference).toHaveValue('151');
 await page.getByRole('combobox',{name:'Account',exact:true}).click();await page.getByRole('option',{name:'Claude · first@example.com',exact:true}).click();await expect(reference).toHaveValue('0');
});
