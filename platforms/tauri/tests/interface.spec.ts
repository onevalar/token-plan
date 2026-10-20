import {test,expect} from '@playwright/test';
import {mockDesktop} from './mock';
for(const colorScheme of ['light','dark'] as const)for(const width of [390,768,1024,1440]){
 test(`${colorScheme} ${width}px accounts and columns`,async({page},info)=>{
  await page.setViewportSize({width,height:850});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});
  await mockDesktop(page);await page.goto('/');
  await expect(page.getByText('first@example.com',{exact:true})).toBeVisible();
  await expect(page.getByText('second.with.a.long.address@example.com',{exact:true})).toBeVisible();
  await expect(page.getByText('Argon · 1w',{exact:true})).toHaveCount(3);
  await expect(page.getByText('无数据',{exact:true})).toHaveCount(3);
  await expect(page.getByText('0%',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('home.png'),fullPage:true});
  await page.getByRole('button',{name:'更多',exact:true}).click();
  await expect(page.getByRole('menuitem',{name:'关于'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'更多',exact:true})).toBeFocused();
 });
}
test('account settings allow zero home metrics and preserve another account',async({page},info)=>{
 await page.setViewportSize({width:390,height:850});
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'显示配置',exact:true}).click();
 for(const row of await page.locator('.metric-setting').all()){
  await row.getByRole('combobox').click();await page.getByRole('option',{name:'仅详情',exact:true}).click();
 }
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.locator('.account-block').first().locator('.metric')).toHaveCount(0);
 await expect(page.locator('.account-block').nth(1).locator('.metric')).toHaveCount(2);
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();await page.getByRole('button',{name:'显示配置',exact:true}).click();
 await page.getByRole('switch',{name:'显示账号',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.getByText('first@example.com',{exact:true})).toHaveCount(0);
 await expect(page.getByText('second.with.a.long.address@example.com',{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('account-hidden.png'),fullPage:true});
});
test('ring and percentage keep the same accounts and removal is confirmed',async({page},info)=>{
 await page.setViewportSize({width:390,height:850});
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置'}).click();
 await expect(page.locator('.tray-account-preview')).toHaveCount(3);
 await expect(page.locator('.tray-account-preview sup')).toHaveText(['1','2']);
 await page.getByRole('combobox',{name:'托盘样式',exact:true}).click();await page.getByRole('option',{name:'百分比',exact:true}).click();
 await expect(page.locator('.tray-account-preview')).toHaveCount(3);await expect(page.locator('.tray-account-preview sup')).toHaveText(['1','2']);
 await expect(page.getByRole('option',{name:'百分比',exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath('settings.png'),fullPage:true});
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();await page.getByRole('button',{name:'显示配置',exact:true}).click();
 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.getByText('从 TokenPlan 移除？终端登录和历史记录会保留。').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();await expect(page.getByText('first@example.com',{exact:true})).toBeVisible();
});
test('update installation errors stay visible and do not restart',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'检查更新',exact:true}).click();
 await page.getByRole('button',{name:'检查更新',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('9.9.9');
 await page.getByRole('button',{name:'安装并重启',exact:true}).click();await expect(page.getByRole('status')).toContainText('更新安装失败');
});
for(const [locale,settings] of [['en','General Settings'],['zh-Hant','一般設定'],['ja','一般設定'],['ko','일반 설정']])test(`localized navigation ${locale}`,async({page})=>{
 await mockDesktop(page,locale);await page.goto('/');await page.locator('header button').last().click();
 await expect(page.getByRole('menuitem',{name:settings,exact:true})).toBeVisible();
});

test('confirmed account removal leaves contiguous tray numbering',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'显示配置',exact:true}).click();
 await page.getByRole('button',{name:'移除账号',exact:true}).click();
 // Arc intentionally ignores a confirming press within its 280 ms accidental-double-click guard.
 await page.waitForTimeout(300);
 await page.getByRole('group').getByRole('button',{name:'移除账号',exact:true}).click();
 await expect(page.locator('.service-row').filter({hasText:'first@example.com'})).toHaveCount(0);
 await expect(page.locator('.service-row').filter({hasText:'second.with.a.long.address@example.com'})).toHaveCount(1);
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'通用设置'}).click();
 await expect(page.locator('.tray-account-preview')).toHaveCount(2);
 await expect(page.locator('.tray-account-preview sup')).toHaveCount(0);
});

test('service order is reflected in the homepage',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'更多',exact:true}).click();await page.getByRole('menuitem',{name:'服务配置'}).click();
 await page.locator('.service-row').nth(1).getByRole('button',{name:/上移/}).click();
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.locator('.account-block').first()).toContainText('second.with.a.long.address@example.com');
});

test('Escape dismisses the panel from details but first closes an open menu',async({page})=>{
 await mockDesktop(page);await page.goto('/');
 await page.getByRole('button',{name:'Claude first@example.com',exact:true}).click();
 await page.getByRole('button',{name:'更多',exact:true}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('menu',{includeHidden:true})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__panelHides??0)).toBe(0);
 await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>(window as any).__panelHides)).toBe(1);
});
