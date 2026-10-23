import {test,expect,type Page} from '@playwright/test';
import {mockDesktop} from './mock';
import {largeDesktop} from './fixtures/largeDesktop';

const visible=(page:Page)=>page.locator('.preview-page:not([hidden])');
test.beforeEach(async({page},info)=>{
 await page.addInitScript(platform=>(window as any).__panelFrame={platform,rounded:platform==='macos'},String(info.project.metadata.platform??'macos'));
});
async function settings(page:Page){await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置',exact:true}).click();}

test('platform settings expose live tray quotas only on macOS',async({page},info)=>{
 const mac=(info.project.metadata.platform??'macos')==='macos';
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');
 await expect(visible(page).locator('.tray-panel-strip')).toHaveCount(0);
 await settings(page);
 await expect(visible(page).locator('.menu-bar-preview')).toHaveCount(mac?1:0);
 await expect(page.getByRole('combobox',{name:/菜单栏样式|托盘样式/})).toHaveCount(mac?1:0);
 await expect(page.getByRole('button',{name:/^用量样式/})).toBeVisible();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'账号设置',exact:true}).click();
 // Menu bar choices live in General Settings; here they are only summarized with a link there.
 await expect(visible(page).getByRole('switch')).toHaveCount(0);
 await expect(visible(page).locator('.linked-setting').filter({hasText:'菜单栏'})).toHaveCount(mac?1:0);
 await expect(visible(page).locator('.linked-setting').filter({hasText:'首页用量样式'})).toHaveCount(1);
 const rows=visible(page).locator('.placement-row');
 await expect(rows.first().getByRole('combobox')).toBeVisible();
 await rows.first().getByRole('combobox').click();await page.getByRole('option',{name:'仅详情',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).__requests.at(-1))).toMatchObject({method:'metric',value:{placement:'details'}});
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('account-settings.png'),animations:'disabled'});
});

for(const theme of ['light','dark'] as const)test(`Antigravity keeps periods and pairs two rings alongside Argon in ${theme}`,async({page},info)=>{
 await page.emulateMedia({colorScheme:theme});
 const data=largeDesktop(),account=data.accounts.find(a=>a.family==='antigravity')!;
 data.accounts=[account];account.metrics=account.metrics.slice(0,3);data.settings.appearance='system';
 await mockDesktop(page,'zh-Hans',false,data);await page.goto('/');
 await expect(visible(page).locator('.metric-name')).toHaveText(['5h','1w','1w']);
 await expect(visible(page).locator('.metric-scope')).toHaveText(['Argon']);
 await settings(page);
 await page.getByRole('button',{name:/^用量样式/}).click();
 await page.getByRole('group',{name:'用量样式',exact:true}).getByRole('button',{name:'独立同心环',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(visible(page).locator('.home-concentric > svg > g')).toHaveCount(2);
 await expect(visible(page).locator('.home-concentric-readings .home-reading')).toHaveCount(2);
 await expect(visible(page).locator('.home-compact')).toHaveCount(1);
 await expect(visible(page).locator('.home-concentric')).toContainText('5h');
 await expect(visible(page).locator('.home-concentric')).toContainText('1w');
 await expect(visible(page).locator('.home-compact')).toContainText('Argon · 1w');
 await expect(visible(page).getByRole('meter')).toHaveCount(3);
 expect(await visible(page).evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`antigravity-concentric-${theme}.png`),animations:'disabled'});
});

test('native Show Home returns from settings to Home',async({page})=>{
 await mockDesktop(page,'zh-Hans',false,largeDesktop());await page.goto('/');await settings(page);
 await expect(page.getByRole('heading',{level:1})).toHaveText('通用设置');
 await page.evaluate(()=>(window as any).__emitTauriEvent('show-home',null));
 await expect(page.getByRole('heading',{level:1})).toHaveText('TokenPlan');
 await expect(visible(page).locator('.dashboard')).toBeVisible();
});
