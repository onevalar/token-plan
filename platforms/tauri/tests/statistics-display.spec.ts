import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';
const active=(page:Page)=>page.locator('.preview-page:not([hidden])');
async function open(page:Page){await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'用量统计',exact:true}).click();}
test.beforeEach(async({page},info)=>{await page.addInitScript(platform=>{(window as any).__panelFrame={platform,rounded:platform!=='linux'};},String(info.project.metadata.platform??'macos'));await page.setViewportSize({width:390,height:680});});
test('statistics modules toggle, reorder, change style and persist across reload',async({page},info)=>{
 await mockDesktop(page,'zh-Hans',true,largeDesktop());await page.goto('/');await open(page);
 await expect(active(page).locator('[data-statistics-module]')).toHaveCount(4);
 await page.getByRole('button',{name:'显示设置',exact:true}).click();
 const activity=active(page).locator('[data-sort-id=activity]');await activity.getByRole('combobox').click();await page.getByRole('option',{name:'折叠色带',exact:true}).click();
 await active(page).getByRole('switch',{name:'来源构成',exact:true}).click();
 const handle=activity.getByRole('button',{name:'拖动排序 使用活动'});await handle.focus();await page.keyboard.press('ArrowDown');
 await expect(active(page).locator('[data-sort-id]').first()).toHaveAttribute('data-sort-id','sources');
 await page.getByRole('button',{name:'完成',exact:true}).click();await expect(active(page).locator('.statistics-horizon')).toBeVisible();
 await page.reload();await open(page);await expect(active(page).locator('.statistics-horizon')).toBeVisible();await expect(active(page).locator('[data-statistics-module=sources]')).toHaveCount(0);
 await page.getByRole('button',{name:'显示设置',exact:true}).click();
 const from=active(page).locator('[data-sort-id=activity] .sort-handle');const to=active(page).locator('[data-sort-id=sources]');await from.scrollIntoViewIfNeeded();const a=await from.boundingBox(),b=await to.boundingBox();
 await page.mouse.move(a!.x+a!.width/2,a!.y+a!.height/2);await page.mouse.down();await page.mouse.move(a!.x+a!.width/2,b!.y+5,{steps:12});await expect(active(page).locator('[data-sort-dragging=true]')).toHaveCount(1);await page.mouse.up();await expect(active(page).locator('[data-sort-id]').first()).toHaveAttribute('data-sort-id','activity');
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
test('statistics defaults apply only to 30 days and calendar exposes precise hover readings',async({page},info)=>{
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
